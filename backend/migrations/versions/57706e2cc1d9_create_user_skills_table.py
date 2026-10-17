"""create_user_skills_table

Revision ID: 57706e2cc1d9
Revises: aa9ee8d244bd
Create Date: 2026-10-17 21:34:42.198059

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57706e2cc1d9'
down_revision: Union[str, None] = 'aa9ee8d244bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "user_skills" not in tables:
        from sqlalchemy.dialects import postgresql
        op.create_table(
            "user_skills",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("skill_name", sa.String(255), nullable=False),
            sa.Column("category", sa.String(100), nullable=False),
            sa.Column("level", sa.String(50), server_default="Novice", nullable=False),
            sa.Column("xp", sa.Integer(), server_default="50", nullable=False),
            sa.Column("verified_tasks_count", sa.Integer(), server_default="1", nullable=False),
            sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
            sa.Column("last_practiced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_user_skills_user_id", "user_skills", ["user_id"])
        op.create_index("ix_user_skills_skill_name", "user_skills", ["skill_name"])
        op.create_index("ix_user_skills_category", "user_skills", ["category"])
        op.create_index("ix_user_skills_user_skill", "user_skills", ["user_id", "skill_name"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "user_skills" in tables:
        op.drop_table("user_skills")
