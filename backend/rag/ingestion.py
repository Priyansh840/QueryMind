"""
Document Ingestion Engine for MYND (Step 2 RAG).
Decoupled class for asynchronous ingestion with idempotent cleanup, page tracking, and strict Qdrant payloads.
"""

import os
import uuid
import logging
import base64
import asyncio
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import pypdf
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LCDocument
from langchain_core.messages import HumanMessage
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from core.config import settings
from llm.embeddings import get_embeddings
from llm.provider import get_llm
from models.knowledge import Document, DocumentChunk
from database.postgres import async_session
from rag.knowledge_ingestion import ingest_document_knowledge

logger = logging.getLogger(__name__)

class IngestionEngine:
    def __init__(self):
        pass
        
    async def run_ingestion(
        self,
        document_id: str,
        file_path: str,
        filename: str,
        content_type: str,
        user_id: str,
        space_id: str,
        fail_at_stage: str = None
    ):
        """
        Main decoupled ingestion pipeline.
        Designed to be called via FastAPI BackgroundTasks or a Celery worker.
        """
        logger.info(f"Starting async ingestion for Doc: {document_id}")
        
        async with async_session() as db:
            new_chunk_records = []
            try:
                # 1. Update Document Status
                doc_record = await db.get(Document, uuid.UUID(document_id))
                if not doc_record:
                    logger.error(f"Document {document_id} not found in DB.")
                    return
                    
                doc_record.status = "processing"
                await db.commit()
                
                # 2. Identify existing working version to safely remove LATER
                old_chunks_result = await db.execute(select(DocumentChunk.id).where(DocumentChunk.document_id == uuid.UUID(document_id)))
                old_chunk_ids = old_chunks_result.scalars().all()
                
                # 3. Parse Text with Page Tracking
                docs = self._load_document(file_path, content_type)
                if not docs:
                    raise ValueError(f"Failed to extract text from {filename}")
                    
                # 4. Chunk Text
                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200,
                    separators=["\n\n", "\n", ".", " ", ""]
                )
                
                split_docs = text_splitter.split_documents(docs)
                
                if not split_docs:
                    raise ValueError(f"No chunks generated for {filename}")

                # 5. Save NEW Chunks to Postgres (Source of Truth)
                for i, doc in enumerate(split_docs):
                    page_num = doc.metadata.get("page", None)
                    if page_num is not None:
                        page_num = int(page_num) + 1  # LangChain uses 0-indexed pages
                        
                    chunk_record = DocumentChunk(
                        id=uuid.uuid4(),
                        document_id=doc_record.id,
                        chunk_index=i,
                        content_text=doc.page_content,
                        page_number=page_num,
                        token_count=len(doc.page_content) // 4,
                        embedding_status="processing"
                    )
                    db.add(chunk_record)
                    new_chunk_records.append(chunk_record)
                
                await db.flush()

                # 6. Embed Chunks
                embeddings_model = get_embeddings()
                chunks_text = [d.page_content for d in split_docs]
                logger.info(f"Generating embeddings for {len(chunks_text)} chunks...")
                vectors = await embeddings_model.aembed_documents(chunks_text)
                
                # Dimension Validation
                actual_dim = len(vectors[0])
                if actual_dim != settings.EMBEDDING_DIMENSION:
                    raise ValueError(f"Dimension mismatch! Model returned {actual_dim}, but config expects {settings.EMBEDDING_DIMENSION}")

                # 7. Save NEW Vectors to Qdrant
                if settings.qdrant_client_url:
                    qdrant = AsyncQdrantClient(
                        url=settings.qdrant_client_url,
                        api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None
                    )
                    
                    points = []
                    for vector, record in zip(vectors, new_chunk_records):
                        points.append(
                            qmodels.PointStruct(
                                id=str(record.id),
                                vector=vector,
                                payload={
                                    "chunk_id": str(record.id),
                                    "document_id": str(doc_record.id),
                                    "document_title": doc_record.title,
                                    "content": record.content_text,
                                    "user_id": user_id,
                                    "space_id": space_id,
                                    "source_type": "document"
                                }
                            )
                        )
                        
                    await qdrant.upsert(
                        collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                        points=points
                    )
                    logger.info(f"Successfully pushed {len(points)} new vectors to Qdrant.")
                    
                    for record in new_chunk_records:
                        record.embedding_status = "completed"
                        
                if fail_at_stage == "after_qdrant_upsert":
                    raise Exception("Simulated failure after Qdrant upsert")

                # 8. Structured Knowledge Ingestion (Step 12 enhancement)
                try:
                    async with db.begin_nested():
                        await ingest_document_knowledge(
                            document=doc_record,
                            chunks=new_chunk_records,
                            user_id=user_id,
                            space_id=space_id,
                            db=db,
                            fail_at_stage=fail_at_stage,
                        )
                except Exception as k_err:
                    if fail_at_stage and "knowledge" in fail_at_stage:
                        raise
                    logger.warning(
                        f"Knowledge extraction failed for document {document_id} (raw chunk RAG preserved): {k_err}"
                    )

                # 9. Success: Safely cleanup old working version
                if old_chunk_ids:
                    await self._cleanup_specific_chunks(db, old_chunk_ids)
                    
                doc_record.status = "completed"
                doc_record.error_message = None
                await db.commit()
                logger.info(f"Ingestion complete for {filename}.")
                
            except Exception as e:
                logger.error(f"Ingestion failed for {document_id}: {e}")
                await db.rollback()
                
                # Attempt to clean up ONLY the new orphaned resources from this failed run
                if new_chunk_records:
                    new_chunk_ids = [c.id for c in new_chunk_records]
                    try:
                        await self._cleanup_specific_chunks(db, new_chunk_ids)
                    except Exception as cleanup_e:
                        logger.error(f"Failed to cleanup orphaned resources after failure: {cleanup_e}")
                
                # Update error status in new transaction (leaves old working version intact)
                try:
                    doc_record = await db.get(Document, uuid.UUID(document_id))
                    if doc_record:
                        doc_record.status = "failed"
                        doc_record.error_message = str(e)
                        await db.commit()
                except Exception as final_e:
                    logger.error(f"Failed to record error state: {final_e}")

    async def _cleanup_specific_chunks(self, db: AsyncSession, chunk_ids: List[uuid.UUID]):
        """Safely removes specific chunks from Qdrant and PostgreSQL."""
        if not chunk_ids:
            return
            
        chunk_id_strs = [str(cid) for cid in chunk_ids]
        
        # Clean Qdrant
        if settings.qdrant_client_url:
            try:
                qdrant = AsyncQdrantClient(
                    url=settings.qdrant_client_url,
                    api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None
                )
                
                # Delete by chunk_id payload using a single batch if possible, or filter
                await qdrant.delete(
                    collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                    points_selector=qmodels.FilterSelector(
                        filter=qmodels.Filter(
                            must=[
                                qmodels.FieldCondition(
                                    key="chunk_id",
                                    match=qmodels.MatchAny(any=chunk_id_strs),
                                ),
                            ],
                        )
                    ),
                )
            except Exception as e:
                logger.warning(f"Failed to cleanup specific Qdrant chunks: {e}")
                
        # Postgres Cleanup
        try:
            result = await db.execute(select(DocumentChunk).where(DocumentChunk.id.in_(chunk_ids)))
            chunks = result.scalars().all()
            for c in chunks:
                await db.delete(c)
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to cleanup specific Postgres chunks: {e}")

    def _ocr_image_file(self, file_path: str, content_type: str) -> List[LCDocument]:
        """Perform multimodal OCR on a standalone image file (jpg, png, webp)."""
        try:
            with open(file_path, "rb") as f:
                raw_data = f.read()
            if not raw_data:
                return []

            b64_str = base64.b64encode(raw_data).decode("utf-8")
            lower_path = file_path.lower()
            mime = content_type if content_type and "image/" in content_type else "image/jpeg"
            if lower_path.endswith(".png"):
                mime = "image/png"
            elif lower_path.endswith(".webp"):
                mime = "image/webp"

            prompt_text = (
                "You are an OCR and document extraction engine. "
                "Transcribe all text, headings, questions, code, mathematical equations, marks, "
                "and tables from this document image verbatim into clean markdown format. "
                "Preserve the original structure, question numbers, and layout as closely as possible. "
                "Output only the transcribed content without any conversational filler or preambles."
            )
            msg = HumanMessage(
                content=[
                    {"type": "text", "text": prompt_text},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64_str}"},
                    },
                ]
            )
            llm = get_llm(temperature=0.0)
            res = llm.invoke([msg])
            content = res.content
            if isinstance(content, list):
                texts = [part.get("text", "") if isinstance(part, dict) else getattr(part, "text", str(part)) for part in content]
                content = "".join(texts)
            text_str = str(content).strip() if content else ""
            if text_str:
                return [LCDocument(page_content=text_str, metadata={"page": 0, "source": file_path})]
        except Exception as e:
            logger.error(f"Image OCR failed for {file_path}: {e}")
        return []

    def _ocr_pdf(self, file_path: str) -> List[LCDocument]:
        """Extract text from scanned or image-based PDF pages via multimodal vision LLM."""
        ocr_docs: List[LCDocument] = []
        try:
            reader = pypdf.PdfReader(file_path)
            llm = get_llm(temperature=0.0)

            for page_idx, page in enumerate(reader.pages):
                # First check if the page already has extracted text
                raw_page_text = (page.extract_text() or "").strip()
                if len(raw_page_text) >= 50:
                    ocr_docs.append(
                        LCDocument(page_content=raw_page_text, metadata={"page": page_idx, "source": file_path})
                    )
                    continue

                # If text is empty or minimal, inspect embedded page images
                extracted_image_texts = []
                page_images = getattr(page, "images", [])
                for img_idx, img in enumerate(page_images):
                    try:
                        raw_data = getattr(img, "data", None)
                        if not raw_data or len(raw_data) < 500:
                            continue

                        img_name = getattr(img, "name", "").lower()
                        mime = "image/jpeg"
                        if img_name.endswith(".png"):
                            mime = "image/png"
                        elif img_name.endswith(".webp"):
                            mime = "image/webp"

                        b64_str = base64.b64encode(raw_data).decode("utf-8")
                        prompt_text = (
                            "You are an OCR and document extraction engine. "
                            "Transcribe all text, headings, questions, code, mathematical equations, marks, "
                            "and tables from this document page verbatim into clean markdown format. "
                            "Preserve the original structure, question numbers, and layout as closely as possible. "
                            "Output only the transcribed content without any conversational filler or preambles."
                        )
                        msg = HumanMessage(
                            content=[
                                {"type": "text", "text": prompt_text},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:{mime};base64,{b64_str}"},
                                },
                            ]
                        )
                        res = llm.invoke([msg])
                        content = res.content
                        if isinstance(content, list):
                            texts = [part.get("text", "") if isinstance(part, dict) else getattr(part, "text", str(part)) for part in content]
                            content = "".join(texts)
                        if content and str(content).strip():
                            extracted_image_texts.append(str(content).strip())
                    except Exception as img_err:
                        logger.warning(
                            f"OCR failed on page {page_idx}, image {img_idx} of {file_path}: {img_err}"
                        )

                if extracted_image_texts:
                    page_content = "\n\n".join(extracted_image_texts)
                    ocr_docs.append(
                        LCDocument(page_content=page_content, metadata={"page": page_idx, "source": file_path})
                    )
                elif raw_page_text:
                    ocr_docs.append(
                        LCDocument(page_content=raw_page_text, metadata={"page": page_idx, "source": file_path})
                    )

            logger.info(f"PDF OCR produced {len(ocr_docs)} document pages for {file_path}.")
        except Exception as e:
            logger.error(f"Failed to perform PDF OCR on {file_path}: {e}")

        return ocr_docs

    def _load_document(self, file_path: str, content_type: str) -> List[LCDocument]:
        """Helper to load different file types using LangChain loaders with robust fallback and vision OCR."""
        try:
            lower_path = file_path.lower()
            if content_type.startswith("image/") or lower_path.endswith((".png", ".jpg", ".jpeg", ".webp")):
                return self._ocr_image_file(file_path, content_type)
            elif content_type == "application/pdf" or lower_path.endswith(".pdf"):
                docs = []
                try:
                    loader = PyPDFLoader(file_path)
                    docs = loader.load()
                except Exception as pdf_err:
                    logger.warning(f"PyPDFLoader failed for {file_path}: {pdf_err}")

                total_chars = sum(len(d.page_content.strip()) for d in docs) if docs else 0
                if total_chars >= 50:
                    return docs

                logger.info(
                    f"PyPDFLoader produced low text yield ({total_chars} chars) for {file_path}. Initiating multimodal vision OCR..."
                )
                ocr_docs = self._ocr_pdf(file_path)
                if ocr_docs and sum(len(d.page_content.strip()) for d in ocr_docs) > 0:
                    return ocr_docs

                if docs:
                    return docs
                return []
            elif "word" in content_type or lower_path.endswith(".docx") or lower_path.endswith(".doc"):
                loader = Docx2txtLoader(file_path)
                return loader.load()
            else:
                # Text, Markdown, Code, JSON, CSV, YAML, Log, etc.
                for enc in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
                    try:
                        loader = TextLoader(file_path, encoding=enc)
                        return loader.load()
                    except Exception:
                        continue
                # Final fallback: direct read with replacement of undecodable bytes
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    text = f.read()
                return [LCDocument(page_content=text, metadata={"source": file_path})]
        except Exception as e:
            logger.error(f"Error loading document {file_path}: {e}")
            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    text = f.read()
                if text.strip():
                    return [LCDocument(page_content=text, metadata={"source": file_path})]
            except Exception as final_e:
                logger.error(f"Final fallback failed for {file_path}: {final_e}")
            return []

async def process_document(
    file_path: str,
    filename: str,
    content_type: str,
    user_id: str,
    space_id: str,
    db: AsyncSession,
    fail_at_stage: str = None,
    run_in_background: bool = True,
) -> Document:
    """Wrapper that creates the document and triggers the IngestionEngine."""
    document = Document(
        id=uuid.uuid4(),
        space_id=uuid.UUID(space_id),
        title=filename,
        file_url=file_path,
        type=content_type or "unknown",
        status="processing",
    )
    db.add(document)
    await db.commit()

    engine = IngestionEngine()
    if run_in_background:
        # Run asynchronously in background so client upload requests return in <100ms
        asyncio.create_task(
            engine.run_ingestion(
                document_id=str(document.id),
                file_path=file_path,
                filename=filename,
                content_type=content_type,
                user_id=user_id,
                space_id=space_id,
                fail_at_stage=fail_at_stage,
            )
        )
    else:
        await engine.run_ingestion(
            document_id=str(document.id),
            file_path=file_path,
            filename=filename,
            content_type=content_type,
            user_id=user_id,
            space_id=space_id,
            fail_at_stage=fail_at_stage,
        )

    return document

