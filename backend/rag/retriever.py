"""
RAG Retriever for QueryMind AI Orchestrator.
Searches Qdrant for semantic similarity, then hydrates text, page numbers,
and document titles directly from PostgreSQL (Single Source of Truth).
Enforces strict multi-tenant isolation based exclusively on authenticated JWT user_id and space_id.
"""

import logging
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from sqlalchemy import select

from core.config import settings
from database.postgres import async_session
from ingestion.embeddings import embedding_service
from models.knowledge import DocumentChunk, Document

logger = logging.getLogger(__name__)


async def retrieve_context(
    query: str,
    user_id: str | None = None,
    space_id: str | None = None,
    top_k: int = 8,
    score_threshold: float = 0.35,
) -> List[Dict[str, Any]]:
    """
    1. Embed query using BGE-small.
    2. Search Qdrant vector index with strict user_id and space_id filters.
    3. Hydrate content, page_number, chunk_index, and document title from PostgreSQL.
    4. Return structured RAG context.
    """
    logger.info(f"Retrieving context for query: '{query}' (user={user_id}, space={space_id})")

    if not settings.qdrant_client_url:
        logger.warning("Qdrant URL missing. Skipping retrieval.")
        return []

    client = AsyncQdrantClient(
        url=settings.qdrant_client_url,
        api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
    )

    # 1. Build strict Qdrant filter based purely on authenticated user_id & space_id
    must_conditions = []
    if user_id:
        must_conditions.append(
            models.FieldCondition(
                key="user_id",
                match=models.MatchValue(value=str(user_id)),
            )
        )
    if space_id:
        must_conditions.append(
            models.FieldCondition(
                key="space_id",
                match=models.MatchValue(value=str(space_id)),
            )
        )

    query_filter = models.Filter(must=must_conditions) if must_conditions else None

    # 2. Embed query
    q_vec = embedding_service.embed_query(query)

    # 3. Search Qdrant
    collection_name = settings.QDRANT_COLLECTION_DOCUMENTS or "querymind_documents"
    try:
        hits = await client.search(
            collection_name=collection_name,
            query_vector=q_vec,
            query_filter=query_filter,
            limit=top_k,
            score_threshold=score_threshold,
        )
    except Exception as e:
        logger.error(f"Error searching Qdrant collection {collection_name}: {e}")
        hits = []

    if not hits:
        return []

    # 4. Extract chunk IDs and scores from Qdrant hits
    chunk_scores: Dict[str, float] = {}
    chunk_uuids: List[uuid.UUID] = []

    for hit in hits:
        cid_str = hit.payload.get("chunk_id") if hit.payload else str(hit.id)
        if not cid_str:
            cid_str = str(hit.id)
        try:
            cid_uuid = uuid.UUID(cid_str)
            chunk_uuids.append(cid_uuid)
            chunk_scores[cid_str] = hit.score
        except (ValueError, TypeError):
            logger.warning(f"Invalid chunk_id format in Qdrant point: {cid_str}")

    if not chunk_uuids:
        return []

    # 5. Hydrate from PostgreSQL as the Single Source of Truth
    pg_chunks: List[Dict[str, Any]] = []
    async with async_session() as db:
        stmt = (
            select(DocumentChunk, Document.title)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(DocumentChunk.id.in_(chunk_uuids))
        )
        result = await db.execute(stmt)
        rows = result.all()

        for chunk_record, doc_title in rows:
            cid_str = str(chunk_record.id)
            score = chunk_scores.get(cid_str, 0.0)
            pg_chunks.append({
                "chunk_id": cid_str,
                "document_id": str(chunk_record.document_id),
                "document_title": doc_title,
                "source": doc_title,
                "page_number": chunk_record.page_number,
                "chunk_index": chunk_record.chunk_index,
                "relevance_score": score,
                "score": score,
                "source_type": "document",
                "content": chunk_record.content_text,
                "metadata": {
                    "document_id": str(chunk_record.document_id),
                    "document_title": doc_title,
                    "page_number": chunk_record.page_number,
                    "chunk_index": chunk_record.chunk_index,
                },
            })

    # Sort results by relevance score descending
    pg_chunks.sort(key=lambda x: x["score"], reverse=True)
    return pg_chunks
