"""File storage service for document uploads."""

import asyncio
import os
import shutil
import tempfile
from pathlib import Path
from typing import BinaryIO, Optional
import uuid

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from botocore.config import Config

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class StorageService:
    """Service for storing and retrieving uploaded files."""

    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER
        self.local_path = Path(settings.LOCAL_STORAGE_PATH)
        self.s3_client: Optional[boto3.client] = None
        self.s3_bucket: Optional[str] = None
        
        # Create local storage directory if it doesn't exist
        if self.provider == "local":
            self.local_path.mkdir(parents=True, exist_ok=True)
            logger.info("local_storage_initialized", path=str(self.local_path))
        elif self.provider == "s3":
            self._init_s3_client()

    def _init_s3_client(self) -> None:
        """Initialize S3 client with credentials from settings."""
        try:
            if not settings.S3_BUCKET:
                raise ValueError("S3_BUCKET must be set when STORAGE_PROVIDER=s3")
            
            self.s3_bucket = settings.S3_BUCKET
            
            # Configure boto3 with retry and timeout settings
            boto_config = Config(
                retries={'max_attempts': 3, 'mode': 'standard'},
                connect_timeout=10,
                read_timeout=10,
            )
            
            # Initialize S3 client with credentials
            # If credentials are not provided, boto3 will use default credential chain
            # (environment variables, IAM role, etc.)
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION,
                    config=boto_config,
                )
            else:
                # Use default credential chain (IAM role, env vars, etc.)
                self.s3_client = boto3.client(
                    's3',
                    region_name=settings.AWS_REGION,
                    config=boto_config,
                )
            
            # Verify S3 connection by checking bucket exists
            try:
                self.s3_client.head_bucket(Bucket=self.s3_bucket)
                logger.info("s3_storage_initialized", bucket=self.s3_bucket, region=settings.AWS_REGION)
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                if error_code == '404':
                    raise ValueError(f"S3 bucket '{self.s3_bucket}' does not exist")
                elif error_code == '403':
                    raise ValueError(f"Access denied to S3 bucket '{self.s3_bucket}'. Check credentials.")
                else:
                    raise ValueError(f"Failed to access S3 bucket '{self.s3_bucket}': {error_code}")
                    
        except Exception as e:
            logger.error("s3_client_init_failed", error=str(e))
            raise

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
        """
        Save file to S3 bucket.
        
        Args:
            file: File object to save
            storage_key: Unique key for storing the file in S3
            
        Returns:
            storage_key: The key where file was saved
        """
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")
        
        try:
            # Reset file pointer to beginning
            file.seek(0)
            
            # Upload file to S3
            # Use ExtraArgs to set metadata and content type
            extra_args = {
                'Metadata': {
                    'storage-key': storage_key,
                }
            }
            
            # Try to detect content type from storage_key extension
            if storage_key.endswith('.pdf'):
                extra_args['ContentType'] = 'application/pdf'
            elif storage_key.endswith('.csv'):
                extra_args['ContentType'] = 'text/csv'
            elif storage_key.endswith('.md'):
                extra_args['ContentType'] = 'text/markdown'
            elif storage_key.endswith('.txt'):
                extra_args['ContentType'] = 'text/plain'
            elif storage_key.endswith('.docx'):
                extra_args['ContentType'] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            
            # Run blocking boto3 operation in thread pool for async compatibility
            await asyncio.to_thread(
                self.s3_client.upload_fileobj,
                file,
                self.s3_bucket,
                storage_key,
                ExtraArgs=extra_args,
            )
            
            logger.info("file_saved_to_s3", storage_key=storage_key, bucket=self.s3_bucket)
            return storage_key
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(
                "s3_upload_failed",
                error=error_message,
                error_code=error_code,
                storage_key=storage_key,
                bucket=self.s3_bucket,
            )
            raise RuntimeError(f"Failed to upload file to S3: {error_message}") from e
        except BotoCoreError as e:
            logger.error("s3_upload_failed", error=str(e), storage_key=storage_key)
            raise RuntimeError(f"S3 upload error: {str(e)}") from e
        except Exception as e:
            logger.error("s3_upload_failed", error=str(e), storage_key=storage_key)
            raise

    async def get_file_path(self, storage_key: str) -> Path:
        """
        Get local file path for a stored file.
        
        For local storage, returns the actual file path.
        For S3 storage, downloads the file to a temporary location and returns that path.
        Note: For S3, the temporary file should be cleaned up after use.
        """
        if self.provider == "local":
            return self.local_path / storage_key
        elif self.provider == "s3":
            return await self._download_s3_to_temp(storage_key)
        else:
            raise ValueError(f"Unsupported storage provider: {self.provider}")
    
    async def _download_s3_to_temp(self, storage_key: str) -> Path:
        """
        Download file from S3 to a temporary location.
        
        Args:
            storage_key: S3 key of the file to download
            
        Returns:
            Path to the temporary file
        """
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")
        
        try:
            # Create temporary file
            temp_dir = Path(tempfile.gettempdir()) / "agentic_workspace"
            temp_dir.mkdir(parents=True, exist_ok=True)
            
            # Create temp file with same extension as storage_key
            file_ext = Path(storage_key).suffix or ".tmp"
            temp_file = temp_dir / f"{uuid.uuid4().hex}{file_ext}"
            
            # Download file from S3 (run in thread pool for async compatibility)
            await asyncio.to_thread(
                self.s3_client.download_file,
                self.s3_bucket,
                storage_key,
                str(temp_file),
            )
            
            logger.info("s3_file_downloaded_to_temp", storage_key=storage_key, temp_path=str(temp_file))
            return temp_file
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(
                "s3_download_failed",
                error=error_message,
                error_code=error_code,
                storage_key=storage_key,
            )
            raise RuntimeError(f"Failed to download file from S3: {error_message}") from e
        except Exception as e:
            logger.error("s3_download_failed", error=str(e), storage_key=storage_key)
            raise

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
        elif self.provider == "s3":
            return await self._delete_s3_file(storage_key)
        else:
            raise ValueError(f"Unsupported storage provider: {self.provider}")
    
    async def _delete_s3_file(self, storage_key: str) -> bool:
        """
        Delete file from S3 bucket.
        
        Args:
            storage_key: S3 key of the file to delete
            
        Returns:
            True if file was deleted, False if file doesn't exist
        """
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")
        
        try:
            # Run blocking boto3 operation in thread pool for async compatibility
            await asyncio.to_thread(
                self.s3_client.delete_object,
                Bucket=self.s3_bucket,
                Key=storage_key,
            )
            logger.info("s3_file_deleted", storage_key=storage_key, bucket=self.s3_bucket)
            return True
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == 'NoSuchKey':
                logger.warning("s3_file_not_found", storage_key=storage_key)
                return False
            else:
                error_message = e.response.get('Error', {}).get('Message', str(e))
                logger.error(
                    "s3_delete_failed",
                    error=error_message,
                    error_code=error_code,
                    storage_key=storage_key,
                )
                raise RuntimeError(f"Failed to delete file from S3: {error_message}") from e
        except Exception as e:
            logger.error("s3_delete_failed", error=str(e), storage_key=storage_key)
            raise

    async def file_exists(self, storage_key: str) -> bool:
        """Check if file exists in storage."""
        if self.provider == "local":
            file_path = self.local_path / storage_key
            return file_path.exists()
        elif self.provider == "s3":
            return await self._s3_file_exists(storage_key)
        else:
            raise ValueError(f"Unsupported storage provider: {self.provider}")
    
    async def _s3_file_exists(self, storage_key: str) -> bool:
        """
        Check if file exists in S3 bucket.
        
        Args:
            storage_key: S3 key to check
            
        Returns:
            True if file exists, False otherwise
        """
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")
        
        try:
            # Run blocking boto3 operation in thread pool for async compatibility
            await asyncio.to_thread(
                self.s3_client.head_object,
                Bucket=self.s3_bucket,
                Key=storage_key,
            )
            return True
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == '404' or error_code == 'NoSuchKey':
                return False
            else:
                # For other errors, log and re-raise
                error_message = e.response.get('Error', {}).get('Message', str(e))
                logger.error(
                    "s3_head_object_failed",
                    error=error_message,
                    error_code=error_code,
                    storage_key=storage_key,
                )
                raise RuntimeError(f"Failed to check file existence in S3: {error_message}") from e
        except Exception as e:
            logger.error("s3_file_exists_check_failed", error=str(e), storage_key=storage_key)
            raise


# Singleton instance
storage_service = StorageService()

