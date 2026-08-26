import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface StreamCallbacks {
  onToken?: (text: string) => void;
  onAgentStatus?: (agent: string, status: string) => void;
  onStepStarted?: (data: any) => void;
  onStepCompleted?: (data: any) => void;
  onCitation?: (citation: any) => void;
  onMessageCreated?: (data: any) => void;
  onMessageCompleted?: (data: any) => void;
  onError?: (error: any) => void;
}

export async function streamMessageSSE(
  conversationId: string,
  content: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const url = `${API_BASE_URL}/api/v1/conversations/${conversationId}/messages`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      role: "user",
      content,
    }),
    signal,
  });

  if (!response.ok) {
    let errorDetail = "Failed to initiate stream";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  if (!response.body) {
    throw new Error("ReadableStream not supported by environment");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        try {
          const jsonStr = trimmed.replace(/^data:\s*/, "");
          const parsed = JSON.parse(jsonStr);
          const eventType = parsed.event;
          const data = parsed.data;

          switch (eventType) {
            case "token":
              callbacks.onToken?.(data.text || "");
              break;
            case "agent.status":
              callbacks.onAgentStatus?.(data.agent, data.status);
              break;
            case "workflow.step.started":
              callbacks.onStepStarted?.(data);
              break;
            case "workflow.step.completed":
              callbacks.onStepCompleted?.(data);
              break;
            case "citation":
              callbacks.onCitation?.(data);
              break;
            case "message.created":
              callbacks.onMessageCreated?.(data);
              break;
            case "message.completed":
              callbacks.onMessageCompleted?.(data);
              break;
            case "error":
              callbacks.onError?.(data.detail || data);
              break;
            default:
              break;
          }
        } catch (parseErr) {
          console.warn("Could not parse SSE event chunk:", trimmed, parseErr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
