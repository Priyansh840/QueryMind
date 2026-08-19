"""
Document Ingestion Engine for QueryMind.
Extracts text from uploaded files, chunks it per page, embeds it, and stores it in Qdrant and Postgres.
PostgreSQL is the single source of truth for text and page metadata.
Qdrant stores dense vectors with strict pointer metadata.
"""

import os
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from core.config import settings
from ingestion.embeddings import embedding_service
from models.knowledge import Document, DocumentChunk

logger = logging.getLogger(__name__)


async def process_document(
    file_path: str,
    filename: str,
    content_type: str,
    user_id: str,
    space_id: str,
    db: AsyncSession,
    fail_at_stage: Optional[str] = None,
) -> Document:
    """
    Main ingestion pipeline:
    1. Parse text per page
    2. Save Document metadata to Postgres
    3. Chunk text within each page (preserving 1-based page_number)
    4. Save Chunks to Postgres (DocumentChunk)
    5. Embed chunks using BGE-small
    6. Save vectors to Qdrant (Strict pointer metadata only)
    7. Commit transaction
    """
    logger.info(f"Starting ingestion for {filename} (User: {user_id}, Space: {space_id})")

    # 1. Parse Text per page
    docs = _load_document(file_path, content_type)
    if not docs:
        raise ValueError(f"Failed to extract text from {filename}")

    # 2. Save Document metadata to Postgres
    document_id = uuid.uuid4()
    doc_record = Document(
        id=document_id,
        space_id=uuid.UUID(space_id),
        title=filename,
        file_url=file_path,
        type=content_type,
    )
    db.add(doc_record)
    await db.flush()

    # 3. Page-Aware Chunking
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", " ", ""],
    )

    chunk_records: List[DocumentChunk] = []
    chunk_texts: List[str] = []
    global_chunk_index = 0

    for page_doc in docs:
        # Determine 1-based page number
        raw_page = page_doc.metadata.get("page")
        if raw_page is not None:
            try:
                page_number = int(raw_page) + 1
            except (ValueError, TypeError):
                page_number = 1
        else:
            page_number = page_doc.metadata.get("page_number", 1)

        raw_page_text = page_doc.page_content or ""
        if not raw_page_text.strip():
            continue

        page_chunks = text_splitter.split_text(raw_page_text)
        for chunk_str in page_chunks:
            chunk_clean = chunk_str.strip()
            if not chunk_clean:
                continue

            chunk_record = DocumentChunk(
                id=uuid.uuid4(),
                document_id=document_id,
                chunk_index=global_chunk_index,
                page_number=page_number,
                content_text=chunk_clean,
                token_count=max(1, len(chunk_clean) // 4),
                embedding_status="processing",
            )
            db.add(chunk_record)
            chunk_records.append(chunk_record)
            chunk_texts.append(chunk_clean)
            global_chunk_index += 1

    if not chunk_records:
        logger.warning(f"No text chunks generated for {filename}")
        await db.commit()
        return doc_record

    await db.flush()

    # Test Hook: Failure injection after Postgres chunks created
    if fail_at_stage == "after_postgres_chunks":
        raise RuntimeError("Simulated failure at stage: after_postgres_chunks")

    # 4. Embed Chunks using active embedding service
    logger.info(f"Generating embeddings for {len(chunk_texts)} chunks...")
    vectors = embedding_service.embed_texts(chunk_texts)

    # Test Hook: Failure injection after embedding
    if fail_at_stage == "after_embedding":
        raise RuntimeError("Simulated failure at stage: after_embedding")

    # 5. Save to Qdrant with STRICT Pointer-Only Payload
    points_uploaded = False
    qdrant: Optional[AsyncQdrantClient] = None

    if settings.qdrant_client_url:
        qdrant = AsyncQdrantClient(
            url=settings.qdrant_client_url,
            api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
        )

        points = []
        for chunk_record, vector in zip(chunk_records, vectors):
            points.append(
                qmodels.PointStruct(
                    id=str(chunk_record.id),
                    vector=vector,
                    payload={
                        "chunk_id": str(chunk_record.id),
                        "document_id": str(document_id),
                        "user_id": str(user_id),
                        "space_id": str(space_id),
                        "source_type": "document",
                    },
                )
            )

        try:
            await qdrant.upsert(
                collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                points=points,
            )
            points_uploaded = True
            logger.info(f"Successfully pushed {len(points)} vectors to Qdrant.")

            # Test Hook: Failure injection after Qdrant upsert
            if fail_at_stage == "after_qdrant_upsert":
                raise RuntimeError("Simulated failure at stage: after_qdrant_upsert")

            # Mark chunk embedding status as completed
            for record in chunk_records:
                record.embedding_status = "completed"

        except Exception as e:
            logger.error(f"Error during Qdrant ingestion: {e}")
            # Rollback Qdrant points if uploaded
            if points_uploaded and qdrant:
                try:
                    await qdrant.delete(
                        collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                        points_selector=qmodels.PointIdsList(
                            points=[str(r.id) for r in chunk_records]
                        ),
                    )
                    logger.info("Cleaned up orphaned Qdrant points following failure.")
                except Exception as cleanup_err:
                    logger.error(f"Failed to cleanup Qdrant vectors: {cleanup_err}")
            raise

    # 6. Automatic Document Understanding & Knowledge Extraction
    try:
        from rag.knowledge_ingestion import ingest_document_knowledge
        await ingest_document_knowledge(
            document=doc_record,
            chunks=chunk_records,
            user_id=user_id,
            space_id=space_id,
            db=db,
            fail_at_stage=fail_at_stage,
        )
    except Exception as k_err:
        logger.warning(f"Document Understanding note for {filename}: {k_err}")
        # If testing failure injection specifically for knowledge stage, re-raise
        if fail_at_stage and "knowledge" in fail_at_stage:
            raise

    await db.commit()
    logger.info(f"Ingestion complete for {filename}.")
    return doc_record


def _load_document(file_path: str, content_type: str) -> List:
    """Helper to load different file types using LangChain loaders."""
    try:
        if content_type == "application/pdf" or file_path.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
            return loader.load()
        elif "word" in content_type or file_path.endswith(".docx"):
            loader = Docx2txtLoader(file_path)
            return loader.load()
        elif "text" in content_type or file_path.endswith(".txt"):
            loader = TextLoader(file_path, encoding="utf-8")
            return loader.load()
        else:
            loader = TextLoader(file_path, encoding="utf-8")
            return loader.load()
    except Exception as e:
        logger.error(f"Error loading document {file_path}: {e}")
        return []
