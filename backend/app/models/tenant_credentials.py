"""Tenant integration credentials model with encryption."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class TenantCredentials(Base):
    """Encrypted credentials for tenant integrations (Jira, Email, etc.)."""

    __tablename__ = "tenant_credentials"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    
    # Integration type: "jira", "email", "slack", etc.
    integration_type = Column(String, nullable=False, index=True)
    
    # Encrypted credentials stored as JSON
    # Structure: {"encrypted_data": "...", "key_id": "..."}
    encrypted_credentials = Column(JSON, nullable=False)
    
    # Metadata (non-sensitive info like server URL, email, etc.)
    # Using 'meta' instead of 'metadata' to avoid SQLAlchemy reserved word conflict
    meta = Column(JSON, default={}, name="metadata")  # e.g., {"server_url": "...", "email": "..."}
    
    # Status
    is_active = Column(String, default="active")  # "active", "inactive", "error"
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Ensure one credential per integration type per tenant
    __table_args__ = (
        # This will be handled at application level or via unique constraint
    )

