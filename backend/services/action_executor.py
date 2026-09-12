"""
QueryMind - Action Execution Service (Step 8 Phase 3 & 5)
Executes strictly allowlisted workspace mutations only upon explicit user approval.
Enforces multi-tenant authorization, UUID integrity, and atomic DB operations.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional
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

    try:
        if action_type == "create_goal":
            return await _execute_create_goal(proposal_id, parsed_params, user_id, db, auto_commit)
        elif action_type == "update_goal_status":
            return await _execute_update_goal_status(proposal_id, parsed_params, user_id, db, auto_commit)
        elif action_type == "create_project":
            return await _execute_create_project(proposal_id, parsed_params, user_id, db, auto_commit)
        elif action_type == "update_project_status":
            return await _execute_update_project_status(proposal_id, parsed_params, user_id, db, auto_commit)
        elif action_type == "add_memory":
            return await _execute_add_memory(proposal_id, parsed_params, user_id, db, auto_commit)
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
    auto_commit: bool = True
) -> ActionExecutionResult:
    project_uuid = None
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

    new_goal = Goal(
        id=uuid.uuid4(),
        user_id=user_id,
        project_id=project_uuid,
        description=params.description.strip(),
        status="active",
        created_at=datetime.utcnow()
    )
    db.add(new_goal)

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="create_goal",
            status="executed",
            target_id=str(new_goal.id),
            message=f"Goal created successfully: '{new_goal.description}'"
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
            message=f"Goal created successfully: '{new_goal.description}'"
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
            error_code="execution_failed"
        )


async def _execute_update_goal_status(
    proposal_id: str,
    params: UpdateGoalStatusParams,
    user_id: uuid.UUID,
    db: AsyncSession,
    auto_commit: bool = True
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

    stmt = select(Goal).where(Goal.id == goal_uuid, Goal.user_id == user_id)
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

    goal.status = params.status

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="update_goal_status",
            status="executed",
            target_id=str(goal.id),
            message=f"Goal status updated to '{goal.status}'."
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
            message=f"Goal status updated to '{goal.status}'."
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
            error_code="execution_failed"
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
        created_at=datetime.utcnow()
    )
    db.add(new_project)

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="create_project",
            status="executed",
            target_id=str(new_project.id),
            message=f"Project created successfully: '{new_project.name}' in space '{space.name}'."
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
            message=f"Project created successfully: '{new_project.name}' in space '{space.name}'."
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
            error_code="execution_failed"
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

    # Verify project exists and belongs to a space owned by the user
    stmt = select(Project).join(Space, Project.space_id == Space.id).where(
        Project.id == proj_uuid,
        Space.user_id == user_id
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

    project.status = params.status

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="update_project_status",
            status="executed",
            target_id=str(project.id),
            message=f"Project status updated to '{project.status}'."
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
            message=f"Project status updated to '{project.status}'."
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
            error_code="execution_failed"
        )


async def _execute_add_memory(
    proposal_id: str,
    params: AddMemoryParams,
    user_id: uuid.UUID,
    db: AsyncSession,
    auto_commit: bool = True
) -> ActionExecutionResult:
    new_memory = Memory(
        id=uuid.uuid4(),
        user_id=user_id,
        memory_type=params.memory_type.strip(),
        content=params.content.strip(),
        importance=params.importance,
        confidence=1.0,
        status="active",
        reinforcement_count=1,
        source_count=1,
        first_seen_at=datetime.utcnow(),
        last_reinforced_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_memory)

    if not auto_commit:
        await db.flush()
        return ActionExecutionResult(
            success=True,
            proposal_id=proposal_id,
            action_type="add_memory",
            status="executed",
            target_id=str(new_memory.id),
            message="Memory note recorded successfully."
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
            message="Memory note recorded successfully."
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
            error_code="execution_failed"
        )
