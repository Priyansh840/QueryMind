"""
Research Agent for MYND AI Orchestrator.
Retrieves context from Qdrant and extracts factual findings for specific tasks.
"""

import json
import logging
import uuid
from datetime import datetime
from langchain_core.runnables import RunnableConfig

from orchestrator.state import AgentState
from rag.retriever import retrieve_context
from models.orchestrator import AgentRun, WorkflowStep, Workflow
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger(__name__)

async def research_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Research Node:
    Executes all 'pending' tasks in state['research_tasks'].
    """
    logger.info("Starting Research Agent...")
    
    db = config.get("configurable", {}).get("db") if config else None
    objective_id = state.get("objective_id")
    workflow_iteration = state.get("workflow_iteration", 1)
    
    if db and objective_id:
        try:
            obj_uuid = uuid.UUID(objective_id)
            workflow_id = uuid.uuid5(obj_uuid, "workflow")
            step_id = uuid.uuid5(workflow_id, f"researcher_{workflow_iteration}")
            
            step_order = (workflow_iteration * 10) + 2  # 12, 22, 32...
            step_stmt = insert(WorkflowStep).values(
                id=step_id, workflow_id=workflow_id, step_order=step_order, 
                iteration=workflow_iteration, intent_type="research"
            ).on_conflict_do_nothing()
            await db.execute(step_stmt)
            await db.commit()
        except Exception as e:
            logger.warning(f"Error creating DB records for researcher step: {e}")
            await db.rollback()

    if "research_results" not in state:
        state["research_results"] = []
        
    for task in state.get("research_tasks", []):
        if task.get("status") != "pending":
            continue
            
        # Log Agent Run for this specific task
        if db and 'step_id' in locals():
            try:
                run_id = uuid.uuid4()
                run = AgentRun(
                    id=run_id,
                    workflow_step_id=step_id,
                    agent_type="researcher",
                    task_id=task["id"],
                    status="running",
                    started_at=datetime.utcnow(),
                    input_context={"query": task["query"], "purpose": task["purpose"]}
                )
                db.add(run)
                await db.commit()
            except Exception:
                pass
        
        state["total_research_tasks"] = state.get("total_research_tasks", 0) + 1
        
        try:
            context_results = await retrieve_context(
                query=task["query"],
                user_id=state["user_id"],
                space_id=state["space_id"]
            )
            
            evidence_list = []
            for c in context_results:
                evidence_list.append({
                    "chunk_id": str(c.get("chunk_id", "")),
                    "document_title": c.get("document_title", "Unknown"),
                    "source": c.get("source", "Unknown"),
                    "page_number": c.get("page_number"),
                    "content": c.get("content", ""),
                    "relevance_score": c.get("score")
                })
            
            status = "completed" if evidence_list else "no_evidence"
            
            result = {
                "task_id": task["id"],
                "query": task["query"],
                "iteration": workflow_iteration,
                "status": status,
                "error": None,
                "evidence": evidence_list
            }
            
            task["status"] = "completed"
            state["research_results"].append(result)
            
            if db and 'run' in locals():
                try:
                    run.status = status
                    run.output_summary = result
                    run.completed_at = datetime.utcnow()
                    db.add(run)
                    await db.commit()
                except Exception:
                    pass
            
        except Exception as e:
            logger.error(f"Researcher failed for task {task['id']}: {e}")
            result = {
                "task_id": task["id"],
                "query": task["query"],
                "iteration": workflow_iteration,
                "status": "failed",
                "error": str(e),
                "evidence": []
            }
            task["status"] = "failed"
            state["research_results"].append(result)
            
            if db and 'run' in locals():
                try:
                    run.status = "failed"
                    run.error = str(e)
                    run.output_summary = result
                    run.completed_at = datetime.utcnow()
                    db.add(run)
                    await db.commit()
                except Exception:
                    pass

    return state
