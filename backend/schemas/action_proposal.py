"""
QueryMind - Action Proposals Schema DTOs (Step 9 Phase 4)
Defines clean Pydantic response models for querying, listing, and rejecting ActionProposal entities.
Excludes raw ORM models, internal database pointers, and sensitive trace data.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict


ActionProposalStatus = Literal["pending", "approved", "executed", "rejected", "failed"]


class ActionProposalResponse(BaseModel):
    """Clean API response model for a single ActionProposal entity."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Database primary key UUID of the action proposal")
    proposal_id: str = Field(description="Turn-level proposal identifier (e.g. prop-1)")
    user_id: uuid.UUID = Field(description="Owner user UUID")
    space_id: uuid.UUID = Field(description="Target workspace/space UUID")
    conversation_id: uuid.UUID = Field(description="Originating conversation UUID")
    message_id: uuid.UUID = Field(description="Originating assistant message UUID")
    objective_id: Optional[uuid.UUID] = Field(default=None, description="Associated orchestrator objective UUID")

    action_type: str = Field(description="Allowlisted action type")
    target_id: Optional[str] = Field(default=None, description="Target entity UUID if updating an existing record")
    parameters: dict = Field(default_factory=dict, description="Validated action parameters")

    reason: str = Field(description="Grounded explanation for the proposed action")
    source_recommendation: Optional[str] = Field(default=None, description="Recommendation reference")
    confidence: str = Field(default="medium", description="Confidence level")

    status: ActionProposalStatus = Field(description="Current lifecycle status")
    created_at: datetime = Field(description="Creation timestamp")
    approved_at: Optional[datetime] = Field(default=None, description="User approval timestamp")
    approved_by_user_id: Optional[uuid.UUID] = Field(default=None, description="UUID of the user who approved")
    executed_at: Optional[datetime] = Field(default=None, description="Execution timestamp")
    executed_target_id: Optional[str] = Field(default=None, description="Target UUID produced or updated by execution")
    error_code: Optional[str] = Field(default=None, description="Failure error code if execution failed")
    error_message: Optional[str] = Field(default=None, description="Safe error message summary")


class ActionProposalListResponse(BaseModel):
    """Paginated list response for ActionProposal entities."""
    items: List[ActionProposalResponse] = Field(default_factory=list, description="List of action proposals")
    total: int = Field(description="Total count matching the filter")
    limit: int = Field(description="Pagination limit")
    offset: int = Field(description="Pagination offset")


class DecisionEvidence(BaseModel):
    """Grounded evidence source attached to a decision."""
    document_id: Optional[uuid.UUID] = Field(default=None, description="Source document UUID")
    document_title: str = Field(description="Document title")
    chunk_id: Optional[str] = Field(default=None, description="Vector chunk ID")
    page_number: Optional[int] = Field(default=None, description="Page number in document")
    snippet: Optional[str] = Field(default=None, description="Relevant excerpt or ground truth")
    source_type: Optional[str] = Field(default="document", description="Source format or origin")


class DecisionTimelineEvent(BaseModel):
    """Chronological event in the decision & action lifecycle."""
    event_type: str = Field(description="e.g. analysis_completed, proposal_generated, approved, executed")
    title: str = Field(description="Human-readable event summary")
    timestamp: datetime = Field(description="Event timestamp")
    status: Optional[str] = Field(default=None, description="Event status")
    details: Optional[dict] = Field(default=None, description="Non-sensitive metadata")


class DecisionDetailResponse(BaseModel):
    """Comprehensive, grounded Decision Intelligence DTO connecting evidence, analysis, decision, and action."""
    id: uuid.UUID = Field(description="Action/Decision primary key UUID")
    proposal_id: str = Field(description="Turn identifier")
    space_id: uuid.UUID = Field(description="Space UUID")
    conversation_id: uuid.UUID = Field(description="Originating conversation UUID")
    conversation_title: Optional[str] = Field(default=None, description="Conversation title")
    message_id: uuid.UUID = Field(description="Message UUID")
    
    # Analysis & Decision
    title: str = Field(description="Decision title / headline")
    conclusion: str = Field(description="Synthesized conclusion / reasoning summary")
    action_type: str = Field(description="Proposed action type")
    parameters: dict = Field(default_factory=dict, description="Action parameters")
    confidence: str = Field(default="medium", description="Confidence level")
    status: ActionProposalStatus = Field(description="Current decision/action lifecycle state")

    # Traceable Evidence Chain (Zero fake data)
    evidence: List[DecisionEvidence] = Field(default_factory=list, description="Grounding citations and source chunks")
    
    # Outcome & Execution Result
    outcome: Optional[dict] = Field(default=None, description="Execution outcome details if completed")
    
    # Lifecycle Timeline
    timeline: List[DecisionTimelineEvent] = Field(default_factory=list, description="Chronological audit timeline")
    
    created_at: datetime = Field(description="Decision proposal creation timestamp")
    approved_at: Optional[datetime] = Field(default=None, description="Approval timestamp")
    executed_at: Optional[datetime] = Field(default=None, description="Execution timestamp")

