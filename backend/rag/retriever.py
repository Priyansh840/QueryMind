"""
RAG Retriever for MYND AI Orchestrator.
Searches Qdrant with strict user_id and space_id payload filtering.
"""

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from llm.embeddings import get_embeddings
from core.config import settings
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

async def retrieve_context(query: str, user_id: str, space_id: str) -> List[Dict[str, Any]]:
    """
    Embeds the query and searches Qdrant collections with strict payload filtering.
    """
    logger.info(f"Retrieving context for query: '{query}' (user={user_id}, space={space_id})")
    
    # 1. Embed query
    embeddings = get_embeddings()
    query_vector = await embeddings.aembed_query(query)
    
    # 2. Init Qdrant Client
    if not settings.QDRANT_URL or not settings.QDRANT_API_KEY:
        logger.warning("Qdrant credentials missing. Skipping retrieval.")
        return []

    client = AsyncQdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
    )
    
    results = []
    
    # Strict filter ensuring we only get data for this user and this space
    strict_filter = models.Filter(
        must=[
            models.FieldCondition(
                key="user_id",
                match=models.MatchValue(value=user_id)
            ),
            models.FieldCondition(
                key="space_id",
                match=models.MatchValue(value=space_id)
            )
        ]
    )

    collections = [
        settings.QDRANT_COLLECTION_DOCUMENTS,
        settings.QDRANT_COLLECTION_KNOWLEDGE
    ]
    
    # Search documents and knowledge (which have space_id)
    for collection in collections:
        try:
            hits = await client.search(
                collection_name=collection,
                query_vector=query_vector,
                query_filter=strict_filter,
                limit=5
            )
            for hit in hits:
                results.append({
                    "content": hit.payload.get("content_text", hit.payload.get("content", "")),
                    "source": collection,
                    "score": hit.score,
                    "metadata": hit.payload
                })
        except Exception as e:
            logger.error(f"Error searching {collection}: {e}")

    # Search memories (Memories are global per user, not strictly bound to a space_id by default in some architectures, 
    # but based on the prompt, it says search from memories too. 
    # If memories lack space_id, we just filter by user_id. Let's do a user_id only filter for memories.)
    memory_filter = models.Filter(
        must=[
            models.FieldCondition(
                key="user_id",
                match=models.MatchValue(value=user_id)
            )
        ]
    )
    
    try:
        hits = await client.search(
            collection_name=settings.QDRANT_COLLECTION_MEMORIES,
            query_vector=query_vector,
            query_filter=memory_filter,
            limit=3
        )
        for hit in hits:
            results.append({
                "content": hit.payload.get("content", ""),
                "source": settings.QDRANT_COLLECTION_MEMORIES,
                "score": hit.score,
                "metadata": hit.payload
            })
    except Exception as e:
        logger.error(f"Error searching {settings.QDRANT_COLLECTION_MEMORIES}: {e}")

    # Sort combined results by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return results
