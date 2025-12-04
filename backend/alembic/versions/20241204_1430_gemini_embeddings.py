"""Change embedding dimension to 768 for Gemini embeddings

Revision ID: 002_gemini_emb
Revises: 001_initial
Create Date: 2024-12-04 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_gemini_emb'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Change vector dimension from 1536 (OpenAI) to 768 (Gemini).
    
    Note: This will delete existing chunks since we can't convert dimensions.
    Run this before uploading any documents, or re-process existing documents.
    """
    # Drop the existing HNSW index
    op.execute('DROP INDEX IF EXISTS ix_chunks_embedding_hnsw')
    
    # Drop all existing chunks (can't convert dimensions)
    op.execute('TRUNCATE TABLE chunks')
    
    # Change embedding column to 768 dimensions (Gemini)
    op.execute('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(768)')
    
    # Recreate HNSW index with new dimension
    op.execute("""
        CREATE INDEX ix_chunks_embedding_hnsw 
        ON chunks 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)


def downgrade() -> None:
    """
    Revert back to 1536 dimensions (OpenAI).
    
    Note: This will delete existing chunks.
    """
    # Drop the HNSW index
    op.execute('DROP INDEX IF EXISTS ix_chunks_embedding_hnsw')
    
    # Drop all existing chunks
    op.execute('TRUNCATE TABLE chunks')
    
    # Change embedding column back to 1536 dimensions
    op.execute('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536)')
    
    # Recreate HNSW index
    op.execute("""
        CREATE INDEX ix_chunks_embedding_hnsw 
        ON chunks 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

