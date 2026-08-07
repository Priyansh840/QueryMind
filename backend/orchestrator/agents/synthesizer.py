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
from models.orchestrator import AgentRun, WorkflowStep, Workflow, Objective, Synthesis

logger = logging.getLogger(__name__)

async def synthesis_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Synthesis Node:
    1. Takes research findings.
    2. Generates a clear, structured final synthesis.
    3. Logs execution to Database (AgentRun & Synthesis tables).
    """
    logger.info("Starting Synthesis Agent...")
    
    db = config.get("configurable", {}).get("db")
    if not db:
        raise ValueError("Database session 'db' must be provided in config['configurable'].")
        
    objective_id = state.get("objective_id")

    # Database Logging - Start
    try:
        # Assuming workflow and objective exist from researcher node
        obj = await db.get(Objective, objective_id)
        workflow = obj.workflows[0] if (obj and obj.workflows) else None
        
        if not workflow:
            raise ValueError("Workflow not found for Synthesis logging.")

        step = WorkflowStep(id=uuid.uuid4(), workflow_id=workflow.id, step_order=2, intent_type="synthesis")
        db.add(step)
        await db.flush()
            
        run = AgentRun(
            id=uuid.uuid4(),
            workflow_step_id=step.id,
            agent_type="synthesizer",
            status="running",
            started_at=datetime.utcnow(),
            input_context={"research_findings": state.get("research_findings")}
        )
        db.add(run)
        await db.commit()
    except Exception as e:
        logger.error(f"Error creating DB records for synthesizer: {e}")
        await db.rollback()
        raise

    try:
        findings = state.get("research_findings", {})
        
        llm = get_llm(temperature=0.4) # Slightly more creative for synthesis
        
        system_prompt = (
            "You are MYND Synthesis Agent. "
            "Your job is to take raw research findings and compile them into a clear, "
            "structured, and user-friendly final response. "
            "Ensure the tone is helpful and context-aware. "
            "Do not output raw JSON, output beautiful Markdown."
        )
        
        human_prompt = (
            f"Original Query: {state.get('raw_query')}\n\n"
            f"Research Facts: {json.dumps(findings.get('facts', []))}\n"
            f"Important Points: {json.dumps(findings.get('important_points', []))}\n"
            f"Sources: {json.dumps(findings.get('sources', []))}"
        )
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = await llm.ainvoke(messages)
        
        final_text = response.content.strip()
        
        state["final_synthesis"] = final_text
        state["citations"] = findings.get("sources", [])
        state["confidence_score"] = 0.95 # Mock for now
        
        # Database Logging - Complete
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        run.output_summary = final_text
        db.add(run)
        
        # Create final Synthesis record
        synth_record = Synthesis(
            id=uuid.uuid4(),
            objective_id=objective_id,
            findings=findings.get("facts", []),
            recommendations=findings.get("important_points", []),
            evidence=findings.get("sources", [])
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
        raise
