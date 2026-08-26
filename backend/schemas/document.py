"""
QueryMind - Document Schemas
Pydantic response models for documents, chunks, and search results.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content_text: str
    page_number: Optional[int] = None
    token_count: Optional[int] = None
    embedding_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: str
    space_id: str
    title: str
    file_url: str
    type: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []


class DocumentSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    space_id: str
    top_k: int = Field(5, ge=1, le=20)


class DocumentSearchResult(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    score: float
    page_number: Optional[int] = None
    document_title: Optional[str] = None
    source_type: str = "document"
