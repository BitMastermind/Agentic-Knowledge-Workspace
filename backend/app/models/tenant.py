"""Tenant and user-tenant relationship models."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class RoleEnum(str, enum.Enum):
    """User roles within a tenant."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class Tenant(Base):
    """Tenant (organization/workspace) model for multi-tenancy."""

    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserTenant(Base):
    """Association table for users and tenants with roles."""

    __tablename__ = "user_tenants"
    __table_args__ = (
        # Ensure a user can only have one role per tenant
        {"schema": None},
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.MEMBER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

