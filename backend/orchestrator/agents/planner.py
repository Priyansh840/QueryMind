import logging
import uuid
from datetime import datetime, timezone
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage

from orchestrator.state import AgentState
from orchestrator.schemas import PlannerOutput
from llm.provider import get_llm
from models.orchestrator import AgentRun, WorkflowStep, Workflow, Objective
from sqlalchemy import update
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
        # Deterministic IDs
        obj_uuid = uuid.UUID(objective_id)
        workflow_id = uuid.uuid5(obj_uuid, "workflow")
        step_id = uuid.uuid5(workflow_id, f"planner_{workflow_iteration}")
        
        try:
            # Ensure Workflow exists
            workflow_stmt = insert(Workflow).values(
                id=workflow_id, objective_id=obj_uuid
            ).on_conflict_do_nothing()
            await db.execute(workflow_stmt)
            
            # Ensure Step exists
            step_order = (workflow_iteration * 10) + 1  # 11, 21, 31...
            step_stmt = insert(WorkflowStep).values(
                id=step_id, workflow_id=workflow_id, step_order=step_order, 
                iteration=workflow_iteration, intent_type="planning",
                status="running"
            ).on_conflict_do_update(
                index_elements=['id'],
                set_={'status': 'running'}
            )
            await db.execute(step_stmt)
            
            # Agent Run
            run_id = uuid.uuid4()
            run = AgentRun(
                id=run_id,
                workflow_step_id=step_id,
                agent_type="planner",
                status="running",
                started_at=datetime.now(timezone.utc),
                input_context={"raw_query": state.get("raw_query", "")}
            )
            db.add(run)
            await db.commit()
        except Exception as e:
            logger.error(f"Error creating DB records for planner: {e}")
            await db.rollback()
            raise

    # Fast deterministic check for simple greetings / pleasantries
    raw_q = (state.get("raw_query") or "").strip().lower()
    GREETINGS = {
        "hello", "hi", "hey", "well hello there", "hello there", "good morning", 
        "good afternoon", "good evening", "howdy", "sup", "what's up", "whats up",
        "hi there", "hey there", "greetings", "yo"
    }
    # If the user query is strictly a greeting, bypass research immediately
    is_pure_greeting = raw_q in GREETINGS or (
        len(raw_q.split()) <= 4 and any(raw_q.startswith(g) or raw_q.endswith(g) for g in ["hello", "hi", "hey", "howdy"]) and not any(k in raw_q for k in ["doc", "file", "syllabus", "pdf", "goal", "task", "project", "space", "summarize", "find", "search", "who", "what"])
    )

    if is_pure_greeting:
        logger.info(f"Planner: Detected conversational greeting '{raw_q}'. Bypassing research.")
        planner_result = {
            "needs_research": False,
            "is_conversational": True,
            "reasoning_summary": "The user query is a friendly greeting or conversational pleasantry. No document research or workspace action is required.",
            "tasks": []
        }
        state["planner_output"] = planner_result
        state["research_tasks"] = []
        if db and 'run' in locals():
            try:
                run.status = "completed"
                run.completed_at = datetime.now(timezone.utc)
                run.output_summary = planner_result
                db.add(run)
                if 'step_id' in locals():
                    try:
                        await db.execute(
                            update(WorkflowStep).where(WorkflowStep.id == step_id).values(status="completed")
                        )
                    except Exception as ex:
                        logger.debug(f"Step status update error: {ex}")
                await db.commit()
            except Exception as run_err:
                logger.warning(f"Telemetry save error: {run_err}")
        return state

    try:
        llm = get_llm(temperature=0.1)
        # Use structured output
        structured_llm = llm.with_structured_output(PlannerOutput)
        
        system_prompt = (
            "You are the Planner Agent for MYND (QueryMind), an intelligent workspace assistant operating within a specific Space.\n\n"
            "Analyze the user's query and the chat history to determine if we need to search the user's uploaded knowledge vault.\n"
            "- CRITICAL RULE FOR GREETINGS AND CHAT: If the user says hello, hi, greetings, or engages in casual small talk (e.g. 'well hello there', 'hi, how are you?'), set needs_research to FALSE! Never perform research on uploaded documents for casual greetings.\n"
            "- If the user asks about ANY document, file, CV, resume, notes, names, experiences, or project details uploaded to this space, set needs_research to true.\n"
            "- STRICT DOCUMENT TARGETING & DISJOINT SOURCE ISOLATION:\n"
            "  * If the user specifically mentions or refers to a particular document, acronym, or file title (e.g. 'aies', 'AIES', 'cd', 'CD', 'CV', 'resume', 'architecture spec') that matches any file listed in <uploaded_documents_in_space>, you MUST include the target document name/subject explicitly in every search query! Never formulate queries for a different document.\n"
            "  * PREVENT CV / RESUME POLLUTION IN TECHNICAL TOPICS: When the user is studying, practicing, solving problems, or asking technical questions (e.g., 'Data Structures', 'Algorithms', 'Foundational Computing Pillars', 'Operating Systems', 'System Design', 'Compiler Design', 'practice sprint'), NEVER search for or pull in personal career documents like 'CV', 'resume', 'candidate profile', or 'work history' unless the user EXPLICITLY asks about their career or resume! Target ONLY relevant technical books, syllabus notes, or problem sets in the workspace.\n"
            "  * If the context mentions an active goal with specific assigned document IDs, prioritize queries strictly matching those assigned documents.\n"
            "- CRITICAL EXCEPTION FOR DOCUMENT-TO-GOAL: If the user commands creating a goal or roadmap based on an uploaded document, file, syllabus, or notes (e.g., 'create a goal from my syllabus', 'generate goals based on the uploaded document', 'make a study plan from the pdf'), set needs_research to true and formulate queries to extract topics, chapters, and milestones from that document!\n"
            "- If the user asks to generate, write, or export a PDF or document based on their profile, resume, or workspace data, set needs_research to true if you need to fetch their name or details, otherwise proceed to direct synthesis.\n"
            "- If the user's query is a standalone command to create a goal/space/project without referencing any uploaded documents (e.g., 'create a goal to learn DSA with 3 tasks', 'make a new goal', 'create a space', 'create a project', 'add a memory', 'save a note'), set needs_research to false so the system immediately routes to decision analysis and action execution.\n"
            "- When formulating search tasks, write effective semantic queries that will match content inside the document (e.g. for 'what is my name in the document' or 'in the document', create queries like 'name candidate personal details contact information resume summary' or 'profile overview').\n"
            "- If the user asks a purely generic question (e.g. general math, generic coding theory, general chit-chat) unrelated to workspace documents, set needs_research to false.\n"
            "- Keep research tasks highly focused: return at most 1 to 2 targeted search tasks to maintain fast responsiveness.\n"
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
                run.completed_at = datetime.now(timezone.utc)
                run.output_summary = response.model_dump()
                db.add(run)
                # Step 13: Update step status in real-time
                if 'step_id' in locals():
                    try:
                        await db.execute(
                            update(WorkflowStep).where(WorkflowStep.id == step_id).values(status="completed")
                        )
                    except Exception as ex:
                        logger.debug(f"Step status update error: {ex}")
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
                run.completed_at = datetime.now(timezone.utc)
                db.add(run)
                # Step 13: Update step status in real-time
                if 'step_id' in locals():
                    try:
                        await db.execute(
                            update(WorkflowStep).where(WorkflowStep.id == step_id).values(status="failed")
                        )
                    except Exception as ex:
                        logger.debug(f"Step status update error: {ex}")
                await db.commit()
            except Exception as db_err:
                logger.warning(f"Telemetry error update failed in planner: {db_err}")
        
        # Set a safe fallback state
        state["workflow_status"] = "failed"
        state["planner_output"] = {"needs_research": False, "reasoning_summary": "Planner failed", "tasks": []}
        state["research_tasks"] = []
        return state
