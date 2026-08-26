import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

import pytest_asyncio
from core.config import settings
from tests.conftest import USER_1_ID, USER_2_ID
from models.user import User
from models.core import Space
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal


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
# 1. Valid proposal persistence & default status
# ==============================================================================
@pytest.mark.asyncio
async def test_valid_action_proposal_persistence(db_session: AsyncSession, user_1: User):
    space, conv, msg = await setup_test_hierarchy(user_1.id, db_session)

    proposal = ActionProposal(
        id=uuid.uuid4(),
        proposal_id="prop-goal-1",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Test Goal in Postgres"},
        reason="Test reason",
        source_recommendation="Test source",
        confidence="high"
    )
    db_session.add(proposal)
    await db_session.commit()

    # Query back
    saved = await db_session.get(ActionProposal, proposal.id)
    assert saved is not None
    assert saved.proposal_id == "prop-goal-1"
    assert saved.status == "pending"
    assert saved.action_type == "create_goal"
    assert saved.parameters == {"description": "Test Goal in Postgres"}
    assert saved.approved_by_user_id is None
    assert saved.executed_at is None


# ==============================================================================
# 2. Status constraint validation
# ==============================================================================
@pytest.mark.asyncio
async def test_action_proposal_status_constraint(db_session: AsyncSession, user_1: User):
    space, conv, msg = await setup_test_hierarchy(user_1.id, db_session)

    # Valid status values work
    for valid_status in ["pending", "approved", "executed", "rejected", "failed"]:
        prop = ActionProposal(
            id=uuid.uuid4(),
            proposal_id=f"prop-{valid_status}",
            user_id=user_1.id,
            space_id=space.id,
            conversation_id=conv.id,
            message_id=msg.id,
            action_type="create_goal",
            parameters={"description": "Test Status"},
            reason="Testing valid status",
            status=valid_status
        )
        db_session.add(prop)
        await db_session.commit()
        assert prop.status == valid_status

    # Invalid status value fails CheckConstraint
    invalid_prop = ActionProposal(
        id=uuid.uuid4(),
        proposal_id="prop-invalid-status",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={},
        reason="Testing invalid status",
        status="bogus_status"
    )
    db_session.add(invalid_prop)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


# ==============================================================================
# 3. Unique (message_id, proposal_id) constraint
# ==============================================================================
@pytest.mark.asyncio
async def test_action_proposal_unique_message_proposal_constraint(db_session: AsyncSession, user_1: User):
    space, conv, msg = await setup_test_hierarchy(user_1.id, db_session)

    prop1 = ActionProposal(
        id=uuid.uuid4(),
        proposal_id="prop-duplicate",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Original Proposal"},
        reason="Original reason"
    )
    db_session.add(prop1)
    await db_session.commit()

    # Attempt second proposal with same (message_id, proposal_id)
    prop2 = ActionProposal(
        id=uuid.uuid4(),
        proposal_id="prop-duplicate",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Duplicate Proposal"},
        reason="Duplicate reason"
    )
    db_session.add(prop2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


# ==============================================================================
# 4. Foreign key relationships and cascade
# ==============================================================================
@pytest.mark.asyncio
async def test_action_proposal_relationships_and_cascade(db_session: AsyncSession, user_1: User):
    space, conv, msg = await setup_test_hierarchy(user_1.id, db_session)

    prop = ActionProposal(
        id=uuid.uuid4(),
        proposal_id="prop-cascade",
        user_id=user_1.id,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        action_type="create_goal",
        parameters={"description": "Cascade Test"},
        reason="Cascade reason"
    )
    db_session.add(prop)
    await db_session.commit()

    # Deleting message cascades and deletes the action proposal
    await db_session.delete(msg)
    await db_session.commit()
    db_session.expire_all()

    stmt = select(ActionProposal).where(ActionProposal.id == prop.id)
    res = await db_session.execute(stmt)
    deleted_prop = res.scalar_one_or_none()
    assert deleted_prop is None

