import logging
import uuid
from datetime import datetime
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage

from orchestrator.state import AgentState
from orchestrator.schemas import CriticOutput
from llm.provider import get_llm
from models.orchestrator import AgentRun, WorkflowStep, Workflow
from sqlalchemy.dialects.postgresql import insert

MAX_WORKFLOW_ITERATIONS = 3

logger = logging.getLogger(__name__)

async def critic_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Critic Node:
    1. Evaluates if the current research_results answer the user's query.
    2. Decides to accept or request more research.
    """
    logger.info("Starting Critic Agent...")
    
    db = config.get("configurable", {}).get("db") if config else None
    objective_id = state.get("objective_id")
    workflow_iteration = state.get("workflow_iteration", 1)
    
    if db and objective_id:
        try:
            obj_uuid = uuid.UUID(objective_id)
            workflow_id = uuid.uuid5(obj_uuid, "workflow")
            step_id = uuid.uuid5(workflow_id, f"critic_{workflow_iteration}")
            
            step_order = (workflow_iteration * 10) + 3  # 13, 23, 33...
            step_stmt = insert(WorkflowStep).values(
                id=step_id, workflow_id=workflow_id, step_order=step_order, 
                iteration=workflow_iteration, intent_type="critique"
            ).on_conflict_do_nothing()
            await db.execute(step_stmt)
            
            run_id = uuid.uuid4()
            run = AgentRun(
                id=run_id,
                workflow_step_id=step_id,
                agent_type="critic",
                status="running",
                started_at=datetime.utcnow(),
                input_context={"results_count": len(state.get("research_results", []))}
            )
            db.add(run)
            await db.commit()
        except Exception as e:
            logger.warning(f"Error creating DB records for critic: {e}")
            await db.rollback()

    try:
        llm = get_llm(temperature=0.1)
        structured_llm = llm.with_structured_output(CriticOutput)
        
        system_prompt = (
            "You are the Critic Agent for QueryMind. Your job is to review the retrieved evidence "
            "and determine if it is sufficient to accurately and fully answer the user's query.\n"
            "If the evidence is sufficient, decide 'accept'.\n"
            "If crucial information is missing, decide 'research_more' and provide missing_tasks."
        )
        
        # Build evidence context
        results_context = []
        for res in state.get("research_results", []):
            if res.get("status") == "completed":
                ev_str = "\n".join([f"- {e.get('content')} (Source: {e.get('document_title')})" for e in res.get("evidence", [])])
                results_context.append(f"Task: {res.get('query')}\nEvidence:\n{ev_str}")
            elif res.get("status") == "no_evidence":
                results_context.append(f"Task: {res.get('query')}\nEvidence: [NO EVIDENCE FOUND]")
            elif res.get("status") == "failed":
                results_context.append(f"Task: {res.get('query')}\nEvidence: [RESEARCH FAILED]")
        
        evidence_str = "\n\n".join(results_context)
        
        human_prompt = f"User Query: {state.get('raw_query', '')}\n\nCurrent Evidence:\n{evidence_str}"
        
        messages = [SystemMessage(content=system_prompt)]
        messages.extend(state.get("chat_history", []))
        messages.append(HumanMessage(content=human_prompt))
        
        response: CriticOutput = await structured_llm.ainvoke(messages, config=config)
        
        state["critic_output"] = response.model_dump()
        
        # Add missing tasks to research_tasks if research_more
        if response.decision == "research_more":
            if workflow_iteration >= MAX_WORKFLOW_ITERATIONS:
                logger.warning("Max workflow iterations reached, setting terminated_budget.")
                state["workflow_status"] = "terminated_budget"
            else:
                state["workflow_iteration"] = workflow_iteration + 1
                for t in response.missing_tasks:
                    state["research_tasks"].append({
                        "id": t.id,
                        "iteration": workflow_iteration + 1,
                        "query": t.query,
                        "purpose": t.purpose,
                        "status": "pending"
                    })
        
        # Database Logging - Complete
        if db and 'run' in locals():
            try:
                run.status = "completed"
                run.completed_at = datetime.utcnow()
                run.output_summary = response.model_dump()
                db.add(run)
                await db.commit()
            except Exception:
                pass
        
        return state
        
    except Exception as e:
        logger.error(f"Critic failed: {e}")
        if db and 'run' in locals():
            try:
                run.status = "failed"
                run.error = str(e)
                run.completed_at = datetime.utcnow()
                db.add(run)
                await db.commit()
            except Exception:
                pass
        
        # Safe fallback
        state["workflow_status"] = "failed"
        state["critic_output"] = {"decision": "accept", "reason": "Critic failed, forcing synthesis.", "missing_tasks": []}
        return state
