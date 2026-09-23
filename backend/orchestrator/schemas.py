from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

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

class DecisionEvidence(BaseModel):
    source_type: Literal["workspace", "document", "conversation"] = Field(description="The source of the evidence")
    content: str = Field(description="The direct quote or factual summary from the source")
    is_fact: bool = Field(description="Whether this is a stated fact (True) or an inferred assumption (False)")
    source_id: Optional[str] = Field(default=None, description="The chunk_id or workspace item ID if available")

class Recommendation(BaseModel):
    action: str = Field(description="The recommended next step or action")
    reason: str = Field(description="The reasoning behind the recommendation")
    evidence: List[DecisionEvidence] = Field(default_factory=list, description="The evidence grounding this recommendation")
    confidence: Literal["high", "medium", "low"] = Field(description="The confidence level of this recommendation")

class DecisionAnalysis(BaseModel):
    blockers: List[str] = Field(default_factory=list, description="What is preventing progress")
    recommendations: List[Recommendation] = Field(default_factory=list, description="Proposed next steps grounded in evidence")
    uncertainties: List[str] = Field(default_factory=list, description="Missing information or ambiguity")


# ==============================================================================
# Step 8 Phase 1: Action Proposal Schemas (Read -> Analyze -> Propose)
# ==============================================================================

class CreateGoalParams(BaseModel):
    description: Optional[str] = Field(None, min_length=1, description="Description of the goal to create")
    title: Optional[str] = Field(None, min_length=1, description="Title of the goal to create")
    space_id: Optional[str] = Field(None, description="Optional target space UUID")
    project_id: Optional[str] = Field(None, description="Optional UUID of the project this goal belongs to")
    target_date: Optional[str] = Field(None, description="Optional target completion date or deadline")
    priority: Optional[str] = Field("medium", description="Priority rating: high, medium, low")

    @model_validator(mode="before")
    @classmethod
    def resolve_goal_title(cls, data: Any) -> Any:
        if isinstance(data, dict):
            desc = data.get("description") or data.get("title")
            if not desc:
                raise ValueError("Goal must have either a description or title.")
            data["description"] = desc
        return data


class UpdateGoalStatusParams(BaseModel):
    goal_id: str = Field(..., description="UUID of the goal to update")
    status: Literal["active", "completed", "archived", "paused"] = Field(..., description="New status for the goal")


class CreateProjectParams(BaseModel):
    space_id: str = Field(..., description="UUID of the space where the project will be created")
    name: str = Field(..., min_length=1, max_length=255, description="Name of the project")
    description: Optional[str] = Field(None, description="Optional project description")


class UpdateProjectStatusParams(BaseModel):
    project_id: str = Field(..., description="UUID of the project to update")
    status: Literal["active", "completed", "archived", "on_hold"] = Field(..., description="New status for the project")


class AddMemoryParams(BaseModel):
    content: str = Field(..., min_length=1, description="Memory note content to store")
    memory_type: str = Field(default="note", max_length=50, description="Category/type of memory, e.g. note, preference, constraint")
    importance: Literal["high", "medium", "low"] = Field(default="medium", description="Importance rating")


class CreateSpaceParams(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the space to create")
    description: Optional[str] = Field(None, description="Optional description of the space")
    icon: Optional[str] = Field(None, description="Optional emoji or icon character for the space")


class CreateNoteParams(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Title of the note or document")
    content: str = Field(..., min_length=1, description="Text content of the note")
    space_id: Optional[str] = Field(None, description="Optional target space UUID")


ActionType = Literal[
    "create_goal",
    "update_goal_status",
    "create_project",
    "update_project_status",
    "add_memory",
    "create_space",
    "create_note",
]


class ActionProposal(BaseModel):
    proposal_id: str = Field(description="Unique deterministic or random identifier for the proposal")
    action_type: ActionType = Field(description="Strict allowlisted action type")
    target_id: Optional[str] = Field(default=None, description="Target entity UUID if updating an existing record")
    space_id: Optional[str] = Field(default=None, description="Target space UUID if space-scoped")
    parameters: dict = Field(description="Strictly typed parameter dictionary matching action_type")
    reason: str = Field(description="Why this action is proposed to advance workspace goals")
    source_recommendation: Optional[str] = Field(default=None, description="Action or reference from the Recommendation that triggered this proposal")
    confidence: Literal["high", "medium", "low"] = Field(default="medium", description="Confidence level in this proposed action")

    def validate_parameters(self) -> BaseModel:
        """
        Validates that parameters match the strongly-typed schema for action_type.
        Returns the parsed Pydantic parameter model.
        """
        if self.action_type == "create_goal":
            return CreateGoalParams.model_validate(self.parameters)
        elif self.action_type == "update_goal_status":
            return UpdateGoalStatusParams.model_validate(self.parameters)
        elif self.action_type == "create_project":
            return CreateProjectParams.model_validate(self.parameters)
        elif self.action_type == "update_project_status":
            return UpdateProjectStatusParams.model_validate(self.parameters)
        elif self.action_type == "add_memory":
            return AddMemoryParams.model_validate(self.parameters)
        elif self.action_type == "create_space":
            return CreateSpaceParams.model_validate(self.parameters)
        elif self.action_type == "create_note":
            return CreateNoteParams.model_validate(self.parameters)
        else:
            raise ValueError(f"Unsupported action type: {self.action_type}")


class ActionProposalsOutput(BaseModel):
    proposals: List[ActionProposal] = Field(default_factory=list, description="List of proposed actions grounded in recommendations and workspace context")


class ActionExecutionResult(BaseModel):
    success: bool = Field(description="Whether the action executed successfully")
    proposal_id: str = Field(description="ID of the proposal that was executed")
    action_type: ActionType = Field(description="The action type that was executed")
    status: Literal["executed", "already_executed", "rejected", "failed"] = Field(description="Execution outcome status")
    target_id: Optional[str] = Field(default=None, description="UUID of the created or updated entity")
    message: str = Field(description="Safe user-facing summary of the execution outcome")
    error_code: Optional[Literal["invalid_proposal", "unauthorized", "target_not_found", "invalid_parameters", "already_executed", "execution_failed"]] = Field(
        default=None, description="Structured error category if not executed"
    )
    state_delta: Optional[Dict[str, Any]] = Field(default=None, description="Deterministic before and after state delta")
    target_entity_type: Optional[str] = Field(default=None, description="Target entity type: goal, project, memory")



