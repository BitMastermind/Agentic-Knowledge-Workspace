"""RAG query endpoints with streaming support."""

import json
import time
from typing import AsyncIterator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_tenant_access
from app.services.retriever import RetrieverService
from app.services.answer_engine import AnswerEngineService
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Initialize services
retriever_service = RetrieverService()
answer_engine = AnswerEngineService()


class QueryRequest(BaseModel):
    """RAG query request."""

    query: str
    document_ids: list[int] | None = None


class SourceResponse(BaseModel):
    """Source citation response."""

    id: int
    document_name: str
    snippet: str
    metadata: dict


class QueryResponse(BaseModel):
    """RAG query response."""

    answer: str
    sources: list[SourceResponse]


@router.post("/query", response_model=QueryResponse)
async def query_documents(
    request: QueryRequest,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Query documents using RAG with professional answer formatting.
    
    Flow:
    1. Retrieve relevant chunks from pgvector (local embeddings)
    2. Generate professional Google/Perplexity-style answer with inline citations
    3. Return answer + source metadata
    
    The answer engine produces:
    - Clean, concise paragraph-style responses
    - Inline citations [1], [2], etc.
    - No messy metadata or filenames in the answer
    - Professional, neutral tone
    """
    try:
        start_time = time.time()
        
        # Check if query is conversational (before retrieval to save resources)
        is_conversational = answer_engine._is_conversational_query(request.query)
        
        # 1. Retrieve relevant chunks with advanced retrieval pipeline
        # Uses hybrid search (vector + BM25), re-ranking, and query expansion
        # Skip retrieval for conversational queries
        chunks = []
        if not is_conversational:
            chunks = await retriever_service.retrieve(
                db=db,
                query=request.query,
                tenant_id=current_user["tenant_id"],
                document_ids=request.document_ids,
                top_k=15,  # Increased for more comprehensive answers
            )
        
        # 2. Generate professional answer using answer engine
        answer = await answer_engine.generate_answer(
            query=request.query,
            chunks=chunks,
        )
        
        # 3. Format sources for frontend display (not shown in answer)
        # Only include sources if chunks are relevant
        sources = []
        if chunks and answer_engine._chunks_are_relevant(chunks):
            for chunk in chunks[:5]:  # Return top 5 sources
                sources.append({
                    "id": chunk["id"],
                    "document_name": chunk["document_name"],
                    "snippet": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"],
                    "metadata": chunk["metadata"],
                })
        
        latency_ms = (time.time() - start_time) * 1000
        
        logger.info(
            "rag_query_completed",
            query=request.query[:100],
            chunks_found=len(chunks),
            latency_ms=latency_ms,
            tenant_id=current_user["tenant_id"],
        )
        
        return {
            "answer": answer,
            "sources": sources,
        }
        
    except Exception as e:
        logger.error("rag_query_failed", error=str(e), query=request.query[:100])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}",
        )


@router.post("/query-stream")
async def query_documents_stream(
    request: QueryRequest,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Query documents using RAG with SSE streaming.
    
    Streams professional-formatted answer tokens in real-time, then sends sources.
    """
    
    async def generate() -> AsyncIterator[str]:
        """Generate streaming response with professional answer engine."""
        try:
            # Check if query is conversational (before retrieval to save resources)
            is_conversational = answer_engine._is_conversational_query(request.query)
            
            # 1. Retrieve relevant chunks with advanced retrieval pipeline
            # Skip retrieval for conversational queries
            chunks = []
            if not is_conversational:
                chunks = await retriever_service.retrieve(
                    db=db,
                    query=request.query,
                    tenant_id=current_user["tenant_id"],
                    document_ids=request.document_ids,
                    top_k=15,  # Increased for more comprehensive answers
                )
            
            # 2. Stream professional answer using answer engine
            async for token in answer_engine.generate_answer_stream(
                query=request.query,
                chunks=chunks,
            ):
                token_data = {
                    "type": "token",
                    "content": token,
                }
                yield f"data: {json.dumps(token_data)}\n\n"
            
            # 3. Send sources at the end (only if chunks are relevant)
            sources = []
            if chunks and answer_engine._chunks_are_relevant(chunks):
                for chunk in chunks[:5]:
                    sources.append({
                        "id": chunk["id"],
                        "document_name": chunk["document_name"],
                        "snippet": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"],
                        "metadata": chunk["metadata"],
                    })
            
            sources_data = {
                "type": "sources",
                "sources": sources,
            }
            yield f"data: {json.dumps(sources_data)}\n\n"
            
            # 4. Send completion signal
            yield "data: [DONE]\n\n"
            
            logger.info(
                "rag_stream_completed",
                query=request.query[:100],
                chunks_found=len(chunks),
                tenant_id=current_user["tenant_id"],
            )
            
        except Exception as e:
            logger.error("rag_stream_failed", error=str(e), query=request.query[:100])
            error_data = {
                "type": "error",
                "content": f"An error occurred: {str(e)}",
            }
            yield f"data: {json.dumps(error_data)}\n\n"
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

