"""
Research Agent for MYND AI Orchestrator.
Retrieves context from Qdrant and extracts factual findings for specific tasks.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from langchain_core.runnables import RunnableConfig

from orchestrator.state import AgentState
from rag.retriever import retrieve_context
from rag.knowledge_retriever import retrieve_knowledge
from models.orchestrator import AgentRun, WorkflowStep, Workflow
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger(__name__)

async def research_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Research Node:
    Executes all 'pending' tasks in state['research_tasks'].
    Consumes both raw document chunks and structured knowledge with bounded deterministic merge.
    """
    logger.info("Starting Research Agent...")
    
    db = config.get("configurable", {}).get("db") if config else None
    objective_id = state.get("objective_id")
    workflow_iteration = state.get("workflow_iteration", 1)
    
    if db and objective_id:
        obj_uuid = uuid.UUID(objective_id)
        workflow_id = uuid.uuid5(obj_uuid, "workflow")
        step_id = uuid.uuid5(workflow_id, f"researcher_{workflow_iteration}")
        
        try:
            step_order = (workflow_iteration * 10) + 2  # 12, 22, 32...
            step_stmt = insert(WorkflowStep).values(
                id=step_id, workflow_id=workflow_id, step_order=step_order, 
                iteration=workflow_iteration, intent_type="research",
                status="running"
            ).on_conflict_do_update(
                index_elements=['id'],
                set_={'status': 'running'}
            )
            await db.execute(step_stmt)
            await db.commit()
        except Exception as e:
            logger.error(f"Error creating DB records for researcher step: {e}")
            await db.rollback()
            raise

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
                    started_at=datetime.now(timezone.utc),
                    input_context={"query": task["query"], "purpose": task["purpose"]}
                )
                db.add(run)
                await db.commit()
            except Exception as e:
                logger.warning(f"Error logging agent run in researcher: {e}")
        
        state["total_research_tasks"] = state.get("total_research_tasks", 0) + 1
        
        try:
            # 1. Retrieve Raw Document Chunks (max 5)
            context_results = []
            try:
                context_results = await retrieve_context(
                    query=task["query"],
                    user_id=state.get("user_id"),
                    space_id=state.get("space_id"),
                    top_k=5,
                )
            except Exception as e_ctx:
                logger.warning(f"retrieve_context failed for task {task['id']}: {e_ctx}")

            # 2. Retrieve Structured Knowledge (max 4)
            knowledge_results = []
            try:
                knowledge_results = await retrieve_knowledge(
                    query=task["query"],
                    user_id=state.get("user_id"),
                    space_id=state.get("space_id"),
                    top_k=4,
                )
            except Exception as e_kn:
                logger.warning(f"retrieve_knowledge failed for task {task['id']}: {e_kn}")

            # 3. Standardize and format evidence
            raw_evidence = []
            for c in context_results:
                raw_evidence.append({
                    "source_type": "document",
                    "chunk_id": str(c.get("chunk_id", "")),
                    "document_id": str(c.get("document_id")) if c.get("document_id") else None,
                    "document_title": c.get("document_title", "Unknown"),
                    "source": c.get("source", f"{c.get('document_title', 'Unknown')} (Page {c.get('page_number', 1)})"),
                    "page_number": c.get("page_number"),
                    "content": c.get("content", ""),
                    "relevance_score": c.get("score") if c.get("score") is not None else 0.0,
                    "knowledge_type": None,
                    "source_chunk_id": str(c.get("chunk_id", "")),
                })

            kn_evidence = []
            for k in knowledge_results:
                kn_evidence.append({
                    "source_type": "knowledge",
                    "chunk_id": str(k.get("chunk_id")) if k.get("chunk_id") else str(k.get("knowledge_id", "")),
                    "knowledge_id": str(k.get("knowledge_id", "")),
                    "document_id": str(k.get("document_id")) if k.get("document_id") else None,
                    "document_title": k.get("document_title", "Unknown"),
                    "source": k.get("source", f"{k.get('document_title', 'Unknown')} (Page {k.get('page_number', 1)})"),
                    "page_number": k.get("page_number"),
                    "content": k.get("content", ""),
                    "relevance_score": k.get("relevance_score") if k.get("relevance_score") is not None else 0.0,
                    "knowledge_type": k.get("knowledge_type"),
                    "source_chunk_id": str(k.get("source_chunk_id")) if k.get("source_chunk_id") else None,
                })

            # Bounded deterministic merge:
            # - raw document evidence: max 5
            # - Knowledge evidence: max 4
            # - merged total: max 8
            # - sort by relevance score descending
            combined = raw_evidence[:5] + kn_evidence[:4]

            # Deduplicate by content: if exact same content text exists in both, keep higher score
            deduped = {}
            for item in combined:
                content_key = item["content"].strip().lower()
                if content_key in deduped:
                    if (item["relevance_score"] or 0.0) > (deduped[content_key]["relevance_score"] or 0.0):
                        deduped[content_key] = item
                else:
                    deduped[content_key] = item

            merged_list = list(deduped.values())
            merged_list.sort(
                key=lambda x: (
                    x["relevance_score"] if x["relevance_score"] is not None else -1.0,
                    x.get("document_title", ""),
                ),
                reverse=True,
            )
            evidence_list = merged_list[:8]

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
                    run.completed_at = datetime.now(timezone.utc)
                    db.add(run)
                    await db.commit()
                except Exception as e:
                    logger.warning(f"Telemetry save error in researcher: {e}")
            
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
                    run.completed_at = datetime.now(timezone.utc)
                    db.add(run)
                    await db.commit()
                except Exception as db_err:
                    logger.warning(f"Telemetry error update failed in researcher: {db_err}")

    # Step 13: Update step status after all research tasks complete
    if 'step_id' in locals() and db:
        try:
            await db.execute(
                update(WorkflowStep).where(WorkflowStep.id == step_id).values(status="completed")
            )
            await db.commit()
        except Exception as ex:
            logger.debug(f"Step status update error: {ex}")

    return state
