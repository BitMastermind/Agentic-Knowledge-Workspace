# backend/app/api/v1/eval.py
"""Evaluation endpoints: run history, aggregate metrics, and feedback."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import require_tenant_access
from app.core.logging import get_logger
from app.models.evaluation import EvaluationRun

logger = get_logger(__name__)
router = APIRouter()


class EvaluationRunResponse(BaseModel):
    id: int
    query: str
    response: str
    latency_ms: Optional[float] = None
    quality_score: Optional[float] = None
    user_feedback: Optional[str] = None
    created_at: str


class EvaluationMetricsResponse(BaseModel):
    total_queries: int
    avg_latency_ms: float
    avg_quality_score: float
    positive_feedback_rate: float


class FeedbackRequest(BaseModel):
    run_id: int
    feedback: str  # "thumbs_up" | "thumbs_down"


@router.get("/runs", response_model=list[EvaluationRunResponse])
async def list_runs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """List evaluation runs for the current tenant, newest first."""
    try:
        result = await db.execute(
            select(EvaluationRun)
            .where(EvaluationRun.tenant_id == current_user["tenant_id"])
            .order_by(EvaluationRun.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        runs = result.scalars().all()
        return [
            EvaluationRunResponse(
                id=r.id,
                query=r.query,
                response=r.response,
                latency_ms=r.latency_ms,
                quality_score=r.quality_score,
                user_feedback=r.user_feedback,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in runs
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_runs_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list evaluation runs: {str(e)}",
        )


@router.get("/metrics", response_model=EvaluationMetricsResponse)
async def get_metrics(
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregate quality metrics for the current tenant."""
    try:
        tenant_id = current_user["tenant_id"]

        # Total count, avg latency, avg quality
        agg_result = await db.execute(
            select(
                func.count(EvaluationRun.id).label("total"),
                func.avg(EvaluationRun.latency_ms).label("avg_latency"),
                func.avg(EvaluationRun.quality_score).label("avg_quality"),
            ).where(EvaluationRun.tenant_id == tenant_id)
        )
        agg = agg_result.one()
        total = agg.total or 0

        # Thumbs-up count (separate query — simpler than CASE in SQLAlchemy async)
        thumbs_result = await db.execute(
            select(func.count(EvaluationRun.id)).where(
                EvaluationRun.tenant_id == tenant_id,
                EvaluationRun.user_feedback == "thumbs_up",
            )
        )
        thumbs_up = thumbs_result.scalar() or 0

        return EvaluationMetricsResponse(
            total_queries=total,
            avg_latency_ms=float(agg.avg_latency or 0),
            avg_quality_score=float(agg.avg_quality or 0),
            positive_feedback_rate=float(thumbs_up) / total if total > 0 else 0.0,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_metrics_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get metrics: {str(e)}",
        )


@router.post("/feedback", status_code=status.HTTP_204_NO_CONTENT)
async def submit_feedback(
    request: FeedbackRequest,
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """Record thumbs-up or thumbs-down feedback for a run."""
    try:
        if request.feedback not in ("thumbs_up", "thumbs_down"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="feedback must be 'thumbs_up' or 'thumbs_down'",
            )

        result = await db.execute(
            select(EvaluationRun).where(
                EvaluationRun.id == request.run_id,
                EvaluationRun.tenant_id == current_user["tenant_id"],
            )
        )
        run = result.scalar_one_or_none()
        if not run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

        run.user_feedback = request.feedback
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("submit_feedback_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}",
        )
