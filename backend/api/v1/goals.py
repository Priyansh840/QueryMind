"""
QueryMind - Goals Router
Authenticated goal management endpoints scoped to spaces and projects.
User identity is derived strictly from the validated Supabase JWT token.
"""

import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_user, get_space_membership
from models.core import Goal, Project, Space
from models.space_member import SpaceMember
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class GoalCreateRequest(BaseModel):
    description: str = Field(..., min_length=1)
    space_id: Optional[str] = None
    project_id: Optional[str] = None
    tasks: Optional[List[dict]] = None
    category: Optional[str] = "career"
    priority: Optional[str] = "medium"
    target_date: Optional[str] = None


class GoalUpdateRequest(BaseModel):
    description: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = Field(None, max_length=50)
    tasks: Optional[List[dict]] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    target_date: Optional[str] = None


class GoalResponse(BaseModel):
    id: str
    user_id: str
    space_id: Optional[str] = None
    project_id: Optional[str] = None
    description: str
    status: str
    tasks: Optional[List[dict]] = []
    category: Optional[str] = "career"
    priority: Optional[str] = "medium"
    target_date: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecommendTasksRequest(BaseModel):
    goal_description: str = Field(..., min_length=2)
    space_id: Optional[str] = None
    space_ids: Optional[List[str]] = None
    category: Optional[str] = "career"


class RecommendedTaskItem(BaseModel):
    title: str
    priority: str = Field("medium", description="high, medium, or low")
    reasoning: Optional[str] = None


class RecommendTasksResponse(BaseModel):
    goal: str
    suggested_tasks: List[RecommendedTaskItem]
    context_used: Optional[str] = None


class GoalChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class GoalChatCitation(BaseModel):
    document_title: Optional[str] = None
    page_number: Optional[int] = None
    snippet: str
    score: Optional[float] = None


class GoalChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: Optional[List[GoalChatMessage]] = []
    goal_description: Optional[str] = None
    progress: Optional[int] = None
    tasks: Optional[List[dict]] = []
    target_date: Optional[str] = None
    space_ids: Optional[List[str]] = []


class GoalChatResponse(BaseModel):
    response: str
    citations: List[GoalChatCitation] = []
    spaces_searched: List[str] = []

# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    request: GoalCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Goal scoped to a Space (and optional Project).
    Requires at least 'member' role in the target space.
    """
    project_uuid = None
    project = None
    target_space_id = None

    if request.project_id:
        try:
            project_uuid = uuid.UUID(request.project_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid project_id UUID format")
            
        stmt = select(Project).where(Project.id == project_uuid)
        result = await db.execute(stmt)
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Verify Space membership for the project's space
        try:
            space, _ = await get_space_membership(str(project.space_id), current_user, db, min_role="member")
            target_space_id = space.id
        except HTTPException as exc:
            if "insufficient permissions" not in str(exc.detail).lower():
                raise HTTPException(status_code=404, detail="Project not found")
            raise

        if request.space_id and str(request.space_id) != str(target_space_id):
            raise HTTPException(status_code=400, detail="Provided space_id does not match project space_id")

    elif request.space_id:
        space, _ = await get_space_membership(request.space_id, current_user, db, min_role="member")
        target_space_id = space.id

    else:
        # Standalone goal without space or project linkage
        target_space_id = None

    new_goal = Goal(
        id=uuid.uuid4(),
        user_id=current_user.id,
        space_id=target_space_id,
        project_id=project_uuid,
        description=request.description.strip(),
        status="active",
        tasks=request.tasks or [],
        category=request.category or "career",
        priority=request.priority or "medium",
        target_date=request.target_date,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_goal)
    await db.flush()

    if target_space_id:
        from repositories.outcomes import OutcomeRepository
        await OutcomeRepository.create(
            db,
            space_id=target_space_id,
            user_id=current_user.id,
            target_entity_type="goal",
            target_entity_id=new_goal.id,
            initiated_by="human",
            status="unknown",
            expected_outcome=f"Create goal: '{new_goal.description}'",
            actual_outcome=None,
            state_delta={
                "before": None,
                "after": {
                    "id": str(new_goal.id),
                    "description": new_goal.description,
                    "status": new_goal.status,
                    "tasks": new_goal.tasks,
                    "category": new_goal.category,
                    "priority": new_goal.priority,
                    "target_date": new_goal.target_date,
                    "space_id": str(target_space_id),
                    "project_id": str(project_uuid) if project_uuid else None,
                },
            },
            auto_commit=False,
        )
    
    try:
        await db.commit()
        await db.refresh(new_goal)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating goal: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create goal",
        )

    return GoalResponse(
        id=str(new_goal.id),
        user_id=str(new_goal.user_id),
        space_id=str(new_goal.space_id) if new_goal.space_id else None,
        project_id=str(new_goal.project_id) if new_goal.project_id else None,
        description=new_goal.description,
        status=new_goal.status,
        tasks=new_goal.tasks or [],
        category=new_goal.category or "career",
        priority=new_goal.priority or "medium",
        target_date=new_goal.target_date,
        created_at=new_goal.created_at,
    )


@router.get("", response_model=List[GoalResponse])
@router.get("/", response_model=List[GoalResponse])
async def list_goals(
    project_id: Optional[str] = None,
    space_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List goals accessible to the authenticated user within a space, project, or across user spaces.
    """
    if space_id:
        space, _ = await get_space_membership(space_id, current_user, db, min_role="viewer")
        stmt = select(Goal).where(Goal.space_id == space.id)
        if project_id:
            try:
                p_uuid = uuid.UUID(project_id)
                stmt = stmt.where(Goal.project_id == p_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid project_id UUID format")
    elif project_id:
        try:
            p_uuid = uuid.UUID(project_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project_id UUID format")
        p_res = await db.execute(select(Project).where(Project.id == p_uuid))
        project = p_res.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        await get_space_membership(str(project.space_id), current_user, db, min_role="viewer")
        stmt = select(Goal).where(Goal.project_id == p_uuid)
    else:
        # Accessible goals: created by user OR in spaces where user is owner/member
        stmt = (
            select(Goal)
            .outerjoin(SpaceMember, Goal.space_id == SpaceMember.space_id)
            .where(
                (Goal.user_id == current_user.id) | (SpaceMember.user_id == current_user.id)
            )
            .distinct()
        )
            
    stmt = stmt.order_by(Goal.created_at.desc())
    result = await db.execute(stmt)
    goals = result.scalars().all()

    return [
        GoalResponse(
            id=str(g.id),
            user_id=str(g.user_id),
            space_id=str(g.space_id) if g.space_id else None,
            project_id=str(g.project_id) if g.project_id else None,
            description=g.description,
            status=g.status,
            tasks=g.tasks or [],
            category=g.category or "career",
            priority=g.priority or "medium",
            target_date=g.target_date,
            created_at=g.created_at,
        )
        for g in goals
    ]


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        g_uuid = uuid.UUID(goal_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid goal_id UUID format")

    stmt = select(Goal).where(Goal.id == g_uuid)
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Enforce space-scoped authorization
    if goal.space_id:
        try:
            await get_space_membership(str(goal.space_id), current_user, db, min_role="viewer")
        except HTTPException as exc:
            if "insufficient permissions" not in str(exc.detail).lower():
                raise HTTPException(status_code=404, detail="Goal not found")
            raise
    elif goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    return GoalResponse(
        id=str(goal.id),
        user_id=str(goal.user_id),
        space_id=str(goal.space_id) if goal.space_id else None,
        project_id=str(goal.project_id) if goal.project_id else None,
        description=goal.description,
        status=goal.status,
        tasks=goal.tasks or [],
        category=goal.category or "career",
        priority=goal.priority or "medium",
        target_date=goal.target_date,
        created_at=goal.created_at,
    )


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    request: GoalUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        g_uuid = uuid.UUID(goal_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid goal_id UUID format")

    stmt = select(Goal).where(Goal.id == g_uuid)
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Enforce space-scoped update authorization (requires 'member' role in space)
    if goal.space_id:
        try:
            await get_space_membership(str(goal.space_id), current_user, db, min_role="member")
        except HTTPException as exc:
            if "insufficient permissions" not in str(exc.detail).lower():
                raise HTTPException(status_code=404, detail="Goal not found")
            raise
    elif goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    state_before = {
        "id": str(goal.id),
        "description": goal.description,
        "status": goal.status,
        "tasks": goal.tasks,
        "category": goal.category,
        "priority": goal.priority,
        "target_date": goal.target_date,
        "space_id": str(goal.space_id) if goal.space_id else None,
        "project_id": str(goal.project_id) if goal.project_id else None,
    }

    if request.description is not None:
        goal.description = request.description.strip()
    if request.status is not None:
        goal.status = request.status.strip()
    if request.tasks is not None:
        goal.tasks = request.tasks
    if request.category is not None:
        goal.category = request.category
    if request.priority is not None:
        goal.priority = request.priority
    if request.target_date is not None:
        goal.target_date = request.target_date

    state_after = {
        "id": str(goal.id),
        "description": goal.description,
        "status": goal.status,
        "tasks": goal.tasks,
        "category": goal.category,
        "priority": goal.priority,
        "target_date": goal.target_date,
        "space_id": str(goal.space_id) if goal.space_id else None,
        "project_id": str(goal.project_id) if goal.project_id else None,
    }

    target_space_id = goal.space_id
    if not target_space_id and goal.project_id:
        p_res = await db.execute(select(Project.space_id).where(Project.id == goal.project_id))
        target_space_id = p_res.scalar_one_or_none()

    if target_space_id:
        from repositories.outcomes import OutcomeRepository
        await OutcomeRepository.create(
            db,
            space_id=target_space_id,
            user_id=current_user.id,
            target_entity_type="goal",
            target_entity_id=goal.id,
            initiated_by="human",
            status="unknown",
            expected_outcome=f"Update goal status to '{goal.status}'",
            actual_outcome=None,
            state_delta={"before": state_before, "after": state_after},
            auto_commit=False,
        )

    try:
        await db.commit()
        await db.refresh(goal)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating goal: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update goal")

    return GoalResponse(
        id=str(goal.id),
        user_id=str(goal.user_id),
        space_id=str(goal.space_id) if goal.space_id else None,
        project_id=str(goal.project_id) if goal.project_id else None,
        description=goal.description,
        status=goal.status,
        tasks=goal.tasks or [],
        category=goal.category or "career",
        priority=goal.priority or "medium",
        target_date=goal.target_date,
        created_at=goal.created_at,
    )


@router.delete("/{goal_id}", status_code=status.HTTP_200_OK)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        g_uuid = uuid.UUID(goal_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid goal_id UUID format")

    stmt = select(Goal).where(Goal.id == g_uuid)
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Enforce space-scoped delete authorization (requires 'admin' role in space, or creator)
    if goal.space_id:
        try:
            await get_space_membership(str(goal.space_id), current_user, db, min_role="admin")
        except HTTPException as exc:
            if "insufficient permissions" not in str(exc.detail).lower():
                raise HTTPException(status_code=404, detail="Goal not found")
            raise
    elif goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    await db.delete(goal)
    await db.commit()

    return {"status": "success", "message": f"Goal {goal_id} deleted successfully"}


@router.post("/recommend-tasks", response_model=RecommendTasksResponse)
async def recommend_goal_tasks(
    request: RecommendTasksRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Uses LLM + RAG vector search to analyze the goal statement, retrieve relevant space documents/knowledge,
    and generate a breakdown of high-impact tasks prioritized by importance (high, medium, low).
    """
    import json
    from llm.provider import llm_service
    from rag.retriever import retrieve_context

    import asyncio
    context_snippets = []
    # If space_ids or space_id provided, search space knowledge chunks with a protective timeout
    target_space_ids = [s for s in (request.space_ids or []) if s]
    if request.space_id and request.space_id not in target_space_ids:
        target_space_ids.append(request.space_id)

    if target_space_ids:
        try:
            results = await asyncio.wait_for(
                retrieve_context(
                    query=request.goal_description,
                    user_id=str(current_user.id),
                    space_ids=target_space_ids,
                    top_k=4,
                ),
                timeout=3.5,
            )
            for r in results:
                if "content" in r:
                    context_snippets.append(r["content"][:300])
                elif "text" in r:
                    context_snippets.append(r["text"][:300])
        except Exception as e:
            logger.warning(f"Failed or timed out retrieving RAG context for goal recommendation: {e}")

    rag_context = "\n---\n".join(context_snippets) if context_snippets else "No specific space documents matched."

    system_prompt = (
        "You are an executive AI strategic planner for QueryMind. Your job is to break down a high-level goal "
        "into a structured set of 3 to 6 concrete, actionable tasks/milestones required to achieve the goal.\n"
        "Each task MUST have:\n"
        "- title: Clear, concise action title.\n"
        "- priority: 'high', 'medium', or 'low' indicating how critical it is to the core objective.\n"
        "- reasoning: 1 brief sentence explaining why this task is crucial.\n\n"
        "Return ONLY a valid JSON object matching this exact schema:\n"
        "{\n"
        '  "tasks": [\n'
        '    {"title": "...", "priority": "high"|"medium"|"low", "reasoning": "..."}\n'
        "  ]\n"
        "}\n"
        "Do not include any Markdown formatting around the JSON."
    )

    user_prompt = (
        f"Goal: {request.goal_description}\n"
        f"Category: {request.category or 'General'}\n\n"
        f"Relevant Knowledge Base Context:\n{rag_context}\n\n"
        "Generate the breakdown of recommended tasks."
    )

    suggested_tasks: List[RecommendedTaskItem] = []

    # Strategy 1: Dynamic LLM Generation with fastest available candidates
    import re
    import google.generativeai as genai
    from core.config import settings
    
    genai.configure(api_key=settings.GEMINI_API_KEY)
    gemini_candidates = [
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.6-flash",
    ]

    full_prompt = (
        f"{system_prompt}\n\n"
        f"Goal: {request.goal_description}\n"
        f"Category: {request.category or 'General'}\n"
        f"Relevant Context:\n{rag_context}\n\n"
        "Generate the breakdown of recommended tasks in the specified JSON format."
    )

    for model_name in gemini_candidates:
        try:
            logger.info(f"Attempting task recommendation using Gemini model: {model_name}")
            gen_model = genai.GenerativeModel(model_name=model_name)
            # Run synchronous generate_content in thread pool with 12s timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(gen_model.generate_content, full_prompt),
                timeout=12.0,
            )
            direct_text = response.text.strip()
            
            # Extract JSON block
            match = re.search(r"\{[\s\S]*\}", direct_text)
            if match:
                direct_text = match.group(0)

            parsed = json.loads(direct_text)
            task_list = parsed.get("tasks", [])
            for t in task_list:
                prio = str(t.get("priority", "medium")).lower()
                if prio not in ("high", "medium", "low"):
                    prio = "medium"
                suggested_tasks.append(
                    RecommendedTaskItem(
                        title=t.get("title", "Action Item"),
                        priority=prio,
                        reasoning=t.get("reasoning"),
                    )
                )
            if suggested_tasks:
                logger.info(f"Successfully generated {len(suggested_tasks)} dynamic tasks with {model_name}")
                break
        except Exception as cand_err:
            logger.warning(f"Candidate {model_name} failed or timed out: {cand_err}")
            continue

    # Fallback to Ollama or Raise if all LLMs failed (no hardcoded templates)
    if not suggested_tasks:
        logger.warning("Gemini models failed. Attempting local Ollama / LLM service fallback...")
        try:
            from llm.provider import llm_service
            raw_llm_out = await asyncio.wait_for(
                llm_service.generate(prompt=full_prompt),
                timeout=25.0,
            )
            match = re.search(r"\{[\s\S]*\}", raw_llm_out)
            if match:
                parsed = json.loads(match.group(0))
                for t in parsed.get("tasks", []):
                    prio = str(t.get("priority", "medium")).lower()
                    if prio not in ("high", "medium", "low"):
                        prio = "medium"
                    suggested_tasks.append(
                        RecommendedTaskItem(
                            title=t.get("title", "Action Item"),
                            priority=prio,
                            reasoning=t.get("reasoning"),
                        )
                    )
        except Exception as ollama_err:
            logger.error(f"Fallback LLM service failed: {ollama_err}")

    if not suggested_tasks:
        raise HTTPException(
            status_code=503,
            detail="AI model is currently busy or rate limited. Please try clicking 'AI Auto-Breakdown Tasks' again in a moment.",
        )

    return RecommendTasksResponse(
        goal=request.goal_description,
        suggested_tasks=suggested_tasks,
        context_used=f"{len(context_snippets)} relevant source documents consulted" if context_snippets else None,
    )


@router.post("/{goal_id}/chat", response_model=GoalChatResponse)
async def goal_chat(
    goal_id: str,
    request: GoalChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Goal-specific Chat Advisor with Space Scoped Retrieval.
    Searches documents exclusively in the spaces associated with this goal,
    and leverages the goal's real-time state, tasks, and progress to answer.
    """
    import asyncio
    import google.generativeai as genai
    from core.config import settings
    from rag.retriever import retrieve_context

    goal_uuid = None
    try:
        goal_uuid = uuid.UUID(goal_id)
    except (ValueError, TypeError):
        pass

    db_goal = None
    if goal_uuid:
        stmt = select(Goal).where(Goal.id == goal_uuid, Goal.user_id == current_user.id)
        result = await db.execute(stmt)
        db_goal = result.scalar_one_or_none()

    # Determine goal details
    goal_desc = request.goal_description or (db_goal.description if db_goal else "Personal Objective")
    target_date = request.target_date or "Flexible"
    progress = request.progress if request.progress is not None else 0

    # Determine spaces to search
    target_spaces = [s for s in (request.space_ids or []) if s]
    if db_goal and db_goal.space_id and str(db_goal.space_id) not in target_spaces:
        target_spaces.append(str(db_goal.space_id))

    citations: List[GoalChatCitation] = []
    rag_context = ""

    # 1. Scoped Space Retrieval
    if target_spaces:
        try:
            results = await asyncio.wait_for(
                retrieve_context(
                    query=request.message,
                    user_id=str(current_user.id),
                    space_ids=target_spaces,
                    top_k=5,
                ),
                timeout=4.0,
            )
            snippets = []
            for r in results:
                doc_title = r.get("document_title") or "Associated Knowledge Doc"
                content = r.get("content") or r.get("text") or ""
                page_num = r.get("page_number")
                score = r.get("score")
                if content:
                    snippet = content[:350]
                    snippets.append(f"[{doc_title}]: {snippet}")
                    citations.append(
                        GoalChatCitation(
                            document_title=doc_title,
                            page_number=page_num,
                            snippet=snippet,
                            score=score,
                        )
                    )
            if snippets:
                rag_context = "\n---\n".join(snippets)
        except Exception as e:
            logger.warning(f"Goal chat context retrieval failed or timed out: {e}")

    # Format Tasks Summary
    tasks_summary = "No subtasks recorded yet."
    if request.tasks:
        formatted_tasks = []
        for t in request.tasks:
            status_icon = "[DONE]" if t.get("completed") else "[TODO]"
            prio = t.get("priority", "medium")
            title = t.get("title", "Task")
            formatted_tasks.append(f"- {status_icon} ({prio}) {title}")
        tasks_summary = "\n".join(formatted_tasks)

    # 2. Build Executive AI Prompt
    system_prompt = (
        "You are QueryMind's executive AI Goal Coach and Strategic Advisor.\n"
        "You are having a focused working conversation with the user regarding their specific goal.\n"
        "You have direct access to their goal milestones and documents retrieved EXCLUSIVELY from their associated spaces.\n\n"
        f"=== CURRENT GOAL STATE ===\n"
        f"Goal: {goal_desc}\n"
        f"Progress: {progress}%\n"
        f"Target Date: {target_date}\n"
        f"Associated Spaces Filter: {', '.join(target_spaces) if target_spaces else 'None'}\n"
        f"Key Tasks / Subtasks:\n{tasks_summary}\n"
        f"===========================\n\n"
        "Guidelines:\n"
        "1. Give direct, actionable, and inspiring guidance tailored to the user's progress and tasks.\n"
        "2. If relevant documents were found in their associated spaces, ground your advice in those documents and cite them naturally.\n"
        "3. If they ask about next steps, suggest which subtask to tackle next based on priority or propose a new specific subtask.\n"
        "4. Keep your tone concise, strategic, and empowering."
    )

    user_prompt_parts = []
    if rag_context:
        user_prompt_parts.append(f"Retrieved Documents from Associated Spaces:\n{rag_context}\n")

    # Append brief recent conversation history if provided
    if request.history:
        user_prompt_parts.append("Conversation History:")
        for h in request.history[-6:]:
            role_tag = "User" if h.role == "user" else "Advisor"
            user_prompt_parts.append(f"{role_tag}: {h.content}")
        user_prompt_parts.append("")

    user_prompt_parts.append(f"User Query: {request.message}")
    full_user_prompt = "\n".join(user_prompt_parts)

    # 3. Fast Dynamic LLM Generation
    genai.configure(api_key=settings.GEMINI_API_KEY)
    gemini_candidates = [
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.6-flash",
    ]

    ai_reply = ""
    for model_name in gemini_candidates:
        try:
            gen_model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt,
            )
            response = await asyncio.wait_for(
                asyncio.to_thread(gen_model.generate_content, full_user_prompt),
                timeout=12.0,
            )
            ai_reply = response.text.strip()
            if ai_reply:
                break
        except Exception as cand_err:
            logger.warning(f"Candidate {model_name} in goal_chat failed: {cand_err}")
            continue

    if not ai_reply:
        # Fallback to local LLM service
        try:
            from llm.provider import llm_service
            ai_reply = await asyncio.wait_for(
                llm_service.generate(
                    prompt=full_user_prompt,
                    system_prompt=system_prompt,
                ),
                timeout=10.0,
            )
        except Exception as e:
            logger.error(f"Fallback LLM service failed in goal_chat: {e}")
            ai_reply = "I'm having trouble connecting to the intelligence model right now. Please try your question again in a moment."

    return GoalChatResponse(
        response=ai_reply,
        citations=citations,
        spaces_searched=target_spaces,
    )

