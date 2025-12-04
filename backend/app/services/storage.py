"""File storage service for document uploads."""

import os
import shutil
from pathlib import Path
from typing import BinaryIO
import uuid

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class StorageService:
    """Service for storing and retrieving uploaded files."""

    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER
        self.local_path = Path(settings.LOCAL_STORAGE_PATH)
        
        # Create local storage directory if it doesn't exist
        if self.provider == "local":
            self.local_path.mkdir(parents=True, exist_ok=True)
            logger.info("local_storage_initialized", path=str(self.local_path))

    def generate_storage_key(self, tenant_id: int, filename: str) -> str:
        """Generate unique storage key for file."""
        # Add UUID to prevent filename collisions
        file_uuid = uuid.uuid4().hex[:8]
        safe_filename = filename.replace(" ", "_")
        return f"tenant_{tenant_id}/{file_uuid}_{safe_filename}"

    async def save_file(self, file: BinaryIO, storage_key: str) -> str:
        """
        Save uploaded file to storage.
        
        Args:
            file: File object to save
            storage_key: Unique key for storing the file
            
        Returns:
            storage_key: The key where file was saved
        """
        if self.provider == "local":
            return await self._save_local(file, storage_key)
        elif self.provider == "s3":
            return await self._save_s3(file, storage_key)
        else:
            raise ValueError(f"Unsupported storage provider: {self.provider}")

    async def _save_local(self, file: BinaryIO, storage_key: str) -> str:
        """Save file to local filesystem."""
        try:
            file_path = self.local_path / storage_key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Save file
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file, f)
            
            logger.info("file_saved_locally", storage_key=storage_key)
            return storage_key
            
        except Exception as e:
            logger.error("file_save_failed", error=str(e), storage_key=storage_key)
            raise

    async def _save_s3(self, file: BinaryIO, storage_key: str) -> str:
        """Save file to S3 (placeholder for future implementation)."""
        # TODO: Implement S3 upload using boto3
        raise NotImplementedError("S3 storage not yet implemented")

    async def get_file_path(self, storage_key: str) -> Path:
        """Get local file path for a stored file."""
        if self.provider == "local":
            return self.local_path / storage_key
        else:
            raise NotImplementedError(f"get_file_path not implemented for {self.provider}")

    async def delete_file(self, storage_key: str) -> bool:
        """Delete file from storage."""
        if self.provider == "local":
            try:
                file_path = self.local_path / storage_key
                if file_path.exists():
                    file_path.unlink()
                    logger.info("file_deleted", storage_key=storage_key)
                    return True
                return False
            except Exception as e:
                logger.error("file_delete_failed", error=str(e), storage_key=storage_key)
                return False
        else:
            raise NotImplementedError(f"delete_file not implemented for {self.provider}")

    async def file_exists(self, storage_key: str) -> bool:
        """Check if file exists in storage."""
        if self.provider == "local":
            file_path = self.local_path / storage_key
            return file_path.exists()
        else:
            raise NotImplementedError(f"file_exists not implemented for {self.provider}")


# Singleton instance
storage_service = StorageService()

