import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

import pytest_asyncio
from core.config import settings
from tests.conftest import override_auth, clear_auth_override, USER_1_ID, USER_2_ID
from models.user import User
from models.core import Space, Goal, Project
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


# ==============================================================================
# Helper to setup a conversation with an assistant message containing proposals
# ==============================================================================
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
# A. Authenticated user can approve their own valid proposal
# ==============================================================================
@pytest.mark.asyncio
async def test_a_user_can_approve_own_valid_proposal(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    proposals = [
        {
            "proposal_id": "prop-goal-1",
            "action_type": "create_goal",
            "parameters": {"description": "Finish Step 8 Phase 4"},
            "reason": "Complete approval layer",
            "confidence": "high"
        }
    ]
    space, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-goal-1"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["status"] == "executed"
        assert data["action_type"] == "create_goal"
        assert data["target_id"] is not None

        # Verify in DB
        created_goal = await db_session.get(Goal, uuid.UUID(data["target_id"]))
        assert created_goal is not None
        assert created_goal.description == "Finish Step 8 Phase 4"
        assert created_goal.user_id == user_1.id
    finally:
        clear_auth_override()


# ==============================================================================
# B. Unauthenticated request is rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_b_unauthenticated_request_rejected(async_client: AsyncClient):
    clear_auth_override()
    resp = await async_client.post(
        "/api/v1/actions/execute",
        json={"message_id": str(uuid.uuid4()), "proposal_id": "prop-1"}
    )
    assert resp.status_code in (401, 403)


# ==============================================================================
# C. User cannot execute another user's proposal
# ==============================================================================
@pytest.mark.asyncio
async def test_c_user_cannot_execute_other_user_proposal(async_client: AsyncClient, user_1: User, user_2: User, db_session: AsyncSession):
    # Message belongs to USER_2
    proposals = [
        {
            "proposal_id": "prop-u2",
            "action_type": "create_goal",
            "parameters": {"description": "User 2 Secret Goal"},
            "reason": "Private goal",
            "confidence": "high"
        }
    ]
    space, conv, msg_user2 = await create_test_conversation_with_proposals(user_2, proposals, db_session)

    # USER_1 attempts to execute USER_2's proposal
    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg_user2.id), "proposal_id": "prop-u2"}
        )
        assert resp.status_code == 404
        assert "not found or unauthorized" in resp.json()["detail"]
    finally:
        clear_auth_override()


# ==============================================================================
# D. Invalid proposal_id is rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_d_invalid_proposal_id_rejected(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    proposals = [
        {
            "proposal_id": "prop-real",
            "action_type": "create_goal",
            "parameters": {"description": "Real Goal"},
            "reason": "Real",
            "confidence": "high"
        }
    ]
    space, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-fake-nonexistent"}
        )
        assert resp.status_code == 404
        assert "not found or unauthorized" in resp.json()["detail"]
    finally:
        clear_auth_override()


# ==============================================================================
# E. Nonexistent message_id is rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_e_nonexistent_message_id_rejected(async_client: AsyncClient, user_1: User):
    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(uuid.uuid4()), "proposal_id": "prop-1"}
        )
        assert resp.status_code == 404
        assert "not found or unauthorized" in resp.json()["detail"]
    finally:
        clear_auth_override()


# ==============================================================================
# F. Client cannot override action_type or parameters (tampering defense)
# ==============================================================================
@pytest.mark.asyncio
async def test_f_client_cannot_override_parameters(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    proposals = [
        {
            "proposal_id": "prop-immutable",
            "action_type": "create_goal",
            "parameters": {"description": "Server Stored Legitimate Goal"},
            "reason": "Server reason",
            "confidence": "high"
        }
    ]
    space, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        # Client tries sending tampered parameters in body; endpoint only accepts message_id & proposal_id
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={
                "message_id": str(msg.id),
                "proposal_id": "prop-immutable",
                "action_type": "drop_table",  # ignored by schema
                "parameters": {"description": "Tampered Injected Goal"}  # ignored by schema
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

        # Server executes the stored description, NOT the tampered one
        created_goal = await db_session.get(Goal, uuid.UUID(data["target_id"]))
        assert created_goal.description == "Server Stored Legitimate Goal"
    finally:
        clear_auth_override()


# ==============================================================================
# G. Malformed persisted proposal rejected safely
# ==============================================================================
@pytest.mark.asyncio
async def test_g_malformed_persisted_proposal_rejected(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    # Persist a malformed proposal missing parameters
    proposals = [
        {
            "proposal_id": "prop-corrupt",
            "action_type": "create_goal",
            # missing parameters
            "reason": "Corrupt"
        }
    ]
    space, conv, msg = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-corrupt"}
        )
        # Corrupted parameters in authoritative table return rejected with invalid_proposal
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert data["status"] == "rejected"
        assert data["error_code"] == "invalid_proposal"
    finally:
        clear_auth_override()


# ==============================================================================
# H. Cross-user target ID inside proposal is rejected by ActionExecutionService
# ==============================================================================
@pytest.mark.asyncio
async def test_h_cross_user_target_id_rejected_at_execution(async_client: AsyncClient, user_1: User, user_2: User, db_session: AsyncSession):
    # Goal owned by USER_2
    victim_goal = Goal(id=uuid.uuid4(), user_id=user_2.id, description="User 2 Goal", status="active")
    db_session.add(victim_goal)
    await db_session.commit()

    # User 1 has a proposal pointing to User 2's goal ID
    proposals = [
        {
            "proposal_id": "prop-cross-target",
            "action_type": "update_goal_status",
            "target_id": str(victim_goal.id),
            "parameters": {"goal_id": str(victim_goal.id), "status": "completed"},
            "reason": "Unauthorized update",
            "confidence": "high"
        }
    ]
    space, conv, msg_user1 = await create_test_conversation_with_proposals(user_1, proposals, db_session)

    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg_user1.id), "proposal_id": "prop-cross-target"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert data["status"] == "rejected"
        assert data["error_code"] == "target_not_found"

        await db_session.refresh(victim_goal)
        assert victim_goal.status == "active"
    finally:
        clear_auth_override()


# ==============================================================================
# I. Successful project status update via approval endpoint
# ==============================================================================
@pytest.mark.asyncio
async def test_i_successful_project_status_update(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, _ = await create_test_conversation_with_proposals(user_1, [], db_session)

    project = Project(id=uuid.uuid4(), space_id=space.id, name="Step 8 Approval Project", status="active")
    db_session.add(project)
    await db_session.commit()

    proposals = [
        {
            "proposal_id": "prop-proj-update",
            "action_type": "update_project_status",
            "target_id": str(project.id),
            "parameters": {"project_id": str(project.id), "status": "completed"},
            "reason": "Complete project",
            "confidence": "high"
        }
    ]
    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Here is your proposal",
        metadata_json={"action_proposals": proposals}
    )
    db_session.add(msg)
    await db_session.commit()

    # Also persist to authoritative ActionProposal table
    for p in proposals:
        prop_row = ActionProposal(
            id=uuid.uuid4(),
            proposal_id=p.get("proposal_id", f"prop-{uuid.uuid4().hex[:6]}"),
            user_id=user_1.id,
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
        db_session.add(prop_row)
    await db_session.commit()

    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-proj-update"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["status"] == "executed"

        await db_session.refresh(project)
        assert project.status == "completed"
    finally:
        clear_auth_override()
