import logging
import uuid
from sqlalchemy import select
from langchain_core.runnables import RunnableConfig
from orchestrator.state import AgentState
from models.core import Space, Project, Goal
from models.memory import Memory
from models.knowledge import Document
from models.orchestrator import AgentRun, WorkflowStep, Workflow
from sqlalchemy.dialects.postgresql import insert
import datetime

logger = logging.getLogger(__name__)

async def gather_context_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    ContextGatherer Node:
    Retrieves read-only workspace context (Space, Goals, Projects, Memories).
    Enforces user_id and space_id ownership.
    """
    logger.info("Gathering workspace context...")
    
    db = config.get("configurable", {}).get("db")
    if not db:
        raise ValueError("Database session 'db' must be provided in config['configurable'].")

    user_id_str = state.get("user_id")
    space_id_str = state.get("space_id")
    
    empty_context = {
        "space": None,
        "goals": [],
        "projects": [],
        "memories": []
    }
    
    if not user_id_str or not space_id_str:
        state["workspace_context"] = empty_context
        state["workspace_summary"] = {"space_found": False}
        return state

    try:
        user_uuid = uuid.UUID(user_id_str)
        space_uuid = uuid.UUID(space_id_str)
    except (ValueError, TypeError):
        state["workspace_context"] = empty_context
        state["workspace_summary"] = {"space_found": False}
        return state

    # Start Telemetry
    obj_uuid_str = state.get("objective_id")
    if obj_uuid_str:
        try:
            obj_uuid = uuid.UUID(obj_uuid_str)
            workflow_id = uuid.uuid5(obj_uuid, "workflow")
            step_id = uuid.uuid5(workflow_id, "context_gatherer_1")
            
            workflow_stmt = insert(Workflow).values(
                id=workflow_id, objective_id=obj_uuid, space_id=space_uuid, status="running"
            ).on_conflict_do_nothing()
            await db.execute(workflow_stmt)
            
            step_stmt = insert(WorkflowStep).values(
                id=step_id, workflow_id=workflow_id, step_order=1, 
                iteration=1, intent_type="context_gathering", status="running"
            ).on_conflict_do_nothing()
            await db.execute(step_stmt)
            
            run = AgentRun(
                id=uuid.uuid4(),
                workflow_step_id=step_id,
                agent_type="context_gatherer",
                status="running",
                started_at=datetime.datetime.utcnow(),
                input_context={"space_id": space_id_str}
            )
            db.add(run)
            await db.commit()
        except Exception as e:
            logger.warning(f"Telemetry recording notice for context gatherer: {e}")
            await db.rollback()

    try:
        # 1. Fetch Space (Ensure it belongs to user)
        space_stmt = select(Space).where(Space.id == space_uuid, Space.user_id == user_uuid)
        space_result = await db.execute(space_stmt)
        space = space_result.scalar_one_or_none()

        if not space:
            state["workspace_context"] = empty_context
            return state

        space_data = {
            "id": str(space.id),
            "name": space.name,
            "description": space.description
        }

        # 2. Fetch Active Projects for this Space (Limit 10)
        proj_stmt = select(Project).where(
            Project.space_id == space_uuid,
            Project.status == "active"
        ).order_by(Project.created_at.desc()).limit(10)
        proj_result = await db.execute(proj_stmt)
        projects = proj_result.scalars().all()
        
        projects_data = [
            {"id": str(p.id), "name": p.name, "status": p.status}
            for p in projects
        ]

        # 3. Fetch Active Goals (Global for user, or belonging to this space's projects, Limit 10)
        goal_stmt = (
            select(Goal)
            .outerjoin(Project, Goal.project_id == Project.id)
            .where(
                Goal.user_id == user_uuid,
                Goal.status == "active",
                (Goal.project_id.is_(None)) | (Project.space_id == space_uuid)
            )
            .order_by(Goal.created_at.desc())
            .limit(10)
        )
        goal_result = await db.execute(goal_stmt)
        goals = goal_result.scalars().all()
        
        goals_data = [
            {"id": str(g.id), "description": g.description, "status": g.status}
            for g in goals
        ]

        # 4. Fetch Memories (For user, bounded to 15)
        memory_stmt = select(Memory).where(
            Memory.user_id == user_uuid,
            Memory.status == "active"
        ).order_by(Memory.created_at.desc(), Memory.importance.desc()).limit(15)
        memory_result = await db.execute(memory_stmt)
        memories = memory_result.scalars().all()
        
        memories_data = [
            {
                "id": str(m.id),
                "memory_type": m.memory_type,
                "content": m.content,
                "importance": m.importance,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in memories
        ]

        # 5. Fetch Documents in this Space (Limit 15)
        doc_stmt = select(Document).where(
            Document.space_id == space_uuid
        ).order_by(Document.created_at.desc()).limit(15)
        doc_result = await db.execute(doc_stmt)
        docs = doc_result.scalars().all()

        documents_data = [
            {
                "id": str(d.id),
                "title": d.title,
                "type": d.type,
                "status": d.status,
            }
            for d in docs
        ]

        state["workspace_context"] = {
            "space": space_data,
            "goals": goals_data,
            "projects": projects_data,
            "memories": memories_data,
            "documents": documents_data,
        }

        summary = {
            "context_type": "workspace",
            "space_found": True,
            "goals_count": len(goals_data),
            "projects_count": len(projects_data),
            "memories_count": len(memories_data),
            "documents_count": len(documents_data),
        }
        state["workspace_summary"] = summary

        if 'run' in locals():
            run.status = "completed"
            run.completed_at = datetime.datetime.utcnow()
            run.output_summary = summary
            db.add(run)
            await db.commit()

    except Exception as e:
        logger.error(f"Error gathering workspace context: {e}")
        state["workspace_context"] = empty_context
        state["workspace_summary"] = {"error": str(e)}
        if 'run' in locals():
            run.status = "failed"
            run.error = str(e)
            run.completed_at = datetime.datetime.utcnow()
            db.add(run)
            await db.commit()
            
    return state
