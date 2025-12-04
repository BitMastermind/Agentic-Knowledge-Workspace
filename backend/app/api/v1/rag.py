"""RAG query endpoints with streaming support."""

import json
import time
from typing import AsyncIterator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage

from app.core.database import get_db
from app.core.security import get_current_user, require_tenant_access
from app.services.retriever import RetrieverService
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Initialize retriever and LLM
retriever_service = RetrieverService()


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
    Query documents using RAG (non-streaming).
    
    Flow:
    1. Embed query with Gemini
    2. Retrieve relevant chunks from pgvector
    3. Build context from chunks
    4. Generate answer with Gemini LLM
    5. Return answer + source citations
    """
    try:
        start_time = time.time()
        
        # 1. Retrieve relevant chunks
        chunks = await retriever_service.retrieve(
            db=db,
            query=request.query,
            tenant_id=current_user["tenant_id"],
            document_ids=request.document_ids,
            top_k=10,
        )
        
        if not chunks:
            return {
                "answer": "I couldn't find any relevant information in your documents to answer this question. Please try uploading more documents or rephrasing your question.",
                "sources": [],
            }
        
        # 2. Build context from chunks
        context_parts = []
        for idx, chunk in enumerate(chunks, 1):
            context_parts.append(f"[{idx}] {chunk['content']}\n(Source: {chunk['document_name']})")
        
        context = "\n\n".join(context_parts)
        
        # 3. Create prompt for Gemini
        system_prompt = """You are a helpful AI assistant that answers questions based on provided documents.

Instructions:
- Answer the question using ONLY the information from the provided context
- Cite sources using [1], [2], etc. to reference the context numbers
- If the context doesn't contain enough information, say so clearly
- Be concise but complete
- Use a professional, helpful tone"""

        user_prompt = f"""Context from documents:

{context}

Question: {request.query}

Please answer the question based on the context above. Cite your sources using [1], [2], etc."""

        # 4. Call Gemini LLM
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
        )
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        
        response = await llm.ainvoke(messages)
        answer = response.content
        
        # 5. Format sources
        sources = []
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
    
    Streams tokens in real-time and sends sources at the end.
    """
    
    async def generate() -> AsyncIterator[str]:
        """Generate streaming response with Gemini."""
        try:
            # 1. Retrieve relevant chunks
            chunks = await retriever_service.retrieve(
                db=db,
                query=request.query,
                tenant_id=current_user["tenant_id"],
                document_ids=request.document_ids,
                top_k=10,
            )
            
            if not chunks:
                # Send error message
                yield f'data: {json.dumps({"type": "token", "content": "I couldn\'t find any relevant information in your documents."})}\n\n'
                yield "data: [DONE]\n\n"
                return
            
            # 2. Build context
            context_parts = []
            for idx, chunk in enumerate(chunks, 1):
                context_parts.append(f"[{idx}] {chunk['content']}\n(Source: {chunk['document_name']})")
            
            context = "\n\n".join(context_parts)
            
            # 3. Create prompt
            system_prompt = """You are a helpful AI assistant that answers questions based on provided documents.

Instructions:
- Answer using ONLY the information from the provided context
- Cite sources using [1], [2], etc.
- Be concise but complete
- If insufficient information, say so clearly"""

            user_prompt = f"""Context:

{context}

Question: {request.query}

Answer:"""

            # 4. Stream from Gemini
            llm = ChatGoogleGenerativeAI(
                model=settings.LLM_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.7,
                streaming=True,
            )
            
            # Stream tokens
            async for chunk_response in llm.astream([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]):
                if hasattr(chunk_response, 'content') and chunk_response.content:
                    token_data = {
                        "type": "token",
                        "content": chunk_response.content,
                    }
                    yield f"data: {json.dumps(token_data)}\n\n"
            
            # 5. Send sources at the end
            sources = []
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
            
            # 6. Send completion signal
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

