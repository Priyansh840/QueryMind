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

    return space, conv


# ==============================================================================
# 1. Authoritative ActionProposal row created and JSONB snapshot preserved
# ==============================================================================
@pytest.mark.asyncio
async def test_action_proposal_authoritative_persistence_and_snapshot(db_session: AsyncSession, user_1: User):
    space, conv = await setup_test_conversation(user_1, db_session)

    asst_msg_id = uuid.uuid4()
    proposals_data = [
        {
            "proposal_id": "prop-persist-1",
            "action_type": "create_goal",
            "parameters": {"description": "Persistent Goal 1"},
            "reason": "Test reason 1",
            "confidence": "high"
        },
        {
            "proposal_id": "prop-persist-2",
            "action_type": "create_project",
            "parameters": {"space_id": str(space.id), "name": "Persistent Project 2"},
            "reason": "Test reason 2",
            "confidence": "medium"
        }
    ]

    # Save Message with JSONB snapshot
    asst_msg = Message(
        id=asst_msg_id,
        conversation_id=conv.id,
        role="assistant",
        content="Response with 2 proposals",
        metadata_json={
            "objective_id": str(uuid.uuid4()),
            "action_proposals": proposals_data
        }
    )
    db_session.add(asst_msg)

    # Save authoritative rows
    for p in proposals_data:
        await ActionProposalRepository.create(
            db_session,
            proposal_id=p["proposal_id"],
            user_id=user_1.id,
            space_id=space.id,
            conversation_id=conv.id,
            message_id=asst_msg_id,
            action_type=p["action_type"],
            parameters=p["parameters"],
            reason=p["reason"],
            confidence=p["confidence"],
            status="pending",
            auto_commit=False
        )
    await db_session.commit()

    # Verify JSONB snapshot
    saved_msg = await db_session.get(Message, asst_msg_id)
    assert saved_msg is not None
    assert len(saved_msg.metadata_json["action_proposals"]) == 2

    # Verify authoritative database rows
    stmt = select(ActionProposal).where(ActionProposal.message_id == asst_msg_id)
    res = await db_session.execute(stmt)
    rows = list(res.scalars().all())
    assert len(rows) == 2
    assert {r.proposal_id for r in rows} == {"prop-persist-1", "prop-persist-2"}
    assert all(r.status == "pending" for r in rows)


# ==============================================================================
# 2. Approval API uses authoritative table and updates lifecycle atomically
# ==============================================================================
@pytest.mark.asyncio
async def test_table_is_authoritative_for_approval(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv = await setup_test_conversation(user_1, db_session)

    asst_msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Here is a proposal",
        metadata_json={"action_proposals": []}  # empty JSONB snapshot to prove lookup is from table
    )
    db_session.add(asst_msg)

    # Create authoritative row
    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-auth-lookup",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=asst_msg.id,
        action_type="create_goal",
        parameters={"description": "Authoritative Table Goal"},
        reason="Verify lookup comes from table",
        confidence="high",
        status="pending"
    )

    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg.id), "proposal_id": "prop-auth-lookup"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["status"] == "executed"
        target_id = data["target_id"]

        # Verify proposal row in table updated
        await db_session.refresh(prop)
        assert prop.status == "executed"
        assert prop.executed_target_id == target_id
        assert prop.approved_by_user_id == user_1.id
        assert prop.executed_at is not None
    finally:
        clear_auth_override()


# ==============================================================================
# 3. Executed proposal cannot be executed twice (terminal state)
# ==============================================================================
@pytest.mark.asyncio
async def test_executed_proposal_cannot_execute_twice(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv = await setup_test_conversation(user_1, db_session)

    asst_msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Proposal",
        metadata_json={}
    )
    db_session.add(asst_msg)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-once-only",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=asst_msg.id,
        action_type="create_goal",
        parameters={"description": "Execute Once Only Goal"},
        reason="Terminal test",
        confidence="high",
        status="pending"
    )

    override_auth(user_1)
    try:
        # First execution
        resp1 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg.id), "proposal_id": "prop-once-only"}
        )
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "executed"

        # Second execution
        resp2 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg.id), "proposal_id": "prop-once-only"}
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "already_executed"

        # DB contains only 1 goal
        stmt = select(Goal).where(Goal.description == "Execute Once Only Goal", Goal.user_id == user_1.id)
        res = await db_session.execute(stmt)
        assert len(res.scalars().all()) == 1
    finally:
        clear_auth_override()


# ==============================================================================
# 4. Rejected proposal cannot be executed
# ==============================================================================
@pytest.mark.asyncio
async def test_rejected_proposal_cannot_execute(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv = await setup_test_conversation(user_1, db_session)

    asst_msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Rejected proposal",
        metadata_json={}
    )
    db_session.add(asst_msg)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-rejected-test",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=asst_msg.id,
        action_type="create_goal",
        parameters={"description": "Forbidden Goal"},
        reason="Rejection test",
        status="rejected"
    )

    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg.id), "proposal_id": "prop-rejected-test"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"
        assert resp.json()["success"] is False

        # No goal created
        stmt = select(Goal).where(Goal.description == "Forbidden Goal")
        res = await db_session.execute(stmt)
        assert len(res.scalars().all()) == 0
    finally:
        clear_auth_override()


# ==============================================================================
# 5. Failed proposal can safely be retried
# ==============================================================================
@pytest.mark.asyncio
async def test_failed_proposal_can_retry(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv = await setup_test_conversation(user_1, db_session)
    missing_proj_id = str(uuid.uuid4())

    asst_msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Retry proposal",
        metadata_json={}
    )
    db_session.add(asst_msg)

    prop = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-retry-table",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=asst_msg.id,
        action_type="update_project_status",
        target_id=missing_proj_id,
        parameters={"project_id": missing_proj_id, "status": "completed"},
        reason="Retry test",
        status="pending"
    )

    override_auth(user_1)
    try:
        # First execution fails due to missing project
        resp1 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg.id), "proposal_id": "prop-retry-table"}
        )
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "rejected"

        await db_session.refresh(prop)
        assert prop.status == "failed"
        assert prop.error_code == "target_not_found"

        # Now create the missing project
        new_proj = Project(id=uuid.UUID(missing_proj_id), space_id=space.id, name="Created Project", status="active")
        db_session.add(new_proj)
        await db_session.commit()

        # Retry execution succeeds
        resp2 = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg.id), "proposal_id": "prop-retry-table"}
        )
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "executed"
        assert resp2.json()["success"] is True

        await db_session.refresh(prop)
        assert prop.status == "executed"
    finally:
        clear_auth_override()


# ==============================================================================
# 6. Concurrent approval locks row and executes exactly once
# ==============================================================================
@pytest.mark.asyncio
async def test_concurrent_approval_executes_exactly_once(async_client: AsyncClient, user_1: User, db_session: AsyncSession):
    space, conv = await setup_test_conversation(user_1, db_session)

    asst_msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Concurrent proposal",
        metadata_json={}
    )
    db_session.add(asst_msg)

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-concurrent-table",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=asst_msg.id,
        action_type="create_goal",
        parameters={"description": "Table Concurrent Race Goal"},
        reason="Concurrency test",
        confidence="high",
        status="pending"
    )

    override_auth(user_1)
    try:
        task1 = async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg.id), "proposal_id": "prop-concurrent-table"}
        )
        task2 = async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg.id), "proposal_id": "prop-concurrent-table"}
        )

        resp1, resp2 = await asyncio.gather(task1, task2)
        statuses = [resp1.json()["status"], resp2.json()["status"]]

        assert "executed" in statuses
        assert "already_executed" in statuses

        stmt = select(Goal).where(Goal.description == "Table Concurrent Race Goal", Goal.user_id == user_1.id)
        res = await db_session.execute(stmt)
        assert len(res.scalars().all()) == 1
    finally:
        clear_auth_override()


# ==============================================================================
# 7. Cross-user proposal access is rejected (404)
# ==============================================================================
@pytest.mark.asyncio
async def test_cross_user_proposal_rejected(async_client: AsyncClient, user_1: User, user_2: User, db_session: AsyncSession):
    space_u2, conv_u2 = await setup_test_conversation(user_2, db_session)

    asst_msg_u2 = Message(
        id=uuid.uuid4(),
        conversation_id=conv_u2.id,
        role="assistant",
        content="User 2 proposal",
        metadata_json={}
    )
    db_session.add(asst_msg_u2)

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-u2-secret",
        user_id=user_2.id,
        space_id=space_u2.id,
        conversation_id=conv_u2.id,
        message_id=asst_msg_u2.id,
        action_type="create_goal",
        parameters={"description": "User 2 Secret Goal"},
        reason="Private",
        status="pending"
    )

    # User 1 tries to execute User 2's proposal
    override_auth(user_1)
    try:
        resp = await async_client.post(
            "/api/v1/actions/execute",
            json={"message_id": str(asst_msg_u2.id), "proposal_id": "prop-u2-secret"}
        )
        assert resp.status_code in (403, 404)
    finally:
        clear_auth_override()
