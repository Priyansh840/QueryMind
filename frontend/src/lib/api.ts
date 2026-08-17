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

// Request interceptor — attach auth token if present
api.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Running offline/local
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/sync")) {
      if (typeof window !== "undefined") {
        // Only redirect if auth is enforced
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

export const queryMindApi = {
  // LangGraph Multi-Agent Orchestrator
  chatWithOrchestrator: async (
    query: string,
    spaceId: string = "00000000-0000-0000-0000-000000000001",
    userId: string = "00000000-0000-0000-0000-000000000001"
  ): Promise<ChatResponseData> => {
    const res = await api.post<ChatResponseData>("/chat/", {
      query,
      space_id: spaceId,
      user_id: userId,
    });
    return res.data;
  },

  // Execution Trace Telemetry
  getObjectiveTrace: async (objectiveId: string): Promise<ObjectiveTraceData> => {
    const res = await api.get<ObjectiveTraceData>(`/objectives/${objectiveId}/trace`);
    return res.data;
  },

  // Document Management (Postgres + Qdrant)
  uploadDocument: async (
    file: File,
    spaceId: string = "00000000-0000-0000-0000-000000000001",
    userId: string = "00000000-0000-0000-0000-000000000001"
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("space_id", spaceId);
    formData.append("user_id", userId);

    const res = await fetch("/api/v1/documents/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      // Fallback to test ingestion pipeline
      const testData = new FormData();
      testData.append("file", file);
      const testRes = await fetch("/api/v1/test/upload-and-process", {
        method: "POST",
        body: testData,
      });
      if (!testRes.ok) throw new Error(`Upload failed with status ${testRes.status}`);
      return testRes.json();
    }
    return res.json();
  },

  listDocuments: async (spaceId: string = "00000000-0000-0000-0000-000000000001") => {
    try {
      const res = await api.get(`/documents/?space_id=${spaceId}`);
      return res.data;
    } catch {
      return [];
    }
  },

  deleteDocument: async (
    documentId: string,
    userId: string = "00000000-0000-0000-0000-000000000001"
  ) => {
    const res = await api.delete(`/documents/${documentId}?user_id=${userId}`);
    return res.data;
  },

  // Direct RAG Vector Query
  askRag: async (question: string, documentTitle?: string) => {
    const formData = new FormData();
    formData.append("question", question);
    if (documentTitle) {
      formData.append("document_title", documentTitle);
    }
    const res = await fetch("/api/v1/test/ask", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`RAG query failed with status ${res.status}`);
    return res.json();
  },

  // Semantic Vector Search
  searchVectors: async (query: string) => {
    const res = await api.get(`/test/search?query=${encodeURIComponent(query)}`);
    return res.data;
  },
};

export default api;
