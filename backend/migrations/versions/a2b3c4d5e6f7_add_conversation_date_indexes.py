"""add_conversation_date_indexes

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-10-06 20:45:00.000000

Adds composite indexes to conversations for efficient date-range and chronological querying:
- ix_conversations_user_created (user_id, created_at DESC)
- ix_conversations_space_created (space_id, created_at DESC)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create composite indexes for date-range queries
    op.create_index(
        'ix_conversations_user_created',
        'conversations',
        ['user_id', sa.text('created_at DESC')],
        unique=False
    )
    op.create_index(
        'ix_conversations_space_created',
        'conversations',
        ['space_id', sa.text('created_at DESC')],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_conversations_space_created', table_name='conversations')
    op.drop_index('ix_conversations_user_created', table_name='conversations')
