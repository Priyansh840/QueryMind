"""
QueryMind - Action Approval, Query & Lifecycle Router (Step 8 & Step 9 Phase 4)
Provides secure API boundaries for reference-based ActionProposal execution, listing,
retrieval, and explicit rejection.
Enforces that proposals are retrieved server-side from authoritative action_proposals table,
preventing client-side parameter or target tampering.
Implements proposal-level row locking (SELECT ... FOR UPDATE on action_proposals table)
and atomic execution-state transitions.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_user
from models.user import User
from models.core import Space
from orchestrator.schemas import ActionProposal as ActionProposalSchema, ActionExecutionResult
from schemas.action_proposal import ActionProposalResponse, ActionProposalListResponse
from repositories.action_proposals import ActionProposalRepository
from services.action_executor import execute_action

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_STATUSES = {"pending", "approved", "executed", "rejected", "failed"}


class ActionExecuteRequest(BaseModel):
    message_id: str = Field(..., description="UUID of the assistant message containing the action proposal")
    proposal_id: str = Field(..., description="Unique proposal identifier to execute")


# ==============================================================================
# 1. List Actions (GET /api/v1/actions)
# ==============================================================================
@router.get("", response_model=ActionProposalListResponse, status_code=status.HTTP_200_OK)
async def list_actions(
    space_id: Optional[str] = Query(None, description="Optional workspace space UUID filter"),
    status_filter: Optional[str] = Query(None, alias="status", description="Optional lifecycle status filter"),
    limit: int = Query(20, ge=1, le=100, description="Page limit (max 100)"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List action proposals belonging to the authenticated user with optional space and status filters.
    """
    space_uuid = None
    if space_id:
        try:
            space_uuid = uuid.UUID(space_id)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space_id UUID format."
            )
        # Verify that the requested space belongs to current_user
        stmt = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Space not found or unauthorized."
            )

    if status_filter:
        clean_status = status_filter.strip().lower()
        if clean_status not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter '{status_filter}'. Valid statuses are: {', '.join(sorted(VALID_STATUSES))}"
            )
        status_filter = clean_status

    items, total = await ActionProposalRepository.list_proposals(
        db,
        user_id=current_user.id,
        space_id=space_uuid,
        status=status_filter,
        limit=limit,
        offset=offset,
    )

    return ActionProposalListResponse(
        items=[ActionProposalResponse.model_validate(p) for p in items],
        total=total,
        limit=limit,
        offset=offset,
    )


# ==============================================================================
# 2. Get Action Proposal (GET /api/v1/actions/{proposal_id})
# ==============================================================================
@router.get("/{proposal_id}", response_model=ActionProposalResponse, status_code=status.HTTP_200_OK)
async def get_action_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve an action proposal by either primary key UUID or proposal_id, scoped to the user.
    """
    proposal = await ActionProposalRepository.get_by_identifier(
        db,
        identifier=proposal_id,
        user_id=current_user.id,
    )
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action proposal not found or unauthorized."
        )

    return ActionProposalResponse.model_validate(proposal)


# ==============================================================================
# 3. Reject Action Proposal (POST /api/v1/actions/{proposal_id}/reject)
# ==============================================================================
@router.post("/{proposal_id}/reject", response_model=ActionProposalResponse, status_code=status.HTTP_200_OK)
async def reject_action_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Explicitly reject an action proposal.
    
    Lifecycle rules:
    - pending -> rejected (allowed)
    - failed -> rejected (allowed)
    - rejected -> rejected (idempotent no-op)
    - executed -> rejected (forbidden, 400 bad request)
    """
    proposal = await ActionProposalRepository.get_for_update_by_identifier(
        db,
        identifier=proposal_id,
        user_id=current_user.id,
    )
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action proposal not found or unauthorized."
        )

    if proposal.status == "executed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Executed action proposals cannot be rejected."
        )

    if proposal.status == "rejected":
        # Idempotent return
        return ActionProposalResponse.model_validate(proposal)

    # Transition to rejected and commit
    proposal.status = "rejected"
    await db.commit()
    await db.refresh(proposal)

    return ActionProposalResponse.model_validate(proposal)


# ==============================================================================
# 4. Execute Action Proposal (POST /api/v1/actions/execute) [Backward Compatible]
# ==============================================================================
@router.post("/execute", response_model=ActionExecutionResult, status_code=status.HTTP_200_OK)
async def approve_and_execute_action(
    request: ActionExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Approves and executes a previously generated ActionProposal via reference.
    
    Security & Authorization Pipeline (Step 9 Phase 3 Authoritative Flow):
    1. Authenticates current user from JWT token.
    2. Validates message_id UUID format.
    3. Acquires row-level lock (SELECT ... FOR UPDATE) on the authoritative `action_proposals` table row
       scoped strictly to (message_id, proposal_id, user_id == current_user.id).
    4. Enforces lifecycle state rules:
       - If status == "executed", returns already_executed immediately with NO mutation.
       - If status == "rejected", returns rejected immediately with NO mutation.
       - If status == "pending" or "failed", proceeds to execution.
    5. Re-validates stored proposal parameters against Pydantic ActionProposal schema.
    6. Invokes ActionExecutionService (auto_commit=False) to flush the mutation.
    7. Atomically transitions proposal lifecycle state to "executed" (or "failed"), records
       `approved_at`, `approved_by_user_id`, `executed_at`, and `executed_target_id`, and commits.
    8. Returns clean ActionExecutionResult with zero raw model/internal leakage.
    """
    # 1. Parse and validate message_id UUID format
    try:
        msg_uuid = uuid.UUID(request.message_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message_id UUID format."
        )

    # 2. Multi-tenant Authorization & Row-Level Lock on Authoritative Proposal
    proposal = await ActionProposalRepository.get_for_update(
        db,
        message_id=msg_uuid,
        proposal_id=request.proposal_id,
        user_id=current_user.id
    )

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action proposal not found or unauthorized."
        )

    # 3. Check lifecycle status (Server-controlled lifecycle)
    if proposal.status == "executed":
        logger.info(f"Proposal '{request.proposal_id}' has already been executed.")
        return ActionExecutionResult(
            success=False,
            proposal_id=request.proposal_id,
            action_type=proposal.action_type,
            status="already_executed",
            target_id=proposal.executed_target_id,
            message=f"Action proposal '{request.proposal_id}' has already been executed.",
            error_code="already_executed"
        )

    if proposal.status == "rejected":
        logger.info(f"Proposal '{request.proposal_id}' was previously rejected.")
        return ActionExecutionResult(
            success=False,
            proposal_id=request.proposal_id,
            action_type=proposal.action_type,
            status="rejected",
            target_id=None,
            message=f"Action proposal '{request.proposal_id}' has been rejected and cannot be executed.",
            error_code="invalid_proposal"
        )

    # 4. Re-validate the recovered proposal against Pydantic schema
    proposal_dict = {
        "proposal_id": proposal.proposal_id,
        "action_type": proposal.action_type,
        "target_id": proposal.target_id,
        "space_id": str(proposal.space_id),
        "parameters": proposal.parameters,
        "reason": proposal.reason,
        "source_recommendation": proposal.source_recommendation,
        "confidence": proposal.confidence,
    }

    try:
        validated_proposal = ActionProposalSchema.model_validate(proposal_dict)
        validated_proposal.validate_parameters()
    except Exception as val_err:
        logger.error(f"Persisted proposal failed schema validation: {val_err}")
        return ActionExecutionResult(
            success=False,
            proposal_id=request.proposal_id,
            action_type=proposal.action_type,
            status="rejected",
            target_id=None,
            message="Persisted action proposal contains invalid schema structure.",
            error_code="invalid_proposal"
        )

    # 5. Execute through the secure ActionExecutionService (auto_commit=False for atomic batch commit)
    execution_result = await execute_action(
        proposal=validated_proposal,
        user_id=current_user.id,
        db=db,
        auto_commit=False
    )

    # 6. Atomically update proposal lifecycle state based on execution outcome
    now = datetime.now(timezone.utc)
    if execution_result.success and execution_result.status == "executed":
        proposal.status = "executed"
        proposal.approved_at = now
        proposal.approved_by_user_id = current_user.id
        proposal.executed_at = now
        proposal.executed_target_id = execution_result.target_id
        proposal.error_code = None
        proposal.error_message = None
        await db.commit()
    else:
        # Record failure metadata and rollback unflushed entity mutations
        await db.rollback()
        # In a fresh transaction, record the failed status so it can be retried or inspected
        failed_proposal = await ActionProposalRepository.get_for_update(
            db,
            message_id=msg_uuid,
            proposal_id=request.proposal_id,
            user_id=current_user.id
        )
        if failed_proposal:
            failed_proposal.status = "failed"
            failed_proposal.error_code = execution_result.error_code
            failed_proposal.error_message = execution_result.message
            await db.commit()

    return execution_result
