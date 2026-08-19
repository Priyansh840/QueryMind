"""
QueryMind - Documents Router
Authenticated document management endpoints.
Identity is strictly derived from the validated Supabase JWT token.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import uuid
import os
import shutil

from api.deps import get_db, get_current_user
from models.knowledge import Document, DocumentChunk
from models.core import Space
from models.user import User
from rag.ingestion import process_document
from qdrant_client import AsyncQdrantClient
from core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    space_id: str = Form(...),
    test_fail_stage: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads a document, saves it temporarily, and runs the ingestion pipeline
    to extract, chunk, embed, and store vectors into Qdrant.
    User identity is derived strictly from the authenticated JWT session.
    """
    try:
        # Validate space_id format
        try:
            space_uuid = uuid.UUID(space_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

        # Verify Space ownership
        stmt_space = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
        res_space = await db.execute(stmt_space)
        space = res_space.scalar_one_or_none()
        if not space:
            raise HTTPException(status_code=404, detail="Space not found")

        # Save file to disk temporarily
        file_ext = os.path.splitext(file.filename or "")[1]
        temp_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, temp_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run ingestion with authenticated user_id
        document = await process_document(
            file_path=file_path,
            filename=file.filename or "uploaded_document",
            content_type=file.content_type,
            user_id=str(current_user.id),
            space_id=str(space_uuid),
            db=db,
            fail_at_stage=test_fail_stage,
        )

        return {
            "status": "success",
            "document_id": str(document.id),
            "filename": document.title,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload and process document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_documents(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all documents for a specific space owned by current user.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    # Verify Space ownership
    stmt_space = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    res_space = await db.execute(stmt_space)
    space = res_space.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    result = await db.execute(
        select(Document).where(Document.space_id == space_uuid)
    )
    docs = result.scalars().all()
    return docs


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a document from PostgreSQL and Qdrant.
    Identity is derived strictly from JWT.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id UUID format")

    doc = await db.get(Document, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from Qdrant
    if settings.qdrant_client_url:
        try:
            qdrant = AsyncQdrantClient(
                url=settings.qdrant_client_url,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
            )
            from qdrant_client.http import models as qmodels

            await qdrant.delete(
                collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="document_id",
                                match=qmodels.MatchValue(value=document_id),
                            )
                        ]
                    )
                ),
            )
            # Purge knowledge vectors
            knowledge_col = settings.QDRANT_COLLECTION_KNOWLEDGE or "querymind_knowledge"
            await qdrant.delete(
                collection_name=knowledge_col,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="document_id",
                                match=qmodels.MatchValue(value=document_id),
                            )
                        ]
                    )
                ),
            )
            logger.info(f"Deleted document and knowledge vectors for document {document_id} from Qdrant")
        except Exception as e:
            logger.error(f"Failed to delete vectors from Qdrant: {e}")

    # Delete from Postgres (cascades to chunks and knowledge records)
    await db.delete(doc)
    await db.commit()

    return {"status": "success", "detail": "Document deleted successfully"}
