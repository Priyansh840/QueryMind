"""
QueryMind - Goals Router
Authenticated goal management endpoints scoped to spaces and projects.
User identity is derived strictly from the validated Supabase JWT token.
"""

import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_user, get_space_membership
from models.core import Goal, Project, Space
from models.space_member import SpaceMember
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class GoalCreateRequest(BaseModel):
    description: str = Field(..., min_length=1)
    space_id: Optional[str] = None
    project_id: Optional[str] = None


class GoalUpdateRequest(BaseModel):
    description: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = Field(None, max_length=50)


class GoalResponse(BaseModel):
    id: str
    user_id: str
    space_id: Optional[str] = None
    project_id: Optional[str] = None
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    request: GoalCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Goal scoped to a Space (and optional Project).
    Requires at least 'member' role in the target space.
    """
    project_uuid = None
    project = None
    target_space_id = None

    if request.project_id:
        try:
            project_uuid = uuid.UUID(request.project_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid project_id UUID format")
            
        stmt = select(Project).where(Project.id == project_uuid)
        result = await db.execute(stmt)
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Verify Space membership for the project's space
        try:
            space, _ = await get_space_membership(str(project.space_id), current_user, db, min_role="member")
            target_space_id = space.id
        except HTTPException as exc:
            if "insufficient permissions" not in str(exc.detail).lower():
                raise HTTPException(status_code=404, detail="Project not found")
            raise

        if request.space_id and str(request.space_id) != str(target_space_id):
            raise HTTPException(status_code=400, detail="Provided space_id does not match project space_id")

    elif request.space_id:
        space, _ = await get_space_membership(request.space_id, current_user, db, min_role="member")
        target_space_id = space.id

    else:
        # Standalone goal without space or project linkage
        target_space_id = None

    new_goal = Goal(
        id=uuid.uuid4(),
        user_id=current_user.id,
        space_id=target_space_id,
        project_id=project_uuid,
        description=request.description.strip(),
        status="active",
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_goal)
    await db.flush()

    if target_space_id:
        from repositories.outcomes import OutcomeRepository
        await OutcomeRepository.create(
            db,
            space_id=target_space_id,
            user_id=current_user.id,
            target_entity_type="goal",
            target_entity_id=new_goal.id,
            initiated_by="human",
            status="unknown",
            expected_outcome=f"Create goal: '{new_goal.description}'",
            actual_outcome=None,
            state_delta={
                "before": None,
                "after": {
                    "id": str(new_goal.id),
                    "description": new_goal.description,
                    "status": new_goal.status,
                    "space_id": str(target_space_id),
                    "project_id": str(project_uuid) if project_uuid else None,
                },
            },
            auto_commit=False,
        )
    
    try:
        await db.commit()
        await db.refresh(new_goal)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating goal: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create goal",
        )

    return GoalResponse(
        id=str(new_goal.id),
        user_id=str(new_goal.user_id),
        space_id=str(new_goal.space_id) if new_goal.space_id else None,
        project_id=str(new_goal.project_id) if new_goal.project_id else None,
        description=new_goal.description,
        status=new_goal.status,
        created_at=new_goal.created_at,
    )


@router.get("", response_model=List[GoalResponse])
@router.get("/", response_model=List[GoalResponse])
async def list_goals(
    project_id: Optional[str] = None,
    space_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List goals accessible to the authenticated user within a space, project, or across user spaces.
    """
    if space_id:
        space, _ = await get_space_membership(space_id, current_user, db, min_role="viewer")
        stmt = select(Goal).where(Goal.space_id == space.id)
        if project_id:
            try:
                p_uuid = uuid.UUID(project_id)
                stmt = stmt.where(Goal.project_id == p_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid project_id UUID format")
    elif project_id:
        try:
            p_uuid = uuid.UUID(project_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project_id UUID format")
        p_res = await db.execute(select(Project).where(Project.id == p_uuid))
        project = p_res.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        await get_space_membership(str(project.space_id), current_user, db, min_role="viewer")
        stmt = select(Goal).where(Goal.project_id == p_uuid)
    else:
        # Accessible goals: created by user OR in spaces where user is owner/member
        stmt = (
            select(Goal)
            .outerjoin(SpaceMember, Goal.space_id == SpaceMember.space_id)
            .where(
                (Goal.user_id == current_user.id) | (SpaceMember.user_id == current_user.id)
            )
            .distinct()
        )
            
    stmt = stmt.order_by(Goal.created_at.desc())
    result = await db.execute(stmt)
    goals = result.scalars().all()

    return [
        GoalResponse(
            id=str(g.id),
            user_id=str(g.user_id),
            space_id=str(g.space_id) if g.space_id else None,
            project_id=str(g.project_id) if g.project_id else None,
            description=g.description,
            status=g.status,
            created_at=g.created_at,
        )
        for g in goals
    ]


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        g_uuid = uuid.UUID(goal_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid goal_id UUID format")

    stmt = select(Goal).where(Goal.id == g_uuid)
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Enforce space-scoped authorization
    if goal.space_id:
        try:
            await get_space_membership(str(goal.space_id), current_user, db, min_role="viewer")
        except HTTPException as exc:
            if "insufficient permissions" not in str(exc.detail).lower():
                raise HTTPException(status_code=404, detail="Goal not found")
            raise
    elif goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    return GoalResponse(
        id=str(goal.id),
        user_id=str(goal.user_id),
        space_id=str(goal.space_id) if goal.space_id else None,
        project_id=str(goal.project_id) if goal.project_id else None,
        description=goal.description,
        status=goal.status,
        created_at=goal.created_at,
    )


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    request: GoalUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        g_uuid = uuid.UUID(goal_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid goal_id UUID format")

    stmt = select(Goal).where(Goal.id == g_uuid)
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Enforce space-scoped update authorization (requires 'member' role in space)
    if goal.space_id:
        try:
            await get_space_membership(str(goal.space_id), current_user, db, min_role="member")
        except HTTPException as exc:
            if "insufficient permissions" not in str(exc.detail).lower():
                raise HTTPException(status_code=404, detail="Goal not found")
            raise
    elif goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    state_before = {
        "id": str(goal.id),
        "description": goal.description,
        "status": goal.status,
        "space_id": str(goal.space_id) if goal.space_id else None,
        "project_id": str(goal.project_id) if goal.project_id else None,
    }

    if request.description is not None:
        goal.description = request.description.strip()
    if request.status is not None:
        goal.status = request.status.strip()

    state_after = {
        "id": str(goal.id),
        "description": goal.description,
        "status": goal.status,
        "space_id": str(goal.space_id) if goal.space_id else None,
        "project_id": str(goal.project_id) if goal.project_id else None,
    }

    target_space_id = goal.space_id
    if not target_space_id and goal.project_id:
        p_res = await db.execute(select(Project.space_id).where(Project.id == goal.project_id))
        target_space_id = p_res.scalar_one_or_none()

    if target_space_id:
        from repositories.outcomes import OutcomeRepository
        await OutcomeRepository.create(
            db,
            space_id=target_space_id,
            user_id=current_user.id,
            target_entity_type="goal",
            target_entity_id=goal.id,
            initiated_by="human",
            status="unknown",
            expected_outcome=f"Update goal status to '{goal.status}'",
            actual_outcome=None,
            state_delta={"before": state_before, "after": state_after},
            auto_commit=False,
        )

    try:
        await db.commit()
        await db.refresh(goal)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating goal: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update goal")

    return GoalResponse(
        id=str(goal.id),
        user_id=str(goal.user_id),
        space_id=str(goal.space_id) if goal.space_id else None,
        project_id=str(goal.project_id) if goal.project_id else None,
        description=goal.description,
        status=goal.status,
        created_at=goal.created_at,
    )


@router.delete("/{goal_id}", status_code=status.HTTP_200_OK)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        g_uuid = uuid.UUID(goal_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid goal_id UUID format")

    stmt = select(Goal).where(Goal.id == g_uuid)
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Enforce space-scoped delete authorization (requires 'admin' role in space, or creator)
    if goal.space_id:
        try:
            await get_space_membership(str(goal.space_id), current_user, db, min_role="admin")
        except HTTPException as exc:
            if "insufficient permissions" not in str(exc.detail).lower():
                raise HTTPException(status_code=404, detail="Goal not found")
            raise
    elif goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    await db.delete(goal)
    await db.commit()

    return {"status": "success", "message": f"Goal {goal_id} deleted successfully"}
