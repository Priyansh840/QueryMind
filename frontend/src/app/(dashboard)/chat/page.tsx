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
  History,
  Search,
  Trash2,
  MessageSquare,
  Compass,
  Mic,
  MicOff,
  Headphones,
  Radio,
} from "lucide-react";
import { queryMindApi } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";
import VoiceChatModal from "@/components/chat/VoiceChatModal";
import { useSpeechToText } from "@/lib/voice";
import { useRouter } from "next/navigation";

/* ─── helpers ─────────────────────────────────────────────────── */

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return { emoji: "🌙", text: `Up late, ${name}?` };
  if (hour >= 5 && hour < 12) return { emoji: "☀️", text: `Good morning, ${name}` };
  if (hour >= 12 && hour < 17) return { emoji: "🌤️", text: `Good afternoon, ${name}` };
  if (hour >= 17 && hour < 21) return { emoji: "🌇", text: `Good evening, ${name}` };
  return { emoji: "🌙", text: `Up late, ${name}?` };
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

/* ─── quick prompt suggestions ───────────────────────────────── */

const quickChips = [
  {
    icon: Code2,
    label: "Architecture Deep Dive",
    description: "Analyze codebase architecture, module boundaries, and dependency patterns.",
    prompt: "Analyze the codebase architecture, module dependencies, and core patterns from my uploaded documents.",
  },
  {
    icon: BookOpen,
    label: "Knowledge Synthesis",
    description: "Synthesize key concepts, architectural decisions, and retained learnings.",
    prompt: "Synthesize key concepts, architectural decisions, and retained learnings across all workspace documents.",
  },
  {
    icon: Compass,
    label: "Decision Proposals",
    description: "Formulate concrete recommendations with citations and trade-offs.",
    prompt: "Examine our current project goals and formulate recommended next actions with grounded evidence.",
  },
  {
    icon: Zap,
    label: "QueryMind Insights",
    description: "Uncover unexpected connections and leverage opportunities across files.",
    prompt: "Analyze all uploaded documents and highlight unexpected patterns or high-leverage opportunities.",
  },
];

/* ═══════════════════════════════════════════════════════════════ */

export default function ChatPage() {
  const router = useRouter();
  const userProfile = useMyndStore((state) => state.userProfile);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);

  const activeSpace = useMemo(() => {
    return spaces.find((s) => s.id === activeSpaceId || s.slug === activeSpaceId) || spaces[0];
  }, [spaces, activeSpaceId]);

  const greeting = useMemo(() => getGreeting(userProfile.name || "there"), [userProfile.name]);

  /* ─── state ───────────────────────────────────────────────── */
  const [input, setInput] = useState("");
  const [isOrchestrating, setIsOrchestrating] = useState(false);

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // ─── Speak to Chat & Voice Mode Integration ───
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  const {
    isListening,
    interimTranscript: speechInterim,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    toggleListening,
    error: speechError,
  } = useSpeechToText({
    onTranscriptChange: (liveText) => {
      setInput(liveText);
    },
  });

  useEffect(() => {
    if (speechError) {
      setVoiceToast(speechError);
      const timer = setTimeout(() => setVoiceToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [speechError]);

  // Ensure activeSpaceId is valid
  useEffect(() => {
    if (!activeSpaceId || !activeSpaceId.includes("-")) {
      queryMindApi.getSpaces().then((sp) => {
        if (sp && sp.length > 0) {
          useMyndStore.getState().setActiveSpaceId(sp[0].id);
        }
      }).catch((err) => {
        console.warn("Failed to load initial space", err);
      });
    }
  }, [activeSpaceId]);

  // Load past conversations for history drawer
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

  /* ─── send message & create session ───────────────────────── */
  const handleSend = async (queryText?: string) => {
    let textToSend = queryText !== undefined ? queryText : input;
    if ((!textToSend.trim() && attachments.length === 0) || isOrchestrating) return;

    if (!textToSend.trim() && attachments.length > 0) {
      textToSend = `Please analyze and summarize the attached document "${attachments[0].name}" and highlight key takeaways.`;
    } else if (attachments.length > 0) {
      const docNames = attachments.map((a) => `"${a.name}"`).join(", ");
      textToSend = `${textToSend}\n\n[Referenced Attached Document(s): ${docNames}]`;
    }

    setAttachments([]);

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let targetSpaceId = activeSpaceId;

    if (!targetSpaceId || !UUID_REGEX.test(targetSpaceId)) {
      // 1. Try resolving from loaded spaces in memory
      const found = spaces.find(
        (s) =>
          s.id === targetSpaceId ||
          s.slug === targetSpaceId ||
          s.name.toLowerCase() === (targetSpaceId || "").toLowerCase()
      );
      if (found && UUID_REGEX.test(found.id)) {
        targetSpaceId = found.id;
        useMyndStore.getState().setActiveSpaceId(targetSpaceId);
      } else {
        // 2. Fallback to querying backend spaces
        try {
          const sp = await queryMindApi.getSpaces();
          if (sp && sp.length > 0) {
            const match =
              sp.find(
                (s: any) =>
                  s.id === targetSpaceId ||
                  s.slug === targetSpaceId ||
                  s.name.toLowerCase() === (targetSpaceId || "").toLowerCase()
              ) || sp[0];
            if (match && UUID_REGEX.test(match.id)) {
              targetSpaceId = match.id;
              useMyndStore.getState().setActiveSpaceId(targetSpaceId);
            }
          }
        } catch (err) {
          console.warn("Failed to resolve space UUID", err);
        }
      }
    }

    if (!targetSpaceId || !UUID_REGEX.test(targetSpaceId)) {
      alert("Please select a valid workspace before starting a conversation.");
      return;
    }

    setIsOrchestrating(true);

    try {
      const conv = await queryMindApi.createConversation(
        targetSpaceId,
        textToSend.substring(0, 48) + (textToSend.length > 48 ? "..." : "")
      );

      // Store initial query in sessionStorage to avoid query-param reload races
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`querymind_initial_msg_${conv.id}`, textToSend);
      }

      // Route directly to conversation page with clean URL
      router.push(`/chat/${conv.id}`);
    } catch (err: any) {
      console.warn("Conversation creation error:", err);
      const rawDetail = err?.response?.data?.detail;
      const errMsg = typeof rawDetail === "string"
        ? rawDetail
        : rawDetail
          ? JSON.stringify(rawDetail)
          : err?.message || "Failed to start session";
      alert(`Could not start conversation session: ${errMsg}`);
      setIsOrchestrating(false);
    }
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
          height: "52px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          background: "var(--bg)",
          zIndex: 10,
          flexShrink: 0,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            }}
          >
            <span style={{ opacity: 0.8 }}>📁</span>
            <span>{activeSpace?.name || "General Workspace"}</span>
            <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
              • {uploadedDocuments.length} docs
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              fontWeight: 500,
            }}
          >
            <Sparkles style={{ width: "13px", height: "13px", color: "var(--accent)" }} />
            <span>Autonomous Reasoning</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
            <span>Recent Chats</span>
            {conversations.length > 0 && (
              <span
                style={{
                  background: "var(--surface-hover)",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontSize: "10px",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                {conversations.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ─── Hero Welcome & Composer Container ────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px 48px",
          position: "relative",
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "360px",
            background: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: "920px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          {/* Greeting Hero - ChatGPT Style */}
          <div style={{ textAlign: "center", marginBottom: "26px" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.025em",
                lineHeight: 1.3,
                marginBottom: "6px",
              }}
            >
              Hey, {userProfile.name || "there"}. Ready to dive in?
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-tertiary)",
                maxWidth: "460px",
                margin: "0 auto",
                lineHeight: 1.5,
              }}
            >
              Ask anything about your workspace documents or explore strategic insights.
            </p>
          </div>

          {/* Central Composer Box - ChatGPT Pill Style */}
          <div
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "26px",
              padding: "14px 18px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.22)",
              transition: "border-color 150ms var(--ease), box-shadow 150ms var(--ease)",
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
                      gap: "8px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: att.status === "error" ? "rgba(239, 68, 68, 0.12)" : "var(--surface-subtle)",
                      border: `1px solid ${att.status === "error" ? "rgba(239, 68, 68, 0.3)" : "var(--border)"}`,
                      fontSize: "12px",
                      color: "var(--text-primary)",
                    }}
                  >
                    <FileText style={{ width: "13px", height: "13px", color: "var(--accent)" }} />
                    <span
                      style={{
                        fontWeight: 500,
                        maxWidth: "180px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {att.name}
                    </span>
                    <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{att.size}</span>
                    {att.status === "uploading" && (
                      <RefreshCw className="animate-spin" style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                    )}
                    {att.status === "ready" && (
                      <CheckCircle2 style={{ width: "13px", height: "13px", color: "#10B981" }} />
                    )}
                    {att.status === "error" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (att.file) handleAttachFiles([att.file] as any);
                        }}
                        title={`Upload failed: ${att.errorMessage || "Click to retry"}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "none",
                          border: "none",
                          color: "#EF4444",
                          cursor: "pointer",
                          fontSize: "11px",
                          padding: 0,
                        }}
                      >
                        <AlertCircle style={{ width: "13px", height: "13px" }} />
                        <span style={{ textDecoration: "underline" }}>Retry</span>
                      </button>
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
                        color: "var(--text-tertiary)",
                      }}
                    >
                      <X style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Live Voice Listening Bar (ChatGPT style) */}
            {isListening && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  marginBottom: "8px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  animation: "fadeIn 150ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "18px" }}>
                    {[10, 18, 26, 14, 20].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          width: "3px",
                          height: `${h}px`,
                          borderRadius: "2px",
                          background: "#10B981",
                          animation: `pulse ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#10B981" }}>
                      Listening... Speak now
                    </span>
                    {speechInterim && (
                      <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        &ldquo;{speechInterim}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => stopListening()}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "14px",
                      background: "rgba(16, 185, 129, 0.2)",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      color: "#10B981",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      handleSend();
                    }}
                    disabled={!input.trim()}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "14px",
                      background: "var(--accent)",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: input.trim() ? "pointer" : "not-allowed",
                      opacity: input.trim() ? 1 : 0.5,
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              placeholder="Ask anything..."
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
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "15px",
                lineHeight: "1.5",
                resize: "none",
                fontFamily: "var(--sans)",
                minHeight: "26px",
                maxHeight: "160px",
              }}
            />

            {/* Bottom Actions Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                  title="Attach workspace files"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
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
                  <Plus style={{ width: "15px", height: "15px" }} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Voice Mode (ChatGPT Full Hands-Free Voice Chat) */}
                <button
                  type="button"
                  title="Voice Mode (Hands-free Voice Chat with AI)"
                  onClick={() => setIsVoiceModalOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <Headphones style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                  <span>Voice</span>
                </button>

                {/* Speak to Chat (Microphone Dictation) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      toggleListening(input);
                    }
                  }}
                  title={isListening ? "Stop listening" : "Speak to Chat (Dictate)"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: isListening
                      ? "rgba(239, 68, 68, 0.2)"
                      : "var(--surface-subtle)",
                    border: isListening
                      ? "1px solid #EF4444"
                      : "1px solid var(--border)",
                    color: isListening ? "#EF4444" : "var(--text-secondary)",
                    cursor: "pointer",
                    boxShadow: isListening ? "0 0 10px rgba(239, 68, 68, 0.4)" : "none",
                    transition: "all 150ms var(--ease)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isListening) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isListening) {
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.borderColor = "var(--border)";
                    }
                  }}
                >
                  {isListening ? (
                    <MicOff style={{ width: "15px", height: "15px" }} />
                  ) : (
                    <Mic style={{ width: "15px", height: "15px" }} />
                  )}
                </button>

                {/* Think / Reasoning chip like ChatGPT */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    fontWeight: 500,
                  }}
                >
                  <Sparkles style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                  <span>Think</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachments.length === 0) || isOrchestrating}
                  title="Send message (Enter)"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      (input.trim() || attachments.length > 0) && !isOrchestrating
                        ? "var(--accent)"
                        : "var(--surface-subtle)",
                    color:
                      (input.trim() || attachments.length > 0) && !isOrchestrating
                        ? "#FFFFFF"
                        : "var(--text-ghost)",
                    border: "none",
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

          {/* Quick Prompt Suggestions - Compact Chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "center",
              marginTop: "20px",
              width: "100%",
            }}
          >
            {quickChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSend(chip.prompt)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 13px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 150ms var(--ease)",
                    boxShadow: "var(--shadow-xs)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--surface-hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "var(--surface)";
                  }}
                >
                  <Icon style={{ width: "13px", height: "13px", color: "var(--accent)" }} />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: "28px",
              fontSize: "11.5px",
              color: "var(--text-ghost)",
              textAlign: "center",
            }}
          >
            QueryMind can make mistakes. Verify important info.
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
                  borderRadius: "var(--r-sm)",
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
                  {searchHistory ? "No matching conversations found." : "No saved conversations yet. Start chatting above!"}
                </div>
              ) : (
                filteredConversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setIsHistoryOpen(false);
                      router.push(`/chat/${c.id}`);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "var(--r-md)",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      transition: "all 120ms var(--ease)",
                      marginBottom: "4px",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "var(--surface-hover)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
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
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* ─── ChatGPT-style Voice Chat Modal ─── */}
      <VoiceChatModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        spaceName="Workspace"
        onSendMessage={async (queryText) => {
          handleSend(queryText);
        }}
        isGenerating={isOrchestrating}
      />

      {/* ─── Voice Notification Toast ─── */}
      {voiceToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 18px",
            borderRadius: "10px",
            background: "rgba(239, 68, 68, 0.95)",
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 200ms ease",
          }}
        >
          <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
          <span>{voiceToast}</span>
          <button
            type="button"
            onClick={() => setVoiceToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
              padding: "2px",
              marginLeft: "6px",
            }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      )}
    </div>
  );
}
