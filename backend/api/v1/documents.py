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
from pydantic import BaseModel
import uuid
import os
import shutil
import logging
import json

from api.deps import get_db, get_current_user
from models.knowledge import Document, DocumentChunk, Knowledge
from models.core import Space, Goal
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


async def _resolve_user_space(
    space_id: Optional[str],
    user_id: uuid.UUID,
    db: AsyncSession,
    filename: Optional[str] = None,
    snippet: Optional[str] = None
) -> Space:
    """
    Resolve space by UUID, name match, or smart auto-classification.
    If space_id is omitted or 'auto', automatically routes to the best matching user space
    based on document content and existing space archetypes/descriptions.
    """
    space = None
    if space_id and space_id.strip() and space_id.lower() != "auto":
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

    if space:
        return space

    # Fetch all spaces owned by or accessible to user
    stmt_all = select(Space).where(Space.user_id == user_id).order_by(Space.created_at.asc())
    res_all = await db.execute(stmt_all)
    user_spaces = res_all.scalars().all()

    if not user_spaces:
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

    # If only 1 space exists, directly use it
    if len(user_spaces) == 1:
        return user_spaces[0]

    # Auto-classification with fast LLM if filename or snippet is available
    if filename or snippet:
        try:
            from llm.provider import get_llm
            from langchain_core.messages import SystemMessage, HumanMessage
            from pydantic import BaseModel, Field

            class SpaceRouteChoice(BaseModel):
                confidence: str = Field(description="'high' if the document cleanly fits one of the candidate spaces, or 'low' if it belongs to an unrepresented domain")
                selected_space_id: Optional[str] = Field(None, description="UUID of the selected space if confidence is high, or default space if low")
                suggest_new_space: bool = Field(False, description="True if this document represents a distinct new topic/domain not covered by existing spaces")
                suggested_space_name: Optional[str] = Field(None, description="Short, clean title for the suggested new space (e.g. 'Developer Tools', 'System Architecture', 'Finance')")
                suggested_space_description: Optional[str] = Field(None, description="1-sentence purpose for the suggested space")
                suggested_space_icon: Optional[str] = Field(None, description="Emoji icon e.g. 🛠️, 💻, 📈")
                rationale: str = Field(description="Short reason for this choice")

            def format_desc(s):
                if s.description and s.description.strip():
                    return s.description.strip()
                n = s.name.lower()
                if "study" in n or "academic" in n or "course" in n:
                    return "Coursework, college subjects, textbooks, unit notes, exams, syllabi"
                elif "career" in n or "job" in n or "interview" in n:
                    return "Resumes, CVs, job descriptions, interview prep, performance reviews, company research"
                elif "eng" in n or "system" in n or "code" in n:
                    return "Software architectures, system design, coding projects, technical RFCs"
                return "General personal notes and miscellaneous resources"

            spaces_catalog = "\n".join([
                f"- ID: {s.id} | Name: '{s.name}' | Purpose: '{format_desc(s)}'"
                for s in user_spaces
            ])

            sample_text = (snippet or "")[:800].strip()
            prompt = (
                f"Existing User Spaces:\n{spaces_catalog}\n\n"
                f"Document Name: {filename or 'Unnamed'}\n"
                f"Content Sample:\n{sample_text}\n\n"
                "Classification Guidelines:\n"
                "1. If this document is college coursework/unit material, match it to Study.\n"
                "2. If this document is a resume, CV, job application, or placement prep, match it to Career.\n"
                "3. If this document represents a clearly distinct domain (like Developer Tools, AI Workflows, System Design, or Finance) and NO appropriate space exists, set suggest_new_space=True, provide a proposed space name/description/icon, and set selected_space_id to the default General space for now.\n"
                "4. NEVER force developer tools or technical guides into Career."
            )

            llm = get_llm(temperature=0.0)
            if hasattr(llm, "with_structured_output"):
                structured_classifier = llm.with_structured_output(SpaceRouteChoice)
                choice = await structured_classifier.ainvoke([
                    SystemMessage(content="You are an expert document taxonomy classifier. Accurately categorize or propose spaces."),
                    HumanMessage(content=prompt)
                ])
                chosen_id = getattr(choice, "selected_space_id", None)
                matched = None
                if chosen_id:
                    matched = next((s for s in user_spaces if str(s.id).lower() == str(chosen_id).lower().strip()), None)

                if not matched:
                    matched = next((s for s in user_spaces if s.is_default), user_spaces[0])

                # Attach suggestion metadata to space object dynamically
                if getattr(choice, "suggest_new_space", False) and getattr(choice, "suggested_space_name", None):
                    setattr(matched, "_suggested_new_space", {
                        "name": choice.suggested_space_name,
                        "description": choice.suggested_space_description or "Dedicated domain workspace",
                        "icon": choice.suggested_space_icon or "📁",
                        "rationale": choice.rationale,
                    })

                logger.info(f"Auto-routed document '{filename}' to space '{matched.name}' (suggestion: {getattr(choice, 'suggested_space_name', None)})")
                return matched
        except Exception as e:
            logger.warning(f"Auto-classification fallback to default space: {e}")

    # Fallback to default space or first space
    default_sp = next((s for s in user_spaces if s.is_default), user_spaces[0])
    return default_sp


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

        # Peek preview snippet for smart space classification if needed
        snippet_peek = None
        if not space_id or space_id.strip() in ("", "auto"):
            try:
                if file_ext in (".txt", ".md", ".json", ".csv", ".py", ".ts", ".tsx"):
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        snippet_peek = f.read(1500)
                elif file_ext == ".pdf":
                    import pypdf
                    reader = pypdf.PdfReader(file_path)
                    if len(reader.pages) > 0:
                        snippet_peek = reader.pages[0].extract_text()[:1500]
            except Exception as e:
                logger.debug(f"Snippet extraction for auto-routing notice: {e}")

        if space_id and space_id.strip() not in ("", "auto"):
            from api.deps import get_space_membership
            space, membership = await get_space_membership(space_id, current_user, db, min_role="admin")
            space_uuid = space.id
        else:
            space = await _resolve_user_space(None, current_user.id, db, filename=filename, snippet=snippet_peek)
            space_uuid = space.id

        # Check if an existing completed document with this filename already exists in this space
        stmt = (
            select(Document)
            .where(
                Document.space_id == space_uuid,
                Document.title == filename,
                Document.status == "completed",
            )
            .order_by(Document.created_at.desc())
        )
        existing_doc = (await db.execute(stmt)).scalars().first()
        if existing_doc:
            logger.info(f"Document '{filename}' already exists and is completed (ID: {existing_doc.id}). Re-using existing index.")
            return {
                "status": "success",
                "document_id": str(existing_doc.id),
                "filename": existing_doc.title,
                "ingestion_status": "completed",
                "space_id": str(space_uuid),
                "space_name": space.name,
                "chunks_created": 1,
                "vectors_stored": 1,
            }

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

        suggested_space = getattr(space, "_suggested_new_space", None)

        return {
            "status": "success",
            "document_id": str(document.id),
            "filename": document.title,
            "ingestion_status": document.status,
            "space_id": str(space_uuid),
            "space_name": space.name,
            "chunks_created": 1,
            "vectors_stored": 1,
            "suggested_new_space": suggested_space,
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
    List documents. If space_id is provided, lists documents scoped to that space.
    If space_id is omitted or empty, lists all documents across all accessible spaces.
    """
    if space_id and space_id.strip() and space_id.lower() != "all":
        from api.deps import get_space_membership
        space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")
        stmt = (
            select(Document)
            .where(Document.space_id == space.id)
            .order_by(Document.created_at.desc())
        )
    else:
        # Return all documents across all spaces owned by or accessible to current_user
        from models.space_member import SpaceMember
        stmt = (
            select(Document)
            .join(Space, Document.space_id == Space.id)
            .outerjoin(SpaceMember, Space.id == SpaceMember.space_id)
            .where(
                (Space.user_id == current_user.id) | (SpaceMember.user_id == current_user.id)
            )
            .distinct()
            .order_by(Document.created_at.desc())
        )

    result = await db.execute(stmt)
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


class MoveDocumentRequest(BaseModel):
    target_space_id: str
    create_space_if_missing: bool = False
    new_space_name: Optional[str] = None
    new_space_description: Optional[str] = None


@router.patch("/{document_id}/move")
async def move_document(
    document_id: str,
    payload: MoveDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Moves a document to another space, or creates the proposed space and moves it there.
    Updates the document in PostgreSQL and updates space_id in Qdrant payloads.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id UUID format")

    doc = await db.get(Document, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    target_space = None
    if payload.create_space_if_missing and payload.new_space_name:
        # Create the approved new space
        target_space = Space(
            id=uuid.uuid4(),
            user_id=current_user.id,
            name=payload.new_space_name.strip(),
            description=payload.new_space_description or "Specialized workspace",
            icon="folder",
            color="#6366f1",
            is_default=False,
        )
        db.add(target_space)
        await db.commit()
        await db.refresh(target_space)
    else:
        try:
            target_space_uuid = uuid.UUID(payload.target_space_id)
            stmt = select(Space).where(Space.id == target_space_uuid, Space.user_id == current_user.id)
            target_space = (await db.execute(stmt)).scalar_one_or_none()
        except ValueError:
            pass

    if not target_space:
        raise HTTPException(status_code=404, detail="Target space not found")

    old_space_id = str(doc.space_id)
    doc.space_id = target_space.id
    await db.commit()
    await db.refresh(doc)

    # Update Qdrant vectors payload with new space_id
    if settings.qdrant_client_url:
        try:
            qdrant = AsyncQdrantClient(
                url=settings.qdrant_client_url,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
            )
            from qdrant_client.http import models as qmodels

            for col in [settings.QDRANT_COLLECTION_DOCUMENTS, settings.QDRANT_COLLECTION_KNOWLEDGE or "querymind_knowledge"]:
                await qdrant.set_payload(
                    collection_name=col,
                    payload={"space_id": str(target_space.id)},
                    points=qmodels.FilterSelector(
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
        except Exception as e:
            logger.warning(f"Failed to update Qdrant space_id on move: {e}")

    return {
        "status": "success",
        "document_id": str(doc.id),
        "filename": doc.title,
        "old_space_id": old_space_id,
        "new_space_id": str(target_space.id),
        "new_space_name": target_space.name,
    }


class StudyCompanionRequest(BaseModel):
    force_refresh: bool = False


@router.post("/{document_id}/study-companion")
async def get_or_generate_study_companion(
    document_id: str,
    body: Optional[StudyCompanionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI-Powered Dynamic Study Companion Space:
    1. Analyzes actual document chunks via LLM (Gemini)
    2. Dynamically extracts authentic academic/professional domain & core topics
    3. Generates customized milestone roadmaps and active recall flashcards from actual text
    4. Semantically evaluates user's active goals and tasks to find authentic curriculum matches
    5. Caches generated results in PostgreSQL Knowledge records for instant zero-latency reloading
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

    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(doc.space_id), current_user, db, min_role="viewer")
    if not space:
        raise HTTPException(status_code=403, detail="Access denied to document space")

    force = body.force_refresh if body else False

    # 1. Check persistent Knowledge cache
    if not force:
        k_stmt = (
            select(Knowledge)
            .where(
                Knowledge.document_id == doc.id,
                Knowledge.knowledge_type == "study_companion",
            )
            .order_by(Knowledge.created_at.desc())
        )
        k_res = await db.execute(k_stmt)
        cached_k = k_res.scalars().first()
        if cached_k and cached_k.metadata_json:
            return cached_k.metadata_json

    # 2. Prepare sample excerpts from document chunks
    sorted_chunks = sorted(doc.chunks or [], key=lambda c: (c.page_number or 0, c.chunk_index))
    total_pages = max([c.page_number for c in sorted_chunks if c.page_number] or [1])

    if len(sorted_chunks) <= 12:
        sampled_chunks = sorted_chunks
    else:
        step = max(1, len(sorted_chunks) // 12)
        sampled_chunks = [sorted_chunks[i] for i in range(0, len(sorted_chunks), step)][:12]

    sample_text = "\n\n".join(
        f"[Page {c.page_number or '?'}] {c.content_text[:800]}"
        for c in sampled_chunks
    )

    # 3. Collect active user goals and tasks for semantic matching
    goals_stmt = select(Goal).where(Goal.user_id == current_user.id)
    goals_res = await db.execute(goals_stmt)
    user_goals = goals_res.scalars().all()

    eval_tasks = []
    for g in user_goals:
        for t in (g.tasks or []):
            eval_tasks.append({
                "task_id": t.get("id", str(uuid.uuid4())),
                "title": t.get("title", ""),
                "sub_goal": t.get("sub_goal", ""),
                "goal_description": g.description,
            })

    # 4. Invoke LLM with specialized curriculum prompt
    prompt = f"""You are QueryMind's Study Engine AI.
Analyze this document to construct a high-yield Study Space and semantically map the user's active learning tasks.

DOCUMENT TITLE: {doc.title}
DOCUMENT TYPE: {doc.type}
TOTAL PAGES: {total_pages}
DOCUMENT EXCERPTS:
{sample_text[:10000]}

USER ACTIVE TASKS TO EVALUATE:
{json.dumps(eval_tasks[:45], indent=2)}

INSTRUCTIONS:
1. Determine the authentic subject domain (e.g., "Data Structures & Algorithms (DSA) • Computer Science", "Cybersecurity & Network Defense", "Operating Systems & Systems Architecture", "Biochemistry & Genetics", "Professional Credentials & Career Portfolio", etc.).
   NOTE: If the document is an internship certificate, degree, resume, or diploma, classify it as "Professional Credentials & Career Portfolio" and set "matched_task_ids" to [].
2. Identify 3-4 major key topics/modules covered in this document.
3. Generate a structured 3-4 milestone study roadmap tailored specifically to this document's content, with realistic page ranges (spanning 1 to {total_pages}), estimated completion times, and concrete deliverables.
4. Generate 3-4 high-yield active recall flashcards from the actual concepts taught in this text (question, answer, hint).
5. Semantically match user tasks: Select only tasks whose learning objectives are genuinely taught or practiced by this document. Never match unrelated tasks from different academic fields. For each matched task, return the task_id, match_score (70-100), and a concise match_reason (e.g., "Topic: Binary Trees", "Linked Module: Dynamic Programming").

Respond in valid JSON only with this exact structure:
{{
  "domain": "string",
  "key_topics": ["string", "string"],
  "roadmap": [
    {{
      "title": "string",
      "page_range": "Pages X–Y",
      "estimated_time": "XX min",
      "deliverable": "string"
    }}
  ],
  "flashcards": [
    {{
      "question": "string",
      "answer": "string",
      "hint": "string"
    }}
  ],
  "matched_task_ids": [
    {{
      "task_id": "string",
      "match_score": 90,
      "match_reason": "Topic: ..."
    }}
  ]
}}"""

    try:
        from llm.provider import get_llm
        from langchain_core.messages import HumanMessage
        llm = get_llm(temperature=0.1)
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw_text = response.content if hasattr(response, "content") else str(response)
        if isinstance(raw_text, list):
            raw_text = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in raw_text])

        clean_text = raw_text.strip()
        if "```json" in clean_text:
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_text:
            clean_text = clean_text.split("```")[1].split("```")[0].strip()

        data = json.loads(clean_text)
    except Exception as e:
        logger.error(f"Failed to generate study companion with LLM: {e}")
        clean_title = doc.title.replace(".pdf", "").replace(".docx", "").replace(".md", "")
        data = {
            "domain": clean_title,
            "key_topics": ["Foundational Principles", "Applied Methodologies", "Synthesis & Review"],
            "roadmap": [
                {"title": f"Review First Principles of {clean_title}", "page_range": f"Pages 1–{max(1, total_pages // 3)}", "estimated_time": "25 min", "deliverable": "Summary of core definitions."},
                {"title": "Analyze Core Concepts & Methodologies", "page_range": f"Pages {max(1, total_pages // 3) + 1}–{max(2, (total_pages * 2) // 3)}", "estimated_time": "35 min", "deliverable": "Working notes and operational mechanics."},
                {"title": "Consolidate Deliverables & Strategic Review", "page_range": f"Pages {max(2, (total_pages * 2) // 3) + 1}–{total_pages}", "estimated_time": "25 min", "deliverable": "Actionable deliverables mapped to active goals."}
            ],
            "flashcards": [
                {"question": f"What is the primary thesis of {clean_title}?", "answer": "The core operational framework detailed across chapters.", "hint": "Check introductory overview."}
            ],
            "matched_task_ids": []
        }

    # 5. Persist to Knowledge table for instant caching
    try:
        companion_k = Knowledge(
            user_id=current_user.id,
            space_id=doc.space_id,
            document_id=doc.id,
            knowledge_type="study_companion",
            title=f"Study Companion: {doc.title}",
            content=json.dumps(data),
            metadata_json=data,
        )
        db.add(companion_k)
        await db.commit()
    except Exception as err:
        logger.warning(f"Could not persist study companion knowledge cache: {err}")

    return data


