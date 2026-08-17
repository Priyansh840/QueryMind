from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid
import os
import shutil

from database.postgres import get_db
from models.knowledge import Document, DocumentChunk
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
    user_id: str = Form(...),
    space_id: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads a document, saves it temporarily, and runs the ingestion pipeline
    to extract, chunk, embed, and store vectors into Qdrant.
    """
    try:
        # Save file to disk temporarily
        file_ext = os.path.splitext(file.filename)[1]
        temp_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, temp_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run processing synchronously for now (or could be pushed to background task)
        # We will await it directly so the user knows if ingestion succeeded or failed
        document = await process_document(
            file_path=file_path,
            filename=file.filename,
            content_type=file.content_type,
            user_id=user_id,
            space_id=space_id,
            db=db
        )
        
        return {"status": "success", "document_id": str(document.id), "filename": document.title}
        
    except Exception as e:
        logger.error(f"Failed to upload and process document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_documents(
    space_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    List all documents for a specific space.
    """
    result = await db.execute(
        select(Document).where(Document.space_id == uuid.UUID(space_id))
    )
    docs = result.scalars().all()
    return docs


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a document from PostgreSQL and Qdrant.
    """
    doc = await db.get(Document, uuid.UUID(document_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete from Qdrant
    if settings.qdrant_client_url:
        try:
            qdrant = AsyncQdrantClient(
                url=settings.qdrant_client_url,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None
            )
            # We filter by document_id payload field
            from qdrant_client.http import models as qmodels
            await qdrant.delete(
                collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="document_id",
                                match=qmodels.MatchValue(value=document_id)
                            )
                        ]
                    )
                )
            )
            logger.info(f"Deleted vectors for document {document_id} from Qdrant")
        except Exception as e:
            logger.error(f"Failed to delete vectors from Qdrant: {e}")
            
    # Delete from Postgres
    await db.delete(doc)
    await db.commit()
    
    return {"status": "success", "detail": "Document deleted successfully"}
