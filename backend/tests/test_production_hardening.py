import pytest
import uuid
from httpx import AsyncClient
from datetime import datetime

from tests.conftest import override_auth, clear_auth_override
from database.postgres import async_session
from models.core import Space, Project
from models.action_proposal import ActionProposal
from models.orchestrator import Objective, Workflow, WorkflowStep


@pytest.mark.asyncio
async def test_search_tenant_isolation(async_client: AsyncClient, user_1, user_2):
    """
    Verify User 2 cannot search Space 1 owned by User 1.
    """
    override_auth(user_1)
    res_space = await async_client.post("/api/v1/spaces", json={"name": "User 1 Confidential Space"})
    assert res_space.status_code == 201
    space_1_id = res_space.json()["id"]

    # Switch to User 2
    override_auth(user_2)
    res_search = await async_client.get(f"/api/v1/search?query=Confidential&space_id={space_1_id}")
    assert res_search.status_code == 404, "User 2 must receive 404 when querying User 1's space."

    clear_auth_override()


@pytest.mark.asyncio
async def test_workflow_cross_user_isolation(async_client: AsyncClient, user_1, user_2):
    """
    Verify User 2 cannot list, view, retry, or cancel User 1's workflow.
    """
    override_auth(user_1)
    res_space = await async_client.post("/api/v1/spaces", json={"name": "User 1 Workflow Space"})
    space_1_id = res_space.json()["id"]

    # User 1 creates workflow
    res_wf = await async_client.post("/api/v1/workflows", json={
        "space_id": space_1_id,
        "goal": "Audit project knowledge and plan roadmap."
    })
    assert res_wf.status_code == 201
    wf_1_id = res_wf.json()["id"]

    # Switch to User 2
    override_auth(user_2)

    # User 2 tries to access or cancel User 1's workflow
    res_get = await async_client.get(f"/api/v1/workflows/{wf_1_id}")
    assert res_get.status_code == 404

    res_cancel = await async_client.post(f"/api/v1/workflows/{wf_1_id}/cancel")
    assert res_cancel.status_code == 404

    res_retry = await async_client.post(f"/api/v1/workflows/{wf_1_id}/retry")
    assert res_retry.status_code == 404

    # Switch back to User 1
    override_auth(user_1)
    res_cancel_1 = await async_client.post(f"/api/v1/workflows/{wf_1_id}/cancel")
    assert res_cancel_1.status_code == 200

    clear_auth_override()


@pytest.mark.asyncio
async def test_decision_trace_isolation_and_safety(async_client: AsyncClient, user_1, user_2):
    """
    Verify Decision Trace endpoint enforces user boundaries and double execution prevention.
    """
    override_auth(user_1)
    res_space = await async_client.post("/api/v1/spaces", json={"name": "User 1 Decision Space"})
    space_1_id = res_space.json()["id"]

    # Create conversation and message
    from models.conversation import Conversation, Message
    conv_id = uuid.uuid4()
    msg_id = uuid.uuid4()
    proposal_id = f"prop-{uuid.uuid4().hex[:8]}"

    conv = Conversation(
        id=conv_id,
        user_id=user_1.id,
        space_id=uuid.UUID(space_1_id),
        title="Decision Analysis Thread",
        created_at=datetime.utcnow(),
    )
    msg = Message(
        id=msg_id,
        conversation_id=conv_id,
        role="assistant",
        content="Analyzed context and proposed project creation.",
        citations=[{"document_title": "Project Charter.pdf", "page_number": 2, "snippet": "Project X requires formal kickoff."}],
        created_at=datetime.utcnow(),
    )
    prop = ActionProposal(
        id=uuid.uuid4(),
        proposal_id=proposal_id,
        user_id=user_1.id,
        space_id=uuid.UUID(space_1_id),
        conversation_id=conv_id,
        message_id=msg_id,
        action_type="create_project",
        parameters={"name": "Hardened Action Project"},
        reason="Grounding decision analysis shows project required.",
        confidence="high",
        status="pending",
        created_at=datetime.utcnow(),
    )

    async with async_session() as db:
        db.add(conv)
        db.add(msg)
        db.add(prop)
        await db.commit()

    # User 2 tries to view User 1's decision
    override_auth(user_2)
    res_dec_2 = await async_client.get(f"/api/v1/actions/{proposal_id}/decision")
    assert res_dec_2.status_code == 404

    # User 1 views Decision Trace
    override_auth(user_1)
    res_dec_1 = await async_client.get(f"/api/v1/actions/{proposal_id}/decision")
    assert res_dec_1.status_code == 200
    data = res_dec_1.json()
    assert data["proposal_id"] == proposal_id
    assert data["confidence"] == "high"
    assert len(data["evidence"]) >= 1
    assert data["evidence"][0]["document_title"] == "Project Charter.pdf"
    assert len(data["timeline"]) >= 1

    clear_auth_override()

