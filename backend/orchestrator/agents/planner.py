import logging
import uuid
from datetime import datetime
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage

from orchestrator.state import AgentState
from orchestrator.schemas import PlannerOutput
from llm.provider import get_llm
from models.orchestrator import AgentRun, WorkflowStep, Workflow, Objective
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger(__name__)

async def planner_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Planner Node:
    1. Analyzes user query and chat history.
    2. Decides if research is needed and formulates tasks.
    """
    logger.info("Starting Planner Agent...")
    
    db = config.get("configurable", {}).get("db") if config else None
    objective_id = state.get("objective_id")
    workflow_iteration = state.get("workflow_iteration", 1)
    
    if db and objective_id:
        try:
            obj_uuid = uuid.UUID(objective_id)
            workflow_id = uuid.uuid5(obj_uuid, "workflow")
            step_id = uuid.uuid5(workflow_id, f"planner_{workflow_iteration}")
            
            # Ensure Workflow exists
            workflow_stmt = insert(Workflow).values(
                id=workflow_id, objective_id=obj_uuid
            ).on_conflict_do_nothing()
            await db.execute(workflow_stmt)
            
            # Ensure Step exists
            step_order = (workflow_iteration * 10) + 1  # 11, 21, 31...
            step_stmt = insert(WorkflowStep).values(
                id=step_id, workflow_id=workflow_id, step_order=step_order, 
                iteration=workflow_iteration, intent_type="planning"
            ).on_conflict_do_nothing()
            await db.execute(step_stmt)
            
            # Agent Run
            run_id = uuid.uuid4()
            run = AgentRun(
                id=run_id,
                workflow_step_id=step_id,
                agent_type="planner",
                status="running",
                started_at=datetime.utcnow(),
                input_context={"raw_query": state.get("raw_query", "")}
            )
            db.add(run)
            await db.commit()
        except Exception as e:
            logger.warning(f"Error creating DB records for planner: {e}")
            await db.rollback()

    try:
        llm = get_llm(temperature=0.1)
        # Use structured output
        structured_llm = llm.with_structured_output(PlannerOutput)
        
        system_prompt = (
            "You are the Planner Agent for MYND (QueryMind), an intelligent workspace assistant operating within a specific Space.\n\n"
            "Analyze the user's query and the chat history to determine if we need to search the user's uploaded knowledge vault.\n"
            "- If the user asks about ANY document, file, CV, resume, notes, names, experiences, or project details uploaded to this space, set needs_research to true.\n"
            "- When formulating search tasks, write effective semantic queries that will match content inside the document (e.g. for 'what is my name in the document' or 'in the document', create queries like 'name candidate personal details contact information resume summary' or 'profile overview').\n"
            "- If the user asks a purely generic question (e.g. general math, generic coding theory, general chit-chat) unrelated to workspace documents, set needs_research to false.\n"
            "- Return a structured plan with needs_research, reasoning_summary, and specific search tasks."
        )
        
        from orchestrator.context_formatter import format_workspace_context
        ctx_str = format_workspace_context(state.get("workspace_context"))
        if ctx_str:
            system_prompt += f"\n\n{ctx_str}"
        
        messages = [SystemMessage(content=system_prompt)]
        messages.extend(state.get("chat_history", []))
        messages.append(HumanMessage(content=state['raw_query']))
        
        # Call LLM
        response: PlannerOutput = await structured_llm.ainvoke(messages, config=config)
        
        # Update State
        state["planner_output"] = response.model_dump()
        
        research_tasks = []
        if response.needs_research:
            for t in response.tasks:
                research_tasks.append({
                    "id": t.id,
                    "iteration": workflow_iteration,
                    "query": t.query,
                    "purpose": t.purpose,
                    "status": "pending"
                })
        
        state["research_tasks"] = research_tasks
        
        # Database Logging - Complete
        if db and 'run' in locals():
            try:
                run.status = "completed"
                run.completed_at = datetime.utcnow()
                run.output_summary = response.model_dump()
                db.add(run)
                await db.commit()
            except Exception as run_err:
                logger.warning(f"Telemetry save error: {run_err}")
        
        return state
        
    except Exception as e:
        logger.error(f"Planner failed: {e}")
        if db and 'run' in locals():
            try:
                run.status = "failed"
                run.error = str(e)
                run.completed_at = datetime.utcnow()
                db.add(run)
                await db.commit()
            except Exception:
                pass
        
        # Set a safe fallback state
        state["workflow_status"] = "failed"
        state["planner_output"] = {"needs_research": False, "reasoning_summary": "Planner failed", "tasks": []}
        state["research_tasks"] = []
        return state
