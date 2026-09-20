"""step9_action_proposals_table

Revision ID: e29d18c93b71
Revises: df80c4d21d48
Create Date: 2026-08-25 21:48:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e29d18c93b71'
down_revision: Union[str, None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create action_proposals table
    op.create_table(
        'action_proposals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('proposal_id', sa.String(length=100), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('space_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('spaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('objective_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('objectives.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.String(length=100), nullable=True),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('source_recommendation', sa.Text(), nullable=True),
        sa.Column('confidence', sa.String(length=20), nullable=False, server_default='medium'),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approved_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('executed_target_id', sa.String(length=100), nullable=True),
        sa.Column('error_code', sa.String(length=50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.UniqueConstraint('message_id', 'proposal_id', name='uq_action_proposals_message_proposal'),
        sa.CheckConstraint("status IN ('pending', 'approved', 'executed', 'rejected', 'failed')", name='chk_action_proposals_status')
    )

    # 2. Create performance & query indexes
    op.create_index('idx_action_proposals_user_space', 'action_proposals', ['user_id', 'space_id'])
    op.create_index('idx_action_proposals_message_id', 'action_proposals', ['message_id'])
    op.create_index('idx_action_proposals_user_status', 'action_proposals', ['user_id', 'status'])
    op.create_index('idx_action_proposals_created_at', 'action_proposals', ['created_at'])

    # 3. Data Backfill from existing messages.metadata_json["action_proposals"]
    # Safely unpacks historical proposals into action_proposals rows while preventing duplicate keys
    backfill_sql = """
    INSERT INTO action_proposals (
        id,
        proposal_id,
        user_id,
        space_id,
        conversation_id,
        message_id,
        objective_id,
        action_type,
        target_id,
        parameters,
        reason,
        source_recommendation,
        confidence,
        status,
        created_at,
        approved_at,
        approved_by_user_id,
        executed_at,
        executed_target_id
    )
    SELECT
        gen_random_uuid(),
        p->>'proposal_id',
        c.user_id,
        c.space_id,
        c.id,
        m.id,
        CASE
            WHEN (m.metadata_json->>'objective_id') IS NOT NULL AND (m.metadata_json->>'objective_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN (m.metadata_json->>'objective_id')::uuid
            ELSE NULL
        END,
        COALESCE(p->>'action_type', 'create_goal'),
        p->>'target_id',
        COALESCE(p->'parameters', '{}'::jsonb),
        COALESCE(p->>'reason', 'Historical proposal'),
        p->>'source_recommendation',
        COALESCE(p->>'confidence', 'medium'),
        CASE
            WHEN p->>'execution_status' = 'executed' THEN 'executed'
            WHEN p->>'execution_status' = 'rejected' THEN 'rejected'
            WHEN p->>'execution_status' = 'failed' THEN 'failed'
            ELSE 'pending'
        END,
        m.created_at,
        CASE WHEN p->>'execution_status' = 'executed' THEN m.created_at ELSE NULL END,
        CASE WHEN p->>'execution_status' = 'executed' THEN c.user_id ELSE NULL END,
        CASE
            WHEN p->>'executed_at' IS NOT NULL AND p->>'executed_at' != ''
            THEN (p->>'executed_at')::timestamptz
            WHEN p->>'execution_status' = 'executed'
            THEN m.created_at
            ELSE NULL
        END,
        p->>'executed_target_id'
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    CROSS JOIN LATERAL jsonb_array_elements(m.metadata_json->'action_proposals') AS p
    WHERE m.metadata_json IS NOT NULL
      AND jsonb_typeof(m.metadata_json->'action_proposals') = 'array'
      AND p->>'proposal_id' IS NOT NULL
    ON CONFLICT (message_id, proposal_id) DO NOTHING;
    """
    op.execute(backfill_sql)


def downgrade() -> None:
    op.drop_index('idx_action_proposals_created_at', table_name='action_proposals')
    op.drop_index('idx_action_proposals_user_status', table_name='action_proposals')
    op.drop_index('idx_action_proposals_message_id', table_name='action_proposals')
    op.drop_index('idx_action_proposals_user_space', table_name='action_proposals')
    op.drop_table('action_proposals')
