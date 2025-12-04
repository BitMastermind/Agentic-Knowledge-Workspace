"""Evaluation and metrics models."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, JSON

from app.core.database import Base


class EvaluationRun(Base):
    """Evaluation run model for tracking RAG query quality."""

    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    sources = Column(JSON, default=[])  # List of retrieved chunks
    latency_ms = Column(Float)
    token_count = Column(Integer)
    quality_score = Column(Float, nullable=True)  # LLM-as-judge score
    user_feedback = Column(String, nullable=True)  # thumbs_up, thumbs_down
    eval_metadata = Column(JSON, default={})  # Renamed from 'metadata' (SQLAlchemy reserved word)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

