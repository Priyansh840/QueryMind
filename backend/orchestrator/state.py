"""
LangGraph State definition for the MYND AI Orchestrator.
"""

from typing import TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage

class ResearchTask(TypedDict):
    id: str
    iteration: int
    query: str
    purpose: str
    status: str

class Evidence(TypedDict):
    chunk_id: str
    document_title: str
    source: str
    page_number: Optional[int]
    content: str
    relevance_score: Optional[float]

class ResearchResult(TypedDict):
    task_id: str
    query: str
    iteration: int
    status: str
    error: Optional[str]
    evidence: List[Evidence]

class AgentState(TypedDict):
    """
    The state dictionary passed between LangGraph nodes during Orchestration.
    """
    # Context & Security
    user_id: str
    space_id: str
    objective_id: str
    conversation_id: str
    
    # Inputs
    raw_query: str
    chat_history: List[BaseMessage]
    
    # Workflow State
    planner_output: Optional[dict]
    research_tasks: List[ResearchTask]
    research_results: List[ResearchResult]
    critic_output: Optional[dict]
    
    # Budgets & Counters
    workflow_iteration: int
    total_research_tasks: int
    workflow_status: str
    
    # Outputs
    final_synthesis: str
    citations: List[str]
