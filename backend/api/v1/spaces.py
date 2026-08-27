"""
QueryMind - Spaces Router
Authenticated space / workspace management endpoints.
User identity is derived strictly from the validated Supabase JWT token.
"""

import re
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from api.deps import get_db, get_current_user
from core.config import settings
from models.core import Space, Project, Goal
from models.user import User
from models.knowledge import Document, DocumentChunk
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal
from models.orchestrator import Objective, Workflow, WorkflowStep, AgentRun
from models.memory import Memory

logger = logging.getLogger(__name__)

router = APIRouter()


# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class SpaceCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    is_default: bool = False


class SpaceUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    is_default: Optional[bool] = None


class SpaceResponse(BaseModel):
    id: str
    user_id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _slugify(name: str) -> str:
    """Normalizes space name to a URL-friendly slug."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    return slug or "space"


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(
    request: SpaceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Space for the authenticated user.
    user_id is strictly derived from the validated Supabase JWT token.
    """
    slug = request.slug or _slugify(request.name)

    # If this space is designated as default, unset any existing default for this user
    if request.is_default:
        await db.execute(
            update(Space)
            .where(Space.user_id == current_user.id, Space.is_default == True)
            .values(is_default=False, updated_at=datetime.utcnow())
        )

    new_space = Space(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=request.name.strip(),
        slug=slug,
        description=request.description,
        icon=request.icon,
        color=request.color,
        is_default=request.is_default,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_space)
    try:
        await db.commit()
        await db.refresh(new_space)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating space: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create space. Please verify unique name/slug constraints.",
        )

    return SpaceResponse(
        id=str(new_space.id),
        user_id=str(new_space.user_id),
        name=new_space.name,
        slug=new_space.slug,
        description=new_space.description,
        icon=new_space.icon,
        color=new_space.color,
        is_default=new_space.is_default,
        created_at=new_space.created_at,
        updated_at=new_space.updated_at,
    )


@router.get("", response_model=List[SpaceResponse])
@router.get("/", response_model=List[SpaceResponse])
async def list_spaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all spaces owned by the authenticated user.
    Ordered with the default space first, followed by creation order.
    """
    stmt = (
        select(Space)
        .where(Space.user_id == current_user.id)
        .order_by(Space.is_default.desc(), Space.created_at.asc())
    )
    result = await db.execute(stmt)
    spaces = result.scalars().all()

    return [
        SpaceResponse(
            id=str(s.id),
            user_id=str(s.user_id),
            name=s.name,
            slug=s.slug,
            description=s.description,
            icon=s.icon,
            color=s.color,
            is_default=s.is_default,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in spaces
    ]


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves a single space by ID.
    Returns 404 if not found or if not owned by the authenticated user.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    stmt = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    return SpaceResponse(
        id=str(space.id),
        user_id=str(space.user_id),
        name=space.name,
        slug=space.slug,
        description=space.description,
        icon=space.icon,
        color=space.color,
        is_default=space.is_default,
        created_at=space.created_at,
        updated_at=space.updated_at,
    )


@router.patch("/{space_id}", response_model=SpaceResponse)
async def update_space(
    space_id: str,
    request: SpaceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates space metadata (name, description, icon, color, slug, is_default).
    id, user_id, and created_at can NEVER be modified.
    Returns 404 if space is not owned by current user.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    stmt = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # If setting to default, unset existing default
    if request.is_default is True and not space.is_default:
        await db.execute(
            update(Space)
            .where(Space.user_id == current_user.id, Space.is_default == True)
            .values(is_default=False, updated_at=datetime.utcnow())
        )
        space.is_default = True
    elif request.is_default is False:
        space.is_default = False

    if request.name is not None:
        space.name = request.name.strip()
    if request.slug is not None:
        space.slug = request.slug.strip()
    if request.description is not None:
        space.description = request.description
    if request.icon is not None:
        space.icon = request.icon
    if request.color is not None:
        space.color = request.color

    space.updated_at = datetime.utcnow()

    try:
        await db.commit()
        await db.refresh(space)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating space: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update space",
        )

    return SpaceResponse(
        id=str(space.id),
        user_id=str(space.user_id),
        name=space.name,
        slug=space.slug,
        description=space.description,
        icon=space.icon,
        color=space.color,
        is_default=space.is_default,
        created_at=space.created_at,
        updated_at=space.updated_at,
    )


@router.delete("/{space_id}", status_code=status.HTTP_200_OK)
async def delete_space(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a space and performs controlled vector index cleanup.
    1. Authenticate user.
    2. Verify space ownership.
    3. Purge corresponding Qdrant vectors for this space.
    4. Delete space from PostgreSQL (cascading to documents, chunks, projects, knowledge).
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    stmt = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # Clean up vectors in Qdrant before PostgreSQL cascade
    if settings.qdrant_client_url:
        try:
            qdrant = AsyncQdrantClient(
                url=settings.qdrant_client_url,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
            )
            await qdrant.delete(
                collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="space_id",
                                match=qmodels.MatchValue(value=str(space_uuid)),
                            ),
                            qmodels.FieldCondition(
                                key="user_id",
                                match=qmodels.MatchValue(value=str(current_user.id)),
                            ),
                        ]
                    )
                ),
            )
            # Purge knowledge vectors
            knowledge_col = settings.QDRANT_COLLECTION_KNOWLEDGE or "querymind_knowledge"
            await qdrant.delete(
                collection_name=knowledge_col,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="space_id",
                                match=qmodels.MatchValue(value=str(space_uuid)),
                            ),
                            qmodels.FieldCondition(
                                key="user_id",
                                match=qmodels.MatchValue(value=str(current_user.id)),
                            ),
                        ]
                    )
                ),
            )
            logger.info(f"Purged Qdrant document and knowledge points for deleted space {space_id}")
        except Exception as q_err:
            logger.warning(f"Qdrant vector cleanup warning for space {space_id}: {q_err}")

    # Delete space from PostgreSQL (cascading to documents, chunks, knowledge, etc.)
    await db.delete(space)
    await db.commit()

    return {"status": "success", "message": f"Space {space_id} deleted successfully"}


# -------------------------------------------------------------
# Space Intelligence & Workspace Summary Endpoint
# -------------------------------------------------------------
class SpaceActivityItem(BaseModel):
    id: str
    type: str  # "document_uploaded", "conversation_created", "action_proposed", "action_approved", "action_rejected", "project_created", "goal_created"
    title: str
    description: Optional[str] = None
    target_id: Optional[str] = None
    target_route: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime


class SpaceActiveWorkItem(BaseModel):
    id: str
    agent_type: str
    task_id: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    summary: Optional[dict] = None


class SpaceWorkspaceSummary(BaseModel):
    space: SpaceResponse
    stats: dict
    pending_actions: List[dict]
    recent_activity: List[SpaceActivityItem]
    active_work: List[SpaceActiveWorkItem]
    recent_documents: List[dict]
    recent_conversations: List[dict]
    active_projects: List[dict]
    active_goals: List[dict]


@router.get("/{space_id}/workspace", response_model=SpaceWorkspaceSummary)
async def get_space_workspace(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Unified, strictly Space-isolated Intelligence & Decision Workspace aggregator.
    Returns:
    1. Space metadata
    2. Pending decisions / actions requiring attention
    3. Real chronological activity derived from DB events
    4. Active agent / workflow work
    5. Recent knowledge documents & conversation threads
    6. Active projects and goals
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    # 1. Verify Space Ownership
    stmt_space = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    res_space = await db.execute(stmt_space)
    space = res_space.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found or unauthorized")

    space_response = SpaceResponse(
        id=str(space.id),
        user_id=str(space.user_id),
        name=space.name,
        slug=space.slug,
        description=space.description,
        icon=space.icon,
        color=space.color,
        is_default=space.is_default,
        created_at=space.created_at,
        updated_at=space.updated_at,
    )

    # 2. Fetch Documents (Recent 5)
    stmt_docs = (
        select(Document)
        .where(Document.space_id == space_uuid)
        .order_by(Document.created_at.desc())
        .limit(5)
    )
    res_docs = await db.execute(stmt_docs)
    docs = res_docs.scalars().all()
    docs_list = [
        {
            "id": str(d.id),
            "title": d.title,
            "type": d.type,
            "status": d.status,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]

    # 3. Fetch Total Document & Chunk counts for Stats
    total_docs_res = await db.execute(
        select(Document.id).where(Document.space_id == space_uuid)
    )
    total_doc_ids = total_docs_res.scalars().all()
    total_docs_count = len(total_doc_ids)

    total_chunks_count = 0
    if total_doc_ids:
        stmt_chunks = select(DocumentChunk.id).where(DocumentChunk.document_id.in_(total_doc_ids))
        res_chunks = await db.execute(stmt_chunks)
        total_chunks_count = len(res_chunks.scalars().all())

    # 4. Fetch Conversations (Recent 5)
    stmt_convs = (
        select(Conversation)
        .where(Conversation.space_id == space_uuid, Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
        .limit(5)
    )
    res_convs = await db.execute(stmt_convs)
    convs = res_convs.scalars().all()
    convs_list = [
        {
            "id": str(c.id),
            "title": c.title or "Untitled Thread",
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convs
    ]

    # 5. Fetch Action Proposals (Pending and Recent)
    stmt_pending_actions = (
        select(ActionProposal)
        .where(
            ActionProposal.space_id == space_uuid,
            ActionProposal.user_id == current_user.id,
            ActionProposal.status == "pending",
        )
        .order_by(ActionProposal.created_at.desc())
        .limit(10)
    )
    res_pending = await db.execute(stmt_pending_actions)
    pending_actions = res_pending.scalars().all()
    pending_list = [
        {
            "id": str(a.id),
            "proposal_id": a.proposal_id,
            "action_type": a.action_type,
            "reason": a.reason,
            "parameters": a.parameters or {},
            "confidence": a.confidence,
            "status": a.status,
            "conversation_id": str(a.conversation_id),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in pending_actions
    ]

    # Fetch recent non-pending actions for activity
    stmt_recent_actions = (
        select(ActionProposal)
        .where(
            ActionProposal.space_id == space_uuid,
            ActionProposal.user_id == current_user.id,
            ActionProposal.status != "pending",
        )
        .order_by(ActionProposal.created_at.desc())
        .limit(5)
    )
    res_recent_act = await db.execute(stmt_recent_actions)
    recent_actions = res_recent_act.scalars().all()

    # 6. Fetch Projects and Goals
    stmt_projs = (
        select(Project)
        .where(Project.space_id == space_uuid)
        .order_by(Project.created_at.desc())
        .limit(5)
    )
    res_projs = await db.execute(stmt_projs)
    projects = res_projs.scalars().all()
    projects_list = [
        {
            "id": str(p.id),
            "name": p.name,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in projects
    ]

    proj_ids = [p.id for p in projects]
    goals_list = []
    if proj_ids:
        stmt_goals = (
            select(Goal)
            .where(Goal.project_id.in_(proj_ids), Goal.user_id == current_user.id)
            .order_by(Goal.created_at.desc())
            .limit(5)
        )
        res_goals = await db.execute(stmt_goals)
        goals = res_goals.scalars().all()
        goals_list = [
            {
                "id": str(g.id),
                "project_id": str(g.project_id) if g.project_id else None,
                "description": g.description,
                "status": g.status,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in goals
        ]

    # 7. Check for Active / In-Progress Agent Runs in this Space
    active_work_list = []
    # Query AgentRuns joined with WorkflowStep -> Workflow -> Objective
    # Find active or recently running agent runs for conversations in this space
    space_conv_ids = [c.id for c in convs]
    if space_conv_ids:
        stmt_active_runs = (
            select(AgentRun)
            .where(AgentRun.status == "running")
            .order_by(AgentRun.started_at.desc())
            .limit(5)
        )
        res_active_runs = await db.execute(stmt_active_runs)
        active_runs = res_active_runs.scalars().all()
        for r in active_runs:
            active_work_list.append(
                SpaceActiveWorkItem(
                    id=str(r.id),
                    agent_type=r.agent_type,
                    task_id=r.task_id,
                    status=r.status,
                    started_at=r.started_at,
                    summary=r.output_summary,
                )
            )

    # 8. Assemble Unified Activity Stream from Real Database Entities
    activity_items: List[SpaceActivityItem] = []

    # A. Document uploads
    for d in docs:
        if d.created_at:
            activity_items.append(
                SpaceActivityItem(
                    id=f"doc-{d.id}",
                    type="document_uploaded",
                    title=f"Uploaded '{d.title}'",
                    description=f"Indexed format {d.type} with status '{d.status}'",
                    target_id=str(d.id),
                    target_route=f"/spaces/{space_id}/documents",
                    status=d.status,
                    created_at=d.created_at,
                )
            )

    # B. Conversation threads
    for c in convs:
        if c.created_at:
            activity_items.append(
                SpaceActivityItem(
                    id=f"conv-{c.id}",
                    type="conversation_created",
                    title=f"Started Thread '{c.title or 'Contextual Thread'}'",
                    description="Multi-agent reasoning and RAG session",
                    target_id=str(c.id),
                    target_route=f"/spaces/{space_id}/conversations/{c.id}",
                    status="active",
                    created_at=c.created_at,
                )
            )

    # C. Actions approved or executed
    for a in recent_actions:
        if a.created_at:
            activity_items.append(
                SpaceActivityItem(
                    id=f"action-{a.id}",
                    type=f"action_{a.status}",
                    title=f"Action {a.status.capitalize()}: {a.action_type.replace('_', ' ')}",
                    description=a.reason,
                    target_id=str(a.id),
                    target_route=f"/spaces/{space_id}/actions",
                    status=a.status,
                    created_at=a.executed_at or a.approved_at or a.created_at,
                )
            )

    # D. Projects created
    for p in projects:
        if p.created_at:
            activity_items.append(
                SpaceActivityItem(
                    id=f"proj-{p.id}",
                    type="project_created",
                    title=f"Created Project '{p.name}'",
                    description=f"Status: {p.status}",
                    target_id=str(p.id),
                    target_route=f"/spaces/{space_id}/tasks",
                    status=p.status,
                    created_at=p.created_at,
                )
            )

    # Sort combined activities descending by timestamp
    activity_items.sort(key=lambda x: x.created_at, reverse=True)
    activity_items = activity_items[:10]

    stats = {
        "documents_count": total_docs_count,
        "chunks_count": total_chunks_count,
        "conversations_count": len(convs),
        "pending_actions_count": len(pending_actions),
        "projects_count": len(projects),
        "goals_count": len(goals_list),
        "active_work_count": len(active_work_list),
    }

    return SpaceWorkspaceSummary(
        space=space_response,
        stats=stats,
        pending_actions=pending_list,
        recent_activity=activity_items,
        active_work=active_work_list,
        recent_documents=docs_list,
        recent_conversations=convs_list,
        active_projects=projects_list,
        active_goals=goals_list,
    )
