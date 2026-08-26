"""
QueryMind - Action Proposals Repository
Tenant-isolated database access layer for ActionProposal entity.
All operations require authenticated user_id to enforce multi-tenant security boundaries.
"""

import uuid
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from models.action_proposal import ActionProposal


class ActionProposalRepository:
    """Repository handling CRUD and locking for ActionProposal entities."""

    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        proposal_id: str,
        user_id: uuid.UUID,
        space_id: uuid.UUID,
        conversation_id: uuid.UUID,
        message_id: uuid.UUID,
        action_type: str,
        parameters: dict,
        reason: str,
        objective_id: Optional[uuid.UUID] = None,
        target_id: Optional[str] = None,
        source_recommendation: Optional[str] = None,
        confidence: str = "medium",
        status: str = "pending",
        auto_commit: bool = True,
    ) -> ActionProposal:
        """Create and persist a new ActionProposal entity."""
        proposal = ActionProposal(
            id=uuid.uuid4(),
            proposal_id=proposal_id,
            user_id=user_id,
            space_id=space_id,
            conversation_id=conversation_id,
            message_id=message_id,
            objective_id=objective_id,
            action_type=action_type,
            target_id=target_id,
            parameters=parameters,
            reason=reason,
            source_recommendation=source_recommendation,
            confidence=confidence,
            status=status,
            created_at=datetime.now(timezone.utc),
        )
        db.add(proposal)
        if auto_commit:
            await db.commit()
            await db.refresh(proposal)
        return proposal

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        *,
        proposal_pk: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[ActionProposal]:
        """Retrieve proposal by primary key UUID scoped to authenticated user."""
        stmt = select(ActionProposal).where(
            ActionProposal.id == proposal_pk,
            ActionProposal.user_id == user_id,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_identifier(
        db: AsyncSession,
        *,
        identifier: str,
        user_id: uuid.UUID,
    ) -> Optional[ActionProposal]:
        """
        Retrieve proposal by either primary key UUID string or turn-level proposal_id,
        strictly scoped to authenticated user.
        """
        try:
            pk_uuid = uuid.UUID(identifier)
            stmt = select(ActionProposal).where(
                ActionProposal.id == pk_uuid,
                ActionProposal.user_id == user_id,
            )
        except (ValueError, TypeError):
            stmt = select(ActionProposal).where(
                ActionProposal.proposal_id == identifier,
                ActionProposal.user_id == user_id,
            )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_for_update_by_identifier(
        db: AsyncSession,
        *,
        identifier: str,
        user_id: uuid.UUID,
    ) -> Optional[ActionProposal]:
        """
        Retrieve proposal with row-level lock (SELECT ... FOR UPDATE)
        by primary key UUID string or turn-level proposal_id, strictly scoped to user.
        """
        try:
            pk_uuid = uuid.UUID(identifier)
            stmt = (
                select(ActionProposal)
                .where(
                    ActionProposal.id == pk_uuid,
                    ActionProposal.user_id == user_id,
                )
                .with_for_update()
            )
        except (ValueError, TypeError):
            stmt = (
                select(ActionProposal)
                .where(
                    ActionProposal.proposal_id == identifier,
                    ActionProposal.user_id == user_id,
                )
                .with_for_update()
            )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_message_and_proposal(
        db: AsyncSession,
        *,
        message_id: uuid.UUID,
        proposal_id: str,
        user_id: uuid.UUID,
    ) -> Optional[ActionProposal]:
        """Retrieve proposal by (message_id, proposal_id) scoped to authenticated user."""
        stmt = select(ActionProposal).where(
            ActionProposal.message_id == message_id,
            ActionProposal.proposal_id == proposal_id,
            ActionProposal.user_id == user_id,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_for_update(
        db: AsyncSession,
        *,
        message_id: uuid.UUID,
        proposal_id: str,
        user_id: uuid.UUID,
    ) -> Optional[ActionProposal]:
        """
        Retrieve proposal with row-level lock (SELECT ... FOR UPDATE)
        to prevent concurrent approval/execution races.
        """
        stmt = (
            select(ActionProposal)
            .where(
                ActionProposal.message_id == message_id,
                ActionProposal.proposal_id == proposal_id,
                ActionProposal.user_id == user_id,
            )
            .with_for_update()
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_proposals(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        space_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ActionProposal], int]:
        """List proposals filtered by user, optional space, and optional status with total count."""
        base_filter = [ActionProposal.user_id == user_id]
        if space_id:
            base_filter.append(ActionProposal.space_id == space_id)
        if status:
            base_filter.append(ActionProposal.status == status)

        # Count total
        count_stmt = select(func.count(ActionProposal.id)).where(*base_filter)
        count_res = await db.execute(count_stmt)
        total = count_res.scalar() or 0

        # Query paginated rows
        stmt = (
            select(ActionProposal)
            .where(*base_filter)
            .order_by(ActionProposal.created_at.desc(), ActionProposal.id.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        return items, total
