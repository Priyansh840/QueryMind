import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from langchain_core.messages import HumanMessage
from orchestrator.state import AgentState
from orchestrator.agents.decision_analyzer import decision_analyzer_node
from orchestrator.schemas import DecisionAnalysis, Recommendation, DecisionEvidence

@pytest.fixture
def base_state() -> AgentState:
    return {
        "user_id": "12345678-1234-5678-1234-567812345678",
        "space_id": "12345678-1234-5678-1234-567812345678",
        "objective_id": "12345678-1234-5678-1234-567812345678",
        "conversation_id": "12345678-1234-5678-1234-567812345678",
        "raw_query": "What should I do next?",
        "chat_history": [],
        "workspace_context": {},
        "workspace_summary": {},
        "planner_output": None,
        "research_tasks": [],
        "research_results": [],
        "critic_output": None,
        "decision_output": None,
        "workflow_iteration": 1,
        "total_research_tasks": 0,
        "workflow_status": "running",
        "final_synthesis": "",
        "citations": []
    }

@pytest.fixture
def run_config():
    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()
    return {"configurable": {"db": mock_db}}

@pytest.mark.asyncio
@patch("orchestrator.agents.decision_analyzer.get_llm")
async def test_a_evidence_grounded_recommendation(mock_get_llm, base_state, run_config):
    # Setup mock LLM response
    mock_llm = MagicMock()
    mock_response = DecisionAnalysis(
        blockers=[],
        recommendations=[
            Recommendation(
                action="Complete integration",
                reason="Beta is incomplete",
                evidence=[
                    DecisionEvidence(source_type="workspace", content="Goal: Launch beta", is_fact=True, source_id="goal-1"),
                    DecisionEvidence(source_type="document", content="Integration incomplete", is_fact=True, source_id="chunk-1")
                ],
                confidence="high"
            )
        ],
        uncertainties=[]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    base_state["workspace_context"] = {"goals": [{"id": "goal-1", "description": "Launch beta", "status": "active"}]}
    base_state["research_results"] = [{
        "query": "integration status",
        "evidence": [{"chunk_id": "chunk-1", "document_title": "status", "content": "Integration incomplete"}]
    }]

    new_state = await decision_analyzer_node(base_state, run_config)
    
    assert new_state["decision_output"] is not None
    assert len(new_state["decision_output"]["recommendations"]) == 1
    assert new_state["decision_output"]["recommendations"][0]["action"] == "Complete integration"
    assert new_state["decision_output"]["recommendations"][0]["evidence"][0]["source_id"] == "goal-1"

@pytest.mark.asyncio
@patch("orchestrator.agents.decision_analyzer.get_llm")
async def test_b_empty_evidence(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_response = DecisionAnalysis(
        blockers=[],
        recommendations=[],
        uncertainties=["Insufficient evidence to make a recommendation."]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    new_state = await decision_analyzer_node(base_state, run_config)
    
    assert new_state["decision_output"]["recommendations"] == []
    assert len(new_state["decision_output"]["uncertainties"]) == 1

@pytest.mark.asyncio
@patch("orchestrator.agents.decision_analyzer.get_llm")
async def test_c_unrelated_query(mock_get_llm, base_state, run_config):
    base_state["raw_query"] = "Hello"
    mock_llm = MagicMock()
    mock_response = DecisionAnalysis(
        blockers=[],
        recommendations=[],
        uncertainties=[]
    )
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_response)
    mock_get_llm.return_value = mock_llm

    new_state = await decision_analyzer_node(base_state, run_config)
    
    assert new_state["decision_output"]["recommendations"] == []
    assert new_state["decision_output"]["blockers"] == []

@pytest.mark.asyncio
@patch("orchestrator.agents.decision_analyzer.get_llm")
async def test_h_llm_failure_fallback(mock_get_llm, base_state, run_config):
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(side_effect=Exception("API Error"))
    mock_get_llm.return_value = mock_llm

    new_state = await decision_analyzer_node(base_state, run_config)
    
    # Verify fallback behavior matches the specified pattern
    assert new_state["decision_output"] is not None
    assert new_state["decision_output"]["recommendations"] == []
    assert new_state["decision_output"]["uncertainties"] == ["Decision analysis could not be completed."]
