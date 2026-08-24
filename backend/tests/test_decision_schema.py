import pytest
from pydantic import ValidationError
from orchestrator.schemas import DecisionAnalysis, Recommendation, DecisionEvidence

def test_a_valid_decision_analysis():
    # Fully populated structure
    data = DecisionAnalysis(
        blockers=["Missing launch date"],
        recommendations=[
            Recommendation(
                action="Set a launch date",
                reason="Need to align team",
                evidence=[
                    DecisionEvidence(
                        source_type="workspace",
                        content="Goal: Launch MYND beta",
                        is_fact=True,
                        source_id="goal-123"
                    ),
                    DecisionEvidence(
                        source_type="document",
                        content="Beta strategy doc requires a date",
                        is_fact=True
                    )
                ],
                confidence="high"
            )
        ],
        uncertainties=["Unknown marketing budget"]
    )
    assert len(data.blockers) == 1
    assert len(data.recommendations) == 1
    assert len(data.recommendations[0].evidence) == 2
    assert len(data.uncertainties) == 1

def test_b_empty_decision_analysis():
    # Valid empty structure
    data = DecisionAnalysis(
        blockers=[],
        recommendations=[],
        uncertainties=[]
    )
    assert data.blockers == []
    assert data.recommendations == []
    assert data.uncertainties == []

def test_c_recommendation_validation():
    # Missing required fields
    with pytest.raises(ValidationError):
        Recommendation(
            action="Do something",
            # missing reason
            evidence=[],
            confidence="high"
        )
        
    with pytest.raises(ValidationError):
        Recommendation(
            action="Do something",
            reason="Because",
            # missing confidence
            evidence=[]
        )

def test_d_confidence_validation():
    # Valid
    Recommendation(action="A", reason="R", evidence=[], confidence="high")
    Recommendation(action="A", reason="R", evidence=[], confidence="medium")
    Recommendation(action="A", reason="R", evidence=[], confidence="low")
    
    # Invalid
    with pytest.raises(ValidationError):
        Recommendation(action="A", reason="R", evidence=[], confidence="very high")

def test_e_source_type_validation():
    # Valid
    DecisionEvidence(source_type="workspace", content="x", is_fact=True)
    DecisionEvidence(source_type="document", content="x", is_fact=True)
    DecisionEvidence(source_type="conversation", content="x", is_fact=True)
    
    # Invalid
    with pytest.raises(ValidationError):
        DecisionEvidence(source_type="external_web", content="x", is_fact=True)

def test_f_uncertainty_only_output():
    # Valid safety case
    data = DecisionAnalysis(
        blockers=[],
        recommendations=[],
        uncertainties=["No current deadline is available."]
    )
    assert len(data.uncertainties) == 1
    assert len(data.recommendations) == 0

def test_g_malformed_output_rejection():
    # Passing arbitrary strings instead of lists
    with pytest.raises(ValidationError):
        DecisionAnalysis(
            blockers="This is a string not a list",
            recommendations=[],
            uncertainties=[]
        )

def test_h_agent_state_compatibility():
    from orchestrator.state import AgentState
    
    # Verify we can build AgentState with decision_output = None
    state: AgentState = {
        "user_id": "u1",
        "space_id": "s1",
        "objective_id": "o1",
        "conversation_id": "c1",
        "raw_query": "Hello",
        "chat_history": [],
        "workspace_context": {},
        "workspace_summary": {},
        "planner_output": None,
        "research_tasks": [],
        "research_results": [],
        "critic_output": None,
        "decision_output": None, # <--- The new field defaults cleanly to None
        "workflow_iteration": 1,
        "total_research_tasks": 0,
        "workflow_status": "running",
        "final_synthesis": "",
        "citations": []
    }
    
    assert state["decision_output"] is None
