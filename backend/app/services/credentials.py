"""Service for managing tenant integration credentials."""

from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenant_credentials import TenantCredentials
from app.core.encryption import get_encryption
from app.core.logging import get_logger

logger = get_logger(__name__)


class CredentialsService:
    """Service for managing encrypted tenant credentials."""
    
    def __init__(self):
        self.encryption = get_encryption()
    
    async def get_credentials(
        self,
        db: AsyncSession,
        tenant_id: int,
        integration_type: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get decrypted credentials for a tenant integration.
        
        Args:
            db: Database session
            tenant_id: Tenant ID
            integration_type: Integration type ("jira", "email", etc.)
            
        Returns:
            Decrypted credentials dict or None if not found
        """
        try:
            result = await db.execute(
                select(TenantCredentials)
                .where(
                    TenantCredentials.tenant_id == tenant_id,
                    TenantCredentials.integration_type == integration_type,
                    TenantCredentials.is_active == "active",
                )
            )
            cred = result.scalar_one_or_none()
            
            if not cred:
                return None
            
            # Decrypt credentials
            decrypted = self.encryption.decrypt(cred.encrypted_credentials["encrypted_data"])
            return decrypted
            
        except Exception as e:
            logger.error(
                "get_credentials_failed",
                tenant_id=tenant_id,
                integration_type=integration_type,
                error=str(e),
            )
            return None
    
    async def save_credentials(
        self,
        db: AsyncSession,
        tenant_id: int,
        integration_type: str,
        credentials: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TenantCredentials:
        """
        Save encrypted credentials for a tenant integration.
        
        Args:
            db: Database session
            tenant_id: Tenant ID
            integration_type: Integration type ("jira", "email", etc.)
            credentials: Credentials to encrypt and save
            metadata: Optional non-sensitive metadata
            
        Returns:
            Created or updated TenantCredentials instance
        """
        try:
            # Check if credentials already exist
            result = await db.execute(
                select(TenantCredentials)
                .where(
                    TenantCredentials.tenant_id == tenant_id,
                    TenantCredentials.integration_type == integration_type,
                )
            )
            existing = result.scalar_one_or_none()
            
            # Encrypt credentials
            encrypted_data = self.encryption.encrypt(credentials)
            
            if existing:
                # Update existing
                existing.encrypted_credentials = {"encrypted_data": encrypted_data}
                if metadata:
                    existing.meta = metadata
                existing.is_active = "active"
                await db.commit()
                await db.refresh(existing)
                return existing
            else:
                # Create new
                new_cred = TenantCredentials(
                    tenant_id=tenant_id,
                    integration_type=integration_type,
                    encrypted_credentials={"encrypted_data": encrypted_data},
                    meta=metadata or {},
                    is_active="active",
                )
                db.add(new_cred)
                await db.commit()
                await db.refresh(new_cred)
                return new_cred
                
        except Exception as e:
            await db.rollback()
            logger.error(
                "save_credentials_failed",
                tenant_id=tenant_id,
                integration_type=integration_type,
                error=str(e),
            )
            raise ValueError(f"Failed to save credentials: {str(e)}")
    
    async def delete_credentials(
        self,
        db: AsyncSession,
        tenant_id: int,
        integration_type: str,
    ) -> bool:
        """
        Delete credentials for a tenant integration.
        
        Args:
            db: Database session
            tenant_id: Tenant ID
            integration_type: Integration type
            
        Returns:
            True if deleted, False if not found
        """
        try:
            result = await db.execute(
                select(TenantCredentials)
                .where(
                    TenantCredentials.tenant_id == tenant_id,
                    TenantCredentials.integration_type == integration_type,
                )
            )
            cred = result.scalar_one_or_none()
            
            if not cred:
                return False
            
            await db.delete(cred)
            await db.commit()
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(
                "delete_credentials_failed",
                tenant_id=tenant_id,
                integration_type=integration_type,
                error=str(e),
            )
            return False
    
    async def list_credentials(
        self,
        db: AsyncSession,
        tenant_id: int,
    ) -> list[Dict[str, Any]]:
        """
        List all credentials for a tenant (without decrypting).
        
        Args:
            db: Database session
            tenant_id: Tenant ID
            
        Returns:
            List of credential metadata
        """
        try:
            result = await db.execute(
                select(TenantCredentials)
                .where(TenantCredentials.tenant_id == tenant_id)
            )
            creds = result.scalars().all()
            
            return [
                {
                    "id": cred.id,
                    "integration_type": cred.integration_type,
                    "metadata": cred.meta,  # Use meta attribute, but return as metadata in API
                    "is_active": cred.is_active,
                    "last_used_at": cred.last_used_at.isoformat() if cred.last_used_at else None,
                    "created_at": cred.created_at.isoformat(),
                }
                for cred in creds
            ]
            
        except Exception as e:
            logger.error("list_credentials_failed", tenant_id=tenant_id, error=str(e))
            return []


# Global service instance
credentials_service = CredentialsService()

