import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

import pytest_asyncio
from core.config import settings
from tests.conftest import USER_1_ID, USER_2_ID
from models.user import User
from models.core import Space
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal
from repositories.action_proposals import ActionProposalRepository


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


async def setup_test_hierarchy(user_id: uuid.UUID, db: AsyncSession):
    space = Space(id=uuid.uuid4(), user_id=user_id, name="Test Space")
    db.add(space)
    await db.commit()

    conv = Conversation(id=uuid.uuid4(), user_id=user_id, space_id=space.id, title="Test Conversation")
    db.add(conv)
    await db.commit()

    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Test Message Content",
        metadata_json={"action_proposals": []}
    )
    db.add(msg)
    await db.commit()

    return space, conv, msg


# ==============================================================================
# 1. Create and get by ID
# ==============================================================================
@pytest.mark.asyncio
async def test_repo_create_and_get_by_id(db_session: AsyncSession, user_1: User):
    space, conv, msg = await setup_test_hierarchy(user_1.id, db_session)

    proposal = await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-repo-1",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Repo Test Goal"},
        reason="Testing repo creation",
        confidence="high"
    )

    assert proposal.id is not None
    assert proposal.status == "pending"

    fetched = await ActionProposalRepository.get_by_id(
        db_session,
        proposal_pk=proposal.id,
        user_id=user_1.id
    )
    assert fetched is not None
    assert fetched.proposal_id == "prop-repo-1"


# ==============================================================================
# 2. Get by (message_id, proposal_id) and multi-tenant isolation
# ==============================================================================
@pytest.mark.asyncio
async def test_repo_get_by_message_and_proposal_and_tenant_isolation(db_session: AsyncSession, user_1: User, user_2: User):
    space, conv, msg = await setup_test_hierarchy(user_1.id, db_session)

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-isolated",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_project",
        parameters={"name": "User 1 Project"},
        reason="Isolation test"
    )

    # Owner can retrieve
    found = await ActionProposalRepository.get_by_message_and_proposal(
        db_session,
        message_id=msg.id,
        proposal_id="prop-isolated",
        user_id=user_1.id
    )
    assert found is not None

    # Other user CANNOT retrieve (returns None)
    other_user_found = await ActionProposalRepository.get_by_message_and_proposal(
        db_session,
        message_id=msg.id,
        proposal_id="prop-isolated",
        user_id=user_2.id
    )
    assert other_user_found is None


# ==============================================================================
# 3. List proposals by user, space, and status
# ==============================================================================
@pytest.mark.asyncio
async def test_repo_list_proposals_filters(db_session: AsyncSession, user_1: User):
    space, conv, msg = await setup_test_hierarchy(user_1.id, db_session)

    # Create 1 pending and 1 executed
    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-list-pending",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Pending Goal"},
        reason="List test",
        status="pending"
    )

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-list-executed",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Executed Goal"},
        reason="List test",
        status="executed"
    )

    # List all by space
    all_space_props, total_all = await ActionProposalRepository.list_proposals(
        db_session,
        user_id=user_1.id,
        space_id=space.id
    )
    assert len(all_space_props) == 2
    assert total_all == 2

    # Filter by status="pending"
    pending_only, total_pending = await ActionProposalRepository.list_proposals(
        db_session,
        user_id=user_1.id,
        space_id=space.id,
        status="pending"
    )
    assert len(pending_only) == 1
    assert total_pending == 1
    assert pending_only[0].proposal_id == "prop-list-pending"


# ==============================================================================
# 4. Row-level lock get_for_update inside transaction
# ==============================================================================
@pytest.mark.asyncio
async def test_repo_get_for_update(db_session: AsyncSession, user_1: User):
    space, conv, msg = await setup_test_hierarchy(user_1.id, db_session)

    await ActionProposalRepository.create(
        db_session,
        proposal_id="prop-lock-test",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="add_memory",
        parameters={"content": "Lock test note"},
        reason="Locking test"
    )

    locked = await ActionProposalRepository.get_for_update(
        db_session,
        message_id=msg.id,
        proposal_id="prop-lock-test",
        user_id=user_1.id
    )
    assert locked is not None
    assert locked.proposal_id == "prop-lock-test"
