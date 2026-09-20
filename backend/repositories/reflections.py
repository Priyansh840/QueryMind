"""
QueryMind - Reflection Repository (Step 14)
Tenant-isolated database access layer for Reflection entity.
Guarantees:
- Strict space_id scoping for multi-tenant isolation
- Validates cross-entity space boundary if linked to an Outcome
- Bounded recency retrieval for context injection
"""

import uuid
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models.outcome import Reflection, Outcome

logger = logging.getLogger(__name__)


class ReflectionRepository:
    """Repository handling CRUD and bounded retrieval for Reflection entities."""

    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        space_id: uuid.UUID,
        user_id: uuid.UUID,
        title: str,
        lesson_learned: str,
        reflection_type: str = "lesson",
        outcome_id: Optional[uuid.UUID] = None,
        actionable_guidance: Optional[str] = None,
        confidence: float = 1.0,
        auto_commit: bool = True,
    ) -> Reflection:
        """
        Creates and persists a new Reflection.
        If outcome_id is provided, validates that the outcome exists within the same space.
        """
        now = datetime.now(timezone.utc)

        if outcome_id is not None:
            stmt = select(Outcome).where(Outcome.id == outcome_id, Outcome.space_id == space_id)
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                raise ValueError(f"Outcome {outcome_id} does not exist in space {space_id}")

        reflection = Reflection(
            id=uuid.uuid4(),
            space_id=space_id,
            user_id=user_id,
            outcome_id=outcome_id,
            reflection_type=reflection_type,
            title=title,
            lesson_learned=lesson_learned,
            actionable_guidance=actionable_guidance,
            confidence=max(0.0, min(1.0, confidence)),
            created_at=now,
            updated_at=now,
        )

        db.add(reflection)
        if auto_commit:
            await db.commit()
            await db.refresh(reflection)
        else:
            await db.flush()

        return reflection

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        reflection_id: uuid.UUID,
        space_id: Optional[uuid.UUID] = None,
    ) -> Optional[Reflection]:
        """Fetch a reflection by ID, optionally enforcing space_id tenancy."""
        stmt = select(Reflection).where(Reflection.id == reflection_id)
        if space_id is not None:
            stmt = stmt.where(Reflection.space_id == space_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_reflections(
        db: AsyncSession,
        space_id: uuid.UUID,
        reflection_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Reflection], int]:
        """List paginated reflections scoped strictly to space_id."""
        base_query = select(Reflection).where(Reflection.space_id == space_id)
        count_query = select(func.count(Reflection.id)).where(Reflection.space_id == space_id)

        if reflection_type:
            base_query = base_query.where(Reflection.reflection_type == reflection_type)
            count_query = count_query.where(Reflection.reflection_type == reflection_type)

        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        query = base_query.order_by(Reflection.created_at.desc()).offset(offset).limit(limit)
        res = await db.execute(query)
        items = list(res.scalars().all())

        return items, total

    @staticmethod
    async def get_recent_reflections(
        db: AsyncSession,
        space_id: uuid.UUID,
        limit: int = 5,
    ) -> List[Reflection]:
        """Fetch bounded recent reflections in active space for agent context."""
        bounded_limit = min(max(1, limit), 5)
        stmt = (
            select(Reflection)
            .where(Reflection.space_id == space_id)
            .order_by(Reflection.created_at.desc())
            .limit(bounded_limit)
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())
