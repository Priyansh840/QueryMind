"""add_space_members_and_backfill_owners

Revision ID: f38a1b2c3d4e
Revises: e29d18c93b71
Create Date: 2026-09-09 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f38a1b2c3d4e'
down_revision: Union[str, None] = 'e29d18c93b71'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create space_members table
    op.create_table(
        'space_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('space_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('spaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='member'),
        sa.Column('invited_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('space_id', 'user_id', name='uq_space_members_space_user')
    )

    # 2. Create indexes
    op.create_index('ix_space_members_space_id', 'space_members', ['space_id'])
    op.create_index('ix_space_members_user_id', 'space_members', ['user_id'])
    op.create_index('ix_space_members_space_user', 'space_members', ['space_id', 'user_id'])

    # 3. Backfill existing Space creators as 'owner'
    op.execute(
        """
        INSERT INTO space_members (id, space_id, user_id, role, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            id,
            user_id,
            'owner',
            created_at,
            updated_at
        FROM spaces
        ON CONFLICT (space_id, user_id) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.drop_index('ix_space_members_space_user', table_name='space_members')
    op.drop_index('ix_space_members_user_id', table_name='space_members')
    op.drop_index('ix_space_members_space_id', table_name='space_members')
    op.drop_table('space_members')
