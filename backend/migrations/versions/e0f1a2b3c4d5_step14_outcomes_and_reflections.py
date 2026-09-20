"""step14_outcomes_and_reflections

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-09-18 22:45:00.000000

Step 14: Outcome & Reflection Layer
Creates:
- outcomes: first-class workspace outcome records with state_delta and evaluation metadata
- reflections: actionable lessons and guidance learned from outcomes

Semantic integrity:
- ActionProposal execution status ("executed") ≠ Outcome status ("unknown", "success", "failed", "partial")
- Database uniqueness on action_proposal_id enforces idempotency
- Multi-tenant tenant boundaries on space_id
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e0f1a2b3c4d5'
down_revision: Union[str, None] = 'd9e0f1a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Create outcomes table
    if "outcomes" not in tables:
        op.create_table(
            "outcomes",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("space_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column(
                "action_proposal_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("action_proposals.id", ondelete="SET NULL"),
                nullable=True,
                unique=True,
            ),
            sa.Column(
                "workflow_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("workflows.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("target_entity_type", sa.String(50), nullable=False),
            sa.Column("target_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("initiated_by", sa.String(20), nullable=False),
            sa.Column("status", sa.String(30), server_default="unknown", nullable=False),
            sa.Column("expected_outcome", sa.Text(), nullable=True),
            sa.Column("actual_outcome", sa.Text(), nullable=True),
            sa.Column("state_delta", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "evaluator_user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.CheckConstraint("status IN ('success', 'failed', 'partial', 'unknown')", name="ck_outcomes_status"),
            sa.CheckConstraint("initiated_by IN ('ai_proposal', 'human')", name="ck_outcomes_initiated_by"),
            sa.UniqueConstraint("action_proposal_id", name="uq_outcomes_action_proposal"),
        )
        op.create_index("idx_outcomes_space_created", "outcomes", ["space_id", "created_at"])
        op.create_index("idx_outcomes_user_space", "outcomes", ["user_id", "space_id"])
        op.create_index("idx_outcomes_workflow_id", "outcomes", ["workflow_id"])
        op.create_index("idx_outcomes_status", "outcomes", ["status"])

    # 2. Create reflections table
    if "reflections" not in tables:
        op.create_table(
            "reflections",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("space_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column(
                "outcome_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("outcomes.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("reflection_type", sa.String(50), server_default="lesson", nullable=False),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("lesson_learned", sa.Text(), nullable=False),
            sa.Column("actionable_guidance", sa.Text(), nullable=True),
            sa.Column("confidence", sa.Float(), server_default="1.0", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.CheckConstraint(
                "reflection_type IN ('lesson', 'failure_analysis', 'success_pattern', 'user_feedback')",
                name="ck_reflections_type",
            ),
        )
        op.create_index("idx_reflections_space_created", "reflections", ["space_id", "created_at"])
        op.create_index("idx_reflections_user_space", "reflections", ["user_id", "space_id"])
        op.create_index("idx_reflections_outcome_id", "reflections", ["outcome_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "reflections" in tables:
        op.drop_table("reflections")

    if "outcomes" in tables:
        op.drop_table("outcomes")
