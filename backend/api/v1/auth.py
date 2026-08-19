"""
QueryMind - Auth Router
Handles synchronization of Supabase users with the local PostgreSQL database.
Identity is strictly derived from the validated Supabase JWT token.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from api.deps import get_current_supabase_user, get_current_user, get_db
from models.user import User
from models.core import Space

router = APIRouter()


class UserSyncRequest(BaseModel):
    email: str
    display_name: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    request: UserSyncRequest,
    payload: dict = Depends(get_current_supabase_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Syncs a Supabase authenticated user with our local database.
    Identity comes strictly from the validated JWT 'sub' claim.
    """
    sub_str = payload.get("sub")
    if not sub_str:
        raise HTTPException(status_code=400, detail="Invalid token payload (missing sub)")

    try:
        user_uuid = uuid.UUID(sub_str)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid sub UUID format in token")

    # Check if user already exists by canonical id (matching auth.users.id)
    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Determine email, display_name, and avatar_url
    email = payload.get("email") or request.email
    user_meta = payload.get("user_metadata") or {}
    display_name = (
        request.display_name
        or user_meta.get("full_name")
        or user_meta.get("display_name")
    )
    avatar_url = request.avatar_url or user_meta.get("avatar_url")

    if user:
        # Idempotent update of profile fields
        user.email = email
        if display_name is not None:
            user.display_name = display_name
        if avatar_url is not None:
            user.avatar_url = avatar_url
    else:
        user = User(
            id=user_uuid,
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
        )
        db.add(user)
        await db.flush()

    # Ensure default General space exists for this user (idempotent)
    stmt_space = select(Space).where(Space.user_id == user.id, Space.is_default == True)
    res_space = await db.execute(stmt_space)
    default_space = res_space.scalar_one_or_none()

    if not default_space:
        stmt_gen = select(Space).where(Space.user_id == user.id, Space.name == "General")
        res_gen = await db.execute(stmt_gen)
        gen_space = res_gen.scalar_one_or_none()
        if gen_space:
            gen_space.is_default = True
        else:
            default_space = Space(
                id=uuid.uuid4(),
                user_id=user.id,
                name="General",
                slug="general",
                description="Default personal workspace",
                icon="folder",
                color="#3B82F6",
                is_default=True,
            )
            db.add(default_space)

    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile.
    Identity comes strictly from JWT and verified local database existence.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
    )
