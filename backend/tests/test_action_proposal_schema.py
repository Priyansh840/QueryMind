import pytest
import json
from pydantic import ValidationError
from orchestrator.schemas import (
    ActionProposal,
    CreateGoalParams,
    UpdateGoalStatusParams,
    CreateProjectParams,
    UpdateProjectStatusParams,
    AddMemoryParams,
)
from orchestrator.state import AgentState

# ==============================================================================
# A. Valid create_goal proposal
# ==============================================================================
def test_a_valid_create_goal_proposal():
    proposal = ActionProposal(
        proposal_id="prop-1",
        action_type="create_goal",
        space_id="space-123",
        parameters={
            "description": "Complete Step 8 Phase 1 Action Proposals",
            "project_id": "proj-456"
        },
        reason="Grounding action for launch readiness",
        source_recommendation="Finalize Step 8",
        confidence="high"
    )
    assert proposal.action_type == "create_goal"
    parsed_params = proposal.validate_parameters()
    assert isinstance(parsed_params, CreateGoalParams)
    assert parsed_params.description == "Complete Step 8 Phase 1 Action Proposals"
    assert parsed_params.project_id == "proj-456"


# ==============================================================================
# B. Valid update_goal_status proposal
# ==============================================================================
def test_b_valid_update_goal_status_proposal():
    proposal = ActionProposal(
        proposal_id="prop-2",
        action_type="update_goal_status",
        target_id="goal-789",
        parameters={
            "goal_id": "goal-789",
            "status": "completed"
        },
        reason="Goal has been verified in tests",
        source_recommendation="Mark goal done",
        confidence="high"
    )
    assert proposal.action_type == "update_goal_status"
    parsed_params = proposal.validate_parameters()
    assert isinstance(parsed_params, UpdateGoalStatusParams)
    assert parsed_params.status == "completed"
    assert parsed_params.goal_id == "goal-789"


# ==============================================================================
# C. Valid create_project proposal
# ==============================================================================
def test_c_valid_create_project_proposal():
    proposal = ActionProposal(
        proposal_id="prop-3",
        action_type="create_project",
        space_id="space-101",
        parameters={
            "space_id": "space-101",
            "name": "MYND Beta Deployment"
        },
        reason="Create dedicated tracking project",
        source_recommendation="Initialize deployment project",
        confidence="medium"
    )
    assert proposal.action_type == "create_project"
    parsed_params = proposal.validate_parameters()
    assert isinstance(parsed_params, CreateProjectParams)
    assert parsed_params.name == "MYND Beta Deployment"


# ==============================================================================
# D. Valid update_project_status proposal
# ==============================================================================
def test_d_valid_update_project_status_proposal():
    proposal = ActionProposal(
        proposal_id="prop-4",
        action_type="update_project_status",
        target_id="proj-202",
        parameters={
            "project_id": "proj-202",
            "status": "on_hold"
        },
        reason="Blocked by external dependency",
        source_recommendation="Pause project until unblocked",
        confidence="medium"
    )
    assert proposal.action_type == "update_project_status"
    parsed_params = proposal.validate_parameters()
    assert isinstance(parsed_params, UpdateProjectStatusParams)
    assert parsed_params.status == "on_hold"


# ==============================================================================
# E. Valid add_memory proposal
# ==============================================================================
def test_e_valid_add_memory_proposal():
    proposal = ActionProposal(
        proposal_id="prop-5",
        action_type="add_memory",
        parameters={
            "content": "User prefers concise architecture summaries",
            "memory_type": "preference",
            "importance": "high"
        },
        reason="Remember user interaction preference",
        source_recommendation="Record preference",
        confidence="high"
    )
    assert proposal.action_type == "add_memory"
    parsed_params = proposal.validate_parameters()
    assert isinstance(parsed_params, AddMemoryParams)
    assert parsed_params.importance == "high"
    assert parsed_params.memory_type == "preference"


# ==============================================================================
# F. Invalid action_type is rejected
# ==============================================================================
def test_f_invalid_action_type_rejected():
    with pytest.raises(ValidationError):
        ActionProposal(
            proposal_id="prop-bad",
            action_type="drop_table",  # type: ignore
            parameters={"table": "users"},
            reason="Malicious action"
        )


# ==============================================================================
# G. Invalid goal status is rejected
# ==============================================================================
def test_g_invalid_goal_status_rejected():
    proposal = ActionProposal(
        proposal_id="prop-bad-status",
        action_type="update_goal_status",
        target_id="goal-1",
        parameters={
            "goal_id": "goal-1",
            "status": "destroyed"  # Invalid status
        },
        reason="Testing invalid status"
    )
    with pytest.raises(ValidationError):
        proposal.validate_parameters()


# ==============================================================================
# H. Invalid project status is rejected
# ==============================================================================
def test_h_invalid_project_status_rejected():
    proposal = ActionProposal(
        proposal_id="prop-bad-proj-status",
        action_type="update_project_status",
        target_id="proj-1",
        parameters={
            "project_id": "proj-1",
            "status": "finished_forever"  # Invalid status
        },
        reason="Testing invalid project status"
    )
    with pytest.raises(ValidationError):
        proposal.validate_parameters()


# ==============================================================================
# I. Arbitrary parameter injection is rejected
# ==============================================================================
def test_i_arbitrary_parameter_injection_rejected():
    # If missing required fields or giving unsupported shape
    proposal = ActionProposal(
        proposal_id="prop-injection",
        action_type="create_goal",
        parameters={
            "sql_injection": "DROP TABLE goals; --",
            # missing description
        },
        reason="Testing injection"
    )
    with pytest.raises(ValidationError):
        proposal.validate_parameters()


# ==============================================================================
# J. Missing required parameters are rejected
# ==============================================================================
def test_j_missing_required_parameters_rejected():
    proposal = ActionProposal(
        proposal_id="prop-missing",
        action_type="create_project",
        parameters={
            "space_id": "space-1"
            # missing "name"
        },
        reason="Testing missing parameter"
    )
    with pytest.raises(ValidationError):
        proposal.validate_parameters()


# ==============================================================================
# K. Invalid parameter types are rejected
# ==============================================================================
def test_k_invalid_parameter_types_rejected():
    proposal = ActionProposal(
        proposal_id="prop-bad-type",
        action_type="add_memory",
        parameters={
            "content": 12345,  # Needs string
            "importance": "extreme"  # Invalid literal
        },
        reason="Testing invalid types"
    )
    with pytest.raises(ValidationError):
        proposal.validate_parameters()


# ==============================================================================
# L. Delete / autonomous mutation actions are rejected
# ==============================================================================
def test_l_delete_actions_rejected():
    for forbidden_action in ["delete_goal", "delete_project", "delete_memory", "execute_command"]:
        with pytest.raises(ValidationError):
            ActionProposal(
                proposal_id="prop-forbidden",
                action_type=forbidden_action,  # type: ignore
                parameters={},
                reason="Forbidden action"
            )


# ==============================================================================
# M. Proposal does not execute any database mutation
# ==============================================================================
def test_m_proposal_is_pure_data_object():
    # ActionProposal is a pure Pydantic model with no database session, no async execution methods
    proposal = ActionProposal(
        proposal_id="prop-pure-data",
        action_type="create_goal",
        parameters={"description": "Test Goal"},
        reason="Test Pure Data"
    )
    assert not hasattr(proposal, "execute")
    assert not hasattr(proposal, "save_to_db")
    assert not hasattr(proposal, "mutate")


# ==============================================================================
# N. AgentState accepts the new action_proposals field
# ==============================================================================
def test_n_agent_state_compatibility():
    state: AgentState = {
        "user_id": "u-1",
        "space_id": "s-1",
        "objective_id": "o-1",
        "conversation_id": "c-1",
        "raw_query": "What should I do next?",
        "chat_history": [],
        "workspace_context": {},
        "workspace_summary": {},
        "planner_output": None,
        "research_tasks": [],
        "research_results": [],
        "critic_output": None,
        "decision_output": None,
        "action_proposals": [
            {
                "proposal_id": "p-1",
                "action_type": "create_goal",
                "parameters": {"description": "Launch Beta"},
                "reason": "Next step",
                "confidence": "high"
            }
        ],
        "workflow_iteration": 1,
        "total_research_tasks": 0,
        "workflow_status": "running",
        "final_synthesis": "",
        "citations": []
    }
    assert state["action_proposals"] is not None
    assert len(state["action_proposals"]) == 1


# ==============================================================================
# O. Proposal remains JSON serializable
# ==============================================================================
def test_o_json_serializable():
    proposal = ActionProposal(
        proposal_id="prop-json",
        action_type="add_memory",
        parameters={"content": "Note", "importance": "low", "memory_type": "note"},
        reason="Testing serialization",
        confidence="medium"
    )
    dumped = proposal.model_dump()
    json_str = json.dumps(dumped)
    loaded = json.loads(json_str)
    assert loaded["action_type"] == "add_memory"
    assert loaded["parameters"]["content"] == "Note"
