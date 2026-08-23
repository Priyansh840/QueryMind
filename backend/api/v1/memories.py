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

from api.deps import get_db, get_current_user
from models.memory import Memory
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class MemoryCreateRequest(BaseModel):
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
    Creates a new Memory record in PostgreSQL only.
    """
    new_memory = Memory(
        id=uuid.uuid4(),
        user_id=current_user.id,
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
        updated_at=datetime.utcnow()
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
    memory_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List memories for the authenticated user.
    """
    stmt = select(Memory).where(Memory.user_id == current_user.id)
    
    if memory_type:
        stmt = stmt.where(Memory.memory_type == memory_type.strip())
            
    stmt = stmt.order_by(Memory.created_at.desc())
    result = await db.execute(stmt)
    memories = result.scalars().all()

    return [MemoryResponse.model_validate(m) for m in memories]


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
