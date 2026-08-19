"""
QueryMind - Objectives Telemetry Router
Authenticated endpoint for objective execution telemetry traces.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from api.deps import get_db, get_current_user
from models.orchestrator import Objective, Workflow, WorkflowStep, AgentRun
from models.user import User

router = APIRouter()


@router.get("/{objective_id}/trace")
async def get_objective_trace(
    objective_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the real-time execution trace of a LangGraph orchestration objective
    by querying the database telemetry. Enforces that the objective belongs to the authenticated user.
    """
    try:
        obj_uuid = uuid.UUID(objective_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid objective ID format.")

    # Fetch objective with all nested workflows, steps, and runs belonging to current_user
    stmt = (
        select(Objective)
        .options(
            selectinload(Objective.workflows)
            .selectinload(Workflow.steps)
            .selectinload(WorkflowStep.agent_runs)
        )
        .where(Objective.id == obj_uuid, Objective.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    objective = result.scalars().first()

    if not objective:
        raise HTTPException(status_code=404, detail="Objective not found.")

    trace_events = []

    # 1. Objective created
    trace_events.append({
        "timestamp": objective.created_at.isoformat() if objective.created_at else None,
        "type": "objective_created",
        "message": "Objective created",
    })

    # 2. Iterate through workflows
    for workflow in objective.workflows:
        trace_events.append({
            "timestamp": workflow.created_at.isoformat() if workflow.created_at else None,
            "type": "workflow_initialized",
            "message": "Workflow initialized",
        })

        # 3. Iterate through steps
        steps = sorted(workflow.steps, key=lambda s: s.step_order)
        for step in steps:
            # 4. Iterate through agent runs
            for run in step.agent_runs:
                if run.started_at:
                    trace_events.append({
                        "timestamp": run.started_at.isoformat(),
                        "type": "agent_started",
                        "agent": run.agent_type,
                        "message": f"{run.agent_type.capitalize()} Agent started",
                    })

                if run.completed_at and run.status == "completed":
                    trace_events.append({
                        "timestamp": run.completed_at.isoformat(),
                        "type": "agent_completed",
                        "agent": run.agent_type,
                        "message": f"{run.agent_type.capitalize()} Agent completed",
                        "tokens_used": run.tokens_used,
                    })
                elif run.completed_at and run.status == "failed":
                    trace_events.append({
                        "timestamp": run.completed_at.isoformat(),
                        "type": "agent_failed",
                        "agent": run.agent_type,
                        "message": f"{run.agent_type.capitalize()} Agent failed: {run.error}",
                    })

    trace_events = [e for e in trace_events if e["timestamp"] is not None]
    trace_events.sort(key=lambda x: x["timestamp"])

    is_completed = False
    for event in trace_events:
        if event["type"] == "agent_completed" and event["agent"] == "synthesizer":
            is_completed = True
            break

    if is_completed:
        last_event_time = trace_events[-1]["timestamp"]
        trace_events.append({
            "timestamp": last_event_time,
            "type": "workflow_completed",
            "message": "Workflow completed",
        })

    return {
        "objective_id": str(objective.id),
        "raw_input": objective.raw_input,
        "status": "completed" if is_completed else objective.status,
        "created_at": objective.created_at.isoformat() if objective.created_at else None,
        "trace": trace_events,
    }
