import axios from "axios";
import { supabase } from "./supabase";

const API_BASE = "/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

// Request interceptor — attach Supabase auth JWT token if session exists
api.interceptors.request.use(
  async (config) => {
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

// Response interceptor — handle unauthorized responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/sync")) {
      if (typeof window !== "undefined") {
        // Redirect to login if unauthenticated on protected routes
      }
    }
    return Promise.reject(error);
  }
);

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
  project_id?: string;
  description: string;
  status: string;
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
  getGoals: async (projectId?: string): Promise<GoalData[]> => {
    const res = await api.get<GoalData[]>(`/goals${projectId ? `?project_id=${projectId}` : ""}`);
    return res.data;
  },
  getGoal: async (goalId: string): Promise<GoalData> => {
    const res = await api.get<GoalData>(`/goals/${goalId}`);
    return res.data;
  },
  createGoal: async (data: { description: string; project_id?: string }): Promise<GoalData> => {
    const res = await api.post<GoalData>("/goals", data);
    return res.data;
  },
  updateGoal: async (goalId: string, data: { description?: string; status?: string }): Promise<GoalData> => {
    const res = await api.patch<GoalData>(`/goals/${goalId}`, data);
    return res.data;
  },
  deleteGoal: async (goalId: string): Promise<{ status: string; message: string }> => {
    const res = await api.delete<{ status: string; message: string }>(`/goals/${goalId}`);
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
  createMemory: async (data: { memory_type: string; content: string; importance?: string }): Promise<MemoryData> => {
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

  // Conversations & SSE Streaming
  createConversation: async (spaceId: string, title?: string) => {
    const res = await api.post("/conversations", { space_id: spaceId, title });
    return res.data;
  },
  
  getConversations: async (spaceId: string) => {
    const res = await api.get(`/conversations?space_id=${spaceId}`);
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
  uploadDocument: async (file: File, spaceId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("space_id", spaceId);

    const res = await api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  listDocuments: async (spaceId: string) => {
    try {
      const res = await api.get(`/documents/?space_id=${spaceId}`);
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
};

export default api;
