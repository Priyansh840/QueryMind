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
