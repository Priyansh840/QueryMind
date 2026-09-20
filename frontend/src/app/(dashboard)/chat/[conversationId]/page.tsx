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
  FileText,
  AlertCircle,
  Paperclip,
} from "lucide-react";
import { queryMindApi, TraceEvent, ObjectiveTraceData, getAuthToken } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

/* ─── quick chips ─────────────────────────────────────────────── */

const quickChips = [
  { icon: Code2, label: "Code", prompt: "Help me analyze the codebase architecture from my uploaded documents." },
  { icon: BookOpen, label: "Learn", prompt: "Summarize key concepts and learnings from my knowledge vault." },
  { icon: PenLine, label: "Write", prompt: "Draft a professional summary based on my uploaded resume and projects." },
  { icon: FolderOpen, label: "Life stuff", prompt: "Organize and prioritize my pending tasks and goals from my documents." },
  { icon: Zap, label: "QueryMind's choice", prompt: "Analyze all my uploaded documents and give me the most interesting insight you can find." },
];

/* ═══════════════════════════════════════════════════════════════ */

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const userProfile = useMyndStore((state) => state.userProfile);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  const greeting = useMemo(() => getGreeting(userProfile.name), [userProfile.name]);

  /* ─── state ───────────────────────────────────────────────── */
  const [hasStartedChat, setHasStartedChat] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [activeTrace, setActiveTrace] = useState<ObjectiveTraceData | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>("");
  const [decisionInsight, setDecisionInsight] = useState<DecisionAnalysis | null>(null);

  // File Attachments State
  const [attachments, setAttachments] = useState<{
    file: File;
    name: string;
    size: string;
    status: "uploading" | "ready" | "error";
    documentId?: string;
    errorMessage?: string;
  }[]>([]);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const queryExecutedRef = useRef(false);
  const isSendingRef = useRef(false);

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

  // Load History
  useEffect(() => {
    if (!conversationId) return;
    queryMindApi.getConversationMessages(conversationId)
      .then((data) => {
        const mapped: Message[] = data.map((m: any) => ({
          id: m.id,
          role: m.role === "assistant" ? "ai" : m.role,
          content: m.content,
          citations: m.citations,
          objectiveId: m.metadata_json?.objective_id,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
        setMessages(mapped);
      })
      .catch((err) => console.error("Failed to load history", err));
  }, [conversationId]);

  // Initial query execution from redirect
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !queryExecutedRef.current) {
      queryExecutedRef.current = true;
      router.replace(`/chat/${conversationId}`);
      handleSend(q);
    }
  }, [searchParams, conversationId, router]);

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

    if (!hasStartedChat) setHasStartedChat(true);

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
    setAgentStatus("Initializing...");
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

      if (!response.body) throw new Error("No response body");

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
            // Handled by step.started
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
                  setDecisionInsight({ ...output, recommendations: validRecs });
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
              msg.id === tempAiId ? { ...msg, citations: [...(msg.citations || []), `${data.data.document_title || 'Document'} (p. ${data.data.page_number || 1})`] } : msg
            ));
          } else if (data.event === "message.completed") {
            setMessages((prev) => prev.map(msg => 
              msg.id === tempAiId ? { ...msg, id: data.data.message_id, content: data.data.content } : msg
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
      console.error(err);
      setMessages((prev) => {
        const hasTemp = prev.some((m) => m.id === tempAiId);
        if (hasTemp) {
          return prev.map((m) =>
            m.id === tempAiId
              ? {
                  ...m,
                  content: `⚠️ Error: ${err.message}.`,
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
            content: `⚠️ Error: ${err.message}.`,
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
      objective_id: msg.objectiveId || "local",
      raw_input: msg.content,
      status: "completed",
      created_at: msg.timestamp,
      trace: [],
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
          {/* File Attachments Pills */}
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "4px" }}>
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    background: att.status === "error" ? "#FEF2F2" : "var(--surface)",
                    border: `1px solid ${att.status === "error" ? "#FECACA" : "var(--border)"}`,
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                >
                  <FileText style={{ width: "14px", height: "14px", color: "var(--accent)" }} />
                  <span style={{ fontWeight: 600, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {att.name}
                  </span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{att.size}</span>
                  {att.status === "uploading" && (
                    <RefreshCw className="animate-spin" style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                  )}
                  {att.status === "ready" && (
                    <CheckCircle2 style={{ width: "12px", height: "12px", color: "#10B981" }} />
                  )}
                  {att.status === "error" && (
                    <AlertCircle style={{ width: "12px", height: "12px", color: "#EF4444" }} />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(idx);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "2px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
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
            <input
              type="file"
              ref={fileInputRef1}
              style={{ display: "none" }}
              onChange={(e) => {
                handleAttachFiles(e.target.files);
                e.target.value = "";
              }}
              multiple
            />
            <button
              type="button"
              title="Attach file"
              onClick={() => fileInputRef1.current?.click()}
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
                type="button"
                onClick={() => handleSend()}
                disabled={(!input.trim() && attachments.length === 0) || isOrchestrating}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "var(--r-full)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: (input.trim() || attachments.length > 0) && !isOrchestrating ? "var(--accent)" : "var(--surface-hover)",
                  color: (input.trim() || attachments.length > 0) && !isOrchestrating ? "#FFF" : "var(--text-ghost)",
                  border: "none",
                  cursor: (input.trim() || attachments.length > 0) && !isOrchestrating ? "pointer" : "default",
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
                {workflowSteps.map((step, idx) => {
                  const isDone = step.status === "completed";
                  const isActive = step.status === "running";
                  
                  let label = "Processing...";
                  if (step.step === "context_gatherer") label = "Gathering workspace context";
                  if (step.step === "planner") label = "Planner — Analyzing query";
                  if (step.step === "researcher") label = `Researcher Iteration ${step.iteration} — Searching knowledge base`;
                  if (step.step === "critic") label = `Critic Iteration ${step.iteration} — Evaluating evidence`;
                  if (step.step === "decision_analyzer") label = "Analyzing evidence";
                  if (step.step === "synthesizer") label = "Synthesizer — Drafting final response";

                  return (
                    <div key={`${step.step}-${step.iteration || idx}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div
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
                        <span style={{ fontSize: "13px", fontWeight: 500 }}>
                          {idx + 1}. {label} {isActive && agentStatus && `- ${agentStatus}`}
                        </span>
                      </div>
                      
                      {/* Show Tasks if running/completed researcher */}
                      {step.step === "researcher" && step.tasks && (
                         <div style={{ marginLeft: "24px", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {step.tasks.map((t: any) => (
                               <div key={t.id} style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", gap: "6px" }}>
                                  <span style={{ opacity: 0.6 }}>↳</span>
                                  <span>{t.query}</span>
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
        
        {/* Decision Insight Card */}
        {decisionInsight && (
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", width: "100%" }}>
            <div style={{ width: "32px", flexShrink: 0 }} />
            <div style={{
              width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "16px", padding: "20px 24px", display: "flex", flexDirection: "column",
              gap: "24px", boxShadow: "var(--shadow-sm)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <Activity style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  Decision Insight
                </span>
              </div>
              
              {/* Recommendations */}
              {decisionInsight.recommendations.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Recommended Next Steps</div>
                  {decisionInsight.recommendations.map((rec, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {idx + 1}. {rec.action}
                        </div>
                        <div style={{ 
                          fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "12px",
                          background: rec.confidence === "high" ? "#D1FAE5" : rec.confidence === "medium" ? "#FEF3C7" : "#FEE2E2",
                          color: rec.confidence === "high" ? "#065F46" : rec.confidence === "medium" ? "#92400E" : "#991B1B"
                        }}>
                          {rec.confidence.charAt(0).toUpperCase() + rec.confidence.slice(1)} Confidence
                        </div>
                      </div>
                      <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600 }}>Why:</span> {rec.reason}
                      </div>
                      
                      {rec.evidence.length > 0 && (
                        <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "12px", borderLeft: "2px solid var(--border)" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Evidence</div>
                          {rec.evidence.map((ev, eIdx) => (
                            <div key={eIdx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "var(--surface-subtle)", color: "var(--text-secondary)" }}>
                                  {ev.source_type.toUpperCase()}
                                </span>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: ev.is_fact ? "#DBEAFE" : "#F3E8FF", color: ev.is_fact ? "#1E40AF" : "#6B21A8" }}>
                                  {ev.is_fact ? "FACT" : "INFERENCE"}
                                </span>
                              </div>
                              <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                "{ev.content}"
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "14px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                  No grounded recommendation can be made from the available evidence.
                </div>
              )}
              
              {/* Blockers */}
              {decisionInsight.blockers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Blockers</div>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {decisionInsight.blockers.map((b, idx) => <li key={idx}>{b}</li>)}
                  </ul>
                </div>
              )}
              
              {/* Uncertainties */}
              {decisionInsight.uncertainties.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Uncertainties</div>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {decisionInsight.uncertainties.map((u, idx) => <li key={idx}>{u}</li>)}
                  </ul>
                </div>
              )}
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
          {/* File Attachments Pills */}
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "4px" }}>
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    background: att.status === "error" ? "#FEF2F2" : "var(--surface)",
                    border: `1px solid ${att.status === "error" ? "#FECACA" : "var(--border)"}`,
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                >
                  <FileText style={{ width: "14px", height: "14px", color: "var(--accent)" }} />
                  <span style={{ fontWeight: 600, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {att.name}
                  </span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{att.size}</span>
                  {att.status === "uploading" && (
                    <RefreshCw className="animate-spin" style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                  )}
                  {att.status === "ready" && (
                    <CheckCircle2 style={{ width: "12px", height: "12px", color: "#10B981" }} />
                  )}
                  {att.status === "error" && (
                    <AlertCircle style={{ width: "12px", height: "12px", color: "#EF4444" }} />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(idx);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "2px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
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
            placeholder="Ask a follow-up or discuss attached files..."
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
            <input
              type="file"
              ref={fileInputRef2}
              style={{ display: "none" }}
              onChange={(e) => {
                handleAttachFiles(e.target.files);
                e.target.value = "";
              }}
              multiple
            />
            <button
              type="button"
              title="Attach file"
              onClick={() => fileInputRef2.current?.click()}
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
                type="button"
                onClick={() => handleSend()}
                disabled={(!input.trim() && attachments.length === 0) || isOrchestrating}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "var(--r-full)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: (input.trim() || attachments.length > 0) && !isOrchestrating ? "var(--accent)" : "var(--surface-hover)",
                  color: (input.trim() || attachments.length > 0) && !isOrchestrating ? "#FFF" : "var(--text-ghost)",
                  border: "none",
                  cursor: (input.trim() || attachments.length > 0) && !isOrchestrating ? "pointer" : "default",
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
