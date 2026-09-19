"""
QueryMind - Workflows Router
Authenticated endpoint for autonomous multi-agent workflows, task planning, step lifecycle, approval handling, and execution state.
Strictly scoped to user_id and space_id multi-tenant boundaries.
"""

import uuid
import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, desc

from api.deps import get_db, get_current_user
from database.postgres import async_session
from models.user import User
from models.core import Space
from models.conversation import Conversation, Message
from models.orchestrator import Objective, Workflow, WorkflowStep, AgentRun, Synthesis
from models.action_proposal import ActionProposal
from repositories.action_proposals import ActionProposalRepository
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
# Background Execution Runner (Delegates to WorkflowWorker)
# -------------------------------------------------------------
async def run_orchestrator_workflow_task(workflow_id: str, objective_id: str = "", user_id: str = "", space_id: str = "", query: str = ""):
    """
    [DEPRECATED] Direct invocation of workflow task runner.
    Preserved for backward-compatibility with tests. Delegates directly to WorkflowWorker.execute_job().
    Production code must use the durable queue: Workflow status='queued' picked up by WorkflowWorker.
    """
    from services.workflow_worker import get_workflow_worker
    worker = get_workflow_worker()
    return await worker.execute_job(workflow_id)


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@router.post("", response_model=WorkflowDetailResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=WorkflowDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    request: WorkflowCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates and plans an autonomous multi-agent workflow for the Space.
    Sets status to 'queued' for durable asynchronous pickup by WorkflowWorker.
    Requires at least 'admin' role in the space.
    """
    from api.deps import get_space_membership
    space, membership = await get_space_membership(request.space_id, current_user, db, min_role="admin")
    space_uuid = space.id

    # 2. Create Objective & Workflow
    obj_id = uuid.uuid4()
    wf_id = uuid.uuid5(obj_id, "workflow")

    objective = Objective(
        id=obj_id,
        user_id=current_user.id,
        space_id=space_uuid,
        raw_input=request.goal.strip(),
        status="planning",
        created_at=datetime.now(timezone.utc),
    )
    db.add(objective)

    workflow = Workflow(
        id=wf_id,
        objective_id=obj_id,
        space_id=space_uuid,
        status="queued",
        created_at=datetime.now(timezone.utc),
    )
    db.add(workflow)

    # 3. Create planned workflow steps with deterministic identity matching agent nodes
    planned_steps = [
        ("Context Gathering", "context_gathering", "Aggregate Space knowledge, documents, active goals, and user context.", uuid.uuid5(wf_id, "context_gatherer_1"), 1),
        ("Multi-Agent Planning", "planning", "Decompose user objective into structured sub-tasks and identify research needs.", uuid.uuid5(wf_id, "planner_1"), 11),
        ("Knowledge Retrieval & Research", "research", "Query Space vector store and analyze relevant source documentation.", uuid.uuid5(wf_id, "researcher_1"), 12),
        ("Decision Analysis & Evaluation", "decision_analysis", "Evaluate findings, check constraints, and synthesize conclusions.", uuid.uuid5(wf_id, "decision_1"), 18),
        ("Synthesis & Action Formulation", "synthesis", "Formulate concrete recommendations, findings, and evidence.", uuid.uuid5(wf_id, "synthesizer"), 90),
    ]

    steps_db = []
    for name, intent, desc, step_uuid, step_order in planned_steps:
        step = WorkflowStep(
            id=step_uuid,
            workflow_id=wf_id,
            step_order=step_order,
            iteration=1,
            intent_type=intent,
            description=desc,
            status="pending",
        )
        db.add(step)
        steps_db.append(step)

    await db.commit()
    await db.refresh(workflow)

    step_name_map = {intent: name for name, intent, _, _, _ in planned_steps}

    return WorkflowDetailResponse(
        id=str(workflow.id),
        objective_id=str(objective.id),
        space_id=str(space_uuid),
        goal=objective.raw_input,
        status=workflow.status,
        created_at=workflow.created_at,
        steps=[
            WorkflowStepResponse(
                id=str(s.id),
                step_order=s.step_order,
                iteration=s.iteration,
                intent_type=s.intent_type,
                name=step_name_map.get(s.intent_type, s.intent_type.replace("_", " ").title()),
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
    List all workflows for the specified space.
    Requires at least 'viewer' role in the space.
    """
    from api.deps import get_space_membership
    space, membership = await get_space_membership(space_id, current_user, db, min_role="viewer")
    space_uuid = space.id

    stmt = (
        select(Workflow, Objective.raw_input)
        .join(Objective, Objective.id == Workflow.objective_id)
        .options(selectinload(Workflow.steps))
        .where(Workflow.space_id == space_uuid)
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
    Requires at least 'viewer' role in the workflow's space.
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
        .where(Workflow.id == wf_uuid)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found")

    wf, goal_text, space_uuid = row

    # Verify Space membership (viewer role)
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(space_uuid), current_user, db, min_role="viewer")

    # Fetch pending action proposals strictly scoped to this workflow's objective lineage
    stmt_act = select(ActionProposal).where(
        ActionProposal.space_id == space_uuid,
        ActionProposal.objective_id == wf.objective_id,
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

    # Fetch authoritative Synthesis output associated with this workflow's objective
    stmt_synth = (
        select(Synthesis)
        .where(Synthesis.objective_id == wf.objective_id)
        .order_by(Synthesis.created_at.desc())
    )
    res_synth = await db.execute(stmt_synth)
    synthesis = res_synth.scalars().first()
    output_data = None
    if synthesis:
        output_data = {
            "findings": synthesis.findings or [],
            "recommendations": synthesis.recommendations or [],
            "evidence": synthesis.evidence or [],
        }

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
        output=output_data,
        pending_actions=pending_actions,
    )



@router.post("/{workflow_id}/retry", response_model=WorkflowDetailResponse)
async def retry_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retries execution of a failed workflow safely by re-queuing it for the WorkflowWorker.
    Requires at least 'admin' role in the space.
    """
    try:
        wf_uuid = uuid.UUID(workflow_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid workflow_id UUID format")

    stmt = (
        select(Workflow, Objective)
        .join(Objective, Objective.id == Workflow.objective_id)
        .options(selectinload(Workflow.steps))
        .where(Workflow.id == wf_uuid)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found")

    wf, obj = row

    # Verify Space admin membership
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(wf.space_id), current_user, db, min_role="admin")

    wf.status = "queued"
    wf.error = None
    wf.worker_id = None
    wf.locked_at = None
    wf.retry_count = (wf.retry_count or 0) + 1
    for s in wf.steps:
        if s.status == "failed":
            s.status = "pending"

    await db.commit()

    return await get_workflow(workflow_id, current_user=current_user, db=db)


@router.post("/{workflow_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Safely cancels a running workflow.
    Requires at least 'admin' role in the space.
    """
    try:
        wf_uuid = uuid.UUID(workflow_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid workflow_id UUID format")

    stmt = select(Workflow).options(selectinload(Workflow.steps)).where(Workflow.id == wf_uuid)
    res = await db.execute(stmt)
    wf = res.scalar_one_or_none()

    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Verify Space admin membership
    from api.deps import get_space_membership
    space, membership = await get_space_membership(str(wf.space_id), current_user, db, min_role="admin")

    wf.status = "cancelled"
    wf.locked_at = None
    wf.worker_id = None
    for s in wf.steps:
        if s.status == "running" or s.status == "pending":
            s.status = "cancelled"

    await db.commit()

    return {"status": "success", "message": f"Workflow {workflow_id} has been cancelled."}
