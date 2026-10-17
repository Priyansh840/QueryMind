"""
QueryMind - User Skill Model
Tracks user competencies, levels, XP, and verifiable task evidence.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database.postgres import Base, utc_now


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    skill_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # e.g. Algorithms, Systems & OS, Databases, AI & ML
    
    level = Column(String(50), default="Novice", nullable=False)  # Novice, Competent, Proficient, Mastery
    xp = Column(Integer, default=50, nullable=False)
    verified_tasks_count = Column(Integer, default=1, nullable=False)
    
    # List of evidence objects: [{ "goal_id": ..., "task_id": ..., "task_title": ..., "deliverable": ..., "completed_at": ... }]
    evidence = Column(JSONB, default=list, nullable=False)
    
    last_practiced_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("ix_user_skills_user_skill", "user_id", "skill_name", unique=True),
    )

    def calculate_level(self) -> str:
        """Derives standard mastery tier based on cumulative XP."""
        if self.xp >= 500:
            return "Mastery"
        elif self.xp >= 250:
            return "Proficient"
        elif self.xp >= 100:
            return "Competent"
        return "Novice"
