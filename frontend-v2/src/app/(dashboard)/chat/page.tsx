"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  User,
  Bot,
  FileText,
  Boxes,
  Plus,
  History,
  Trash2,
  ChevronDown,
  ArrowUp,
  RefreshCw,
  X,
  FileCode,
  Paperclip,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  timestamp?: string;
}

export default function ChatPage() {
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const selectSpace = useMyndStore((state) => state.selectSpace);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am QueryMind. You can ask me questions grounded in your uploaded documents, synthesize research across your spaces, or request decision proposals.",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedSpaceScope, setSelectedSpaceScope] = useState<string>("all"); // "all" or space.id

  // History & Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // File Attachment State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Load history list when history drawer is opened
  useEffect(() => {
    if (isHistoryOpen) {
      setIsLoadingHistory(true);
      queryMindApi
        .getConversations({
          spaceId: selectedSpaceScope !== "all" ? selectedSpaceScope : undefined,
          limit: 20,
        })
        .then((res: any) => {
          if (Array.isArray(res)) setHistoryList(res);
          else if (res && Array.isArray(res.items)) setHistoryList(res.items);
        })
        .catch(() => setHistoryList([]))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [isHistoryOpen, selectedSpaceScope]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedFile) || isStreaming) return;

    let userText = input.trim();
    let uploadedDocName = "";

    // Upload attachment first if one was selected
    if (attachedFile) {
      setIsUploadingAttachment(true);
      try {
        const uploadRes = await queryMindApi.uploadDocument(
          attachedFile,
          selectedSpaceScope !== "all" ? selectedSpaceScope : undefined
        );
        uploadedDocName = uploadRes.filename || attachedFile.name;
        if (!userText) {
          userText = `Uploaded document "${uploadedDocName}". Please summarize its key architectural and functional insights.`;
        }
      } catch (err: any) {
        console.error("Attachment upload failed:", err);
      } finally {
        setIsUploadingAttachment(false);
        setAttachedFile(null);
      }
    }

    const currentQuery = userText;
    setInput("");

    // Add user message to UI
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: currentQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    try {
      const spaceToQuery = selectedSpaceScope !== "all" ? selectedSpaceScope : undefined;
      const res = await queryMindApi.chatWithOrchestrator(currentQuery, spaceToQuery);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.response || "I have analyzed your request.",
        citations: res.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Unable to complete reasoning request: ${err.message || "Connection error"}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeSpaceObj = spaces.find((s) => s.id === selectedSpaceScope);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-app)", overflow: "hidden" }}>
      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Top Control Bar */}
        <div
          style={{
            padding: "14px 28px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--surface-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          {/* Left: Space Scope Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Boxes size={16} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Context Scope:</span>
              <select
                value={selectedSpaceScope}
                onChange={(e) => setSelectedSpaceScope(e.target.value)}
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "5px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">Global (All Spaces)</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: History & Clear Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    id: `welcome-${Date.now()}`,
                    role: "assistant",
                    content: "Session cleared. What would you like to reason about?",
                    timestamp: "Just now",
                  },
                ])
              }
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--text-tertiary)",
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              className="hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            >
              <Plus size={13} />
              <span>New Session</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                color: isHistoryOpen ? "var(--accent)" : "var(--text-secondary)",
                background: isHistoryOpen ? "var(--accent-soft)" : "transparent",
                border: `1px solid ${isHistoryOpen ? "var(--accent)" : "var(--border-subtle)"}`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              className="hover:border-[var(--border-strong)]"
            >
              <History size={14} />
              <span>Past Sessions</span>
            </button>
          </div>
        </div>

        {/* ── Message Thread ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: "14px",
                  maxWidth: "840px",
                  width: "100%",
                  margin: "0 auto",
                  alignSelf: "center",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: isUser ? "#4f46e5" : "var(--surface-secondary)",
                    color: isUser ? "#FFFFFF" : "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Content Box */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {isUser ? "You" : "QueryMind"}
                    </span>
                    {m.timestamp && (
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        {m.timestamp}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "1.65",
                      color: "var(--text-primary)",
                    }}
                    className="prose-chat"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>

                  {/* Citations Pill List */}
                  {m.citations && m.citations.length > 0 && (
                    <div
                      style={{
                        marginTop: "14px",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Evidence:
                      </span>
                      {m.citations.map((cite, i) => (
                        <div
                          key={i}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            background: "var(--surface-secondary)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <FileCode size={12} style={{ color: "var(--accent)" }} />
                          <span>{cite}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isStreaming && (
            <div
              style={{
                display: "flex",
                gap: "14px",
                maxWidth: "840px",
                width: "100%",
                margin: "0 auto",
                alignSelf: "center",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--surface-secondary)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <RefreshCw size={15} className="animate-spin" />
              </div>
              <div style={{ padding: "8px 0", color: "var(--text-tertiary)", fontSize: "13px" }}>
                Synthesizing grounded evidence & reasoning...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Chat Input Deck ── */}
        <div
          style={{
            padding: "16px 28px 24px 28px",
            background: "var(--surface-primary)",
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <div style={{ maxWidth: "840px", margin: "0 auto" }}>
            {/* Attachment preview chip if selected */}
            {attachedFile && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-strong)",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  marginBottom: "10px",
                }}
              >
                <FileText size={14} style={{ color: "var(--accent)" }} />
                <span>{attachedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: "2px" }}
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <form
              onSubmit={handleSendMessage}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "10px",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-strong)",
                borderRadius: "14px",
                padding: "8px 12px",
                boxShadow: "0 4px 18px rgba(0, 0, 0, 0.25)",
              }}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setAttachedFile(e.target.files[0]);
                  }
                }}
              />

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "none",
                  color: attachedFile ? "var(--accent)" : "var(--text-tertiary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="hover:text-[var(--text-primary)]"
                title="Attach file for reasoning"
              >
                <Paperclip size={18} />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedSpaceScope === "all"
                    ? "Ask across all spaces and knowledge..."
                    : `Ask with context from ${activeSpaceObj?.name || "Space"}...`
                }
                disabled={isStreaming}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  resize: "none",
                  maxHeight: "140px",
                  lineHeight: "1.5",
                  padding: "6px 4px",
                  fontFamily: "inherit",
                }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isStreaming || (!input.trim() && !attachedFile)}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: isStreaming || (!input.trim() && !attachedFile) ? "var(--surface-primary)" : "#4f46e5",
                  border: "none",
                  color: isStreaming || (!input.trim() && !attachedFile) ? "var(--text-tertiary)" : "#FFFFFF",
                  cursor: isStreaming || (!input.trim() && !attachedFile) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {isStreaming || isUploadingAttachment ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <ArrowUp size={16} />
                )}
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "8px", padding: "0 6px" }}>
              <span>Enter to send • Shift + Enter for newline</span>
              <span>Grounded in Postgres & Qdrant</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide-Out Past Sessions Drawer ── */}
      {isHistoryOpen && (
        <div
          style={{
            width: "320px",
            borderLeft: "1px solid var(--border-subtle)",
            background: "var(--surface-primary)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <History size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                Past Sessions
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
            {isLoadingHistory ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
                Loading past sessions...
              </div>
            ) : historyList.length === 0 ? (
              <div style={{ padding: "24px 12px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
                No past sessions recorded yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {historyList.map((conv) => (
                  <div
                    key={conv.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    className="hover:border-[var(--border-strong)]"
                  >
                    <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.title || "Conversation Session"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                      {new Date(conv.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
