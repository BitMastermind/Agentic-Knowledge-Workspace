"""Add tenant credentials table

Revision ID: 20241206_tenant_credentials
Revises: 20241205_upgrade_embeddings_768
Create Date: 2024-12-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20241206_tenant_credentials'
down_revision: Union[str, None] = '005_doc_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create tenant_credentials table."""
    op.create_table(
        'tenant_credentials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('integration_type', sa.String(), nullable=False),
        sa.Column('encrypted_credentials', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.String(), nullable=True, server_default='active'),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tenant_credentials_id'), 'tenant_credentials', ['id'], unique=False)
    op.create_index(op.f('ix_tenant_credentials_tenant_id'), 'tenant_credentials', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_tenant_credentials_integration_type'), 'tenant_credentials', ['integration_type'], unique=False)
    
    # Create unique constraint for one credential per integration type per tenant
    op.create_unique_constraint(
        'uq_tenant_credentials_tenant_integration',
        'tenant_credentials',
        ['tenant_id', 'integration_type']
    )


def downgrade() -> None:
    """Drop tenant_credentials table."""
    op.drop_constraint('uq_tenant_credentials_tenant_integration', 'tenant_credentials', type_='unique')
    op.drop_index(op.f('ix_tenant_credentials_integration_type'), table_name='tenant_credentials')
    op.drop_index(op.f('ix_tenant_credentials_tenant_id'), table_name='tenant_credentials')
    op.drop_index(op.f('ix_tenant_credentials_id'), table_name='tenant_credentials')
    op.drop_table('tenant_credentials')

