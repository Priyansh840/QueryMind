"""
QueryMind - Knowledge Router
Authenticated endpoints for structured knowledge queries and management.
User identity is derived strictly from the validated Supabase JWT session.
"""

import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from api.deps import get_db, get_current_user
from core.config import settings
from models.knowledge import Knowledge, Document
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class KnowledgeResponse(BaseModel):
    id: str
    user_id: str
    space_id: Optional[str] = None
    document_id: Optional[str] = None
    document_title: Optional[str] = None
    source_chunk_id: Optional[str] = None
    title: Optional[str] = None
    content: str
    knowledge_type: str
    page_number: Optional[int] = None
    confidence: float
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.get("", response_model=List[KnowledgeResponse])
@router.get("/", response_model=List[KnowledgeResponse])
async def list_knowledge(
    space_id: Optional[str] = Query(None),
    document_id: Optional[str] = Query(None),
    knowledge_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List structured knowledge items owned by the authenticated user.
    Supports filtering by space_id, document_id, and knowledge_type.
    """
    stmt = (
        select(Knowledge, Document.title)
        .outerjoin(Document, Document.id == Knowledge.document_id)
        .where(Knowledge.user_id == current_user.id)
    )

    if space_id:
        try:
            space_uuid = uuid.UUID(space_id)
            stmt = stmt.where(Knowledge.space_id == space_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    if document_id:
        try:
            doc_uuid = uuid.UUID(document_id)
            stmt = stmt.where(Knowledge.document_id == doc_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid document_id UUID format")

    if knowledge_type:
        stmt = stmt.where(Knowledge.knowledge_type == knowledge_type.lower().strip())

    stmt = stmt.order_by(Knowledge.created_at.desc())

    result = await db.execute(stmt)
    rows = result.fetchall()

    return [
        KnowledgeResponse(
            id=str(k.id),
            user_id=str(k.user_id),
            space_id=str(k.space_id) if k.space_id else None,
            document_id=str(k.document_id) if k.document_id else None,
            document_title=doc_title or k.title,
            source_chunk_id=str(k.source_chunk_id) if k.source_chunk_id else None,
            title=k.title,
            content=k.content,
            knowledge_type=k.knowledge_type,
            page_number=k.page_number,
            confidence=k.confidence,
            metadata_json=k.metadata_json,
            created_at=k.created_at,
            updated_at=k.updated_at,
        )
        for k, doc_title in rows
    ]


@router.get("/{knowledge_id}", response_model=KnowledgeResponse)
async def get_knowledge_item(
    knowledge_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a single knowledge item by ID.
    Returns 404 if not found or not owned by the authenticated user.
    """
    try:
        k_uuid = uuid.UUID(knowledge_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid knowledge_id UUID format")

    stmt = (
        select(Knowledge, Document.title)
        .outerjoin(Document, Document.id == Knowledge.document_id)
        .where(Knowledge.id == k_uuid, Knowledge.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    k, doc_title = row
    return KnowledgeResponse(
        id=str(k.id),
        user_id=str(k.user_id),
        space_id=str(k.space_id) if k.space_id else None,
        document_id=str(k.document_id) if k.document_id else None,
        document_title=doc_title or k.title,
        source_chunk_id=str(k.source_chunk_id) if k.source_chunk_id else None,
        title=k.title,
        content=k.content,
        knowledge_type=k.knowledge_type,
        page_number=k.page_number,
        confidence=k.confidence,
        metadata_json=k.metadata_json,
        created_at=k.created_at,
        updated_at=k.updated_at,
    )


@router.delete("/{knowledge_id}", status_code=status.HTTP_200_OK)
async def delete_knowledge_item(
    knowledge_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a single knowledge item and purges its vector in Qdrant.
    """
    try:
        k_uuid = uuid.UUID(knowledge_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid knowledge_id UUID format")

    stmt = select(Knowledge).where(Knowledge.id == k_uuid, Knowledge.user_id == current_user.id)
    result = await db.execute(stmt)
    k = result.scalar_one_or_none()

    if not k:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    # Clean vector in Qdrant
    collection_name = settings.QDRANT_COLLECTION_KNOWLEDGE or "querymind_knowledge"
    if settings.qdrant_client_url:
        try:
            qdrant = AsyncQdrantClient(
                url=settings.qdrant_client_url,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
            )
            await qdrant.delete(
                collection_name=collection_name,
                points_selector=qmodels.PointIdsList(points=[str(k.id)]),
            )
        except Exception as q_err:
            logger.warning(f"Error deleting Qdrant vector for knowledge {knowledge_id}: {q_err}")

    await db.delete(k)
    await db.commit()

    return {"status": "success", "message": f"Knowledge item {knowledge_id} deleted successfully"}
