"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  User,
  Activity,
  Code2,
  BookOpen,
  PenLine,
  FolderOpen,
  Zap,
  Plus,
  ArrowUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";
import { queryMindApi, TraceEvent, ObjectiveTraceData } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";

/* ─── helpers ─────────────────────────────────────────────────── */

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return { emoji: "🌙", text: `Up late, ${name}?` };
  if (hour >= 5 && hour < 12) return { emoji: "☀️", text: `Good morning, ${name}` };
  if (hour >= 12 && hour < 17) return { emoji: "🌤️", text: `Good afternoon, ${name}` };
  if (hour >= 17 && hour < 21) return { emoji: "🌇", text: `Good evening, ${name}` };
  return { emoji: "🌙", text: `Up late, ${name}?` };
}

/* ─── types ───────────────────────────────────────────────────── */

interface Message {
  id: number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  citations?: string[];
  objectiveId?: string;
  traceEvents?: TraceEvent[];
  isError?: boolean;
}

/* ─── quick chips ─────────────────────────────────────────────── */

const quickChips = [
  { icon: Code2, label: "Code", prompt: "Help me analyze the codebase architecture from my uploaded documents." },
  { icon: BookOpen, label: "Learn", prompt: "Summarize key concepts and learnings from my knowledge vault." },
  { icon: PenLine, label: "Write", prompt: "Draft a professional summary based on my uploaded resume and projects." },
  { icon: FolderOpen, label: "Life stuff", prompt: "Organize and prioritize my pending tasks and goals from my documents." },
  { icon: Zap, label: "QueryMind's choice", prompt: "Analyze all my uploaded documents and give me the most interesting insight you can find." },
];

/* ═══════════════════════════════════════════════════════════════ */

export default function ChatPage() {
  const userProfile = useMyndStore((state) => state.userProfile);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  const greeting = useMemo(() => getGreeting(userProfile.name), [userProfile.name]);

  /* ─── state ───────────────────────────────────────────────── */
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [activeStep, setActiveStep] = useState<"idle" | "objective" | "researcher" | "synthesizer">("idle");
  const [activeTrace, setActiveTrace] = useState<ObjectiveTraceData | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOrchestrating]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  /* ─── send ────────────────────────────────────────────────── */
  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isOrchestrating) return;

    if (!hasStartedChat) setHasStartedChat(true);

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsOrchestrating(true);
    setActiveStep("objective");

    try {
      await new Promise((r) => setTimeout(r, 300));
      setActiveStep("researcher");

      const chatData = await queryMindApi.chatWithOrchestrator(
        textToSend,
        activeSpaceId || "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000001"
      );

      setActiveStep("synthesizer");
      await new Promise((r) => setTimeout(r, 200));

      let traceData: ObjectiveTraceData | null = null;
      if (chatData.objective_id) {
        try {
          traceData = await queryMindApi.getObjectiveTrace(chatData.objective_id);
        } catch { /* optional */ }
      }

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        content: chatData.response || "Knowledge synthesized successfully.",
        citations: chatData.citations || [],
        objectiveId: chatData.objective_id,
        traceEvents: traceData?.trace || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      try {
        const ragData = await queryMindApi.askRag(textToSend);
        const aiMsg: Message = {
          id: Date.now() + 1,
          role: "ai",
          content: ragData.answer || "Synthesized response.",
          citations: (ragData.citations || []).map(
            (c: { document_title?: string; page_number?: number }) =>
              `${c.document_title || "Document"} (p. ${c.page_number || 1})`
          ),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Connection error";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "ai",
            content: `⚠️ Error: ${errorMsg}. Please ensure the backend is running on port 8000.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isError: true,
          },
        ]);
      }
    } finally {
      setIsOrchestrating(false);
      setActiveStep("idle");
    }
  };

  const openTraceModal = (msg: Message) => {
    if (!msg.objectiveId && (!msg.traceEvents || msg.traceEvents.length === 0)) return;
    setActiveTrace({
      objective_id: msg.objectiveId || "local",
      raw_input: msg.content,
      status: "completed",
      created_at: msg.timestamp,
      trace: msg.traceEvents || [],
    });
    setIsTraceModalOpen(true);
  };

  /* ═══════════════════════════════════════════════════════════ */
  /*  LANDING — Claude-inspired hero                            */
  /* ═══════════════════════════════════════════════════════════ */
  if (!hasStartedChat) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          maxWidth: "880px",
          margin: "0 auto",
          padding: "24px",
          overflow: "hidden",
        }}
        className="stagger"
      >
        {/* Greeting */}
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          <span style={{ marginRight: "8px" }}>{greeting.emoji}</span>
          {greeting.text}
        </h1>

        {/* Central Input */}
        <div
          style={{
            width: "100%",
            background: "var(--surface-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <textarea
            ref={textareaRef}
            placeholder="How can I help you today?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              outline: "none",
              resize: "none",
              fontSize: "15px",
              lineHeight: "1.5",
              color: "var(--text-primary)",
              fontFamily: "var(--sans)",
              minHeight: "26px",
              maxHeight: "160px",
            }}
          />

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              title="Attach file"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--r-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-tertiary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Plus style={{ width: "18px", height: "18px" }} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "var(--r-full)",
                  fontSize: "12px",
                  color: "var(--text-tertiary)",
                  background: "var(--surface-hover)",
                  fontWeight: 500,
                }}
              >
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>LangGraph</span>
                <span style={{ opacity: 0.5 }}>Multi-Agent</span>
              </div>

              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "var(--r-full)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: input.trim() ? "var(--accent)" : "var(--surface-hover)",
                  color: input.trim() ? "#FFF" : "var(--text-ghost)",
                  border: "none",
                  cursor: input.trim() ? "pointer" : "default",
                  transition: "all 200ms var(--ease)",
                }}
              >
                <ArrowUp style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
            marginTop: "20px",
            maxWidth: "880px",
          }}
        >
          {quickChips.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.label}
                onClick={() => handleSend(chip.prompt)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "var(--r-full)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "all 200ms var(--ease)",
                  whiteSpace: "nowrap",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-soft)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "var(--surface)";
                }}
              >
                <Icon style={{ width: "14px", height: "14px" }} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  CONVERSATION VIEW                                         */
  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
        width: "100%",
        maxWidth: "880px",
        margin: "0 auto",
        padding: "16px 24px 20px",
        overflow: "hidden",
      }}
    >
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: "12px",
          paddingBottom: "16px",
          paddingRight: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          minHeight: 0,
        }}
      >
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
            {/* AI avatar */}
            {msg.role === "ai" && (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--r-md)",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Sparkles style={{ width: "16px", height: "16px" }} />
              </div>
            )}

            {/* Bubble */}
            <div
              style={{
                maxWidth: msg.role === "user" ? "80%" : "100%",
                flex: msg.role === "ai" ? 1 : undefined,
                minWidth: 0,
                padding: msg.role === "user" ? "14px 20px" : "0",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "0",
                fontSize: "15px",
                lineHeight: "1.68",
                background: msg.role === "user" ? "var(--accent)" : "transparent",
                color:
                  msg.role === "user"
                    ? "#FFFFFF"
                    : msg.isError
                    ? "#DC2626"
                    : "var(--text-primary)",
              }}
            >
              {msg.role === "user" ? (
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "6px",
                    }}
                  >
                    Sources
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {msg.citations.map((c, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 12px",
                          borderRadius: "var(--r-full)",
                          fontSize: "12px",
                          fontWeight: 500,
                          background: "var(--surface-subtle)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        📄 {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trace button */}
              {msg.role === "ai" && msg.objectiveId && (
                <div style={{ marginTop: "12px" }}>
                  <button
                    onClick={() => openTraceModal(msg)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: 500,
                      padding: "4px 12px",
                      borderRadius: "var(--r-full)",
                      background: "var(--surface-subtle)",
                      border: "1px solid var(--border)",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.color = "var(--accent)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-tertiary)";
                    }}
                  >
                    <Activity style={{ width: "12px", height: "12px" }} />
                    View Trace
                  </button>
                </div>
              )}

              <div
                style={{
                  fontSize: "11px",
                  opacity: 0.5,
                  marginTop: "8px",
                  textAlign: msg.role === "user" ? "right" : "left",
                }}
              >
                {msg.timestamp}
              </div>
            </div>

            {/* User avatar */}
            {msg.role === "user" && (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--r-md)",
                  background: "var(--surface-subtle)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid var(--border)",
                  marginTop: "2px",
                }}
              >
                <User style={{ width: "15px", height: "15px" }} />
              </div>
            )}
          </div>
        ))}

        {/* Live stepper */}
        {isOrchestrating && (
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", width: "100%" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--r-md)",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles style={{ width: "16px", height: "16px" }} />
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                padding: "18px 24px",
                borderRadius: "16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                width: "100%",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span className="alive-dot" />
                Multi-Agent Workflow
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { key: "objective", label: "Objective Initialization" },
                  { key: "researcher", label: "Researcher — Vector Search in Qdrant" },
                  { key: "synthesizer", label: "Synthesizer — Multi-Source Response" },
                ].map((step, idx) => {
                  const keys = ["objective", "researcher", "synthesizer"];
                  const curIdx = keys.indexOf(activeStep);
                  const isDone = idx < curIdx;
                  const isActive = step.key === activeStep;
                  return (
                    <div
                      key={step.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        color: isActive ? "var(--accent)" : isDone ? "var(--text-primary)" : "var(--text-ghost)",
                      }}
                    >
                      {isActive ? (
                        <RefreshCw style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
                      ) : isDone ? (
                        <CheckCircle2 style={{ width: "14px", height: "14px", color: "#10B981" }} />
                      ) : (
                        <Clock style={{ width: "14px", height: "14px" }} />
                      )}
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{idx + 1}. {step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        <div ref={messagesEndRef} />
      </div>

      {/* Input bar — generous Claude styling */}
      <div style={{ paddingTop: "12px" }}>
        <div
          style={{
            width: "100%",
            background: "var(--surface-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <textarea
            ref={textareaRef}
            placeholder="Ask a follow-up..."
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
              fontSize: "15px",
              lineHeight: "1.5",
              color: "var(--text-primary)",
              fontFamily: "var(--sans)",
              minHeight: "26px",
              maxHeight: "140px",
              opacity: isOrchestrating ? 0.5 : 1,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              title="Attach file"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--r-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-tertiary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Plus style={{ width: "18px", height: "18px" }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-tertiary)",
                  background: "var(--surface-hover)",
                  padding: "4px 12px",
                  borderRadius: "var(--r-full)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 500,
                }}
              >
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>LangGraph</span>
                <span style={{ opacity: 0.5 }}>Multi-Agent</span>
              </div>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isOrchestrating}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "var(--r-full)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: input.trim() && !isOrchestrating ? "var(--accent)" : "var(--surface-hover)",
                  color: input.trim() && !isOrchestrating ? "#FFF" : "var(--text-ghost)",
                  border: "none",
                  cursor: input.trim() && !isOrchestrating ? "pointer" : "default",
                  transition: "all 200ms var(--ease)",
                }}
              >
                <ArrowUp style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* ─── Trace Modal ────────────────────────────────────── */}
      {isTraceModalOpen && activeTrace && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
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
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "600px",
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
                padding: "18px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Execution Trace
                </h3>
              </div>
              <button
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
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              <div style={{ marginBottom: "14px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                Objective:{" "}
                <code
                  style={{
                    color: "var(--accent)",
                    background: "var(--accent-soft)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {activeTrace.objective_id}
                </code>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeTrace.trace.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    Trace events recorded in PostgreSQL telemetry.
                  </div>
                ) : (
                  activeTrace.trace.map((evt, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--r-md)",
                        background: "var(--surface-subtle)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{evt.message}</span>
                        {evt.tokens_used ? (
                          <span style={{ marginLeft: "8px", color: "var(--text-tertiary)" }}>
                            ({evt.tokens_used} tokens)
                          </span>
                        ) : null}
                      </div>
                      <span style={{ color: "var(--text-ghost)", fontSize: "11px" }}>
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
