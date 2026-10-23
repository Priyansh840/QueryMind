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
    document_ids: Optional[List[str]] = None
    category: Optional[str] = "career"
    priority: Optional[str] = "medium"
    target_date: Optional[str] = None
    timeframe: Optional[str] = None


class GoalUpdateRequest(BaseModel):
    description: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = Field(None, max_length=50)
    tasks: Optional[List[dict]] = None
    document_ids: Optional[List[str]] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    target_date: Optional[str] = None
    timeframe: Optional[str] = None


class GoalResponse(BaseModel):
    id: str
    user_id: str
    space_id: Optional[str] = None
    project_id: Optional[str] = None
    description: str
    status: str
    tasks: Optional[List[dict]] = []
    document_ids: Optional[List[str]] = []
    category: Optional[str] = "career"
    priority: Optional[str] = "medium"
    target_date: Optional[str] = None
    timeframe: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecommendTasksRequest(BaseModel):
    goal_description: str = Field(..., min_length=2)
    space_id: Optional[str] = None
    space_ids: Optional[List[str]] = None
    document_ids: Optional[List[str]] = None
    category: Optional[str] = "career"
    timeframe: Optional[str] = None  # e.g. "3 days", "1 week", "2 weeks", "1 month", "3 months", "6 months"
    target_date: Optional[str] = None
    learning_style: Optional[str] = "hands_on"  # "hands_on", "fast_track", "academic"
    daily_commitment: Optional[str] = "2 hrs/day"  # e.g. "1-2 hrs/day", "3-4 hrs/day", "6-8 hrs/day"


class RecommendedTaskItem(BaseModel):
    title: str
    sub_goal: Optional[str] = Field("Core Objectives", description="Name of the specific sub-goal/module this task belongs to")
    priority: str = Field("medium", description="high, medium, or low")
    estimated_time: Optional[str] = Field(None, description="e.g. ~2 hrs, ~45 mins, Day 1")
    time_phase: Optional[str] = Field(None, description="e.g. Day 1, Week 1, Month 1")
    deliverable: Optional[str] = Field(None, description="Concrete output, proof of completion, or deliverable")
    tools: Optional[List[str]] = Field(default_factory=list, description="Relevant tools, platforms, or commands e.g. Wireshark, Nmap")
    reasoning: Optional[str] = None


class RecommendTasksResponse(BaseModel):
    goal: str
    timeframe: Optional[str] = None
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
    sub_goals: Optional[List[str]] = []
    document_ids: Optional[List[str]] = []
    target_date: Optional[str] = None
    space_ids: Optional[List[str]] = []


class GoalChatResponse(BaseModel):
    response: str
    citations: List[GoalChatCitation] = []
    spaces_searched: List[str] = []
    documents_searched: List[str] = []

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
        document_ids=request.document_ids or [],
        category=request.category or "career",
        priority=request.priority or "medium",
        target_date=request.timeframe or request.target_date,
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
                    "document_ids": new_goal.document_ids,
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
        document_ids=new_goal.document_ids or [],
        category=new_goal.category or "career",
        priority=new_goal.priority or "medium",
        target_date=new_goal.target_date,
        timeframe=new_goal.target_date,
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
            document_ids=g.document_ids or [],
            category=g.category or "career",
            priority=g.priority or "medium",
            target_date=g.target_date,
            timeframe=g.target_date,
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
        document_ids=goal.document_ids or [],
        category=goal.category or "career",
        priority=goal.priority or "medium",
        target_date=goal.target_date,
        timeframe=goal.target_date,
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
        "document_ids": goal.document_ids,
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
    if request.document_ids is not None:
        goal.document_ids = request.document_ids
    if request.category is not None:
        goal.category = request.category
    if request.priority is not None:
        goal.priority = request.priority
    if request.target_date is not None:
        goal.target_date = request.target_date
    elif request.timeframe is not None:
        goal.target_date = request.timeframe

    state_after = {
        "id": str(goal.id),
        "description": goal.description,
        "status": goal.status,
        "tasks": goal.tasks,
        "document_ids": goal.document_ids,
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
        document_ids=goal.document_ids or [],
        category=goal.category or "career",
        priority=goal.priority or "medium",
        target_date=goal.target_date,
        timeframe=goal.target_date,
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

    target_doc_ids = [d for d in (request.document_ids or []) if d]

    if target_space_ids:
        try:
            results = await asyncio.wait_for(
                retrieve_context(
                    query=request.goal_description,
                    user_id=str(current_user.id),
                    space_ids=target_space_ids,
                    document_ids=target_doc_ids or None,
                    top_k=4,
                ),
                timeout=3.5,
            )
            for r in results:
                # Only include snippets with high semantic relevance (score >= 0.60)
                # Low scores (< 0.60) indicate noisy or unrelated space documents
                if r.get("score", 0.0) >= 0.60:
                    text_content = r.get("content") or r.get("text") or ""
                    if text_content.strip():
                        context_snippets.append(f"[{r.get('document_title', 'Document')}]: {text_content[:350]}")
        except Exception as e:
            logger.warning(f"Failed or timed out retrieving RAG context for goal recommendation: {e}")

    rag_context = "\n---\n".join(context_snippets) if context_snippets else "No directly matching workspace documents found for this goal."

    effective_timeframe = (request.timeframe or request.target_date or "Flexible pace (approx. 2-3 weeks)").strip()
    daily_commitment = (request.daily_commitment or "2 hrs/day").strip()
    learning_style = (request.learning_style or "hands_on").lower()

    if learning_style == "hands_on":
        style_directive = (
            "PEDAGOGICAL DIRECTIVE - HANDS-ON LABS & DELIVERABLES (STRICT ZERO-FLUFF):\n"
            "- BAN PASSIVE ACADEMIC WORDS: NEVER use 'Study', 'Learn', 'Understand', or 'Read' as task verbs!\n"
            "- USE ACTION & TOOL VERBS: Use aggressive, practical verbs: 'Capture', 'Scan', 'Exploit', 'Crack', 'Configure', 'Build', 'Deploy', 'Solve'.\n"
            "- INTEGRATE REAL-WORLD TOOLS & PLATFORMS: Identify concrete industry tools in the 'tools' list and task titles (e.g. Wireshark, Nmap, OverTheWire, PortSwigger, Burp Suite, CyberChef, Metasploit, Docker, Postman).\n"
            "- DEFINITION OF DONE (DELIVERABLE): Every single task MUST define a measurable 'deliverable' (proof of completion), e.g. 'Sniff and filter 3-way handshake SYN/ACK packets on port 80'.\n"
        )
    elif learning_style == "fast_track":
        style_directive = (
            "PEDAGOGICAL DIRECTIVE - 80/20 FAST TRACK SPRINT:\n"
            "- Focus exclusively on the 20% high-yield concepts that provide 80% of practical capability.\n"
            "- Bypass theoretical edge cases and history; focus on immediate tactical payoff.\n"
            "- Every task MUST include a concise 'deliverable' and practical 'tools'.\n"
        )
    else:
        style_directive = (
            "PEDAGOGICAL DIRECTIVE - RIGOROUS ACADEMIC & ARCHITECTURAL FOUNDATIONS:\n"
            "- Emphasize foundational architecture, mathematical/algorithmic rigor, and formal concepts.\n"
            "- Tasks should produce analytical deliverables and include essential tools.\n"
        )

    # Fetch user's verified skills for adaptive difficulty calibration
    user_skills_context = ""
    try:
        from models.skill import UserSkill
        skill_stmt = select(UserSkill).where(UserSkill.user_id == current_user.id)
        skill_res = await db.execute(skill_stmt)
        user_skills = skill_res.scalars().all()
        mastered = [f"{s.skill_name} ({s.level}, {s.xp} XP)" for s in user_skills if s.level in ("Proficient", "Mastery", "Competent")]
        if mastered:
            user_skills_context = (
                "ADAPTIVE SKILL CALIBRATION (USER'S VERIFIED COMPETENCIES):\n"
                f"- Mastered / Competent Topics: {', '.join(mastered)}\n"
                "- ADAPTIVE DIRECTIVE: The user has already proven competence in the above skills! "
                "Do NOT generate introductory or basic setup tasks for these topics. "
                "Assume mastery and accelerate the roadmap directly to subsequent tiers or advanced variations.\n\n"
            )
    except Exception as e:
        logger.warning(f"Could not load user skills for adaptive goal decomposition: {e}")

    system_prompt = (
        "You are an elite principal technical curriculum architect and real-world mentor for QueryMind.\n"
        "Your mission is to decompose a user's high-level goal into an authentic, highly practical, end-to-end LEARNING & EXECUTION ROADMAP.\n"
        "Every phase, sub-goal, task, and time estimate MUST BE 100% REALISTIC, RIGOROUS, AND GROUNDED IN REAL-WORLD ENGINEERING TIMELINES.\n\n"
        f"{style_directive}\n"
        f"{user_skills_context}"
        "CORE ARCHITECTURAL PRINCIPLES (ZERO COMPROMISES ON REALISM):\n"
        "1. FULL CALENDAR COVERAGE (ABSOLUTELY ZERO ABANDONED WEEKS OR GHOST DAYS):\n"
        f"   - Total Timeframe: '{effective_timeframe}'\n"
        f"   - User Daily Dedication: '{daily_commitment}'\n"
        "   - CALENDAR SPAN INVARIANT: The generated sub-goals and tasks MUST span the ENTIRE chronological duration of the goal from start to finish!\n"
        "     * If the timeframe is ~1 Month (4 weeks / 30 days):\n"
        "       You MUST create 4 distinct, consecutive weekly Sub-Goals spanning the full month:\n"
        "         - 'Week 1: [Core Foundations & Initial Mechanics]'\n"
        "         - 'Week 2: [Intermediate Patterns & Practical Drills]'\n"
        "         - 'Week 3: [Advanced Implementations & Complex Architectures]'\n"
        "         - 'Week 4: [Real-world System Integration & Portfolio Capstone]'\n"
        "       Each week MUST contain 3 to 4 actionable, focused tasks that account for that week's work.\n"
        "       DO NOT stop after Week 1 and leave Weeks 2, 3, 4 empty! The user must receive a complete, unbroken 4-week roadmap.\n"
        "     * If the timeframe is ~2 Weeks (14 days):\n"
        "       You MUST create 2 distinct weekly Sub-Goals ('Week 1: ...', 'Week 2: ...') with 3 to 4 tasks each covering all 14 days.\n"
        "     * If the timeframe is ~3 Months (or multi-month):\n"
        "       You MUST create 3 comprehensive monthly Sub-Goals ('Phase 1 (Month 1): ...', 'Phase 2 (Month 2): ...', 'Phase 3 (Month 3): ...') covering the full 90-day trajectory.\n"
        "       Assign 4 to 5 substantial milestone tasks per monthly phase (total 12 to 15 flagship deliverables across the entire roadmap) to maintain strategic clarity.\n"
        "     * If the timeframe is a Short Sprint (1 to 7 days):\n"
        "       Break down day-by-day ('Day 1: ...', 'Day 2: ...', etc.) accounting for every scheduled day.\n\n"
        "   - GLOBAL TASK COUNT ENVELOPE: Regardless of duration, generate between 12 to 16 total high-impact tasks across all sub-goals so the roadmap is exhaustive yet razor-focused and executes promptly without bloat.\n\n"
        "2. ORGANIC EFFORT & TIME DERIVATION (ZERO HARDCODED NUMBER TEMPLATES):\n"
        "   - Calculate the user's available time budget: (Days in Phase) × (Daily Dedication Hours).\n"
        "     * For example, at 2 hrs/day, 1 week = ~14 hours of focused work.\n"
        "     * At 6 hrs/day, 1 week = ~42 hours of deep work (allowing much faster progression and higher task density).\n"
        "   - Derive each task's 'estimated_time' organically based on how long that real engineering topic actually takes an engineer to absorb and implement:\n"
        "     * For daily/weekly sprints: realistic session times such as '~2 hrs', '~3.5 hrs', '~4 hrs', '~1.5 hrs'.\n"
        "     * For multi-day projects: realistic project windows such as '2 days (~4 hrs)', '3 days (~8 hrs)'.\n"
        "     * The tasks within each Sub-Goal must collectively match the user's available bandwidth for that phase.\n"
        "   - NO ARBITRARY FORMULAS: Do NOT force rigid repetitive splits (e.g. no fake '2, 2, 3' day templates). Durations must feel authentic to the subject matter.\n\n"
        "3. STRICT PATTERN-BASED PROGRESSIVE DIFFICULTY PRINCIPLE (NO VAGUE BULK CHAPTERS):\n"
        "   - BAN VAGUE BLANKET GOALS: NEVER say 'Complete Arrays in 1 week' or 'Master Strings & Maps in 10 days'. Real learning happens through algorithmic & conceptual pattern recognition!\n"
        "   - 2-TO-3 DAY PATTERN CADENCE & DIFFICULTY CURVE:\n"
        "     * Dedicate 2 to 3 days per distinct pattern (e.g. Two Pointers, Sliding Window, Prefix Sums, Frequency Hashing, Monotonic Stack, Binary Search on Answer Space, BFS/DFS tree traversal, Memoization).\n"
        "     * Day 1 of Pattern: Pattern Recognition & Intuition -> Focus on Easy to Medium problems (build intuition and baseline state machines, e.g. Two Sum II, Valid Palindrome, Fixed Window Max).\n"
        "     * Day 2 of Pattern: Advanced Variations & Edge Cases -> Focus on Medium to Hard problems (sliding window with variable size, multi-pointer collision, tricky constraints, e.g. 3Sum, Min Window Substring, Trapping Rain Water).\n"
        "     * Day 3 (if allocated): Multi-Pattern Synthesis, Spaced Repetition, or Timed Speed Drill.\n"
        "   - HIERARCHICAL TIME_PHASE & SUB_GOAL CONVENTIONS:\n"
        "     * Set 'sub_goal' to reflect the month and weekly pattern, e.g. 'Month 1 • Week 1: Two Pointers & Prefix Sums' or 'Week 2: Sliding Window Pattern'.\n"
        "     * Set 'time_phase' clearly indicating the day and difficulty curve: 'Day 1 (Easy → Med)', 'Day 2 (Med → Hard)', 'Day 3 (Synthesis)'.\n\n"
        "4. STRICT REAL-WORLD PREREQUISITE LADDERS (NO IMPOSSIBLE COGNITIVE LEAPS):\n"
        "   - NEVER skip foundational prerequisite tiers within a technical domain!\n"
        "   - Strictly use ONLY modern 2026 industry-standard technologies. Banish obsolete/toy libraries (e.g. NEVER suggest PyKnow, Theano, or outdated tools).\n"
        "   - In Data Structures & Algorithms (DSA):\n"
        "     * Step 1: Linear Arrays & Two Pointers (Two Sum II, 3Sum, Container With Most Water, Trapping Rain Water)\n"
        "     * Step 2: Sliding Window (Variable & Fixed size) & HashMaps / Frequency Tables\n"
        "     * Step 3: Prefix Sums & Binary Search (on Sorted Arrays and Monotonic Answer Spaces)\n"
        "     * Step 4: Stacks (Monotonic Stack patterns) & Linked Lists\n"
        "     * Step 5: Recursion, Backtracking & Binary Trees (BFS/DFS Traversals, BSTs)\n"
        "     * Step 6: Heaps / Priority Queues & Graph Algorithms (BFS/DFS, Topological Sort, Shortest Path)\n"
        "     * Step 7: Dynamic Programming (Memoization -> 1D Tabulation -> 2D Grid DP)\n"
        "     NEVER jump straight from Two Pointers to Graphs or DP in Week 1! Follow the natural cognitive ladder.\n"
        "   - In Machine Learning & AI Engineering:\n"
        "     * Step 1: Vectorized Data Wrangling & Analysis (NumPy matrix operations, Pandas data cleaning, Exploratory Data Analysis with Matplotlib/Seaborn)\n"
        "     * Step 2: Classical Machine Learning (Scikit-Learn: Regression, Decision Trees, Random Forests, XGBoost, Cross-Validation, ROC-AUC)\n"
        "     * Step 3: Deep Learning Core (PyTorch: Tensors, Autograd, Custom Datasets, MLP & CNN/Transformer architectures)\n"
        "     * Step 4: Production Deployment & Inference (FastAPI model serving, Docker containerization, Vector DB / RAG integration)\n"
        "     NEVER put Graph search algorithms in Tier 1 data foundations, and NEVER use obsolete tools!\n"
        "   - In Full Stack & Backend Engineering:\n"
        "     * Step 1: Application Architecture, REST/GraphQL API Contracts & Data Validation\n"
        "     * Step 2: Relational Databases, Schema Migrations, Indexing & ACID Transactions\n"
        "     * Step 3: Caching Layers (Redis), Authentication (JWT/OAuth), Rate Limiting\n"
        "     * Step 4: Asynchronous Task Queues (Celery/BullMQ/Kafka) & Background Processing\n"
        "     * Step 5: Containerization (Docker), CI/CD & Cloud Production Deployment\n"
        "   - In Cybersecurity:\n"
        "     * Step 1: Linux CLI, TCP/IP, OSI Model, Packet Sniffing & Analysis (Wireshark)\n"
        "     * Step 2: Network Reconnaissance, Port Scanning (Nmap), Service Enumeration\n"
        "     * Step 3: Web Security Foundations, HTTP Headers, OWASP Top 10 (SQLi, XSS, CSRF)\n"
        "     * Step 4: Authentication Bypass & Burp Suite Proxy Interception\n"
        "     * Step 5: Exploitation Drills, Privilege Escalation & Defensive Hardening\n\n"
        "5. TANGIBLE DELIVERABLES & REAL TOOLS:\n"
        "   - Every task MUST produce a verifiable deliverable (code written, problem solved, pipeline deployed, audit verified).\n"
        "   - Every task MUST specify real modern tools in the 'tools' array.\n\n"
        "SCHEMA SPECIFICATION:\n"
        "Return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        '  "tasks": [\n'
        '    {\n'
        '      "sub_goal": "Sub-Goal Name (e.g. Week 1: Linear Structures & Two-Pointer Mastery)",\n'
        '      "title": "Concise Actionable Task Title",\n'
        '      "priority": "high"|"medium"|"low",\n'
        '      "estimated_time": "~3 hrs",\n'
        '      "time_phase": "Week 1",\n'
        '      "deliverable": "Verifiable outcome (e.g. Solve 5 Two-Pointer LeetCode mediums in Python with O(1) space)",\n'
        '      "tools": ["LeetCode", "Python3"],\n'
        '      "reasoning": "Crisp 1-sentence pedagogical justification"\n'
        '    }\n'
        '  ]\n'
        "}\n"
        "Do NOT wrap in markdown formatting or code blocks."
    )

    user_prompt = (
        f"Goal Objective: {request.goal_description}\n"
        f"Allocated Timeframe: {effective_timeframe}\n"
        f"Daily Dedication Budget: {daily_commitment}\n"
        f"Learning Execution Style: {learning_style}\n"
        f"Domain Category: {request.category or 'General'}\n\n"
        f"Relevant Knowledge Base Context from User Workspace:\n{rag_context}\n\n"
        "Generate the structured, time-paced task breakdown with strict sub-goal scoping in the specified JSON format."
    )

    suggested_tasks: List[RecommendedTaskItem] = []

    # Dynamic LLM Generation with available models and generous timeout
    import re
    import google.generativeai as genai
    from core.config import settings
    
    genai.configure(api_key=settings.GEMINI_API_KEY)
    gemini_candidates = [
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3-flash-preview",
    ]

    full_prompt = (
        f"{system_prompt}\n\n"
        f"Goal: {request.goal_description}\n"
        f"Allocated Timeframe: {effective_timeframe}\n"
        f"Daily Dedication Budget: {daily_commitment}\n"
        f"Learning Execution Style: {learning_style}\n"
        f"Category: {request.category or 'General'}\n"
        f"Relevant Context:\n{rag_context}\n\n"
        "Generate the breakdown of recommended tasks in the specified JSON format."
    )

    for model_name in gemini_candidates:
        try:
            logger.info(f"Attempting task recommendation using Gemini model: {model_name} for timeframe: {effective_timeframe} dedication: {daily_commitment}")
            gen_model = genai.GenerativeModel(
                model_name=model_name,
                generation_config={"response_mime_type": "application/json", "temperature": 0.25}
            )
            response = await asyncio.wait_for(
                asyncio.to_thread(gen_model.generate_content, full_prompt),
                timeout=30.0,
            )
            direct_text = response.text.strip()
            
            # Extract JSON block
            match = re.search(r"\{[\s\S]*\}", direct_text)
            if match:
                direct_text = match.group(0)

            try:
                parsed = json.loads(direct_text, strict=False)
            except Exception:
                clean_text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", direct_text)
                parsed = json.loads(clean_text, strict=False)

            task_list = parsed.get("tasks", [])
            for t in task_list:
                prio = str(t.get("priority", "medium")).lower()
                if prio not in ("high", "medium", "low"):
                    prio = "medium"
                
                raw_tools = t.get("tools") or []
                tools_list = [str(x) for x in raw_tools] if isinstance(raw_tools, list) else ([str(raw_tools)] if raw_tools else [])

                suggested_tasks.append(
                    RecommendedTaskItem(
                        title=t.get("title", "Action Item"),
                        sub_goal=t.get("sub_goal") or "Core Objectives",
                        priority=prio,
                        estimated_time=t.get("estimated_time") or ("~2 hrs" if any(k in effective_timeframe.lower() for k in ["day", "sprint"]) else "~3-4 hrs"),
                        time_phase=t.get("time_phase"),
                        deliverable=t.get("deliverable"),
                        tools=tools_list,
                        reasoning=t.get("reasoning"),
                    )
                )
            if suggested_tasks:
                logger.info(f"Successfully generated {len(suggested_tasks)} dynamic time-paced tasks with {model_name}")
                break
        except asyncio.TimeoutError:
            logger.warning(f"Candidate {model_name} timed out after 30s")
            continue
        except Exception as cand_err:
            logger.warning(f"Candidate {model_name} failed: {cand_err}")
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
                    raw_tools = t.get("tools") or []
                    tools_list = [str(x) for x in raw_tools] if isinstance(raw_tools, list) else ([str(raw_tools)] if raw_tools else [])
                    suggested_tasks.append(
                        RecommendedTaskItem(
                            title=t.get("title", "Action Item"),
                            sub_goal=t.get("sub_goal") or "Core Objectives",
                            priority=prio,
                            estimated_time=t.get("estimated_time") or ("~2 hrs" if any(k in effective_timeframe.lower() for k in ["day", "sprint"]) else "~3-4 hrs"),
                            time_phase=t.get("time_phase"),
                            deliverable=t.get("deliverable"),
                            tools=tools_list,
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

    # Determine documents to strictly search
    target_docs = [str(d) for d in (request.document_ids or []) if d]
    if not target_docs and db_goal and db_goal.document_ids:
        target_docs = [str(d) for d in db_goal.document_ids if d]

    citations: List[GoalChatCitation] = []
    rag_context = ""

    # 1. Scoped Space & Document Retrieval
    if target_spaces:
        try:
            results = await asyncio.wait_for(
                retrieve_context(
                    query=request.message,
                    user_id=str(current_user.id),
                    space_ids=target_spaces,
                    document_ids=target_docs or None,
                    top_k=5,
                ),
                timeout=4.0,
            )
            snippets = []
            for r in results:
                # Discard low scoring noise
                score = r.get("score", 0.0)
                if score < 0.50 and not target_docs:
                    continue
                doc_title = r.get("document_title") or "Associated Knowledge Doc"
                content = r.get("content") or r.get("text") or ""
                page_num = r.get("page_number")
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

    # Format Hierarchical Sub-Goals and Tasks
    tasks_list = request.tasks or (db_goal.tasks if db_goal and db_goal.tasks else [])
    
    # 1. Build Sub-Goals mapping preserving order
    sub_goals_map: dict[str, list[dict]] = {}
    
    # If explicit sub_goals order was supplied from client, seed them
    if request.sub_goals:
        for sg in request.sub_goals:
            if sg and sg not in sub_goals_map:
                sub_goals_map[sg] = []
                
    for t in tasks_list:
        sg_name = t.get("sub_goal") or "Core Objectives"
        if sg_name not in sub_goals_map:
            sub_goals_map[sg_name] = []
        sub_goals_map[sg_name].append(t)

    if not sub_goals_map:
        sub_goals_map["Core Objectives"] = []

    sub_goals_overview_lines = []
    detailed_breakdown_lines = []
    
    for idx, (sg_name, sg_tasks) in enumerate(sub_goals_map.items(), 1):
        completed_count = sum(1 for t in sg_tasks if t.get("completed"))
        total_count = len(sg_tasks)
        pct = int((completed_count / total_count * 100)) if total_count > 0 else 0
        
        sub_goals_overview_lines.append(
            f"{idx}. {sg_name} ({completed_count}/{total_count} tasks completed - {pct}%)"
        )
        
        task_bullets = []
        for t in sg_tasks:
            status_tag = "[DONE]" if t.get("completed") else "[TODO]"
            prio = (t.get("priority") or "medium").upper()
            title = t.get("title") or "Task"
            task_bullets.append(f"     - {status_tag} ({prio} Priority) {title}")
            
        if not task_bullets:
            task_bullets.append("     - (No tasks assigned yet)")
            
        detailed_breakdown_lines.append(
            f"### Sub-Goal {idx}: {sg_name} ({completed_count}/{total_count} completed)\n"
            + "\n".join(task_bullets)
        )

    sub_goals_summary = "\n".join(sub_goals_overview_lines)
    detailed_tasks_summary = "\n\n".join(detailed_breakdown_lines)
    sub_goal_names_only = ", ".join([f'"{name}"' for name in sub_goals_map.keys()])

    # 2. Build Executive AI Prompt with Strict Hierarchical Clarity
    system_prompt = (
        "You are QueryMind's executive AI Goal Coach and Strategic Advisor.\n"
        "You are having a focused working conversation with the user regarding their specific goal.\n"
        "You have direct access to their structured goal hierarchy, modular sub-goals, tasks, and documents scoped to their space.\n\n"
        "=================== STRUCTURED GOAL HIERARCHY ===================\n"
        f"OVERARCHING GOAL: {goal_desc}\n"
        f"Overall Goal Progress: {progress}%\n"
        f"Target Completion Date: {target_date}\n"
        f"Associated Spaces Filter: {', '.join(target_spaces) if target_spaces else 'None'}\n\n"
        f"LIST OF SUB-GOALS (Modular Milestone Categories):\n"
        f"{sub_goals_summary}\n\n"
        f"DETAILED SUB-GOALS & EMBEDDED ACTION TASKS:\n"
        f"{detailed_tasks_summary}\n"
        "=================================================================\n\n"
        "CRITICAL RULES FOR RESPONDING (STRICT TERMINOLOGY - NEVER CONFUSE):\n"
        "1. DEFINITION OF LEVELS:\n"
        f"   - Level 1: 'Goal' = The overarching goal ({goal_desc}).\n"
        f"   - Level 2: 'Sub-Goals' = The milestone categories/phases that subdivide this goal ({sub_goal_names_only}).\n"
        "   - Level 3: 'Tasks' = The individual actionable to-do items listed under each sub-goal.\n\n"
        "2. USER QUERY ROUTING:\n"
        "   - When the user asks about SUB-GOALS (e.g. 'what are my sub goals', 'what are my first three sub goals', 'tell me about sub-goal X'):\n"
        "     You MUST answer with the SUB-GOALS themselves (e.g., 1. Data Structures & Algorithms, 2. System Design & Architecture, 3. Behavioral & Interview Prep). DO NOT return tasks when asked about sub-goals!\n"
        "   - When the user asks about TASKS, ACTION ITEMS, or TO-DOS (e.g. 'what are my tasks', 'what should I work on next', 'list tasks in sub-goal X'):\n"
        "     Answer with the actionable tasks inside the relevant sub-goal, highlighting priorities.\n"
        "   - When the user asks about the overall GOAL:\n"
        "     Provide a strategic roadmap of the entire objective, explaining how the sub-goals connect.\n\n"
        "3. ACCURACY & CONCISENESS:\n"
        "   - Ground domain advice in retrieved space documents when available.\n"
        "   - Keep answers clear, direct, structured, and free of fluff."
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

