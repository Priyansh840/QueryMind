"""
QueryMind - Test API Routes
Temporary endpoints to test the AI Orchestrator pipeline.
"""

import os
import shutil
from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional

from core.config import settings
from ingestion.parser_factory import parse_document, SUPPORTED_EXTENSIONS
from ingestion.chunker import chunker
from knowledge.knowledge_service import rag_pipeline
from knowledge.vector_store import vector_store
from llm.provider import llm_service

router = APIRouter()

# Use a test user ID for now
TEST_USER_ID = "test-user-001"


@router.get("/health")
async def test_health():
    """Check which AI services are available."""
    llm_status = await llm_service.health_check()
    return {
        "status": "AI Orchestrator is running",
        "llm_providers": llm_status,
        "supported_file_types": sorted(SUPPORTED_EXTENSIONS),
        "embedding_model": "BAAI/bge-small-en-v1.5",
        "vector_db": f"{settings.QDRANT_HOST}:{settings.QDRANT_PORT}",
    }


@router.post("/upload-and-process")
async def test_upload_and_process(
    file: UploadFile = File(...),
):
    """
    Test the full document processing pipeline:
    Upload → Parse → Chunk → Embed → Store in Qdrant
    """
    # Save uploaded file temporarily
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # Step 1: Parse the document
        parsed = parse_document(file_path, file.filename)

        # Step 2: Chunk the text
        text_chunks = chunker.chunk_text(parsed["full_text"])

        # Step 3: Initialize Qdrant collection
        vector_store.initialize_collections()

        # Step 4: Embed and store chunks in Qdrant
        chunk_dicts = [
            {
                "content": chunk.content,
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
            }
            for chunk in text_chunks
        ]

        point_ids = vector_store.upsert_chunks(
            chunks=chunk_dicts,
            user_id=TEST_USER_ID,
            document_id=f"doc-{file.filename}",
            document_title=file.filename,
        )

        return {
            "status": "success",
            "filename": file.filename,
            "file_type": file.filename.rsplit(".", 1)[-1],
            "text_length": len(parsed["full_text"]),
            "page_count": parsed["page_count"],
            "chunks_created": len(text_chunks),
            "vectors_stored": len(point_ids),
            "first_chunk_preview": text_chunks[0].content[:200] if text_chunks else "",
            "metadata": parsed["metadata"],
        }
    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)


@router.post("/ask")
async def test_ask_question(
    question: str = Form(...),
):
    """
    Test the RAG pipeline:
    Question → Embed → Search Qdrant → LLM Generate → Response with Citations
    """
    response = await rag_pipeline.query(
        user_query=question,
        user_id=TEST_USER_ID,
    )

    return {
        "question": question,
        "answer": response.answer,
        "citations": response.citations,
        "suggested_questions": response.suggested_questions,
        "num_sources_used": len(response.citations),
    }


@router.get("/search")
async def test_search(query: str):
    """
    Test semantic search only (without LLM generation).
    Returns relevant chunks from Qdrant.
    """
    results = vector_store.search_similar(
        query=query,
        user_id=TEST_USER_ID,
        top_k=5,
    )

    return {
        "query": query,
        "results_found": len(results),
        "results": results,
    }


@router.post("/chat-simple")
async def test_simple_chat(
    message: str = Form(...),
    provider: Optional[str] = Form(None),
):
    """
    Test LLM directly (without RAG).
    Useful for checking if Gemini/Ollama connection works.
    """
    response = await llm_service.generate(
        prompt=message,
        provider=provider,
    )

    return {
        "message": message,
        "response": response,
        "provider": provider or "auto (gemini → ollama fallback)",
    }
