"""add_conversations_and_messages

Revision ID: c7d8e9f0a1b2
Revises: df80c4d21d48
Create Date: 2026-08-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, None] = 'df80c4d21d48'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Create conversations table if not exists
    if 'conversations' not in tables:
        op.create_table(
            'conversations',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('space_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('spaces.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_conversations_space_id', 'conversations', ['space_id'])

    # 2. Create messages table if not exists
    if 'messages' not in tables:
        op.create_table(
            'messages',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('role', sa.String(length=50), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('citations', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])
        op.create_index('ix_messages_created_at', 'messages', ['created_at'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'messages' in tables:
        op.drop_index('ix_messages_created_at', table_name='messages')
        op.drop_index('ix_messages_conversation_id', table_name='messages')
        op.drop_table('messages')

    if 'conversations' in tables:
        op.drop_index('ix_conversations_space_id', table_name='conversations')
        op.drop_table('conversations')
