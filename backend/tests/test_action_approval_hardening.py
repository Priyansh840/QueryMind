import pytest
import asyncio
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select

import pytest_asyncio
from core.config import settings
from tests.conftest import override_auth, clear_auth_override, USER_1_ID, USER_2_ID
from models.user import User
from models.core import Space, Goal, Project
from models.memory import Memory
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


async def create_test_conversation_with_proposals(user: User, proposals: list, db: AsyncSession):
    space = Space(id=uuid.uuid4(), user_id=user.id, name=f"Space for {user.id}")
    db.add(space)
    await db.commit()

    conv = Conversation(id=uuid.uuid4(), user_id=user.id, space_id=space.id, title="Test Conv")
    db.add(conv)
    await db.commit()

    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Here are recommendations and action proposals.",
        metadata_json={
            "objective_id": str(uuid.uuid4()),
            "action_proposals": proposals
        }
    )
    db.add(msg)
    await db.commit()

    # Also persist to authoritative ActionProposal table
    for p in proposals:
        prop_row = ActionProposal(
            id=uuid.uuid4(),
            proposal_id=p.get("proposal_id", f"prop-{uuid.uuid4().hex[:6]}"),
            user_id=user.id,
            space_id=space.id,
            conversation_id=conv.id,
            message_id=msg.id,
            action_type=p.get("action_type", "create_goal"),
            target_id=p.get("target_id"),
            parameters=p.get("parameters", {}),
            reason=p.get("reason", "Test reason"),
            source_recommendation=p.get("source_recommendation"),
            confidence=p.get("confidence", "high"),
            status="pending"
        )
        db.add(prop_row)
    await db.commit()

    return space, conv, msg


# ==============================================================================
# 1. First execution succeeds & Second execution is rejected with already_executed
# ==============================================================================
@pytest.mark.asyncio
async def test_1_first_succeeds_second_rejected_as_already_executed(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    proposals = [
        {
            "proposal_id": "prop-goal-single",
            "action_type": "create_goal",
            "parameters": {"description": "Single Execution Goal"},
            "reason": "Ensure single execution",
            "confidence": "high"
        }
    ]
    space, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        # First execution
        resp1 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-goal-single"}
        )
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["success"] is True
        assert data1["status"] == "executed"
        first_target_id = data1["target_id"]

        # Second execution attempt with same message_id + proposal_id
        resp2 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-goal-single"}
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["success"] is False
        assert data2["status"] == "already_executed"
        assert data2["error_code"] == "already_executed"
        assert data2["target_id"] == first_target_id

        # Verify in DB that only 1 goal exists with this description
        stmt = select(Goal).where(Goal.description == "Single Execution Goal", Goal.user_id == user_1.id)
        res = await db_session.execute(stmt)
        goals = res.scalars().all()
        assert len(goals) == 1
    finally:
        clear_auth_override()


# ==============================================================================
# 2. create_project cannot be duplicated
# ==============================================================================
@pytest.mark.asyncio
async def test_2_create_project_cannot_be_duplicated(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space = Space(id=uuid.uuid4(), user_id=user_1.id, name="Project Space")
    db_session.add(space)
    await db_session.commit()

    proposals = [
        {
            "proposal_id": "prop-proj-single",
            "action_type": "create_project",
            "space_id": str(space.id),
            "parameters": {"space_id": str(space.id), "name": "Single Execution Project"},
            "reason": "Single project",
            "confidence": "high"
        }
    ]
    _, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        # First execution
        resp1 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-proj-single"}
        )
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "executed"

        # Re-execution
        resp2 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-proj-single"}
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "already_executed"

        # Verify only 1 project created
        stmt = select(Project).where(Project.name == "Single Execution Project", Project.space_id == space.id)
        res = await db_session.execute(stmt)
        projects = res.scalars().all()
        assert len(projects) == 1
    finally:
        clear_auth_override()


# ==============================================================================
# 3. add_memory cannot be duplicated
# ==============================================================================
@pytest.mark.asyncio
async def test_3_add_memory_cannot_be_duplicated(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    proposals = [
        {
            "proposal_id": "prop-mem-single",
            "action_type": "add_memory",
            "parameters": {"content": "Strict single memory record", "importance": "high", "memory_type": "note"},
            "reason": "Single memory",
            "confidence": "high"
        }
    ]
    _, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        # First execution
        resp1 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-mem-single"}
        )
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "executed"

        # Re-execution
        resp2 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-mem-single"}
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "already_executed"

        # Verify only 1 memory record created
        stmt = select(Memory).where(Memory.content == "Strict single memory record", Memory.user_id == user_1.id)
        res = await db_session.execute(stmt)
        memories = res.scalars().all()
        assert len(memories) == 1
    finally:
        clear_auth_override()


# ==============================================================================
# 4. update_goal_status and update_project_status execution state tracking
# ==============================================================================
@pytest.mark.asyncio
async def test_4_update_actions_marked_executed_and_prevent_redundancy(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    goal = Goal(id=uuid.uuid4(), user_id=user_1.id, description="Goal to update once", status="active")
    db_session.add(goal)
    await db_session.commit()

    proposals = [
        {
            "proposal_id": "prop-goal-update-state",
            "action_type": "update_goal_status",
            "target_id": str(goal.id),
            "parameters": {"goal_id": str(goal.id), "status": "completed"},
            "reason": "Complete goal",
            "confidence": "high"
        }
    ]
    _, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        # First execution
        resp1 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-goal-update-state"}
        )
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "executed"

        # Second execution
        resp2 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-goal-update-state"}
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "already_executed"

        await db_session.refresh(goal)
        assert goal.status == "completed"
    finally:
        clear_auth_override()


# ==============================================================================
# 5. Concurrent execution of the same proposal (Row-level Lock / Concurrency Test)
# ==============================================================================
@pytest.mark.asyncio
async def test_5_concurrent_execution_of_same_proposal(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    proposals = [
        {
            "proposal_id": "prop-concurrent",
            "action_type": "create_goal",
            "parameters": {"description": "Concurrent Race Goal"},
            "reason": "Test concurrent requests",
            "confidence": "high"
        }
    ]
    _, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        # Send two simultaneous approval requests
        task1 = async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-concurrent"}
        )
        task2 = async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-concurrent"}
        )

        resp1, resp2 = await asyncio.gather(task1, task2)

        statuses = [resp1.json()["status"], resp2.json()["status"]]
        # Exactly one request must be "executed", and the other must be "already_executed"
        assert "executed" in statuses
        assert "already_executed" in statuses

        # Verify only 1 goal was inserted in Postgres
        stmt = select(Goal).where(Goal.description == "Concurrent Race Goal", Goal.user_id == user_1.id)
        res = await db_session.execute(stmt)
        goals = res.scalars().all()
        assert len(goals) == 1
    finally:
        clear_auth_override()


# ==============================================================================
# 6. Failed execution can safely be retried
# ==============================================================================
@pytest.mark.asyncio
async def test_6_failed_execution_can_be_retried(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    # Setup proposal pointing to a non-existent project (will fail execution)
    target_project_id = str(uuid.uuid4())
    proposals = [
        {
            "proposal_id": "prop-retryable",
            "action_type": "update_project_status",
            "target_id": target_project_id,
            "parameters": {"project_id": target_project_id, "status": "completed"},
            "reason": "Retry test",
            "confidence": "high"
        }
    ]
    space, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        # First execution fails because project does not exist
        resp1 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-retryable"}
        )
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "rejected"
        assert resp1.json()["error_code"] == "target_not_found"

        # Now create the missing project in the user's space
        real_project = Project(id=uuid.UUID(target_project_id), space_id=space.id, name="Newly Created Project", status="active")
        db_session.add(real_project)
        await db_session.commit()

        # Retry execution: it was NOT marked executed, so retry proceeds and succeeds
        resp2 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-retryable"}
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "executed"
        assert resp2.json()["success"] is True

        await db_session.refresh(real_project)
        assert real_project.status == "completed"
    finally:
        clear_auth_override()


# ==============================================================================
# 7. Execution state is server-controlled (client cannot forge execution_status)
# ==============================================================================
@pytest.mark.asyncio
async def test_7_client_cannot_forge_execution_status(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    proposals = [
        {
            "proposal_id": "prop-forge",
            "action_type": "create_goal",
            "parameters": {"description": "Server Controlled Goal"},
            "reason": "Test forge",
            "confidence": "high"
        }
    ]
    _, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        # Client tries to pass execution_status="executed" in body to mock execution without executing
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={
                "message_id": str(msg.id),
                "proposal_id": "prop-forge",
                "execution_status": "executed"  # ignored by ActionExecuteRequest schema
            }
        )
        assert resp.status_code == 200
        # The server processes and actually executes the proposal
        assert resp.json()["status"] == "executed"
        assert resp.json()["success"] is True
    finally:
        clear_auth_override()
