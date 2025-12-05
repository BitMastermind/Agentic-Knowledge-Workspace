"""Add indexes to documents table for performance

Revision ID: 005_doc_indexes
Revises: 004_768_emb
Create Date: 2024-12-05 16:00:00.000000

This migration adds:
1. Index on created_at for sorting
2. Composite index on (tenant_id, created_at) for optimized tenant queries
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '005_doc_indexes'
down_revision: Union[str, None] = '004_768_emb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add performance indexes to documents table.
    
    - created_at index: Speeds up date-based sorting
    - (tenant_id, created_at) composite: Optimizes tenant-specific queries with date ordering
    """
    # Add index on created_at if it doesn't exist
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_documents_created_at 
        ON documents (created_at DESC)
    """)
    
    # Add composite index for tenant_id + created_at
    # This is crucial for the list_documents query which filters by tenant and orders by date
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_tenant_created 
        ON documents (tenant_id, created_at DESC)
    """)


def downgrade() -> None:
    """Remove the performance indexes."""
    op.execute('DROP INDEX IF EXISTS idx_tenant_created')
    op.execute('DROP INDEX IF EXISTS ix_documents_created_at')

