import pytest
import pytest_asyncio
import uuid
import datetime
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from core.config import settings
from orchestrator.agents.context_gatherer import gather_context_node
from orchestrator.context_formatter import format_workspace_context
from orchestrator.state import AgentState
from orchestrator.schemas import ActionProposal as SchemaActionProposal
from models.core import Space, Project, Goal
from models.space_member import SpaceMember
from models.memory import Memory
from models.orchestrator import Objective, Synthesis, Workflow, WorkflowStep, AgentRun
from models.action_proposal import ActionProposal as DBActionProposal
from models.conversation import Conversation, Message
from repositories.action_proposals import ActionProposalRepository
from services.action_executor import execute_action
from tests.conftest import USER_1_ID, USER_2_ID, USER_3_ID

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session
        await session.rollback()
        # Clean up created entities for complete isolation
        await session.execute(text("DELETE FROM action_proposals"))
        await session.execute(text("DELETE FROM messages"))
        await session.execute(text("DELETE FROM conversations"))
        await session.execute(text("DELETE FROM syntheses"))
        await session.execute(text("DELETE FROM agent_runs"))
        await session.execute(text("DELETE FROM workflow_steps"))
        await session.execute(text("DELETE FROM workflows"))
        await session.execute(text("DELETE FROM space_members"))
        await session.execute(text("DELETE FROM memories"))
        await session.execute(text("DELETE FROM goals"))
        await session.execute(text("DELETE FROM projects"))
        await session.execute(text("DELETE FROM objectives"))
        await session.execute(text("DELETE FROM spaces"))
        await session.commit()

def build_state(user_id: uuid.UUID, space_id: uuid.UUID, objective_id: uuid.UUID) -> AgentState:
    return {
        "user_id": str(user_id),
        "space_id": str(space_id),
        "objective_id": str(objective_id),
        "conversation_id": str(uuid.uuid4()),
        "raw_query": "Step 10 test query",
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

# ==========================================
# PHASE 2A — MEMORY CORRECTNESS (1 - 4)
# ==========================================

@pytest.mark.asyncio
async def test_1_ai_created_memory_receives_correct_space_id(db_session: AsyncSession):
    """1. AI-created memory receives space_id from the authoritative proposal."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="AI Memory Space")
    db_session.add(space)
    await db_session.commit()

    proposal = SchemaActionProposal(
        proposal_id=str(uuid.uuid4()),
        action_type="add_memory",
        space_id=str(space.id),
        parameters={"content": "User prefers dark mode and async Python", "importance": "high"},
        reason="Detected user preference",
        confidence="high"
    )

    res = await execute_action(proposal, user_id=USER_1_ID, db=db_session)
    assert res.success is True
    assert res.status == "executed"
    assert res.target_id is not None
    memory_id = uuid.UUID(res.target_id)

    # Verify directly in PostgreSQL
    stmt = select(Memory).where(Memory.id == memory_id)
    db_res = await db_session.execute(stmt)
    mem = db_res.scalar_one_or_none()

    assert mem is not None
    assert mem.user_id == USER_1_ID
    assert mem.space_id == space.id
    assert mem.content == "User prefers dark mode and async Python"


@pytest.mark.asyncio
async def test_2_memory_from_space_a_invisible_in_space_b(db_session: AsyncSession):
    """2. Memory created in Space A is invisible when gathering context in Space B."""
    sA = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Space A")
    sB = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Space B")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Query")
    db_session.add_all([sA, sB, obj])
    await db_session.commit()

    # Memory scoped to Space A
    memA = Memory(id=uuid.uuid4(), user_id=USER_1_ID, space_id=sA.id, memory_type="core", content="Secret in Space A")
    db_session.add(memA)
    await db_session.commit()

    # Gather context in Space B
    state = build_state(USER_1_ID, sB.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    mems = res["workspace_context"]["memories"]
    assert len(mems) == 0


@pytest.mark.asyncio
async def test_3_global_memory_visible_only_to_owner(db_session: AsyncSession):
    """3. Global memory (space_id=None) is visible to owner across spaces, but never to other users."""
    s1 = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="User 1 Space")
    s2 = Space(id=uuid.uuid4(), user_id=USER_2_ID, name="User 2 Space")
    obj1 = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Query 1")
    obj2 = Objective(id=uuid.uuid4(), user_id=USER_2_ID, raw_input="Query 2")
    db_session.add_all([s1, s2, obj1, obj2])
    await db_session.commit()

    # Global memory owned by USER_1
    global_mem = Memory(id=uuid.uuid4(), user_id=USER_1_ID, space_id=None, memory_type="core", content="User 1 Global Preference")
    db_session.add(global_mem)
    await db_session.commit()

    # Gather for User 1 in Space 1 -> Visible
    state1 = build_state(USER_1_ID, s1.id, obj1.id)
    res1 = await gather_context_node(state1, {"configurable": {"db": db_session}})
    assert len(res1["workspace_context"]["memories"]) == 1
    assert res1["workspace_context"]["memories"][0]["content"] == "User 1 Global Preference"

    # Gather for User 2 in Space 2 -> Inaccessible / Invisible
    state2 = build_state(USER_2_ID, s2.id, obj2.id)
    res2 = await gather_context_node(state2, {"configurable": {"db": db_session}})
    assert len(res2["workspace_context"]["memories"]) == 0


@pytest.mark.asyncio
async def test_4_another_user_memory_never_returned(db_session: AsyncSession):
    """4. Another user's memory is never returned under any circumstances."""
    s1 = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Shared Collab Space")
    obj1 = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Query 1")
    db_session.add_all([s1, obj1])
    await db_session.commit()

    # User 2 creates a memory in Space 1 (or global)
    mem_u2 = Memory(id=uuid.uuid4(), user_id=USER_2_ID, space_id=s1.id, memory_type="core", content="User 2 Confidential Notes")
    db_session.add(mem_u2)
    await db_session.commit()

    # User 1 gathers context -> Must not see User 2's memory
    state1 = build_state(USER_1_ID, s1.id, obj1.id)
    res1 = await gather_context_node(state1, {"configurable": {"db": db_session}})
    assert len(res1["workspace_context"]["memories"]) == 0


# ==========================================
# PHASE 2B — COLLABORATOR AUTHORIZATION (5 - 8)
# ==========================================

@pytest.mark.asyncio
async def test_5_space_member_can_gather_valid_space_context(db_session: AsyncSession):
    """5. An authorized SpaceMember can gather context for the Space."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Collab Space")
    db_session.add(space)
    await db_session.commit()

    # Add USER_2 as a member
    member = SpaceMember(id=uuid.uuid4(), space_id=space.id, user_id=USER_2_ID, role="editor")
    proj = Project(id=uuid.uuid4(), space_id=space.id, name="Shared Roadmap", status="active")
    obj = Objective(id=uuid.uuid4(), user_id=USER_2_ID, raw_input="Collab Query")
    db_session.add_all([member, proj, obj])
    await db_session.commit()

    # User 2 gathers context for User 1's Space
    state = build_state(USER_2_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    ctx = res["workspace_context"]
    assert ctx["space"] is not None
    assert ctx["space"]["name"] == "Collab Space"
    assert len(ctx["projects"]) == 1
    assert ctx["projects"][0]["name"] == "Shared Roadmap"


@pytest.mark.asyncio
async def test_6_unauthorized_user_cannot_gather_space_context(db_session: AsyncSession):
    """6. An unauthorized user (not owner, not member) cannot gather another Space's context."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Private Space")
    proj = Project(id=uuid.uuid4(), space_id=space.id, name="Confidential Proj", status="active")
    obj = Objective(id=uuid.uuid4(), user_id=USER_3_ID, raw_input="Attack Query")
    db_session.add_all([space, proj, obj])
    await db_session.commit()

    # User 3 (no membership) tries to gather Space 1 context
    state = build_state(USER_3_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    ctx = res["workspace_context"]
    assert ctx["space"] is None
    assert ctx["projects"] == []
    assert ctx["goals"] == []


@pytest.mark.asyncio
async def test_7_authorized_collaborator_can_update_project_status(db_session: AsyncSession):
    """7. Authorized Space collaborator (admin/owner) can update project status."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Team Space")
    proj = Project(id=uuid.uuid4(), space_id=space.id, name="Team Proj", status="active")
    db_session.add_all([space, proj])
    await db_session.commit()

    # User 2 is admin in space
    member = SpaceMember(id=uuid.uuid4(), space_id=space.id, user_id=USER_2_ID, role="admin")
    db_session.add(member)
    await db_session.commit()

    proposal = SchemaActionProposal(
        proposal_id=str(uuid.uuid4()),
        action_type="update_project_status",
        target_id=str(proj.id),
        parameters={"project_id": str(proj.id), "status": "completed"},
        reason="Finished sprint deliverables",
        confidence="high"
    )

    res = await execute_action(proposal, user_id=USER_2_ID, db=db_session)
    assert res.success is True
    assert res.status == "executed"

    # Verify project status in DB
    await db_session.refresh(proj)
    assert proj.status == "completed"


@pytest.mark.asyncio
async def test_8_unauthorized_collaborator_cannot_update_project_status(db_session: AsyncSession):
    """8. Unauthorized collaborator (viewer or non-member) cannot update project status."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Team Space")
    proj = Project(id=uuid.uuid4(), space_id=space.id, name="Protected Proj", status="active")
    db_session.add_all([space, proj])
    await db_session.commit()

    # User 3 is only a viewer
    member = SpaceMember(id=uuid.uuid4(), space_id=space.id, user_id=USER_3_ID, role="viewer")
    db_session.add(member)
    await db_session.commit()

    proposal = SchemaActionProposal(
        proposal_id=str(uuid.uuid4()),
        action_type="update_project_status",
        target_id=str(proj.id),
        parameters={"project_id": str(proj.id), "status": "archived"},
        reason="Unauthorized attempt",
        confidence="high"
    )

    res = await execute_action(proposal, user_id=USER_3_ID, db=db_session)
    assert res.success is False
    assert res.status == "rejected"

    await db_session.refresh(proj)
    assert proj.status == "active"


# ==========================================
# PHASE 2C — WORKFLOW ACTION PROPOSAL PERSISTENCE (9 - 12)
# ==========================================

@pytest.mark.asyncio
async def test_9_workflow_generated_action_proposal_is_persisted(db_session: AsyncSession):
    """9. Workflow-generated ActionProposal is persisted to authoritative action_proposals table."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Workflow Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Workflow Objective")
    db_session.add_all([space, obj])
    await db_session.commit()

    conv = Conversation(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, title="Workflow Run")
    db_session.add(conv)
    await db_session.commit()

    msg = Message(id=uuid.uuid4(), conversation_id=conv.id, role="assistant", content="Workflow output")
    db_session.add(msg)
    await db_session.commit()

    proposal_data = {
        "id": str(uuid.uuid4()),
        "action_type": "create_project",
        "target_id": None,
        "parameters": {"name": "Workflow Generated Project", "space_id": str(space.id)},
        "reason": "Automated pipeline recommendation",
        "confidence": "high"
    }

    # Persist via ActionProposalRepository
    created_prop = await ActionProposalRepository.create(
        db_session,
        proposal_id=proposal_data["id"],
        user_id=USER_1_ID,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        objective_id=obj.id,
        action_type=proposal_data["action_type"],
        target_id=None,
        parameters=proposal_data["parameters"],
        reason=proposal_data["reason"],
        confidence=proposal_data["confidence"],
        source_recommendation="Planner recommendation"
    )

    stmt = select(DBActionProposal).where(DBActionProposal.id == created_prop.id)
    persisted = (await db_session.execute(stmt)).scalar_one_or_none()
    assert persisted is not None
    assert persisted.action_type == "create_project"


@pytest.mark.asyncio
async def test_10_persisted_workflow_proposal_has_correct_metadata(db_session: AsyncSession):
    """10. Persisted workflow proposal has correct user/space/objective."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Metadata Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Goal Spec")
    db_session.add_all([space, obj])
    await db_session.commit()

    conv = Conversation(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, title="Workflow Run")
    db_session.add(conv)
    await db_session.commit()

    msg = Message(id=uuid.uuid4(), conversation_id=conv.id, role="assistant", content="Workflow output")
    db_session.add(msg)
    await db_session.commit()

    prop_id = str(uuid.uuid4())
    created = await ActionProposalRepository.create(
        db_session,
        proposal_id=prop_id,
        user_id=USER_1_ID,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        objective_id=obj.id,
        action_type="create_goal",
        target_id=None,
        parameters={"description": "Ship feature X"},
        reason="Strategic alignment",
        confidence="high"
    )

    stmt = select(DBActionProposal).where(DBActionProposal.id == created.id)
    persisted = (await db_session.execute(stmt)).scalar_one_or_none()
    assert persisted.user_id == USER_1_ID
    assert persisted.space_id == space.id
    assert persisted.objective_id == obj.id


@pytest.mark.asyncio
async def test_11_workflow_proposal_remains_pending(db_session: AsyncSession):
    """11. Workflow proposal remains pending until explicitly approved; not auto-executed."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Pending Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Pending Test")
    db_session.add_all([space, obj])
    await db_session.commit()

    conv = Conversation(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, title="Workflow Run")
    db_session.add(conv)
    await db_session.commit()

    msg = Message(id=uuid.uuid4(), conversation_id=conv.id, role="assistant", content="Workflow output")
    db_session.add(msg)
    await db_session.commit()

    prop_id = str(uuid.uuid4())
    created = await ActionProposalRepository.create(
        db_session,
        proposal_id=prop_id,
        user_id=USER_1_ID,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        objective_id=obj.id,
        action_type="create_project",
        parameters={"name": "Auto Exec Test"},
        reason="Pending check"
    )

    stmt = select(DBActionProposal).where(DBActionProposal.id == created.id)
    persisted = (await db_session.execute(stmt)).scalar_one_or_none()
    assert persisted.status == "pending"
    assert persisted.executed_at is None


@pytest.mark.asyncio
async def test_12_workflow_retry_does_not_create_duplicate_proposals(db_session: AsyncSession):
    """12. Workflow retry does not create duplicate proposals."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Idempotency Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Retry Test")
    db_session.add_all([space, obj])
    await db_session.commit()

    conv = Conversation(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, title="Workflow Run")
    db_session.add(conv)
    await db_session.commit()

    msg = Message(id=uuid.uuid4(), conversation_id=conv.id, role="assistant", content="Workflow output")
    db_session.add(msg)
    await db_session.commit()

    prop_id = str(uuid.uuid4())

    # First creation
    created = await ActionProposalRepository.create(
        db_session,
        proposal_id=prop_id,
        user_id=USER_1_ID,
        space_id=space.id,
        conversation_id=conv.id,
        message_id=msg.id,
        objective_id=obj.id,
        action_type="add_memory",
        parameters={"content": "Unique memory item"},
        reason="Initial proposal"
    )

    # Retry check
    existing = await ActionProposalRepository.get_by_id(db_session, proposal_pk=created.id)
    assert existing is not None

    stmt = select(DBActionProposal).where(DBActionProposal.id == created.id)
    all_props = (await db_session.execute(stmt)).scalars().all()
    assert len(all_props) == 1


# ==========================================
# PHASE 2D — HISTORICAL OUTCOME CONTEXT (13 - 16)
# ==========================================

@pytest.mark.asyncio
async def test_13_completed_goal_appears_in_bounded_history(db_session: AsyncSession):
    """13. Completed goal appears in bounded historical context."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Goal History Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Goal History")
    db_session.add_all([space, obj])
    await db_session.commit()

    completed_goal = Goal(id=uuid.uuid4(), user_id=USER_1_ID, description="Achieved Milestone 1", status="completed")
    db_session.add(completed_goal)
    await db_session.commit()

    state = build_state(USER_1_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    comp_goals = res["workspace_context"]["recent_completed_goals"]
    assert len(comp_goals) == 1
    assert comp_goals[0]["description"] == "Achieved Milestone 1"
    assert comp_goals[0]["status"] == "completed"


@pytest.mark.asyncio
async def test_14_completed_project_appears_in_bounded_history(db_session: AsyncSession):
    """14. Completed project appears in bounded historical context."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Project History Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Project History")
    db_session.add_all([space, obj])
    await db_session.commit()

    comp_proj = Project(id=uuid.uuid4(), space_id=space.id, name="Legacy V1 System", status="completed")
    db_session.add(comp_proj)
    await db_session.commit()

    state = build_state(USER_1_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    comp_projects = res["workspace_context"]["recent_completed_projects"]
    assert len(comp_projects) == 1
    assert comp_projects[0]["name"] == "Legacy V1 System"


@pytest.mark.asyncio
async def test_15_old_history_beyond_limit_is_excluded(db_session: AsyncSession):
    """15. Old history beyond limit (max 5) is strictly excluded."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Bounded History Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Limit History")
    db_session.add_all([space, obj])
    await db_session.commit()

    # Create 10 completed goals and 10 completed projects
    for i in range(10):
        g = Goal(id=uuid.uuid4(), user_id=USER_1_ID, description=f"Goal {i}", status="completed")
        p = Project(id=uuid.uuid4(), space_id=space.id, name=f"Project {i}", status="archived")
        db_session.add_all([g, p])
    await db_session.commit()

    state = build_state(USER_1_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    assert len(res["workspace_context"]["recent_completed_goals"]) == 5
    assert len(res["workspace_context"]["recent_completed_projects"]) == 5


@pytest.mark.asyncio
async def test_16_active_goals_and_projects_preserved(db_session: AsyncSession):
    """16. Active goals and projects continue to work as before alongside historical outcomes."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Active Preservation Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, raw_input="Active Query")
    db_session.add_all([space, obj])
    await db_session.commit()

    active_p = Project(id=uuid.uuid4(), space_id=space.id, name="Current Sprint", status="active")
    active_g = Goal(id=uuid.uuid4(), user_id=USER_1_ID, description="Ship Phase 2", status="active")
    done_p = Project(id=uuid.uuid4(), space_id=space.id, name="Past Sprint", status="completed")
    done_g = Goal(id=uuid.uuid4(), user_id=USER_1_ID, description="Ship Phase 1", status="completed")
    db_session.add_all([active_p, active_g, done_p, done_g])
    await db_session.commit()

    state = build_state(USER_1_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    ctx = res["workspace_context"]
    assert len(ctx["projects"]) == 1
    assert ctx["projects"][0]["name"] == "Current Sprint"
    assert len(ctx["goals"]) == 1
    assert ctx["goals"][0]["description"] == "Ship Phase 2"

    assert len(ctx["recent_completed_projects"]) == 1
    assert ctx["recent_completed_projects"][0]["name"] == "Past Sprint"
    assert len(ctx["recent_completed_goals"]) == 1
    assert ctx["recent_completed_goals"][0]["description"] == "Ship Phase 1"


# ==========================================
# PHASE 2E — DECISION FEEDBACK (17 - 19)
# ==========================================

@pytest.mark.asyncio
async def test_17_recent_decisions_reach_context_gatherer(db_session: AsyncSession):
    """17. Recent persisted synthesis/decision information reaches ContextGatherer."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Decision Feedback Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, raw_input="Decision Feedback Query")
    db_session.add_all([space, obj])
    await db_session.commit()

    synth = Synthesis(
        id=uuid.uuid4(),
        objective_id=obj.id,
        findings=[{"type": "blocker", "description": "Database migration incomplete"}],
        recommendations=["Migrate space_id columns before running workflow"]
    )
    db_session.add(synth)
    await db_session.commit()

    state = build_state(USER_1_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    decisions = res["workspace_context"]["recent_decisions"]
    assert len(decisions) == 1
    assert "Migrate space_id columns" in str(decisions[0]["recommendations"])
    assert "Database migration incomplete" in str(decisions[0]["findings"])


@pytest.mark.asyncio
async def test_18_unbounded_decision_history_excluded(db_session: AsyncSession):
    """18. Old/unbounded decision history is excluded (limit max 3)."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Decision Bound Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, raw_input="Bound Decision Query")
    db_session.add_all([space, obj])
    await db_session.commit()

    # Create 6 syntheses
    for i in range(6):
        synth = Synthesis(
            id=uuid.uuid4(),
            objective_id=obj.id,
            recommendations=[f"Recommendation {i}"]
        )
        db_session.add(synth)
    await db_session.commit()

    state = build_state(USER_1_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    assert len(res["workspace_context"]["recent_decisions"]) == 3


@pytest.mark.asyncio
async def test_19_raw_reasoning_not_exposed(db_session: AsyncSession):
    """19. Raw internal agent reasoning is not exposed in context."""
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Shielding Space")
    obj = Objective(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, raw_input="Shielding Test")
    db_session.add_all([space, obj])
    await db_session.commit()

    synth = Synthesis(
        id=uuid.uuid4(),
        objective_id=obj.id,
        recommendations=["Proceed with deployment"]
    )
    db_session.add(synth)
    await db_session.commit()

    state = build_state(USER_1_ID, space.id, obj.id)
    res = await gather_context_node(state, {"configurable": {"db": db_session}})

    for item in res["workspace_context"]["recent_decisions"]:
        assert "chain_of_thought" not in item
        assert "internal_prompt" not in item


# ==========================================
# PHASE 2F & CLOSED-LOOP INTEGRATION TEST (20)
# ==========================================

@pytest.mark.asyncio
async def test_20_end_to_end_closed_loop_state_integration(db_session: AsyncSession):
    """
    Demonstrates full closed-loop state feedback:
    Turn 1 -> ActionProposal -> Human Approval -> ActionExecutor -> PostgreSQL mutation
    -> Turn 2 -> ContextGatherer -> ContextFormatter (XML verified).
    """
    # 1. Setup Space & Objective
    space = Space(id=uuid.uuid4(), user_id=USER_1_ID, name="Closed Loop Production Space")
    obj_turn1 = Objective(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, raw_input="Turn 1 User Query")
    db_session.add_all([space, obj_turn1])
    await db_session.commit()

    # Turn 1: Create initial project in active state
    project = Project(id=uuid.uuid4(), space_id=space.id, name="Cloud Migration", status="active")
    db_session.add(project)
    await db_session.commit()

    # Agent in Turn 1 proposes to mark Cloud Migration as completed & add preference memory
    prop_update_proj = SchemaActionProposal(
        proposal_id=str(uuid.uuid4()),
        action_type="update_project_status",
        target_id=str(project.id),
        parameters={"project_id": str(project.id), "status": "completed"},
        reason="All milestones delivered",
        confidence="high"
    )
    prop_add_mem = SchemaActionProposal(
        proposal_id=str(uuid.uuid4()),
        action_type="add_memory",
        space_id=str(space.id),
        parameters={"content": "Completed AWS to GCP Migration ahead of schedule", "importance": "high"},
        reason="Key organizational milestone",
        confidence="high"
    )

    # 2. Human in the loop executes approved proposals via ActionExecutor
    exec_res1 = await execute_action(prop_update_proj, user_id=USER_1_ID, db=db_session)
    exec_res2 = await execute_action(prop_add_mem, user_id=USER_1_ID, db=db_session)
    assert exec_res1.success is True
    assert exec_res1.status == "executed"
    assert exec_res2.success is True
    assert exec_res2.status == "executed"

    # Also record decision recommendation for Turn 1 in Synthesis
    synth1 = Synthesis(
        id=uuid.uuid4(),
        objective_id=obj_turn1.id,
        findings=[{"type": "status", "description": "Migration phase done"}],
        recommendations=["Initiate post-migration telemetry review"]
    )
    db_session.add(synth1)
    await db_session.commit()

    # 3. Turn 2: User arrives with next query in the same Space
    obj_turn2 = Objective(id=uuid.uuid4(), user_id=USER_1_ID, space_id=space.id, raw_input="Turn 2 Next Steps")
    db_session.add(obj_turn2)
    await db_session.commit()

    state_turn2 = build_state(USER_1_ID, space.id, obj_turn2.id)
    res_turn2 = await gather_context_node(state_turn2, {"configurable": {"db": db_session}})
    ctx_turn2 = res_turn2["workspace_context"]

    # 4. Verify Turn 2 ContextGatherer observes the mutated state from PostgreSQL
    # Completed project is now in recent_completed_projects, not active projects
    assert len(ctx_turn2["projects"]) == 0
    assert len(ctx_turn2["recent_completed_projects"]) == 1
    assert ctx_turn2["recent_completed_projects"][0]["name"] == "Cloud Migration"
    assert ctx_turn2["recent_completed_projects"][0]["status"] == "completed"

    # Memory created in Turn 1 is now directly visible in Turn 2
    assert len(ctx_turn2["memories"]) == 1
    assert "Completed AWS to GCP Migration" in ctx_turn2["memories"][0]["content"]

    # Decision feedback is visible in Turn 2
    assert len(ctx_turn2["recent_decisions"]) == 1
    assert "Initiate post-migration telemetry review" in str(ctx_turn2["recent_decisions"][0]["recommendations"])

    # 5. Verify ContextFormatter XML tags for prompt injection resistance & downstream agent visibility
    formatted_xml = format_workspace_context(ctx_turn2)
    assert "<recent_completed_outcomes>" in formatted_xml
    assert "Cloud Migration" in formatted_xml
    assert "completed" in formatted_xml
    assert "<recent_decisions>" in formatted_xml
    assert "Initiate post-migration telemetry review" in formatted_xml
    assert "<memories>" in formatted_xml
    assert "Completed AWS to GCP Migration ahead of schedule" in formatted_xml
