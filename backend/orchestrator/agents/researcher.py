"""
Research Agent for MYND AI Orchestrator.
Retrieves context from Qdrant and extracts factual findings.
"""

import json
import logging
import uuid
from datetime import datetime
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage

from orchestrator.state import AgentState
from rag.retriever import retrieve_context
from llm.provider import get_llm
from models.orchestrator import AgentRun, WorkflowStep, Workflow, Objective

logger = logging.getLogger(__name__)

async def research_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Research Node:
    1. Retrieves semantic context from Qdrant.
    2. Analyzes context with LLM to extract facts.
    3. Logs execution to Database.
    """
    logger.info("Starting Research Agent...")
    
    # 1. Retrieve DB session from config
    db = config.get("configurable", {}).get("db")
    if not db:
        raise ValueError("Database session 'db' must be provided in config['configurable'].")
        
    # Create DB Tracking Records if they don't exist
    # To log an AgentRun, we need a WorkflowStep -> Workflow -> Objective
    objective_id = state.get("objective_id")
    if not objective_id:
        objective_id = str(uuid.uuid4())
        state["objective_id"] = objective_id
        
    # Database Logging - Start
    try:
        # Check if objective exists (if not, this is a mock/test run, we should create the hierarchy)
        obj = await db.get(Objective, objective_id)
        if not obj:
            obj = Objective(id=objective_id, user_id=state["user_id"], raw_input=state["raw_query"])
            db.add(obj)
            workflow = Workflow(id=uuid.uuid4(), objective_id=objective_id)
            db.add(workflow)
            step = WorkflowStep(id=uuid.uuid4(), workflow_id=workflow.id, step_order=1, intent_type="research")
            db.add(step)
            await db.flush()
        else:
            # For simplicity in this iteration, query for the first workflow
            from sqlalchemy.future import select
            result = await db.execute(select(Workflow).where(Workflow.objective_id == objective_id))
            workflow = result.scalars().first()
            if not workflow:
                workflow = Workflow(id=uuid.uuid4(), objective_id=objective_id)
                db.add(workflow)
                
            step = WorkflowStep(id=uuid.uuid4(), workflow_id=workflow.id, step_order=1, intent_type="research")
            db.add(step)
            await db.flush()
            
        run = AgentRun(
            id=uuid.uuid4(),
            workflow_step_id=step.id,
            agent_type="researcher",
            status="running",
            started_at=datetime.utcnow(),
            input_context={"raw_query": state["raw_query"]}
        )
        db.add(run)
        await db.commit()
    except Exception as e:
        logger.error(f"Error creating DB records: {e}")
        await db.rollback()
        raise

    try:
        # 2. Retrieve Context from Qdrant (Documents + Knowledge)
        context_results = await retrieve_context(
            query=state["raw_query"],
            user_id=state["user_id"],
            space_id=state["space_id"]
        )

        try:
            from rag.knowledge_retriever import retrieve_knowledge
            knowledge_results = await retrieve_knowledge(
                query=state["raw_query"],
                user_id=state["user_id"],
                space_id=state["space_id"],
                top_k=5,
            )
        except Exception as k_err:
            logger.warning(f"Knowledge retrieval note in researcher: {k_err}")
            knowledge_results = []
        
        state["retrieved_context"] = context_results
        state["retrieved_knowledge"] = knowledge_results
        
        # 3. Call LLM to extract facts
        llm = get_llm()
        
        context_blocks = []
        for c in context_results:
            context_blocks.append(f"[DOCUMENT CONTEXT | Source: {c['source']}]\n{c['content']}")
        for k in knowledge_results:
            context_blocks.append(f"[STRUCTURED KNOWLEDGE ({k['knowledge_type'].upper()}) | Source: {k['source']}]\n{k['content']}")

        context_str = "\n\n".join(context_blocks)
        
        system_prompt = (
            "You are an expert Research Agent for QueryMind. "
            "Analyze the provided context and the user query.\n\n"
            "CRITICAL RULES:\n"
            "1. Evaluate if the Context is ACTUALLY RELEVANT to the user's specific query.\n"
            "2. If the user is asking a general knowledge question (e.g. 'what is the capital of India', 'how are you', 'what is the weather', general coding, math, general science) "
            "and the Context is unrelated (e.g. a resume or technical report not asked for), DO NOT extract irrelevant facts. Return empty arrays:\n"
            '   {"facts": [], "important_points": [], "sources": []}\n'
            "3. If the Context contains information genuinely relevant to answering the user's query, extract the factual information, key points, and document sources.\n"
            "4. Return a strictly valid JSON object with this exact structure:\n"
            "{\n"
            '  "facts": ["fact 1", "fact 2"],\n'
            '  "important_points": ["point 1"],\n'
            '  "sources": ["source 1"]\n'
            "}"
        )

        
        human_prompt = f"Query: {state['raw_query']}\n\nContext:\n{context_str}"
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = await llm.ainvoke(messages)
        
        # Parse JSON safely using regex to extract JSON object even if wrapped in text/markdown
        import re
        content = response.content
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            content = match.group(0)
        else:
            content = content.replace("```json", "").replace("```", "").strip()
            
        try:
            findings = json.loads(content)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode JSON from LLM: {content}")
            findings = {"facts": ["Failed to parse facts from LLM"], "important_points": [], "sources": []}
        
        state["research_findings"] = findings
        
        # Database Logging - Complete
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        run.output_summary = json.dumps(findings)
        db.add(run)
        await db.commit()
        
        return state
        
    except Exception as e:
        logger.error(f"Researcher failed: {e}")
        run.status = "failed"
        run.error = str(e)
        run.completed_at = datetime.utcnow()
        db.add(run)
        await db.commit()
        raise
