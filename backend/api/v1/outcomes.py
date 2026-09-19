"""
QueryMind - Outcomes API Router (Step 14)
Multi-tenant endpoints for listing, retrieving, and evaluating workspace outcomes.

Semantic Rules:
- ActionProposal execution status ("executed") indicates mechanical DB mutation.
- Outcome status ("unknown", "success", "failed", "partial") indicates real-world efficacy.
- Outcome evaluation records later observed reality without destroying historical provenance.
"""

import uuid
import logging
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, get_current_user, get_space_membership
from models.user import User
from models.outcome import Outcome
from repositories.outcomes import OutcomeRepository

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_OUTCOME_STATUSES = {"success", "failed", "partial", "unknown"}
VALID_INITIATED_BY = {"ai_proposal", "human"}


# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class OutcomeEvaluateRequest(BaseModel):
    status: Literal["success", "failed", "partial", "unknown"] = Field(
        ..., description="Objective efficacy status of the outcome"
    )
    actual_outcome: Optional[str] = Field(
        None, description="Observed real-world / workspace result"
    )
    state_delta: Optional[Dict[str, Any]] = Field(
        None, description="Optional updated state delta"
    )


class OutcomeResponse(BaseModel):
    id: str
    space_id: str
    user_id: str
    action_proposal_id: Optional[str] = None
    workflow_id: Optional[str] = None
    target_entity_type: str
    target_entity_id: Optional[str] = None
    initiated_by: str
    status: str
    expected_outcome: Optional[str] = None
    actual_outcome: Optional[str] = None
    state_delta: Optional[Dict[str, Any]] = None
    evaluated_at: Optional[datetime] = None
    evaluator_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, o: Outcome) -> "OutcomeResponse":
        return cls(
            id=str(o.id),
            space_id=str(o.space_id),
            user_id=str(o.user_id),
            action_proposal_id=str(o.action_proposal_id) if o.action_proposal_id else None,
            workflow_id=str(o.workflow_id) if o.workflow_id else None,
            target_entity_type=o.target_entity_type,
            target_entity_id=str(o.target_entity_id) if o.target_entity_id else None,
            initiated_by=o.initiated_by,
            status=o.status,
            expected_outcome=o.expected_outcome,
            actual_outcome=o.actual_outcome,
            state_delta=o.state_delta,
            evaluated_at=o.evaluated_at,
            evaluator_user_id=str(o.evaluator_user_id) if o.evaluator_user_id else None,
            created_at=o.created_at,
            updated_at=o.updated_at,
        )


class OutcomeListResponse(BaseModel):
    items: List[OutcomeResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.get("", response_model=OutcomeListResponse, status_code=status.HTTP_200_OK)
@router.get("/", response_model=OutcomeListResponse, status_code=status.HTTP_200_OK)
async def list_outcomes(
    space_id: str = Query(..., description="Workspace space UUID (required)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Optional status filter"),
    initiated_by: Optional[str] = Query(None, description="Optional initiation origin (ai_proposal, human)"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List outcomes strictly scoped to space_id.
    Requires at least 'viewer' role in the requested space.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid space_id UUID format")

    await get_space_membership(space_uuid, current_user, db, min_role="viewer")

    if status_filter and status_filter not in VALID_OUTCOME_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{status_filter}'. Valid statuses: {sorted(VALID_OUTCOME_STATUSES)}",
        )

    if initiated_by and initiated_by not in VALID_INITIATED_BY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid initiated_by '{initiated_by}'. Valid origins: {sorted(VALID_INITIATED_BY)}",
        )

    items, total = await OutcomeRepository.list_outcomes(
        db,
        space_id=space_uuid,
        status=status_filter,
        initiated_by=initiated_by,
        limit=limit,
        offset=offset,
    )

    return OutcomeListResponse(
        items=[OutcomeResponse.from_model(o) for o in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{outcome_id}", response_model=OutcomeResponse, status_code=status.HTTP_200_OK)
async def get_outcome(
    outcome_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve an outcome by UUID.
    Verifies that the user has at least 'viewer' role in the outcome's space.
    """
    try:
        out_uuid = uuid.UUID(outcome_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid outcome_id UUID format")

    outcome = await OutcomeRepository.get_by_id(db, outcome_id=out_uuid)
    if not outcome:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outcome not found")

    await get_space_membership(outcome.space_id, current_user, db, min_role="viewer")
    return OutcomeResponse.from_model(outcome)


@router.post("/{outcome_id}/evaluate", response_model=OutcomeResponse, status_code=status.HTTP_200_OK)
async def evaluate_outcome(
    outcome_id: str,
    request: OutcomeEvaluateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates an outcome with observed real-world efficacy.
    Requires at least 'member' role in the outcome's space.
    Preserves created_at, original action provenance, and expected_outcome.
    """
    try:
        out_uuid = uuid.UUID(outcome_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid outcome_id UUID format")

    outcome = await OutcomeRepository.get_by_id(db, outcome_id=out_uuid)
    if not outcome:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outcome not found")

    # Authorize: user must be at least member in the space
    await get_space_membership(outcome.space_id, current_user, db, min_role="member")

    evaluated = await OutcomeRepository.evaluate_outcome(
        db,
        outcome_id=out_uuid,
        space_id=outcome.space_id,
        status=request.status,
        evaluator_user_id=current_user.id,
        actual_outcome=request.actual_outcome,
        state_delta=request.state_delta,
        auto_commit=True,
    )

    if not evaluated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Failed to evaluate outcome")

    return OutcomeResponse.from_model(evaluated)
