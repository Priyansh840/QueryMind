"""
QueryMind - Memories Router
Authenticated memories management endpoints (PostgreSQL CRUD only).
User identity is derived strictly from the validated Supabase JWT token.
No Qdrant interactions are performed here.
"""

import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_user, get_space_membership
from models.memory import Memory
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class MemoryCreateRequest(BaseModel):
    space_id: Optional[str] = None
    memory_type: str = Field(..., max_length=50)
    content: str = Field(..., min_length=1)
    importance: Optional[str] = Field("medium", max_length=50)


class MemoryUpdateRequest(BaseModel):
    content: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = Field(None, max_length=50)
    importance: Optional[str] = Field(None, max_length=50)


class MemoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    space_id: Optional[uuid.UUID] = None
    memory_type: str
    content: str
    confidence: float
    status: str
    importance: str
    reinforcement_count: int
    source_count: int
    first_seen_at: datetime
    last_reinforced_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SpaceConnectionItem(BaseModel):
    id: str
    source_id: str
    source_type: str
    target_id: str
    target_type: str
    relation: str
    reason: Optional[str] = None
    confidence: float
    created_at: datetime


class SpaceMemorySummaryResponse(BaseModel):
    memories: List[MemoryResponse]
    connections: List[SpaceConnectionItem]
    insights: List[dict]
    stats: dict


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(
    request: MemoryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Memory record with Space scoping.
    Requires member role if creating inside a Space.
    """
    space_uuid = None
    if request.space_id:
        try:
            space_uuid = uuid.UUID(request.space_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid space_id UUID format")
        
        # Enforce member role
        await get_space_membership(space_uuid, current_user, db, min_role="member")

    new_memory = Memory(
        id=uuid.uuid4(),
        user_id=current_user.id,
        space_id=space_uuid,
        memory_type=request.memory_type.strip(),
        content=request.content.strip(),
        importance=request.importance,
        confidence=1.0,
        status="active",
        reinforcement_count=1,
        source_count=1,
        first_seen_at=datetime.utcnow(),
        last_reinforced_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_memory)
    
    try:
        await db.commit()
        await db.refresh(new_memory)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating memory: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create memory",
        )

    return MemoryResponse.model_validate(new_memory)


@router.get("", response_model=List[MemoryResponse])
@router.get("/", response_model=List[MemoryResponse])
async def list_memories(
    space_id: Optional[str] = None,
    memory_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List memories. If space_id is provided, checks space membership (viewer) and returns shared space memories.
    Otherwise returns user-specific personal memories.
    """
    if space_id:
        try:
            space_uuid = uuid.UUID(space_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid space_id UUID format")
        
        await get_space_membership(space_uuid, current_user, db, min_role="viewer")
        stmt = select(Memory).where(Memory.space_id == space_uuid)
    else:
        stmt = select(Memory).where(Memory.user_id == current_user.id, Memory.space_id.is_(None))

    if memory_type:
        stmt = stmt.where(Memory.memory_type == memory_type.strip())
            
    stmt = stmt.order_by(Memory.last_reinforced_at.desc(), Memory.created_at.desc())
    result = await db.execute(stmt)
    memories = result.scalars().all()

    return [MemoryResponse.model_validate(m) for m in memories]


@router.post("/{memory_id}/reinforce", response_model=MemoryResponse)
async def reinforce_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reinforce an existing memory.
    """
    try:
        m_uuid = uuid.UUID(memory_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid memory_id UUID format")

    stmt = select(Memory).where(Memory.id == m_uuid)
    res = await db.execute(stmt)
    memory = res.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    if memory.space_id:
        await get_space_membership(memory.space_id, current_user, db, min_role="member")
    else:
        if memory.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    memory.reinforcement_count += 1
    memory.source_count += 1
    memory.last_reinforced_at = datetime.utcnow()
    memory.updated_at = datetime.utcnow()
    # Smooth confidence scaling (capped at 1.0)
    memory.confidence = min(1.0, round(0.5 + (memory.reinforcement_count * 0.1), 2))

    await db.commit()
    await db.refresh(memory)
    return MemoryResponse.model_validate(memory)


@router.get("/space/{space_id}/summary", response_model=SpaceMemorySummaryResponse)
async def get_space_memory_summary(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Aggregates Space-scoped Memory, explicit Connections, and Grounded Insight synthesis.
    Requires viewer membership.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    await get_space_membership(space_uuid, current_user, db, min_role="viewer")

    # 1. Fetch space memories
    stmt_mem = (
        select(Memory)
        .where(Memory.space_id == space_uuid)
        .order_by(Memory.last_reinforced_at.desc())
    )
    res_mem = await db.execute(stmt_mem)
    memories = res_mem.scalars().all()

    # 2. Fetch connections
    from models.memory import Connection
    stmt_conn = (
        select(Connection)
        .where(Connection.space_id == space_uuid)
        .order_by(Connection.created_at.desc())
    )
    res_conn = await db.execute(stmt_conn)
    connections = res_conn.scalars().all()
    res_conn = await db.execute(stmt_conn)
    connections = res_conn.scalars().all()

    # 3. Derive grounded insights from multi-session patterns
    # Connect Documents + Action Proposals + Conversations in this space
    from models.knowledge import Document
    from models.action_proposal import ActionProposal
    from models.conversation import Conversation

    stmt_docs = select(Document).where(Document.space_id == space_uuid)
    res_docs = await db.execute(stmt_docs)
    docs = res_docs.scalars().all()

    stmt_act = select(ActionProposal).where(ActionProposal.space_id == space_uuid)
    res_act = await db.execute(stmt_act)
    actions = res_act.scalars().all()

    stmt_conv = select(Conversation).where(Conversation.space_id == space_uuid)
    res_conv = await db.execute(stmt_conv)
    convs = res_conv.scalars().all()

    insights = []
    if docs and convs:
        insights.append({
            "id": f"ins-{space_id}-knowledge-grounding",
            "type": "pattern",
            "title": f"Grounded Knowledge across {len(docs)} Document(s)",
            "summary": f"This workspace has indexed {len(docs)} source document(s) referenced across {len(convs)} conversation thread(s).",
            "source_count": len(docs) + len(convs),
            "confidence": "high",
            "created_at": datetime.utcnow().isoformat(),
        })

    if actions:
        approved_count = len([a for a in actions if a.status in ("approved", "executed")])
        insights.append({
            "id": f"ins-{space_id}-decision-velocity",
            "type": "decision",
            "title": f"Decision Intelligence Tracking ({len(actions)} Total Proposals)",
            "summary": f"{approved_count} of {len(actions)} proposed action(s) have been reviewed and approved in this workspace.",
            "source_count": len(actions),
            "confidence": "high",
            "created_at": datetime.utcnow().isoformat(),
        })

    for m in memories:
        if m.reinforcement_count > 1:
            insights.append({
                "id": f"ins-mem-{m.id}",
                "type": "memory_reinforcement",
                "title": f"Recurring Pattern: {m.memory_type.capitalize()}",
                "summary": m.content,
                "source_count": m.source_count,
                "confidence": "high" if m.confidence >= 0.8 else "medium",
                "created_at": m.last_reinforced_at.isoformat() if m.last_reinforced_at else m.created_at.isoformat(),
            })

    stats = {
        "memories_count": len(memories),
        "connections_count": len(connections),
        "insights_count": len(insights),
        "documents_count": len(docs),
        "conversations_count": len(convs),
        "actions_count": len(actions),
    }

    return SpaceMemorySummaryResponse(
        memories=[MemoryResponse.model_validate(m) for m in memories],
        connections=[
            SpaceConnectionItem(
                id=str(c.id),
                source_id=str(c.source_id),
                source_type=c.source_type,
                target_id=str(c.target_id),
                target_type=c.target_type,
                relation=c.relation,
                reason=c.reason,
                confidence=c.confidence,
                created_at=c.created_at,
            )
            for c in connections
        ],
        insights=insights,
        stats=stats,
    )



@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(memory_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid memory_id UUID format")

    stmt = select(Memory).where(Memory.id == m_uuid, Memory.user_id == current_user.id)
    result = await db.execute(stmt)
    memory = result.scalar_one_or_none()

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    return MemoryResponse.model_validate(memory)


@router.patch("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: str,
    request: MemoryUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(memory_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid memory_id UUID format")

    stmt = select(Memory).where(Memory.id == m_uuid, Memory.user_id == current_user.id)
    result = await db.execute(stmt)
    memory = result.scalar_one_or_none()

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    if request.content is not None:
        memory.content = request.content.strip()
    if request.status is not None:
        memory.status = request.status.strip()
    if request.importance is not None:
        memory.importance = request.importance.strip()
        
    memory.updated_at = datetime.utcnow()

    try:
        await db.commit()
        await db.refresh(memory)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating memory: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update memory")

    return MemoryResponse.model_validate(memory)


@router.delete("/{memory_id}", status_code=status.HTTP_200_OK)
async def delete_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(memory_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid memory_id UUID format")

    stmt = select(Memory).where(Memory.id == m_uuid, Memory.user_id == current_user.id)
    result = await db.execute(stmt)
    memory = result.scalar_one_or_none()

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    await db.delete(memory)
    await db.commit()

    return {"status": "success", "message": f"Memory {memory_id} deleted successfully"}
