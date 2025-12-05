"""Upgrade to 768-dim embeddings (all-mpnet-base-v2)

Revision ID: 004_768_emb
Revises: 003_local_emb
Create Date: 2024-12-05 14:00:00.000000

This migration upgrades from all-MiniLM-L6-v2 (384 dims) to 
all-mpnet-base-v2 (768 dims) for better semantic understanding.

WARNING: This will truncate existing chunks - re-ingestion required!
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004_768_emb'
down_revision: Union[str, None] = '003_local_emb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade embedding dimension from 384 to 768.
    
    Model: all-mpnet-base-v2
    - 768 dimensions
    - Better semantic understanding
    - Higher retrieval accuracy
    - Still runs locally (FREE!)
    """
    # Drop the existing HNSW index
    op.execute('DROP INDEX IF EXISTS ix_chunks_embedding_hnsw')
    
    # Truncate existing chunks (dimension change requires re-embedding)
    op.execute('TRUNCATE TABLE chunks CASCADE')
    
    # Change embedding column to 768 dimensions
    op.execute('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(768)')
    
    # Recreate HNSW index with new dimension
    # Using optimized parameters for 768-dim vectors
    op.execute("""
        CREATE INDEX ix_chunks_embedding_hnsw 
        ON chunks 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 128)
    """)


def downgrade() -> None:
    """Revert back to 384 dimensions (all-MiniLM-L6-v2)."""
    op.execute('DROP INDEX IF EXISTS ix_chunks_embedding_hnsw')
    op.execute('TRUNCATE TABLE chunks CASCADE')
    op.execute('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(384)')
    op.execute("""
        CREATE INDEX ix_chunks_embedding_hnsw 
        ON chunks 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

