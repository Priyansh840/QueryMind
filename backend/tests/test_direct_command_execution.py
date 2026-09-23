import pytest
import pytest_asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select

from core.config import settings
from models.core import Goal, Space
from orchestrator.schemas import ActionProposal as ActionProposalSchema
from services.action_executor import execute_action
from tests.conftest import USER_1_ID


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


@pytest.mark.asyncio
async def test_direct_command_creates_goal_and_outcome(db_session: AsyncSession):
    # 1. Setup space
    space_id = uuid.uuid4()
    space = Space(id=space_id, name="Test Space", user_id=USER_1_ID)
    db_session.add(space)
    await db_session.commit()

    # 2. Emulate an AI proposal generated from direct command
    proposal = ActionProposalSchema(
        proposal_id=f"prop-{uuid.uuid4().hex[:6]}",
        action_type="create_goal",
        space_id=str(space_id),
        parameters={
            "title": "Launch AI Beta",
            "priority": "high",
            "space_id": str(space_id),
            "target_date": "2026-10-01",
        },
        reason="Direct command: user requested to make a new goal",
        confidence="high",
    )

    # 3. Execute action directly via executor (as conversations.py does for direct commands)
    exec_res = await execute_action(
        proposal,
        user_id=USER_1_ID,
        db=db_session,
        auto_commit=False,
    )

    assert exec_res.success is True
    assert exec_res.status == "executed"
    assert exec_res.target_id is not None

    # 4. Check that Goal exists in DB with expected parameters
    stmt = select(Goal).where(Goal.id == uuid.UUID(exec_res.target_id))
    res = await db_session.execute(stmt)
    created_goal = res.scalar_one_or_none()

    assert created_goal is not None
    assert created_goal.description == "Launch AI Beta"
    assert created_goal.status == "active"
    assert created_goal.space_id == space_id
    assert created_goal.user_id == USER_1_ID


@pytest.mark.asyncio
async def test_direct_command_creates_space(db_session: AsyncSession):
    # Direct command to create a space
    proposal = ActionProposalSchema(
        proposal_id=f"prop-{uuid.uuid4().hex[:6]}",
        action_type="create_space",
        parameters={
            "name": "Robotics Engineering",
            "description": "Space for autonomous robotics and control systems",
            "icon": "🤖",
            "color": "#6366F1",
        },
        reason="Direct command: user asked to create a space",
        confidence="high",
    )

    exec_res = await execute_action(
        proposal,
        user_id=USER_1_ID,
        db=db_session,
        auto_commit=False,
    )

    assert exec_res.success is True
    assert exec_res.status == "executed"
    assert exec_res.target_id is not None

    stmt = select(Space).where(Space.id == uuid.UUID(exec_res.target_id))
    res = await db_session.execute(stmt)
    created_space = res.scalar_one_or_none()

    assert created_space is not None
    assert created_space.name == "Robotics Engineering"
    assert created_space.user_id == USER_1_ID
