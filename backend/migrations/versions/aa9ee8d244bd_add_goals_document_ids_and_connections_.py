"""add_goals_document_ids_and_connections_space_id

Revision ID: aa9ee8d244bd
Revises: a2b3c4d5e6f7
Create Date: 2026-10-08 22:38:58.978961

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa9ee8d244bd'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Add document_ids to goals
    if "goals" in tables:
        goal_cols = [c["name"] for c in inspector.get_columns("goals")]
        if "document_ids" not in goal_cols:
            from sqlalchemy.dialects import postgresql
            op.add_column(
                "goals",
                sa.Column("document_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
            )

    # 2. Add space_id to connections
    if "connections" in tables:
        conn_cols = [c["name"] for c in inspector.get_columns("connections")]
        if "space_id" not in conn_cols:
            from sqlalchemy.dialects import postgresql
            op.add_column(
                "connections",
                sa.Column(
                    "space_id",
                    postgresql.UUID(as_uuid=True),
                    sa.ForeignKey("spaces.id", ondelete="CASCADE"),
                    nullable=True,
                ),
            )
            op.create_index("ix_connections_space_id", "connections", ["space_id"], unique=False)

            # Backfill space_id from default space if available
            op.execute("""
                UPDATE connections
                SET space_id = spaces.id
                FROM spaces
                WHERE connections.space_id IS NULL
                  AND spaces.user_id = connections.user_id
                  AND spaces.is_default = true;
            """)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "connections" in tables:
        conn_cols = [c["name"] for c in inspector.get_columns("connections")]
        if "space_id" in conn_cols:
            indexes = [idx["name"] for idx in inspector.get_indexes("connections")]
            if "ix_connections_space_id" in indexes:
                op.drop_index("ix_connections_space_id", table_name="connections")
            op.drop_column("connections", "space_id")

    if "goals" in tables:
        goal_cols = [c["name"] for c in inspector.get_columns("goals")]
        if "document_ids" in goal_cols:
            op.drop_column("goals", "document_ids")

