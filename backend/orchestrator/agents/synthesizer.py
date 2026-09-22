"""
Synthesis Agent for MYND AI Orchestrator.
Structures research findings into a final, user-friendly response.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage

from orchestrator.state import AgentState
from llm.provider import get_llm
from models.orchestrator import AgentRun, WorkflowStep, Workflow, Synthesis
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger(__name__)

async def synthesis_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    Synthesis Node:
    1. Takes all accumulated research results and planner output.
    2. Generates a clear, structured final synthesis.
    """
    logger.info("Starting Synthesis Agent...")
    
    db = config.get("configurable", {}).get("db") if config else None
    objective_id = state.get("objective_id")
    workflow_iteration = state.get("workflow_iteration", 1)
    
    if db and objective_id:
        obj_uuid = uuid.UUID(objective_id)
        workflow_id = uuid.uuid5(obj_uuid, "workflow")
        step_id = uuid.uuid5(workflow_id, "synthesizer")
        
        try:
            step_order = 90  # Final step
            step_stmt = insert(WorkflowStep).values(
                id=step_id, workflow_id=workflow_id, step_order=step_order, 
                iteration=workflow_iteration, intent_type="synthesis",
                status="running"
            ).on_conflict_do_update(
                index_elements=['id'],
                set_={'status': 'running'}
            )
            await db.execute(step_stmt)
            
            run_id = uuid.uuid4()
            run = AgentRun(
                id=run_id,
                workflow_step_id=step_id,
                agent_type="synthesizer",
                status="running",
                started_at=datetime.now(timezone.utc),
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
        
        space_info = (state.get("workspace_context") or {}).get("space") or {}
        domain_role = space_info.get("domain_role", "INTELLIGENT WORKSPACE AI ASSISTANT")
        domain_guidance = space_info.get("domain_guidance", "")
        domain_type = space_info.get("domain_type", "custom")

        system_prompt = (
            f"You are MYND operating as: {domain_role}.\n"
            f"Active Space: {space_info.get('name', 'General Space')} (Type: {domain_type.upper()})\n"
            f"Domain Focus: {domain_guidance}\n\n"
            "You have direct access to the user's uploaded documents, knowledge vault, and workspace goals in this Space.\n\n"
            "CRITICAL RULES:\n"
            "1. You are NOT an isolated language model that cannot see files. You CAN access documents and information in this workspace through your RAG retrieval engine.\n"
            "2. If uploaded documents exist in the WORKSPACE CONTEXT and the user asks about them, confirm that they are present and describe or cite their contents.\n"
            "3. If research was performed, use the retrieved evidence to thoroughly answer the query.\n"
            "4. If evidence is marked as NO_EVIDENCE, state that specific details were not found in the indexed chunks of the uploaded files.\n"
            "5. If no research was required, answer naturally without claiming you cannot access files.\n"
            "6. Tone must be calm, intelligent, concise, and professional. Format with clean Markdown.\n\n"
            "DECISION ANALYSIS RULES:\n"
            "1. Do not invent recommendations that are not present in the decision analysis unless independently supported by the available evidence.\n"
            "2. Do not present inference as fact.\n"
            "3. Do not present low-confidence recommendations as certain.\n"
            "4. If uncertainties exist, acknowledge important uncertainty when relevant.\n"
            "5. If there are no recommendations, do not manufacture one merely to make the answer more actionable.\n"
            "6. Remain conversational. Do not dump raw JSON into the user's response."
        )
        
        from orchestrator.context_formatter import format_workspace_context
        ctx_str = format_workspace_context(state.get("workspace_context"))
        if ctx_str:
            system_prompt += f"\n\n{ctx_str}"

        personalization = state.get("personalization") or (state.get("workspace_context") or {}).get("personalization")
        if personalization:
            cog_style = personalization.get("cognitiveStyle", "")
            if cog_style == "first_principles":
                system_prompt += "\n\nCOGNITIVE STYLE: First-Principles Architect. Deconstruct problems to fundamental components, emphasize systems architecture, trade-offs, and causality."
            elif cog_style == "executive":
                system_prompt += "\n\nCOGNITIVE STYLE: Executive Synthesizer. Deliver dense, high-impact bulleted briefings with clear action items and minimal preamble."
            elif cog_style == "socratic":
                system_prompt += "\n\nCOGNITIVE STYLE: Socratic Sparring Partner. Challenge implicit assumptions, highlight potential blind spots, and propose alternative perspectives."
            elif cog_style == "speed":
                system_prompt += "\n\nCOGNITIVE STYLE: Fast Builder. Be ultra-concise, practical, and direct. Provide immediate working code and execution steps."

            verbosity = personalization.get("verbosity", "")
            if verbosity == "concise":
                system_prompt += "\nVERBOSITY: Be highly concise. Deliver essential points without filler."
            elif verbosity == "deep_dive":
                system_prompt += "\nVERBOSITY: Provide an exhaustive deep-dive breakdown with thorough analysis."

            code_std = personalization.get("codeStandard", "")
            if code_std == "staff_engineer":
                system_prompt += "\nCODE STANDARD: Staff Engineer. Write production-grade code with strict typing, robust error handling, and scalable design patterns."
            elif code_std == "academic":
                system_prompt += "\nCODE STANDARD: Academic & Formal. Emphasize algorithmic proofs, computational complexity, and theoretical foundations."

            directives = personalization.get("customDirectives")
            if directives:
                system_prompt += f"\nUSER DIRECTIVE: {directives}"

            user_ctx = personalization.get("userContext")
            if user_ctx:
                system_prompt += f"\nUSER BACKGROUND: {user_ctx}"
        
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
                    
        decision_out = state.get("decision_output")
        if decision_out:
            context_blocks.append("DECISION ANALYSIS START\n" + json.dumps(decision_out, indent=2) + "\nDECISION ANALYSIS END")
            
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
        if isinstance(response.content, str):
            final_text = response.content.strip()
        elif isinstance(response.content, list):
            final_text = "".join([part.get("text", "") if isinstance(part, dict) else getattr(part, "text", str(part)) for part in response.content]).strip()
        else:
            final_text = str(response.content).strip()
        
        # Extract unique citations with rich metadata (deduplicated by source & page)
        citations = []
        citations_by_key = {}
        for res in results:
            if res.get("status") == "completed":
                for e in res.get("evidence", []):
                    title = e.get("document_title") or "Unknown"
                    chunk_id = e.get("chunk_id") or e.get("source_chunk_id")
                    k_id = e.get("knowledge_id")
                    doc_id = e.get("document_id")
                    source_type = e.get("source_type", "document")
                    page_num = e.get("page_number")
                    snippet = e.get("content", "")[:200] if e.get("content") else None

                    # Unique key per evidence source and page
                    key = (doc_id or title.strip().lower(), page_num, source_type, k_id or "")
                    if key not in citations_by_key:
                        cit_dict = {
                            "document_title": title,
                            "chunk_id": chunk_id,
                            "page_number": page_num,
                            "snippet": snippet,
                            "source_type": source_type,
                        }
                        if doc_id:
                            cit_dict["document_id"] = doc_id
                        if e.get("knowledge_type"):
                            cit_dict["knowledge_type"] = e.get("knowledge_type")
                        citations_by_key[key] = cit_dict
                        citations.append(cit_dict)
                    else:
                        existing = citations_by_key[key]
                        if not existing.get("snippet") and snippet:
                            existing["snippet"] = snippet
        
        state["final_synthesis"] = final_text
        state["citations"] = citations
        if state.get("workflow_status") != "terminated_budget":
            state["workflow_status"] = "completed"
        
        if db and 'run' in locals():
            try:
                run.status = "completed"
                run.completed_at = datetime.now(timezone.utc)
                run.output_summary = {"text": final_text, "citations": citations}
                db.add(run)
                # Step 13: Update step status in real-time
                if 'step_id' in locals():
                    try:
                        await db.execute(
                            update(WorkflowStep).where(WorkflowStep.id == step_id).values(status="completed")
                        )
                    except Exception as ex:
                        logger.debug(f"Step status update error: {ex}")
                
                # Synthesis record
                if 'obj_uuid' in locals():
                    dec_output = state.get("decision_output") or {}
                    recs = dec_output.get("recommendations", []) or []
                    blockers = dec_output.get("blockers", []) or []
                    synth_record = Synthesis(
                        id=uuid.uuid4(),
                        objective_id=obj_uuid,
                        findings=blockers,
                        recommendations=recs,
                        evidence=citations,
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(synth_record)
                await db.commit()
            except Exception as db_err:
                logger.warning(f"Telemetry save error in synthesizer: {db_err}")
        
        return state
        
    except Exception as e:
        logger.error(f"Synthesizer failed: {e}")
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
                logger.warning(f"Telemetry error update failed in synthesizer: {db_err}")
        
        state["final_synthesis"] = "I encountered a critical error while synthesizing the final response. Please try again later."
        state["workflow_status"] = "failed"
        return state
