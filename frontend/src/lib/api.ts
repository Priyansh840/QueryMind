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

  // LangGraph Multi-Agent Orchestrator
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
