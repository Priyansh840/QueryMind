"""
QueryMind - API Dependencies
Provides database sessions with injected Supabase JWT context for PostgreSQL RLS.
Supports both asymmetric JWKS (ES256/RS256) and symmetric (HS256) Supabase JWT tokens.
"""

import json
import logging
import uuid
import urllib.request
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from jose import jwt, JWTError

from core.config import settings
from database.postgres import async_session
from models.user import User

logger = logging.getLogger(__name__)
security = HTTPBearer()

# In-memory JWKS key cache
_JWKS_CACHE: dict = {}


def _get_jwk_key(kid: str | None) -> dict | None:
    """Fetches and caches the JWKS public keys from Supabase."""
    global _JWKS_CACHE
    if kid and kid in _JWKS_CACHE:
        return _JWKS_CACHE[kid]

    try:
        url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        anon_key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_KEY
        req = urllib.request.Request(url, headers={"apikey": anon_key})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            for key in data.get("keys", []):
                if "kid" in key:
                    _JWKS_CACHE[key["kid"]] = key

            if kid and kid in _JWKS_CACHE:
                return _JWKS_CACHE[kid]
    except Exception as e:
        logger.warning(f"Failed to fetch Supabase JWKS: {e}")

    return None


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
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """
    Verify Supabase JWT token and return the payload.
    Supports both ES256 (JWKS) and HS256 (JWT secret).
    """
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        kid = header.get("kid")

        if alg in ("ES256", "RS256"):
            key = _get_jwk_key(kid)
            if not key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Public key not found for token verification",
                )
            payload = jwt.decode(
                token,
                key,
                algorithms=[alg],
                audience="authenticated",
            )
        else:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )

        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials (missing sub)",
            )
        return payload
    except HTTPException:
        raise
    except JWTError as e:
        logger.error(f"JWT verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_db(payload: dict = Depends(get_current_supabase_user)) -> AsyncSession:
    """
    Dependency to get a database session with Supabase RLS context injected.
    Guarantees that the PostgreSQL engine enforces RLS policies based on user session.
    """
    async with async_session() as session:
        try:
            # 1. Set the request.jwt.claims context safely
            claims_json = json.dumps(payload)
            await session.execute(
                text("SELECT set_config('request.jwt.claims', :claims, true);"),
                {"claims": claims_json},
            )

            # 2. Set the role to authenticated if the role exists in the PostgreSQL environment
            await session.execute(
                text(
                    "DO $$ BEGIN "
                    "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN "
                    "EXECUTE 'SET LOCAL role = ''authenticated'''; "
                    "END IF; "
                    "END $$;"
                )
            )

            yield session

            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            # Transaction ends here, automatically clearing SET LOCAL variables.
            await session.close()


async def get_current_user(
    payload: dict = Depends(get_current_supabase_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Return the authenticated user from the local DB matching the JWT sub UUID.
    """
    sub_str = payload.get("sub")
    if not sub_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials (missing sub)",
        )

    try:
        user_uuid = uuid.UUID(sub_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format in token",
        )

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in local database. Please sync user first.",
        )

    return user
