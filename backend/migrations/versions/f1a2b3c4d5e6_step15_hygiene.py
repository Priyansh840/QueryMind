"""step15_hygiene

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-09-18 23:55:00.000000

Step 15: API & Backend Architecture Hygiene
- Adds space_id (UUID, FK to spaces.id ON DELETE CASCADE) to goals table with index idx_goals_space_id
- Backfills goals.space_id from projects.space_id and users' default space
- Drops legacy dead workflow_events table
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e0f1a2b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Add space_id to goals if not already present
    if "goals" in tables:
        columns = [c["name"] for c in inspector.get_columns("goals")]
        if "space_id" not in columns:
            op.add_column(
                "goals",
                sa.Column(
                    "space_id",
                    postgresql.UUID(as_uuid=True),
                    sa.ForeignKey("spaces.id", ondelete="CASCADE"),
                    nullable=True,
                ),
            )
            op.create_index("idx_goals_space_id", "goals", ["space_id"])

            # Backfill 1: From projects.space_id where goal.project_id is set
            op.execute("""
                UPDATE goals
                SET space_id = projects.space_id
                FROM projects
                WHERE goals.project_id = projects.id
                  AND goals.space_id IS NULL;
            """)

            # Backfill 2: From user's default space where space_id is still NULL
            op.execute("""
                UPDATE goals
                SET space_id = spaces.id
                FROM spaces
                WHERE goals.space_id IS NULL
                  AND spaces.user_id = goals.user_id
                  AND spaces.is_default = true;
            """)

            # Backfill 3: From user's first created space for any remaining standalone goals
            op.execute("""
                UPDATE goals
                SET space_id = (
                    SELECT s.id
                    FROM spaces s
                    WHERE s.user_id = goals.user_id
                    ORDER BY s.created_at ASC
                    LIMIT 1
                )
                WHERE goals.space_id IS NULL;
            """)

    # 2. Drop dead legacy workflow_events table if it exists
    if "workflow_events" in tables:
        op.drop_table("workflow_events")

    # 3. Add password_hash to users if not already present
    if "users" in tables:
        user_cols = [c["name"] for c in inspector.get_columns("users")]
        if "password_hash" not in user_cols:
            op.add_column(
                "users",
                sa.Column("password_hash", sa.String(255), nullable=True)
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Recreate workflow_events if needed for reversibility
    if "workflow_events" not in tables:
        op.create_table(
            "workflow_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("workflow_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=True),
            sa.Column("event_type", sa.String(100), nullable=False),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("metadata_payload", postgresql.JSONB(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )

    # 2. Drop space_id from goals
    if "goals" in tables:
        columns = [c["name"] for c in inspector.get_columns("goals")]
        if "space_id" in columns:
            op.drop_index("idx_goals_space_id", table_name="goals")
            op.drop_column("goals", "space_id")

    # 3. Drop password_hash from users if present
    if "users" in tables:
        user_cols = [c["name"] for c in inspector.get_columns("users")]
        if "password_hash" in user_cols:
            op.drop_column("users", "password_hash")
