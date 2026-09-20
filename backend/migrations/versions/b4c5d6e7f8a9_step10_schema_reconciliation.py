"""step10_schema_reconciliation

Revision ID: b4c5d6e7f8a9
Revises: f38a1b2c3d4e
Create Date: 2026-09-17 20:45:00.000000

Reconciles the database schema with SQLAlchemy models:
- memories.space_id (UUID, FK -> spaces.id ON DELETE CASCADE, nullable=True)
- objectives.space_id (UUID, FK -> spaces.id ON DELETE CASCADE, nullable=True)
- workflows.space_id (UUID, FK -> spaces.id ON DELETE CASCADE, nullable=True)
- workflow_steps.description (Text, nullable=True)
- workflow_steps.output_summary (Text, nullable=True)
- knowledge.metadata_json (JSONB, nullable=True)

Designed to be safely idempotent for existing databases and fully greenfield-reproducible.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b4c5d6e7f8a9'
down_revision: Union[str, None] = 'f38a1b2c3d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. memories.space_id
    mem_cols = [c["name"] for c in inspector.get_columns("memories")]
    if "space_id" not in mem_cols:
        op.add_column(
            "memories",
            sa.Column("space_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
    mem_fks = [fk["name"] for fk in inspector.get_foreign_keys("memories")]
    if "memories_space_id_fkey" not in mem_fks:
        op.create_foreign_key(
            "memories_space_id_fkey",
            "memories",
            "spaces",
            ["space_id"],
            ["id"],
            ondelete="CASCADE",
        )
    mem_indexes = [ix["name"] for ix in inspector.get_indexes("memories")]
    if "ix_memories_space_id" not in mem_indexes:
        op.create_index("ix_memories_space_id", "memories", ["space_id"])

    # 2. objectives.space_id
    obj_cols = [c["name"] for c in inspector.get_columns("objectives")]
    if "space_id" not in obj_cols:
        op.add_column(
            "objectives",
            sa.Column("space_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
    obj_fks = [fk["name"] for fk in inspector.get_foreign_keys("objectives")]
    if "objectives_space_id_fkey" not in obj_fks:
        op.create_foreign_key(
            "objectives_space_id_fkey",
            "objectives",
            "spaces",
            ["space_id"],
            ["id"],
            ondelete="CASCADE",
        )
    obj_indexes = [ix["name"] for ix in inspector.get_indexes("objectives")]
    if "ix_objectives_space_id" not in obj_indexes:
        op.create_index("ix_objectives_space_id", "objectives", ["space_id"])

    # 3. workflows.space_id
    wf_cols = [c["name"] for c in inspector.get_columns("workflows")]
    if "space_id" not in wf_cols:
        op.add_column(
            "workflows",
            sa.Column("space_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
    wf_fks = [fk["name"] for fk in inspector.get_foreign_keys("workflows")]
    if "workflows_space_id_fkey" not in wf_fks:
        op.create_foreign_key(
            "workflows_space_id_fkey",
            "workflows",
            "spaces",
            ["space_id"],
            ["id"],
            ondelete="CASCADE",
        )
    wf_indexes = [ix["name"] for ix in inspector.get_indexes("workflows")]
    if "ix_workflows_space_id" not in wf_indexes:
        op.create_index("ix_workflows_space_id", "workflows", ["space_id"])

    # 4. workflow_steps.description and output_summary
    step_cols = [c["name"] for c in inspector.get_columns("workflow_steps")]
    if "description" not in step_cols:
        op.add_column(
            "workflow_steps",
            sa.Column("description", sa.Text(), nullable=True),
        )
    if "output_summary" not in step_cols:
        op.add_column(
            "workflow_steps",
            sa.Column("output_summary", sa.Text(), nullable=True),
        )

    # 5. knowledge.metadata_json
    know_cols = [c["name"] for c in inspector.get_columns("knowledge")]
    if "metadata_json" not in know_cols:
        op.add_column(
            "knowledge",
            sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. knowledge.metadata_json
    know_cols = [c["name"] for c in inspector.get_columns("knowledge")]
    if "metadata_json" in know_cols:
        op.drop_column("knowledge", "metadata_json")

    # 2. workflow_steps.output_summary and description
    step_cols = [c["name"] for c in inspector.get_columns("workflow_steps")]
    if "output_summary" in step_cols:
        op.drop_column("workflow_steps", "output_summary")
    if "description" in step_cols:
        op.drop_column("workflow_steps", "description")

    # 3. workflows.space_id
    wf_cols = [c["name"] for c in inspector.get_columns("workflows")]
    if "space_id" in wf_cols:
        wf_fks = [fk["name"] for fk in inspector.get_foreign_keys("workflows")]
        if "workflows_space_id_fkey" in wf_fks:
            op.drop_constraint("workflows_space_id_fkey", "workflows", type_="foreignkey")
        wf_indexes = [ix["name"] for ix in inspector.get_indexes("workflows")]
        if "ix_workflows_space_id" in wf_indexes:
            op.drop_index("ix_workflows_space_id", table_name="workflows")
        op.drop_column("workflows", "space_id")

    # 4. objectives.space_id
    obj_cols = [c["name"] for c in inspector.get_columns("objectives")]
    if "space_id" in obj_cols:
        obj_fks = [fk["name"] for fk in inspector.get_foreign_keys("objectives")]
        if "objectives_space_id_fkey" in obj_fks:
            op.drop_constraint("objectives_space_id_fkey", "objectives", type_="foreignkey")
        obj_indexes = [ix["name"] for ix in inspector.get_indexes("objectives")]
        if "ix_objectives_space_id" in obj_indexes:
            op.drop_index("ix_objectives_space_id", table_name="objectives")
        op.drop_column("objectives", "space_id")

    # 5. memories.space_id
    mem_cols = [c["name"] for c in inspector.get_columns("memories")]
    if "space_id" in mem_cols:
        mem_fks = [fk["name"] for fk in inspector.get_foreign_keys("memories")]
        if "memories_space_id_fkey" in mem_fks:
            op.drop_constraint("memories_space_id_fkey", "memories", type_="foreignkey")
        mem_indexes = [ix["name"] for ix in inspector.get_indexes("memories")]
        if "ix_memories_space_id" in mem_indexes:
            op.drop_index("ix_memories_space_id", table_name="memories")
        op.drop_column("memories", "space_id")
