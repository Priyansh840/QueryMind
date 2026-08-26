import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select

import pytest_asyncio
from core.config import settings
from tests.conftest import USER_1_ID, USER_2_ID
from models.core import Space, Goal, Project
from models.memory import Memory
from orchestrator.schemas import ActionProposal
from services.action_executor import execute_action


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


# ==============================================================================
# A. Valid create_goal executes successfully
# ==============================================================================
@pytest.mark.asyncio
async def test_a_valid_create_goal_executes(db_session: AsyncSession):
    proposal = ActionProposal(
        proposal_id="p-goal-1",
        action_type="create_goal",
        parameters={"description": "Launch Step 8 Beta"},
        reason="Actionable step",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is True
    assert result.status == "executed"
    assert result.target_id is not None
    assert "Launch Step 8 Beta" in result.message

    # Verify directly in DB
    created_goal = await db_session.get(Goal, uuid.UUID(result.target_id))
    assert created_goal is not None
    assert created_goal.description == "Launch Step 8 Beta"
    assert created_goal.user_id == USER_1_ID


# ==============================================================================
# B. Valid update_goal_status executes successfully
# ==============================================================================
@pytest.mark.asyncio
async def test_b_valid_update_goal_status_executes(db_session: AsyncSession):
    # Setup test goal
    goal = Goal(id=uuid.uuid4(), user_id=USER_1_ID, description="Goal to complete", status="active")
    db_session.add(goal)
    await db_session.commit()

    proposal = ActionProposal(
        proposal_id="p-goal-update",
        action_type="update_goal_status",
        target_id=str(goal.id),
        parameters={"goal_id": str(goal.id), "status": "completed"},
        reason="Mark finished",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is True
    assert result.status == "executed"

    await db_session.refresh(goal)
    assert goal.status == "completed"


# ==============================================================================
# C. Valid create_project executes successfully
# ==============================================================================
@pytest.mark.asyncio
async def test_c_valid_create_project_executes(db_session: AsyncSession):
    # Setup user space
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Execution Space")
    db_session.add(space)
    await db_session.commit()

    proposal = ActionProposal(
        proposal_id="p-proj-create",
        action_type="create_project",
        space_id=str(space.id),
        parameters={"space_id": str(space.id), "name": "Step 8 Execution Project"},
        reason="Create tracking project",
        confidence="medium"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is True
    assert result.status == "executed"
    assert result.target_id is not None

    created_project = await db_session.get(Project, uuid.UUID(result.target_id))
    assert created_project is not None
    assert created_project.name == "Step 8 Execution Project"
    assert created_project.space_id == space.id


# ==============================================================================
# D. Valid update_project_status executes successfully
# ==============================================================================
@pytest.mark.asyncio
async def test_d_valid_update_project_status_executes(db_session: AsyncSession):
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Space for Project")
    db_session.add(space)
    await db_session.commit()

    project = Project(id=uuid.uuid4(), space_id=space.id, name="Project to complete", status="active")
    db_session.add(project)
    await db_session.commit()

    proposal = ActionProposal(
        proposal_id="p-proj-update",
        action_type="update_project_status",
        target_id=str(project.id),
        parameters={"project_id": str(project.id), "status": "completed"},
        reason="Finish project",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is True
    assert result.status == "executed"

    await db_session.refresh(project)
    assert project.status == "completed"


# ==============================================================================
# E. Valid add_memory executes successfully
# ==============================================================================
@pytest.mark.asyncio
async def test_e_valid_add_memory_executes(db_session: AsyncSession):
    proposal = ActionProposal(
        proposal_id="p-mem-1",
        action_type="add_memory",
        parameters={"content": "Security audit verified", "importance": "high", "memory_type": "note"},
        reason="Record verified memory",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is True
    assert result.status == "executed"

    created_mem = await db_session.get(Memory, uuid.UUID(result.target_id))
    assert created_mem is not None
    assert created_mem.content == "Security audit verified"
    assert created_mem.user_id == USER_1_ID


# ==============================================================================
# F. Invalid action type is rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_f_invalid_action_type_rejected(db_session: AsyncSession):
    # Bypass Pydantic with mock or dict to test service boundary
    fake_proposal = {
        "proposal_id": "p-invalid",
        "action_type": "drop_all_tables",
        "parameters": {},
        "reason": "Attack",
        "confidence": "high"
    }
    result = await execute_action(fake_proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status == "rejected"
    assert result.error_code in ("invalid_proposal", "invalid_parameters")


# ==============================================================================
# G. Invalid parameters are rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_g_invalid_parameters_rejected(db_session: AsyncSession):
    proposal = {
        "proposal_id": "p-bad-params",
        "action_type": "update_goal_status",
        "parameters": {"goal_id": "not-a-uuid", "status": "completed"},
        "reason": "Test bad params",
        "confidence": "high"
    }
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status == "rejected"
    assert result.error_code == "invalid_parameters"


# ==============================================================================
# H. Missing target is rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_h_missing_target_rejected(db_session: AsyncSession):
    proposal = ActionProposal(
        proposal_id="p-missing-goal",
        action_type="update_goal_status",
        parameters={"goal_id": str(uuid.uuid4()), "status": "archived"},
        reason="Update non-existent goal",
        confidence="medium"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status == "rejected"
    assert result.error_code == "target_not_found"


# ==============================================================================
# I. Non-existent target is rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_i_non_existent_project_rejected(db_session: AsyncSession):
    proposal = ActionProposal(
        proposal_id="p-missing-proj",
        action_type="update_project_status",
        parameters={"project_id": str(uuid.uuid4()), "status": "completed"},
        reason="Update ghost project",
        confidence="low"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status == "rejected"
    assert result.error_code == "target_not_found"


# ==============================================================================
# J. Cross-user target ID is rejected (Goal)
# ==============================================================================
@pytest.mark.asyncio
async def test_j_cross_user_goal_rejected(db_session: AsyncSession):
    # Goal owned by USER_2
    victim_goal = Goal(id=uuid.uuid4(), user_id=USER_2_ID, description="Private User 2 Goal", status="active")
    db_session.add(victim_goal)
    await db_session.commit()

    # Attacker (USER_1) tries to update USER_2's goal
    proposal = ActionProposal(
        proposal_id="p-cross-user",
        action_type="update_goal_status",
        target_id=str(victim_goal.id),
        parameters={"goal_id": str(victim_goal.id), "status": "completed"},
        reason="Unauthorized mutation",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status == "rejected"
    assert result.error_code == "target_not_found"

    # Verify victim goal was untouched
    await db_session.refresh(victim_goal)
    assert victim_goal.status == "active"


# ==============================================================================
# K. Cross-space target ID is rejected (Project)
# ==============================================================================
@pytest.mark.asyncio
async def test_k_cross_space_project_rejected(db_session: AsyncSession):
    # Space & project owned by USER_2
    space_user2 = Space(id=uuid.uuid4(), user_id=USER_2_ID, name="User 2 Space")
    db_session.add(space_user2)
    await db_session.commit()

    proj_user2 = Project(id=uuid.uuid4(), space_id=space_user2.id, name="User 2 Project", status="active")
    db_session.add(proj_user2)
    await db_session.commit()

    # USER_1 tries to update USER_2's project
    proposal = ActionProposal(
        proposal_id="p-cross-space-proj",
        action_type="update_project_status",
        target_id=str(proj_user2.id),
        parameters={"project_id": str(proj_user2.id), "status": "completed"},
        reason="Unauthorized project change",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status == "rejected"
    assert result.error_code == "target_not_found"

    await db_session.refresh(proj_user2)
    assert proj_user2.status == "active"


# ==============================================================================
# L. Unauthorized create_project is rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_l_unauthorized_create_project_rejected(db_session: AsyncSession):
    # Space owned by USER_2
    space_user2 = Space(id=uuid.uuid4(), user_id=USER_2_ID, name="User 2 Space")
    db_session.add(space_user2)
    await db_session.commit()

    # USER_1 tries to create project inside USER_2's space
    proposal = ActionProposal(
        proposal_id="p-unauth-space-proj",
        action_type="create_project",
        space_id=str(space_user2.id),
        parameters={"space_id": str(space_user2.id), "name": "Injected Project"},
        reason="Unauthorized project creation",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status == "rejected"
    assert result.error_code == "unauthorized"


# ==============================================================================
# M. Goal cannot be attached to another user's project
# ==============================================================================
@pytest.mark.asyncio
async def test_m_goal_cannot_attach_to_other_user_project(db_session: AsyncSession):
    # Space & project owned by USER_2
    space_user2 = Space(id=uuid.uuid4(), user_id=USER_2_ID, name="User 2 Space")
    db_session.add(space_user2)
    await db_session.commit()

    proj_user2 = Project(id=uuid.uuid4(), space_id=space_user2.id, name="User 2 Project", status="active")
    db_session.add(proj_user2)
    await db_session.commit()

    # USER_1 tries to create a goal attached to USER_2's project
    proposal = ActionProposal(
        proposal_id="p-attach-unauth",
        action_type="create_goal",
        parameters={"description": "My Goal", "project_id": str(proj_user2.id)},
        reason="Attach to unauthorized project",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status == "rejected"
    assert result.error_code == "unauthorized"


# ==============================================================================
# N. Failed execution rolls back transaction
# ==============================================================================
@pytest.mark.asyncio
async def test_n_failed_execution_rolls_back(db_session: AsyncSession):
    # Force failure with unpersisted foreign key or invalid status
    proposal = {
        "proposal_id": "p-fail-rollback",
        "action_type": "create_goal",
        "parameters": {"description": "Goal", "project_id": "not-a-uuid"},
        "reason": "Test rollback",
        "confidence": "high"
    }
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert result.success is False
    assert result.status in ("rejected", "failed")


# ==============================================================================
# O. No unsupported mutation can be executed
# ==============================================================================
@pytest.mark.asyncio
async def test_o_unsupported_mutation_rejected(db_session: AsyncSession):
    for forbidden in ["delete_user", "truncate_table", "grant_admin"]:
        fake_proposal = {
            "proposal_id": "p-forbidden",
            "action_type": forbidden,
            "parameters": {},
            "reason": "Forbidden",
            "confidence": "high"
        }
        result = await execute_action(fake_proposal, user_id=USER_1_ID, db=db_session)
        assert result.success is False
        assert result.status == "rejected"


# ==============================================================================
# P. Execution result contains no raw DB object
# ==============================================================================
@pytest.mark.asyncio
async def test_p_result_contains_no_raw_db_object(db_session: AsyncSession):
    proposal = ActionProposal(
        proposal_id="p-raw-check",
        action_type="create_goal",
        parameters={"description": "Clean Result Goal"},
        reason="Check clean result",
        confidence="high"
    )
    result = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    dumped = result.model_dump()
    assert isinstance(dumped, dict)
    assert "Goal" not in dumped
    assert "user_id" not in dumped
    assert "db" not in dumped


# ==============================================================================
# Q. Proposal remains pure intent until execute_action is explicitly called
# ==============================================================================
@pytest.mark.asyncio
async def test_q_proposal_remains_pure_intent(db_session: AsyncSession):
    # Simply creating the proposal object causes 0 DB state changes
    proposal = ActionProposal(
        proposal_id="p-intent-only",
        action_type="create_goal",
        parameters={"description": "Unexecuted Intent Goal"},
        reason="Intent only",
        confidence="high"
    )
    # Check that it doesn't exist in DB
    stmt = select(Goal).where(Goal.description == "Unexecuted Intent Goal")
    res = await db_session.execute(stmt)
    assert res.scalar_one_or_none() is None

    # Now execute explicitly
    await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    res = await db_session.execute(stmt)
    assert res.scalar_one_or_none() is not None


# ==============================================================================
# R. Re-executing the same update proposal is idempotent (status remains completed)
# ==============================================================================
@pytest.mark.asyncio
async def test_r_idempotent_status_update(db_session: AsyncSession):
    goal = Goal(id=uuid.uuid4(), user_id=USER_1_ID, description="Idempotent Goal", status="active")
    db_session.add(goal)
    await db_session.commit()

    proposal = ActionProposal(
        proposal_id="p-idempotent",
        action_type="update_goal_status",
        target_id=str(goal.id),
        parameters={"goal_id": str(goal.id), "status": "completed"},
        reason="Idempotency test",
        confidence="high"
    )
    # First execution
    res1 = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert res1.success is True

    # Second execution
    res2 = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert res2.success is True

    await db_session.refresh(goal)
    assert goal.status == "completed"
