"""
RAG Retriever for QueryMind AI Orchestrator (Step 2).
Searches Qdrant with semantic embeddings and fetches source-of-truth text from PostgreSQL.
Strictly enforces tenant isolation and structural integrity.
"""

import logging
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import logging
from typing import List, Dict, Any

from llm.embeddings import get_embeddings
from core.config import settings
from database.postgres import async_session
from models.knowledge import DocumentChunk, Document

logger = logging.getLogger(__name__)


async def retrieve_context(
    query: str,
    user_id: str,
    space_id: str,
    top_k: int = 8,
    score_threshold: float = 0.35,
) -> List[Dict[str, Any]]:
    """
    1. Embeds query dynamically.
    2. Searches Qdrant with strict user_id and space_id filters.
    3. Fetches actual text from PostgreSQL using chunk_id from payload.
    """
    logger.info(f"Retrieving context for query: '{query}' (user={user_id}, space={space_id})")

    if not settings.qdrant_client_url:
        logger.warning("Qdrant URL missing. Skipping retrieval.")
        return []

    if not user_id or not space_id:
        logger.error("user_id and space_id are strictly required for retrieval.")
        return []

    client = AsyncQdrantClient(
        url=settings.qdrant_client_url,
        api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
    )

    # 1. Strict Tenant Isolation Filter
    tenant_filter = models.Filter(
        must=[
            models.FieldCondition(
                key="user_id",
                match=models.MatchValue(value=str(user_id))
            ),
            models.FieldCondition(
                key="space_id",
                match=models.MatchValue(value=str(space_id))
            )
        ]
    )

    collection_name = settings.QDRANT_COLLECTION_DOCUMENTS
    raw_results = []
    
    try:
        embeddings_model = get_embeddings()
        q_vec = await embeddings_model.aembed_query(query)
        
        # 2. Search Vectors
        hits = await client.search(
            collection_name=collection_name,
            query_vector=q_vec,
            query_filter=tenant_filter,
            limit=top_k,
            score_threshold=score_threshold,
        )

        if not hits:
            logger.info("No matching vectors found above threshold.")
            return []

        # Extract chunk IDs to fetch from Postgres
        chunk_hits_map = {hit.payload.get("chunk_id"): hit.score for hit in hits if hit.payload.get("chunk_id")}
        chunk_ids = [uuid.UUID(cid) for cid in chunk_hits_map.keys()]

        if not chunk_ids:
            return []

        # 3. Fetch Source of Truth from Postgres
        async with async_session() as db:
            result = await db.execute(
                select(DocumentChunk, Document)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(DocumentChunk.id.in_(chunk_ids))
            )
            rows = result.all()

            for chunk_record, doc_record in rows:
                chunk_id_str = str(chunk_record.id)
                score = chunk_hits_map.get(chunk_id_str, 0.0)
                
                raw_results.append({
                    "chunk_id": chunk_id_str,
                    "document_id": str(doc_record.id),
                    "document_title": doc_record.title,
                    "content": chunk_record.content_text,
                    "page_number": chunk_record.page_number,
                    "score": score,
                    "source_type": "document"
                })

    except Exception as e:
        logger.error(f"Error during retrieval: {e}")

    # Sort combined results by score descending (if multiple collections were searched)
    raw_results.sort(key=lambda x: x["score"], reverse=True)
    
    # Return top_k
    return raw_results[:top_k]
