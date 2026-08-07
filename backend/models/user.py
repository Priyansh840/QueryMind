"""
QueryMind - User Model
SQLAlchemy ORM model for the users table.
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.postgres import Base


class User(Base):
    __tablename__ = "users"

    # In Supabase, the public.users id perfectly matches auth.users.id
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    spaces = relationship("Space", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    knowledge = relationship("Knowledge", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")
    objectives = relationship("Objective", back_populates="user", cascade="all, delete-orphan")
    connections = relationship("Connection", back_populates="user", cascade="all, delete-orphan")
    workflow_events = relationship("WorkflowEvent", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"
