import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from core.config import settings
from orchestrator.agents.context_gatherer import gather_context_node
from orchestrator.state import AgentState
from models.core import Space, Project, Goal
from models.memory import Memory
from datetime import datetime

import pytest_asyncio

USER_1_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
USER_2_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session
        await session.rollback()
        # Clean up created entities for isolation
        from sqlalchemy import text
        await session.execute(text("DELETE FROM memories"))
        await session.execute(text("DELETE FROM goals"))
        await session.execute(text("DELETE FROM projects"))
        await session.execute(text("DELETE FROM spaces"))
        await session.commit()

async def create_space(db: AsyncSession, user_id: uuid.UUID, name: str) -> Space:
    s = Space(id=uuid.uuid4(), user_id=user_id, name=name)
    db.add(s)
    await db.commit()
    return s

async def create_project(db: AsyncSession, space_id: uuid.UUID, name: str, status="active") -> Project:
    p = Project(id=uuid.uuid4(), space_id=space_id, name=name, status=status)
    db.add(p)
    await db.commit()
    return p

async def create_goal(db: AsyncSession, user_id: uuid.UUID, desc: str, project_id=None, status="active") -> Goal:
    g = Goal(id=uuid.uuid4(), user_id=user_id, project_id=project_id, description=desc, status=status)
    db.add(g)
    await db.commit()
    return g

async def create_memory(db: AsyncSession, user_id: uuid.UUID, content: str, status="active") -> Memory:
    m = Memory(id=uuid.uuid4(), user_id=user_id, memory_type="core", content=content, status=status)
    db.add(m)
    await db.commit()
    return m

from models.orchestrator import Objective
async def create_objective(db: AsyncSession, user_id: uuid.UUID) -> Objective:
    obj = Objective(id=uuid.uuid4(), user_id=user_id, raw_input="Test")
    db.add(obj)
    await db.commit()
    return obj

def build_state(user_id: uuid.UUID, space_id: uuid.UUID, objective_id: uuid.UUID) -> AgentState:
    return {
        "user_id": str(user_id),
        "space_id": str(space_id),
        "objective_id": str(objective_id),
        "conversation_id": str(uuid.uuid4()),
        "raw_query": "Test",
        "chat_history": [],
        "workspace_context": {},
        "planner_output": None,
        "research_tasks": [],
        "research_results": [],
        "critic_output": None,
        "workflow_iteration": 1,
        "total_research_tasks": 0,
        "workflow_status": "running",
        "final_synthesis": "",
        "citations": []
    }

@pytest.mark.asyncio
async def test_a_correct_space(db_session: AsyncSession):
    s1 = await create_space(db_session, USER_1_ID, "Space A")
    s2 = await create_space(db_session, USER_1_ID, "Space B")
    obj = await create_objective(db_session, USER_1_ID)

    state = build_state(USER_1_ID, s1.id, obj.id)
    config = {"configurable": {"db": db_session}}
    
    res = await gather_context_node(state, config)
    ctx = res["workspace_context"]
    assert ctx["space"] is not None
    assert ctx["space"]["name"] == "Space A"

@pytest.mark.asyncio
async def test_b_goal_retrieval(db_session: AsyncSession):
    s1 = await create_space(db_session, USER_1_ID, "Space A")
    
    # Active global goal
    await create_goal(db_session, USER_1_ID, "Active Global Goal")
    # Inactive global goal
    await create_goal(db_session, USER_1_ID, "Inactive Global Goal", status="archived")
    obj = await create_objective(db_session, USER_1_ID)

    state = build_state(USER_1_ID, s1.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})
    
    goals = res["workspace_context"]["goals"]
    assert len(goals) == 1
    assert goals[0]["description"] == "Active Global Goal"

@pytest.mark.asyncio
async def test_c_project_retrieval(db_session: AsyncSession):
    s1 = await create_space(db_session, USER_1_ID, "Space A")
    
    await create_project(db_session, s1.id, "Active Proj")
    await create_project(db_session, s1.id, "Archived Proj", status="archived")
    obj = await create_objective(db_session, USER_1_ID)
    
    state = build_state(USER_1_ID, s1.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})
    
    projs = res["workspace_context"]["projects"]
    assert len(projs) == 1
    assert projs[0]["name"] == "Active Proj"

@pytest.mark.asyncio
async def test_d_memory_bound(db_session: AsyncSession):
    s1 = await create_space(db_session, USER_1_ID, "Space A")
    
    for i in range(20):
        await create_memory(db_session, USER_1_ID, f"Memory {i}")
        
    obj = await create_objective(db_session, USER_1_ID)
    state = build_state(USER_1_ID, s1.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})
    
    mems = res["workspace_context"]["memories"]
    assert len(mems) == 15 # Bound limit is 15

@pytest.mark.asyncio
async def test_e_empty_workspace(db_session: AsyncSession):
    s1 = await create_space(db_session, USER_1_ID, "Space A")
    obj = await create_objective(db_session, USER_1_ID)
    
    state = build_state(USER_1_ID, s1.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})
    
    ctx = res["workspace_context"]
    assert ctx["space"]["name"] == "Space A"
    assert ctx["goals"] == []
    assert ctx["projects"] == []
    assert ctx["memories"] == []

@pytest.mark.asyncio
async def test_f_cross_space_isolation(db_session: AsyncSession):
    # User A has Space A with Proj A and Goal A
    # User A has Space B with Proj B and Goal B
    sA = await create_space(db_session, USER_1_ID, "Space A")
    pA = await create_project(db_session, sA.id, "Proj A")
    gA = await create_goal(db_session, USER_1_ID, "Goal A", project_id=pA.id)
    
    sB = await create_space(db_session, USER_1_ID, "Space B")
    pB = await create_project(db_session, sB.id, "Proj B")
    gB = await create_goal(db_session, USER_1_ID, "Goal B", project_id=pB.id)
    
    obj = await create_objective(db_session, USER_1_ID)

    # Gather for Space A
    state = build_state(USER_1_ID, sA.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})
    
    ctx = res["workspace_context"]
    assert len(ctx["projects"]) == 1
    assert ctx["projects"][0]["name"] == "Proj A"
    
    assert len(ctx["goals"]) == 1
    assert ctx["goals"][0]["description"] == "Goal A"
    
@pytest.mark.asyncio
async def test_g_cross_user_isolation(db_session: AsyncSession):
    # User 1 tries to access User 2's space
    s2 = await create_space(db_session, USER_2_ID, "Space 2")
    obj = await create_objective(db_session, USER_1_ID)
    
    state = build_state(USER_1_ID, s2.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})
    
    assert res["workspace_context"]["space"] is None

@pytest.mark.asyncio
async def test_h_serialization(db_session: AsyncSession):
    s1 = await create_space(db_session, USER_1_ID, "Space A")
    await create_project(db_session, s1.id, "Proj A")
    await create_memory(db_session, USER_1_ID, "Mem A")
    obj = await create_objective(db_session, USER_1_ID)
    
    state = build_state(USER_1_ID, s1.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})
    
    ctx = res["workspace_context"]
    # Verify pure dicts/lists, no ORM instances
    assert isinstance(ctx["space"], dict)
    assert isinstance(ctx["projects"], list)
    assert isinstance(ctx["projects"][0], dict)
    assert isinstance(ctx["memories"], list)
    assert isinstance(ctx["memories"][0], dict)
    assert "status" in ctx["projects"][0]

@pytest.mark.asyncio
async def test_i_telemetry_and_safe_summary(db_session: AsyncSession):
    s1 = await create_space(db_session, USER_1_ID, "Space A")
    await create_project(db_session, s1.id, "Proj A")
    await create_goal(db_session, USER_1_ID, "Goal A")
    await create_memory(db_session, USER_1_ID, "Mem A")
    obj = await create_objective(db_session, USER_1_ID)
    
    state = build_state(USER_1_ID, s1.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})
    
    # Check safe summary in state
    summary = res["workspace_summary"]
    assert summary["goals_count"] == 1
    assert summary["projects_count"] == 1
    assert summary["memories_count"] == 1
    assert "Mem A" not in str(summary) # Ensures memory content isn't in summary
    
    # Check DB for AgentRun
    from sqlalchemy import select
    from models.orchestrator import AgentRun, WorkflowStep
    
    stmt = select(AgentRun).where(AgentRun.agent_type == "context_gatherer")
    db_res = await db_session.execute(stmt)
    run = db_res.scalars().first()
    
    assert run is not None
    assert run.status == "completed"
    assert run.output_summary["goals_count"] == 1
    
    stmt_step = select(WorkflowStep).where(WorkflowStep.id == run.workflow_step_id)
    step_res = await db_session.execute(stmt_step)
    step = step_res.scalars().first()
    
    assert step is not None
    assert step.intent_type == "context_gathering"
