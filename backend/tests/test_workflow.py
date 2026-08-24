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
        "workspace_context": {
            "space": None,
            "goals": [],
            "projects": [],
            "memories": []
        },
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
async def test_gather_context(workflow, base_state, run_config):
    # Test 1 & 2: Verify context_gatherer initializes state and routes to planner
    # By running the node directly
    from orchestrator.agents.context_gatherer import gather_context_node
    
    # Remove workspace_context to see if it sets it
    if "workspace_context" in base_state:
        del base_state["workspace_context"]
        
    result = await gather_context_node(base_state, config=run_config)
    
    assert "workspace_context" in result
    assert result["workspace_context"]["space"] is None
    assert result["workspace_context"]["goals"] == []
    assert result["workspace_context"]["projects"] == []
    assert result["workspace_context"]["memories"] == []

from orchestrator.schemas import PlannerOutput, CriticOutput, TaskDefinition, DecisionAnalysis

@pytest.mark.asyncio
@patch("orchestrator.agents.planner.get_llm")
@patch("orchestrator.agents.decision_analyzer.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_a_no_research(mock_synth_get_llm, mock_da_get_llm, mock_planner_get_llm, workflow, base_state, run_config):
    # A. No research: Planner correctly skips to DecisionAnalyzer -> Synthesizer.
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=False,
        reasoning_summary="No research needed.",
        tasks=[]
    ))
    
    mock_da_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=DecisionAnalysis(
        blockers=[], recommendations=[], uncertainties=[]
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
@patch("orchestrator.agents.decision_analyzer.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_b_single_research(mock_synth_get_llm, mock_da_get_llm, mock_critic_get_llm, mock_retrieve_context, mock_planner_get_llm, workflow, base_state, run_config):
    # B. Single research: Planner -> Researcher -> Critic -> DecisionAnalyzer -> Synthesizer.
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=True,
        reasoning_summary="Needs research.",
        tasks=[
            TaskDefinition(id="t1", query="q1", purpose="p1")
        ]
    ))
    
    mock_da_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=DecisionAnalysis(
        blockers=[], recommendations=[], uncertainties=[]
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
@patch("orchestrator.agents.decision_analyzer.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_d_critic_loop_and_budget(mock_synth_get_llm, mock_da_get_llm, mock_critic_get_llm, mock_retrieve_context, mock_planner_get_llm, workflow, base_state, run_config):
    # D & E. Critic requests more research, workflow_iteration increments until MAX_WORKFLOW_ITERATIONS (3)
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=True,
        reasoning_summary="Needs research.",
        tasks=[
            TaskDefinition(id="t1", query="q1", purpose="p1")
        ]
    ))
    
    mock_da_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=DecisionAnalysis(
        blockers=[], recommendations=[], uncertainties=[]
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
@patch("orchestrator.agents.decision_analyzer.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_f_malformed_output(mock_synth_get_llm, mock_da_get_llm, mock_planner_get_llm, workflow, base_state, run_config):
    # F. Malformed output: LLM fails to return valid dict, triggers fallback
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(side_effect=Exception("LLM Parsing Error"))
    
    mock_da_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=DecisionAnalysis(
        blockers=[], recommendations=[], uncertainties=[]
    ))
    
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
@patch("orchestrator.agents.decision_analyzer.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_h_empty_retrieval(mock_synth_get_llm, mock_da_get_llm, mock_critic_get_llm, mock_retrieve_context, mock_planner_get_llm, workflow, base_state, run_config):
    # H. Empty retrieval -> no_evidence status
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=True,
        reasoning_summary="Needs research.",
        tasks=[
            TaskDefinition(id="t1", query="q1", purpose="p1")
        ]
    ))
    
    mock_da_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=DecisionAnalysis(
        blockers=[], recommendations=[], uncertainties=[]
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

@pytest.mark.asyncio
@patch("orchestrator.agents.planner.get_llm")
@patch("orchestrator.agents.researcher.retrieve_context")
@patch("orchestrator.agents.critic.get_llm")
@patch("orchestrator.agents.decision_analyzer.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_k_e2e_decision_scenario(mock_synth_get_llm, mock_da_get_llm, mock_critic_get_llm, mock_retrieve_context, mock_planner_get_llm, workflow, base_state, run_config):
    # Setup base state for this specific test
    base_state["raw_query"] = "What should I focus on next?"
    base_state["workspace_context"] = {
        "space": None,
        "goals": [{"id": "g1", "description": "Launch MYND beta"}],
        "projects": [{"id": "p1", "description": "Step 6 integration"}],
        "memories": []
    }
    
    mock_planner_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=PlannerOutput(
        needs_research=True,
        reasoning_summary="Needs to check integration validation status.",
        tasks=[
            TaskDefinition(id="t1", query="integration validation status", purpose="find out if it is complete")
        ]
    ))
    
    # RAG returns document evidence
    mock_retrieve_context.return_value = [
        {"chunk_id": "c1", "content": "Integration validation remains incomplete", "document_title": "Validation Report", "source": "docs", "score": 0.95}
    ]
    
    mock_critic_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=CriticOutput(
        decision="accept",
        reason="Found the status.",
        missing_tasks=[]
    ))
    
    # DecisionAnalyzer returns the expected recommendation
    from orchestrator.schemas import Recommendation, DecisionEvidence
    mock_da_get_llm.return_value.with_structured_output.return_value.ainvoke = AsyncMock(return_value=DecisionAnalysis(
        blockers=[],
        recommendations=[
            Recommendation(
                action="Complete integration validation",
                reason="The Validation Report shows it is incomplete and it blocks the Step 6 integration project.",
                confidence="high",
                evidence=[
                    DecisionEvidence(source_type="document", content="Integration validation remains incomplete", is_fact=True, source_id="c1"),
                    DecisionEvidence(source_type="workspace", content="Project: Step 6 integration", is_fact=True, source_id="p1")
                ]
            )
        ],
        uncertainties=[]
    ))
    
    class MockMessage:
        def __init__(self, content):
            self.content = content
    
    mock_synth_get_llm.return_value.ainvoke = AsyncMock(return_value=MockMessage("Based on the decision analysis, you should complete the integration validation."))
    
    result = await workflow.ainvoke(base_state, config=run_config)
    
    # Assertions
    # 1. State propagated properly
    assert result["decision_output"] is not None
    assert len(result["decision_output"]["recommendations"]) == 1
    assert result["decision_output"]["recommendations"][0]["action"] == "Complete integration validation"
    
    # 2. Synthesizer received it (the mock returns our test string)
    assert "complete the integration validation" in result["final_synthesis"]
    
    # Check that Synthesizer was called with the stringified decision_output
    synth_calls = mock_synth_get_llm.return_value.ainvoke.call_args_list
    assert len(synth_calls) == 1
    messages_sent_to_synth = synth_calls[0][0][0]
    human_msg = messages_sent_to_synth[-1].content
    assert "DECISION ANALYSIS START" in human_msg
    assert "Complete integration validation" in human_msg
