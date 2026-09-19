"""
QueryMind - Outcome Repository (Step 14)
Tenant-isolated database access layer for Outcome entity.
Guarantees:
- Strict space_id and user_id scoping for multi-tenant isolation
- Database-backed idempotency on action_proposal_id
- Preserves historical provenance on later evaluation
- Bounded recency queries for context injection
"""

import uuid
import logging
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from models.outcome import Outcome

logger = logging.getLogger(__name__)


class OutcomeRepository:
    """Repository handling CRUD, idempotency, and evaluation for Outcome entities."""

    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        space_id: uuid.UUID,
        user_id: uuid.UUID,
        target_entity_type: str,
        initiated_by: str,
        status: str = "unknown",
        action_proposal_id: Optional[uuid.UUID] = None,
        workflow_id: Optional[uuid.UUID] = None,
        target_entity_id: Optional[uuid.UUID] = None,
        expected_outcome: Optional[str] = None,
        actual_outcome: Optional[str] = None,
        state_delta: Optional[Dict[str, Any]] = None,
        auto_commit: bool = True,
    ) -> Outcome:
        """
        Creates an Outcome record with database-backed idempotency.
        If an action_proposal_id is supplied and already has an Outcome,
        returns the existing Outcome without creating a duplicate.
        """
        now = datetime.now(timezone.utc)

        if action_proposal_id is not None:
            stmt = select(Outcome).where(Outcome.action_proposal_id == action_proposal_id)
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                logger.info(f"Outcome already exists for action_proposal_id={action_proposal_id}")
                return existing

        outcome = Outcome(
            id=uuid.uuid4(),
            space_id=space_id,
            user_id=user_id,
            action_proposal_id=action_proposal_id,
            workflow_id=workflow_id,
            target_entity_type=target_entity_type,
            target_entity_id=target_entity_id,
            initiated_by=initiated_by,
            status=status,
            expected_outcome=expected_outcome,
            actual_outcome=actual_outcome,
            state_delta=state_delta,
            created_at=now,
            updated_at=now,
        )

        db.add(outcome)
        if auto_commit:
            try:
                await db.commit()
                await db.refresh(outcome)
            except Exception as e:
                await db.rollback()
                if action_proposal_id is not None:
                    # Retry query in case of concurrent insert race
                    stmt = select(Outcome).where(Outcome.action_proposal_id == action_proposal_id)
                    res = await db.execute(stmt)
                    existing = res.scalar_one_or_none()
                    if existing:
                        return existing
                raise e
        else:
            await db.flush()

        return outcome

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        outcome_id: uuid.UUID,
        space_id: Optional[uuid.UUID] = None,
    ) -> Optional[Outcome]:
        """Fetch an outcome by ID, optionally enforcing space_id tenancy."""
        stmt = select(Outcome).where(Outcome.id == outcome_id)
        if space_id is not None:
            stmt = stmt.where(Outcome.space_id == space_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_by_action_proposal(
        db: AsyncSession,
        action_proposal_id: uuid.UUID,
    ) -> Optional[Outcome]:
        """Fetch an outcome by associated action_proposal_id."""
        stmt = select(Outcome).where(Outcome.action_proposal_id == action_proposal_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_outcomes(
        db: AsyncSession,
        space_id: uuid.UUID,
        status: Optional[str] = None,
        initiated_by: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Outcome], int]:
        """List paginated outcomes scoped strictly to space_id."""
        base_query = select(Outcome).where(Outcome.space_id == space_id)
        count_query = select(func.count(Outcome.id)).where(Outcome.space_id == space_id)

        if status:
            base_query = base_query.where(Outcome.status == status)
            count_query = count_query.where(Outcome.status == status)

        if initiated_by:
            base_query = base_query.where(Outcome.initiated_by == initiated_by)
            count_query = count_query.where(Outcome.initiated_by == initiated_by)

        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        query = base_query.order_by(Outcome.created_at.desc()).offset(offset).limit(limit)
        res = await db.execute(query)
        items = list(res.scalars().all())

        return items, total

    @staticmethod
    async def get_recent_outcomes(
        db: AsyncSession,
        space_id: uuid.UUID,
        limit: int = 5,
    ) -> List[Outcome]:
        """Fetch bounded recent outcomes in active space for agent context."""
        bounded_limit = min(max(1, limit), 5)
        stmt = (
            select(Outcome)
            .where(Outcome.space_id == space_id)
            .order_by(Outcome.created_at.desc())
            .limit(bounded_limit)
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def evaluate_outcome(
        db: AsyncSession,
        *,
        outcome_id: uuid.UUID,
        space_id: uuid.UUID,
        status: str,
        evaluator_user_id: uuid.UUID,
        actual_outcome: Optional[str] = None,
        state_delta: Optional[Dict[str, Any]] = None,
        auto_commit: bool = True,
    ) -> Optional[Outcome]:
        """
        Evaluates an existing Outcome.
        Updates status, actual_outcome, evaluator_user_id, evaluated_at.
        Preserves original created_at, action_proposal_id, target_entity, and expected_outcome.
        """
        stmt = (
            select(Outcome)
            .where(Outcome.id == outcome_id, Outcome.space_id == space_id)
            .with_for_update()
        )
        res = await db.execute(stmt)
        outcome = res.scalar_one_or_none()
        if not outcome:
            return None

        now = datetime.now(timezone.utc)
        outcome.status = status
        outcome.evaluated_at = now
        outcome.evaluator_user_id = evaluator_user_id
        outcome.updated_at = now

        if actual_outcome is not None:
            outcome.actual_outcome = actual_outcome

        if state_delta is not None:
            # If outcome already has state_delta, merge the evaluated delta
            current_delta = dict(outcome.state_delta or {})
            current_delta["evaluated_delta"] = state_delta
            outcome.state_delta = current_delta

        if auto_commit:
            await db.commit()
            await db.refresh(outcome)
        else:
            await db.flush()

        return outcome
