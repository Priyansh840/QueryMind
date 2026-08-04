"""
QueryMind - Auth Router
Handles synchronization of Supabase users with the local PostgreSQL database.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from api.deps import get_current_supabase_user, get_current_user
from database.postgres import get_db
from models.user import User

router = APIRouter()

class UserSyncRequest(BaseModel):
    email: str
    full_name: str
    avatar_url: str | None = None

class UserResponse(BaseModel):
    id: str
    supabase_id: str
    email: str
    full_name: str
    
    class Config:
        from_attributes = True

@router.post("/sync", response_model=UserResponse)
async def sync_user(
    request: UserSyncRequest,
    payload: dict = Depends(get_current_supabase_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Syncs a Supabase authenticated user with our local database.
    If the user doesn't exist, they are created.
    """
    supabase_id = payload.get("sub")
    if not supabase_id:
        raise HTTPException(status_code=400, detail="Invalid token payload")

    # Check if user already exists
    stmt = select(User).where(User.supabase_id == supabase_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        # Update details if necessary (optional)
        user.email = request.email
        user.full_name = request.full_name
        if request.avatar_url:
            user.avatar_url = request.avatar_url
    else:
        # Create new user
        user = User(
            supabase_id=supabase_id,
            email=request.email,
            full_name=request.full_name,
            avatar_url=request.avatar_url
        )
        db.add(user)
    
    await db.commit()
    await db.refresh(user)
    
    # Convert UUID to string for the response
    return UserResponse(
        id=str(user.id),
        supabase_id=user.supabase_id,
        email=user.email,
        full_name=user.full_name
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile.
    Requires that the user exists in the local database.
    """
    return UserResponse(
        id=str(current_user.id),
        supabase_id=current_user.supabase_id,
        email=current_user.email,
        full_name=current_user.full_name
    )
