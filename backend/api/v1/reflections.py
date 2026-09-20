"""
QueryMind - Reflections API Router (Step 14)
Multi-tenant endpoints for creating, listing, and retrieving workspace reflections.

Security & Integrity:
- Multi-tenant tenant boundaries enforced via space membership
- If linked to an Outcome, ensures outcome belongs to the same space
- Reflection text is treated as untrusted context downstream
"""

import uuid
import logging
from typing import Optional, List, Literal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, get_current_user, get_space_membership
from models.user import User
from models.outcome import Reflection
from repositories.reflections import ReflectionRepository

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_REFLECTION_TYPES = {"lesson", "failure_analysis", "success_pattern", "user_feedback"}


# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class ReflectionCreateRequest(BaseModel):
    space_id: str = Field(..., description="Target space UUID")
    outcome_id: Optional[str] = Field(None, description="Optional associated outcome UUID")
    reflection_type: Literal["lesson", "failure_analysis", "success_pattern", "user_feedback"] = Field(
        default="lesson", description="Category of reflection"
    )
    title: str = Field(..., min_length=1, max_length=255, description="Brief descriptive title")
    lesson_learned: str = Field(..., min_length=1, description="Synthesized lesson or insight")
    actionable_guidance: Optional[str] = Field(None, description="Guidance for future agent/human actions")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")


class ReflectionResponse(BaseModel):
    id: str
    space_id: str
    user_id: str
    outcome_id: Optional[str] = None
    reflection_type: str
    title: str
    lesson_learned: str
    actionable_guidance: Optional[str] = None
    confidence: float
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, r: Reflection) -> "ReflectionResponse":
        return cls(
            id=str(r.id),
            space_id=str(r.space_id),
            user_id=str(r.user_id),
            outcome_id=str(r.outcome_id) if r.outcome_id else None,
            reflection_type=r.reflection_type,
            title=r.title,
            lesson_learned=r.lesson_learned,
            actionable_guidance=r.actionable_guidance,
            confidence=r.confidence,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )


class ReflectionListResponse(BaseModel):
    items: List[ReflectionResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=ReflectionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ReflectionResponse, status_code=status.HTTP_201_CREATED)
async def create_reflection(
    request: ReflectionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Reflection in the specified space.
    Requires at least 'member' role in the space.
    If outcome_id is provided, validates that the outcome exists in the same space.
    """
    try:
        space_uuid = uuid.UUID(request.space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid space_id UUID format")

    outcome_uuid = None
    if request.outcome_id:
        try:
            outcome_uuid = uuid.UUID(request.outcome_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid outcome_id UUID format")

    # Authorize: user must be at least member in the space
    await get_space_membership(space_uuid, current_user, db, min_role="member")

    try:
        reflection = await ReflectionRepository.create(
            db,
            space_id=space_uuid,
            user_id=current_user.id,
            title=request.title.strip(),
            lesson_learned=request.lesson_learned.strip(),
            reflection_type=request.reflection_type,
            outcome_id=outcome_uuid,
            actionable_guidance=request.actionable_guidance.strip() if request.actionable_guidance else None,
            confidence=request.confidence,
            auto_commit=True,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))

    return ReflectionResponse.from_model(reflection)


@router.get("", response_model=ReflectionListResponse, status_code=status.HTTP_200_OK)
@router.get("/", response_model=ReflectionListResponse, status_code=status.HTTP_200_OK)
async def list_reflections(
    space_id: str = Query(..., description="Workspace space UUID (required)"),
    reflection_type: Optional[str] = Query(None, description="Optional reflection_type filter"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List reflections strictly scoped to space_id.
    Requires at least 'viewer' role in the requested space.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid space_id UUID format")

    await get_space_membership(space_uuid, current_user, db, min_role="viewer")

    if reflection_type and reflection_type not in VALID_REFLECTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reflection_type '{reflection_type}'. Valid types: {sorted(VALID_REFLECTION_TYPES)}",
        )

    items, total = await ReflectionRepository.list_reflections(
        db,
        space_id=space_uuid,
        reflection_type=reflection_type,
        limit=limit,
        offset=offset,
    )

    return ReflectionListResponse(
        items=[ReflectionResponse.from_model(r) for r in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{reflection_id}", response_model=ReflectionResponse, status_code=status.HTTP_200_OK)
async def get_reflection(
    reflection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a reflection by UUID.
    Verifies that the user has at least 'viewer' role in the reflection's space.
    """
    try:
        ref_uuid = uuid.UUID(reflection_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reflection_id UUID format")

    reflection = await ReflectionRepository.get_by_id(db, reflection_id=ref_uuid)
    if not reflection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reflection not found")

    await get_space_membership(reflection.space_id, current_user, db, min_role="viewer")
    return ReflectionResponse.from_model(reflection)
