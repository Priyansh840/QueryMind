"""
RAG Retriever for QueryMind AI Orchestrator.
Searches Qdrant with BGE embeddings, query expansion, deduplication, and diverse document matching.
"""

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from ingestion.embeddings import embedding_service
from core.config import settings
import logging
import re
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


async def retrieve_context(
    query: str,
    user_id: str | None = None,
    space_id: str | None = None,
    top_k: int = 8,
    score_threshold: float = 0.35,
) -> List[Dict[str, Any]]:
    """
    Embeds the query using BGE-small (384-dim) and searches Qdrant collections.
    Includes query variations (e.g. if 'resume' is mentioned) and deduplicates chunks.
    """
    logger.info(f"Retrieving context for query: '{query}' (user={user_id}, space={space_id})")

    if not settings.qdrant_client_url:
        logger.warning("Qdrant URL missing. Skipping retrieval.")
        return []

    client = AsyncQdrantClient(
        url=settings.qdrant_client_url,
        api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
    )

    # 1. Build queries to search
    queries = [query]
    lowered = query.lower()
    if "resume" in lowered or "cv" in lowered:
        queries.append("Priyansh Sinha Resume experience education skills")
    if "project" in lowered or "report" in lowered:
        queries.append("projects reports technical summary")

    # 2. Allowed users filter
    allowed_users = ["test-user-001", "00000000-0000-0000-0000-000000000001"]
    if user_id and user_id not in allowed_users:
        allowed_users.append(user_id)

    user_filter = models.Filter(
        should=[
            models.FieldCondition(
                key="user_id",
                match=models.MatchValue(value=uid)
            )
            for uid in allowed_users
        ]
    )

    collection_name = settings.QDRANT_COLLECTION_DOCUMENTS or "querymind_documents"
    seen_contents = set()
    raw_results = []

    for q_text in queries:
        try:
            q_vec = embedding_service.embed_query(q_text)
            
            # Try with user filter first
            hits = await client.search(
                collection_name=collection_name,
                query_vector=q_vec,
                query_filter=user_filter,
                limit=top_k,
                score_threshold=score_threshold,
            )

            if not hits:
                hits = await client.search(
                    collection_name=collection_name,
                    query_vector=q_vec,
                    limit=top_k,
                    score_threshold=score_threshold,
                )

            for hit in hits:
                doc_title = hit.payload.get("document_title") or "Document"
                content = (hit.payload.get("content") or hit.payload.get("content_text") or "").strip()
                
                # Deduplicate identical or near-identical text
                content_key = content[:80].lower()
                if content and content_key not in seen_contents:
                    seen_contents.add(content_key)
                    raw_results.append({
                        "content": content,
                        "source": doc_title,
                        "score": hit.score,
                        "metadata": hit.payload,
                    })
        except Exception as e:
            logger.error(f"Error searching {collection_name} for '{q_text}': {e}")

    # Search memories if exists
    try:
        q_vec = embedding_service.embed_query(query)
        hits = await client.search(
            collection_name=settings.QDRANT_COLLECTION_MEMORIES or "querymind_memories",
            query_vector=q_vec,
            limit=2,
            score_threshold=score_threshold,
        )
        for hit in hits:
            content = (hit.payload.get("content") or "").strip()
            content_key = content[:80].lower()
            if content and content_key not in seen_contents:
                seen_contents.add(content_key)
                raw_results.append({
                    "content": content,
                    "source": "Memory",
                    "score": hit.score,
                    "metadata": hit.payload,
                })
    except Exception as e:
        logger.debug(f"Memory collection search skipped: {e}")

    # Sort combined results by score descending
    raw_results.sort(key=lambda x: x["score"], reverse=True)
    return raw_results[:top_k]
