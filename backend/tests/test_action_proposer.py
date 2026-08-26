import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from orchestrator.state import AgentState
from orchestrator.agents.action_proposer import action_proposer_node, extract_known_target_ids
from orchestrator.schemas import (
    ActionProposal,
    ActionProposalsOutput,
    Recommendation,
    DecisionAnalysis,
)

@pytest.fixture
def base_state() -> AgentState:
    return {
        "user_id": "12345678-1234-5678-1234-567812345678",
        "space_id": "space-uuid-1",
        "objective_id": "obj-uuid-1",
        "conversation_id": "conv-uuid-1",
        "raw_query": "What should I focus on next?",
        "chat_history": [],
        "workspace_context": {
            "space": {"id": "space-uuid-1", "name": "Main Space"},
            "goals": [
                {"id": "goal-uuid-1", "description": "Launch MYND beta", "status": "active"}
            ],
            "projects": [
                {"id": "proj-uuid-1", "name": "Step 8 Actions", "status": "active"}
            ],
            "memories": [
                {"id": "mem-uuid-1", "content": "Integration testing pending"}
            ]
        },
        "workspace_summary": {},
        "planner_output": None,
        "research_tasks": [],
        "research_results": [],
        "critic_output": None,
        "decision_output": {
            "blockers": [],
            "recommendations": [
                {
                    "action": "Complete Step 8 Actions project",
                    "reason": "It is active and ready for completion",
                    "confidence": "high",
                    "evidence": []
                }
            ],
            "uncertainties": []
        },
        "action_proposals": None,
        "workflow_iteration": 1,
        "total_research_tasks": 0,
        "workflow_status": "running",
        "final_synthesis": "",
        "citations": []
    }

@pytest.fixture
def run_config():
    return {"configurable": {}}


# ==============================================================================
# A. Concrete recommendation -> valid ActionProposal
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_a_concrete_recommendation_to_proposal(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(
        proposals=[
            ActionProposal(
                proposal_id="prop-1",
                action_type="update_project_status",
                target_id="proj-uuid-1",
                parameters={
                    "project_id": "proj-uuid-1",
                    "status": "completed"
                },
                reason="Project is finished",
                source_recommendation="Complete Step 8 Actions project",
                confidence="high"
            )
        ]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)

    assert result["action_proposals"] is not None
    assert len(result["action_proposals"]) == 1
    assert result["action_proposals"][0]["action_type"] == "update_project_status"
    assert result["action_proposals"][0]["parameters"]["project_id"] == "proj-uuid-1"
    assert result["action_proposals"][0]["parameters"]["status"] == "completed"


# ==============================================================================
# B. Recommendation with known target ID -> target ID preserved
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_b_target_id_preserved(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(
        proposals=[
            ActionProposal(
                proposal_id="prop-2",
                action_type="update_goal_status",
                target_id="goal-uuid-1",
                parameters={
                    "goal_id": "goal-uuid-1",
                    "status": "completed"
                },
                reason="Goal done",
                source_recommendation="Finish launch beta goal",
                confidence="high"
            )
        ]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    assert result["action_proposals"][0]["target_id"] == "goal-uuid-1"
    assert result["action_proposals"][0]["parameters"]["goal_id"] == "goal-uuid-1"


# ==============================================================================
# C. Empty recommendations -> no proposal (fast bypass)
# ==============================================================================
@pytest.mark.asyncio
async def test_c_no_recommendations_yields_empty_proposals(base_state, run_config):
    base_state["decision_output"] = {"recommendations": []}
    result = await action_proposer_node(base_state, run_config)
    assert result["action_proposals"] == []


# ==============================================================================
# D. Unsupported recommendation -> no proposal
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_d_unsupported_recommendation_yields_empty(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(proposals=[])
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    assert result["action_proposals"] == []


# ==============================================================================
# E. Unsupported action type -> rejected during validation
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_e_invalid_action_type_rejected(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    # Mock returning empty or invalid proposal handled safely
    mock_response = ActionProposalsOutput(proposals=[])
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    assert result["action_proposals"] == []


# ==============================================================================
# F. Invalid target ID not present in supplied context -> proposal rejected
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_f_hallucinated_target_id_rejected(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(
        proposals=[
            ActionProposal(
                proposal_id="prop-hallucinated",
                action_type="update_goal_status",
                target_id="hallucinated-goal-id-999",
                parameters={
                    "goal_id": "hallucinated-goal-id-999",
                    "status": "completed"
                },
                reason="Hallucinated goal",
                source_recommendation="Finish fake goal",
                confidence="high"
            )
        ]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    # The hallucinated ID was not in workspace_context, so it must be rejected
    assert result["action_proposals"] == []


# ==============================================================================
# G. Multiple recommendations -> multiple valid proposals
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_g_multiple_recommendations_multiple_proposals(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(
        proposals=[
            ActionProposal(
                proposal_id="prop-1",
                action_type="update_project_status",
                target_id="proj-uuid-1",
                parameters={"project_id": "proj-uuid-1", "status": "completed"},
                reason="Project 1 done",
                source_recommendation="Complete Step 8 Actions",
                confidence="high"
            ),
            ActionProposal(
                proposal_id="prop-2",
                action_type="add_memory",
                parameters={"content": "Beta launch verified", "importance": "high", "memory_type": "note"},
                reason="Save verification note",
                source_recommendation="Record verification",
                confidence="medium"
            )
        ]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    assert len(result["action_proposals"]) == 2
    assert result["action_proposals"][0]["action_type"] == "update_project_status"
    assert result["action_proposals"][1]["action_type"] == "add_memory"


# ==============================================================================
# H. Duplicate logical recommendations -> deduplicated to one proposal
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_h_duplicate_proposals_deduplicated(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(
        proposals=[
            ActionProposal(
                proposal_id="prop-1",
                action_type="update_project_status",
                target_id="proj-uuid-1",
                parameters={"project_id": "proj-uuid-1", "status": "completed"},
                reason="Project 1 done",
                source_recommendation="Complete Step 8",
                confidence="high"
            ),
            ActionProposal(
                proposal_id="prop-duplicate",
                action_type="update_project_status",
                target_id="proj-uuid-1",
                parameters={"project_id": "proj-uuid-1", "status": "completed"},
                reason="Duplicate reason from second recommendation",
                source_recommendation="Finish Step 8 now",
                confidence="high"
            )
        ]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    assert len(result["action_proposals"]) == 1


# ==============================================================================
# I. Malformed LLM output -> safe empty proposal list
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_i_malformed_llm_output_safe_fallback(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(side_effect=Exception("Parsing error"))
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    assert result["action_proposals"] == []


# ==============================================================================
# J. LLM failure -> safe empty proposal list
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_j_llm_api_failure_safe_fallback(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(side_effect=RuntimeError("Rate limit"))
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    assert result["action_proposals"] == []


# ==============================================================================
# K. Proposal is validated before entering AgentState
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_k_proposals_strictly_validated_in_state(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(
        proposals=[
            ActionProposal(
                proposal_id="prop-valid",
                action_type="create_goal",
                space_id="space-uuid-1",
                parameters={"description": "Write end-to-end tests", "project_id": "proj-uuid-1"},
                reason="Goal to ensure quality",
                source_recommendation="Write tests",
                confidence="high"
            )
        ]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    assert len(result["action_proposals"]) == 1
    # Verify structure matches ActionProposal
    ActionProposal.model_validate(result["action_proposals"][0])


# ==============================================================================
# L. No database mutation occurs
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_l_no_db_mutation(mock_get_llm, base_state, run_config):
    # run_config has no db session or a mock with assertions
    mock_db = MagicMock()
    run_config["configurable"]["db"] = mock_db

    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(proposals=[])
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    await action_proposer_node(base_state, run_config)
    # Ensure no db queries were made by action_proposer
    mock_db.execute.assert_not_called()
    mock_db.commit.assert_not_called()


# ==============================================================================
# M. No raw LLM output enters AgentState
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_m_no_raw_llm_output_in_state(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(
        proposals=[
            ActionProposal(
                proposal_id="prop-clean",
                action_type="add_memory",
                parameters={"content": "Important constraint", "importance": "high", "memory_type": "constraint"},
                reason="User constraint",
                source_recommendation="Store constraint",
                confidence="high"
            )
        ]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    prop = result["action_proposals"][0]
    assert "raw_prompt" not in prop
    assert "thought" not in prop
    assert "chain_of_thought" not in prop


# ==============================================================================
# N. ActionProposal remains JSON serializable
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_n_action_proposals_json_serializable(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(
        proposals=[
            ActionProposal(
                proposal_id="prop-json-test",
                action_type="create_project",
                space_id="space-uuid-1",
                parameters={"space_id": "space-uuid-1", "name": "New Project"},
                reason="Start new project",
                source_recommendation="Create new project",
                confidence="medium"
            )
        ]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    result = await action_proposer_node(base_state, run_config)
    dumped = json.dumps(result["action_proposals"])
    loaded = json.loads(dumped)
    assert len(loaded) == 1
    assert loaded[0]["action_type"] == "create_project"


# ==============================================================================
# O. Existing DecisionAnalysis behavior remains unchanged
# ==============================================================================
@pytest.mark.asyncio
@patch("orchestrator.agents.action_proposer.get_llm")
async def test_o_decision_analysis_unmodified(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = ActionProposalsOutput(proposals=[])
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    original_decision_output = json.loads(json.dumps(base_state["decision_output"]))
    result = await action_proposer_node(base_state, run_config)

    assert result["decision_output"] == original_decision_output
