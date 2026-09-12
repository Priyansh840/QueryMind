export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export type SpaceRole = "owner" | "admin" | "member" | "viewer";

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: SpaceRole;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  invited_by_user_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface InviteMemberRequest {
  email: string;
  role: "admin" | "member" | "viewer";
}

export interface UpdateMemberRoleRequest {
  role: "admin" | "member" | "viewer" | "owner";
}

export interface TransferOwnershipRequest {
  new_owner_user_id: string;
}

export interface Space {
  id: string;
  user_id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_default: boolean;
  role?: SpaceRole;
  members_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SpaceCreateInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  slug?: string;
  is_default?: boolean;
}

export interface SpaceUpdateInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  slug?: string;
  is_default?: boolean;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content_text: string;
  page_number?: number | null;
  token_count?: number | null;
  embedding_status: "pending" | "completed" | "failed";
  created_at: string;
}

export interface DocumentItem {
  id: string;
  space_id: string;
  title: string;
  file_url: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string | null;
  created_at: string;
  chunks?: DocumentChunk[];
}

export interface DocumentSearchResult {
  chunk_id: string;
  document_id: string;
  content: string;
  score: number;
  page_number?: number | null;
  document_title?: string | null;
  source_type: string;
}

export interface Citation {
  document_title: string;
  chunk_id?: string | null;
  page_number?: number | null;
  snippet?: string | null;
}

export interface MessageMetadata {
  objective_id?: string;
  action_proposals?: ActionProposal[];
  [key: string]: any;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: (string | Citation)[] | null;
  metadata_json?: MessageMetadata | null;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  space_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AgentActivityStep {
  agent: string;
  status: string;
  step?: string;
  output?: any;
  timestamp: number;
}

export interface ActionProposal {
  id: string;
  proposal_id: string;
  user_id: string;
  space_id: string;
  conversation_id: string;
  message_id: string;
  objective_id?: string | null;
  action_type: string;
  target_id?: string | null;
  parameters: Record<string, any>;
  reason: string;
  source_recommendation?: string | null;
  confidence: "high" | "medium" | "low" | string;
  status: "pending" | "approved" | "executed" | "rejected" | "failed";
  created_at: string;
  approved_at?: string | null;
  executed_at?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface ProjectItem {
  id: string;
  space_id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface GoalItem {
  id: string;
  project_id?: string | null;
  description: string;
  status: string;
  created_at: string;
}

export interface SpaceActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  target_id?: string | null;
  target_route?: string | null;
  status?: string | null;
  created_at: string;
}

export interface SpaceActiveWorkItem {
  id: string;
  agent_type: string;
  task_id?: string | null;
  status: string;
  started_at?: string | null;
  summary?: Record<string, any> | null;
}

export interface SpaceWorkspaceSummary {
  space: Space;
  stats: {
    documents_count: number;
    chunks_count: number;
    conversations_count: number;
    pending_actions_count: number;
    projects_count: number;
    goals_count: number;
    active_work_count: number;
  };
  pending_actions: ActionProposal[];
  recent_activity: SpaceActivityItem[];
  active_work: SpaceActiveWorkItem[];
  recent_documents: {
    id: string;
    title: string;
    type: string;
    status: string;
    created_at: string;
  }[];
  recent_conversations: {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
  }[];
  active_projects: ProjectItem[];
  active_goals: GoalItem[];
}

export interface DecisionEvidence {
  document_id?: string | null;
  document_title: string;
  chunk_id?: string | null;
  page_number?: number | null;
  snippet?: string | null;
  source_type?: string | null;
}

export interface DecisionTimelineEvent {
  event_type: string;
  title: string;
  timestamp: string;
  status?: string | null;
  details?: Record<string, any> | null;
}

export interface DecisionDetail {
  id: string;
  proposal_id: string;
  space_id: string;
  conversation_id: string;
  conversation_title?: string | null;
  message_id: string;
  title: string;
  conclusion: string;
  action_type: string;
  parameters: Record<string, any>;
  confidence: string;
  status: "pending" | "approved" | "executed" | "rejected" | "failed";
  evidence: DecisionEvidence[];
  outcome?: {
    status: string;
    target_id?: string | null;
    action_type?: string | null;
    executed_at?: string | null;
    summary: string;
    error_code?: string | null;
    error_message?: string | null;
  } | null;
  timeline: DecisionTimelineEvent[];
  created_at: string;
  approved_at?: string | null;
  executed_at?: string | null;
}

export interface MemoryItem {
  id: string;
  user_id: string;
  space_id?: string | null;
  memory_type: string;
  content: string;
  confidence: number;
  status: string;
  importance: string;
  reinforcement_count: number;
  source_count: number;
  first_seen_at: string;
  last_reinforced_at: string;
  created_at: string;
  updated_at: string;
}

export interface SpaceConnectionItem {
  id: string;
  source_id: string;
  source_type: string;
  target_id: string;
  target_type: string;
  relation: string;
  reason?: string | null;
  confidence: number;
  created_at: string;
}

export interface SpaceInsightItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  source_count: number;
  confidence: string;
  created_at: string;
}

export interface SpaceMemorySummary {
  memories: MemoryItem[];
  connections: SpaceConnectionItem[];
  insights: SpaceInsightItem[];
  stats: {
    memories_count: number;
    connections_count: number;
    insights_count: number;
    documents_count: number;
    conversations_count: number;
    actions_count: number;
  };
}

export interface SearchResultItem {
  id: string;
  type:
    | "document"
    | "knowledge"
    | "conversation"
    | "message"
    | "decision"
    | "memory"
    | "project"
    | "goal";
  title: string;
  snippet?: string | null;
  score?: number | null;
  space_id: string;
  created_at?: string | null;
  metadata?: Record<string, any> | null;
  href: string;
}

export interface SearchResponse {
  query: string;
  space_id: string;
  total_results: number;
  results: SearchResultItem[];
}

export interface AgentRunItem {
  id: string;
  agent_type: string;
  task_id?: string | null;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  output_summary?: Record<string, any> | null;
  error?: string | null;
}

export interface WorkflowStepItem {
  id: string;
  step_order: number;
  iteration: number;
  intent_type: string;
  name: string;
  description?: string | null;
  status: "pending" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled";
  output_summary?: string | null;
  agent_runs: AgentRunItem[];
}

export interface WorkflowDetail {
  id: string;
  objective_id: string;
  space_id: string;
  goal: string;
  status: "planning" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled";
  created_at: string;
  steps: WorkflowStepItem[];
  output?: Record<string, any> | null;
  pending_actions: ActionProposal[];
}

export interface WorkflowListItem {
  id: string;
  objective_id: string;
  space_id: string;
  goal: string;
  status: "planning" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled";
  created_at: string;
  steps_count: number;
  completed_steps_count: number;
  current_step?: string | null;
}


