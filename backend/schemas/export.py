"""
QueryMind - Export Schemas
Defines request and response schemas for single and bulk file exports.
"""

import uuid
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class BulkExportRequest(BaseModel):
    conversation_ids: List[uuid.UUID] = Field(..., min_length=1, description="List of conversation IDs to export")
    format: Literal["markdown", "json", "pdf", "zip"] = Field("zip", description="Export target format")
    include_citations: bool = Field(True, description="Whether to include citation metadata in export")


class BulkDownloadRequest(BaseModel):
    document_ids: List[uuid.UUID] = Field(..., min_length=1, description="List of document IDs to bundle into ZIP")


class KnowledgeExportRequest(BaseModel):
    space_id: Optional[uuid.UUID] = Field(None, description="Space ID filter (optional)")
    format: Literal["csv", "json", "markdown"] = Field("json", description="Knowledge export format")


class AnalysisExportRequest(BaseModel):
    title: Optional[str] = Field("Cross-Document Analysis Report", description="Report title")
    analysis_data: Dict[str, Any] = Field(..., description="Document analysis JSON result payload")
    format: Literal["markdown", "pdf", "json"] = Field("markdown", description="Target format for report")


class CustomDocumentExportRequest(BaseModel):
    title: str = Field("Generated Document", description="Document title")
    content: str = Field(..., description="Document body content")
    author: Optional[str] = Field(None, description="Author or user name")
    format: Literal["pdf", "markdown", "json"] = Field("pdf", description="Target format")
