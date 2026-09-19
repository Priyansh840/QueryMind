import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.postgres import Base, utc_now


class ActionProposal(Base):
    __tablename__ = "action_proposals"

    # Identity
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id: Mapped[str] = mapped_column(String(100), nullable=False)  # Turn-level ID e.g. "prop-1"

    # Multi-tenant Ownership & Provenance
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    space_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    objective_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("objectives.id", ondelete="SET NULL"), nullable=True)

    # Action Definition
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    parameters: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Reasoning / Provenance
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    source_recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")

    # Lifecycle State
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")

    # Approval & Execution Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    executed_target_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    approved_by_user = relationship("User", foreign_keys=[approved_by_user_id])
    space = relationship("Space")
    conversation = relationship("Conversation")
    message = relationship("Message", back_populates="action_proposals")
    objective = relationship("Objective")
    outcome = relationship("Outcome", uselist=False, back_populates="action_proposal")

    # Constraints & Indexes
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'approved', 'executed', 'rejected', 'failed')", name="ck_action_proposals_status"),
        UniqueConstraint("message_id", "proposal_id", name="uq_action_proposals_message_proposal"),
        Index("idx_action_proposals_user_space", "user_id", "space_id"),
        Index("idx_action_proposals_message_id", "message_id"),
        Index("idx_action_proposals_user_status", "user_id", "status"),
        Index("idx_action_proposals_created_at", "created_at"),
    )
