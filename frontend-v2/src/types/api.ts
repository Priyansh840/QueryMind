export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
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
