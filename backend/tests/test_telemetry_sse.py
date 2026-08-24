import pytest
from httpx import AsyncClient
from tests.conftest import override_auth, clear_auth_override, USER_1_ID
import uuid

from unittest.mock import patch, AsyncMock, MagicMock

@pytest.mark.asyncio
@patch("orchestrator.agents.planner.get_llm")
@patch("orchestrator.agents.decision_analyzer.get_llm")
@patch("orchestrator.agents.synthesizer.get_llm")
async def test_sse_telemetry_flow(mock_synth_llm, mock_da_llm, mock_planner_llm, async_client: AsyncClient, user_1):
    mock_llm_p = MagicMock()
    mock_planner_output = MagicMock(needs_research=False, tasks=[], reasoning="test")
    mock_planner_output.model_dump.return_value = {"needs_research": False, "tasks": [], "reasoning": "test"}
    mock_llm_p.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_planner_output)
    mock_planner_llm.return_value = mock_llm_p
    
    mock_llm_d = MagicMock()
    from orchestrator.schemas import DecisionAnalysis, Recommendation, DecisionEvidence
    mock_da_output = DecisionAnalysis(
        blockers=[],
        recommendations=[
            Recommendation(
                action="Test Action",
                reason="Test Reason",
                evidence=[DecisionEvidence(source_type="document", content="Test", is_fact=True, source_id="1")],
                confidence="high"
            )
        ],
        uncertainties=[]
    )
    mock_llm_d.with_structured_output.return_value.ainvoke = AsyncMock(return_value=mock_da_output)
    mock_da_llm.return_value = mock_llm_d

    mock_llm_s = MagicMock()
    mock_llm_s.ainvoke = AsyncMock(return_value=MagicMock(content="Final Response"))
    mock_synth_llm.return_value = mock_llm_s

    override_auth(user_1)
    
    # 1. Create Space
    resp = await async_client.post("/api/v1/spaces", json={"name": "SSE Space"})
    space_id = resp.json()["id"]
    
    # 2. Create Conversation
    resp = await async_client.post("/api/v1/conversations", json={"space_id": space_id, "title": "SSE Conv"})
    conv_id = resp.json()["id"]
    
    # 3. Send Message and read SSE stream
    async with async_client.stream("POST", f"/api/v1/conversations/{conv_id}/messages", json={"role": "user", "content": "Hello"}) as response:
        events = []
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                import json
                events.append(json.loads(line[6:]))
                
        # We should have received events
        # Ordering check:
        # workflow.started -> context_gatherer started -> context_gatherer completed -> planner started
        
        event_names = [e["event"] for e in events]
        assert "workflow.started" in event_names
        assert "workflow.step.started" in event_names
        
        step_starts = [e["data"]["step"] for e in events if e["event"] == "workflow.step.started"]
        assert step_starts[0] == "context_gatherer"
        assert step_starts[1] == "planner"
        
        # Test output safe summary in completed
        completions = [e for e in events if e["event"] == "workflow.step.completed" and e["data"]["step"] == "context_gatherer"]
        assert len(completions) == 1
        cg_out = completions[0]["data"]["output"]
        assert "goals_count" in cg_out
        assert cg_out["context_type"] == "workspace"
        
        # Ensure planner finishes
        assert "planner" in [e["data"]["step"] for e in events if e["event"] == "workflow.step.completed"]
        
        # Test decision_analyzer output is sanitized full structure, not counts
        da_completions = [e for e in events if e["event"] == "workflow.step.completed" and e["data"]["step"] == "decision_analyzer"]
        assert len(da_completions) == 1
        da_out = da_completions[0]["data"]["output"]
        assert "recommendations" in da_out
        assert len(da_out["recommendations"]) == 1
        assert da_out["recommendations"][0]["action"] == "Test Action"
        assert "confidence" in da_out["recommendations"][0]
        assert "AgentState" not in da_out
        assert "workspace_context" not in da_out
        
        # message.completed is at the end
        assert event_names[-1] == "message.completed"

    clear_auth_override()
