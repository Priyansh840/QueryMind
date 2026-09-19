import logging
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage
import uuid
from datetime import datetime

from orchestrator.state import AgentState
from orchestrator.schemas import DecisionAnalysis
from llm.provider import get_llm
from orchestrator.context_formatter import format_workspace_context
from models.orchestrator import AgentRun, WorkflowStep
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger(__name__)

async def decision_analyzer_node(state: AgentState, config: RunnableConfig) -> AgentState:
    logger.info("Starting DecisionAnalyzer Node...")
    
    db = config.get("configurable", {}).get("db") if config else None
    objective_id = state.get("objective_id")
    workflow_iteration = state.get("workflow_iteration", 1)
    
    if db and objective_id:
        try:
            obj_uuid = uuid.UUID(objective_id)
            workflow_id = uuid.uuid5(obj_uuid, "workflow")
            step_id = uuid.uuid5(workflow_id, f"decision_{workflow_iteration}")
            
            step_order = (workflow_iteration * 10) + 8
            step_stmt = insert(WorkflowStep).values(
                id=step_id, workflow_id=workflow_id, step_order=step_order, 
                iteration=workflow_iteration, intent_type="decision_analysis"
            ).on_conflict_do_nothing()
            await db.execute(step_stmt)
            
            run_id = uuid.uuid4()
            run = AgentRun(
                id=run_id,
                workflow_step_id=step_id,
                agent_type="decision_analyzer",
                status="running",
                started_at=datetime.utcnow(),
                input_context={"workspace_counts": len(state.get("workspace_context", {}).get("goals", []))}
            )
            db.add(run)
            await db.commit()
        except Exception as e:
            logger.warning(f"Error creating DB records for decision_analyzer: {e}")
            await db.rollback()
    
    try:
        llm = get_llm(temperature=0.1)
        structured_llm = llm.with_structured_output(DecisionAnalysis)
        
        system_prompt = (
            "You are the Decision Analyzer Agent for QueryMind. "
            "Your objective is to analyze the user's workspace context, research results, and conversation history "
            "to identify evidence-grounded priorities, blockers, and actionable recommendations.\n"
            "You MUST explicitly follow these strict rules:\n"
            "1. You may ONLY use evidence that exists in the provided workspace context, research results, or chat history.\n"
            "2. DO NOT fabricate documents, goals, projects, memories, deadlines, facts, or source IDs.\n"
            "3. Separate FACT (directly supported by provided evidence) from INFERENCE (conclusion drawn from evidence).\n"
            "4. A recommendation must be actionable, specific, related to the user's query, and grounded in evidence.\n"
            "5. The confidence level (high/medium/low) must reflect the quality and directness of the evidence.\n"
            "6. Blockers must be grounded in evidence. If no evidence supports a blocker, return an empty list.\n"
            "7. If the user's query is unrelated to the workspace, DO NOT generate generic recommendations or blockers.\n"
            "8. If there is insufficient evidence to make a recommendation, return an empty recommendations list and explain the missing information in the 'uncertainties' list.\n"
            "9. Ensure `source_type` is one of: 'workspace', 'document', 'conversation'.\n"
        )
        
        # Append Workspace Context
        ctx_str = format_workspace_context(state.get("workspace_context"))
        if ctx_str:
            system_prompt += f"\n\n{ctx_str}"
            
        # Append Research Results
        research_results = state.get("research_results", [])
        if research_results:
            system_prompt += "\n\nRESEARCH RESULTS:"
            for r in research_results:
                system_prompt += f"\n- Task: {r.get('query')}"
                for ev in r.get("evidence", []):
                    system_prompt += f"\n  - Evidence (chunk {ev.get('chunk_id')} from {ev.get('document_title')}): {ev.get('content')}"
        
        messages = [SystemMessage(content=system_prompt)]
        messages.extend(state.get("chat_history", []))
        messages.append(HumanMessage(content=state.get('raw_query', '')))
        
        # Call LLM
        response: DecisionAnalysis = await structured_llm.ainvoke(messages, config=config)
        
        # Serialize the Pydantic model to a dict for the state
        state["decision_output"] = response.model_dump()
        
        if db and 'run' in locals():
            try:
                run.status = "completed"
                run.completed_at = datetime.utcnow()
                run.output_summary = {
                    "recommendations_count": len(response.recommendations),
                    "blockers_count": len(response.blockers),
                    "uncertainties_count": len(response.uncertainties),
                    "confidence_levels": [r.confidence for r in response.recommendations]
                }
                db.add(run)
                await db.commit()
            except Exception:
                pass
        
        return state
        
    except Exception as e:
        logger.error(f"DecisionAnalyzer failed: {e}")
        if db and 'run' in locals():
            try:
                run.status = "failed"
                run.error = str(e)
                run.completed_at = datetime.utcnow()
                db.add(run)
                await db.commit()
            except Exception:
                pass
        
        fallback = DecisionAnalysis(
            blockers=[],
            recommendations=[],
            uncertainties=["Decision analysis could not be completed."]
        )
        state["decision_output"] = fallback.model_dump()
        return state
