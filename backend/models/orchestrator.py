import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.postgres import Base

class Objective(Base):
    __tablename__ = "objectives"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    raw_input: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    user = relationship("User", back_populates="objectives")
    workflows = relationship("Workflow", back_populates="objective", cascade="all, delete-orphan")
    syntheses = relationship("Synthesis", back_populates="objective", cascade="all, delete-orphan")


class Workflow(Base):
    __tablename__ = "workflows"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    objective_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    objective = relationship("Objective", back_populates="workflows")
    steps = relationship("WorkflowStep", back_populates="workflow", cascade="all, delete-orphan")
    events = relationship("WorkflowEvent", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    intent_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    
    workflow = relationship("Workflow", back_populates="steps")
    agent_runs = relationship("AgentRun", back_populates="workflow_step", cascade="all, delete-orphan")


class AgentRun(Base):
    __tablename__ = "agent_runs"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_step_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflow_steps.id", ondelete="CASCADE"), nullable=False)
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    
    input_context: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    output_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    workflow_step = relationship("WorkflowStep", back_populates="agent_runs")


class Synthesis(Base):
    __tablename__ = "syntheses"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    objective_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False)
    findings: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    recommendations: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    evidence: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    objective = relationship("Objective", back_populates="syntheses")


class WorkflowEvent(Base):
    __tablename__ = "workflow_events"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workflow_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"), nullable=True)
    
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    user = relationship("User", back_populates="workflow_events")
    workflow = relationship("Workflow", back_populates="events")
