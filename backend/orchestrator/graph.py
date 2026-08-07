"""
LangGraph Orchestrator for MYND.
Compiles the AI nodes into an executable StateGraph.
"""

from langgraph.graph import StateGraph, START, END
from orchestrator.state import AgentState
from orchestrator.agents.researcher import research_node
from orchestrator.agents.synthesizer import synthesis_node
import logging

logger = logging.getLogger(__name__)

def get_orchestrator():
    """
    Builds and returns the compiled LangGraph Orchestrator.
    """
    logger.info("Compiling MYND Orchestrator Graph...")
    
    # Initialize the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("researcher", research_node)
    workflow.add_node("synthesizer", synthesis_node)
    
    # Define edges (Flow)
    workflow.add_edge(START, "researcher")
    workflow.add_edge("researcher", "synthesizer")
    workflow.add_edge("synthesizer", END)
    
    # Compile
    app = workflow.compile()
    
    return app
