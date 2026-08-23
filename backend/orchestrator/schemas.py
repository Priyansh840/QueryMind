from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class TaskDefinition(BaseModel):
    id: str = Field(description="Unique task ID, typically task_<number>")
    query: str = Field(description="The specific search query to execute against the knowledge vault")
    purpose: str = Field(description="Why this task is being run and what information is expected")

class PlannerOutput(BaseModel):
    needs_research: bool = Field(description="Whether research against the knowledge vault is required to answer the query")
    reasoning_summary: str = Field(description="A concise summary of why research is or isn't needed, suitable for user UI telemetry")
    tasks: List[TaskDefinition] = Field(default_factory=list, description="List of research tasks to execute if needs_research is true")

class CriticOutput(BaseModel):
    decision: Literal["accept", "research_more"] = Field(description="Whether the retrieved evidence is sufficient to answer the query")
    reason: str = Field(description="A concise summary of why the evidence was accepted or rejected")
    missing_tasks: List[TaskDefinition] = Field(default_factory=list, description="List of new research tasks to execute if decision is 'research_more'")
