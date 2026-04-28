# backend/tests/test_eval.py
"""Tests for evaluation endpoints and service."""

import pytest
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


@pytest.mark.asyncio
async def test_list_runs_after_seeding(
    test_client: AsyncClient,
    auth_headers: dict,
    db_session,
    test_user_with_tenant,
):
    """After directly inserting a run, GET /eval/runs returns it."""
    from app.models.evaluation import EvaluationRun

    user, tenant, _ = test_user_with_tenant

    run = EvaluationRun(
        tenant_id=tenant.id,
        user_id=user.id,
        query="What is RAG?",
        response="RAG is Retrieval-Augmented Generation.",
        sources=[],
        latency_ms=120.5,
    )
    db_session.add(run)
    await db_session.commit()

    response = await test_client.get("/api/v1/eval/runs", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["query"] == "What is RAG?"
    assert data[0]["latency_ms"] == 120.5
    assert data[0]["user_feedback"] is None


@pytest.mark.asyncio
async def test_metrics_after_seeding(
    test_client: AsyncClient,
    auth_headers: dict,
    db_session,
    test_user_with_tenant,
):
    """Metrics aggregate correctly after seeding two runs with feedback."""
    from app.models.evaluation import EvaluationRun

    user, tenant, _ = test_user_with_tenant

    for i, feedback in enumerate(["thumbs_up", "thumbs_down"]):
        run = EvaluationRun(
            tenant_id=tenant.id,
            user_id=user.id,
            query=f"Query {i}",
            response=f"Answer {i}",
            sources=[],
            latency_ms=100.0 * (i + 1),
            user_feedback=feedback,
        )
        db_session.add(run)
    await db_session.commit()

    response = await test_client.get("/api/v1/eval/metrics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_queries"] == 2
    assert data["avg_latency_ms"] == 150.0
    assert data["positive_feedback_rate"] == 0.5


@pytest.mark.asyncio
async def test_submit_feedback_success(
    test_client: AsyncClient,
    auth_headers: dict,
    db_session,
    test_user_with_tenant,
):
    """POST /eval/feedback updates the run's user_feedback field."""
    from app.models.evaluation import EvaluationRun

    user, tenant, _ = test_user_with_tenant

    run = EvaluationRun(
        tenant_id=tenant.id,
        user_id=user.id,
        query="Test?",
        response="Test answer.",
        sources=[],
        latency_ms=50.0,
    )
    db_session.add(run)
    await db_session.commit()
    await db_session.refresh(run)

    response = await test_client.post(
        "/api/v1/eval/feedback",
        json={"run_id": run.id, "feedback": "thumbs_up"},
        headers=auth_headers,
    )
    assert response.status_code == 204

    await db_session.refresh(run)
    assert run.user_feedback == "thumbs_up"
