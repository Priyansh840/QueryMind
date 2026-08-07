import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.postgres import Base

class Document(Base):
    __tablename__ = "documents"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    space = relationship("Space", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding_status: Mapped[str] = mapped_column(String(50), default="pending")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    document = relationship("Document", back_populates="chunks")


class Knowledge(Base):
    __tablename__ = "knowledge"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    space_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("spaces.id", ondelete="SET NULL"), nullable=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    knowledge_type: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="knowledge")
    space = relationship("Space", back_populates="knowledge")
