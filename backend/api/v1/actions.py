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
from models.conversation import Conversation, Message
from models.knowledge import Document, DocumentChunk
from models.orchestrator import Objective, Workflow, WorkflowStep, AgentRun
from orchestrator.schemas import ActionProposal as ActionProposalSchema, ActionExecutionResult
from schemas.action_proposal import (
    ActionProposalResponse,
    ActionProposalListResponse,
    DecisionDetailResponse,
    DecisionEvidence,
    DecisionTimelineEvent,
)
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
    List action proposals with optional space and status filters.
    Requires at least 'viewer' role in the requested space.
    """
    space_uuid = None
    if space_id:
        from api.deps import get_space_membership
        space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")
        space_uuid = space.id

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
        user_id=current_user.id if not space_uuid else None,
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
    Retrieve an action proposal by either primary key UUID or proposal_id.
    Requires at least 'viewer' role in the proposal's space.
    """
    proposal = await ActionProposalRepository.get_by_identifier(
        db,
        identifier=proposal_id,
    )
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action proposal not found."
        )

    # Verify Space membership (viewer role)
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(proposal.space_id), current_user, db, min_role="viewer")

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
    Requires 'admin' or 'owner' role in the proposal's space.
    """
    proposal = await ActionProposalRepository.get_for_update_by_identifier(
        db,
        identifier=proposal_id,
    )
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action proposal not found."
        )

    # Verify Space admin/owner membership
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(proposal.space_id), current_user, db, min_role="admin")

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
# 4. Approve Action Proposal by ID (POST /api/v1/actions/{proposal_id}/approve)
# ==============================================================================
@router.post("/{proposal_id}/approve", response_model=ActionExecutionResult, status_code=status.HTTP_200_OK)
async def approve_action_by_id(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Click Approval & Execution endpoint using proposal identifier directly.
    Requires 'admin' or 'owner' role in the proposal's space.
    """
    proposal = await ActionProposalRepository.get_for_update_by_identifier(
        db,
        identifier=proposal_id,
    )
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action proposal not found."
        )

    # Verify Space admin/owner membership
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(proposal.space_id), current_user, db, min_role="admin")

    if proposal.status == "executed":
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal.proposal_id,
            action_type=proposal.action_type,
            status="executed",
            target_id=proposal.executed_target_id,
            message="Action proposal has already been executed.",
        )

    if proposal.status == "rejected":
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal.proposal_id,
            action_type=proposal.action_type,
            status="rejected",
            target_id=None,
            message="Action proposal was rejected and cannot be executed.",
            error_code="invalid_proposal"
        )

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
            proposal_id=proposal.proposal_id,
            action_type=proposal.action_type,
            status="rejected",
            target_id=None,
            message="Persisted action proposal contains invalid schema structure.",
            error_code="invalid_proposal"
        )

    execution_result = await execute_action(
        proposal=validated_proposal,
        user_id=current_user.id,
        db=db,
        auto_commit=False,
    )

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
        await db.rollback()
        failed_proposal = await ActionProposalRepository.get_for_update_by_identifier(
            db,
            identifier=proposal_id,
            user_id=current_user.id,
        )
        if failed_proposal:
            failed_proposal.status = "failed"
            failed_proposal.error_code = execution_result.error_code
            failed_proposal.error_message = execution_result.message
            await db.commit()

    return execution_result


# ==============================================================================
# 5. Get Decision Intelligence Detail (GET /api/v1/actions/{proposal_id}/decision)
# ==============================================================================
@router.get("/{proposal_id}/decision", response_model=DecisionDetailResponse, status_code=status.HTTP_200_OK)
async def get_decision_detail(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full Decision Intelligence & Evidence graph metadata for an action proposal.
    Reconstructs the full lineage:
    Knowledge Evidence -> Synthesis Conclusion -> Decision -> Action Proposal -> Execution Outcome.
    """
    proposal = await ActionProposalRepository.get_by_identifier(
        db,
        identifier=proposal_id,
    )
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision / Action proposal not found."
        )

    # Verify Space membership (viewer role)
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(proposal.space_id), current_user, db, min_role="viewer")

    # 1. Fetch originating message to extract authoritative RAG citations
    stmt_msg = select(Message).where(Message.id == proposal.message_id)
    res_msg = await db.execute(stmt_msg)
    message = res_msg.scalar_one_or_none()

    # 2. Fetch conversation metadata
    stmt_conv = select(Conversation).where(Conversation.id == proposal.conversation_id)
    res_conv = await db.execute(stmt_conv)
    conv = res_conv.scalar_one_or_none()
    conv_title = conv.title if conv else "Contextual Analysis Session"

    # 3. Parse and structure real Evidence Citations
    evidence_list: List[DecisionEvidence] = []
    if message and message.citations:
        for cit in message.citations:
            if isinstance(cit, dict):
                evidence_list.append(
                    DecisionEvidence(
                        document_id=uuid.UUID(cit["document_id"]) if cit.get("document_id") else None,
                        document_title=cit.get("document_title") or "Source Document",
                        chunk_id=str(cit.get("chunk_id")) if cit.get("chunk_id") else None,
                        page_number=cit.get("page_number"),
                        snippet=cit.get("snippet"),
                        source_type="document",
                    )
                )
            elif isinstance(cit, str):
                evidence_list.append(
                    DecisionEvidence(
                        document_title=cit,
                        source_type="document",
                    )
                )

    # If no message-level citations exist, check space documents for matching grounding
    if not evidence_list:
        stmt_docs = select(Document).where(Document.space_id == proposal.space_id).limit(3)
        res_docs = await db.execute(stmt_docs)
        docs = res_docs.scalars().all()
        for d in docs:
            evidence_list.append(
                DecisionEvidence(
                    document_id=d.id,
                    document_title=d.title,
                    source_type=d.type,
                    snippet=f"Space-scoped reference document ({d.type})",
                )
            )

    # 4. Construct Real Chronological Timeline
    timeline: List[DecisionTimelineEvent] = []

    # Creation
    if proposal.created_at:
        timeline.append(
            DecisionTimelineEvent(
                event_type="proposal_generated",
                title="Decision & action proposed by MYND intelligence",
                timestamp=proposal.created_at,
                status="pending",
            )
        )

    # Approval
    if proposal.approved_at:
        timeline.append(
            DecisionTimelineEvent(
                event_type="approved",
                title="Proposal reviewed and approved by user",
                timestamp=proposal.approved_at,
                status="approved",
            )
        )

    # Execution or Failure
    if proposal.executed_at:
        timeline.append(
            DecisionTimelineEvent(
                event_type="executed",
                title=f"Action executed ({proposal.action_type.replace('_', ' ')})",
                timestamp=proposal.executed_at,
                status="executed",
                details={"executed_target_id": proposal.executed_target_id},
            )
        )
    elif proposal.status == "failed":
        timeline.append(
            DecisionTimelineEvent(
                event_type="failed",
                title="Action execution failed",
                timestamp=proposal.approved_at or proposal.created_at,
                status="failed",
                details={"error_code": proposal.error_code, "error_message": proposal.error_message},
            )
        )
    elif proposal.status == "rejected":
        timeline.append(
            DecisionTimelineEvent(
                event_type="rejected",
                title="Proposal rejected by user",
                timestamp=proposal.approved_at or proposal.created_at,
                status="rejected",
            )
        )

    timeline.sort(key=lambda t: t.timestamp)

    # 5. Determine Outcome Object
    outcome = None
    if proposal.status == "executed":
        outcome = {
            "status": "executed",
            "target_id": proposal.executed_target_id,
            "action_type": proposal.action_type,
            "executed_at": proposal.executed_at.isoformat() if proposal.executed_at else None,
            "summary": f"Successfully executed action '{proposal.action_type.replace('_', ' ')}' targeting {proposal.executed_target_id or 'workspace entity'}.",
        }
    elif proposal.status == "failed":
        outcome = {
            "status": "failed",
            "error_code": proposal.error_code,
            "error_message": proposal.error_message,
            "summary": f"Execution failed: {proposal.error_message or 'Internal execution error'}",
        }

    title = f"Decision: {proposal.action_type.replace('_', ' ').capitalize()}"
    conclusion = proposal.reason

    return DecisionDetailResponse(
        id=proposal.id,
        proposal_id=proposal.proposal_id,
        space_id=proposal.space_id,
        conversation_id=proposal.conversation_id,
        conversation_title=conv_title,
        message_id=proposal.message_id,
        title=title,
        conclusion=conclusion,
        action_type=proposal.action_type,
        parameters=proposal.parameters or {},
        confidence=proposal.confidence,
        status=proposal.status,
        evidence=evidence_list,
        outcome=outcome,
        timeline=timeline,
        created_at=proposal.created_at,
        approved_at=proposal.approved_at,
        executed_at=proposal.executed_at,
    )


# ==============================================================================
# 6. Execute Action Proposal (POST /api/v1/actions/execute) [Backward Compatible]
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
    )

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action proposal not found."
        )

    # Verify Space admin/owner membership
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(proposal.space_id), current_user, db, min_role="admin")

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
