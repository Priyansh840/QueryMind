"""
QueryMind - Workflows Router
Authenticated endpoint for autonomous multi-agent workflows, task planning, step lifecycle, approval handling, and execution state.
Strictly scoped to user_id and space_id multi-tenant boundaries.
"""

import uuid
import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, desc

from api.deps import get_db, get_current_user
from database.postgres import async_session
from models.user import User
from models.core import Space
from models.orchestrator import Objective, Workflow, WorkflowStep, AgentRun, Synthesis, WorkflowEvent
from models.action_proposal import ActionProposal
from orchestrator.graph import get_orchestrator

logger = logging.getLogger(__name__)
router = APIRouter()


# -------------------------------------------------------------
# Schemas
# -------------------------------------------------------------
class WorkflowCreateRequest(BaseModel):
    space_id: str
    goal: str = Field(..., min_length=3)
    conversation_id: Optional[str] = None


class AgentRunResponse(BaseModel):
    id: str
    agent_type: str
    task_id: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    output_summary: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WorkflowStepResponse(BaseModel):
    id: str
    step_order: int
    iteration: int
    intent_type: str
    name: str
    description: Optional[str] = None
    status: str
    output_summary: Optional[str] = None
    agent_runs: List[AgentRunResponse] = []


class WorkflowDetailResponse(BaseModel):
    id: str
    objective_id: str
    space_id: str
    goal: str
    status: str
    created_at: datetime
    steps: List[WorkflowStepResponse] = []
    output: Optional[Dict[str, Any]] = None
    pending_actions: List[Dict[str, Any]] = []


class WorkflowListItemResponse(BaseModel):
    id: str
    objective_id: str
    space_id: str
    goal: str
    status: str
    created_at: datetime
    steps_count: int
    completed_steps_count: int
    current_step: Optional[str] = None


# -------------------------------------------------------------
# Background Execution Runner
# -------------------------------------------------------------
async def run_orchestrator_workflow_task(workflow_id: str, objective_id: str, user_id: str, space_id: str, query: str):
    """
    Executes the multi-agent graph in the background and commits step updates & agent runs.
    """
    logger.info(f"Starting autonomous workflow execution: {workflow_id} (space={space_id})")
    app = get_orchestrator()

    initial_state = {
        "user_id": str(user_id),
        "space_id": str(space_id),
        "objective_id": str(objective_id),
        "conversation_id": None,
        "raw_query": query,
        "chat_history": [],
        "workspace_context": {
            "space": None,
            "goals": [],
            "projects": [],
            "memories": []
        },
        "planner_output": None,
        "research_tasks": [],
        "research_results": [],
        "critic_output": None,
        "workflow_iteration": 1,
        "total_research_tasks": 0,
        "workflow_status": "running",
        "final_synthesis": "",
        "citations": []
    }

    async with async_session() as db:
        # Update workflow status to running
        wf_uuid = uuid.UUID(workflow_id)
        stmt = select(Workflow).where(Workflow.id == wf_uuid)
        res = await db.execute(stmt)
        wf = res.scalar_one_or_none()
        if wf:
            wf.status = "running"
            await db.commit()

        try:
            config = {"configurable": {"db": db}}
            final_state = await app.ainvoke(initial_state, config=config)

            # Update final workflow status
            stmt_re = select(Workflow).options(selectinload(Workflow.steps)).where(Workflow.id == wf_uuid)
            res_re = await db.execute(stmt_re)
            wf_re = res_re.scalar_one_or_none()
            if wf_re:
                if final_state.get("workflow_status") == "failed":
                    wf_re.status = "failed"
                else:
                    wf_re.status = "completed"

                for s in wf_re.steps:
                    if s.status == "running" or s.status == "pending":
                        s.status = "completed"
                await db.commit()
                logger.info(f"Workflow {workflow_id} finished successfully with status: {wf_re.status}")

        except Exception as e:
            logger.error(f"Error executing workflow {workflow_id}: {e}", exc_info=True)
            async with async_session() as err_db:
                stmt_err = select(Workflow).where(Workflow.id == wf_uuid)
                res_err = await err_db.execute(stmt_err)
                wf_err = res_err.scalar_one_or_none()
                if wf_err:
                    wf_err.status = "failed"
                    await err_db.commit()


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=WorkflowDetailResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=WorkflowDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    request: WorkflowCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates and plans an autonomous multi-agent workflow for the authenticated Space.
    """
    try:
        space_uuid = uuid.UUID(request.space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    # 1. Verify Space Ownership
    stmt_space = select(Space).where(Space.id == space_uuid, Space.user_id == current_user.id)
    res_space = await db.execute(stmt_space)
    space = res_space.scalar_one_or_none()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found or unauthorized")

    # 2. Create Objective & Workflow
    obj_id = uuid.uuid4()
    wf_id = uuid.uuid5(obj_id, "workflow")

    objective = Objective(
        id=obj_id,
        user_id=current_user.id,
        space_id=space_uuid,
        raw_input=request.goal.strip(),
        status="planning",
        created_at=datetime.utcnow(),
    )
    db.add(objective)

    workflow = Workflow(
        id=wf_id,
        objective_id=obj_id,
        space_id=space_uuid,
        status="planning",
        created_at=datetime.utcnow(),
    )
    db.add(workflow)

    # 3. Create planned workflow steps
    planned_steps = [
        ("Context Gathering", "context_gatherer", "Aggregate Space knowledge, documents, active goals, and user context."),
        ("Multi-Agent Planning", "planner", "Decompose user objective into structured sub-tasks and identify research needs."),
        ("Knowledge Retrieval & Research", "researcher", "Query Space vector store and analyze relevant source documentation."),
        ("Decision Analysis & Synthesis", "decision_analyzer", "Evaluate findings, check constraints, and synthesize conclusions."),
        ("Action Proposal & Execution", "action_proposer", "Formulate concrete recommendations with approval boundaries."),
    ]

    steps_db = []
    for idx, (name, intent, desc) in enumerate(planned_steps, start=1):
        step = WorkflowStep(
            id=uuid.uuid4(),
            workflow_id=wf_id,
            step_order=idx,
            iteration=1,
            intent_type=intent,
            description=desc,
            status="pending",
        )
        db.add(step)
        steps_db.append(step)

    await db.commit()
    await db.refresh(workflow)

    # 4. Trigger async execution
    background_tasks.add_task(
        run_orchestrator_workflow_task,
        str(wf_id),
        str(obj_id),
        str(current_user.id),
        str(space_uuid),
        request.goal.strip(),
    )

    return WorkflowDetailResponse(
        id=str(workflow.id),
        objective_id=str(objective.id),
        space_id=str(space_uuid),
        goal=objective.raw_input,
        status="planning",
        created_at=workflow.created_at,
        steps=[
            WorkflowStepResponse(
                id=str(s.id),
                step_order=s.step_order,
                iteration=s.iteration,
                intent_type=s.intent_type,
                name=planned_steps[s.step_order - 1][0],
                description=s.description,
                status=s.status,
                agent_runs=[],
            )
            for s in steps_db
        ],
        output=None,
        pending_actions=[],
    )


@router.get("", response_model=List[WorkflowListItemResponse])
@router.get("/", response_model=List[WorkflowListItemResponse])
async def list_workflows(
    space_id: str = Query(...),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List workflows scoped to the authenticated space.
    """
    try:
        space_uuid = uuid.UUID(space_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid space_id UUID format")

    stmt = (
        select(Workflow, Objective.raw_input)
        .join(Objective, Objective.id == Workflow.objective_id)
        .options(selectinload(Workflow.steps))
        .where(Workflow.space_id == space_uuid, Objective.user_id == current_user.id)
        .order_by(desc(Workflow.created_at))
    )

    if status:
        stmt = stmt.where(Workflow.status == status.strip())

    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for wf, goal_text in rows:
        completed = len([s for s in wf.steps if s.status == "completed"])
        active_step = next((s.intent_type for s in wf.steps if s.status == "running"), None)
        items.append(
            WorkflowListItemResponse(
                id=str(wf.id),
                objective_id=str(wf.objective_id),
                space_id=str(space_uuid),
                goal=goal_text,
                status=wf.status,
                created_at=wf.created_at,
                steps_count=len(wf.steps),
                completed_steps_count=completed,
                current_step=active_step,
            )
        )
    return items


@router.get("/{workflow_id}", response_model=WorkflowDetailResponse)
async def get_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed execution state of a specific workflow.
    """
    try:
        wf_uuid = uuid.UUID(workflow_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid workflow_id UUID format")

    stmt = (
        select(Workflow, Objective.raw_input, Objective.space_id)
        .join(Objective, Objective.id == Workflow.objective_id)
        .options(
            selectinload(Workflow.steps).selectinload(WorkflowStep.agent_runs)
        )
        .where(Workflow.id == wf_uuid, Objective.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found or unauthorized")

    wf, goal_text, space_uuid = row

    # Fetch synthesis or pending actions in space
    stmt_act = select(ActionProposal).where(
        ActionProposal.space_id == space_uuid,
        ActionProposal.user_id == current_user.id,
        ActionProposal.status == "pending"
    )
    res_act = await db.execute(stmt_act)
    pending_actions = [
        {
            "id": str(a.id),
            "proposal_id": a.proposal_id,
            "action_type": a.action_type,
            "reason": a.reason,
            "confidence": a.confidence,
            "parameters": a.parameters,
            "status": a.status,
        }
        for a in res_act.scalars().all()
    ]

    steps_res = []
    for s in sorted(wf.steps, key=lambda x: x.step_order):
        runs = [
            AgentRunResponse(
                id=str(r.id),
                agent_type=r.agent_type,
                task_id=r.task_id,
                status=r.status,
                started_at=r.started_at,
                completed_at=r.completed_at,
                output_summary=r.output_summary,
                error=r.error,
            )
            for r in s.agent_runs
        ]
        steps_res.append(
            WorkflowStepResponse(
                id=str(s.id),
                step_order=s.step_order,
                iteration=s.iteration,
                intent_type=s.intent_type,
                name=s.intent_type.replace("_", " ").title(),
                description=s.description,
                status=s.status,
                output_summary=s.output_summary,
                agent_runs=runs,
            )
        )

    return WorkflowDetailResponse(
        id=str(wf.id),
        objective_id=str(wf.objective_id),
        space_id=str(space_uuid),
        goal=goal_text,
        status=wf.status,
        created_at=wf.created_at,
        steps=steps_res,
        output=None,
        pending_actions=pending_actions,
    )


@router.post("/{workflow_id}/retry", response_model=WorkflowDetailResponse)
async def retry_workflow(
    workflow_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retries execution of a failed workflow safely.
    """
    try:
        wf_uuid = uuid.UUID(workflow_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid workflow_id UUID format")

    stmt = (
        select(Workflow, Objective)
        .join(Objective, Objective.id == Workflow.objective_id)
        .options(selectinload(Workflow.steps))
        .where(Workflow.id == wf_uuid, Objective.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found or unauthorized")

    wf, obj = row
    wf.status = "running"
    for s in wf.steps:
        if s.status == "failed":
            s.status = "pending"

    await db.commit()

    background_tasks.add_task(
        run_orchestrator_workflow_task,
        str(wf.id),
        str(obj.id),
        str(current_user.id),
        str(wf.space_id),
        obj.raw_input,
    )

    return await get_workflow(workflow_id, current_user=current_user, db=db)


@router.post("/{workflow_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Safely cancels a running workflow.
    """
    try:
        wf_uuid = uuid.UUID(workflow_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid workflow_id UUID format")

    stmt = (
        select(Workflow)
        .join(Objective, Objective.id == Workflow.objective_id)
        .where(Workflow.id == wf_uuid, Objective.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    wf = res.scalar_one_or_none()

    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found or unauthorized")

    wf.status = "cancelled"
    await db.commit()

    return {"status": "success", "message": f"Workflow {workflow_id} cancelled"}
