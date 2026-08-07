import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.postgres import Base

class Memory(Base):
    __tablename__ = "memories"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    memory_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    
    status: Mapped[str] = mapped_column(String(50), default="active")
    importance: Mapped[str] = mapped_column(String(50), default="medium")
    reinforcement_count: Mapped[int] = mapped_column(Integer, default=1)
    
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    last_reinforced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    source_count: Mapped[int] = mapped_column(Integer, default=1)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="memories")


class Connection(Base):
    __tablename__ = "connections"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    relation: Mapped[str] = mapped_column(String(100), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    user = relationship("User", back_populates="connections")
