"""Tests for document endpoints."""

import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_document(test_client: AsyncClient, auth_headers: dict):
    """Test document upload."""
    # Create a simple text file
    file_content = b"This is a test document content."
    files = {"file": ("test.txt", io.BytesIO(file_content), "text/plain")}
    
    response = await test_client.post(
        "/api/v1/documents/upload",
        files=files,
        headers=auth_headers,
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["filename"] == "test.txt"
    assert data["file_type"] == "txt"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_upload_document_unauthorized(test_client: AsyncClient):
    """Test document upload without authentication."""
    file_content = b"test content"
    files = {"file": ("test.txt", io.BytesIO(file_content), "text/plain")}
    
    response = await test_client.post(
        "/api/v1/documents/upload",
        files=files,
    )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_invalid_file_type(test_client: AsyncClient, auth_headers: dict):
    """Test upload with invalid file type."""
    file_content = b"test content"
    files = {"file": ("test.exe", io.BytesIO(file_content), "application/x-msdownload")}
    
    response = await test_client.post(
        "/api/v1/documents/upload",
        files=files,
        headers=auth_headers,
    )
    
    assert response.status_code == 400
    assert "not supported" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_list_documents(test_client: AsyncClient, auth_headers: dict):
    """Test listing documents."""
    response = await test_client.get(
        "/api/v1/documents/",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_list_documents_unauthorized(test_client: AsyncClient):
    """Test listing documents without authentication."""
    response = await test_client.get("/api/v1/documents/")
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_document(test_client: AsyncClient, auth_headers: dict, db_session):
    """Test getting a specific document."""
    # First upload a document
    file_content = b"test content"
    files = {"file": ("test.txt", io.BytesIO(file_content), "text/plain")}
    upload_response = await test_client.post(
        "/api/v1/documents/upload",
        files=files,
        headers=auth_headers,
    )
    document_id = upload_response.json()["id"]
    
    # Get the document
    response = await test_client.get(
        f"/api/v1/documents/{document_id}",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == document_id


@pytest.mark.asyncio
async def test_get_nonexistent_document(test_client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent document."""
    response = await test_client.get(
        "/api/v1/documents/99999",
        headers=auth_headers,
    )
    
    assert response.status_code == 404

