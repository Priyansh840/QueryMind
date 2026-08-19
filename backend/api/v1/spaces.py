"""
QueryMind - Spaces Router
Authenticated space / workspace management endpoints.
User identity is derived strictly from the validated Supabase JWT token.
"""

import re
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from api.deps import get_db, get_current_user
from core.config import settings
from models.core import Space
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class SpaceCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    is_default: bool = False


class SpaceUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    is_default: Optional[bool] = None


class SpaceResponse(BaseModel):
    id: str
    user_id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _slugify(name: str) -> str:
    """Normalizes space name to a URL-friendly slug."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    return slug or "space"


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(
    request: SpaceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Space for the authenticated user.
    user_id is strictly derived from the validated Supabase JWT token.
    """
    slug = request.slug or _slugify(request.name)

    # If this space is designated as default, unset any existing default for this user
    if request.is_default:
        await db.execute(
            update(Space)
            .where(Space.user_id == current_user.id, Space.is_default == True)
            .values(is_default=False, updated_at=datetime.utcnow())
        )

    new_space = Space(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=request.name.strip(),
        slug=slug,
        description=request.description,
        icon=request.icon,
        color=request.color,
        is_default=request.is_default,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_space)
    try:
        await db.commit()
        await db.refresh(new_space)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating space: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create space. Please verify unique name/slug constraints.",
        )

    return SpaceResponse(
        id=str(new_space.id),
        user_id=str(new_space.user_id),
        name=new_space.name,
        slug=new_space.slug,
        description=new_space.description,
        icon=new_space.icon,
        color=new_space.color,
        is_default=new_space.is_default,
        created_at=new_space.created_at,
        updated_at=new_space.updated_at,
    )


@router.get("", response_model=List[SpaceResponse])
@router.get("/", response_model=List[SpaceResponse])
async def list_spaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all spaces owned by the authenticated user.
    Ordered with the default space first, followed by creation order.
    """
    stmt = (
        select(Space)
        .where(Space.user_id == current_user.id)
        .order_by(Space.is_default.desc(), Space.created_at.asc())
    )
    result = await db.execute(stmt)
    spaces = result.scalars().all()

    return [
        SpaceResponse(
            id=str(s.id),
            user_id=str(s.user_id),
            name=s.name,
            slug=s.slug,
            description=s.description,
            icon=s.icon,
            color=s.color,
            is_default=s.is_default,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in spaces
    ]


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves a single space by ID.
    Returns 404 if not found or if not owned by the authenticated user.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    stmt = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    return SpaceResponse(
        id=str(space.id),
        user_id=str(space.user_id),
        name=space.name,
        slug=space.slug,
        description=space.description,
        icon=space.icon,
        color=space.color,
        is_default=space.is_default,
        created_at=space.created_at,
        updated_at=space.updated_at,
    )


@router.patch("/{space_id}", response_model=SpaceResponse)
async def update_space(
    space_id: str,
    request: SpaceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates space metadata (name, description, icon, color, slug, is_default).
    id, user_id, and created_at can NEVER be modified.
    Returns 404 if space is not owned by current user.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    stmt = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # If setting to default, unset existing default
    if request.is_default is True and not space.is_default:
        await db.execute(
            update(Space)
            .where(Space.user_id == current_user.id, Space.is_default == True)
            .values(is_default=False, updated_at=datetime.utcnow())
        )
        space.is_default = True
    elif request.is_default is False:
        space.is_default = False

    if request.name is not None:
        space.name = request.name.strip()
    if request.slug is not None:
        space.slug = request.slug.strip()
    if request.description is not None:
        space.description = request.description
    if request.icon is not None:
        space.icon = request.icon
    if request.color is not None:
        space.color = request.color

    space.updated_at = datetime.utcnow()

    try:
        await db.commit()
        await db.refresh(space)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating space: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update space",
        )

    return SpaceResponse(
        id=str(space.id),
        user_id=str(space.user_id),
        name=space.name,
        slug=space.slug,
        description=space.description,
        icon=space.icon,
        color=space.color,
        is_default=space.is_default,
        created_at=space.created_at,
        updated_at=space.updated_at,
    )


@router.delete("/{space_id}", status_code=status.HTTP_200_OK)
async def delete_space(
    space_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a space and performs controlled vector index cleanup.
    1. Authenticate user.
    2. Verify space ownership.
    3. Purge corresponding Qdrant vectors for this space.
    4. Delete space from PostgreSQL (cascading to documents, chunks, projects, knowledge).
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    stmt = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # Clean up vectors in Qdrant before PostgreSQL cascade
    if settings.qdrant_client_url:
        try:
            qdrant = AsyncQdrantClient(
                url=settings.qdrant_client_url,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
            )
            await qdrant.delete(
                collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="space_id",
                                match=qmodels.MatchValue(value=str(space_uuid)),
                            ),
                            qmodels.FieldCondition(
                                key="user_id",
                                match=qmodels.MatchValue(value=str(current_user.id)),
                            ),
                        ]
                    )
                ),
            )
            # Purge knowledge vectors
            knowledge_col = settings.QDRANT_COLLECTION_KNOWLEDGE or "querymind_knowledge"
            await qdrant.delete(
                collection_name=knowledge_col,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="space_id",
                                match=qmodels.MatchValue(value=str(space_uuid)),
                            ),
                            qmodels.FieldCondition(
                                key="user_id",
                                match=qmodels.MatchValue(value=str(current_user.id)),
                            ),
                        ]
                    )
                ),
            )
            logger.info(f"Purged Qdrant document and knowledge points for deleted space {space_id}")
        except Exception as q_err:
            logger.warning(f"Qdrant vector cleanup warning for space {space_id}: {q_err}")

    # Delete space from PostgreSQL (cascading to documents, chunks, knowledge, etc.)
    await db.delete(space)
    await db.commit()

    return {"status": "success", "message": f"Space {space_id} deleted successfully"}
