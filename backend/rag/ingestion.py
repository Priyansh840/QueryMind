"""
Document Ingestion Engine for MYND.
Extracts text from uploaded files, chunks it, embeds it, and stores it in Qdrant and Postgres.
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
from llm.embeddings import get_embeddings
from models.knowledge import Document, DocumentChunk

logger = logging.getLogger(__name__)

async def process_document(
    file_path: str,
    filename: str,
    content_type: str,
    user_id: str,
    space_id: str,
    db: AsyncSession
) -> Document:
    """
    Main ingestion pipeline:
    1. Parse text
    2. Save to Postgres (Document)
    3. Chunk text
    4. Save to Postgres (DocumentChunk)
    5. Embed chunks
    6. Save to Qdrant
    """
    logger.info(f"Starting ingestion for {filename} (User: {user_id}, Space: {space_id})")

    # 1. Parse Text
    docs = _load_document(file_path, content_type)
    if not docs:
        raise ValueError(f"Failed to extract text from {filename}")
        
    full_text = "\n\n".join([doc.page_content for doc in docs])
    
    # 2. Save Document metadata to Postgres
    document_id = uuid.uuid4()
    doc_record = Document(
        id=document_id,
        space_id=uuid.UUID(space_id),
        title=filename,
        file_url=file_path,
        type=content_type
    )
    db.add(doc_record)
    await db.flush()

    # 3. Chunk Text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunks = text_splitter.split_text(full_text)
    
    if not chunks:
        logger.warning(f"No chunks generated for {filename}")
        await db.commit()
        return doc_record

    # 4. Save Chunks to Postgres
    chunk_records = []
    for i, chunk_text in enumerate(chunks):
        chunk_record = DocumentChunk(
            id=uuid.uuid4(),
            document_id=document_id,
            chunk_index=i,
            content_text=chunk_text,
            token_count=len(chunk_text) // 4, # rough estimate
            embedding_status="processing"
        )
        db.add(chunk_record)
        chunk_records.append(chunk_record)
    
    await db.flush()

    # 5. Embed Chunks
    embeddings_model = get_embeddings()
    logger.info(f"Generating embeddings for {len(chunks)} chunks...")
    vectors = await embeddings_model.aembed_documents(chunks)

    # 6. Save to Qdrant
    if settings.qdrant_client_url:
        qdrant = AsyncQdrantClient(
            url=settings.qdrant_client_url,
            api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None
        )
        
        points = []
        for i, (chunk, vector, record) in enumerate(zip(chunks, vectors, chunk_records)):
            points.append(
                qmodels.PointStruct(
                    id=str(record.id),
                    vector=vector,
                    payload={
                        "user_id": user_id,
                        "space_id": space_id,
                        "document_id": str(document_id),
                        "chunk_index": i,
                        "content_text": chunk,
                        "filename": filename
                    }
                )
            )
            
        await qdrant.upsert(
            collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
            points=points
        )
        logger.info(f"Successfully pushed {len(points)} vectors to Qdrant.")
        
        # Mark chunks as complete
        for record in chunk_records:
            record.embedding_status = "completed"
    else:
        logger.warning("Qdrant not configured. Skipping vector insertion.")

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
            # Fallback to pure text loader
            loader = TextLoader(file_path, encoding="utf-8")
            return loader.load()
    except Exception as e:
        logger.error(f"Error loading document {file_path}: {e}")
        return []
