import axios from "axios";
import { supabase } from "./supabase";

const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const API_BASE = RAW_API_URL ? `${RAW_API_URL}/api/v1` : "/api/v1";

const TOKEN_KEY = "querymind_token";
const USER_KEY = "querymind_user";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000,
});

// Request interceptor — prefer localStorage native JWT, then Supabase session
api.interceptors.request.use(
  async (config) => {
    // 1. Check for native backend token first
    if (typeof window !== "undefined") {
      const nativeToken = localStorage.getItem(TOKEN_KEY);
      if (nativeToken) {
        config.headers.Authorization = `Bearer ${nativeToken}`;
        return config;
      }
    }

    // 2. Fallback to Supabase session token
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Local/offline fallback
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login") &&
      !error.config?.url?.includes("/auth/register") &&
      !error.config?.url?.includes("/auth/sync") &&
      !error.config?.url?.includes("/auth/me")
    ) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        // Redirect to login only if we're on an authenticated page and not in auth callback
        const path = window.location.pathname;
        if (!path.includes("/login") && !path.includes("/auth/callback")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth helpers
export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function setStoredUser(user: { id: string; email: string; display_name?: string | null }) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getStoredUser(): { id: string; email: string; display_name?: string | null } | null {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
  }
  return null;
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post<{
      token: string;
      user: { id: string; email: string; display_name?: string | null; avatar_url?: string | null };
    }>("/auth/login", credentials);
    if (res.data?.token) {
      setAuthToken(res.data.token);
      setStoredUser(res.data.user);
    }
    return res.data;
  },

  register: async (data: { email: string; password: string; display_name?: string }) => {
    const res = await api.post<{
      token: string;
      user: { id: string; email: string; display_name?: string | null; avatar_url?: string | null };
    }>("/auth/register", data);
    if (res.data?.token) {
      setAuthToken(res.data.token);
      setStoredUser(res.data.user);
    }
    return res.data;
  },

  getMe: async () => {
    const res = await api.get<{
      id: string;
      email: string;
      display_name?: string | null;
      avatar_url?: string | null;
      created_at?: string | null;
      stats?: {
        knowledge_objects?: number;
        spaces?: number;
        documents?: number;
        connections?: number;
      };
    }>("/auth/me");
    if (res.data) {
      setStoredUser({
        id: res.data.id,
        email: res.data.email,
        display_name: res.data.display_name,
      });
    }
    return res.data;
  },

  logout: () => {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
};

export interface ChatResponseData {
  objective_id: string;
  response: string;
  citations: string[];
}

export interface TraceEvent {
  timestamp: string;
  type: string;
  agent?: string;
  message: string;
  tokens_used?: number;
}

export interface ObjectiveTraceData {
  objective_id: string;
  raw_input: string;
  status: string;
  created_at: string;
  trace: TraceEvent[];
}

export interface SpaceData {
  id: string;
  user_id: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpaceCreateData {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default?: boolean;
}

export interface SpaceUpdateData {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_default?: boolean;
}

export interface CockpitEvidence {
  id?: string;
  title: string;
  type: string;
  snippet?: string;
}

export interface CockpitAction {
  action_type: string;
  label: string;
  target_id?: string;
  payload?: Record<string, any>;
}

export interface RightNowFocus {
  id: string;
  headline: string;
  why_it_matters: string;
  evidence: CockpitEvidence[];
  recommended_action: CockpitAction;
  urgency: "high" | "medium" | "low";
  source_context: string;
}

export interface NoticedPattern {
  id: string;
  type: "pattern" | "contradiction" | "repeated_topic" | "shift";
  title: string;
  observation: string;
  why_it_matters: string;
  confidence: number;
  sources_count: number;
  evidence: CockpitEvidence[];
  action?: CockpitAction;
}

export interface OpenLoopItem {
  id: string;
  loop_type: "uncompleted_task" | "pending_proposal" | "unverified_outcome";
  title: string;
  context: string;
  age_formatted: string;
  created_at: string;
  importance: "high" | "medium" | "low" | string;
  action: CockpitAction;
}

export interface NextBestMoveItem {
  id: string;
  action_type: string;
  headline: string;
  why_mynd_recommends: string;
  expected_impact: string;
  action: CockpitAction;
}

export interface KnowledgeGapItem {
  id: string;
  known_concept: string;
  missing_relationship: string;
  related_sources: string[];
  suggested_action: CockpitAction;
}

export interface ResolvedConnectionItem {
  id: string;
  source_id: string;
  source_title: string;
  source_type: string;
  target_id: string;
  target_title: string;
  target_type: string;
  relation: string;
  reason?: string;
  confidence: number;
  created_at: string;
}

export interface IntelligenceTimelineItem {
  id: string;
  event_type: string;
  title: string;
  detail: string;
  timestamp: string;
  status?: string;
  badge_label: string;
}

export interface SpaceCockpitData {
  space: SpaceData;
  last_synced_at: string;
  right_now?: RightNowFocus | null;
  mynd_noticed: NoticedPattern[];
  open_loops: OpenLoopItem[];
  next_best_move?: NextBestMoveItem | null;
  knowledge_gaps: KnowledgeGapItem[];
  connections: ResolvedConnectionItem[];
  timeline: IntelligenceTimelineItem[];
}

export interface KnowledgeItemData {
  id: string;
  user_id: string;
  space_id?: string;
  document_id?: string;
  document_title?: string;
  source_chunk_id?: string;
  title?: string;
  content: string;
  knowledge_type: string;
  page_number?: number;
  confidence: number;
  metadata_json?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProjectData {
  id: string;
  space_id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface GoalData {
  id: string;
  user_id: string;
  space_id?: string;
  project_id?: string;
  description: string;
  status: string;
  tasks?: Array<{ id: string; title: string; completed: boolean; sub_goal?: string; priority?: "high" | "medium" | "low" }>;
  category?: string;
  priority?: "high" | "medium" | "low";
  target_date?: string;
  created_at: string;
}

export interface MemoryData {
  id: string;
  user_id: string;
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

export interface ActionProposalItem {
  id: string;
  proposal_id: string;
  space_id?: string;
  action_type: string;
  target_id?: string;
  parameters: Record<string, any>;
  reason: string;
  confidence: string;
  status: "pending" | "approved" | "executed" | "rejected" | "failed";
  created_at: string;
}

export interface ReflectionItem {
  id: string;
  space_id: string;
  user_id: string;
  outcome_id?: string;
  reflection_type: "lesson" | "failure_analysis" | "success_pattern" | "user_feedback";
  title: string;
  lesson_learned: string;
  actionable_guidance?: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepItem {
  id: string;
  step_order: number;
  iteration: number;
  intent_type: string;
  name: string;
  description?: string;
  status: string;
  output_summary?: string;
  agent_runs: Array<{
    id: string;
    agent_type: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    output_summary?: Record<string, any>;
  }>;
}

export interface WorkflowDetailItem {
  id: string;
  objective_id: string;
  space_id: string;
  goal: string;
  status: string;
  created_at: string;
  steps: WorkflowStepItem[];
  output?: Record<string, any>;
  pending_actions: any[];
}

export const queryMindApi = {
  // Knowledge Management
  getKnowledge: async (filters?: {
    spaceId?: string;
    documentId?: string;
    knowledgeType?: string;
  }): Promise<KnowledgeItemData[]> => {
    const params = new URLSearchParams();
    if (filters?.spaceId) params.append("space_id", filters.spaceId);
    if (filters?.documentId) params.append("document_id", filters.documentId);
    if (filters?.knowledgeType) params.append("knowledge_type", filters.knowledgeType);

    const qs = params.toString();
    const url = `/knowledge${qs ? `?${qs}` : ""}`;
    const res = await api.get<KnowledgeItemData[]>(url);
    return res.data;
  },

  createKnowledge: async (data: {
    title?: string;
    content: string;
    space_id?: string;
    knowledge_type?: string;
    metadata_json?: Record<string, any>;
  }): Promise<KnowledgeItemData> => {
    const res = await api.post<KnowledgeItemData>("/knowledge", data);
    return res.data;
  },

  getKnowledgeItem: async (knowledgeId: string): Promise<KnowledgeItemData> => {
    const res = await api.get<KnowledgeItemData>(`/knowledge/${knowledgeId}`);
    return res.data;
  },

  deleteKnowledgeItem: async (knowledgeId: string): Promise<{ status: string; message: string }> => {
    const res = await api.delete<{ status: string; message: string }>(`/knowledge/${knowledgeId}`);
    return res.data;
  },

  // Projects Management
  getProjects: async (spaceId?: string): Promise<ProjectData[]> => {
    const res = await api.get<ProjectData[]>(`/projects${spaceId ? `?space_id=${spaceId}` : ""}`);
    return res.data;
  },
  getProject: async (projectId: string): Promise<ProjectData> => {
    const res = await api.get<ProjectData>(`/projects/${projectId}`);
    return res.data;
  },
  createProject: async (data: { space_id: string; name: string }): Promise<ProjectData> => {
    const res = await api.post<ProjectData>("/projects", data);
    return res.data;
  },
  updateProject: async (projectId: string, data: { name?: string; status?: string }): Promise<ProjectData> => {
    const res = await api.patch<ProjectData>(`/projects/${projectId}`, data);
    return res.data;
  },
  deleteProject: async (projectId: string): Promise<{ status: string; message: string }> => {
    const res = await api.delete<{ status: string; message: string }>(`/projects/${projectId}`);
    return res.data;
  },

  // Goals Management
  getGoals: async (filters?: { spaceId?: string; projectId?: string } | string): Promise<GoalData[]> => {
    let qs = "";
    if (typeof filters === "string") {
      qs = `?project_id=${encodeURIComponent(filters)}`;
    } else if (filters) {
      const p = new URLSearchParams();
      if (filters.spaceId) p.append("space_id", filters.spaceId);
      if (filters.projectId) p.append("project_id", filters.projectId);
      const str = p.toString();
      if (str) qs = `?${str}`;
    }
    const res = await api.get<GoalData[]>(`/goals${qs}`);
    return res.data;
  },
  getGoal: async (goalId: string): Promise<GoalData> => {
    const res = await api.get<GoalData>(`/goals/${goalId}`);
    return res.data;
  },
  createGoal: async (data: {
    description: string;
    space_id?: string;
    project_id?: string;
    tasks?: Array<{ id: string; title: string; completed: boolean; priority?: "high" | "medium" | "low" }>;
    category?: string;
    priority?: "high" | "medium" | "low";
    target_date?: string;
  }): Promise<GoalData> => {
    const res = await api.post<GoalData>("/goals", data);
    return res.data;
  },
  updateGoal: async (
    goalId: string,
    data: {
      description?: string;
      status?: string;
      tasks?: Array<{ id: string; title: string; completed: boolean; priority?: "high" | "medium" | "low" }>;
      category?: string;
      priority?: "high" | "medium" | "low";
      target_date?: string;
    }
  ): Promise<GoalData> => {
    const res = await api.patch<GoalData>(`/goals/${goalId}`, data);
    return res.data;
  },
  deleteGoal: async (goalId: string): Promise<{ status: string; message: string }> => {
    const res = await api.delete<{ status: string; message: string }>(`/goals/${goalId}`);
    return res.data;
  },
  recommendGoalTasks: async (data: {
    goal_description: string;
    space_id?: string;
    space_ids?: string[];
    category?: string;
  }): Promise<{
    goal: string;
    suggested_tasks: Array<{ title: string; sub_goal?: string; priority: "high" | "medium" | "low"; reasoning?: string }>;
    context_used?: string;
  }> => {
    const res = await api.post("/goals/recommend-tasks", data);
    return res.data;
  },
  sendGoalChatMessage: async (
    goalId: string,
    data: {
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      goal_description?: string;
      progress?: number;
      tasks?: Array<any>;
      target_date?: string;
      space_ids?: string[];
    }
  ): Promise<{
    response: string;
    citations: Array<{ document_title?: string; page_number?: number; snippet: string; score?: number }>;
    spaces_searched: string[];
  }> => {
    const res = await api.post(`/goals/${goalId}/chat`, data);
    return res.data;
  },

  // Memories Management
  getMemories: async (memoryType?: string): Promise<MemoryData[]> => {
    const res = await api.get<MemoryData[]>(`/memories${memoryType ? `?memory_type=${memoryType}` : ""}`);
    return res.data;
  },
  getMemory: async (memoryId: string): Promise<MemoryData> => {
    const res = await api.get<MemoryData>(`/memories/${memoryId}`);
    return res.data;
  },
  createMemory: async (data: { memory_type: string; content: string; importance?: string; space_id?: string }): Promise<MemoryData> => {
    const res = await api.post<MemoryData>("/memories", data);
    return res.data;
  },
  updateMemory: async (memoryId: string, data: { content?: string; status?: string; importance?: string }): Promise<MemoryData> => {
    const res = await api.patch<MemoryData>(`/memories/${memoryId}`, data);
    return res.data;
  },
  deleteMemory: async (memoryId: string): Promise<{ status: string; message: string }> => {
    const res = await api.delete<{ status: string; message: string }>(`/memories/${memoryId}`);
    return res.data;
  },
  reinforceMemory: async (memoryId: string): Promise<MemoryData> => {
    const res = await api.post<MemoryData>(`/memories/${memoryId}/reinforce`);
    return res.data;
  },
  getSpaceMemorySummary: async (spaceId: string): Promise<any> => {
    const res = await api.get(`/memories/space/${spaceId}/summary`);
    return res.data;
  },

  // Spaces Management
  getSpaces: async (): Promise<SpaceData[]> => {
    const res = await api.get<SpaceData[]>("/spaces");
    return res.data;
  },

  getSpace: async (spaceId: string): Promise<SpaceData> => {
    const res = await api.get<SpaceData>(`/spaces/${spaceId}`);
    return res.data;
  },

  createSpace: async (data: SpaceCreateData): Promise<SpaceData> => {
    const res = await api.post<SpaceData>("/spaces", data);
    return res.data;
  },

  updateSpace: async (spaceId: string, data: SpaceUpdateData): Promise<SpaceData> => {
    const res = await api.patch<SpaceData>(`/spaces/${spaceId}`, data);
    return res.data;
  },

  deleteSpace: async (spaceId: string): Promise<{ status: string; message: string }> => {
    const res = await api.delete<{ status: string; message: string }>(`/spaces/${spaceId}`);
    return res.data;
  },

  getSpaceCockpit: async (spaceId: string): Promise<SpaceCockpitData> => {
    const res = await api.get<SpaceCockpitData>(`/spaces/${spaceId}/cockpit`);
    return res.data;
  },

  resolveOpenLoop: async (action: CockpitAction): Promise<any> => {
    if (action.action_type === "approve_proposal" && action.target_id) {
      return queryMindApi.approveAction(action.target_id);
    }
    if (action.action_type === "complete_task" && action.payload?.goal_id && action.payload?.task_id) {
      const goal = await queryMindApi.getGoal(action.payload.goal_id);
      const updatedTasks = (goal.tasks || []).map((t) =>
        t.id === action.payload?.task_id ? { ...t, completed: true } : t
      );
      return queryMindApi.updateGoal(action.payload.goal_id, { tasks: updatedTasks });
    }
    if (action.action_type === "verify_outcome" && action.payload?.outcome_id) {
      return api.post(`/outcomes/${action.payload.outcome_id}/evaluate`, {
        status: "success",
        actual_outcome: "Verified efficacious by human workspace operator.",
      });
    }
    return null;
  },

  // Conversations & SSE Streaming
  createConversation: async (spaceId: string, title?: string) => {
    let resolvedSpaceId = spaceId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(spaceId);
    if (!isUUID) {
      try {
        const { useMyndStore } = await import("@/lib/mynd-store");
        const spaces = useMyndStore.getState().spaces;
        const found = spaces.find(
          (s) => s.id === spaceId || s.slug === spaceId || s.name.toLowerCase() === spaceId.toLowerCase()
        );
        if (found && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(found.id)) {
          resolvedSpaceId = found.id;
        }
      } catch {}
    }
    const res = await api.post("/conversations", { space_id: resolvedSpaceId, title });
    return res.data;
  },

  getConversations: async (
    spaceIdOrParams?: string | {
      spaceId?: string;
      dateFrom?: string;
      dateTo?: string;
      datePreset?: string;
      search?: string;
      limit?: number;
      offset?: number;
      asPaged?: boolean;
    }
  ) => {
    let params: Record<string, any> = {};
    if (typeof spaceIdOrParams === "string") {
      if (spaceIdOrParams) params.space_id = spaceIdOrParams;
    } else if (spaceIdOrParams && typeof spaceIdOrParams === "object") {
      if (spaceIdOrParams.spaceId) params.space_id = spaceIdOrParams.spaceId;
      if (spaceIdOrParams.dateFrom) params.date_from = spaceIdOrParams.dateFrom;
      if (spaceIdOrParams.dateTo) params.date_to = spaceIdOrParams.dateTo;
      if (spaceIdOrParams.datePreset) params.date_preset = spaceIdOrParams.datePreset;
      if (spaceIdOrParams.search) params.search = spaceIdOrParams.search;
      if (spaceIdOrParams.limit !== undefined) params.limit = spaceIdOrParams.limit;
      if (spaceIdOrParams.offset !== undefined) params.offset = spaceIdOrParams.offset;
      if (spaceIdOrParams.asPaged !== undefined) params.as_paged = spaceIdOrParams.asPaged;
    }

    const res = await api.get("/conversations", { params });
    return res.data;
  },

  getConversation: async (conversationId: string) => {
    const res = await api.get(`/conversations/${conversationId}`);
    return res.data;
  },

  getConversationMessages: async (conversationId: string) => {
    const res = await api.get(`/conversations/${conversationId}/messages`);
    return res.data;
  },

  deleteConversation: async (conversationId: string) => {
    const res = await api.delete(`/conversations/${conversationId}`);
    return res.data;
  },

  // Note: Streaming SSE logic will be handled directly in the component using fetch or EventSource
  // but we keep the old orchestrator endpoint just in case until it's fully deprecated
  chatWithOrchestrator: async (
    query: string,
    spaceId?: string
  ): Promise<ChatResponseData> => {
    const res = await api.post<ChatResponseData>("/chat/", {
      query,
      space_id: spaceId,
    });
    return res.data;
  },

  // Execution Trace Telemetry
  getObjectiveTrace: async (objectiveId: string): Promise<ObjectiveTraceData> => {
    const res = await api.get<ObjectiveTraceData>(`/objectives/${objectiveId}/trace`);
    return res.data;
  },

  // Document Management (Postgres + Qdrant)
  uploadDocument: async (file: File, spaceId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (spaceId) {
      formData.append("space_id", spaceId);
    }

    const res = await api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 180000,
    });
    return res.data;
  },

  listDocuments: async (spaceId?: string) => {
    try {
      const url = spaceId ? `/documents?space_id=${spaceId}` : `/documents`;
      const res = await api.get(url);
      return res.data;
    } catch {
      return [];
    }
  },

  deleteDocument: async (documentId: string) => {
    const res = await api.delete(`/documents/${documentId}`);
    return res.data;
  },

  // Direct RAG Vector Query
  askRag: async (question: string, documentTitle?: string) => {
    const formData = new FormData();
    formData.append("question", question);
    if (documentTitle) {
      formData.append("document_title", documentTitle);
    }
    const res = await api.post("/test/ask", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  // Semantic Vector Search
  searchVectors: async (query: string) => {
    const res = await api.get(`/test/search?query=${encodeURIComponent(query)}`);
    return res.data;
  },

  // Action Proposals & Execution
  getActions: async (params?: { spaceId?: string; status?: string; limit?: number }): Promise<{ items: ActionProposalItem[]; total: number }> => {
    const p = new URLSearchParams();
    if (params?.spaceId) p.append("space_id", params.spaceId);
    if (params?.status) p.append("status", params.status);
    if (params?.limit) p.append("limit", params.limit.toString());
    const qs = p.toString();
    const res = await api.get<{ items: ActionProposalItem[]; total: number }>(`/actions${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  approveAction: async (proposalId: string) => {
    const res = await api.post(`/actions/${proposalId}/approve`);
    return res.data;
  },

  rejectAction: async (proposalId: string) => {
    const res = await api.post(`/actions/${proposalId}/reject`);
    return res.data;
  },

  // Reflections & Critic Management
  getReflections: async (spaceId: string, reflectionType?: string): Promise<{ items: ReflectionItem[]; total: number }> => {
    const p = new URLSearchParams();
    p.append("space_id", spaceId);
    if (reflectionType) p.append("reflection_type", reflectionType);
    const res = await api.get<{ items: ReflectionItem[]; total: number }>(`/reflections?${p.toString()}`);
    return res.data;
  },

  createReflection: async (data: {
    space_id: string;
    title: string;
    lesson_learned: string;
    actionable_guidance?: string;
    reflection_type?: "lesson" | "failure_analysis" | "success_pattern" | "user_feedback";
    confidence?: number;
  }): Promise<ReflectionItem> => {
    const res = await api.post<ReflectionItem>("/reflections", data);
    return res.data;
  },

  // Workflows & Multi-Agent Orchestration
  getWorkflows: async (spaceId: string, status?: string): Promise<any[]> => {
    const p = new URLSearchParams({ space_id: spaceId });
    if (status) p.append("status", status);
    const res = await api.get<any[]>(`/workflows?${p.toString()}`);
    return res.data;
  },

  getWorkflow: async (workflowId: string): Promise<WorkflowDetailItem> => {
    const res = await api.get<WorkflowDetailItem>(`/workflows/${workflowId}`);
    return res.data;
  },

  createWorkflow: async (spaceId: string, goal: string): Promise<WorkflowDetailItem> => {
    const res = await api.post<WorkflowDetailItem>("/workflows", { space_id: spaceId, goal });
    return res.data;
  },

  // File Exports & Downloads
  exportConversation: async (
    conversationId: string,
    format: "markdown" | "json" | "pdf" = "markdown",
    includeCitations = true
  ) => {
    const res = await api.get(`/exports/conversations/${conversationId}`, {
      params: { format, include_citations: includeCitations },
      responseType: "blob",
    });
    return res.data as Blob;
  },

  bulkExportConversations: async (
    conversationIds: string[],
    format: "markdown" | "json" | "pdf" | "zip" = "zip",
    includeCitations = true
  ) => {
    const res = await api.post(
      "/exports/conversations/bulk",
      {
        conversation_ids: conversationIds,
        format,
        include_citations: includeCitations,
      },
      { responseType: "blob" }
    );
    return res.data as Blob;
  },

  downloadDocument: async (documentId: string) => {
    const res = await api.get(`/exports/documents/${documentId}`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  bulkDownloadDocuments: async (documentIds: string[]) => {
    const res = await api.post(
      "/exports/documents/bulk",
      { document_ids: documentIds },
      { responseType: "blob" }
    );
    return res.data as Blob;
  },

  exportKnowledge: async (
    spaceId?: string,
    format: "csv" | "json" | "markdown" = "json"
  ) => {
    const res = await api.get("/exports/knowledge", {
      params: { space_id: spaceId || undefined, format },
      responseType: "blob",
    });
    return res.data as Blob;
  },

  exportAnalysisReport: async (
    analysisData: any,
    format: "markdown" | "pdf" | "json" = "markdown",
    title = "Cross-Document Analysis Report"
  ) => {
    const res = await api.post(
      "/exports/analysis",
      { analysis_data: analysisData, format, title },
      { responseType: "blob" }
    );
    return res.data as Blob;
  },

  generateCustomDocument: async (
    title: string,
    content: string,
    format: "pdf" | "markdown" | "json" = "pdf",
    author?: string
  ) => {
    const res = await api.post(
      "/exports/generate",
      { title, content, format, author },
      { responseType: "blob" }
    );
    return res.data as Blob;
  },

  // Cross-Document Analysis
  analyzeDocuments: async (request: {
    document_ids: string[];
    space_id?: string;
    focus_areas?: string[];
    user_query?: string;
  }) => {
    const res = await api.post("/analysis/analyze", request);
    return res.data;
  },

  compareDocuments: async (docIdA: string, docIdB: string, aspects?: string[]) => {
    const res = await api.post("/analysis/compare", {
      doc_id_a: docIdA,
      doc_id_b: docIdB,
      aspects,
    });
    return res.data;
  },
};

export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
  }, 150);
}

export default api;

