"""
QueryMind - Knowledge Ingestion & Vector Indexing Engine
Persists validated knowledge items into PostgreSQL and indexes dense vectors into Qdrant knowledge collection.
PostgreSQL is the single source of truth. Qdrant stores strict pointer metadata only.
"""

import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from core.config import settings
from llm.embeddings import get_embeddings
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
    Executes Document Understanding and ingests structured Knowledge with failure-safe replacement:
    1. Records existing Knowledge IDs for idempotent, safe replacement.
    2. Extracts structured knowledge items grounded in document chunks.
    3. Persists new Knowledge records to PostgreSQL.
    4. Generates embeddings using BGE-small (dim 384).
    5. Upserts new vectors to Qdrant 'querymind_knowledge' collection with strict pointer metadata.
    6. Only after new vectors are successfully pushed, deletes old Knowledge records from Qdrant and PostgreSQL.
       If extraction or vector upsert fails, old Knowledge remains completely intact.
    """
    logger.info(f"Starting Knowledge Ingestion for Document '{document.title}' ({document.id})")

    # 0. Query existing Knowledge IDs for this document for failure-safe replacement
    old_knowledge_ids: List[uuid.UUID] = []
    try:
        stmt = select(Knowledge.id).where(Knowledge.document_id == document.id)
        res = await db.execute(stmt)
        old_knowledge_ids = [row[0] for row in res.fetchall()]
        if old_knowledge_ids:
            logger.info(f"Found {len(old_knowledge_ids)} existing Knowledge items for document {document.id} to replace upon success.")
    except Exception as q_err:
        logger.warning(f"Could not query existing knowledge IDs for document {document.id}: {q_err}")

    # 1. Extract Structured Knowledge
    understanding_result: DocumentUnderstandingResult = await extract_document_knowledge(
        document=document,
        chunks=chunks,
        raw_llm_override=raw_llm_override,
    )

    if not understanding_result.knowledge_items:
        logger.info(f"No structured knowledge extracted for document {document.id}")
        return []

    # 2. Persist New Knowledge Records to PostgreSQL
    knowledge_records: List[Knowledge] = []
    knowledge_texts: List[str] = []

    user_uuid = uuid.UUID(str(user_id)) if isinstance(user_id, (str, uuid.UUID)) else user_id
    space_uuid = uuid.UUID(str(space_id)) if isinstance(space_id, (str, uuid.UUID)) else space_id

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
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
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
    embeddings_model = get_embeddings()
    vectors = await embeddings_model.aembed_documents(knowledge_texts)

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
                vec_dim = len(vectors[0]) if vectors else settings.QDRANT_VECTOR_DIMENSION
                logger.info(f"Creating Qdrant collection '{collection_name}' with dimension {vec_dim}...")
                await qdrant.create_collection(
                    collection_name=collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=vec_dim,
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

            # 5. Idempotent Atomic Replacement: Now that new vectors are successfully indexed, clean up old version
            if old_knowledge_ids:
                old_id_strs = [str(kid) for kid in old_knowledge_ids]
                # Cleanup old vectors from Qdrant
                try:
                    await qdrant.delete(
                        collection_name=collection_name,
                        points_selector=qmodels.PointIdsList(points=old_id_strs),
                    )
                    logger.info(f"Removed {len(old_id_strs)} superseded knowledge points from Qdrant.")
                except Exception as del_q_err:
                    logger.warning(f"Failed to delete old Qdrant knowledge points: {del_q_err}")

                # Cleanup old records from PostgreSQL
                try:
                    await db.execute(delete(Knowledge).where(Knowledge.id.in_(old_knowledge_ids)))
                    await db.flush()
                    logger.info(f"Removed {len(old_knowledge_ids)} superseded knowledge rows from PostgreSQL.")
                except Exception as del_pg_err:
                    logger.warning(f"Failed to delete old PostgreSQL knowledge rows: {del_pg_err}")

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
                    logger.info("Cleaned up orphaned new Qdrant Knowledge points following failure.")
                except Exception as cleanup_err:
                    logger.error(f"Failed to cleanup Qdrant Knowledge vectors: {cleanup_err}")
            raise

    logger.info(f"Knowledge ingestion complete for Document '{document.title}' ({len(knowledge_records)} items created).")
    return knowledge_records
