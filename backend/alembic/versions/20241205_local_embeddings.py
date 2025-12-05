"""Change to local embeddings (384 dims)

Revision ID: 003_local_emb
Revises: 002_gemini_emb
Create Date: 2024-12-05 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_local_emb'
down_revision: Union[str, None] = '002_gemini_emb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Change vector dimension from 768 (Gemini) to 384 (Sentence Transformers).
    
    Sentence Transformers: Local, FREE, NO API limits!
    """
    # Drop the existing HNSW index
    op.execute('DROP INDEX IF EXISTS ix_chunks_embedding_hnsw')
    
    # Drop all existing chunks (can't convert dimensions)
    op.execute('TRUNCATE TABLE chunks CASCADE')
    
    # Change embedding column to 384 dimensions
    op.execute('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(384)')
    
    # Recreate HNSW index with new dimension
    op.execute("""
        CREATE INDEX ix_chunks_embedding_hnsw 
        ON chunks 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)


def downgrade() -> None:
    """Revert back to 768 dimensions."""
    op.execute('DROP INDEX IF EXISTS ix_chunks_embedding_hnsw')
    op.execute('TRUNCATE TABLE chunks CASCADE')
    op.execute('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(768)')
    op.execute("""
        CREATE INDEX ix_chunks_embedding_hnsw 
        ON chunks 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

