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
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal
from repositories.action_proposals import ActionProposalRepository


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


async def setup_test_conversation(user: User, db: AsyncSession):
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
        content="Assistant message",
        metadata_json={"action_proposals": []}
    )
    db.add(msg)
    await db.commit()

    return space, conv, msg


# ==============================================================================
# 1. Listing: List actions returns current user's actions
# ==============================================================================
@pytest.mark.asyncio
async def test_list_actions_returns_current_users_actions(async_client: AsyncClient, user_1: User, user_2: User, db_session: AsyncSession):
    space1, conv1, msg1 = await setup_test_conversation(user_1, db_session)
    space2, conv2, msg2 = await setup_test_conversation(user_2, db_session)

    # User 1 proposals
    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-u1-1",
        user_id=user_1.id,
        space_id=space1.id,
        conversation_id=conv1.id,
        message_id=msg1.id,
        action_type="create_goal",
        parameters={"description": "User 1 Goal"},
        reason="Reason 1"
    )

    # User 2 proposals
    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-u2-1",
        user_id=user_2.id,
        space_id=space2.id,
        conversation_id=conv2.id,
        message_id=msg2.id,
        action_type="create_goal",
        parameters={"description": "User 2 Goal"},
        reason="Reason 2"
    )

    override_auth(user_1)
    try:
        resp = await async_client.get("/api/v1/actions")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] >= 1
        # All items belong to User 1
        assert all(item["user_id"] == str(user_1.id) for item in data["items"])
        assert any(item["proposal_id"] == "prop-u1-1" for item in data["items"])
        assert not any(item["proposal_id"] == "prop-u2-1" for item in data["items"])
    finally:
        clear_auth_override()


# ==============================================================================
# 2. Listing: Filters by space
# ==============================================================================
@pytest.mark.asyncio
async def test_list_actions_filters_by_space(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space_a, conv_a, msg_a = await setup_test_conversation(user_1, db_session)
    space_b, conv_b, msg_b = await setup_test_conversation(user_1, db_session)

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-space-a",
        user_id=user_1.id,
        space_id=space_a.id,
        conversation_id=conv_a.id,
        message_id=msg_a.id,
        action_type="create_goal",
        parameters={"description": "Space A Goal"},
        reason="Space A"
    )

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-space-b",
        user_id=user_1.id,
        space_id=space_b.id,
        conversation_id=conv_b.id,
        message_id=msg_b.id,
        action_type="create_goal",
        parameters={"description": "Space B Goal"},
        reason="Space B"
    )

    override_auth(user_1)
    try:
        resp = await async_client.get(f"/api/v1/actions?space_id={space_a.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["proposal_id"] == "prop-space-a"
    finally:
        clear_auth_override()


# ==============================================================================
# 3. Listing: Filters by status
# ==============================================================================
@pytest.mark.asyncio
async def test_list_actions_filters_by_status(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-status-pending",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Pending"},
        reason="Pending",
        status="pending"
    )

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-status-executed",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Executed"},
        reason="Executed",
        status="executed"
    )

    override_auth(user_1)
    try:
        resp = await async_client.get(f"/api/v1/actions?space_id={space.id}&status=executed")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["proposal_id"] == "prop-status-executed"
        assert data["items"][0]["status"] == "executed"
    finally:
        clear_auth_override()


# ==============================================================================
# 4. Listing: Paginates
# ==============================================================================
@pytest.mark.asyncio
async def test_list_actions_paginates(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    for i in range(5):
        await ActionProposalRepository.create(
            db_session,
            proposal_id=f"prop-page-{i}",
            user_id=user_1.id,
            space_id=space.id,
            conversation_id=conv.id,
            message_id=msg.id,
            action_type="create_goal",
            parameters={"description": f"Page Goal {i}"},
            reason="Paging"
        )

    override_auth(user_1)
    try:
        resp = await async_client.get(f"/api/v1/actions?space_id={space.id}&limit=2&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["limit"] == 2
        assert data["offset"] == 0

        # Next page
        resp_next = await async_client.get(f"/api/v1/actions?space_id={space.id}&limit=2&offset=2")
        assert resp_next.status_code == 200
        data_next = resp_next.json()
        assert len(data_next["items"]) == 2
        assert data_next["items"][0]["proposal_id"] != data["items"][0]["proposal_id"]
    finally:
        clear_auth_override()


# ==============================================================================
# 5. Listing: Invalid status rejected (400)
# ==============================================================================
@pytest.mark.asyncio
async def test_invalid_status_rejected(async_client: AsyncClient, user_1: User):
    override_auth(user_1)
    try:
        resp = await async_client.get("/api/v1/actions?status=invalid_status_xyz")
        assert resp.status_code == 400
        assert "Invalid status filter" in resp.json()["detail"]
    finally:
        clear_auth_override()


# ==============================================================================
# 6. Retrieval: Get action by ID (PK or proposal_id)
# ==============================================================================
@pytest.mark.asyncio
async def test_get_action_by_id(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-get-test",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Get Test"},
        reason="Get Test"
    )

    override_auth(user_1)
    try:
        # Get by UUID PK
        resp_pk = await async_client.get(f"/api/v1/actions/{prop.id}")
        assert resp_pk.status_code == 200
        assert resp_pk.json()["id"] == str(prop.id)
        assert resp_pk.json()["proposal_id"] == "prop-get-test"

        # Get by proposal_id string
        resp_str = await async_client.get("/api/v1/actions/prop-get-test")
        assert resp_str.status_code == 200
        assert resp_str.json()["id"] == str(prop.id)
    finally:
        clear_auth_override()


# ==============================================================================
# 7. Retrieval: Cross-user action not visible (404)
# ==============================================================================
@pytest.mark.asyncio
async def test_cross_user_action_not_visible(async_client: AsyncClient, user_1: User, user_2: User, db_session: AsyncSession):
    space2, conv2, msg2 = await setup_test_conversation(user_2, db_session)

    prop2 = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-u2-secret-2",
        user_id=user_2.id,
        space_id=space2.id,
        conversation_id=conv2.id,
        message_id=msg2.id,
        action_type="create_goal",
        parameters={"description": "Secret Goal"},
        reason="Private"
    )

    override_auth(user_1)
    try:
        resp = await async_client.get(f"/api/v1/actions/{prop2.id}")
        assert resp.status_code == 404
    finally:
        clear_auth_override()


# ==============================================================================
# 8. Retrieval: Cross-space filtering with unauthorized space returns 404
# ==============================================================================
@pytest.mark.asyncio
async def test_cross_space_action_not_visible(async_client: AsyncClient, user_1: User, user_2: User, db_session: AsyncSession):
    space_u2, _, _ = await setup_test_conversation(user_2, db_session)

    override_auth(user_1)
    try:
        # User 1 tries querying User 2's space_id
        resp = await async_client.get(f"/api/v1/actions?space_id={space_u2.id}")
        assert resp.status_code == 404
        assert "Space not found or unauthorized" in resp.json()["detail"]
    finally:
        clear_auth_override()


# ==============================================================================
# 9. Rejection: Pending action can be rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_pending_action_can_be_rejected(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-reject-pending",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Pending to Reject"},
        reason="Reject test",
        status="pending"
    )

    override_auth(user_1)
    try:
        resp = await async_client.post(f"/api/v1/actions/{prop.id}/reject")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rejected"

        await db_session.refresh(prop)
        assert prop.status == "rejected"
    finally:
        clear_auth_override()


# ==============================================================================
# 10. Rejection: Failed action can be rejected
# ==============================================================================
@pytest.mark.asyncio
async def test_failed_action_can_be_rejected(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-reject-failed",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Failed to Reject"},
        reason="Reject test",
        status="failed"
    )

    override_auth(user_1)
    try:
        resp = await async_client.post(f"/api/v1/actions/{prop.id}/reject")
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

        await db_session.refresh(prop)
        assert prop.status == "rejected"
    finally:
        clear_auth_override()


# ==============================================================================
# 11. Rejection: Executed action cannot be rejected (400)
# ==============================================================================
@pytest.mark.asyncio
async def test_executed_action_cannot_be_rejected(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-reject-executed",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Executed Cannot Reject"},
        reason="Reject test",
        status="executed"
    )

    override_auth(user_1)
    try:
        resp = await async_client.post(f"/api/v1/actions/{prop.id}/reject")
        assert resp.status_code == 400
        assert "Executed action proposals cannot be rejected" in resp.json()["detail"]

        await db_session.refresh(prop)
        assert prop.status == "executed"
    finally:
        clear_auth_override()


# ==============================================================================
# 12. Rejection: Rejected action is terminal & idempotent
# ==============================================================================
@pytest.mark.asyncio
async def test_rejected_action_is_terminal(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-reject-terminal",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Already Rejected"},
        reason="Terminal test",
        status="rejected"
    )

    override_auth(user_1)
    try:
        # Repeating rejection returns 200 with status=rejected (idempotent)
        resp = await async_client.post(f"/api/v1/actions/{prop.id}/reject")
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

        # Attempting execution is forbidden
        exec_resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-reject-terminal"}
        )
        assert exec_resp.status_code == 200
        assert exec_resp.json()["status"] == "rejected"
        assert exec_resp.json()["success"] is False
    finally:
        clear_auth_override()


# ==============================================================================
# 13. Rejection: Concurrent rejection is safe
# ==============================================================================
@pytest.mark.asyncio
async def test_concurrent_rejection_is_safe(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-concurrent-reject",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Concurrent Reject Goal"},
        reason="Concurrency",
        status="pending"
    )

    override_auth(user_1)
    try:
        task1 = async_client.post(f"/api/v1/actions/{prop.id}/reject")
        task2 = async_client.post(f"/api/v1/actions/{prop.id}/reject")

        resp1, resp2 = await asyncio.gather(task1, task2)
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json()["status"] == "rejected"
        assert resp2.json()["status"] == "rejected"

        await db_session.refresh(prop)
        assert prop.status == "rejected"
    finally:
        clear_auth_override()


# ==============================================================================
# 14. Compatibility: Existing execute endpoint still works
# ==============================================================================
@pytest.mark.asyncio
async def test_existing_execute_endpoint_still_works(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-compat-exec",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Compatibility Test Goal"},
        reason="Testing backward compat",
        status="pending"
    )

    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(msg.id), "proposal_id": "prop-compat-exec"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["status"] == "executed"
        assert data["target_id"] is not None

        # Verify Goal created in DB
        stmt = select(Goal).where(Goal.id == uuid.UUID(data["target_id"]))
        res = await db_session.execute(stmt)
        created_goal = res.scalar_one_or_none()
        assert created_goal is not None
        assert created_goal.description == "Compatibility Test Goal"
    finally:
        clear_auth_override()


# ==============================================================================
# 15. Security: Client cannot modify action parameters on query or execution
# ==============================================================================
@pytest.mark.asyncio
async def test_client_cannot_modify_action_parameters(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv, msg = await setup_test_conversation(user_1, db_session)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-tamper-test",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Original Safe Goal"},
        reason="Original safe reason",
        status="pending"
    )

    override_auth(user_1)
    try:
        # Rejection ignores any client payload
        resp = await async_client.post(
            f"/api/v1/actions/{prop.id}/reject",
            json={"action_type": "drop_table", "parameters": {"description": "Injected"}}
        )
        assert resp.status_code == 200
        assert resp.json()["action_type"] == "create_goal"
        assert resp.json()["parameters"] == {"description": "Original Safe Goal"}
    finally:
        clear_auth_override()
