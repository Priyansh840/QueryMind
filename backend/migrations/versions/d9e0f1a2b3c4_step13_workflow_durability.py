"""step13_workflow_durability

Revision ID: d9e0f1a2b3c4
Revises: b4c5d6e7f8a9
Create Date: 2026-09-18 21:30:00.000000

Adds durable workflow execution columns to the workflows table:
- started_at (TIMESTAMP WITH TIME ZONE, nullable) — when worker began execution
- completed_at (TIMESTAMP WITH TIME ZONE, nullable) — when execution finished
- error (TEXT, nullable) — bounded error message on failure
- worker_id (VARCHAR(100), nullable) — identifies which worker claimed the job
- locked_at (TIMESTAMP WITH TIME ZONE, nullable) — when the lock was acquired (stale detection)
- retry_count (INTEGER, default 0) — number of retry/recovery attempts

All columns are nullable or have safe defaults to preserve existing rows.
Designed to be idempotent for development databases and greenfield-reproducible.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd9e0f1a2b3c4'
down_revision: Union[str, None] = 'b4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    wf_cols = [c["name"] for c in inspector.get_columns("workflows")]

    if "started_at" not in wf_cols:
        op.add_column(
            "workflows",
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "completed_at" not in wf_cols:
        op.add_column(
            "workflows",
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "error" not in wf_cols:
        op.add_column(
            "workflows",
            sa.Column("error", sa.Text(), nullable=True),
        )

    if "worker_id" not in wf_cols:
        op.add_column(
            "workflows",
            sa.Column("worker_id", sa.String(100), nullable=True),
        )

    if "locked_at" not in wf_cols:
        op.add_column(
            "workflows",
            sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "retry_count" not in wf_cols:
        op.add_column(
            "workflows",
            sa.Column("retry_count", sa.Integer(), server_default="0", nullable=False),
        )

    # Index for worker polling: find queued workflows efficiently
    wf_indexes = [ix["name"] for ix in inspector.get_indexes("workflows")]
    if "ix_workflows_status" not in wf_indexes:
        op.create_index("ix_workflows_status", "workflows", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    wf_cols = [c["name"] for c in inspector.get_columns("workflows")]

    wf_indexes = [ix["name"] for ix in inspector.get_indexes("workflows")]
    if "ix_workflows_status" in wf_indexes:
        op.drop_index("ix_workflows_status", table_name="workflows")

    for col in ("retry_count", "locked_at", "worker_id", "error", "completed_at", "started_at"):
        if col in wf_cols:
            op.drop_column("workflows", col)
