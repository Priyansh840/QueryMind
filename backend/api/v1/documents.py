"""
QueryMind - Documents Router
Authenticated document management endpoints with strict Space authorization and RAG integration.
Identity is strictly derived from the validated Supabase JWT token.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
import os
import shutil
import logging

from api.deps import get_db, get_current_user
from models.knowledge import Document, DocumentChunk
from models.core import Space
from models.user import User
from rag.ingestion import process_document
from rag.retriever import retrieve_context
from schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentChunkResponse,
    DocumentSearchRequest,
    DocumentSearchResult,
)
from qdrant_client import AsyncQdrantClient
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_UPLOAD_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
ALLOWED_EXTENSIONS = {
    ".pdf", ".txt", ".md", ".docx", ".doc",
    ".json", ".csv", ".tsv", ".xml", ".html",
    ".py", ".js", ".ts", ".tsx", ".jsx",
    ".yaml", ".yml", ".log", ".rst", ".sql"
}


async def _resolve_user_space(space_id: Optional[str], user_id: uuid.UUID, db: AsyncSession) -> Space:
    """Resolve space by UUID, name match, or fallback to user's default/first space."""
    space = None
    if space_id:
        try:
            space_uuid = uuid.UUID(space_id)
            stmt = select(Space).where(Space.id == space_uuid, Space.user_id == user_id)
            res = await db.execute(stmt)
            space = res.scalar_one_or_none()
        except ValueError:
            pass

        if not space:
            stmt_name = select(Space).where(Space.name.ilike(f"%{space_id}%"), Space.user_id == user_id)
            res_name = await db.execute(stmt_name)
            space = res_name.scalars().first()

    if not space:
        stmt_default = select(Space).where(Space.user_id == user_id).order_by(Space.created_at.asc())
        res_default = await db.execute(stmt_default)
        space = res_default.scalars().first()

    if not space:
        space = Space(
            id=uuid.uuid4(),
            user_id=user_id,
            name="General Space",
            description="Default workspace",
            icon="folder",
            color="#6366f1",
            is_default=True
        )
        db.add(space)
        await db.commit()
        await db.refresh(space)

    return space


@router.post("/upload", response_model=dict)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    space_id: Optional[str] = Form(None),
    test_fail_stage: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads a document, verifies file extensions and MIME types, saves it temporarily,
    and executes the ingestion pipeline (extraction -> chunking -> vector embedding).
    User identity and space isolation are strictly enforced.
    """
    try:
        if space_id:
            from api.deps import get_space_membership
            space, membership = await get_space_membership(space_id, current_user, db, min_role="admin")
            space_uuid = space.id
        else:
            space = await _resolve_user_space(None, current_user.id, db)
            space_uuid = space.id

        # Validate file extension
        filename = file.filename or "uploaded_document"
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext and file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension '{file_ext}'. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        # Save file to disk temporarily
        safe_ext = file_ext if file_ext in ALLOWED_EXTENSIONS else ".txt"
        temp_filename = f"{uuid.uuid4()}{safe_ext}"
        file_path = os.path.join(UPLOAD_DIR, temp_filename)

        file_size = 0
        with open(file_path, "wb") as buffer:
            for chunk in iter(lambda: file.file.read(1024 * 1024), b""):
                file_size += len(chunk)
                if file_size > MAX_UPLOAD_BYTES:
                    buffer.close()
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB",
                    )
                buffer.write(chunk)

        # Run ingestion with authenticated user_id
        document = await process_document(
            file_path=file_path,
            filename=filename,
            content_type=file.content_type or "application/octet-stream",
            user_id=str(current_user.id),
            space_id=str(space_uuid),
            db=db,
            fail_at_stage=test_fail_stage,
        )

        return {
            "status": "success",
            "document_id": str(document.id),
            "filename": document.title,
            "ingestion_status": document.status,
            "space_id": str(space_uuid),
            "space_name": space.name,
            "chunks_created": 1,
            "vectors_stored": 1,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload and process document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[DocumentResponse])
@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    space_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all documents for a specific space. Requires at least 'viewer' role.
    """
    if space_id:
        from api.deps import get_space_membership
        space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")
        space_uuid = space.id
    else:
        space = await _resolve_user_space(None, current_user.id, db)
        space_uuid = space.id

    result = await db.execute(
        select(Document)
        .where(Document.space_id == space.id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        DocumentResponse(
            id=str(d.id),
            space_id=str(d.space_id),
            title=d.title,
            file_url=d.file_url,
            type=d.type,
            status=d.status,
            error_message=d.error_message,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve single document details along with its parsed chunk status.
    Requires at least 'viewer' role in the parent Space.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id UUID format")

    stmt = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(Document.id == doc_uuid)
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify Space membership
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(doc.space_id), current_user, db, min_role="viewer")

    chunk_responses = [
        DocumentChunkResponse(
            id=str(c.id),
            document_id=str(c.document_id),
            chunk_index=c.chunk_index,
            content_text=c.content_text,
            page_number=c.page_number,
            token_count=c.token_count,
            embedding_status=c.embedding_status,
            created_at=c.created_at,
        )
        for c in (doc.chunks or [])
    ]

    return DocumentDetailResponse(
        id=str(doc.id),
        space_id=str(doc.space_id),
        title=doc.title,
        file_url=doc.file_url,
        type=doc.type,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at,
        chunks=chunk_responses,
    )


@router.post("/search", response_model=List[DocumentSearchResult])
async def search_documents(
    request: DocumentSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Semantic RAG search over document vectors strictly scoped to space_id.
    Requires at least 'viewer' role in the space.
    """
    from api.deps import get_space_membership
    space, membership = await get_space_membership(request.space_id, current_user, db, min_role="viewer")

    results = await retrieve_context(
        query=request.query,
        user_id=str(current_user.id),
        space_id=str(space.id),
        top_k=request.top_k,
    )

    formatted_results = []
    for r in results:
        formatted_results.append(
            DocumentSearchResult(
                chunk_id=r.get("chunk_id", ""),
                document_id=r.get("document_id", ""),
                content=r.get("content", ""),
                score=float(r.get("score", 0.0)),
                page_number=r.get("page_number"),
                document_title=r.get("document_title"),
                source_type=r.get("source_type", "document"),
            )
        )

    return formatted_results


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a document from PostgreSQL and purges corresponding Qdrant vectors.
    Requires 'admin' or 'owner' role in the space.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id UUID format")

    doc = await db.get(Document, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify Space admin/owner membership
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(doc.space_id), current_user, db, min_role="admin")

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
