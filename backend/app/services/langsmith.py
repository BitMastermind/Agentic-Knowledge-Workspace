"""LangSmith integration for tracing and evaluation."""

import os
from typing import Optional
from langsmith import Client
from langsmith.run_helpers import traceable

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LangSmithService:
    """Service for LangSmith tracing and evaluation."""

    def __init__(self):
        if settings.LANGSMITH_API_KEY:
            os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
            os.environ["LANGCHAIN_TRACING_V2"] = str(settings.LANGCHAIN_TRACING_V2).lower()
            os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT
            
            self.client = Client()
            logger.info("langsmith_initialized", project=settings.LANGSMITH_PROJECT)
        else:
            self.client = None
            logger.warning("langsmith_not_configured")

    @traceable(name="rag_query")
    async def trace_rag_query(
        self,
        query: str,
        response: str,
        sources: list,
        latency_ms: float,
        metadata: Optional[dict] = None,
    ):
        """Trace RAG query for evaluation."""
        if not self.client:
            return
        
        try:
            # Log run to LangSmith
            logger.info(
                "rag_query_traced",
                query=query[:100],
                latency_ms=latency_ms,
                sources=len(sources),
            )
        except Exception as e:
            logger.error("langsmith_tracing_failed", error=str(e))

    async def evaluate_response_quality(self, query: str, response: str, context: str) -> float:
        """
        Evaluate response quality using LLM-as-judge.
        
        Returns a score between 0 and 1.
        """
        if not self.client:
            return 0.0
        
        try:
            # TODO: Implement LLM-as-judge evaluation
            # Use a prompt to evaluate if response is accurate, relevant, and well-grounded
            
            # Placeholder
            return 0.85
            
        except Exception as e:
            logger.error("quality_evaluation_failed", error=str(e))
            return 0.0

