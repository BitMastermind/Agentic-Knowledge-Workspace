"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(test_client: AsyncClient):
    """Test user registration."""
    response = await test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepassword123",
            "full_name": "Test User",
            "tenant_name": "Test Company",
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(test_client: AsyncClient):
    """Test registration with duplicate email fails."""
    # First registration
    await test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password123",
        },
    )
    
    # Try to register again with same email
    response = await test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password123",
        },
    )
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(test_client: AsyncClient, db_session, test_user_with_tenant):
    """Test successful login."""
    user, tenant, _ = test_user_with_tenant
    
    response = await test_client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": "testpassword123",
        },
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_invalid_credentials(test_client: AsyncClient, test_user_with_tenant):
    """Test login with invalid credentials."""
    user, _, _ = test_user_with_tenant
    
    response = await test_client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": "wrongpassword",
        },
    )
    
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_current_user(test_client: AsyncClient, auth_headers: dict, test_user_with_tenant):
    """Test getting current user info."""
    response = await test_client.get(
        "/api/v1/auth/me",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user_with_tenant[0].email


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(test_client: AsyncClient):
    """Test getting user info without authentication."""
    response = await test_client.get("/api/v1/auth/me")
    
    assert response.status_code == 401

