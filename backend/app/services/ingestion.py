"""Document ingestion and processing service."""

from pathlib import Path
from typing import BinaryIO, List, Dict
import PyPDF2
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import get_logger
from app.models.document import Document, DocumentStatus, Chunk

logger = get_logger(__name__)


class IngestionService:
    """Service for document ingestion, parsing, and chunking."""

    # Embedding model configuration
    EMBEDDING_MODEL = "all-mpnet-base-v2"  # Upgraded: 768 dims, better semantic understanding
    EMBEDDING_DIMS = 768

    def __init__(self):
        # Improved chunking: larger chunks with more overlap for better context
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,  # Increased from 1000
            chunk_overlap=300,  # Increased from 200
            length_function=len,
            separators=["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""],  # Paragraph-aware
        )
        # Initialize Sentence Transformers (FREE, LOCAL, NO LIMITS!)
        try:
            self.embeddings = SentenceTransformer(self.EMBEDDING_MODEL)
            logger.info("sentence_transformers_initialized", model=self.EMBEDDING_MODEL, dims=self.EMBEDDING_DIMS)
        except Exception as e:
            self.embeddings = None
            logger.error("embedding_model_load_failed", error=str(e))

    async def parse_document(self, file: BinaryIO, file_type: str) -> str:
        """Parse document and extract text content."""
        try:
            if file_type == "pdf":
                return self._parse_pdf(file)
            elif file_type == "csv":
                return self._parse_csv(file)
            elif file_type in ["md", "txt"]:
                return file.read().decode("utf-8")
            elif file_type == "docx":
                return self._parse_docx(file)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            logger.error("document_parsing_failed", file_type=file_type, error=str(e))
            raise

    def _parse_pdf(self, file: BinaryIO) -> str:
        """Parse PDF file and extract text using pdfplumber (better extraction)."""
        import pdfplumber
        
        text = ""
        try:
            with pdfplumber.open(file) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- Page {page_num} ---\n"
                        text += page_text + "\n"
        except Exception as e:
            logger.error("pdfplumber_extraction_failed", error=str(e))
            # Fallback to PyPDF2
            logger.info("trying_pypdf2_fallback")
            file.seek(0)  # Reset file pointer
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num, page in enumerate(pdf_reader.pages, 1):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- Page {page_num} ---\n"
                    text += page_text + "\n"
        
        return text

    def _parse_csv(self, file: BinaryIO) -> str:
        """Parse CSV file and convert to text."""
        df = pd.read_csv(file)
        return df.to_string()

    def _parse_docx(self, file: BinaryIO) -> str:
        """Parse DOCX file and extract text."""
        try:
            from docx import Document as DocxDocument
            doc = DocxDocument(file)
            text = ""
            for para in doc.paragraphs:
                text += para.text + "\n"
            return text
        except ImportError:
            logger.error("python_docx_not_installed")
            raise NotImplementedError("DOCX parsing requires python-docx package")

    def chunk_text(self, text: str, metadata: dict = None) -> list[dict]:
        """Split text into chunks for embedding."""
        chunks = self.text_splitter.split_text(text)
        return [
            {
                "content": chunk,
                "metadata": metadata or {},
            }
            for chunk in chunks
        ]

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using Sentence Transformers (FREE, LOCAL!)."""
        if not self.embeddings:
            raise ValueError("Embedding model not loaded")
        
        try:
            # Truncate text if too long
            if len(text) > 5000:  # Reasonable limit for local model
                text = text[:5000]
            
            # Generate embedding locally (no API call!)
            # Note: This is synchronous but fast (~50ms)
            embedding = self.embeddings.encode(text, convert_to_tensor=False)
            
            # Convert to list and return (384 dimensions)
            return embedding.tolist()
        except Exception as e:
            logger.error("embedding_generation_failed", error=str(e), provider="local")
            raise

    async def process_document(
        self, 
        db: AsyncSession,
        document_id: int, 
        file_path: Path, 
        file_type: str
    ):
        """
        Full document processing pipeline.
        
        1. Parse document
        2. Chunk text
        3. Generate embeddings
        4. Store chunks in database
        5. Update document status
        """
        logger.info("document_processing_started", document_id=document_id)
        
        try:
            # Update status to processing
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            document = result.scalar_one_or_none()
            if not document:
                raise ValueError(f"Document {document_id} not found")
            
            document.status = DocumentStatus.PROCESSING
            await db.commit()
            
            # 1. Parse document
            with open(file_path, "rb") as f:
                text = await self.parse_document(f, file_type)
            
            if not text or len(text.strip()) < 10:
                raise ValueError("Document is empty or too short")
            
            # 2. Chunk text
            chunk_data_list = self.chunk_text(text, {"document_id": document_id})
            
            logger.info("document_chunked", document_id=document_id, chunks=len(chunk_data_list))
            
            # 3. Generate embeddings and store chunks
            for idx, chunk_data in enumerate(chunk_data_list):
                try:
                    # Generate embedding
                    embedding = await self.generate_embedding(chunk_data["content"])
                    
                    # Store chunk with embedding
                    chunk = Chunk(
                        document_id=document_id,
                        content=chunk_data["content"],
                        embedding=embedding,
                        chunk_metadata={
                            **chunk_data["metadata"],
                            "chunk_index": idx,
                            "chunk_size": len(chunk_data["content"]),
                        },
                    )
                    db.add(chunk)
                    
                    # Commit in batches of 10 for performance
                    if (idx + 1) % 10 == 0:
                        await db.commit()
                        logger.info("chunks_batch_saved", document_id=document_id, batch=idx+1)
                
                except Exception as e:
                    logger.error("chunk_processing_failed", document_id=document_id, chunk_index=idx, error=str(e))
                    # Continue with other chunks
                    continue
            
            # Final commit
            await db.commit()
            
            # 4. Update document status to completed
            document.status = DocumentStatus.COMPLETED
            await db.commit()
            
            logger.info("document_processing_completed", document_id=document_id, chunks=len(chunk_data_list))
            
        except Exception as e:
            logger.error("document_processing_failed", document_id=document_id, error=str(e))
            
            # Update status to failed
            try:
                result = await db.execute(
                    select(Document).where(Document.id == document_id)
                )
                document = result.scalar_one_or_none()
                if document:
                    document.status = DocumentStatus.FAILED
                    document.error_message = str(e)[:500]  # Truncate error message
                    await db.commit()
            except Exception as db_error:
                logger.error("failed_to_update_error_status", error=str(db_error))
            
            raise


# Singleton instance
ingestion_service = IngestionService()

