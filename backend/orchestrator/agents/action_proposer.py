import logging
import json
import uuid
from typing import List, Set
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage

from orchestrator.state import AgentState
from orchestrator.schemas import ActionProposal, ActionProposalsOutput
from llm.provider import get_llm
from orchestrator.context_formatter import format_workspace_context

logger = logging.getLogger(__name__)


def extract_known_target_ids(workspace_context: dict) -> Set[str]:
    """
    Extracts all known valid UUIDs from the supplied workspace_context
    (space_id, project_ids, goal_ids, memory_ids).
    """
    known_ids = set()
    if not workspace_context:
        return known_ids

    space = workspace_context.get("space")
    if space and space.get("id"):
        known_ids.add(str(space["id"]))

    for goal in workspace_context.get("goals", []):
        if goal.get("id"):
            known_ids.add(str(goal["id"]))

    for proj in workspace_context.get("projects", []):
        if proj.get("id"):
            known_ids.add(str(proj["id"]))

    for mem in workspace_context.get("memories", []):
        if mem.get("id"):
            known_ids.add(str(mem["id"]))

    return known_ids


async def action_proposer_node(state: AgentState, config: RunnableConfig) -> AgentState:
    """
    ActionProposer Node (Step 8 Phase 2):
    Translates concrete recommendations from DecisionAnalysis into structured ActionProposals.
    Operates strictly in-memory over AgentState without querying or mutating PostgreSQL.
    """
    logger.info("Starting ActionProposer Node...")

    decision_output = state.get("decision_output") or {}
    recommendations = decision_output.get("recommendations", [])

    # Check for direct user imperative command
    raw_query = state.get("raw_query", "").strip()
    raw_query_clean = raw_query.lower()
    
    # If there are no recommendations from decision analysis, but the user explicitly ordered an action:
    if not recommendations:
        has_goal_verb = any(v in raw_query_clean for v in ("create", "make", "add", "set", "build", "register", "generate"))
        has_goal_kw = "goal" in raw_query_clean or any(kw in raw_query_clean for kw in ("create a goal", "create goal", "make a goal", "make goal", "add a goal", "add goal", "new goal"))
        
        if (has_goal_verb and has_goal_kw) or has_goal_kw:
            # Extract goal description
            parts = raw_query.split("goal", 1)
            goal_desc = parts[1].strip(" :-\"'tofor ").strip() if len(parts) > 1 else raw_query
            if not goal_desc or len(goal_desc) < 3:
                goal_desc = raw_query
            recommendations = [{
                "action": f"Create new goal: {goal_desc}",
                "reason": f"Direct user command: {raw_query}",
                "confidence": "high",
                "evidence": []
            }]

    if not recommendations:
        state["action_proposals"] = []
        return state

    workspace_context = state.get("workspace_context") or {}
    known_target_ids = extract_known_target_ids(workspace_context)
    if state.get("space_id"):
        known_target_ids.add(str(state["space_id"]))

    try:
        llm = get_llm(temperature=0.1)
        structured_llm = llm.with_structured_output(ActionProposalsOutput)

        system_prompt = (
            "You are the Action Proposer Agent for QueryMind.\n"
            "Your objective is to examine the provided Decision Recommendations and determine if any recommendation "
            "can be directly translated into one of MYND's strictly supported workspace action proposals.\n\n"
            "STRICT ALLOWLIST OF SUPPORTED ACTIONS:\n"
            "1. 'create_goal': Requires parameters {'description': str, 'space_id': Optional[str], 'project_id': Optional[str], 'tasks': Optional[List[dict]], 'category': Optional[str], 'priority': Optional[str], 'target_date': Optional[str]}\n"
            "   (Each task in tasks MUST be an object with: {'title': str, 'completed': bool, 'priority': 'high'|'medium'|'low'}).\n"
            "   IMPORTANT: If the user or recommendation mentions subtasks, milestones, or key phases (or if the goal naturally breaks down into concrete actionable steps), populate 'tasks' with 2 to 5 structured tasks!\n"
            "2. 'update_goal_status': Requires parameters {'goal_id': str, 'status': 'active'|'completed'|'archived'|'paused'}\n"
            "3. 'create_space': Requires parameters {'name': str, 'description': Optional[str], 'icon': Optional[str]}\n"
            "4. 'create_project': Requires parameters {'space_id': str, 'name': str, 'description': Optional[str]}\n"
            "5. 'update_project_status': Requires parameters {'project_id': str, 'status': 'active'|'completed'|'archived'|'on_hold'}\n"
            "6. 'add_memory': Requires parameters {'content': str, 'memory_type': str, 'importance': 'high'|'medium'|'low'}\n"
            "7. 'create_note': Requires parameters {'title': str, 'content': str, 'space_id': Optional[str]}\n\n"
            "CRITICAL SECURITY AND REASONING RULES:\n"
            "1. Action proposals are passive INTENTS only. Never execute any action.\n"
            "2. NEVER invent target IDs (goal_id, project_id, space_id). Only use IDs that explicitly appear in the supplied WORKSPACE CONTEXT or RECOMMENDATIONS.\n"
            "3. If a recommendation refers to updating a project or goal, but no corresponding entity ID exists in the context, DO NOT generate an update proposal.\n"
            "4. If a recommendation is general advice or unsupported (e.g. 'send an email', 'delete a file'), return NO proposal for that recommendation.\n"
            "5. Do NOT generate code, SQL, shell commands, URLs, webhooks, or tool calls.\n"
            "6. Set 'source_recommendation' to the exact recommendation action/summary that triggered the proposal.\n"
            "7. If no recommendations are concretely actionable, return an empty proposals list."
        )

        ctx_str = format_workspace_context(workspace_context)
        if ctx_str:
            system_prompt += f"\n\n{ctx_str}"

        # Present the structured decision recommendations to the model
        rec_str = json.dumps(recommendations, indent=2)
        human_content = (
            f"User Query: {state.get('raw_query')}\n\n"
            f"Decision Recommendations:\n{rec_str}\n\n"
            "Generate structured Action Proposals for only those recommendations that concretely map to supported actions."
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_content)
        ]

        raw_output: ActionProposalsOutput = await structured_llm.ainvoke(messages, config=config)

        # Strict validation, deduplication, and target ID checking
        validated_proposals: List[dict] = []
        seen_action_signatures = set()

        for proposal in raw_output.proposals:
            try:
                # 1. Pydantic parameter schema validation
                parsed_params = proposal.validate_parameters()

                # 2. Target ID verification: if target_id or specific parameter ID is provided, verify it exists in context
                if proposal.action_type == "update_goal_status":
                    target_goal_id = str(parsed_params.goal_id)
                    if target_goal_id not in known_target_ids:
                        logger.warning(f"Rejecting proposal with unknown goal_id: {target_goal_id}")
                        continue
                elif proposal.action_type == "update_project_status":
                    target_proj_id = str(parsed_params.project_id)
                    if target_proj_id not in known_target_ids:
                        logger.warning(f"Rejecting proposal with unknown project_id: {target_proj_id}")
                        continue
                elif proposal.action_type == "create_project":
                    target_space_id = str(parsed_params.space_id)
                    if target_space_id not in known_target_ids:
                        logger.warning(f"Rejecting create_project proposal with unknown space_id: {target_space_id}")
                        continue

                # 3. Deduplication signature: (action_type, target_id/space_id, serialized params)
                param_dump = parsed_params.model_dump()
                signature_key = (
                    proposal.action_type,
                    json.dumps(param_dump, sort_keys=True)
                )

                if signature_key in seen_action_signatures:
                    logger.info(f"Deduplicating redundant action proposal: {signature_key}")
                    continue

                seen_action_signatures.add(signature_key)

                # 4. Clean validated dictionary ready for state and serialization
                clean_proposal = ActionProposal(
                    proposal_id=proposal.proposal_id or f"prop-{uuid.uuid4().hex[:8]}",
                    action_type=proposal.action_type,
                    target_id=proposal.target_id,
                    space_id=proposal.space_id,
                    parameters=param_dump,
                    reason=proposal.reason,
                    source_recommendation=proposal.source_recommendation,
                    confidence=proposal.confidence
                )
                validated_proposals.append(clean_proposal.model_dump())

            except Exception as val_err:
                logger.warning(f"Discarding invalid proposal: {val_err}")
                continue

        state["action_proposals"] = validated_proposals
        return state

    except Exception as e:
        logger.error(f"ActionProposer failed safely: {e}")
        state["action_proposals"] = []
        return state
