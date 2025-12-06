"""API endpoints for managing tenant integration credentials."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import require_tenant_access, require_role
from app.core.logging import get_logger
from app.services.credentials import credentials_service

logger = get_logger(__name__)
router = APIRouter()


class SaveCredentialsRequest(BaseModel):
    """Request to save credentials."""
    
    integration_type: str  # "jira", "email", etc.
    credentials: dict  # Credentials to encrypt
    metadata: Optional[dict] = None  # Non-sensitive metadata


class CredentialsResponse(BaseModel):
    """Response with credential metadata (no sensitive data)."""
    
    id: int
    integration_type: str
    metadata: dict
    is_active: str
    last_used_at: Optional[str] = None
    created_at: str


@router.post("/credentials", status_code=status.HTTP_201_CREATED)
async def save_credentials(
    request: SaveCredentialsRequest,
    current_user: dict = Depends(require_role("admin")),  # Only admins can manage credentials
    db: AsyncSession = Depends(get_db),
):
    """
    Save encrypted credentials for a tenant integration.
    
    Only admins and owners can manage credentials.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Validate integration type
        valid_types = ["jira", "email"]
        if request.integration_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid integration type. Must be one of: {', '.join(valid_types)}",
            )
        
        # Save credentials
        cred = await credentials_service.save_credentials(
            db=db,
            tenant_id=tenant_id,
            integration_type=request.integration_type,
            credentials=request.credentials,
            metadata=request.metadata,
        )
        
        logger.info(
            "credentials_saved",
            tenant_id=tenant_id,
            integration_type=request.integration_type,
            user_id=current_user["user_id"],
        )
        
        return {
            "id": cred.id,
            "integration_type": cred.integration_type,
            "metadata": cred.meta,  # Use meta attribute, but return as metadata in API
            "is_active": cred.is_active,
            "created_at": cred.created_at.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("save_credentials_endpoint_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save credentials: {str(e)}",
        )


@router.get("/credentials", response_model=list[CredentialsResponse])
async def list_credentials(
    current_user: dict = Depends(require_tenant_access),
    db: AsyncSession = Depends(get_db),
):
    """List all credentials for the current tenant (metadata only, no sensitive data)."""
    try:
        tenant_id = current_user["tenant_id"]
        creds = await credentials_service.list_credentials(db=db, tenant_id=tenant_id)
        return creds
        
    except Exception as e:
        logger.error("list_credentials_endpoint_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list credentials: {str(e)}",
        )


@router.delete("/credentials/{integration_type}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credentials(
    integration_type: str,
    current_user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Delete credentials for a specific integration type."""
    try:
        tenant_id = current_user["tenant_id"]
        
        deleted = await credentials_service.delete_credentials(
            db=db,
            tenant_id=tenant_id,
            integration_type=integration_type,
        )
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Credentials for {integration_type} not found",
            )
        
        logger.info(
            "credentials_deleted",
            tenant_id=tenant_id,
            integration_type=integration_type,
            user_id=current_user["user_id"],
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_credentials_endpoint_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete credentials: {str(e)}",
        )

