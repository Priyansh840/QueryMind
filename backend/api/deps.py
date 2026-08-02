"""
QueryMind - API Dependencies
Common dependencies for route handlers (DB session, auth, etc.)
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db


async def get_current_user():
    """
    Dependency to get the current authenticated user.
    Will be implemented with Supabase Auth JWT verification.
    """
    # TODO: Implement Supabase JWT verification
    pass
