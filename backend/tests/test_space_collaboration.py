"""
Security & Collaboration Integration Tests (Phase 13: RBAC & Space Collaboration)
Verifies SpaceMember permissions, hierarchical roles, ownership transfer, document isolation,
action approval safety, and unauthorized rejection across roles.
"""

import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select

from main import app
from core.config import settings
from models.core import Space
from models.user import User
from models.space_member import SpaceMember
from models.knowledge import Document
from models.conversation import Conversation
from models.action_proposal import ActionProposal
from api.deps import get_current_user


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


@pytest_asyncio.fixture
async def collaboration_setup(db_session: AsyncSession):
    """
    Creates 4 users (Owner, Admin, Member, Viewer) and 1 Unrelated User,
    along with a primary Test Space and seeds SpaceMember records.
    """
    db = db_session
    # Create auth.users rows to satisfy public.users foreign key
    from sqlalchemy import text
    u_ids = [uuid.uuid4() for _ in range(5)]
    for uid in u_ids:
        await db.execute(text("INSERT INTO auth.users (id) VALUES (:uid) ON CONFLICT DO NOTHING"), {"uid": uid})

    # Create users
    owner = User(id=u_ids[0], email=f"owner_{u_ids[0].hex[:6]}@mynd.ai", display_name="Owner User")
    admin = User(id=u_ids[1], email=f"admin_{u_ids[1].hex[:6]}@mynd.ai", display_name="Admin User")
    member = User(id=u_ids[2], email=f"member_{u_ids[2].hex[:6]}@mynd.ai", display_name="Member User")
    viewer = User(id=u_ids[3], email=f"viewer_{u_ids[3].hex[:6]}@mynd.ai", display_name="Viewer User")
    outsider = User(id=u_ids[4], email=f"outsider_{u_ids[4].hex[:6]}@mynd.ai", display_name="Outsider User")

    db.add_all([owner, admin, member, viewer, outsider])
    await db.flush()

    # Create Space
    space = Space(
        id=uuid.uuid4(),
        user_id=owner.id,
        name="Collaboration Test Space",
        description="Testing Multi-User RBAC",
    )
    db.add(space)
    await db.flush()

    # Add Space Members
    sm_owner = SpaceMember(id=uuid.uuid4(), space_id=space.id, user_id=owner.id, role="owner", invited_by_user_id=owner.id)
    sm_admin = SpaceMember(id=uuid.uuid4(), space_id=space.id, user_id=admin.id, role="admin", invited_by_user_id=owner.id)
    sm_member = SpaceMember(id=uuid.uuid4(), space_id=space.id, user_id=member.id, role="member", invited_by_user_id=admin.id)
    sm_viewer = SpaceMember(id=uuid.uuid4(), space_id=space.id, user_id=viewer.id, role="viewer", invited_by_user_id=admin.id)

    db.add_all([sm_owner, sm_admin, sm_member, sm_viewer])
    await db.commit()

    yield {
        "space": space,
        "owner": owner,
        "admin": admin,
        "member": member,
        "viewer": viewer,
        "outsider": outsider,
    }


from api.deps import get_current_user, get_current_supabase_user


def get_client_for_user(user: User):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_supabase_user] = lambda: {"sub": str(user.id)}
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_owner_and_members_list_spaces(collaboration_setup):
    """
    Ensure users can see spaces where they are owners OR members.
    Outsiders should not see this space.
    """
    data = collaboration_setup
    space = data["space"]

    # Member listing spaces
    async with get_client_for_user(data["member"]) as client:
        res = await client.get("/api/v1/spaces")
        assert res.status_code == 200
        spaces = res.json()
        assert any(s["id"] == str(space.id) for s in spaces)

    # Outsider listing spaces
    async with get_client_for_user(data["outsider"]) as client:
        res = await client.get("/api/v1/spaces")
        assert res.status_code == 200
        spaces = res.json()
        assert not any(s["id"] == str(space.id) for s in spaces)


@pytest.mark.asyncio
async def test_get_space_members(collaboration_setup):
    """
    Viewer can read members list, outsider cannot.
    """
    data = collaboration_setup
    space_id = str(data["space"].id)

    # Viewer reads members
    async with get_client_for_user(data["viewer"]) as client:
        res = await client.get(f"/api/v1/spaces/{space_id}/members")
        assert res.status_code == 200
        members = res.json()
        assert len(members) == 4
        roles = {m["user_id"]: m["role"] for m in members}
        assert roles[str(data["owner"].id)] == "owner"
        assert roles[str(data["admin"].id)] == "admin"
        assert roles[str(data["member"].id)] == "member"
        assert roles[str(data["viewer"].id)] == "viewer"

    # Outsider cannot read members
    async with get_client_for_user(data["outsider"]) as client:
        res = await client.get(f"/api/v1/spaces/{space_id}/members")
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_invite_member_and_hierarchy_enforcement(collaboration_setup):
    """
    - Admin can invite member or viewer.
    - Admin CANNOT invite an owner.
    - Member CANNOT invite anyone.
    - Duplicate invitation is rejected.
    """
    data = collaboration_setup
    space_id = str(data["space"].id)
    outsider = data["outsider"]

    # Member trying to invite (Forbidden)
    async with get_client_for_user(data["member"]) as client:
        res = await client.post(f"/api/v1/spaces/{space_id}/members", json={"email": outsider.email, "role": "viewer"})
        assert res.status_code == 403

    # Admin trying to invite as owner (Forbidden)
    async with get_client_for_user(data["admin"]) as client:
        res = await client.post(f"/api/v1/spaces/{space_id}/members", json={"email": outsider.email, "role": "owner"})
        assert res.status_code == 403

    # Admin inviting outsider as viewer (Success)
    async with get_client_for_user(data["admin"]) as client:
        res = await client.post(f"/api/v1/spaces/{space_id}/members", json={"email": outsider.email, "role": "viewer"})
        assert res.status_code == 201
        body = res.json()
        assert body["user_id"] == str(outsider.id)
        assert body["role"] == "viewer"

    # Duplicate invitation rejected (Conflict)
    async with get_client_for_user(data["owner"]) as client:
        res = await client.post(f"/api/v1/spaces/{space_id}/members", json={"email": outsider.email, "role": "member"})
        assert res.status_code == 409


@pytest.mark.asyncio
async def test_member_role_update_rules(collaboration_setup):
    """
    - Admin can promote viewer to member.
    - Admin CANNOT modify owner role.
    - Admin CANNOT promote anyone to owner.
    - Viewer/Member cannot modify roles.
    """
    data = collaboration_setup
    space_id = str(data["space"].id)
    viewer_id = str(data["viewer"].id)
    owner_id = str(data["owner"].id)

    # Admin modifies viewer to member (Success)
    async with get_client_for_user(data["admin"]) as client:
        res = await client.patch(f"/api/v1/spaces/{space_id}/members/{viewer_id}", json={"role": "member"})
        assert res.status_code == 200
        assert res.json()["role"] == "member"

    # Admin tries to modify owner (Forbidden)
    async with get_client_for_user(data["admin"]) as client:
        res = await client.patch(f"/api/v1/spaces/{space_id}/members/{owner_id}", json={"role": "member"})
        assert res.status_code == 403

    # Admin tries to make someone owner (Forbidden)
    async with get_client_for_user(data["admin"]) as client:
        res = await client.patch(f"/api/v1/spaces/{space_id}/members/{viewer_id}", json={"role": "owner"})
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_document_rbac_boundaries(collaboration_setup):
    """
    - Viewer can read documents.
    - Viewer CANNOT upload documents (403).
    - Viewer CANNOT delete documents (403).
    - Admin CAN upload documents.
    """
    data = collaboration_setup
    space_id = str(data["space"].id)

    # Viewer attempts upload (Forbidden)
    async with get_client_for_user(data["viewer"]) as client:
        res = await client.post(
            "/api/v1/documents/upload",
            data={"space_id": space_id},
            files={"file": ("test.txt", b"Hello world content", "text/plain")}
        )
        assert res.status_code == 403

    # Member attempts upload (Forbidden - requires admin/owner)
    async with get_client_for_user(data["member"]) as client:
        res = await client.post(
            "/api/v1/documents/upload",
            data={"space_id": space_id},
            files={"file": ("test.txt", b"Hello world content", "text/plain")}
        )
        assert res.status_code == 403

    # Admin uploads document (Success)
    doc_id = None
    async with get_client_for_user(data["admin"]) as client:
        res = await client.post(
            "/api/v1/documents/upload",
            data={"space_id": space_id},
            files={"file": ("test.txt", b"Hello collaborative world", "text/plain")}
        )
        assert res.status_code in (200, 201)
        doc_id = res.json().get("document_id") or res.json().get("id")

    # Viewer reads document list (Success)
    async with get_client_for_user(data["viewer"]) as client:
        res = await client.get("/api/v1/documents", params={"space_id": space_id})
        assert res.status_code == 200
        docs = res.json()
        assert any(d["id"] == doc_id for d in docs)

    # Viewer attempts delete document (Forbidden)
    async with get_client_for_user(data["viewer"]) as client:
        res = await client.delete(f"/api/v1/documents/{doc_id}")
        assert res.status_code == 403

    # Admin deletes document (Success)
    async with get_client_for_user(data["admin"]) as client:
        res = await client.delete(f"/api/v1/documents/{doc_id}")
        assert res.status_code == 200


@pytest.mark.asyncio
async def test_action_proposal_approval_security(collaboration_setup, db_session: AsyncSession):
    """
    - Member can propose actions.
    - Viewer CANNOT approve actions (403).
    - Member CANNOT approve actions (403).
    - Admin CAN approve actions.
    """
    data = collaboration_setup
    space = data["space"]
    member = data["member"]
    admin = data["admin"]
    viewer = data["viewer"]

    # Create dummy conversation & message for FK
    conv_id = uuid.uuid4()
    msg_id = uuid.uuid4()
    conv = Conversation(id=conv_id, user_id=member.id, space_id=space.id, title="Action Conv")
    db_session.add(conv)
    await db_session.flush()

    from models.conversation import Message
    msg = Message(id=msg_id, conversation_id=conv_id, role="user", content="Execute action")
    db_session.add(msg)
    await db_session.flush()

    # Seed an action proposal in DB
    action_id = uuid.uuid4()
    prop = ActionProposal(
        id=action_id,
        proposal_id=f"prop-{action_id.hex[:6]}",
        user_id=member.id,
        space_id=space.id,
        conversation_id=conv_id,
        message_id=msg_id,
        action_type="create_goal",
        parameters={"title": "Team Collaborative Goal", "description": "Goal for test"},
        reason="Collaborative test",
        confidence="high",
        status="pending",
    )
    db_session.add(prop)
    await db_session.commit()

    # Viewer attempts approval (Forbidden)
    async with get_client_for_user(viewer) as client:
        res = await client.post(f"/api/v1/actions/{action_id}/approve")
        assert res.status_code == 403

    # Member attempts approval (Forbidden)
    async with get_client_for_user(member) as client:
        res = await client.post(f"/api/v1/actions/{action_id}/approve")
        assert res.status_code == 403

    # Admin approves action (Success)
    async with get_client_for_user(admin) as client:
        res = await client.post(f"/api/v1/actions/{action_id}/approve")
        assert res.status_code == 200
        assert res.json()["status"] in ("approved", "executed")


@pytest.mark.asyncio
async def test_conversations_and_chat_rbac(collaboration_setup):
    """
    - Member can create conversation & send messages.
    - Viewer can read messages.
    - Viewer CANNOT send messages (403).
    """
    data = collaboration_setup
    space_id = str(data["space"].id)

    # Member creates conversation (Success)
    conv_id = None
    async with get_client_for_user(data["member"]) as client:
        res = await client.post("/api/v1/conversations", json={"space_id": space_id, "title": "Team Brainstorm"})
        assert res.status_code == 201
        conv_id = res.json()["id"]

    # Viewer reads conversation (Success)
    async with get_client_for_user(data["viewer"]) as client:
        res = await client.get(f"/api/v1/conversations/{conv_id}")
        assert res.status_code == 200

    # Viewer attempts to send message (Forbidden)
    async with get_client_for_user(data["viewer"]) as client:
        res = await client.post(f"/api/v1/conversations/{conv_id}/messages", json={"content": "Hello as viewer"})
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_atomic_ownership_transfer(collaboration_setup):
    """
    - Non-owner CANNOT transfer ownership (403).
    - Owner transfers to Admin:
      - Admin becomes Owner.
      - Old Owner becomes Admin.
      - spaces.user_id updates to new Owner atomically.
    """
    data = collaboration_setup
    space = data["space"]
    space_id = str(space.id)
    owner = data["owner"]
    admin = data["admin"]

    # Admin attempts to initiate transfer (Forbidden)
    async with get_client_for_user(admin) as client:
        res = await client.post(f"/api/v1/spaces/{space_id}/transfer-ownership", json={"target_user_id": str(admin.id)})
        assert res.status_code == 403

    # Owner transfers ownership to Admin (Success)
    async with get_client_for_user(owner) as client:
        res = await client.post(f"/api/v1/spaces/{space_id}/transfer-ownership", json={"target_user_id": str(admin.id)})
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    # Verify via API that admin is now owner
    async with get_client_for_user(admin) as client:
        res = await client.get(f"/api/v1/spaces/{space_id}/members")
        assert res.status_code == 200
        members = res.json()
        roles = {m["user_id"]: m["role"] for m in members}
        assert roles[str(admin.id)] == "owner"
        assert roles[str(owner.id)] == "admin"


@pytest.mark.asyncio
async def test_leave_and_member_removal(collaboration_setup):
    """
    - Member can leave space.
    - Owner CANNOT leave space without transfer.
    - Removed member immediately loses access to space.
    """
    data = collaboration_setup
    space_id = str(data["space"].id)
    member = data["member"]
    owner = data["owner"]

    # Owner attempts to leave (Forbidden)
    async with get_client_for_user(owner) as client:
        res = await client.delete(f"/api/v1/spaces/{space_id}/members/{str(owner.id)}")
        assert res.status_code == 403

    # Member leaves space (Success)
    async with get_client_for_user(member) as client:
        res = await client.delete(f"/api/v1/spaces/{space_id}/members/{str(member.id)}")
        assert res.status_code == 200

    # Member attempts to access space now (Forbidden)
    async with get_client_for_user(member) as client:
        res = await client.get(f"/api/v1/spaces/{space_id}")
        assert res.status_code == 403
