"""
QueryMind - Step 15: API & Backend Architecture Hygiene Test Suite
Verifies:
1. Production debug surface (/api/v1/test/*) is unreachable (404).
2. Legacy chat orchestration bypass (/api/v1/chat) is unreachable (404).
3. Deterministic workflow step identity: create_workflow steps match agent nodes with zero duplicate/orphaned steps.
4. GET /api/v1/workflows/{id} exposes authoritative Synthesis output.
5. GET /api/v1/workflows/{id} filters pending ActionProposals strictly by workflow objective lineage.
6. Goal space scoping: Goal.space_id exists, enforced in CRUD, cross-space isolation.
7. Goal space collaboration: Space collaborator with 'member' can update, 'viewer' can read, non-member denied.
8. Objective trace space authorization: Space collaborator can view trace, non-member denied.
9. Conversation-created Objective inherits conversation's space_id.
10. Alembic migration HEAD (f1a2b3c4d5e6) and dead workflow_events table dropped.
"""

import uuid
import asyncio
from datetime import datetime, timezone
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from database.postgres import async_session
from models.user import User
from models.core import Space, Project, Goal
from models.space_member import SpaceMember
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal
from models.orchestrator import Objective, Workflow, WorkflowStep, AgentRun, Synthesis
from tests.conftest import USER_1_ID, USER_2_ID, USER_3_ID, override_auth, clear_auth_override


TEST_SPACE_1 = uuid.UUID("15151515-0001-0000-0000-000000000001")
TEST_SPACE_2 = uuid.UUID("15151515-0002-0000-0000-000000000002")


@pytest_asyncio.fixture(autouse=True)
async def setup_step15_test_data():
    """Seeds users and spaces for Step 15 tests."""
    async with async_session() as db:
        # 1. Seed users
        for uid, email in [
            (USER_1_ID, "step15_owner@example.com"),
            (USER_2_ID, "step15_collab@example.com"),
            (USER_3_ID, "step15_outsider@example.com"),
        ]:
            res = await db.execute(select(User).where(User.id == uid))
            if not res.scalar_one_or_none():
                db.add(User(id=uid, email=email, hashed_password="pw"))

        # 2. Seed spaces
        res_s1 = await db.execute(select(Space).where(Space.id == TEST_SPACE_1))
        if not res_s1.scalar_one_or_none():
            db.add(Space(
                id=TEST_SPACE_1,
                user_id=USER_1_ID,
                name="Step 15 Space 1",
                is_default=True,
                created_at=datetime.now(timezone.utc),
            ))

        res_s2 = await db.execute(select(Space).where(Space.id == TEST_SPACE_2))
        if not res_s2.scalar_one_or_none():
            db.add(Space(
                id=TEST_SPACE_2,
                user_id=USER_3_ID,
                name="Step 15 Space 2",
                is_default=True,
                created_at=datetime.now(timezone.utc),
            ))

        # 3. Add USER_2 as collaborator in TEST_SPACE_1 with 'member' role
        res_sm = await db.execute(
            select(SpaceMember).where(
                SpaceMember.space_id == TEST_SPACE_1,
                SpaceMember.user_id == USER_2_ID,
            )
        )
        if not res_sm.scalar_one_or_none():
            db.add(SpaceMember(
                space_id=TEST_SPACE_1,
                user_id=USER_2_ID,
                role="member",
                created_at=datetime.now(timezone.utc),
            ))

        await db.commit()

    yield

    clear_auth_override()


@pytest.mark.asyncio
async def test_1_unauthenticated_test_router_unreachable():
    """Phase 1: Verify /api/v1/test/chat-simple is completely unmounted and unreachable (404)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp_get = await ac.get("/api/v1/test/chat-simple")
        assert resp_get.status_code == 404, f"Expected 404 for debug route, got {resp_get.status_code}"

        resp_post = await ac.post("/api/v1/test/chat-simple", json={"query": "hello"})
        assert resp_post.status_code == 404, f"Expected 404 for debug POST, got {resp_post.status_code}"


@pytest.mark.asyncio
async def test_2_legacy_chat_bypass_unreachable():
    """Phase 2: Verify legacy chat orchestration bypass /api/v1/chat is unmounted and unreachable (404)."""
    override_auth(USER_1_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/v1/chat", json={"query": "bypass test"})
        assert resp.status_code == 404, f"Expected 404 for legacy chat bypass, got {resp.status_code}"


@pytest.mark.asyncio
async def test_3_workflow_deterministic_steps_no_duplicates():
    """Phase 3: Verify create_workflow creates steps with deterministic UUID5 matching agent nodes."""
    override_auth(USER_1_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/workflows",
            json={"space_id": str(TEST_SPACE_1), "goal": "Deterministic steps telemetry test"}
        )
        assert resp.status_code == 201
        data = resp.json()

        wf_id = uuid.UUID(data["id"])
        steps = data["steps"]
        assert len(steps) == 5, f"Expected 5 planned steps, got {len(steps)}"

        # Verify deterministic IDs
        expected_step_ids = {
            1: str(uuid.uuid5(wf_id, "context_gatherer_1")),
            11: str(uuid.uuid5(wf_id, "planner_1")),
            12: str(uuid.uuid5(wf_id, "researcher_1")),
            18: str(uuid.uuid5(wf_id, "decision_1")),
            90: str(uuid.uuid5(wf_id, "synthesizer")),
        }

        for s in steps:
            order = s["step_order"]
            assert order in expected_step_ids, f"Unexpected step_order: {order}"
            assert s["id"] == expected_step_ids[order], (
                f"Step order {order} ID mismatch: expected {expected_step_ids[order]}, got {s['id']}"
            )
            assert s["status"] == "pending"


@pytest.mark.asyncio
async def test_4_workflow_synthesis_output_exposed():
    """Phase 4: Verify GET /api/v1/workflows/{id} populates authoritative synthesis findings/recommendations/evidence."""
    obj_id = uuid.uuid4()
    wf_id = uuid.uuid5(obj_id, "workflow")

    async with async_session() as db:
        objective = Objective(
            id=obj_id,
            user_id=USER_1_ID,
            space_id=TEST_SPACE_1,
            raw_input="Test goal for synthesis",
            status="completed",
            created_at=datetime.now(timezone.utc),
        )
        db.add(objective)

        workflow = Workflow(
            id=wf_id,
            objective_id=obj_id,
            space_id=TEST_SPACE_1,
            status="completed",
            created_at=datetime.now(timezone.utc),
        )
        db.add(workflow)

        synthesis = Synthesis(
            id=uuid.uuid4(),
            objective_id=obj_id,
            findings=["Finding A: System healthy", "Finding B: 100% capacity"],
            recommendations=[{"action": "create_goal", "reason": "Target reached"}],
            evidence=[{"source": "doc1", "snippet": "telemetry verified"}],
            created_at=datetime.now(timezone.utc),
        )
        db.add(synthesis)
        await db.commit()

    override_auth(USER_1_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(f"/api/v1/workflows/{wf_id}")
        assert resp.status_code == 200
        data = resp.json()

        assert data["output"] is not None, "Expected synthesis output to be populated"
        assert "Finding A: System healthy" in data["output"]["findings"]
        assert data["output"]["recommendations"][0]["action"] == "create_goal"
        assert data["output"]["evidence"][0]["source"] == "doc1"


@pytest.mark.asyncio
async def test_5_workflow_pending_actions_filtering():
    """Phase 7: Verify GET /api/v1/workflows/{id} returns ONLY ActionProposals belonging to that workflow/objective."""
    obj_a = uuid.uuid4()
    wf_a = uuid.uuid5(obj_a, "workflow")
    obj_b = uuid.uuid4()
    wf_b = uuid.uuid5(obj_b, "workflow")

    conv_id = uuid.uuid4()
    msg_id = uuid.uuid4()

    async with async_session() as db:
        # Create conversation and message to satisfy ActionProposal FKs
        conv = Conversation(id=conv_id, user_id=USER_1_ID, space_id=TEST_SPACE_1, title="Test Conv")
        db.add(conv)
        msg = Message(id=msg_id, conversation_id=conv_id, role="assistant", content="Proposals msg")
        db.add(msg)

        db.add(Objective(id=obj_a, user_id=USER_1_ID, space_id=TEST_SPACE_1, raw_input="Workflow A"))
        db.add(Workflow(id=wf_a, objective_id=obj_a, space_id=TEST_SPACE_1, status="running"))

        db.add(Objective(id=obj_b, user_id=USER_1_ID, space_id=TEST_SPACE_1, raw_input="Workflow B"))
        db.add(Workflow(id=wf_b, objective_id=obj_b, space_id=TEST_SPACE_1, status="running"))

        # Proposal for Workflow A
        prop_a = ActionProposal(
            id=uuid.uuid4(),
            proposal_id="prop-a",
            user_id=USER_1_ID,
            space_id=TEST_SPACE_1,
            conversation_id=conv_id,
            message_id=msg_id,
            objective_id=obj_a,
            action_type="create_goal",
            reason="Reason for A",
            status="pending",
        )
        db.add(prop_a)

        # Proposal for Workflow B (same space, different objective)
        prop_b = ActionProposal(
            id=uuid.uuid4(),
            proposal_id="prop-b",
            user_id=USER_1_ID,
            space_id=TEST_SPACE_1,
            conversation_id=conv_id,
            message_id=msg_id,
            objective_id=obj_b,
            action_type="update_goal_status",
            reason="Reason for B",
            status="pending",
        )
        db.add(prop_b)
        await db.commit()

    override_auth(USER_1_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp_a = await ac.get(f"/api/v1/workflows/{wf_a}")
        assert resp_a.status_code == 200
        pending_a = resp_a.json()["pending_actions"]
        proposal_ids_a = [p["proposal_id"] for p in pending_a]
        assert "prop-a" in proposal_ids_a
        assert "prop-b" not in proposal_ids_a, "Workflow A must NOT include proposals from Workflow B"

        resp_b = await ac.get(f"/api/v1/workflows/{wf_b}")
        assert resp_b.status_code == 200
        pending_b = resp_b.json()["pending_actions"]
        proposal_ids_b = [p["proposal_id"] for p in pending_b]
        assert "prop-b" in proposal_ids_b
        assert "prop-a" not in proposal_ids_b, "Workflow B must NOT include proposals from Workflow A"


@pytest.mark.asyncio
async def test_6_goal_space_scoping_creation_and_isolation():
    """Phase 5: Verify Goal space scoping, space isolation, and cross-space boundary enforcement."""
    override_auth(USER_1_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create goal in TEST_SPACE_1
        resp = await ac.post(
            "/api/v1/goals",
            json={"description": "Launch Space 1 Goal", "space_id": str(TEST_SPACE_1)}
        )
        assert resp.status_code == 201
        goal_data = resp.json()
        goal_id = goal_data["id"]
        assert goal_data["space_id"] == str(TEST_SPACE_1)

        # Creator can read it
        get_resp = await ac.get(f"/api/v1/goals/{goal_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == goal_id

    # User 3 (outsider with no access to TEST_SPACE_1) cannot read it
    override_auth(USER_3_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        outsider_get = await ac.get(f"/api/v1/goals/{goal_id}")
        assert outsider_get.status_code in (403, 404), (
            f"Expected 403/404 for outsider goal access, got {outsider_get.status_code}"
        )

        outsider_patch = await ac.patch(f"/api/v1/goals/{goal_id}", json={"status": "completed"})
        assert outsider_patch.status_code in (403, 404), (
            f"Expected 403/404 for outsider goal patch, got {outsider_patch.status_code}"
        )

        outsider_del = await ac.delete(f"/api/v1/goals/{goal_id}")
        assert outsider_del.status_code in (403, 404), (
            f"Expected 403/404 for outsider goal delete, got {outsider_del.status_code}"
        )


@pytest.mark.asyncio
async def test_7_goal_space_collaborator_access_and_roles():
    """Phase 5: Verify space collaborators can access and update goals according to their role."""
    # Create goal in TEST_SPACE_1 as owner
    override_auth(USER_1_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/goals",
            json={"description": "Collaborative Goal", "space_id": str(TEST_SPACE_1)}
        )
        assert resp.status_code == 201
        goal_id = resp.json()["id"]

    # USER_2 (collaborator with 'member' role in TEST_SPACE_1) can read and update
    override_auth(USER_2_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        collab_get = await ac.get(f"/api/v1/goals/{goal_id}")
        assert collab_get.status_code == 200
        assert collab_get.json()["id"] == goal_id

        collab_patch = await ac.patch(f"/api/v1/goals/{goal_id}", json={"status": "in_progress"})
        assert collab_patch.status_code == 200
        assert collab_patch.json()["status"] == "in_progress"

        # Demote USER_2 to viewer in DB
        async with async_session() as db:
            sm = (await db.execute(
                select(SpaceMember).where(
                    SpaceMember.space_id == TEST_SPACE_1,
                    SpaceMember.user_id == USER_2_ID
                )
            )).scalar_one()
            sm.role = "viewer"
            await db.commit()

        # Viewer can read
        viewer_get = await ac.get(f"/api/v1/goals/{goal_id}")
        assert viewer_get.status_code == 200

        # Viewer cannot update (requires 'member' role)
        viewer_patch = await ac.patch(f"/api/v1/goals/{goal_id}", json={"status": "completed"})
        assert viewer_patch.status_code in (403, 404), (
            f"Expected 403/404 for viewer goal update, got {viewer_patch.status_code}"
        )


@pytest.mark.asyncio
async def test_8_objective_trace_space_collaborator_authorization():
    """Phase 6: Verify objective trace authorization allows space collaborator and denies non-members."""
    obj_id = uuid.uuid4()
    wf_id = uuid.uuid5(obj_id, "workflow")

    async with async_session() as db:
        # Reset USER_2 to member
        sm = (await db.execute(
            select(SpaceMember).where(
                SpaceMember.space_id == TEST_SPACE_1,
                SpaceMember.user_id == USER_2_ID
            )
        )).scalar_one_or_none()
        if sm:
            sm.role = "member"
        else:
            db.add(SpaceMember(space_id=TEST_SPACE_1, user_id=USER_2_ID, role="member"))

        objective = Objective(
            id=obj_id,
            user_id=USER_1_ID,
            space_id=TEST_SPACE_1,
            raw_input="Trace authorization test objective",
            status="running",
            created_at=datetime.now(timezone.utc),
        )
        db.add(objective)

        workflow = Workflow(
            id=wf_id,
            objective_id=obj_id,
            space_id=TEST_SPACE_1,
            status="running",
            created_at=datetime.now(timezone.utc),
        )
        db.add(workflow)
        await db.commit()

    # 1. Owner (USER_1) can view trace
    override_auth(USER_1_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        owner_trace = await ac.get(f"/api/v1/objectives/{obj_id}/trace")
        assert owner_trace.status_code == 200

    # 2. Collaborator in Space 1 (USER_2) can view trace
    override_auth(USER_2_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        collab_trace = await ac.get(f"/api/v1/objectives/{obj_id}/trace")
        assert collab_trace.status_code == 200

    # 3. Outsider (USER_3) gets 403 Forbidden or 404 Not Found
    override_auth(USER_3_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        outsider_trace = await ac.get(f"/api/v1/objectives/{obj_id}/trace")
        assert outsider_trace.status_code in (403, 404)


@pytest.mark.asyncio
async def test_9_conversation_objective_inherits_space_id():
    """Phase 6: Verify conversation-created Objective inherits the conversation's space_id."""
    conv_id = uuid.uuid4()
    async with async_session() as db:
        conv = Conversation(
            id=conv_id,
            user_id=USER_1_ID,
            space_id=TEST_SPACE_1,
            title="Inheritance test conversation",
            created_at=datetime.now(timezone.utc),
        )
        db.add(conv)
        await db.commit()

    override_auth(USER_1_ID)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Posting a message creates an Objective and starts SSE
        resp = await ac.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": "Check space_id inheritance"}
        )
        # SSE stream response initiated
        assert resp.status_code == 200

    # Verify Objective in DB has space_id == TEST_SPACE_1
    async with async_session() as db:
        res = await db.execute(
            select(Objective)
            .where(Objective.user_id == USER_1_ID, Objective.raw_input == "Check space_id inheritance")
            .order_by(Objective.created_at.desc())
        )
        obj = res.scalars().first()
        assert obj is not None, "Objective was not created"
        assert obj.space_id == TEST_SPACE_1, (
            f"Expected objective.space_id to be {TEST_SPACE_1}, got {obj.space_id}"
        )


@pytest.mark.asyncio
async def test_10_migration_head_and_schema():
    """Phase 5 & 9: Verify Alembic migration is at HEAD (f1a2b3c4d5e6) and dead workflow_events table is dropped."""
    async with async_session() as db:
        # 1. Check alembic_version table
        ver_res = await db.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
        current_head = ver_res.scalar_one()
        assert current_head == "f1a2b3c4d5e6", f"Expected migration HEAD f1a2b3c4d5e6, got {current_head}"

        # 2. Check goals table has space_id column
        col_res = await db.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='goals' AND column_name='space_id'"
        ))
        col = col_res.scalar_one_or_none()
        assert col == "space_id", "goals table must contain space_id column"

        # 3. Check workflow_events table is dropped
        tbl_res = await db.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='workflow_events'"
        ))
        tbl = tbl_res.scalar_one_or_none()
        assert tbl is None, "workflow_events table must be dropped"
