"""
LangGraph State definition for the MYND AI Orchestrator.
"""

from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """
    The state dictionary passed between LangGraph nodes during Orchestration.
    """
    # Identifiers
    user_id: str
    space_id: str
    objective_id: str
    
    # Input
    raw_query: str
    
    # Intermediate State
    retrieved_context: List[Dict[str, Any]]
    research_findings: Dict[str, Any]
    
    # Output
    final_synthesis: str
    citations: List[str]
    confidence_score: float
