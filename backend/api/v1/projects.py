"""
QueryMind - Projects Router
Authenticated project management endpoints.
User identity is derived strictly from the validated Supabase JWT token.
"""

import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_user
from models.core import Project, Space
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class ProjectCreateRequest(BaseModel):
    space_id: str
    name: str = Field(..., min_length=1, max_length=255)


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[str] = Field(None, max_length=50)


class ProjectResponse(BaseModel):
    id: str
    space_id: str
    name: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Project.
    Must verify the target space belongs to the authenticated user.
    """
    try:
        space_uuid = uuid.UUID(request.space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    # Verify Space Ownership
    stmt = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    result = await db.execute(stmt)
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found or unauthorized")

    new_project = Project(
        id=uuid.uuid4(),
        space_id=space.id,
        name=request.name.strip(),
        status="active",
        created_at=datetime.utcnow()
    )
    db.add(new_project)
    
    try:
        await db.commit()
        await db.refresh(new_project)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating project: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create project",
        )

    return ProjectResponse(
        id=str(new_project.id),
        space_id=str(new_project.space_id),
        name=new_project.name,
        status=new_project.status,
        created_at=new_project.created_at,
    )


@router.get("", response_model=List[ProjectResponse])
@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    space_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List projects for the authenticated user, optionally filtered by space_id.
    """
    stmt = select(Project).join(Space, Project.space_id == Space.id).where(Space.user_id == current_user.id)
    
    if space_id:
        try:
            space_uuid = uuid.UUID(space_id)
            stmt = stmt.where(Project.space_id == space_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid space_id UUID format")
            
    stmt = stmt.order_by(Project.created_at.desc())
    result = await db.execute(stmt)
    projects = result.scalars().all()

    return [
        ProjectResponse(
            id=str(p.id),
            space_id=str(p.space_id),
            name=p.name,
            status=p.status,
            created_at=p.created_at,
        )
        for p in projects
    ]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        p_uuid = uuid.UUID(project_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid project_id UUID format")

    stmt = select(Project).join(Space, Project.space_id == Space.id).where(
        Project.id == p_uuid, Space.user_id == current_user.id
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=str(project.id),
        space_id=str(project.space_id),
        name=project.name,
        status=project.status,
        created_at=project.created_at,
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    request: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        p_uuid = uuid.UUID(project_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid project_id UUID format")

    stmt = select(Project).join(Space, Project.space_id == Space.id).where(
        Project.id == p_uuid, Space.user_id == current_user.id
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if request.name is not None:
        project.name = request.name.strip()
    if request.status is not None:
        project.status = request.status.strip()

    try:
        await db.commit()
        await db.refresh(project)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating project: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update project")

    return ProjectResponse(
        id=str(project.id),
        space_id=str(project.space_id),
        name=project.name,
        status=project.status,
        created_at=project.created_at,
    )


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        p_uuid = uuid.UUID(project_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid project_id UUID format")

    stmt = select(Project).join(Space, Project.space_id == Space.id).where(
        Project.id == p_uuid, Space.user_id == current_user.id
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()

    return {"status": "success", "message": f"Project {project_id} deleted successfully"}
