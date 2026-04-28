# backend/app/services/evaluation.py
"""Records RAG query runs and triggers background LLM-as-judge scoring."""

import asyncio
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.models.evaluation import EvaluationRun
from app.services.langsmith import LangSmithService

logger = get_logger(__name__)
_langsmith = LangSmithService()


class EvaluationService:
    async def record_query(
        self,
        tenant_id: int,
        user_id: int,
        query: str,
        answer: str,
        sources: list,
        latency_ms: float,
    ) -> int:
        """Insert an EvaluationRun row and fire background quality scoring.

        Opens its own session so callers don't need to pass db — works
        identically in regular and streaming request contexts.
        """
        async with AsyncSessionLocal() as db:
            run = EvaluationRun(
                tenant_id=tenant_id,
                user_id=user_id,
                query=query,
                response=answer,
                sources=sources,
                latency_ms=latency_ms,
            )
            db.add(run)
            await db.commit()
            await db.refresh(run)
            run_id = run.id

        if sources:
            context = " ".join(s.get("snippet", "") for s in sources)
            asyncio.create_task(
                self._score_in_background(run_id, query, answer, context)
            )

        return run_id

    async def _score_in_background(
        self,
        run_id: int,
        query: str,
        answer: str,
        context: str,
    ) -> None:
        """Update quality_score via LLM-as-judge. Swallows all errors."""
        try:
            score = await _langsmith.evaluate_response_quality(query, answer, context)
            async with AsyncSessionLocal() as db:
                run = await db.get(EvaluationRun, run_id)
                if run:
                    run.quality_score = score
                    await db.commit()
            logger.info("quality_score_saved", run_id=run_id, score=score)
        except Exception as e:
            logger.error("background_scoring_failed", run_id=run_id, error=str(e))


evaluation_service = EvaluationService()
