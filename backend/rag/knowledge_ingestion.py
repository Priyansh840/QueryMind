"""
QueryMind - Knowledge Ingestion & Vector Indexing Engine
Persists validated knowledge items into PostgreSQL and indexes dense vectors into Qdrant knowledge collection.
PostgreSQL is the single source of truth. Qdrant stores strict pointer metadata only.
"""

import uuid
import logging
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from core.config import settings
from ingestion.embeddings import embedding_service
from models.knowledge import Document, DocumentChunk, Knowledge
from rag.knowledge_extractor import extract_document_knowledge, DocumentUnderstandingResult

logger = logging.getLogger(__name__)


async def ingest_document_knowledge(
    document: Document,
    chunks: List[DocumentChunk],
    user_id: str,
    space_id: str,
    db: AsyncSession,
    fail_at_stage: Optional[str] = None,
    raw_llm_override: Optional[str] = None,
) -> List[Knowledge]:
    """
    Executes Document Understanding and ingests structured Knowledge:
    1. Extracts structured knowledge items grounded in document chunks.
    2. Persists Knowledge records to PostgreSQL.
    3. Generates embeddings using BGE-small (dim 384).
    4. Upserts vectors to Qdrant 'querymind_knowledge' collection with strict pointer metadata.
    """
    logger.info(f"Starting Knowledge Ingestion for Document '{document.title}' ({document.id})")

    # 1. Extract Structured Knowledge
    understanding_result: DocumentUnderstandingResult = await extract_document_knowledge(
        document=document,
        chunks=chunks,
        raw_llm_override=raw_llm_override,
    )

    if not understanding_result.knowledge_items:
        logger.info(f"No structured knowledge extracted for document {document.id}")
        return []

    # 2. Persist Knowledge Records to PostgreSQL
    knowledge_records: List[Knowledge] = []
    knowledge_texts: List[str] = []

    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    space_uuid = uuid.UUID(space_id) if isinstance(space_id, str) else space_id

    for item in understanding_result.knowledge_items:
        k_id = uuid.uuid4()
        chunk_uuid = uuid.UUID(item.source_chunk_id) if item.source_chunk_id else None

        record = Knowledge(
            id=k_id,
            user_id=user_uuid,
            space_id=space_uuid,
            document_id=document.id,
            source_chunk_id=chunk_uuid,
            source_id=document.id,
            title=item.title,
            content=item.content,
            knowledge_type=item.knowledge_type,
            page_number=item.page_number,
            confidence=item.confidence,
            metadata_json=item.metadata_json,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(record)
        knowledge_records.append(record)
        knowledge_texts.append(item.content)

    await db.flush()

    # Test Hook: Failure injection after PostgreSQL Knowledge inserted
    if fail_at_stage == "after_knowledge_postgres":
        raise RuntimeError("Simulated failure at stage: after_knowledge_postgres")

    # 3. Generate Embeddings
    logger.info(f"Generating embeddings for {len(knowledge_texts)} knowledge records...")
    vectors = embedding_service.embed_texts(knowledge_texts)

    # 4. Upsert Vectors to Qdrant Knowledge Collection
    points_uploaded = False
    qdrant: Optional[AsyncQdrantClient] = None
    collection_name = settings.QDRANT_COLLECTION_KNOWLEDGE or "querymind_knowledge"

    if settings.qdrant_client_url:
        qdrant = AsyncQdrantClient(
            url=settings.qdrant_client_url,
            api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
        )

        # Ensure collection exists
        try:
            collections = await qdrant.get_collections()
            collection_names = [c.name for c in collections.collections]
            if collection_name not in collection_names:
                logger.info(f"Creating Qdrant collection '{collection_name}' with dimension {settings.QDRANT_VECTOR_DIMENSION}...")
                await qdrant.create_collection(
                    collection_name=collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=settings.QDRANT_VECTOR_DIMENSION,
                        distance=qmodels.Distance.COSINE,
                    ),
                )
                # Create payload indexes
                for field in ["user_id", "space_id", "document_id", "knowledge_id"]:
                    await qdrant.create_payload_index(
                        collection_name=collection_name,
                        field_name=field,
                        field_schema=qmodels.PayloadSchemaType.KEYWORD,
                    )
        except Exception as col_err:
            logger.warning(f"Note on Qdrant collection '{collection_name}': {col_err}")

        points = []
        for k_rec, vector in zip(knowledge_records, vectors):
            points.append(
                qmodels.PointStruct(
                    id=str(k_rec.id),
                    vector=vector,
                    payload={
                        "knowledge_id": str(k_rec.id),
                        "document_id": str(document.id),
                        "user_id": str(user_id),
                        "space_id": str(space_id),
                        "source_type": "knowledge",
                    },
                )
            )

        try:
            await qdrant.upsert(
                collection_name=collection_name,
                points=points,
            )
            points_uploaded = True
            logger.info(f"Successfully pushed {len(points)} knowledge vectors to Qdrant collection '{collection_name}'.")

            # Test Hook: Failure injection after Qdrant upsert
            if fail_at_stage == "after_knowledge_qdrant":
                raise RuntimeError("Simulated failure at stage: after_knowledge_qdrant")

        except Exception as q_err:
            logger.error(f"Error during Qdrant Knowledge upsert: {q_err}")
            # Compensating cleanup: Delete newly created Qdrant vectors
            if points_uploaded and qdrant:
                try:
                    await qdrant.delete(
                        collection_name=collection_name,
                        points_selector=qmodels.PointIdsList(
                            points=[str(r.id) for r in knowledge_records]
                        ),
                    )
                    logger.info("Cleaned up orphaned Qdrant Knowledge points following failure.")
                except Exception as cleanup_err:
                    logger.error(f"Failed to cleanup Qdrant Knowledge vectors: {cleanup_err}")
            raise

    logger.info(f"Knowledge ingestion complete for Document '{document.title}' ({len(knowledge_records)} items created).")
    return knowledge_records
