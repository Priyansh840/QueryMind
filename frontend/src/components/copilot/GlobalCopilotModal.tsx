"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  ArrowUp,
  Brain,
  FileText,
  Compass,
  Maximize2,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { getAuthToken } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";

interface CopilotActionProposal {
  id?: string;
  proposal_id: string;
  action_type: string;
  parameters: Record<string, any>;
  reason: string;
  confidence?: string;
  status: "pending" | "executed" | "rejected";
  execution_message?: string;
}

interface CopilotMessage {
  id: string | number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  citations?: Array<{ title?: string; document_title?: string; page_number?: number }>;
  actionProposals?: CopilotActionProposal[];
  isError?: boolean;
}

export default function GlobalCopilotModal() {
  const router = useRouter();
  const pathname = usePathname();
  const isCopilotOpen = useMyndStore((state) => state.isAskAiOpen);
  const closeCopilot = useMyndStore((state) => state.closeAskAi);
  const activeGoal = useMyndStore((state) => state.activeGoal);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derive human-friendly current view context
  const currentViewLabel = React.useMemo(() => {
    if (pathname === "/goals") {
      return activeGoal ? `Goal: ${activeGoal.description.slice(0, 32)}...` : "Goals & Strategic Objectives";
    }
    if (pathname === "/vault") return "Knowledge Vault";
    if (pathname === "/workspace") return "Workspace All Spaces";
    if (pathname.startsWith("/chat")) return "Deep Reasoning Session";
    if (pathname === "/activity") return "Intelligence & Activity";
    if (pathname === "/dashboard" || pathname === "/") return "Executive Overview";
    return "QueryMind Workspace";
  }, [pathname, activeGoal]);

  // Contextual prompt chips based on current page
  const contextualChips = React.useMemo(() => {
    if (pathname === "/goals") {
      return [
        "What are my highest leverage tasks?",
        "Break down this goal into actionable milestones",
        "Which goals have overlapping dependencies?",
      ];
    }
    if (pathname === "/vault") {
      return [
        "Summarize all indexed documents",
        "What key decisions are documented here?",
        "Find knowledge gaps across my vault",
      ];
    }
    return [
      "What should I focus on right now?",
      "Give me an executive summary of my workspace",
      "List all active goals and upcoming blockers",
    ];
  }, [pathname]);

  // Initialize or greet
  useEffect(() => {
    if (isCopilotOpen) {
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            role: "ai",
            content: `👋 **Omni-AI Copilot Active.** I am connected to your entire workspace—all goals, active spaces, and documents.\n\n*Currently viewing: **${currentViewLabel}**.* How can I assist you?`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isCopilotOpen, currentViewLabel]);

  // Auto-scroll
  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isStreaming]);

  // Handle direct message send
  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt !== undefined ? overridePrompt : input;
    if (!textToSend.trim() || isStreaming) return;

    const userMsgId = `usr-${Date.now()}`;
    const aiTempId = `ai-${Date.now() + 1}`;
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: textToSend, timestamp: currentTime },
      { id: aiTempId, role: "ai", content: "", timestamp: currentTime },
    ]);

    setInput("");
    setIsStreaming(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let token = getAuthToken();
      if (!token) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token || null;
        } catch {
          // offline dev
        }
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

      // 1. Get or create active conversation in current space
      let targetConvId = "omni-copilot";
      try {
        const queryParam = activeSpaceId ? `?space_id=${encodeURIComponent(activeSpaceId)}` : "";
        const convsRes = await fetch(`${rawApiUrl}/api/v1/conversations${queryParam}`, { headers });
        if (convsRes.ok) {
          const convList = await convsRes.json();
          if (Array.isArray(convList) && convList.length > 0) {
            targetConvId = convList[0].id;
          } else if (activeSpaceId) {
            // Create a conversation scoped to this active space
            const createRes = await fetch(`${rawApiUrl}/api/v1/conversations`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                space_id: activeSpaceId,
                title: "Omni Copilot Session",
              }),
            });
            if (createRes.ok) {
              const newConv = await createRes.json();
              if (newConv?.id) targetConvId = newConv.id;
            }
          }
        }
      } catch (err) {
        console.warn("Could not resolve space conversation for copilot", err);
      }

      // 2. Stream from orchestrator
      const res = await fetch(`${rawApiUrl}/api/v1/conversations/${targetConvId}/messages`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          role: "user",
          content: textToSend,
          metadata_json: {
            source: "global_copilot",
            route: pathname,
            view_label: currentViewLabel,
          },
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.event === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiTempId ? { ...m, content: m.content + data.data.text } : m
                )
              );
            } else if (data.event === "citation") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiTempId
                    ? { ...m, citations: [...(m.citations || []), data.data] }
                    : m
                )
              );
            } else if (data.event === "action.proposed") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== aiTempId) return m;
                  const currentProps = m.actionProposals || [];
                  const incoming = data.data;
                  const exists = currentProps.some((p) => p.proposal_id === incoming.proposal_id);
                  const updated = exists
                    ? currentProps.map((p) => (p.proposal_id === incoming.proposal_id ? { ...p, ...incoming } : p))
                    : [...currentProps, incoming];
                  return { ...m, actionProposals: updated };
                })
              );
            } else if (data.event === "action.executed") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== aiTempId) return m;
                  const currentProps = m.actionProposals || [];
                  const incoming = data.data;
                  const exists = currentProps.some((p) => p.proposal_id === incoming.proposal_id);
                  const updated = exists
                    ? currentProps.map((p) => (p.proposal_id === incoming.proposal_id ? { ...p, ...incoming, status: "executed" } : p))
                    : [...currentProps, { ...incoming, status: "executed" }];
                  return { ...m, actionProposals: updated };
                })
              );
              // Refresh workspace backend data and notify goals screen
              useMyndStore.getState().syncWithBackend().catch(() => {});
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("mynd:goals-refresh"));
              }
            } else if (data.event === "message.completed") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiTempId
                    ? {
                        ...m,
                        content: data.data.content || m.content,
                        actionProposals: data.data.action_proposals || m.actionProposals,
                      }
                    : m
                )
              );
            }
          } catch {
            // Ignore parse errors on partial streams
          }
        }
      }

      // Fallback message if streaming finished but empty
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiTempId && !m.content
            ? { ...m, content: "Processed your request across the workspace." }
            : m
        )
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiTempId
              ? {
                  ...m,
                  content: `⚠️ Failed to connect to AI reasoning engine (${err.message}). Is Ollama or backend running?`,
                  isError: true,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  if (!isCopilotOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCopilot();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          height: "640px",
          maxHeight: "90vh",
          background: "#0c0d10",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.3))",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c084fc",
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
                  QueryMind Omni-Copilot
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(168, 85, 247, 0.15)",
                    color: "#d8b4fe",
                    border: "1px solid rgba(168, 85, 247, 0.25)",
                  }}
                >
                  Universal Awareness
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)", display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                <Compass size={11} />
                <span>Viewing: <strong style={{ color: "rgba(255, 255, 255, 0.8)" }}>{currentViewLabel}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => {
                closeCopilot();
                router.push("/chat");
              }}
              title="Open Fullscreen Reasoning Canvas"
              style={{
                padding: "6px 10px",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "6px",
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Maximize2 size={12} />
              <span>Full Canvas</span>
            </button>
            <button
              onClick={closeCopilot}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.4)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Context Bar */}
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(255, 255, 255, 0.015)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
          }}
        >
          <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", whiteSpace: "nowrap" }}>
            Quick Prompts:
          </span>
          {contextualChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              style={{
                padding: "4px 10px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "11px",
                cursor: isStreaming ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Message Stream Area */}
        <div
          ref={chatScrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: "4px",
              }}
            >
              <div
                style={{
                  maxWidth: "88%",
                  padding: msg.role === "user" ? "10px 14px" : "12px 16px",
                  borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  background: msg.role === "user" ? "#FFFFFF" : "rgba(255, 255, 255, 0.035)",
                  color: msg.role === "user" ? "#000000" : "#e2e8f0",
                  border: msg.role === "user" ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                }}
              >
                {msg.role === "user" ? (
                  <div style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{msg.content}</div>
                ) : (
                  <div>
                    {msg.content ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a855f7" }}>
                        <Brain size={14} className="animate-spin" />
                        <span style={{ fontSize: "12px" }}>Reasoning across workspace...</span>
                      </div>
                    )}

                    {/* Action Proposals Cards */}
                    {msg.actionProposals && msg.actionProposals.length > 0 && (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {msg.actionProposals.map((prop, pIdx) => {
                          const isDone = prop.status === "executed";
                          return (
                            <div
                              key={pIdx}
                              style={{
                                padding: "10px 12px",
                                borderRadius: "8px",
                                background: isDone ? "rgba(34, 197, 94, 0.08)" : "rgba(168, 85, 247, 0.08)",
                                border: isDone ? "1px solid rgba(34, 197, 94, 0.25)" : "1px solid rgba(168, 85, 247, 0.25)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Sparkles size={12} style={{ color: isDone ? "#4ade80" : "#c084fc" }} />
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: isDone ? "#4ade80" : "#d8b4fe" }}>
                                    {prop.action_type.replace(/_/g, " ").toUpperCase()}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: isDone ? "rgba(34, 197, 94, 0.2)" : "rgba(234, 179, 8, 0.15)",
                                    color: isDone ? "#4ade80" : "#facc15",
                                    fontWeight: 600,
                                  }}
                                >
                                  {isDone ? "EXECUTED" : "PROPOSED"}
                                </span>
                              </div>
                              <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", margin: 0 }}>
                                {prop.reason || prop.parameters?.description || prop.parameters?.title || "Action proposed"}
                              </p>
                              {Array.isArray(prop.parameters?.tasks) && prop.parameters.tasks.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", paddingLeft: "4px" }}>
                                  <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
                                    Included Subtasks ({prop.parameters.tasks.length}):
                                  </span>
                                  {prop.parameters.tasks.map((task: any, tIdx: number) => (
                                    <div key={tIdx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "rgba(255, 255, 255, 0.75)" }}>
                                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#a855f7" }} />
                                      <span>{task.title || task}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Citations pill */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {msg.citations.map((c, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "10px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "rgba(59, 130, 246, 0.12)",
                              border: "1px solid rgba(59, 130, 246, 0.2)",
                              color: "#60a5fa",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FileText size={10} />
                            <span>{c.document_title || c.title || "Document"}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.3)", padding: "0 4px" }}>
                {msg.timestamp}
              </span>
            </div>
          ))}
        </div>

        {/* Input Dock */}
        <div
          style={{
            padding: "14px 18px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.015)",
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "6px 8px 6px 14px",
              transition: "border-color 0.15s ease",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask anything about this ${currentViewLabel.toLowerCase()} or your workspace...`}
              disabled={isStreaming}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#FFFFFF",
                fontSize: "13px",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: input.trim() && !isStreaming ? "#FFFFFF" : "rgba(255, 255, 255, 0.08)",
                color: input.trim() && !isStreaming ? "#000000" : "rgba(255, 255, 255, 0.3)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed",
                transition: "all 0.15s ease",
              }}
            >
              <ArrowUp size={16} />
            </button>
          </form>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px", color: "rgba(255, 255, 255, 0.35)" }}>
            <span>Press <kbd style={{ padding: "1px 4px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.08)" }}>Esc</kbd> to dismiss</span>
            <span>Powered by Local Ollama & LangGraph Multi-Agent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
