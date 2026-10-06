"""
QueryMind - Cross-Document Analysis API Router
Provides multi-document pattern discovery, trend tracking, and contradiction detection.
"""

import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_user
from models.user import User
from models.knowledge import Document
from schemas.analysis import (
    DocumentAnalysisRequest,
    DocumentAnalysisResult,
    DocumentComparisonRequest,
)
from services.document_analyzer import CrossDocumentAnalyzer

logger = logging.getLogger(__name__)
router = APIRouter()


async def _verify_documents_access(document_ids, current_user: User, db: AsyncSession):
    """Verifies that the current user has access to each document's space."""
    stmt = select(Document).where(Document.id.in_(document_ids))
    res = await db.execute(stmt)
    docs = res.scalars().all()
    if len(docs) < len(document_ids):
        found_ids = {d.id for d in docs}
        missing = [str(did) for did in document_ids if did not in found_ids]
        raise HTTPException(
            status_code=404,
            detail=f"Some documents were not found: {', '.join(missing)}",
        )

    from api.deps import get_space_membership
    for doc in docs:
        try:
            space, _ = await get_space_membership(str(doc.space_id), current_user, db, min_role="viewer")
            if not space:
                raise HTTPException(status_code=403, detail=f"Access denied to document '{doc.title}'")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=403, detail=f"Access denied to document '{doc.title}'")

    return docs


@router.post("/analyze", response_model=DocumentAnalysisResult)
async def analyze_documents(
    request: DocumentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Executes multi-document pattern and trend analysis across 2 or more documents."""
    await _verify_documents_access(request.document_ids, current_user, db)

    try:
        result = await CrossDocumentAnalyzer.analyze(
            document_ids=request.document_ids,
            db=db,
            focus_areas=request.focus_areas,
            user_query=request.user_query,
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Cross-document analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze/stream")
async def analyze_documents_stream(
    request: DocumentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Streams multi-document analysis progress via Server-Sent Events (SSE)."""
    await _verify_documents_access(request.document_ids, current_user, db)

    async def event_generator():
        try:
            async for chunk in CrossDocumentAnalyzer.analyze_stream(
                document_ids=request.document_ids,
                db=db,
                focus_areas=request.focus_areas,
                user_query=request.user_query,
            ):
                yield f"data: {chunk}\n\n"
        except Exception as e:
            logger.error(f"Error in analysis stream: {e}", exc_info=True)
            err_payload = json.dumps({"step": "error", "message": str(e), "progress": 100})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/compare")
async def compare_documents(
    request: DocumentComparisonRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Performs a head-to-head pairwise comparison between two documents."""
    await _verify_documents_access([request.doc_id_a, request.doc_id_b], current_user, db)

    try:
        result = await CrossDocumentAnalyzer.compare_two_documents(
            doc_id_a=request.doc_id_a,
            doc_id_b=request.doc_id_b,
            db=db,
            aspects=request.aspects,
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Pairwise comparison failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
