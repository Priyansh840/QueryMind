"""
Synthesis Agent for MYND AI Orchestrator.
Structures research findings into a final, user-friendly response.
"""

import json
import logging
import uuid
from datetime import datetime
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage

from orchestrator.state import AgentState
from llm.provider import get_llm
from models.orchestrator import AgentRun, WorkflowStep, Workflow, Synthesis
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger(__name__)

async def synthesis_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Synthesis Node:
    1. Takes all accumulated research results and planner output.
    2. Generates a clear, structured final synthesis.
    """
    logger.info("Starting Synthesis Agent...")
    
    db = config.get("configurable", {}).get("db")
    if not db:
        raise ValueError("Database session 'db' must be provided in config['configurable'].")
        
    objective_id = state.get("objective_id")
    workflow_iteration = state.get("workflow_iteration", 1)
    
    obj_uuid = uuid.UUID(objective_id)
    workflow_id = uuid.uuid5(obj_uuid, "workflow")
    step_id = uuid.uuid5(workflow_id, "synthesizer")
    
    try:
        step_order = 90  # Final step
        step_stmt = insert(WorkflowStep).values(
            id=step_id, workflow_id=workflow_id, step_order=step_order, 
            iteration=workflow_iteration, intent_type="synthesis"
        ).on_conflict_do_nothing()
        await db.execute(step_stmt)
        
        run_id = uuid.uuid4()
        run = AgentRun(
            id=run_id,
            workflow_step_id=step_id,
            agent_type="synthesizer",
            status="running",
            started_at=datetime.utcnow(),
            input_context={"results_count": len(state.get("research_results", []))}
        )
        db.add(run)
        await db.commit()
    except Exception as e:
        logger.error(f"Error creating DB records for synthesizer: {e}")
        await db.rollback()
        raise

    try:
        llm = get_llm(temperature=0.4)
        
        system_prompt = (
            "You are QueryMind, an intelligent and helpful AI assistant. "
            "You are provided with the user's original query, chat history, and evidence retrieved from the user's personal knowledge vault.\n\n"
            "CRITICAL RULES:\n"
            "1. If no research was required (NO_RESEARCH_REQUIRED), simply answer the general query naturally.\n"
            "2. If research was performed, use the provided evidence to thoroughly answer the query.\n"
            "3. If evidence is marked as NO_EVIDENCE, explicitly state that the information was not found in the vault. Do NOT hallucinate citations.\n"
            "4. If evidence is marked as RESEARCH_FAILED, mention that there was a technical issue retrieving some documents.\n"
            "5. Tone should be friendly, clear, and professional. Format with clean, beautiful Markdown."
        )
        
        planner_out = state.get("planner_output", {})
        results = state.get("research_results", [])
        
        context_blocks = []
        if not planner_out.get("needs_research", False):
            context_blocks.append("[NO_RESEARCH_REQUIRED]")
        else:
            for res in results:
                if res["status"] == "completed":
                    ev_str = "\n".join([f"- {e['content']} (Source: {e['document_title']})" for e in res["evidence"]])
                    context_blocks.append(f"Task: {res['query']}\nEvidence:\n{ev_str}")
                elif res["status"] == "no_evidence":
                    context_blocks.append(f"Task: {res['query']}\nEvidence: [NO_EVIDENCE]")
                elif res["status"] == "failed":
                    context_blocks.append(f"Task: {res['query']}\nEvidence: [RESEARCH_FAILED]")
                    
        human_prompt = (
            f"Original Query: {state.get('raw_query')}\n\n"
            f"Research Context:\n" + "\n\n".join(context_blocks)
        )
        
        if state.get("workflow_status") == "terminated_budget":
            human_prompt += "\n\nNOTE: The research process reached its maximum budget/iteration limits. Synthesize the best possible answer from the partial evidence provided."
            
        messages = [SystemMessage(content=system_prompt)]
        messages.extend(state.get("chat_history", []))
        messages.append(HumanMessage(content=human_prompt))
        
        response = await llm.ainvoke(messages, config=config)
        final_text = response.content.strip()
        
        # Extract unique citations (document titles)
        citations = []
        for res in results:
            if res["status"] == "completed":
                for e in res["evidence"]:
                    if e["document_title"] not in citations:
                        citations.append(e["document_title"])
        
        state["final_synthesis"] = final_text
        state["citations"] = citations
        if state.get("workflow_status") != "terminated_budget":
            state["workflow_status"] = "completed"
        
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        run.output_summary = {"text": final_text, "citations": citations}
        db.add(run)
        
        # Synthesis record
        synth_record = Synthesis(
            id=uuid.uuid4(),
            objective_id=obj_uuid,
            findings=[],
            recommendations=[],
            evidence=citations
        )
        db.add(synth_record)
        await db.commit()
        
        return state
        
    except Exception as e:
        logger.error(f"Synthesizer failed: {e}")
        run.status = "failed"
        run.error = str(e)
        run.completed_at = datetime.utcnow()
        db.add(run)
        await db.commit()
        
        state["final_synthesis"] = "I encountered a critical error while synthesizing the final response. Please try again later."
        state["workflow_status"] = "failed"
        return state
