"""
QueryMind - Knowledge Semantic Retriever
Performs vector search over the Qdrant knowledge collection and hydrates content from PostgreSQL.
Strictly filters by authenticated user_id and optional space_id.
"""

import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from core.config import settings
from database.postgres import async_session
from ingestion.embeddings import embedding_service
from models.knowledge import Knowledge, Document

logger = logging.getLogger(__name__)


async def retrieve_knowledge(
    query: str,
    user_id: str,
    space_id: Optional[str] = None,
    knowledge_type: Optional[str] = None,
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Retrieves structured knowledge items:
    1. Embeds the user query.
    2. Searches Qdrant 'querymind_knowledge' vector index with strict user_id & space_id filters.
    3. Hydrates authoritative content and metadata from PostgreSQL knowledge table.
    """
    try:
        user_uuid = uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        logger.error(f"Invalid user_id for knowledge retrieval: {user_id}")
        return []

    space_uuid = None
    if space_id:
        try:
            space_uuid = uuid.UUID(str(space_id))
        except (ValueError, TypeError):
            logger.warning(f"Invalid space_id '{space_id}', ignoring space filter")

    # 1. Embed query
    query_vector = embedding_service.embed_query(query)

    # 2. Build Qdrant filter
    must_conditions = [
        qmodels.FieldCondition(
            key="user_id",
            match=qmodels.MatchValue(value=str(user_uuid)),
        )
    ]

    if space_uuid:
        must_conditions.append(
            qmodels.FieldCondition(
                key="space_id",
                match=qmodels.MatchValue(value=str(space_uuid)),
            )
        )

    # 3. Search Qdrant
    hits = []
    collection_name = settings.QDRANT_COLLECTION_KNOWLEDGE or "querymind_knowledge"

    if settings.qdrant_client_url:
        try:
            qdrant = AsyncQdrantClient(
                url=settings.qdrant_client_url,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
            )
            hits = await qdrant.search(
                collection_name=collection_name,
                query_vector=query_vector,
                query_filter=qmodels.Filter(must=must_conditions),
                limit=top_k,
            )
        except Exception as e:
            logger.error(f"Qdrant Knowledge search error: {e}")
            return []

    if not hits:
        return []

    hit_score_map: Dict[str, float] = {}
    knowledge_uuids = []
    for h in hits:
        k_id_str = h.payload.get("knowledge_id") or str(h.id)
        try:
            k_uuid = uuid.UUID(k_id_str)
            knowledge_uuids.append(k_uuid)
            hit_score_map[str(k_uuid)] = float(h.score)
        except ValueError:
            continue

    if not knowledge_uuids:
        return []

    # 4. Hydrate from PostgreSQL
    results: List[Dict[str, Any]] = []
    async with async_session() as db:
        stmt = (
            select(Knowledge, Document.title)
            .outerjoin(Document, Document.id == Knowledge.document_id)
            .where(Knowledge.id.in_(knowledge_uuids))
        )
        res = await db.execute(stmt)
        rows = res.fetchall()

        for k_obj, doc_title in rows:
            # Optional knowledge_type filter
            if knowledge_type and k_obj.knowledge_type.lower() != knowledge_type.lower():
                continue

            score = hit_score_map.get(str(k_obj.id), 0.0)
            results.append(
                {
                    "knowledge_id": str(k_obj.id),
                    "document_id": str(k_obj.document_id) if k_obj.document_id else None,
                    "document_title": doc_title or k_obj.title or "Document",
                    "title": k_obj.title,
                    "content": k_obj.content,
                    "knowledge_type": k_obj.knowledge_type,
                    "page_number": k_obj.page_number,
                    "source_chunk_id": str(k_obj.source_chunk_id) if k_obj.source_chunk_id else None,
                    "confidence": k_obj.confidence,
                    "metadata_json": k_obj.metadata_json,
                    "relevance_score": score,
                    "source": f"{doc_title or 'Document'} (Page {k_obj.page_number or 1})",
                }
            )

    # Sort hydrated results by relevance score descending
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results
