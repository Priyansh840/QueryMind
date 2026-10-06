"""
QueryMind - Cross-Document Analysis Schemas
Defines request and response schemas for pattern identification, trend tracking, and contradiction detection.
"""

import uuid
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class PatternItem(BaseModel):
    title: str = Field(..., description="Name or title of identified cross-document pattern")
    description: str = Field(..., description="Detailed description of recurring theme or pattern")
    source_documents: List[str] = Field(default_factory=list, description="Titles or IDs of documents displaying this pattern")
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0")


class TrendItem(BaseModel):
    topic: str = Field(..., description="Subject or metric of trend")
    direction: Literal["up", "down", "neutral", "emerging"] = Field("neutral", description="Trend trajectory")
    description: str = Field(..., description="Explanation of evolution or trajectory across documents")
    time_period: Optional[str] = Field(None, description="Timeframe or chronologic progression detected")
    source_documents: List[str] = Field(default_factory=list, description="Source documents evidencing this trend")


class ContradictionItem(BaseModel):
    issue: str = Field(..., description="Point of disagreement or conflicting data")
    description: str = Field(..., description="Detailed explanation of the contradiction")
    conflicting_sources: List[Dict[str, Any]] = Field(default_factory=list, description="Document claims in conflict")
    suggested_resolution: Optional[str] = Field(None, description="Proposed reconciliation or verified perspective")


class DocumentAnalysisResult(BaseModel):
    executive_summary: str = Field(..., description="High-level synthesis of multi-document findings")
    documents_analyzed_count: int = Field(..., description="Total documents processed")
    document_titles: List[str] = Field(default_factory=list, description="Titles of documents analyzed")
    patterns: List[PatternItem] = Field(default_factory=list, description="Shared patterns and common themes")
    trends: List[TrendItem] = Field(default_factory=list, description="Temporal or thematic trends")
    contradictions: List[ContradictionItem] = Field(default_factory=list, description="Conflicting claims or divergences")
    recommendations: List[str] = Field(default_factory=list, description="Actionable insights or next steps")


class DocumentAnalysisRequest(BaseModel):
    document_ids: List[uuid.UUID] = Field(..., min_length=2, description="At least 2 document IDs to analyze")
    space_id: Optional[uuid.UUID] = Field(None, description="Optional space ID filter")
    focus_areas: Optional[List[str]] = Field(None, description="Optional focus areas: patterns, trends, contradictions, etc.")
    user_query: Optional[str] = Field(None, description="Optional guiding query or research question")


class DocumentComparisonRequest(BaseModel):
    doc_id_a: uuid.UUID = Field(..., description="First document ID")
    doc_id_b: uuid.UUID = Field(..., description="Second document ID")
    aspects: Optional[List[str]] = Field(None, description="Aspects to contrast (e.g. goals, metrics, methodology)")
