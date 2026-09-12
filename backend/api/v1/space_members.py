"""
QueryMind - Space Members & Collaboration API (Phase 13)
Provides endpoints for member management, role updates, space departures, and ownership transfer.
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database.postgres import get_db
from api.deps import get_current_user, get_space_membership, check_role_permission
from models.user import User
from models.core import Space
from models.space_member import SpaceMember
from schemas.space_member import (
    SpaceMemberResponse,
    SpaceMemberListResponse,
    InviteSpaceMemberRequest,
    UpdateSpaceMemberRoleRequest,
    TransferSpaceOwnershipRequest,
)

from typing import List

router = APIRouter(prefix="/spaces", tags=["space-members"])


@router.get("/{space_id}/members", response_model=List[SpaceMemberResponse])
async def list_space_members(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all members in the Space with their roles and user identity.
    Requires at least 'viewer' access.
    """
    space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")

    stmt = (
        select(SpaceMember, User)
        .join(User, SpaceMember.user_id == User.id)
        .where(SpaceMember.space_id == space.id)
        .order_by(SpaceMember.created_at.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    members_res = []
    for member_row, user_row in rows:
        members_res.append(
            SpaceMemberResponse(
                id=str(member_row.id),
                space_id=str(member_row.space_id),
                user_id=str(user_row.id),
                email=user_row.email,
                display_name=user_row.display_name,
                avatar_url=user_row.avatar_url,
                role=member_row.role,
                invited_by_user_id=str(member_row.invited_by_user_id) if member_row.invited_by_user_id else None,
                created_at=member_row.created_at,
                updated_at=member_row.updated_at,
            )
        )

    return members_res


@router.post("/{space_id}/members", response_model=SpaceMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_space_member(
    space_id: str,
    payload: InviteSpaceMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add/Invite an existing user into the Space.
    Owner can assign: admin, member, viewer.
    Admin can assign: member, viewer.
    """
    space, current_membership = await get_space_membership(space_id, current_user, db, min_role="admin")

    # Hierarchy validation
    if current_membership.role == "admin" and payload.role in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot assign 'owner' or 'admin' roles.",
        )
    if payload.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign 'owner' via member invite. Use transfer-ownership instead.",
        )

    # Validate target user exists
    stmt_user = select(User).where(User.email == payload.email.lower().strip())
    res_user = await db.execute(stmt_user)
    target_user = res_user.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{payload.email}' does not exist in QueryMind.",
        )

    # Check for existing membership
    stmt_existing = select(SpaceMember).where(
        SpaceMember.space_id == space.id,
        SpaceMember.user_id == target_user.id,
    )
    res_existing = await db.execute(stmt_existing)
    existing_member = res_existing.scalar_one_or_none()

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this space.",
        )

    new_member = SpaceMember(
        id=uuid.uuid4(),
        space_id=space.id,
        user_id=target_user.id,
        role=payload.role,
        invited_by_user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)

    return SpaceMemberResponse(
        id=str(new_member.id),
        space_id=str(new_member.space_id),
        user_id=str(target_user.id),
        email=target_user.email,
        display_name=target_user.display_name,
        avatar_url=target_user.avatar_url,
        role=new_member.role,
        invited_by_user_id=str(current_user.id),
        created_at=new_member.created_at,
        updated_at=new_member.updated_at,
    )


@router.patch("/{space_id}/members/{target_user_id}", response_model=SpaceMemberResponse)
async def update_space_member_role(
    space_id: str,
    target_user_id: str,
    payload: UpdateSpaceMemberRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the role of an existing space member.
    Owner can modify any non-owner role.
    Admin can only modify member/viewer roles.
    """
    space, current_membership = await get_space_membership(space_id, current_user, db, min_role="admin")

    try:
        t_user_uuid = uuid.UUID(target_user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target user UUID")

    # Fetch target membership
    stmt_target = select(SpaceMember, User).join(User, SpaceMember.user_id == User.id).where(
        SpaceMember.space_id == space.id,
        SpaceMember.user_id == t_user_uuid,
    )
    res_target = await db.execute(stmt_target)
    row = res_target.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in space.")

    target_member, target_user = row

    if target_member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change the role of the space owner directly. Use transfer-ownership.",
        )

    # Admin restrictions
    if current_membership.role == "admin":
        if target_member.role == "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot modify fellow admins.")
        if payload.role in ("owner", "admin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot promote to admin or owner.")

    if payload.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign 'owner' via role patch.")

    target_member.role = payload.role
    target_member.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(target_member)

    return SpaceMemberResponse(
        id=str(target_member.id),
        space_id=str(target_member.space_id),
        user_id=str(target_user.id),
        email=target_user.email,
        display_name=target_user.display_name,
        avatar_url=target_user.avatar_url,
        role=target_member.role,
        invited_by_user_id=str(target_member.invited_by_user_id) if target_member.invited_by_user_id else None,
        created_at=target_member.created_at,
        updated_at=target_member.updated_at,
    )


@router.delete("/{space_id}/members/{target_user_id}", status_code=status.HTTP_200_OK)
async def remove_space_member(
    space_id: str,
    target_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a member from the space, or leave the space (self-removal).
    Owner cannot leave without transferring ownership.
    """
    space, current_membership = await get_space_membership(space_id, current_user, db, min_role="viewer")

    try:
        t_user_uuid = uuid.UUID(target_user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target user UUID")

    # Fetch target membership
    stmt_target = select(SpaceMember).where(
        SpaceMember.space_id == space.id,
        SpaceMember.user_id == t_user_uuid,
    )
    res_target = await db.execute(stmt_target)
    target_member = res_target.scalar_one_or_none()

    if not target_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in space.")

    is_self = current_user.id == t_user_uuid

    if target_member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner cannot be removed from the space. Transfer ownership first or delete the space.",
        )

    if is_self:
        # User is voluntarily leaving
        await db.delete(target_member)
        await db.commit()
        return {"status": "success", "message": "Successfully left the space."}

    # Removing someone else requires admin/owner privileges
    if not check_role_permission(current_membership.role, "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and owners can remove members.")

    if current_membership.role == "admin" and target_member.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot remove fellow admins.")

    await db.delete(target_member)
    await db.commit()
    return {"status": "success", "message": "Member removed from space."}


@router.post("/{space_id}/transfer-ownership", status_code=status.HTTP_200_OK)
async def transfer_space_ownership(
    space_id: str,
    payload: TransferSpaceOwnershipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Atomically transfers ownership of the Space:
    1. Current owner becomes 'admin'.
    2. Target member becomes 'owner'.
    3. spaces.user_id is updated to target user.
    Only the current space owner can execute this.
    """
    space, current_membership = await get_space_membership(space_id, current_user, db, min_role="owner")

    try:
        t_user_uuid = uuid.UUID(payload.target_user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target user UUID")

    if current_user.id == t_user_uuid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already the owner of this space.")

    # Locate target member
    stmt_target = select(SpaceMember).where(
        SpaceMember.space_id == space.id,
        SpaceMember.user_id == t_user_uuid,
    )
    res_target = await db.execute(stmt_target)
    target_member = res_target.scalar_one_or_none()

    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user must already be a member of the space before transferring ownership.",
        )

    # Atomic transaction
    space.user_id = t_user_uuid
    space.updated_at = datetime.utcnow()

    current_membership.role = "admin"
    current_membership.updated_at = datetime.utcnow()

    target_member.role = "owner"
    target_member.updated_at = datetime.utcnow()

    await db.commit()

    return {
        "status": "success",
        "message": "Ownership transferred successfully.",
        "new_owner_user_id": str(t_user_uuid),
        "previous_owner_role": "admin",
    }
