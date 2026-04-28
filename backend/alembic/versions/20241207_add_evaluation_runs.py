"""Add evaluation_runs table

Revision ID: 20241207_evaluation_runs
Revises: 20241206_tenant_credentials
Create Date: 2024-12-07 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '20241207_evaluation_runs'
down_revision: Union[str, None] = '20241206_tenant_credentials'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'evaluation_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('sources', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('latency_ms', sa.Float(), nullable=True),
        sa.Column('token_count', sa.Integer(), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('user_feedback', sa.String(), nullable=True),
        sa.Column('eval_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_evaluation_runs_id'), 'evaluation_runs', ['id'], unique=False)
    op.create_index(op.f('ix_evaluation_runs_tenant_id'), 'evaluation_runs', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_evaluation_runs_user_id'), 'evaluation_runs', ['user_id'], unique=False)
    op.create_index(op.f('ix_evaluation_runs_created_at'), 'evaluation_runs', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_evaluation_runs_created_at'), table_name='evaluation_runs')
    op.drop_index(op.f('ix_evaluation_runs_user_id'), table_name='evaluation_runs')
    op.drop_index(op.f('ix_evaluation_runs_tenant_id'), table_name='evaluation_runs')
    op.drop_index(op.f('ix_evaluation_runs_id'), table_name='evaluation_runs')
    op.drop_table('evaluation_runs')
