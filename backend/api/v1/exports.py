"""
QueryMind - File Exports & Downloads API Router
Provides comprehensive single and bulk export capabilities:
- Conversations: Markdown (.md), JSON (.json), PDF (.pdf), ZIP (.zip)
- Documents: Single file download, bulk ZIP download
- Knowledge Items: CSV (.csv), JSON (.json), Markdown (.md)
- Multi-Document Analysis: Markdown (.md), PDF (.pdf), JSON (.json)
"""

import io
import os
import uuid
import logging
from typing import List, Optional, Literal
from datetime import datetime, timezone
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from api.deps import get_db, get_current_user
from api.deps import get_space_membership
from models.user import User
from models.conversation import Conversation, Message
from models.knowledge import Document, DocumentChunk, Knowledge
from models.core import Space
from schemas.export import (
    BulkExportRequest,
    BulkDownloadRequest,
    KnowledgeExportRequest,
    AnalysisExportRequest,
    CustomDocumentExportRequest,
)
from services.file_generator import FileGenerator

logger = logging.getLogger(__name__)
router = APIRouter()


def sanitize_filename(filename: str) -> str:
    """Replaces unsafe filename characters with underscores."""
    safe = "".join(c if c.isalnum() or c in ("-", "_", ".") else "_" for c in filename)
    return safe[:100] or "export"


@router.get("/conversations/{conversation_id}")
async def export_conversation(
    conversation_id: str,
    format: Literal["markdown", "json", "pdf"] = Query("markdown", description="Target export format"),
    include_citations: bool = Query(True, description="Include citations in export"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exports a single conversation as Markdown, JSON, or PDF."""
    try:
        c_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation_id format")

    stmt = select(Conversation).where(Conversation.id == c_uuid)
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Authorize access
    if conv.space_id:
        space, _ = await get_space_membership(str(conv.space_id), current_user, db, min_role="viewer")
        if not space:
            raise HTTPException(status_code=403, detail="Access denied to conversation space")
    elif conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to conversation")

    # Fetch messages in chronological order
    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    messages = msg_res.scalars().all()

    base_name = sanitize_filename(conv.title or f"conversation_{conversation_id[:8]}")

    if format == "markdown":
        content = FileGenerator.conversation_to_markdown(
            conversation_title=conv.title or "Conversation",
            conversation_id=str(conv.id),
            created_at=conv.created_at,
            messages=messages,
            include_citations=include_citations,
        )
        return Response(
            content=content,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.md"'},
        )

    elif format == "json":
        content = FileGenerator.conversation_to_json(
            conversation_title=conv.title or "Conversation",
            conversation_id=str(conv.id),
            space_id=str(conv.space_id),
            created_at=conv.created_at,
            messages=messages,
            include_citations=include_citations,
        )
        return Response(
            content=content,
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.json"'},
        )

    elif format == "pdf":
        pdf_bytes = FileGenerator.conversation_to_pdf(
            conversation_title=conv.title or "Conversation",
            conversation_id=str(conv.id),
            created_at=conv.created_at,
            messages=messages,
            include_citations=include_citations,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.pdf"'},
        )


@router.post("/conversations/bulk")
async def bulk_export_conversations(
    request: BulkExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exports multiple conversations bundled into a single ZIP archive."""
    archive_files = []

    for conv_id in request.conversation_ids:
        stmt = select(Conversation).where(Conversation.id == conv_id)
        res = await db.execute(stmt)
        conv = res.scalar_one_or_none()
        if not conv:
            continue

        # Check permission
        if conv.space_id:
            try:
                space, _ = await get_space_membership(str(conv.space_id), current_user, db, min_role="viewer")
                if not space:
                    continue
            except Exception:
                continue
        elif conv.user_id != current_user.id:
            continue

        msg_stmt = (
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.asc())
        )
        msg_res = await db.execute(msg_stmt)
        messages = msg_res.scalars().all()

        base_name = sanitize_filename(conv.title or f"conversation_{str(conv.id)[:8]}")

        target_fmt = "markdown" if request.format == "zip" else request.format

        if target_fmt == "markdown":
            content = FileGenerator.conversation_to_markdown(
                conversation_title=conv.title or "Conversation",
                conversation_id=str(conv.id),
                created_at=conv.created_at,
                messages=messages,
                include_citations=request.include_citations,
            )
            archive_files.append((f"{base_name}_{str(conv.id)[:6]}.md", content))

        elif target_fmt == "json":
            content = FileGenerator.conversation_to_json(
                conversation_title=conv.title or "Conversation",
                conversation_id=str(conv.id),
                space_id=str(conv.space_id),
                created_at=conv.created_at,
                messages=messages,
                include_citations=request.include_citations,
            )
            archive_files.append((f"{base_name}_{str(conv.id)[:6]}.json", content))

        elif target_fmt == "pdf":
            pdf_bytes = FileGenerator.conversation_to_pdf(
                conversation_title=conv.title or "Conversation",
                conversation_id=str(conv.id),
                created_at=conv.created_at,
                messages=messages,
                include_citations=request.include_citations,
            )
            archive_files.append((f"{base_name}_{str(conv.id)[:6]}.pdf", pdf_bytes))

    if not archive_files:
        raise HTTPException(status_code=404, detail="No authorized conversations found for export")

    zip_bytes = FileGenerator.create_zip_archive(archive_files)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    zip_filename = f"querymind_conversations_{timestamp}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
    )


@router.get("/documents/{document_id}")
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Downloads an uploaded document by ID (reads original file or reconstructs from chunks)."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    stmt = select(Document).options(selectinload(Document.chunks)).where(Document.id == doc_uuid)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Authorize space
    space, _ = await get_space_membership(str(doc.space_id), current_user, db, min_role="viewer")
    if not space:
        raise HTTPException(status_code=403, detail="Access denied to document space")

    clean_filename = sanitize_filename(doc.title or "downloaded_document")

    # 1. Try reading directly from disk if file_url exists
    if doc.file_url and os.path.exists(doc.file_url):
        with open(doc.file_url, "rb") as f:
            file_data = f.read()

        ext = os.path.splitext(doc.file_url)[1].lower()
        media_type = "application/pdf" if ext == ".pdf" else "application/octet-stream"

        return Response(
            content=file_data,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{clean_filename}"'},
        )

    # 2. Check UPLOAD_DIR by title or document id
    for test_dir in ["uploads", "."]:
        possible_path = os.path.join(test_dir, doc.title)
        if os.path.exists(possible_path) and os.path.isfile(possible_path):
            with open(possible_path, "rb") as f:
                file_data = f.read()
            return Response(
                content=file_data,
                media_type="application/octet-stream",
                headers={"Content-Disposition": f'attachment; filename="{clean_filename}"'},
            )

    # 3. Fallback: Reconstruct document from indexed chunks
    if doc.chunks and len(doc.chunks) > 0:
        sorted_chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)
        text_content = "\n\n".join(c.content_text for c in sorted_chunks)
        fallback_filename = f"{os.path.splitext(clean_filename)[0]}.txt"
        return Response(
            content=text_content.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{fallback_filename}"'},
        )

    raise HTTPException(status_code=404, detail="Document file content not found on server")


@router.post("/documents/bulk")
async def bulk_download_documents(
    request: BulkDownloadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bundles multiple documents into a single ZIP archive for bulk download."""
    archive_files = []

    for doc_id in request.document_ids:
        stmt = select(Document).options(selectinload(Document.chunks)).where(Document.id == doc_id)
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()
        if not doc:
            continue

        # Check authorization
        try:
            space, _ = await get_space_membership(str(doc.space_id), current_user, db, min_role="viewer")
            if not space:
                continue
        except Exception:
            continue

        clean_name = sanitize_filename(doc.title or f"document_{str(doc.id)[:8]}")

        # Check on-disk file
        file_bytes = None
        if doc.file_url and os.path.exists(doc.file_url):
            with open(doc.file_url, "rb") as f:
                file_bytes = f.read()
        elif doc.chunks and len(doc.chunks) > 0:
            sorted_chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)
            text_content = "\n\n".join(c.content_text for c in sorted_chunks)
            file_bytes = text_content.encode("utf-8")
            if not clean_name.endswith(".txt"):
                clean_name = f"{os.path.splitext(clean_name)[0]}.txt"

        if file_bytes:
            # Ensure unique filename in zip
            unique_filename = f"{str(doc.id)[:6]}_{clean_name}"
            archive_files.append((unique_filename, file_bytes))

    if not archive_files:
        raise HTTPException(status_code=404, detail="No authorized documents found to download")

    zip_bytes = FileGenerator.create_zip_archive(archive_files)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    zip_filename = f"querymind_documents_{timestamp}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
    )


@router.get("/knowledge")
async def export_knowledge(
    space_id: Optional[str] = Query(None, description="Filter knowledge by space ID"),
    format: Literal["csv", "json", "markdown"] = Query("json", description="Target export format"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exports structured knowledge items from the knowledge vault."""
    filters = []
    if space_id:
        space, _ = await get_space_membership(space_id, current_user, db, min_role="viewer")
        if not space:
            raise HTTPException(status_code=403, detail="Access denied to space")
        filters.append(Knowledge.space_id == space.id)
    else:
        filters.append(Knowledge.user_id == current_user.id)

    stmt = select(Knowledge).where(and_(*filters)).order_by(Knowledge.created_at.desc())
    res = await db.execute(stmt)
    items = res.scalars().all()

    serialized = [
        {
            "id": str(k.id),
            "concept": k.title or "Knowledge Item",
            "type": k.knowledge_type,
            "content": k.content,
            "confidence": k.confidence,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        }
        for k in items
    ]

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if format == "csv":
        csv_str = FileGenerator.knowledge_to_csv(serialized)
        return Response(
            content=csv_str,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="knowledge_vault_{timestamp}.csv"'},
        )
    elif format == "markdown":
        md_str = FileGenerator.knowledge_to_markdown(serialized)
        return Response(
            content=md_str,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="knowledge_vault_{timestamp}.md"'},
        )
    else:
        json_str = FileGenerator.knowledge_to_json(serialized)
        return Response(
            content=json_str,
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="knowledge_vault_{timestamp}.json"'},
        )


@router.post("/analysis")
async def export_analysis_report(
    request: AnalysisExportRequest,
    current_user: User = Depends(get_current_user),
):
    """Exports multi-document analysis output as Markdown, PDF, or JSON."""
    report_title = request.title or "Cross-Document Analysis Report"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_name = sanitize_filename(report_title)

    if request.format == "markdown":
        content = FileGenerator.analysis_to_markdown(request.analysis_data, title=report_title)
        return Response(
            content=content,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_{timestamp}.md"'},
        )

    elif request.format == "pdf":
        pdf_bytes = FileGenerator.analysis_to_pdf(request.analysis_data, title=report_title)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_{timestamp}.pdf"'},
        )

    else:
        json_str = json.dumps(request.analysis_data, indent=2, ensure_ascii=False)
        return Response(
            content=json_str,
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_{timestamp}.json"'},
        )


@router.post("/generate")
async def generate_custom_document(
    request: CustomDocumentExportRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Dynamically generates and downloads a custom formatted document as PDF, Markdown, or JSON.
    """
    doc_title = request.title or "Generated Document"
    safe_name = sanitize_filename(doc_title)
    author_name = request.author or current_user.display_name or current_user.email
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if request.format == "pdf":
        pdf_bytes = FileGenerator.custom_document_to_pdf(
            title=doc_title,
            content=request.content,
            author=author_name,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_{timestamp}.pdf"'},
        )

    elif request.format == "markdown":
        md_text = f"# {doc_title}\n\n**Author:** {author_name}\n**Date:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n\n---\n\n{request.content}\n"
        return Response(
            content=md_text,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_{timestamp}.md"'},
        )

    else:
        payload = {
            "title": doc_title,
            "author": author_name,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "content": request.content,
        }
        return Response(
            content=json.dumps(payload, indent=2, ensure_ascii=False),
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_{timestamp}.json"'},
        )

