"""
QueryMind - API Dependencies
Provides database sessions with injected Supabase JWT context for RLS.
"""

import json
import logging
from fastapi import Depends, HTTPException, status, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from jose import jwt, JWTError

from core.config import settings
from database.postgres import async_session
from models.user import User

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_raw_db_session() -> AsyncSession:
    """Provides a raw database session without RLS context (internal use)."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_current_supabase_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Verify Supabase JWT token and return the payload.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials (missing sub)",
            )
        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

async def get_db(payload: dict = Depends(get_current_supabase_user)) -> AsyncSession:
    """
    Dependency to get a database session with Supabase RLS context injected.
    This guarantees that the actual PostgreSQL engine enforces the RLS policies 
    based on the user's session, not just Python-level checks.
    """
    async with async_session() as session:
        try:
            # The context is injected per-transaction
            # We must use safe parameterization to prevent SQL injection in the JWT string
            # PostgreSQL's set_config allows safe setting of local variables
            
            # 1. Set the role to authenticated
            await session.execute(text("SET LOCAL role = 'authenticated';"))
            
            # 2. Set the request.jwt.claims context safely
            claims_json = json.dumps(payload)
            
            # Using set_config to safely pass the JSON string without string interpolation vulnerabilities
            await session.execute(
                text("SELECT set_config('request.jwt.claims', :claims, true);"),
                {"claims": claims_json}
            )
            
            yield session
            
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            # The transaction ends here, automatically clearing the SET LOCAL variables.
            # When the connection returns to the pool, it will not leak the context.
            await session.close()

async def get_current_user(
    payload: dict = Depends(get_current_supabase_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Return the authenticated user from the local DB.
    Because `db` has RLS enabled via `get_db`, this will inherently only 
    return the user if auth.uid() matches their UUID anyway, 
    but we do a strict check on the `id` column directly.
    """
    supabase_id = payload.get("sub")

    stmt = select(User).where(User.id == supabase_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in local database.",
        )
        
    return user
