"""
QueryMind - API Dependencies
Common dependencies for route handlers (DB session, auth, etc.)
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db


import logging
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError

from core.config import settings
from database.postgres import get_db
from models.user import User

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_current_supabase_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Verify Supabase JWT token and return the payload.
    Does NOT check if the user exists in our local database.
    Useful for the /sync endpoint when a user logs in for the first time.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        supabase_id = payload.get("sub")
        if supabase_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

async def get_current_user(
    payload: dict = Depends(get_current_supabase_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Verify Supabase JWT token and return the authenticated user from the local DB.
    """
    supabase_id = payload.get("sub")

    # Find the user in our local database
    stmt = select(User).where(User.supabase_id == supabase_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in local database. Please sync user profile.",
        )
        
    return user

