"""Document ingestion and processing service."""

from pathlib import Path
from typing import BinaryIO, List, Dict
import PyPDF2
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import get_logger
from app.models.document import Document, DocumentStatus, Chunk

logger = get_logger(__name__)


class IngestionService:
    """Service for document ingestion, parsing, and chunking."""

    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        # Initialize Gemini embeddings (FREE!)
        if settings.GOOGLE_API_KEY:
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.GOOGLE_API_KEY,
            )
            logger.info("gemini_embeddings_initialized", model="embedding-001")
        else:
            self.embeddings = None
            logger.error("google_api_key_not_set", message="Embeddings require GOOGLE_API_KEY")

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
        """Parse PDF file and extract text."""
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page_num, page in enumerate(pdf_reader.pages):
            text += f"\\n--- Page {page_num + 1} ---\\n"
            text += page.extract_text()
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
        """Generate embedding for text using Gemini (FREE!)."""
        if not self.embeddings:
            raise ValueError("GOOGLE_API_KEY not configured for embeddings")
        
        try:
            # Truncate text if too long (Gemini can handle up to ~10k tokens)
            if len(text) > 40000:  # ~10k tokens
                text = text[:40000]
            
            # Generate embedding using Gemini
            embedding = await self.embeddings.aembed_query(text)
            
            # Gemini returns 768 dimensions
            return embedding
        except Exception as e:
            logger.error("embedding_generation_failed", error=str(e), provider="gemini")
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

