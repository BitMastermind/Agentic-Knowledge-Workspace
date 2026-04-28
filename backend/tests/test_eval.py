# backend/tests/test_eval.py
"""Tests for evaluation endpoints and service."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_runs_empty(test_client: AsyncClient, auth_headers: dict):
    """GET /eval/runs returns empty list when no runs exist."""
    response = await test_client.get("/api/v1/eval/runs", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_metrics_empty(test_client: AsyncClient, auth_headers: dict):
    """GET /eval/metrics returns zeros when no runs exist."""
    response = await test_client.get("/api/v1/eval/metrics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_queries"] == 0
    assert data["avg_latency_ms"] == 0.0
    assert data["avg_quality_score"] == 0.0
    assert data["positive_feedback_rate"] == 0.0


@pytest.mark.asyncio
async def test_submit_feedback_invalid_value(test_client: AsyncClient, auth_headers: dict):
    """POST /eval/feedback rejects unknown feedback values."""
    response = await test_client.post(
        "/api/v1/eval/feedback",
        json={"run_id": 1, "feedback": "invalid"},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_submit_feedback_not_found(test_client: AsyncClient, auth_headers: dict):
    """POST /eval/feedback returns 404 for a run that doesn't exist."""
    response = await test_client.post(
        "/api/v1/eval/feedback",
        json={"run_id": 99999, "feedback": "thumbs_up"},
        headers=auth_headers,
    )
    assert response.status_code == 404
