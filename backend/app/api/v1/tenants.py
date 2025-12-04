"""Tenant management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tenant import Tenant, UserTenant, RoleEnum
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


class TenantResponse(BaseModel):
    """Tenant response model."""

    id: int
    name: str
    slug: str
    role: str


class CreateTenantRequest(BaseModel):
    """Create tenant request."""

    name: str
    slug: str | None = None


@router.get("/", response_model=list[TenantResponse])
async def list_tenants(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tenants for the current user."""
    try:
        # Query user_tenants joined with tenants
        result = await db.execute(
            select(UserTenant, Tenant)
            .join(Tenant, UserTenant.tenant_id == Tenant.id)
            .where(UserTenant.user_id == current_user["user_id"])
            .order_by(UserTenant.created_at.desc())
        )
        
        tenants = []
        for user_tenant, tenant in result:
            tenants.append({
                "id": tenant.id,
                "name": tenant.name,
                "slug": tenant.slug,
                "role": user_tenant.role.value,
            })
        
        return tenants
        
    except Exception as e:
        logger.error("list_tenants_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list tenants",
        )


@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    request: CreateTenantRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tenant (workspace/organization)."""
    try:
        # Generate slug if not provided
        slug = request.slug or request.name.lower().replace(" ", "-")
        
        # Validate slug is unique
        result = await db.execute(select(Tenant).where(Tenant.slug == slug))
        if result.scalar_one_or_none():
            # Make slug unique
            counter = 1
            base_slug = slug
            while True:
                slug = f"{base_slug}-{counter}"
                result = await db.execute(select(Tenant).where(Tenant.slug == slug))
                if not result.scalar_one_or_none():
                    break
                counter += 1
        
        # Create tenant
        new_tenant = Tenant(
            name=request.name,
            slug=slug,
        )
        db.add(new_tenant)
        await db.flush()
        
        # Add user as owner
        user_tenant = UserTenant(
            user_id=current_user["user_id"],
            tenant_id=new_tenant.id,
            role=RoleEnum.OWNER,
        )
        db.add(user_tenant)
        await db.commit()
        
        logger.info(
            "tenant_created",
            tenant_id=new_tenant.id,
            user_id=current_user["user_id"],
        )
        
        return {
            "id": new_tenant.id,
            "name": new_tenant.name,
            "slug": new_tenant.slug,
            "role": "owner",
        }
        
    except Exception as e:
        await db.rollback()
        logger.error("create_tenant_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create tenant",
        )

