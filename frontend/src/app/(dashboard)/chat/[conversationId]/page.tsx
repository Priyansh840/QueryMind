"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  User,
  Activity,
  Plus,
  ArrowUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  FileText,
  AlertCircle,
  History,
  Search,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";
import { queryMindApi, TraceEvent, ObjectiveTraceData, getAuthToken } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ─── types ───────────────────────────────────────────────────── */

interface Message {
  id: string | number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  citations?: string[];
  objectiveId?: string;
  decisionInsight?: DecisionAnalysis | null;
  isError?: boolean;
}

interface DecisionEvidence {
  source_type: "workspace" | "document" | "conversation";
  content: string;
  is_fact: boolean;
  source_id?: string;
}

interface Recommendation {
  action: string;
  reason: string;
  evidence: DecisionEvidence[];
  confidence: "high" | "medium" | "low";
}

interface DecisionAnalysis {
  blockers: string[];
  recommendations: Recommendation[];
  uncertainties: string[];
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/* ═══════════════════════════════════════════════════════════════ */

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const searchParams = useSearchParams();
  const router = useRouter();

  const userProfile = useMyndStore((state) => state.userProfile);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);

  const activeSpace = useMemo(() => {
    return spaces.find((s) => s.id === activeSpaceId || s.slug === activeSpaceId) || spaces[0];
  }, [spaces, activeSpaceId]);

  /* ─── state ───────────────────────────────────────────────── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [activeTrace, setActiveTrace] = useState<ObjectiveTraceData | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>("");
  const [decisionInsight, setDecisionInsight] = useState<DecisionAnalysis | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>("Chat Session");
  const [copiedMessageId, setCopiedMessageId] = useState<string | number | null>(null);

  // History Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // File Attachments State
  const [attachments, setAttachments] = useState<{
    file: File;
    name: string;
    size: string;
    status: "uploading" | "ready" | "error";
    documentId?: string;
    errorMessage?: string;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const queryExecutedRef = useRef(false);
  const isSendingRef = useRef(false);

  // Auto-scroll on new messages or streaming tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOrchestrating, workflowSteps]);

  // Auto-resize composer textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Load conversation details and messages
  useEffect(() => {
    if (!conversationId) return;

    queryMindApi.getConversation(conversationId)
      .then((conv) => {
        if (conv?.title) setConversationTitle(conv.title);
      })
      .catch((err) => console.warn("Could not load conversation title", err));

    queryMindApi.getConversationMessages(conversationId)
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped: Message[] = data.map((m: any) => ({
            id: m.id,
            role: m.role === "assistant" ? "ai" : m.role,
            content: m.content,
            citations: m.citations,
            objectiveId: m.metadata_json?.objective_id,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));
          setMessages(mapped);
        }
      })
      .catch((err) => console.error("Failed to load message history", err));
  }, [conversationId]);

  // Handle initial query from ?q=... search param
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !queryExecutedRef.current) {
      queryExecutedRef.current = true;
      router.replace(`/chat/${conversationId}`);
      handleSend(q);
    }
  }, [searchParams, conversationId, router]);

  // Load history drawer conversations
  const loadConversations = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await queryMindApi.getConversations(activeSpaceId || undefined);
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (err) {
      console.warn("Could not fetch conversations:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [activeSpaceId]);

  const filteredConversations = useMemo(() => {
    if (!searchHistory.trim()) return conversations;
    const q = searchHistory.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, searchHistory]);

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await queryMindApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === conversationId) {
        router.push("/chat");
      }
    } catch (err: any) {
      alert(`Could not delete conversation: ${err.message || err}`);
    }
  };

  /* ─── file upload handling ────────────────────────────────── */
  const handleAttachFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((f) => ({
      file: f,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
      status: "uploading" as const,
    }));

    setAttachments((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const data = await queryMindApi.uploadDocument(item.file, activeSpaceId);
        setAttachments((prev) =>
          prev.map((a) =>
            a.file === item.file
              ? { ...a, status: "ready", documentId: data.document_id }
              : a
          )
        );
        useMyndStore.getState().addDocument({
          name: data.filename || item.name,
          type: item.name.split(".").pop() || "txt",
          size: item.size,
          chunks: data.chunks_created || 1,
          vectorsStored: data.vectors_stored || 1,
          summary: `Document uploaded in conversation. Indexed into space.`,
        });
      } catch (err: any) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.file === item.file
              ? { ...a, status: "error", errorMessage: err.message || "Upload failed" }
              : a
          )
        );
      }
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const copyToClipboard = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  /* ─── send message & SSE stream ───────────────────────────── */
  const handleSend = async (queryText?: string) => {
    let textToSend = queryText !== undefined ? queryText : input;
    if ((!textToSend.trim() && attachments.length === 0) || isSendingRef.current) return;
    isSendingRef.current = true;

    if (!textToSend.trim() && attachments.length > 0) {
      textToSend = `Please analyze and summarize the attached document "${attachments[0].name}" and highlight key takeaways.`;
    } else if (attachments.length > 0) {
      const docNames = attachments.map((a) => `"${a.name}"`).join(", ");
      textToSend = `${textToSend}\n\n[Referenced Attached Document(s): ${docNames}]`;
    }

    setAttachments([]);

    const tempUserId = Date.now();
    const tempAiId = tempUserId + 1;

    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        role: "user",
        content: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: tempAiId,
        role: "ai",
        content: "",
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    ]);

    setInput("");
    setIsOrchestrating(true);
    setWorkflowSteps([]);
    setAgentStatus("Initializing reasoning engine...");
    setDecisionInsight(null);

    try {
      let token = getAuthToken();
      if (!token) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token || null;
        } catch {
          // offline / dev fallback
        }
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const personalization = useMyndStore.getState().personalization;
      const response = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          role: "user",
          content: textToSend,
          metadata_json: {
            personalization,
          },
        }),
      });

      if (!response.ok) {
        let errDetail = `Server error (${response.status})`;
        try {
          const errJson = await response.json();
          errDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
        } catch {
          const errText = await response.text();
          if (errText) errDetail = errText;
        }
        throw new Error(errDetail);
      }

      if (!response.body) throw new Error("No response body received from server");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      let buffer = "";

      const handleSseLine = (line: string) => {
        if (!line.startsWith("data: ")) return;
        try {
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) return;
          const data = JSON.parse(jsonStr);

          if (data.event === "workflow.started") {
            if (data.data?.objective_id) {
              setMessages((prev) => prev.map(msg =>
                msg.id === tempAiId ? { ...msg, objectiveId: data.data.objective_id } : msg
              ));
            }
          } else if (data.event === "workflow.step.started") {
            setWorkflowSteps((prev) => {
              const exists = prev.find(s => s.step === data.data.step && s.iteration === data.data.iteration);
              if (exists) return prev;
              return [...prev, { ...data.data, status: "running" }];
            });
          } else if (data.event === "workflow.step.completed") {
            setWorkflowSteps((prev) => prev.map(s =>
              (s.step === data.data.step && (s.iteration === data.data.iteration || !data.data.iteration))
                ? { ...s, status: "completed", ...data.data }
                : s
            ));

            if (data.data.step === "decision_analyzer" && data.data.output) {
              try {
                const output = data.data.output;
                if (Array.isArray(output.recommendations) && Array.isArray(output.blockers) && Array.isArray(output.uncertainties)) {
                  const validRecs = output.recommendations.filter((r: any) =>
                    ["high", "medium", "low"].includes(r.confidence) && Array.isArray(r.evidence)
                  ).map((r: any) => ({
                    ...r,
                    evidence: r.evidence.filter((e: any) => ["workspace", "document", "conversation"].includes(e.source_type))
                  }));
                  const insight = { ...output, recommendations: validRecs };
                  setDecisionInsight(insight);
                  setMessages((prev) => prev.map(msg =>
                    msg.id === tempAiId ? { ...msg, decisionInsight: insight } : msg
                  ));
                }
              } catch (err) {
                console.error("Invalid decision insight payload", err);
              }
            }
          } else if (data.event === "agent.status") {
            setAgentStatus(data.data.status);
          } else if (data.event === "token") {
            setMessages((prev) => prev.map(msg =>
              msg.id === tempAiId ? { ...msg, content: (msg.content || "") + data.data.text } : msg
            ));
          } else if (data.event === "citation") {
            setMessages((prev) => prev.map(msg =>
              msg.id === tempAiId
                ? {
                  ...msg,
                  citations: [...(msg.citations || []), `${data.data.document_title || "Document"} (p. ${data.data.page_number || 1})`]
                }
                : msg
            ));
          } else if (data.event === "message.completed") {
            setMessages((prev) => prev.map(msg =>
              msg.id === tempAiId ? {
                ...msg,
                id: data.data.message_id || msg.id,
                content: data.data.content || msg.content
              } : msg
            ));
          } else if (data.event === "error") {
            throw new Error(data.data.detail);
          }
        } catch (err) {
          console.error("SSE parse error", err, line);
        }
      };

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            handleSseLine(line);
          }
        }
      }

      if (buffer.trim()) {
        handleSseLine(buffer.trim());
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const hasTemp = prev.some((m) => m.id === tempAiId);
        if (hasTemp) {
          return prev.map((m) =>
            m.id === tempAiId
              ? {
                ...m,
                content: `⚠️ Error: ${err.message || "Failed to complete reasoning request"}.`,
                isError: true,
              }
              : m
          );
        }
        return [
          ...prev,
          {
            id: Date.now() + 1,
            role: "ai",
            content: `⚠️ Error: ${err.message || "Failed to complete reasoning request"}.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isError: true,
          },
        ];
      });
    } finally {
      isSendingRef.current = false;
      setIsOrchestrating(false);
    }
  };

  const openTraceModal = (msg: Message) => {
    if (!msg.objectiveId) return;
    setActiveTrace({
      objective_id: msg.objectiveId,
      raw_input: msg.content,
      status: "completed",
      created_at: msg.timestamp,
      trace: [],
    });
    setIsTraceModalOpen(true);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        position: "relative",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      {/* ─── Top Sub-Header Bar ───────────────────────────────── */}
      <header
        style={{
          height: "48px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: "rgba(18, 18, 20, 0.7)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: "12px",
              color: "var(--text-primary)",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            <span>📁</span>
            <span>{activeSpace?.name || "Workspace"}</span>
          </div>

          <span style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>/</span>

          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "340px",
            }}
          >
            {conversationTitle}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => router.push("/chat")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms var(--ease)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Plus style={{ width: "13px", height: "13px" }} />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              loadConversations();
              setIsHistoryOpen(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms var(--ease)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <History style={{ width: "13px", height: "13px" }} />
            <span>History</span>
          </button>
        </div>
      </header>

      {/* ─── Scrollable Message Thread ────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "840px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {messages.length === 0 && !isOrchestrating && (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                }}
              >
                <Sparkles style={{ width: "20px", height: "20px" }} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                Start a conversation in {activeSpace?.name || "Workspace"}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "420px" }}>
                Ask questions regarding your documents, synthesize cross-file knowledge, or formulate strategic proposals.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                width: "100%",
              }}
            >
              {/* AI Avatar */}
              {msg.role === "ai" && (
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <Sparkles style={{ width: "16px", height: "16px" }} />
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                style={{
                  maxWidth: msg.role === "user" ? "75%" : "100%",
                  flex: msg.role === "ai" ? 1 : undefined,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Bubble Body */}
                <div
                  style={{
                    padding: msg.role === "user" ? "12px 18px" : "16px 20px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "16px",
                    fontSize: "14.5px",
                    lineHeight: "1.65",
                    background: msg.role === "user" ? "var(--surface-hover)" : "var(--surface)",
                    border: `1px solid ${msg.role === "user" ? "var(--border-strong)" : "var(--border)"}`,
                    color: msg.isError ? "#EF4444" : "var(--text-primary)",
                    boxShadow: "var(--shadow-xs)",
                    position: "relative",
                  }}
                >
                  {msg.role === "user" ? (
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                  ) : (
                    <div>
                      {msg.content ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-tertiary)", fontSize: "13px" }}>
                          <RefreshCw className="animate-spin" style={{ width: "14px", height: "14px" }} />
                          <span>Synthesizing response...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grounded Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <FileText style={{ width: "12px", height: "12px" }} />
                        <span>Evidence Sources</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {msg.citations.map((c, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "var(--r-full)",
                              fontSize: "11.5px",
                              fontWeight: 500,
                              background: "var(--surface-subtle)",
                              border: "1px solid var(--border)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <span>📄</span>
                            <span>{c}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision Insight Card */}
                  {msg.role === "ai" && msg.decisionInsight && (
                    <div
                      style={{
                        marginTop: "16px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-strong)",
                        borderRadius: "14px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          borderBottom: "1px solid var(--border)",
                          paddingBottom: "10px",
                        }}
                      >
                        <Lightbulb style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          Decision Recommendations
                        </span>
                      </div>

                      {msg.decisionInsight.recommendations.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {msg.decisionInsight.recommendations.map((rec, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: "12px",
                                borderRadius: "10px",
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                  {idx + 1}. {rec.action}
                                </div>
                                <div
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    background:
                                      rec.confidence === "high"
                                        ? "rgba(16, 185, 129, 0.15)"
                                        : rec.confidence === "medium"
                                          ? "rgba(245, 158, 11, 0.15)"
                                          : "rgba(239, 68, 68, 0.15)",
                                    color:
                                      rec.confidence === "high"
                                        ? "#10B981"
                                        : rec.confidence === "medium"
                                          ? "#F59E0B"
                                          : "#EF4444",
                                    border: `1px solid ${
                                      rec.confidence === "high"
                                        ? "rgba(16, 185, 129, 0.3)"
                                        : rec.confidence === "medium"
                                          ? "rgba(245, 158, 11, 0.3)"
                                          : "rgba(239, 68, 68, 0.3)"
                                    }`,
                                    flexShrink: 0,
                                  }}
                                >
                                  {rec.confidence.toUpperCase()} CONFIDENCE
                                </div>
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Why: </span>
                                {rec.reason}
                              </div>

                              {rec.evidence && rec.evidence.length > 0 && (
                                <div style={{ marginTop: "4px", paddingLeft: "10px", borderLeft: "2px solid var(--border)" }}>
                                  <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Evidence Grounding</div>
                                  {rec.evidence.map((ev, eIdx) => (
                                    <div key={eIdx} style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                      • {ev.content}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Blockers */}
                      {msg.decisionInsight.blockers.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                            <ShieldAlert style={{ width: "12px", height: "12px" }} />
                            <span>Identified Blockers</span>
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            {msg.decisionInsight.blockers.map((b, idx) => (
                              <li key={idx}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Uncertainties */}
                      {msg.decisionInsight.uncertainties.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Uncertainties</div>
                          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            {msg.decisionInsight.uncertainties.map((u, idx) => (
                              <li key={idx}>{u}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assistant Footer Toolbar */}
                  {msg.role === "ai" && msg.content && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "12px",
                        paddingTop: "8px",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 8px",
                            borderRadius: "var(--r-sm)",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            color: "var(--text-tertiary)",
                            fontSize: "11px",
                            cursor: "pointer",
                            transition: "all 120ms var(--ease)",
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check style={{ width: "12px", height: "12px", color: "#10B981" }} />
                              <span style={{ color: "#10B981" }}>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy style={{ width: "12px", height: "12px" }} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {msg.objectiveId && (
                          <button
                            type="button"
                            onClick={() => openTraceModal(msg)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "3px 8px",
                              borderRadius: "var(--r-sm)",
                              background: "transparent",
                              border: "1px solid var(--border)",
                              color: "var(--text-tertiary)",
                              fontSize: "11px",
                              cursor: "pointer",
                              transition: "all 120ms var(--ease)",
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
                          >
                            <Activity style={{ width: "12px", height: "12px" }} />
                            <span>View Trace</span>
                          </button>
                        )}
                      </div>

                      <span style={{ fontSize: "11px", color: "var(--text-ghost)" }}>
                        {msg.timestamp}
                      </span>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div style={{ textAlign: "right", fontSize: "11px", color: "var(--text-ghost)", paddingRight: "4px" }}>
                    {msg.timestamp}
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === "user" && (
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  <User style={{ width: "15px", height: "15px" }} />
                </div>
              )}
            </div>
          ))}

          {/* Live Multi-Agent Workflow Stepper */}
          {isOrchestrating && (
            <div
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <Sparkles style={{ width: "16px", height: "16px" }} />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "16px 20px",
                  borderRadius: "16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#10B981",
                      boxShadow: "0 0 8px #10B981",
                      display: "inline-block",
                    }}
                  />
                  <span>Reasoning In Progress</span>
                  {agentStatus && (
                    <span style={{ color: "var(--text-secondary)", textTransform: "none", fontWeight: 400 }}>
                      — {agentStatus}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {workflowSteps.map((step, idx) => {
                    const isDone = step.status === "completed";
                    const isActive = step.status === "running";

                    let label = "Processing...";
                    if (step.step === "context_gatherer") label = "Gathering workspace knowledge & grounding";
                    if (step.step === "planner") label = "Analyzing query & formulation";
                    if (step.step === "researcher") label = "Researching workspace documents & evidence";
                    if (step.step === "synthesizer") label = "Synthesizing answer & citations";
                    if (step.step === "decision_analyzer") label = "Formulating grounded recommendations";

                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                          {isDone ? (
                            <CheckCircle2 style={{ width: "14px", height: "14px", color: "#10B981", flexShrink: 0 }} />
                          ) : isActive ? (
                            <RefreshCw className="animate-spin" style={{ width: "14px", height: "14px", color: "var(--accent)", flexShrink: 0 }} />
                          ) : (
                            <Clock style={{ width: "14px", height: "14px", color: "var(--text-ghost)", flexShrink: 0 }} />
                          )}
                          <span
                            style={{
                              color: isDone ? "var(--text-primary)" : isActive ? "var(--accent)" : "var(--text-secondary)",
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            {idx + 1}. {label}
                          </span>
                        </div>

                        {step.step === "researcher" && step.tasks && (
                          <div style={{ marginLeft: "22px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {step.tasks.map((t: any) => (
                              <div key={t.id} style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                ↳ {t.query}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ─── Bottom Fixed Composer Bar ────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          background: "rgba(14, 15, 20, 0.8)",
          backdropFilter: "blur(14px)",
          padding: "14px 20px 16px",
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "840px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Composer Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "18px",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Attachment preview pills */}
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: att.status === "error" ? "rgba(239, 68, 68, 0.12)" : "var(--surface-subtle)",
                      border: `1px solid ${att.status === "error" ? "rgba(239, 68, 68, 0.3)" : "var(--border)"}`,
                      fontSize: "11.5px",
                      color: "var(--text-primary)",
                    }}
                  >
                    <FileText style={{ width: "13px", height: "13px", color: "var(--accent)" }} />
                    <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {att.name}
                    </span>
                    {att.status === "uploading" && (
                      <RefreshCw className="animate-spin" style={{ width: "11px", height: "11px", color: "var(--accent)" }} />
                    )}
                    {att.status === "ready" && (
                      <CheckCircle2 style={{ width: "12px", height: "12px", color: "#10B981" }} />
                    )}
                    {att.status === "error" && (
                      <span title={att.errorMessage || "Upload error"}>
                        <AlertCircle style={{ width: "12px", height: "12px", color: "#EF4444" }} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "2px",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      <X style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              placeholder="Ask a follow-up or query workspace documents... (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isOrchestrating}
              rows={1}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                outline: "none",
                resize: "none",
                fontSize: "14.5px",
                lineHeight: "1.5",
                color: "var(--text-primary)",
                fontFamily: "var(--sans)",
                minHeight: "26px",
                maxHeight: "140px",
                opacity: isOrchestrating ? 0.6 : 1,
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "6px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    handleAttachFiles(e.target.files);
                    e.target.value = "";
                  }}
                  multiple
                />
                <button
                  type="button"
                  title="Attach workspace file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isOrchestrating}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 10px",
                    borderRadius: "var(--r-md)",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontSize: "11.5px",
                    fontWeight: 500,
                    cursor: isOrchestrating ? "not-allowed" : "pointer",
                  }}
                >
                  <Plus style={{ width: "13px", height: "13px" }} />
                  <span>Attach File</span>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Grounded in {activeSpace?.name || "Workspace"}
                </span>

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachments.length === 0) || isOrchestrating}
                  title="Send message (Enter)"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      (input.trim() || attachments.length > 0) && !isOrchestrating
                        ? "var(--accent)"
                        : "var(--surface-subtle)",
                    color:
                      (input.trim() || attachments.length > 0) && !isOrchestrating
                        ? "var(--accent-contrast, #000)"
                        : "var(--text-ghost)",
                    border: "1px solid var(--border)",
                    cursor:
                      (input.trim() || attachments.length > 0) && !isOrchestrating
                        ? "pointer"
                        : "not-allowed",
                    transition: "all 150ms var(--ease)",
                  }}
                >
                  {isOrchestrating ? (
                    <RefreshCw className="animate-spin" style={{ width: "14px", height: "14px" }} />
                  ) : (
                    <ArrowUp style={{ width: "15px", height: "15px", strokeWidth: 2.5 }} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: "10.5px", color: "var(--text-ghost)" }}>
            QueryMind grounds reasoning in your workspace evidence. Verify critical details.
          </div>
        </div>
      </div>

      {/* ─── Slide-over History Drawer ────────────────────────── */}
      {isHistoryOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            style={{
              width: "340px",
              maxWidth: "85vw",
              height: "100%",
              background: "#0E0F14",
              borderLeft: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <History style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Recent Conversations
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                }}
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "var(--r-md)",
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border)",
                }}
              >
                <Search style={{ width: "14px", height: "14px", color: "var(--text-ghost)" }} />
                <input
                  type="text"
                  placeholder="Search past conversations..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {/* Conversation List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
              {isLoadingHistory ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12px" }}>
                  Loading sessions...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12px" }}>
                  {searchHistory ? "No matching conversations found." : "No saved conversations yet."}
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isCurrent = c.id === conversationId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setIsHistoryOpen(false);
                        if (!isCurrent) router.push(`/chat/${c.id}`);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "var(--r-md)",
                        cursor: "pointer",
                        fontSize: "13px",
                        background: isCurrent ? "var(--surface-hover)" : "transparent",
                        border: isCurrent ? "1px solid var(--border-strong)" : "1px solid transparent",
                        color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
                        transition: "all 120ms var(--ease)",
                        marginBottom: "4px",
                      }}
                      onMouseOver={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = "var(--surface-hover)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1, paddingRight: "8px" }}>
                        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.title || "Untitled Session"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-ghost)" }}>
                          {formatRelativeTime(c.created_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        title="Delete conversation"
                        onClick={(e) => handleDeleteConversation(e, c.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "6px",
                          cursor: "pointer",
                          color: "var(--text-ghost)",
                          borderRadius: "var(--r-sm)",
                          display: "flex",
                          alignItems: "center",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = "#EF4444")}
                        onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-ghost)")}
                      >
                        <Trash2 style={{ width: "13px", height: "13px" }} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Reasoning Trace Modal ────────────────────────────── */}
      {isTraceModalOpen && activeTrace && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px",
          }}
          onClick={() => setIsTraceModalOpen(false)}
        >
          <div
            style={{
              background: "#0E0F14",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "620px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Multi-Agent Reasoning Trace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTraceModalOpen(false)}
                style={{
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                }}
              >
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  fontSize: "12px",
                  fontFamily: "var(--mono)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "var(--text-tertiary)" }}>Objective ID:</span>
                <span style={{ color: "var(--accent)" }}>{activeTrace.objective_id}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeTrace.trace && activeTrace.trace.length > 0 ? (
                  activeTrace.trace.map((evt, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--r-md)",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                        <span style={{ fontWeight: 600, color: "var(--accent)" }}>{evt.agent || "Orchestrator"}</span>
                        <span style={{ color: "var(--text-ghost)" }}>{evt.timestamp || ""}</span>
                      </div>
                      <div style={{ color: "var(--text-secondary)" }}>{evt.message}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
                    Trace telemetry recorded in PostgreSQL audit logs.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
