"""
QueryMind - Global Search Router
Unified Space-scoped hybrid search across Documents, Knowledge Chunks, Conversations, Messages, Action Proposals, and Memories.
Strictly enforces User and Space multi-tenant isolation.
"""

import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc

from api.deps import get_db, get_current_user
from models.user import User
from models.core import Space, Project, Goal
from models.knowledge import Document, DocumentChunk, Knowledge
from models.conversation import Conversation, Message
from models.action_proposal import ActionProposal
from models.memory import Memory
from rag.retriever import retrieve_context

logger = logging.getLogger(__name__)
router = APIRouter()


# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class SearchResultItem(BaseModel):
    id: str
    type: str  # "document", "knowledge", "conversation", "message", "decision", "memory", "project", "goal"
    title: str
    snippet: Optional[str] = None
    score: Optional[float] = 1.0
    space_id: str
    created_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    href: str


class SearchResponse(BaseModel):
    query: str
    space_id: str
    total_results: int
    results: List[SearchResultItem]


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.get("", response_model=SearchResponse)
@router.get("/", response_model=SearchResponse)
async def global_space_search(
    query: str = Query(..., min_length=1),
    space_id: str = Query(...),
    types: Optional[str] = Query(None, description="Comma-separated types filter (e.g. document,conversation,decision,memory)"),
    limit: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Performs Space-scoped hybrid search across Documents, Conversations, Decisions, Memories, and Projects/Goals.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    # 1. Verify Space Membership
    from api.deps import get_space_membership
    space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")
    space_uuid = space.id

    type_filter = set([t.strip().lower() for t in types.split(",")]) if types else None
    results: List[SearchResultItem] = []
    clean_query = query.strip()
    search_pattern = f"%{clean_query}%"

    # 2. Search Documents (Postgres Lexical)
    if not type_filter or "document" in type_filter:
        stmt_docs = (
            select(Document)
            .where(
                Document.space_id == space_uuid,
                Document.title.ilike(search_pattern),
            )
            .limit(limit)
        )
        res_docs = await db.execute(stmt_docs)
        for doc in res_docs.scalars().all():
            results.append(
                SearchResultItem(
                    id=str(doc.id),
                    type="document",
                    title=doc.title,
                    snippet=f"Document ({doc.file_type or 'knowledge'}) — {doc.status}",
                    score=0.95,
                    space_id=str(space_uuid),
                    created_at=doc.created_at,
                    metadata={"file_type": doc.file_type, "status": doc.status},
                    href=f"/spaces/{space_id}/documents",
                )
            )

    # 3. Search Conversations & Messages
    if not type_filter or "conversation" in type_filter:
        stmt_conv = (
            select(Conversation)
            .where(
                Conversation.space_id == space_uuid,
                Conversation.title.ilike(search_pattern),
            )
            .limit(limit)
        )
        res_conv = await db.execute(stmt_conv)
        for c in res_conv.scalars().all():
            results.append(
                SearchResultItem(
                    id=str(c.id),
                    type="conversation",
                    title=c.title or "Untitled Conversation",
                    snippet="Conversation thread",
                    score=0.9,
                    space_id=str(space_uuid),
                    created_at=c.created_at,
                    metadata={},
                    href=f"/spaces/{space_id}/conversations/{c.id}",
                )
            )

    # 4. Search Decisions (Action Proposals)
    if not type_filter or "decision" in type_filter:
        stmt_act = (
            select(ActionProposal)
            .where(
                ActionProposal.space_id == space_uuid,
                or_(
                    ActionProposal.action_type.ilike(search_pattern),
                    ActionProposal.reason.ilike(search_pattern),
                ),
            )
            .limit(limit)
        )
        res_act = await db.execute(stmt_act)
        for act in res_act.scalars().all():
            results.append(
                SearchResultItem(
                    id=str(act.id),
                    type="decision",
                    title=f"Decision: {act.action_type.replace('_', ' ').capitalize()}",
                    snippet=act.reason[:180] + "..." if len(act.reason) > 180 else act.reason,
                    score=0.92,
                    space_id=str(space_uuid),
                    created_at=act.created_at,
                    metadata={"status": act.status, "confidence": act.confidence},
                    href=f"/spaces/{space_id}/decisions/{act.proposal_id or act.id}",
                )
            )

    # 5. Search Memories
    if not type_filter or "memory" in type_filter:
        stmt_mem = (
            select(Memory)
            .where(
                Memory.space_id == space_uuid,
                Memory.content.ilike(search_pattern),
            )
            .limit(limit)
        )
        res_mem = await db.execute(stmt_mem)
        for m in res_mem.scalars().all():
            results.append(
                SearchResultItem(
                    id=str(m.id),
                    type="memory",
                    title=f"Memory: {m.memory_type.capitalize()}",
                    snippet=m.content,
                    score=0.88,
                    space_id=str(space_uuid),
                    created_at=m.created_at,
                    metadata={"importance": m.importance, "reinforcement_count": m.reinforcement_count},
                    href=f"/spaces/{space_id}/memory",
                )
            )

    # 6. Semantic RAG Search for Knowledge Chunks (if query is substantial)
    if not type_filter or "knowledge" in type_filter or "document" in type_filter:
        try:
            rag_chunks = await retrieve_context(
                query=clean_query,
                user_id=str(current_user.id),
                space_id=str(space_uuid),
                top_k=5,
            )
            for ch in rag_chunks:
                # Deduplicate if exact document title match is already top result
                results.append(
                    SearchResultItem(
                        id=ch["chunk_id"],
                        type="knowledge",
                        title=f"{ch['document_title']} (p. {ch.get('page_number', 1)})",
                        snippet=ch["content"][:220] + "..." if len(ch["content"]) > 220 else ch["content"],
                        score=round(ch.get("score", 0.85), 3),
                        space_id=str(space_uuid),
                        created_at=datetime.utcnow(),
                        metadata={"document_id": ch.get("document_id")},
                        href=f"/spaces/{space_id}/documents",
                    )
                )
        except Exception as rag_err:
            logger.warning(f"RAG search error during global search: {rag_err}")

    # Deduplicate & Sort results by score desc
    seen_ids = set()
    deduped_results = []
    for r in results:
        if r.id not in seen_ids:
            seen_ids.add(r.id)
            deduped_results.append(r)

    deduped_results.sort(key=lambda x: x.score if x.score is not None else 0.0, reverse=True)
    final_results = deduped_results[:limit]

    return SearchResponse(
        query=clean_query,
        space_id=str(space_uuid),
        total_results=len(final_results),
        results=final_results,
    )
