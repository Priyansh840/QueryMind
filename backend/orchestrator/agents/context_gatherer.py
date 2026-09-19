import logging
import uuid
from sqlalchemy import select
from sqlalchemy import select, update
from langchain_core.runnables import RunnableConfig
from orchestrator.state import AgentState
from models.core import Space, Project, Goal
from models.space_member import SpaceMember
from models.memory import Memory
from models.knowledge import Document
from models.orchestrator import AgentRun, WorkflowStep, Workflow, Synthesis, Objective
from repositories.outcomes import OutcomeRepository
from repositories.reflections import ReflectionRepository
from sqlalchemy.dialects.postgresql import insert
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

async def gather_context_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    ContextGatherer Node:
    Retrieves read-only workspace context (Space, Active & Completed Goals,
    Active & Completed Projects, Decisions/Syntheses, Memories, Documents,
    Recent Outcomes, Lessons Learned/Reflections).
    Enforces tenant boundaries and SpaceMember collaborator authorization.
    """
    empty_context = {
        "space": None,
        "goals": [],
        "projects": [],
        "recent_completed_goals": [],
        "recent_completed_projects": [],
        "recent_decisions": [],
        "memories": [],
        "documents": [],
        "recent_action_outcomes": [],
        "lessons_learned": [],
    }

    db = config.get("configurable", {}).get("db") if config else None
    if not db:
        logger.warning("No database session provided in config['configurable']. Returning empty workspace context.")
        state["workspace_context"] = empty_context
        state["workspace_summary"] = {"space_found": False}
        return state

    user_id_str = state.get("user_id")
    space_id_str = state.get("space_id")
    
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
                id=workflow_id,
                objective_id=obj_uuid,
                space_id=space_uuid,
                status="running",
                created_at=datetime.now(timezone.utc)
            ).on_conflict_do_nothing()
            await db.execute(workflow_stmt)
            
            step_stmt = insert(WorkflowStep).values(
                id=step_id,
                workflow_id=workflow_id,
                step_order=1, 
                iteration=1,
                intent_type="context_gathering",
                status="running"
            ).on_conflict_do_update(
                index_elements=['id'],
                set_={'status': 'running'}
            )
            await db.execute(step_stmt)
            
            run = AgentRun(
                id=uuid.uuid4(),
                workflow_step_id=step_id,
                agent_type="context_gatherer",
                status="running",
                started_at=datetime.now(timezone.utc),
                input_context={"space_id": space_id_str}
            )
            db.add(run)
            await db.commit()
        except Exception as e:
            logger.warning(f"Telemetry recording notice for context gatherer: {e}")

    try:
        # 1. Fetch Space (Ensure it belongs to user or user is an authorized SpaceMember)
        space_stmt = (
            select(Space)
            .distinct()
            .outerjoin(SpaceMember, Space.id == SpaceMember.space_id)
            .where(
                Space.id == space_uuid,
                (Space.user_id == user_uuid) | (SpaceMember.user_id == user_uuid),
            )
        )
        space_result = await db.execute(space_stmt)
        space = space_result.scalars().first()

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

        # 3. Fetch Active Goals (Scoped to this space or this space's projects, Limit 10)
        goal_stmt = (
            select(Goal)
            .outerjoin(Project, Goal.project_id == Project.id)
            .where(
                Goal.user_id == user_uuid,
                Goal.status == "active",
                (Goal.space_id == space_uuid) | ((Goal.space_id.is_(None)) & ((Project.space_id == space_uuid) | (Goal.project_id.is_(None))))
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

        # 4. Phase 2D: Fetch Strictly Bounded Historical Outcomes (Completed/Archived Goals max 5, Projects max 5)
        comp_goal_stmt = (
            select(Goal)
            .outerjoin(Project, Goal.project_id == Project.id)
            .where(
                Goal.user_id == user_uuid,
                Goal.status.in_(["completed", "archived"]),
                (Goal.space_id == space_uuid) | ((Goal.space_id.is_(None)) & ((Project.space_id == space_uuid) | (Goal.project_id.is_(None))))
            )
            .order_by(Goal.created_at.desc())
            .limit(5)
        )

        comp_goal_res = await db.execute(comp_goal_stmt)
        comp_goals = comp_goal_res.scalars().all()
        comp_goals_data = [
            {"id": str(g.id), "description": g.description, "status": g.status}
            for g in comp_goals
        ]

        comp_proj_stmt = (
            select(Project)
            .where(
                Project.space_id == space_uuid,
                Project.status.in_(["completed", "archived", "on_hold"])
            )
            .order_by(Project.created_at.desc())
            .limit(5)
        )
        comp_proj_res = await db.execute(comp_proj_stmt)
        comp_projects = comp_proj_res.scalars().all()
        comp_projects_data = [
            {"id": str(p.id), "name": p.name, "status": p.status}
            for p in comp_projects
        ]

        # 5. Phase 2E: Fetch Bounded Decision / Synthesis History (Limit 3)
        decision_stmt = (
            select(Synthesis, Objective.raw_input)
            .join(Objective, Synthesis.objective_id == Objective.id)
            .where(
                Objective.space_id == space_uuid,
                Objective.user_id == user_uuid
            )
            .order_by(Synthesis.created_at.desc())
            .limit(3)
        )
        decision_res = await db.execute(decision_stmt)
        decisions_data = []
        for synth, raw_input in decision_res.all():
            rec_summary = []
            if synth.recommendations:
                for r in synth.recommendations:
                    if isinstance(r, dict):
                        rec_summary.append({
                            "action": r.get("action", ""),
                            "reason": r.get("reason", ""),
                            "confidence": r.get("confidence", "medium")
                        })
                    elif isinstance(r, str):
                        rec_summary.append({"action": r})
            decisions_data.append({
                "id": str(synth.id),
                "objective": raw_input,
                "recommendations": rec_summary[:3],
                "findings": (synth.findings or [])[:3],
                "created_at": synth.created_at.isoformat() if synth.created_at else None
            })

        # 6. Phase 2A: Fetch Isolated Memories (User's active memories scoped to this space or global null space, Limit 15)
        memory_stmt = select(Memory).where(
            Memory.user_id == user_uuid,
            Memory.status == "active",
            (Memory.space_id == space_uuid) | (Memory.space_id.is_(None))
        ).order_by(Memory.created_at.desc(), Memory.importance.desc()).limit(15)
        memory_result = await db.execute(memory_stmt)
        memories = memory_result.scalars().all()
        
        memories_data = [
            {
                "id": str(m.id),
                "memory_type": m.memory_type,
                "content": m.content,
                "importance": m.importance,
                "space_id": str(m.space_id) if m.space_id else None,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in memories
        ]

        # 7. Fetch Documents in this Space (Limit 15)
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

        # 8. Step 14 Phase 8: Fetch Strictly Bounded Recent Outcomes (Limit 5, space-scoped)
        recent_outcomes = await OutcomeRepository.get_recent_outcomes(db, space_id=space_uuid, limit=5)
        outcomes_data = [
            {
                "id": str(o.id),
                "target_entity_type": o.target_entity_type,
                "target_entity_id": str(o.target_entity_id) if o.target_entity_id else None,
                "initiated_by": o.initiated_by,
                "status": o.status,
                "expected_outcome": o.expected_outcome,
                "actual_outcome": o.actual_outcome,
                "evaluated_at": o.evaluated_at.isoformat() if o.evaluated_at else None,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in recent_outcomes
        ]

        # 9. Step 14 Phase 8: Fetch Strictly Bounded Recent Reflections (Limit 5, space-scoped)
        recent_reflections = await ReflectionRepository.get_recent_reflections(db, space_id=space_uuid, limit=5)
        reflections_data = [
            {
                "id": str(r.id),
                "reflection_type": r.reflection_type,
                "title": r.title,
                "lesson_learned": r.lesson_learned,
                "actionable_guidance": r.actionable_guidance,
                "confidence": r.confidence,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent_reflections
        ]

        state["workspace_context"] = {
            "space": space_data,
            "goals": goals_data,
            "projects": projects_data,
            "recent_completed_goals": comp_goals_data,
            "recent_completed_projects": comp_projects_data,
            "recent_decisions": decisions_data,
            "memories": memories_data,
            "documents": documents_data,
            "recent_action_outcomes": outcomes_data,
            "lessons_learned": reflections_data,
        }

        summary = {
            "context_type": "workspace",
            "space_found": True,
            "goals_count": len(goals_data),
            "projects_count": len(projects_data),
            "recent_completed_goals_count": len(comp_goals_data),
            "recent_completed_projects_count": len(comp_projects_data),
            "recent_decisions_count": len(decisions_data),
            "memories_count": len(memories_data),
            "documents_count": len(documents_data),
            "recent_action_outcomes_count": len(outcomes_data),
            "lessons_learned_count": len(reflections_data),
        }
        state["workspace_summary"] = summary

        if 'run' in locals():
            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
            run.output_summary = summary
            db.add(run)
            # Step 13: Update step status in real-time
            if 'step_id' in locals() and db:
                try:
                    await db.execute(
                        update(WorkflowStep).where(WorkflowStep.id == step_id).values(status="completed")
                    )
                except Exception as ex:
                    logger.debug(f"Step status update error: {ex}")
            await db.commit()

    except Exception as e:
        logger.error(f"Error gathering workspace context: {e}")
        state["workspace_context"] = empty_context
        state["workspace_summary"] = {"error": str(e)}
        if 'run' in locals():
            run.status = "failed"
            run.error = str(e)
            run.completed_at = datetime.now(timezone.utc)
            db.add(run)
            # Step 13: Update step status in real-time
            if 'step_id' in locals() and db:
                try:
                    await db.execute(
                        update(WorkflowStep).where(WorkflowStep.id == step_id).values(status="failed")
                    )
                except Exception as ex:
                    logger.debug(f"Step status update error: {ex}")
            await db.commit()
            
    return state
