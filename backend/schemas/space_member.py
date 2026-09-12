"""
QueryMind - Space Members & Collaboration Schemas (Phase 13)
"""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


SpaceRoleType = Literal["owner", "admin", "member", "viewer"]


class SpaceMemberResponse(BaseModel):
    id: str
    space_id: str
    user_id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    role: SpaceRoleType
    invited_by_user_id: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SpaceMemberListResponse(BaseModel):
    space_id: str
    members: list[SpaceMemberResponse]
    total: int


class InviteSpaceMemberRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    role: SpaceRoleType = "member"


class UpdateSpaceMemberRoleRequest(BaseModel):
    role: SpaceRoleType


class TransferSpaceOwnershipRequest(BaseModel):
    target_user_id: str
