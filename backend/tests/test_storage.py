"""Tests for storage service."""

import io
import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch

from app.services.storage import StorageService


@pytest.fixture
def temp_storage_dir():
    """Create a temporary directory for storage tests."""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)


@pytest.fixture
def storage_service(temp_storage_dir):
    """Create a storage service with temp directory."""
    with patch("app.services.storage.settings.STORAGE_PROVIDER", "local"), \
         patch("app.services.storage.settings.LOCAL_STORAGE_PATH", str(temp_storage_dir)):
        service = StorageService()
        service.local_path = temp_storage_dir
        return service


def test_generate_storage_key(storage_service):
    """Test storage key generation."""
    key = storage_service.generate_storage_key(tenant_id=1, filename="test.pdf")
    
    assert "tenant_1" in key
    assert "test.pdf" in key or "test_pdf" in key
    assert len(key) > 0


@pytest.mark.asyncio
async def test_save_file(storage_service, temp_storage_dir):
    """Test saving a file."""
    file_content = b"test file content"
    file_obj = io.BytesIO(file_content)
    storage_key = "tenant_1/test_file.txt"
    
    result = await storage_service.save_file(file_obj, storage_key)
    
    assert result == storage_key
    file_path = temp_storage_dir / storage_key
    assert file_path.exists()
    assert file_path.read_bytes() == file_content


@pytest.mark.asyncio
async def test_get_file_path(storage_service, temp_storage_dir):
    """Test getting file path."""
    storage_key = "tenant_1/test_file.txt"
    file_path = await storage_service.get_file_path(storage_key)
    
    assert isinstance(file_path, Path)
    assert file_path == temp_storage_dir / storage_key


@pytest.mark.asyncio
async def test_delete_file(storage_service, temp_storage_dir):
    """Test deleting a file."""
    # Create a file first
    storage_key = "tenant_1/test_file.txt"
    file_path = temp_storage_dir / storage_key
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(b"test content")
    
    # Delete it
    result = await storage_service.delete_file(storage_key)
    
    assert result is True
    assert not file_path.exists()


@pytest.mark.asyncio
async def test_delete_nonexistent_file(storage_service):
    """Test deleting a non-existent file."""
    result = await storage_service.delete_file("nonexistent/file.txt")
    
    assert result is False


@pytest.mark.asyncio
async def test_file_exists(storage_service, temp_storage_dir):
    """Test checking if file exists."""
    # Create a file
    storage_key = "tenant_1/test_file.txt"
    file_path = temp_storage_dir / storage_key
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(b"test content")
    
    # Check existence
    assert await storage_service.file_exists(storage_key) is True
    assert await storage_service.file_exists("nonexistent/file.txt") is False

