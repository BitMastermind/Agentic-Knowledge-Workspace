"""Authentication endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.models.user import User
from app.models.tenant import Tenant, UserTenant, RoleEnum
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


class RegisterRequest(BaseModel):
    """User registration request."""

    email: EmailStr
    password: str
    full_name: str | None = None
    tenant_name: str | None = None


class LoginRequest(BaseModel):
    """User login request."""

    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Token refresh request."""

    refresh_token: str


class TokenResponse(BaseModel):
    """Token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User info response."""

    id: int
    email: str
    full_name: str | None
    tenant_id: int
    tenant_name: str
    role: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new user and create a default tenant.
    
    Creates:
    - User account
    - Default tenant (workspace)
    - User-tenant relationship with owner role
    """
    try:
        # 1. Check if user already exists
        result = await db.execute(select(User).where(User.email == request.email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # 2. Hash password
        hashed_pwd = hash_password(request.password)
        
        # 3. Create user
        new_user = User(
            email=request.email,
            hashed_password=hashed_pwd,
            full_name=request.full_name,
            is_active=True,
        )
        db.add(new_user)
        await db.flush()  # Get user ID
        
        # 4. Create default tenant
        tenant_name = request.tenant_name or f"{request.email.split('@')[0]}'s Workspace"
        tenant_slug = tenant_name.lower().replace(" ", "-").replace("'", "")
        
        # Ensure unique slug
        slug_base = tenant_slug
        counter = 1
        while True:
            result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
            if not result.scalar_one_or_none():
                break
            tenant_slug = f"{slug_base}-{counter}"
            counter += 1
        
        new_tenant = Tenant(
            name=tenant_name,
            slug=tenant_slug,
        )
        db.add(new_tenant)
        await db.flush()  # Get tenant ID
        
        # 5. Create user-tenant relationship with owner role
        user_tenant = UserTenant(
            user_id=new_user.id,
            tenant_id=new_tenant.id,
            role=RoleEnum.OWNER,
        )
        db.add(user_tenant)
        await db.commit()
        
        # 6. Generate tokens
        token_data = {
            "sub": str(new_user.id),
            "email": new_user.email,
            "tenant_id": new_tenant.id,
            "role": RoleEnum.OWNER.value,
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": str(new_user.id)})
        
        logger.info(
            "user_registered",
            user_id=new_user.id,
            email=new_user.email,
            tenant_id=new_tenant.id,
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("registration_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login user and return JWT tokens.
    
    Returns tokens with user info and default tenant context.
    """
    try:
        # 1. Find user by email
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        
        # 2. Verify password
        if not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled",
            )
        
        # 3. Get user's default tenant (first one, or most recent)
        result = await db.execute(
            select(UserTenant, Tenant)
            .join(Tenant, UserTenant.tenant_id == Tenant.id)
            .where(UserTenant.user_id == user.id)
            .order_by(UserTenant.created_at.desc())
        )
        user_tenant_data = result.first()
        
        if not user_tenant_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No tenant associated with user",
            )
        
        user_tenant, tenant = user_tenant_data
        
        # 4. Generate tokens with tenant context
        # Handle role being Enum or string
        role_value = user_tenant.role.value if hasattr(user_tenant.role, 'value') else str(user_tenant.role)
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "tenant_id": tenant.id,
            "role": role_value,
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        logger.info(
            "user_logged_in",
            user_id=user.id,
            email=user.email,
            tenant_id=tenant.id,
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("login_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed",
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh access token using refresh token.
    
    Validates refresh token and generates new access token.
    """
    try:
        # 1. Validate refresh token
        payload = decode_token(request.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        
        # 2. Get user and tenant info
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        
        # Get default tenant
        result = await db.execute(
            select(UserTenant, Tenant)
            .join(Tenant, UserTenant.tenant_id == Tenant.id)
            .where(UserTenant.user_id == user.id)
            .order_by(UserTenant.created_at.desc())
        )
        user_tenant_data = result.first()
        
        if not user_tenant_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No tenant associated with user",
            )
        
        user_tenant, tenant = user_tenant_data
        
        # 3. Generate new access token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "tenant_id": tenant.id,
            "role": user_tenant.role.value,
        }
        
        new_access_token = create_access_token(token_data)
        
        logger.info("token_refreshed", user_id=user.id)
        
        return {
            "access_token": new_access_token,
            "refresh_token": request.refresh_token,  # Return same refresh token
            "token_type": "bearer",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("token_refresh_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user information from token."""
    # Fetch full user and tenant details
    result = await db.execute(
        select(User, Tenant)
        .join(UserTenant, UserTenant.user_id == User.id)
        .join(Tenant, UserTenant.tenant_id == Tenant.id)
        .where(User.id == current_user["user_id"])
        .where(Tenant.id == current_user["tenant_id"])
    )
    user_data = result.first()
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User or tenant not found",
        )
    
    user, tenant = user_data
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "role": current_user.get("role", "viewer"),
    }

