"""
QueryMind - Action Execution Service (Step 8 Phase 3 & 5)
Executes strictly allowlisted workspace mutations only upon explicit user approval.
Enforces multi-tenant authorization, UUID integrity, and atomic DB operations.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.core import Space, Project, Goal
from models.memory import Memory
from orchestrator.schemas import (
    ActionProposal,
    ActionExecutionResult,
    CreateGoalParams,
    UpdateGoalStatusParams,
    CreateProjectParams,
    UpdateProjectStatusParams,
    AddMemoryParams,
)

logger = logging.getLogger(__name__)


async def execute_action(
    proposal: ActionProposal,
    user_id: uuid.UUID,
    db: AsyncSession,
    auto_commit: bool = True
) -> ActionExecutionResult:
    """
    Main entry point for executing an approved ActionProposal.
    
    Security Guarantee:
    - Never executes without an authenticated user_id.
    - Strictly allowlists 5 action types (rejects anything else).
    - Verifies entity ownership against user_id before mutating.
    - Executes in an isolated, transactional database boundary.
    - If auto_commit=False, flushes changes so caller can atomically commit along with metadata.
    """
    if not user_id:
        return ActionExecutionResult(
            success=False,
            proposal_id=getattr(proposal, "proposal_id", "unknown"),
            action_type=getattr(proposal, "action_type", "create_goal"),
            status="rejected",
            target_id=None,
            message="Missing authenticated user.",
            error_code="unauthorized"
        )

    if isinstance(user_id, str):
        try:
            user_id = uuid.UUID(str(user_id))
        except (ValueError, TypeError):
            return ActionExecutionResult(
                success=False,
                proposal_id=getattr(proposal, "proposal_id", "unknown"),
                action_type=getattr(proposal, "action_type", "create_goal"),
                status="rejected",
                target_id=None,
                message="Invalid authenticated user ID format.",
                error_code="unauthorized"
            )

    # 1. Re-validate Proposal Schema and Parameters
    try:
        if not isinstance(proposal, ActionProposal):
            proposal = ActionProposal.model_validate(proposal)
        parsed_params = proposal.validate_parameters()
    except Exception as e:
        logger.warning(f"Action proposal rejected due to invalid schema/parameters: {e}")
        return ActionExecutionResult(
            success=False,
            proposal_id=getattr(proposal, "proposal_id", "unknown"),
            action_type=getattr(proposal, "action_type", "create_goal"),
            status="rejected",
            target_id=None,
            message="Action proposal contains invalid parameters or schema structure.",
            error_code="invalid_parameters"
        )

    # 2. Dispatch to dedicated allowlisted execution handler
    action_type = proposal.action_type
    proposal_id = proposal.proposal_id
    prop_space_id = getattr(proposal, "space_id", None)

    try:
        if action_type == "create_goal":
            return await _execute_create_goal(proposal_id, parsed_params, user_id, db, auto_commit, space_id=prop_space_id)
        elif action_type == "update_goal_status":
            return await _execute_update_goal_status(proposal_id, parsed_params, user_id, db, auto_commit, space_id=prop_space_id)
        elif action_type == "create_project":
            return await _execute_create_project(proposal_id, parsed_params, user_id, db, auto_commit)
        elif action_type == "update_project_status":
            return await _execute_update_project_status(proposal_id, parsed_params, user_id, db, auto_commit)
        elif action_type == "add_memory":
            return await _execute_add_memory(proposal_id, parsed_params, user_id, db, auto_commit, space_id=prop_space_id)

        else:
            return ActionExecutionResult(
                success=False,
                proposal_id=proposal_id,
                action_type=action_type,
                status="rejected",
                target_id=None,
                message=f"Unsupported action type '{action_type}'.",
                error_code="invalid_proposal"
            )
    except Exception as exc:
        logger.error(f"Unexpected exception during action execution ({action_type}): {exc}", exc_info=True)
        if auto_commit:
            await db.rollback()
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type=action_type,
            status="failed",
            target_id=None,
            message="An internal error occurred while executing the action.",
            error_code="execution_failed"
        )


async def _execute_create_goal(
    proposal_id: str,
    params: CreateGoalParams,
    user_id: uuid.UUID,
    db: AsyncSession,
    auto_commit: bool = True,
    space_id: uuid.UUID | str | None = None,
) -> ActionExecutionResult:
    project_uuid = None
    target_space_uuid = None
    if space_id:
        try:
            target_space_uuid = uuid.UUID(str(space_id))
        except (ValueError, TypeError):
            pass

    if params.project_id:
        try:
            project_uuid = uuid.UUID(str(params.project_id))
        except (ValueError, TypeError):
            return ActionExecutionResult(
                success=False,
                proposal_id=proposal_id,
                action_type="create_goal",
                status="rejected",
                target_id=None,
                message="Invalid project_id UUID format.",
                error_code="invalid_parameters"
            )

        # Verify project belongs to a space where user is owner or member
        from models.space_member import SpaceMember
        stmt = (
            select(Project)
            .join(Space, Project.space_id == Space.id)
            .outerjoin(SpaceMember, Space.id == SpaceMember.space_id)
            .where(
                Project.id == project_uuid,
                (Space.user_id == user_id) | (SpaceMember.user_id == user_id),
            )
        )
        result = await db.execute(stmt)
        project = result.scalar_one_or_none()
        if not project:
            return ActionExecutionResult(
                success=False,
                proposal_id=proposal_id,
                action_type="create_goal",
                status="rejected",
                target_id=None,
                message="Target project not found or unauthorized.",
                error_code="unauthorized"
            )
        target_space_uuid = project.space_id

    if not target_space_uuid:
        s_res = await db.execute(
            select(Space.id).where(Space.user_id == user_id).order_by(Space.is_default.desc()).limit(1)
        )
        target_space_uuid = s_res.scalar_one_or_none()

    new_goal = Goal(
        id=uuid.uuid4(),
        user_id=user_id,
        space_id=target_space_uuid,
        project_id=project_uuid,
        description=params.description.strip(),
        status="active",
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_goal)

    state_delta = {
        "before": None,
        "after": {
            "id": str(new_goal.id),
            "description": new_goal.description,
            "status": new_goal.status,
            "space_id": str(target_space_uuid) if target_space_uuid else None,
            "project_id": str(project_uuid) if project_uuid else None,
        },
    }

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="create_goal",
            status="executed",
            target_id=str(new_goal.id),
            message=f"Goal created successfully: '{new_goal.description}'",
            state_delta=state_delta,
            target_entity_type="goal",
        )

    try:
        await db.commit()
        await db.refresh(new_goal)
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="create_goal",
            status="executed",
            target_id=str(new_goal.id),
            message=f"Goal created successfully: '{new_goal.description}'",
            state_delta=state_delta,
            target_entity_type="goal",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"DB commit error creating goal: {e}")
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="create_goal",
            status="failed",
            target_id=None,
            message="Database transaction failed while creating goal.",
            error_code="execution_failed",
            state_delta=None,
            target_entity_type="goal",
        )


async def _execute_update_goal_status(
    proposal_id: str,
    params: UpdateGoalStatusParams,
    user_id: uuid.UUID,
    db: AsyncSession,
    auto_commit: bool = True,
    space_id: uuid.UUID | str | None = None,
) -> ActionExecutionResult:
    try:
        goal_uuid = uuid.UUID(str(params.goal_id))
    except (ValueError, TypeError):
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="update_goal_status",
            status="rejected",
            target_id=None,
            message="Invalid goal_id UUID format.",
            error_code="invalid_parameters"
        )

    from models.space_member import SpaceMember
    stmt = (
        select(Goal)
        .outerjoin(SpaceMember, Goal.space_id == SpaceMember.space_id)
        .where(
            Goal.id == goal_uuid,
            (Goal.user_id == user_id) | (
                (SpaceMember.user_id == user_id) & (SpaceMember.role.in_(["owner", "admin", "member"]))
            )
        )
    )
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()

    if not goal:
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="update_goal_status",
            status="rejected",
            target_id=str(goal_uuid),
            message="Goal not found or unauthorized.",
            error_code="target_not_found"
        )

    state_before = {
        "id": str(goal.id),
        "description": goal.description,
        "status": goal.status,
        "space_id": str(goal.space_id) if goal.space_id else None,
        "project_id": str(goal.project_id) if goal.project_id else None,
    }
    goal.status = params.status
    state_after = {
        "id": str(goal.id),
        "description": goal.description,
        "status": goal.status,
        "space_id": str(goal.space_id) if goal.space_id else None,
        "project_id": str(goal.project_id) if goal.project_id else None,
    }
    state_delta = {"before": state_before, "after": state_after}


    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="update_goal_status",
            status="executed",
            target_id=str(goal.id),
            message=f"Goal status updated to '{goal.status}'.",
            state_delta=state_delta,
            target_entity_type="goal",
        )

    try:
        await db.commit()
        await db.refresh(goal)
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="update_goal_status",
            status="executed",
            target_id=str(goal.id),
            message=f"Goal status updated to '{goal.status}'.",
            state_delta=state_delta,
            target_entity_type="goal",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"DB commit error updating goal status: {e}")
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="update_goal_status",
            status="failed",
            target_id=str(goal_uuid),
            message="Database transaction failed while updating goal.",
            error_code="execution_failed",
            state_delta=None,
            target_entity_type="goal",
        )


async def _execute_create_project(
    proposal_id: str,
    params: CreateProjectParams,
    user_id: uuid.UUID,
    db: AsyncSession,
    auto_commit: bool = True
) -> ActionExecutionResult:
    try:
        space_uuid = uuid.UUID(str(params.space_id))
    except (ValueError, TypeError):
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="create_project",
            status="rejected",
            target_id=None,
            message="Invalid space_id UUID format.",
            error_code="invalid_parameters"
        )

    # Verify Space membership (owner or member)
    from models.space_member import SpaceMember
    stmt = (
        select(Space)
        .outerjoin(SpaceMember, Space.id == SpaceMember.space_id)
        .where(
            Space.id == space_uuid,
            (Space.user_id == user_id) | (SpaceMember.user_id == user_id),
        )
    )
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()

    if not space:
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="create_project",
            status="rejected",
            target_id=str(space_uuid),
            message="Target space not found or unauthorized.",
            error_code="unauthorized"
        )

    new_project = Project(
        id=uuid.uuid4(),
        space_id=space.id,
        name=params.name.strip(),
        status="active",
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_project)

    state_delta = {
        "before": None,
        "after": {
            "id": str(new_project.id),
            "name": new_project.name,
            "status": new_project.status,
            "space_id": str(space.id),
        },
    }

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="create_project",
            status="executed",
            target_id=str(new_project.id),
            message=f"Project created successfully: '{new_project.name}' in space '{space.name}'.",
            state_delta=state_delta,
            target_entity_type="project",
        )

    try:
        await db.commit()
        await db.refresh(new_project)
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="create_project",
            status="executed",
            target_id=str(new_project.id),
            message=f"Project created successfully: '{new_project.name}' in space '{space.name}'.",
            state_delta=state_delta,
            target_entity_type="project",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"DB commit error creating project: {e}")
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="create_project",
            status="failed",
            target_id=None,
            message="Database transaction failed while creating project.",
            error_code="execution_failed",
            state_delta=None,
            target_entity_type="project",
        )


async def _execute_update_project_status(
    proposal_id: str,
    params: UpdateProjectStatusParams,
    user_id: uuid.UUID,
    db: AsyncSession,
    auto_commit: bool = True
) -> ActionExecutionResult:
    try:
        proj_uuid = uuid.UUID(str(params.project_id))
    except (ValueError, TypeError):
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="update_project_status",
            status="rejected",
            target_id=None,
            message="Invalid project_id UUID format.",
            error_code="invalid_parameters"
        )

    # Verify project exists and belongs to a space where user is owner or admin collaborator
    from models.space_member import SpaceMember
    stmt = (
        select(Project)
        .join(Space, Project.space_id == Space.id)
        .outerjoin(SpaceMember, Space.id == SpaceMember.space_id)
        .where(
            Project.id == proj_uuid,
            (Space.user_id == user_id) | (
                (SpaceMember.user_id == user_id) & (SpaceMember.role.in_(["owner", "admin"]))
            ),
        )
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()

    if not project:
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="update_project_status",
            status="rejected",
            target_id=str(proj_uuid),
            message="Project not found or unauthorized.",
            error_code="target_not_found"
        )

    state_before = {
        "id": str(project.id),
        "name": project.name,
        "status": project.status,
        "space_id": str(project.space_id),
    }
    project.status = params.status
    state_after = {
        "id": str(project.id),
        "name": project.name,
        "status": project.status,
        "space_id": str(project.space_id),
    }
    state_delta = {"before": state_before, "after": state_after}

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="update_project_status",
            status="executed",
            target_id=str(project.id),
            message=f"Project status updated to '{project.status}'.",
            state_delta=state_delta,
            target_entity_type="project",
        )

    try:
        await db.commit()
        await db.refresh(project)
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="update_project_status",
            status="executed",
            target_id=str(project.id),
            message=f"Project status updated to '{project.status}'.",
            state_delta=state_delta,
            target_entity_type="project",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"DB commit error updating project status: {e}")
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="update_project_status",
            status="failed",
            target_id=str(proj_uuid),
            message="Database transaction failed while updating project.",
            error_code="execution_failed",
            state_delta=None,
            target_entity_type="project",
        )


async def _execute_add_memory(
    proposal_id: str,
    params: AddMemoryParams,
    user_id: uuid.UUID,
    db: AsyncSession,
    auto_commit: bool = True,
    space_id: Optional[Any] = None
) -> ActionExecutionResult:
    target_space_uuid = None
    if space_id is not None:
        try:
            target_space_uuid = uuid.UUID(str(space_id))
        except (ValueError, TypeError):
            target_space_uuid = None
    elif getattr(params, "space_id", None):
        try:
            target_space_uuid = uuid.UUID(str(params.space_id))
        except (ValueError, TypeError):
            target_space_uuid = None

    new_memory = Memory(
        id=uuid.uuid4(),
        user_id=user_id,
        space_id=target_space_uuid,
        memory_type=params.memory_type.strip(),
        content=params.content.strip(),
        importance=params.importance,
        confidence=1.0,
        status="active",
        reinforcement_count=1,
        source_count=1,
        first_seen_at=datetime.now(timezone.utc),
        last_reinforced_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(new_memory)

    state_delta = {
        "before": None,
        "after": {
            "id": str(new_memory.id),
            "content": new_memory.content,
            "memory_type": new_memory.memory_type,
            "space_id": str(target_space_uuid) if target_space_uuid else None,
        },
    }

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="add_memory",
            status="executed",
            target_id=str(new_memory.id),
            message="Memory note recorded successfully.",
            state_delta=state_delta,
            target_entity_type="memory",
        )

    try:
        await db.commit()
        await db.refresh(new_memory)
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="add_memory",
            status="executed",
            target_id=str(new_memory.id),
            message="Memory note recorded successfully.",
            state_delta=state_delta,
            target_entity_type="memory",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"DB commit error creating memory: {e}")
        return ActionExecutionResult(
            success=False,
            proposal_id=proposal_id,
            action_type="add_memory",
            status="failed",
            target_id=None,
            message="Database transaction failed while adding memory.",
            error_code="execution_failed",
            state_delta=None,
            target_entity_type="memory",
        )
