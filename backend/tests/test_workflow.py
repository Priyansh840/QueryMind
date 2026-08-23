import pytest
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

from orchestrator.graph import get_orchestrator
from orchestrator.state import AgentState
from orchestrator.schemas import PlannerOutput, CriticOutput, TaskDefinition

@pytest.fixture
def workflow():
    return get_orchestrator()

@pytest.fixture
def base_state():
    return {
        "user_id": str(uuid.uuid4()),
        "space_id": str(uuid.uuid4()),
        "objective_id": str(uuid.uuid4()),
        "conversation_id": str(uuid.uuid4()),
        "raw_query": "Test query",
        "chat_history": [],
        "planner_output": None,
        "research_tasks": [],
        "research_results": [],
        "critic_output": None,
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
@patch("orchestrator.agents.planner.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_a_no_research(mock_synth_get_llm, mock_planner_get_llm, workflow, base_state, run_config):
    # A. No research: Planner correctly skips to Synthesizer.
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=False,
        reasoning_summary="No research needed.",
        tasks=[]
    ))
    
    # Mock Synthesizer returning a string
    class MockMessage:
        content = "Synthesis complete"
    mock_synth_get_llm.return_value.ainvoke = AsyncMock(return_value=MockMessage())

    result = await workflow.ainvoke(base_state, config=run_config)
    
    assert result["planner_output"]["needs_research"] is False
    assert result["workflow_status"] == "completed"
    assert "Synthesis complete" in result["final_synthesis"]

@pytest.mark.asyncio
@patch("orchestrator.agents.planner.get_llm")
@patch("orchestrator.agents.researcher.retrieve_context")
@patch("orchestrator.agents.critic.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_b_single_research(mock_synth_get_llm, mock_critic_get_llm, mock_retrieve_context, mock_planner_get_llm, workflow, base_state, run_config):
    # B. Single research: Planner -> Researcher -> Critic -> Synthesizer.
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=True,
        reasoning_summary="Needs research.",
        tasks=[
            TaskDefinition(id="t1", query="q1", purpose="p1")
        ]
    ))
    
    # Mock RAG retrieving 1 doc
    mock_retrieve_context.return_value = [
        {"chunk_id": "d1", "content": "evidence 1", "document_title": "Doc 1", "source": "src1", "score": 0.9}
    ]
    
    # Critic accepts
    mock_critic_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=CriticOutput(
        decision="accept",
        reason="Good enough",
        missing_tasks=[]
    ))
    
    class MockMessage:
        content = "Synthesis complete"
    mock_synth_get_llm.return_value.ainvoke = AsyncMock(return_value=MockMessage())

    result = await workflow.ainvoke(base_state, config=run_config)
    
    assert len(result["research_tasks"]) == 1
    assert len(result["research_results"]) == 1
    assert result["research_results"][0]["status"] == "completed"
    assert result["critic_output"]["decision"] == "accept"
    assert result["workflow_iteration"] == 1
    assert result["workflow_status"] == "completed"

@pytest.mark.asyncio
@patch("orchestrator.agents.planner.get_llm")
@patch("orchestrator.agents.researcher.retrieve_context")
@patch("orchestrator.agents.critic.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_d_critic_loop_and_budget(mock_synth_get_llm, mock_critic_get_llm, mock_retrieve_context, mock_planner_get_llm, workflow, base_state, run_config):
    # D & E. Critic requests more research, workflow_iteration increments until MAX_WORKFLOW_ITERATIONS (3)
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=True,
        reasoning_summary="Needs research.",
        tasks=[
            TaskDefinition(id="t1", query="q1", purpose="p1")
        ]
    ))
    
    mock_retrieve_context.return_value = []
    
    # Critic ALWAYS rejects and asks for more research
    mock_critic_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=CriticOutput(
        decision="research_more",
        reason="Need more",
        missing_tasks=[
            TaskDefinition(id="t2", query="q2", purpose="p2")
        ]
    ))
    
    class MockMessage:
        content = "Synthesis complete"
    mock_synth_get_llm.return_value.ainvoke = AsyncMock(return_value=MockMessage())

    result = await workflow.ainvoke(base_state, config=run_config)
    
    # Should have hit budget limit of 3 iterations
    assert result["workflow_iteration"] == 3
    assert result["workflow_status"] == "terminated_budget"

@pytest.mark.asyncio
@patch("orchestrator.agents.planner.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_f_malformed_output(mock_synth_get_llm, mock_planner_get_llm, workflow, base_state, run_config):
    # F. Malformed output: LLM fails to return valid dict, triggers fallback
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(side_effect=Exception("LLM Parsing Error"))
    
    class MockMessage:
        content = "Synthesis complete"
    mock_synth_get_llm.return_value.ainvoke = AsyncMock(return_value=MockMessage())

    result = await workflow.ainvoke(base_state, config=run_config)
    
    assert result["planner_output"]["reasoning_summary"] == "Planner failed"
    assert result["workflow_status"] == "completed"

@pytest.mark.asyncio
@patch("orchestrator.agents.planner.get_llm")
@patch("orchestrator.agents.researcher.retrieve_context")
@patch("orchestrator.agents.critic.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_h_empty_retrieval(mock_synth_get_llm, mock_critic_get_llm, mock_retrieve_context, mock_planner_get_llm, workflow, base_state, run_config):
    # H. Empty retrieval -> no_evidence status
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=True,
        reasoning_summary="Needs research.",
        tasks=[
            TaskDefinition(id="t1", query="q1", purpose="p1")
        ]
    ))
    
    # RAG returns nothing
    mock_retrieve_context.return_value = []
    
    mock_critic_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=CriticOutput(
        decision="accept",
        reason="Nothing found, just accept.",
        missing_tasks=[]
    ))
    
    class MockMessage:
        content = "Synthesis complete"
    mock_synth_get_llm.return_value.ainvoke = AsyncMock(return_value=MockMessage())

    result = await workflow.ainvoke(base_state, config=run_config)
    
    assert result["research_results"][0]["status"] == "no_evidence"
