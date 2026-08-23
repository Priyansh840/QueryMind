"""
LangGraph Orchestrator for MYND.
Compiles the dynamic multi-agent workflow into an executable StateGraph.
"""

from langgraph.graph import StateGraph, START, END
from orchestrator.state import AgentState
from orchestrator.agents.planner import planner_node
from orchestrator.agents.researcher import research_node
from orchestrator.agents.critic import critic_node
from orchestrator.agents.synthesizer import synthesis_node
import logging

logger = logging.getLogger(__name__)

MAX_WORKFLOW_ITERATIONS = 3
MAX_TOTAL_RESEARCH_TASKS = 8

def route_after_planner(state: AgentState) -> str:
    """Decides if we need to do research or go straight to synthesis."""
    if state.get("workflow_status") == "failed":
        return "synthesizer"
        
    planner_out = state.get("planner_output", {})
    if planner_out.get("needs_research", False):
        return "researcher"
    return "synthesizer"

def route_after_critic(state: AgentState) -> str:
    """Decides if we need more research based on critic evaluation and budgets."""
    if state.get("workflow_status") == "failed":
        return "synthesizer"
        
    critic_out = state.get("critic_output", {})
    
    # Check task budget
    if state.get("total_research_tasks", 0) >= MAX_TOTAL_RESEARCH_TASKS:
        logger.warning("Max total research tasks reached, routing to synthesis.")
        return "synthesizer"
        
    if critic_out.get("decision") == "research_more" and state.get("workflow_status") != "terminated_budget":
        return "researcher"
        
    return "synthesizer"


def get_orchestrator():
    """
    Builds and returns the compiled LangGraph Orchestrator for Step 5.
    """
    logger.info("Compiling MYND Dynamic Orchestrator Graph...")
    
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("planner", planner_node)
    workflow.add_node("researcher", research_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("synthesizer", synthesis_node)
    
    # Edges
    workflow.add_edge(START, "planner")
    
    workflow.add_conditional_edges(
        "planner",
        route_after_planner,
        {
            "researcher": "researcher",
            "synthesizer": "synthesizer"
        }
    )
    
    workflow.add_edge("researcher", "critic")
    
    workflow.add_conditional_edges(
        "critic",
        route_after_critic,
        {
            "researcher": "researcher",
            "synthesizer": "synthesizer"
        }
    )
    
    workflow.add_edge("synthesizer", END)
    
    app = workflow.compile()
    return app
