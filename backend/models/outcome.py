"""
QueryMind - Outcome & Reflection Models (Step 14)
Implements first-class Outcome and Reflection entities closing the cognitive loop:
Decision -> Action -> Outcome -> Reflection -> Future Context.

Critical Semantic Principle:
- ActionProposal execution status ("executed") indicates mechanical DB mutation.
- Outcome status ("unknown", "success", "failed", "partial") indicates objective workspace efficacy.
- Execution success creates an Outcome with status="unknown" unless objective evidence exists.
- Human/system evaluation transitions unknown -> success | failed | partial.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, DateTime, ForeignKey, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.postgres import Base, utc_now


class Outcome(Base):
    __tablename__ = "outcomes"

    # Identity
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Multi-tenant Scoping & Provenance
    space_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_proposal_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("action_proposals.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    workflow_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workflows.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Target Workspace Entity
    target_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # goal, project, memory, workflow
    target_entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Provenance & Initiation
    initiated_by: Mapped[str] = mapped_column(String(20), nullable=False)  # ai_proposal, human

    # Outcome Efficacy State
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown")  # success, failed, partial, unknown

    # Expected vs Actual Evidence
    expected_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    actual_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    state_delta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # {"before": ..., "after": ...}

    # Evaluation Metadata
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evaluator_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    space = relationship("Space")
    user = relationship("User", foreign_keys=[user_id])
    evaluator_user = relationship("User", foreign_keys=[evaluator_user_id])
    action_proposal = relationship("ActionProposal", back_populates="outcome")
    workflow = relationship("Workflow")
    reflections = relationship("Reflection", back_populates="outcome", cascade="all, delete-orphan")

    # Table constraints & Indexes
    __table_args__ = (
        CheckConstraint("status IN ('success', 'failed', 'partial', 'unknown')", name="ck_outcomes_status"),
        CheckConstraint("initiated_by IN ('ai_proposal', 'human')", name="ck_outcomes_initiated_by"),
        UniqueConstraint("action_proposal_id", name="uq_outcomes_action_proposal"),
        Index("idx_outcomes_space_created", "space_id", "created_at"),
        Index("idx_outcomes_user_space", "user_id", "space_id"),
        Index("idx_outcomes_workflow_id", "workflow_id"),
        Index("idx_outcomes_status", "status"),
    )


class Reflection(Base):
    __tablename__ = "reflections"

    # Identity
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Multi-tenant Scoping & Provenance
    space_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    outcome_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("outcomes.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Reflection Content
    reflection_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="lesson",
    )  # lesson, failure_analysis, success_pattern, user_feedback
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    lesson_learned: Mapped[str] = mapped_column(Text, nullable=False)
    actionable_guidance: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    space = relationship("Space")
    user = relationship("User")
    outcome = relationship("Outcome", back_populates="reflections")

    # Table constraints & Indexes
    __table_args__ = (
        CheckConstraint(
            "reflection_type IN ('lesson', 'failure_analysis', 'success_pattern', 'user_feedback')",
            name="ck_reflections_type",
        ),
        Index("idx_reflections_space_created", "space_id", "created_at"),
        Index("idx_reflections_user_space", "user_id", "space_id"),
        Index("idx_reflections_outcome_id", "outcome_id"),
    )
