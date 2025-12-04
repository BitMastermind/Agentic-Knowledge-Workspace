"""RAG retriever service for semantic search."""

from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import settings
from app.core.logging import get_logger
from app.models.document import Chunk

logger = get_logger(__name__)


class RetrieverService:
    """Service for semantic search and retrieval using Gemini embeddings."""

    def __init__(self):
        # Initialize Gemini embeddings (FREE!)
        if settings.GOOGLE_API_KEY:
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.GOOGLE_API_KEY,
            )
            logger.info("gemini_embeddings_initialized_for_retrieval")
        else:
            self.embeddings = None
            logger.error("google_api_key_not_set")

    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding for search query using Gemini (FREE!)."""
        if not self.embeddings:
            raise ValueError("GOOGLE_API_KEY not configured for embeddings")
        
        try:
            # Generate embedding using Gemini
            embedding = await self.embeddings.aembed_query(query)
            return embedding
        except Exception as e:
            logger.error("query_embedding_failed", error=str(e), provider="gemini")
            raise

    async def search_chunks(
        self,
        db: AsyncSession,
        query_embedding: List[float],
        tenant_id: int,
        document_ids: List[int] | None = None,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Search for relevant chunks using pgvector similarity.
        
        Uses cosine distance operator: <=>
        """
        try:
            # Build query with pgvector similarity search
            query_str = """
                SELECT 
                    c.id,
                    c.content,
                    c.chunk_metadata,
                    d.filename,
                    d.id as document_id,
                    c.embedding <=> :query_embedding::vector as distance
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE d.tenant_id = :tenant_id
            """
            
            params = {
                "query_embedding": str(query_embedding),
                "tenant_id": tenant_id,
            }
            
            if document_ids:
                query_str += " AND d.id = ANY(:document_ids)"
                params["document_ids"] = document_ids
            
            query_str += " ORDER BY distance LIMIT :limit"
            params["limit"] = limit
            
            result = await db.execute(text(query_str), params)
            rows = result.fetchall()
            
            # Format results
            chunks = []
            for row in rows:
                chunks.append({
                    "id": row.id,
                    "content": row.content,
                    "metadata": row.chunk_metadata or {},
                    "document_name": row.filename,
                    "document_id": row.document_id,
                    "score": float(1 - row.distance),  # Convert distance to similarity score
                })
            
            logger.info("chunk_search_completed", query_length=len(query_embedding), results=len(chunks))
            return chunks
            
        except Exception as e:
            logger.error("chunk_search_failed", error=str(e))
            raise

    async def retrieve(
        self,
        db: AsyncSession,
        query: str,
        tenant_id: int,
        document_ids: List[int] | None = None,
        top_k: int = 10,
    ) -> List[Dict]:
        """
        Full retrieval pipeline: embed query + search.
        """
        query_embedding = await self.embed_query(query)
        return await self.search_chunks(
            db=db,
            query_embedding=query_embedding,
            tenant_id=tenant_id,
            document_ids=document_ids,
            limit=top_k,
        )

