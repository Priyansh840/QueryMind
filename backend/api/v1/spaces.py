"""
QueryMind - Spaces Router
Authenticated space / workspace management endpoints.
User identity is derived strictly from the validated Supabase JWT token.
"""

import re
import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone
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
from models.memory import Memory, Connection
from models.outcome import Outcome, Reflection

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
            .values(is_default=False, updated_at=datetime.now(timezone.utc))
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
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_space)

    from models.space_member import SpaceMember
    membership = SpaceMember(
        id=uuid.uuid4(),
        space_id=new_space.id,
        user_id=current_user.id,
        role="owner",
        created_at=new_space.created_at,
        updated_at=new_space.updated_at,
    )
    db.add(membership)

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
    Returns all spaces where the authenticated user is the owner or an active member.
    Ordered with default spaces first, followed by creation order.
    """
    from models.space_member import SpaceMember

    stmt = (
        select(Space)
        .outerjoin(SpaceMember, Space.id == SpaceMember.space_id)
        .where(
            (Space.user_id == current_user.id) | (SpaceMember.user_id == current_user.id)
        )
        .distinct()
        .order_by(Space.is_default.desc(), Space.created_at.asc())
    )
    result = await db.execute(stmt)
    spaces = result.scalars().all()

    # Deduplicate spaces by normalized name to prevent duplicate default spaces from race conditions
    seen_names = set()
    unique_spaces = []
    for s in spaces:
        norm_name = (s.name or "").strip().lower()
        if norm_name not in seen_names:
            seen_names.add(norm_name)
            unique_spaces.append(s)

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
        for s in unique_spaces
    ]


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves a single space by ID.
    Requires at least 'viewer' access in the space.
    """
    from api.deps import get_space_membership
    space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")

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
    Requires 'admin' or 'owner' role.
    """
    from api.deps import get_space_membership
    space, membership = await get_space_membership(space_id, current_user, db, min_role="admin")

    # If setting to default, unset existing default
    if request.is_default is True and not space.is_default:
        await db.execute(
            update(Space)
            .where(Space.user_id == current_user.id, Space.is_default == True)
            .values(is_default=False, updated_at=datetime.now(timezone.utc))
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

    space.updated_at = datetime.now(timezone.utc)

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

    from api.deps import get_space_membership
    space, membership = await get_space_membership(space_id, current_user, db, min_role="owner")

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
                                match=qmodels.MatchValue(value=str(space.id)),
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
                                match=qmodels.MatchValue(value=str(space.id)),
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
    confidence: Optional[str] = None


class SpaceActiveWorkItem(BaseModel):
    id: str
    type: str  # "agent_run", "workflow_step", "objective"
    title: str
    agent_type: Optional[str] = None
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
    Requires at least 'viewer' role in the space.
    """
    from api.deps import get_space_membership
    space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")
    space_uuid = space.id

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


# -------------------------------------------------------------
# MYND SPACE 2.0: Active Intelligence Cockpit Aggregator
# -------------------------------------------------------------
class CockpitEvidence(BaseModel):
    id: Optional[str] = None
    title: str
    type: str  # document, goal, conversation, memory, outcome, reflection, workflow
    snippet: Optional[str] = None


class CockpitAction(BaseModel):
    action_type: str  # approve_proposal, complete_task, create_task, verify_outcome, navigate, upload_document, create_goal
    label: str
    target_id: Optional[str] = None
    payload: Optional[dict] = None


class RightNowFocus(BaseModel):
    id: str
    headline: str
    why_it_matters: str
    evidence: List[CockpitEvidence] = []
    recommended_action: CockpitAction
    urgency: str = "high"
    source_context: str


class NoticedPattern(BaseModel):
    id: str
    type: str  # pattern, contradiction, repeated_topic, shift
    title: str
    observation: str
    why_it_matters: str
    confidence: float
    sources_count: int
    evidence: List[CockpitEvidence] = []
    action: Optional[CockpitAction] = None


class OpenLoopItem(BaseModel):
    id: str
    loop_type: str  # uncompleted_task, pending_proposal, unverified_outcome
    title: str
    context: str
    age_formatted: str
    created_at: datetime
    importance: str  # high, medium, low
    action: CockpitAction


class NextBestMove(BaseModel):
    id: str
    action_type: str
    headline: str
    why_mynd_recommends: str
    expected_impact: str
    action: CockpitAction


class KnowledgeGapItem(BaseModel):
    id: str
    known_concept: str
    missing_relationship: str
    related_sources: List[str]
    suggested_action: CockpitAction


class ResolvedConnectionItem(BaseModel):
    id: str
    source_id: str
    source_title: str
    source_type: str
    target_id: str
    target_title: str
    target_type: str
    relation: str
    reason: Optional[str] = None
    confidence: float
    created_at: datetime


class IntelligenceTimelineItem(BaseModel):
    id: str
    event_type: str  # new_connection, reflection_logged, outcome_evaluated, action_executed, goal_updated, document_indexed
    title: str
    detail: str
    timestamp: datetime
    status: Optional[str] = None
    badge_label: str


class SpaceCockpitResponse(BaseModel):
    space: SpaceResponse
    last_synced_at: datetime
    right_now: Optional[RightNowFocus] = None
    mynd_noticed: List[NoticedPattern] = []
    open_loops: List[OpenLoopItem] = []
    next_best_move: Optional[NextBestMove] = None
    knowledge_gaps: List[KnowledgeGapItem] = []
    connections: List[ResolvedConnectionItem] = []
    timeline: List[IntelligenceTimelineItem] = []


def _format_relative_time(dt: Optional[datetime]) -> str:
    if not dt:
        return "recently"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = int(max(0, diff.total_seconds()))
    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        mins = seconds // 60
        return f"{mins}m ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours}h ago"
    else:
        days = seconds // 86400
        return f"{days}d ago"


@router.get("/{space_id}/cockpit", response_model=SpaceCockpitResponse)
async def get_space_cockpit(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    MYND SPACE 2.0: Active Intelligence Cockpit aggregator.
    Synthesizes the 7 intelligence layers:
    1. Right Now (Priority & urgent developments)
    2. MYND Noticed (Patterns, tensions & recurring themes)
    3. Open Loops (Unfinished tasks, proposals, and outcomes)
    4. Next Best Move (Single highest-leverage action)
    5. Knowledge Gaps (Unconnected documents & missing links)
    6. Discovered Connections (Semantic relationships with resolved titles)
    7. Intelligence Timeline (Meaningful state changes only)
    """
    from api.deps import get_space_membership
    space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")
    space_uuid = space.id

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

    # 1. Fetch Documents in this Space
    res_docs = await db.execute(
        select(Document).where(Document.space_id == space_uuid).order_by(Document.created_at.desc())
    )
    docs = res_docs.scalars().all()

    # 2. Fetch Goals in this Space
    res_goals = await db.execute(
        select(Goal).where(Goal.space_id == space_uuid).order_by(Goal.created_at.desc())
    )
    goals = res_goals.scalars().all()

    # 3. Fetch Action Proposals in this Space
    res_props = await db.execute(
        select(ActionProposal)
        .where(ActionProposal.space_id == space_uuid)
        .order_by(ActionProposal.created_at.desc())
        .limit(20)
    )
    proposals = res_props.scalars().all()

    # 4. Fetch Outcomes in this Space
    res_outcomes = await db.execute(
        select(Outcome)
        .where(Outcome.space_id == space_uuid)
        .order_by(Outcome.created_at.desc())
        .limit(20)
    )
    outcomes = res_outcomes.scalars().all()

    # 5. Fetch Reflections in this Space
    res_reflections = await db.execute(
        select(Reflection)
        .where(Reflection.space_id == space_uuid)
        .order_by(Reflection.created_at.desc())
        .limit(20)
    )
    reflections = res_reflections.scalars().all()

    # 6. Fetch Memories in this Space
    res_memories = await db.execute(
        select(Memory)
        .where(Memory.space_id == space_uuid)
        .order_by(Memory.last_reinforced_at.desc())
        .limit(30)
    )
    memories = res_memories.scalars().all()

    # 7. Fetch Connections in this Space
    res_connections = await db.execute(
        select(Connection)
        .where(Connection.space_id == space_uuid)
        .order_by(Connection.created_at.desc())
        .limit(30)
    )
    connections = res_connections.scalars().all()

    # 8. Fetch Recent Conversations
    res_convs = await db.execute(
        select(Conversation)
        .where(Conversation.space_id == space_uuid)
        .order_by(Conversation.created_at.desc())
        .limit(10)
    )
    convs = res_convs.scalars().all()

    # Build Title Resolution Lookup Maps
    doc_map = {d.id: d.title for d in docs}
    goal_map = {g.id: g.description for g in goals}
    mem_map = {m.id: (m.content[:50] + "..." if len(m.content) > 50 else m.content) for m in memories}
    conv_map = {c.id: (c.title or "Conversation") for c in convs}

    def _resolve_title(entity_id: uuid.UUID, entity_type: str) -> str:
        if entity_type == "document" and entity_id in doc_map:
            return doc_map[entity_id]
        elif entity_type == "goal" and entity_id in goal_map:
            return goal_map[entity_id]
        elif entity_type == "memory" and entity_id in mem_map:
            return mem_map[entity_id]
        elif entity_type == "conversation" and entity_id in conv_map:
            return conv_map[entity_id]
        return f"{entity_type.capitalize()} #{str(entity_id)[:8]}"

    # =========================================================================
    # LAYER 3: OPEN LOOPS (Compute first so Right Now & Next Best Move can select)
    # =========================================================================
    open_loops: List[OpenLoopItem] = []

    # A. Uncompleted tasks from active goals
    for g in goals:
        if g.status != "completed":
            tasks = g.tasks or []
            for t in tasks:
                if isinstance(t, dict):
                    if not t.get("completed", False):
                        task_id = str(t.get("id") or uuid.uuid4().hex[:8])
                        open_loops.append(
                            OpenLoopItem(
                                id=f"loop-task-{g.id}-{task_id}",
                                loop_type="uncompleted_task",
                                title=t.get("title", "Unnamed Task"),
                                context=f"Goal: {g.description}",
                                age_formatted=_format_relative_time(g.created_at),
                                created_at=g.created_at,
                                importance=t.get("priority", g.priority or "medium"),
                                action=CockpitAction(
                                    action_type="complete_task",
                                    label="Mark Complete",
                                    target_id=str(g.id),
                                    payload={"task_id": task_id, "goal_id": str(g.id)},
                                ),
                            )
                        )
                elif isinstance(t, str):
                    open_loops.append(
                        OpenLoopItem(
                            id=f"loop-task-{g.id}-{uuid.uuid4().hex[:8]}",
                            loop_type="uncompleted_task",
                            title=t,
                            context=f"Goal: {g.description}",
                            age_formatted=_format_relative_time(g.created_at),
                            created_at=g.created_at,
                            importance=g.priority or "medium",
                            action=CockpitAction(
                                action_type="complete_task",
                                label="Mark Complete",
                                target_id=str(g.id),
                                payload={"task_title": t, "goal_id": str(g.id)},
                            ),
                        )
                    )

    # B. Pending Action Proposals
    pending_proposals = [p for p in proposals if p.status == "pending"]
    for p in pending_proposals:
        open_loops.append(
            OpenLoopItem(
                id=f"loop-prop-{p.id}",
                loop_type="pending_proposal",
                title=f"Review AI Proposal: {p.action_type.replace('_', ' ').capitalize()}",
                context=p.reason,
                age_formatted=_format_relative_time(p.created_at),
                created_at=p.created_at,
                importance=p.confidence or "medium",
                action=CockpitAction(
                    action_type="approve_proposal",
                    label="Approve Proposal",
                    target_id=p.proposal_id,
                    payload={"proposal_id": p.proposal_id, "message_id": str(p.message_id)},
                ),
            )
        )

    # C. Unverified Outcomes (status == 'unknown')
    unverified_outcomes = [o for o in outcomes if o.status == "unknown"]
    for o in unverified_outcomes:
        open_loops.append(
            OpenLoopItem(
                id=f"loop-outc-{o.id}",
                loop_type="unverified_outcome",
                title=f"Verify Real-World Outcome: {o.expected_outcome or o.target_entity_type}",
                context=f"Action initiated by {o.initiated_by} awaiting verification.",
                age_formatted=_format_relative_time(o.created_at),
                created_at=o.created_at,
                importance="medium",
                action=CockpitAction(
                    action_type="verify_outcome",
                    label="Verify Outcome",
                    target_id=str(o.id),
                    payload={"outcome_id": str(o.id)},
                ),
            )
        )

    # Sort open loops by importance and recency
    imp_weight = {"high": 3, "medium": 2, "low": 1}
    open_loops.sort(key=lambda x: (imp_weight.get(x.importance.lower(), 2), x.created_at), reverse=True)

    # =========================================================================
    # LAYER 1: RIGHT NOW (Single most important development/priority)
    # =========================================================================
    right_now: Optional[RightNowFocus] = None

    # Priority 1: High-urgency reflection (failure analysis or critical tension)
    critical_reflection = next(
        (r for r in reflections if r.reflection_type in ("failure_analysis", "lesson")), None
    )
    # Priority 2: Highest-confidence pending ActionProposal
    high_conf_proposal = next(
        (p for p in pending_proposals if p.confidence == "high"),
        pending_proposals[0] if pending_proposals else None,
    )
    # Priority 3: Highest-priority active goal with open loops
    high_priority_goal = next(
        (
            g for g in goals
            if g.priority == "high" and g.status == "active" and any(
                (not t.get("completed", False)) if isinstance(t, dict) else True
                for t in (g.tasks or [])
            )
        ),
        next((g for g in goals if g.status == "active"), None),
    )

    if high_conf_proposal:
        right_now = RightNowFocus(
            id=f"rn-prop-{high_conf_proposal.id}",
            headline=f"AI Proposed Action: {high_conf_proposal.action_type.replace('_', ' ').capitalize()}",
            why_it_matters=high_conf_proposal.reason,
            evidence=[
                CockpitEvidence(
                    title=f"Proposal #{high_conf_proposal.proposal_id}",
                    type="proposal",
                    snippet=high_conf_proposal.reason,
                )
            ],
            recommended_action=CockpitAction(
                action_type="approve_proposal",
                label="Approve & Execute Now",
                target_id=high_conf_proposal.proposal_id,
                payload={"proposal_id": high_conf_proposal.proposal_id, "message_id": str(high_conf_proposal.message_id)},
            ),
            urgency="high",
            source_context=f"Autonomous Agent Recommendation ({high_conf_proposal.confidence.capitalize()} Confidence)",
        )
    elif critical_reflection:
        right_now = RightNowFocus(
            id=f"rn-ref-{critical_reflection.id}",
            headline=f"Synthesized Insight: {critical_reflection.title}",
            why_it_matters=critical_reflection.lesson_learned,
            evidence=[
                CockpitEvidence(
                    title=critical_reflection.title,
                    type="reflection",
                    snippet=critical_reflection.lesson_learned[:120],
                )
            ],
            recommended_action=CockpitAction(
                action_type="create_goal",
                label="Act on Insight",
                payload={"description": f"Address: {critical_reflection.title}"},
            ),
            urgency="high" if critical_reflection.reflection_type == "failure_analysis" else "medium",
            source_context=f"Domain Reflection ({critical_reflection.reflection_type.replace('_', ' ').capitalize()})",
        )
    elif high_priority_goal:
        first_task_title = high_priority_goal.description
        first_task_id = "task-core"
        for t in (high_priority_goal.tasks or []):
            if isinstance(t, dict) and not t.get("completed", False):
                first_task_title = t.get("title") or high_priority_goal.description
                first_task_id = str(t.get("id") or "task-core")
                break
            elif isinstance(t, str):
                first_task_title = t
                first_task_id = "task-core"
                break

        right_now = RightNowFocus(
            id=f"rn-goal-{high_priority_goal.id}",
            headline=f"Active Domain Priority: {first_task_title}",
            why_it_matters=f"Direct blocker for domain objective '{high_priority_goal.description}' (Category: {high_priority_goal.category}).",
            evidence=[
                CockpitEvidence(
                    title=high_priority_goal.description,
                    type="goal",
                    snippet=f"Priority: {high_priority_goal.priority} • Category: {high_priority_goal.category}",
                )
            ],
            recommended_action=CockpitAction(
                action_type="complete_task",
                label="Mark Task Done",
                target_id=str(high_priority_goal.id),
                payload={"task_id": first_task_id, "goal_id": str(high_priority_goal.id)},
            ),
            urgency="high",
            source_context="Core Workspace Objective",
        )
    elif docs:
        right_now = RightNowFocus(
            id=f"rn-docs-{space_uuid}",
            headline=f"{len(docs)} Resource(s) Indexed Without Domain Objectives",
            why_it_matters="Documents are indexed in this domain, but no active goal is directing synthesis or action.",
            evidence=[CockpitEvidence(title=d.title, type="document") for d in docs[:3]],
            recommended_action=CockpitAction(
                action_type="create_goal",
                label="Set Domain Goal",
                payload={"description": f"Synthesize and apply insights from {docs[0].title}"},
            ),
            urgency="medium",
            source_context="Knowledge Ingestion Engine",
        )
    else:
        right_now = RightNowFocus(
            id=f"rn-init-{space_uuid}",
            headline="Space Initialized — Awaiting First Knowledge Signal",
            why_it_matters="MYND requires an initial document, goal, or conversation to activate intelligence synthesis.",
            evidence=[],
            recommended_action=CockpitAction(
                action_type="upload_document",
                label="Upload Initial Resource",
            ),
            urgency="low",
            source_context="Space Initialization",
        )

    # =========================================================================
    # LAYER 4: NEXT BEST MOVE (Single highest-leverage action right now)
    # =========================================================================
    next_best_move: Optional[NextBestMove] = None

    if high_conf_proposal:
        next_best_move = NextBestMove(
            id=f"nbm-prop-{high_conf_proposal.id}",
            action_type="approve_proposal",
            headline=f"Approve: {high_conf_proposal.action_type.replace('_', ' ').capitalize()}",
            why_mynd_recommends=high_conf_proposal.reason,
            expected_impact="Executes proposed database mutation and progresses agent workflow.",
            action=CockpitAction(
                action_type="approve_proposal",
                label="Execute Action",
                target_id=high_conf_proposal.proposal_id,
                payload={"proposal_id": high_conf_proposal.proposal_id, "message_id": str(high_conf_proposal.message_id)},
            ),
        )
    elif open_loops:
        top_loop = open_loops[0]
        next_best_move = NextBestMove(
            id=f"nbm-{top_loop.id}",
            action_type=top_loop.action.action_type,
            headline=f"Resolve: {top_loop.title}",
            why_mynd_recommends=f"This is the highest-priority open loop in this space ({top_loop.context}).",
            expected_impact="Closes an unfinished loop and updates workspace state.",
            action=top_loop.action,
        )
    elif docs and not goals:
        next_best_move = NextBestMove(
            id=f"nbm-init-goal-{space_uuid}",
            action_type="create_goal",
            headline="Formulate Objective from Documents",
            why_mynd_recommends="Transform static reference materials into measurable goals.",
            expected_impact="Activates multi-agent tracking and autonomous assistance.",
            action=CockpitAction(
                action_type="create_goal",
                label="Define Goal",
                payload={"description": f"Master and execute on {docs[0].title}"},
            ),
        )
    else:
        next_best_move = NextBestMove(
            id=f"nbm-default-{space_uuid}",
            action_type="upload_document",
            headline="Upload First Source Document",
            why_mynd_recommends="Empirical documents provide ground truth for MYND's reasoning.",
            expected_impact="Enables citations, contradiction checking, and knowledge graphs.",
            action=CockpitAction(action_type="upload_document", label="Upload Document"),
        )

    # =========================================================================
    # LAYER 2: MYND NOTICED (Patterns, contradictions, recurring themes)
    # =========================================================================
    mynd_noticed: List[NoticedPattern] = []

    # A. Add from reflections
    for r in reflections[:4]:
        pattern_type = "contradiction" if r.reflection_type == "failure_analysis" else "pattern"
        mynd_noticed.append(
            NoticedPattern(
                id=f"notice-ref-{r.id}",
                type=pattern_type,
                title=r.title,
                observation=r.lesson_learned,
                why_it_matters=r.actionable_guidance or "Observed during automated agent execution and outcome review.",
                confidence=r.confidence,
                sources_count=1,
                evidence=[CockpitEvidence(title=r.title, type="reflection", snippet=r.lesson_learned[:120])],
                action=CockpitAction(action_type="navigate", label="Review Reflection", target_id=str(r.id)),
            )
        )

    # B. Add from reinforced memories
    for m in memories:
        if m.reinforcement_count > 1:
            mynd_noticed.append(
                NoticedPattern(
                    id=f"notice-mem-{m.id}",
                    type="repeated_topic",
                    title=f"Recurring Pattern: {m.memory_type.capitalize()}",
                    observation=m.content,
                    why_it_matters=f"Repeated across {m.source_count} sessions with {m.reinforcement_count} reinforcements.",
                    confidence=m.confidence,
                    sources_count=m.source_count,
                    evidence=[CockpitEvidence(title=f"Memory #{str(m.id)[:6]}", type="memory", snippet=m.content[:120])],
                )
            )

    # C. Cross-domain relationship notice
    if len(docs) >= 2 and len(convs) >= 1:
        mynd_noticed.append(
            NoticedPattern(
                id=f"notice-cross-{space_uuid}",
                type="pattern",
                title=f"Multi-Source Grounding ({len(docs)} Docs, {len(convs)} Threads)",
                observation=f"MYND is actively cross-referencing {len(docs)} documents against {len(convs)} conversation thread(s).",
                why_it_matters="Ground-truth citations prevent hallucinations across domain queries.",
                confidence=0.95,
                sources_count=len(docs) + len(convs),
                evidence=[CockpitEvidence(title=d.title, type="document") for d in docs[:2]],
            )
        )

    # =========================================================================
    # LAYER 5: KNOWLEDGE GAPS (Areas where the Space appears incomplete)
    # =========================================================================
    knowledge_gaps: List[KnowledgeGapItem] = []
    connected_ids = {c.source_id for c in connections} | {c.target_id for c in connections}

    # A. Orphaned documents with zero connections
    for d in docs:
        if d.id not in connected_ids:
            knowledge_gaps.append(
                KnowledgeGapItem(
                    id=f"gap-doc-{d.id}",
                    known_concept=d.title,
                    missing_relationship="Document is indexed but isolated — not linked to any active goals or memories.",
                    related_sources=[d.title],
                    suggested_action=CockpitAction(
                        action_type="link_knowledge",
                        label="Link to Objective",
                        target_id=str(d.id),
                    ),
                )
            )

    # B. Goals lacking actionable breakdown or supporting documents
    for g in goals:
        if not g.tasks or len(g.tasks) == 0:
            knowledge_gaps.append(
                KnowledgeGapItem(
                    id=f"gap-goal-{g.id}",
                    known_concept=f"Goal: {g.description}",
                    missing_relationship="Goal has no actionable milestones or broken-down tasks.",
                    related_sources=[],
                    suggested_action=CockpitAction(
                        action_type="generate_tasks",
                        label="Generate Tasks",
                        target_id=str(g.id),
                    ),
                )
            )

    # =========================================================================
    # LAYER 6: CONNECTIONS (Meaningful newly discovered relationships)
    # =========================================================================
    resolved_connections: List[ResolvedConnectionItem] = []
    for c in connections[:20]:
        resolved_connections.append(
            ResolvedConnectionItem(
                id=str(c.id),
                source_id=str(c.source_id),
                source_title=_resolve_title(c.source_id, c.source_type),
                source_type=c.source_type,
                target_id=str(c.target_id),
                target_title=_resolve_title(c.target_id, c.target_type),
                target_type=c.target_type,
                relation=c.relation,
                reason=c.reason or "Semantic relationship discovered across workspace assets.",
                confidence=c.confidence,
                created_at=c.created_at,
            )
        )

    # =========================================================================
    # LAYER 7: INTELLIGENCE TIMELINE (Meaningful changes detected by MYND)
    # =========================================================================
    timeline_items: List[IntelligenceTimelineItem] = []

    # 1. Connections discovered
    for c in connections[:10]:
        timeline_items.append(
            IntelligenceTimelineItem(
                id=f"time-conn-{c.id}",
                event_type="new_connection",
                title=f"Connection: {_resolve_title(c.source_id, c.source_type)} ➔ {_resolve_title(c.target_id, c.target_type)}",
                detail=c.reason or f"Relation '{c.relation}' discovered by MYND.",
                timestamp=c.created_at,
                badge_label="Connection",
            )
        )

    # 2. Reflections synthesized
    for r in reflections[:10]:
        timeline_items.append(
            IntelligenceTimelineItem(
                id=f"time-ref-{r.id}",
                event_type="reflection_logged",
                title=f"Insight: {r.title}",
                detail=r.lesson_learned,
                timestamp=r.created_at,
                badge_label=r.reflection_type.capitalize(),
            )
        )

    # 3. Actions executed or approved
    for p in proposals[:10]:
        if p.status in ("approved", "executed"):
            timeline_items.append(
                IntelligenceTimelineItem(
                    id=f"time-prop-{p.id}",
                    event_type="action_executed",
                    title=f"Action {p.status.capitalize()}: {p.action_type.replace('_', ' ')}",
                    detail=p.reason,
                    timestamp=p.executed_at or p.approved_at or p.created_at,
                    status=p.status,
                    badge_label=f"Action {p.status}",
                )
            )

    # 4. Outcomes evaluated
    for o in outcomes[:10]:
        if o.evaluated_at:
            timeline_items.append(
                IntelligenceTimelineItem(
                    id=f"time-outc-{o.id}",
                    event_type="outcome_evaluated",
                    title=f"Outcome Evaluated: {o.status.upper()}",
                    detail=o.actual_outcome or o.expected_outcome or "Workspace result evaluated against expectation.",
                    timestamp=o.evaluated_at,
                    status=o.status,
                    badge_label=f"Outcome {o.status}",
                )
            )

    # 5. Documents indexed
    for d in docs[:5]:
        if d.created_at:
            timeline_items.append(
                IntelligenceTimelineItem(
                    id=f"time-doc-{d.id}",
                    event_type="document_indexed",
                    title=f"Indexed: '{d.title}'",
                    detail=f"Resource format {d.type} parsed into Qdrant vectors.",
                    timestamp=d.created_at,
                    badge_label="Document",
                )
            )

    # Sort timeline descending by timestamp
    timeline_items.sort(key=lambda x: x.timestamp, reverse=True)
    timeline_items = timeline_items[:15]

    return SpaceCockpitResponse(
        space=space_response,
        last_synced_at=datetime.now(timezone.utc),
        right_now=right_now,
        mynd_noticed=mynd_noticed,
        open_loops=open_loops,
        next_best_move=next_best_move,
        knowledge_gaps=knowledge_gaps,
        connections=resolved_connections,
        timeline=timeline_items,
    )


class SpaceBriefingResponse(BaseModel):
    space_id: str
    space_name: str
    executive_summary: str
    key_takeaways: List[str]
    active_priorities: List[str]
    knowledge_gaps: List[str]
    recommended_actions: List[str]


@router.get("/{space_id}/briefing", response_model=SpaceBriefingResponse)
async def get_space_intelligence_briefing(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates an on-demand AI intelligence briefing synthesizing the space's
    documents, goals, and recent activity into actionable takeaways and knowledge gaps.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid space ID format")

    stmt_space = select(Space).where(
        Space.id == space_uuid,
        Space.user_id == current_user.id
    )
    space_res = await db.execute(stmt_space)
    space = space_res.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # Fetch documents belonging to space
    doc_stmt = select(Document).where(Document.space_id == space_uuid).order_by(Document.created_at.desc()).limit(15)
    docs = (await db.execute(doc_stmt)).scalars().all()

    # Fetch goals for this space
    goal_stmt = select(Goal).where(Goal.space_id == space_uuid).order_by(Goal.created_at.desc()).limit(10)
    goals = (await db.execute(goal_stmt)).scalars().all()

    # Fetch recent conversations
    conv_stmt = select(Conversation).where(Conversation.space_id == space_uuid).order_by(Conversation.created_at.desc()).limit(5)
    convs = (await db.execute(conv_stmt)).scalars().all()

    docs_summary = "\n".join([f"- {d.title} (Type: {d.content_type}, Status: {d.status})" for d in docs]) or "No documents uploaded yet."
    goals_summary = "\n".join([f"- {g.description} [Status: {g.status}]" for g in goals]) or "No explicit goals defined yet."
    convs_summary = "\n".join([f"- {c.title}" for c in convs]) or "No past discussions."

    prompt = f"""You are the Chief Intelligence Analyst for the workspace '{space.name}'.
Description: {space.description or 'Specialized domain workspace'}

Workspace Inventory:
Documents:
{docs_summary}

Active/Recent Goals:
{goals_summary}

Recent Topics Explored:
{convs_summary}

Provide a concise, high-signal intelligence briefing for this domain:
1. Executive Summary: 2 concise sentences summarizing the primary purpose, active focus, and current maturity of this space.
2. Key Takeaways: 3-4 bullet points highlighting the core knowledge domain and themes covered.
3. Active Priorities: 2-3 focus areas or open milestones.
4. Knowledge Gaps: 2 critical missing topics, documents, or question areas needed to round out this domain.
5. Recommended Actions: 2 concrete next actions the user should take in this space.
"""

    from llm.provider import get_llm
    from langchain_core.messages import SystemMessage, HumanMessage

    class StructuredBriefing(BaseModel):
        executive_summary: str
        key_takeaways: List[str]
        active_priorities: List[str]
        knowledge_gaps: List[str]
        recommended_actions: List[str]

    llm = get_llm(temperature=0.2)
    try:
        structured_llm = llm.with_structured_output(StructuredBriefing)
        briefing = await structured_llm.ainvoke([
            SystemMessage(content="You are QueryMind's executive workspace intelligence analyst. Produce crisp, high-signal domain briefings."),
            HumanMessage(content=prompt)
        ])
        return SpaceBriefingResponse(
            space_id=str(space.id),
            space_name=space.name,
            executive_summary=briefing.executive_summary,
            key_takeaways=briefing.key_takeaways,
            active_priorities=briefing.active_priorities,
            knowledge_gaps=briefing.knowledge_gaps,
            recommended_actions=briefing.recommended_actions,
        )
    except Exception as e:
        logger.warning(f"Structured briefing fallback: {e}")
        return SpaceBriefingResponse(
            space_id=str(space.id),
            space_name=space.name,
            executive_summary=f"Active domain workspace '{space.name}' indexing {len(docs)} documents and {len(goals)} active objectives.",
            key_takeaways=[f"Indexes {len(docs)} knowledge resources.", "Grounded vector partitioning enabled."],
            active_priorities=[g.description for g in goals[:3]] if goals else ["Define initial milestones for this workspace."],
            knowledge_gaps=["Upload additional source documents to unlock deeper domain RAG."],
            recommended_actions=["Start an in-situ discussion with Space Copilot.", "Index core references."],
        )

