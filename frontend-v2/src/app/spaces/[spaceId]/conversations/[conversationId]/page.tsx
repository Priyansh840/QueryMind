"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import {
  ConversationItem,
  MessageItem,
  ActionProposal,
  Space,
  DocumentItem,
  MemoryItem,
  GoalItem,
} from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { createClient } from "@/lib/supabase/client";
import { getSpaceArchetype } from "@/lib/spaces/spaceArchetypes";
import {
  Plus,
  Search,
  BookOpen,
  ArrowUp,
  Copy,
  Check,
  X,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Brain,
  PanelLeft,
  PanelRight,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Maximize2,
  FileCode,
  Target,
  CheckCircle2,
  Circle,
  Code2,
} from "lucide-react";

interface ConversationPageProps {
  params: Promise<{ spaceId: string; conversationId: string }>;
}

// Lightweight Markdown Formatter with Clean Typography & Code Copy (Claude / ChatGPT Style)
function FormattedContent({
  text,
  onOpenArtifact,
}: {
  text: string;
  onOpenArtifact?: (artifact: { title: string; language?: string; content: string }) => void;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!text) return null;

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-4 text-slate-200 font-sans text-[15px] leading-7">
      {parts.map((part, idx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const firstLine = lines[0].trim();
          const isLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const lang = isLang ? firstLine : "";
          const code = (isLang ? lines.slice(1) : lines).join("\n");

          return (
            <div
              key={idx}
              className="my-5 rounded-2xl bg-[#0b0c13] border border-white/[0.08] overflow-hidden text-xs font-mono shadow-lg"
            >
              <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>{lang || "CODE"}</span>
                <div className="flex items-center gap-2">
                  {onOpenArtifact && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenArtifact({
                          title: `${lang || "code"}_snippet`,
                          language: lang,
                          content: code,
                        })
                      }
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      title="Open in Canvas"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span className="font-sans">Canvas</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(code, idx)}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-sans font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="font-sans">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <pre className="p-4 overflow-x-auto text-slate-200 text-xs leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split("\n");
        return (
          <div key={idx} className="space-y-3">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1" />;

              if (trimmed.startsWith("### ")) {
                return (
                  <h4 key={lineIdx} className="text-base font-semibold text-white mt-5 mb-1.5">
                    {trimmed.replace(/^###\s+/, "")}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3 key={lineIdx} className="text-lg font-semibold text-white mt-6 mb-2">
                    {trimmed.replace(/^##\s+/, "")}
                  </h3>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h2 key={lineIdx} className="text-xl font-bold text-white mt-7 mb-2.5">
                    {trimmed.replace(/^#\s+/, "")}
                  </h2>
                );
              }
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2.5 pl-2 text-[15px] leading-7">
                    <span className="text-slate-400 mt-2 text-[6px] shrink-0">●</span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: trimmed
                          .slice(2)
                          .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
                          .replace(/`([^`]+)`/g, "<code class='px-1.5 py-0.5 rounded-md bg-white/[0.08] text-indigo-300 font-mono text-xs'>$1</code>"),
                      }}
                    />
                  </div>
                );
              }

              return (
                <p
                  key={lineIdx}
                  className="text-slate-200 leading-7 text-[15px]"
                  dangerouslySetInnerHTML={{
                    __html: trimmed
                      .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
                      .replace(/`([^`]+)`/g, "<code class='px-1.5 py-0.5 rounded-md bg-white/[0.08] text-indigo-300 font-mono text-xs'>$1</code>"),
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const conversationId = resolvedParams.conversationId;

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt");

  const { currentSpace, spaces, setCurrentSpace } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);

  // Conversations, Messages, Context
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  // UI States
  const [input, setInput] = useState(initialPrompt || "");
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [thoughtExpanded, setThoughtExpanded] = useState<Record<string, boolean>>({});
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isThreadsOpen, setIsThreadsOpen] = useState(true);
  const [threadSearch, setThreadSearch] = useState("");
  const [activeMode, setActiveMode] = useState<"reason" | "action" | "research">("reason");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);

  // Live Workspace Deck (Claude Artifacts & Canvas Studio)
  const [isDeckOpen, setIsDeckOpen] = useState(true);
  const [deckTab, setDeckTab] = useState<"scope" | "milestones" | "artifacts">("scope");
  const [selectedArtifact, setSelectedArtifact] = useState<{
    title: string;
    language?: string;
    content: string;
  } | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load Session Data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const [spaceRes, convsRes, msgsRes, docsRes, memsRes, goalsRes] = await Promise.all([
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
          apiClient<ConversationItem[]>(`/api/v1/conversations?space_id=${spaceId}`).catch(() => []),
          apiClient<MessageItem[]>(`/api/v1/conversations/${conversationId}/messages`).catch(() => []),
          apiClient<DocumentItem[]>(`/api/v1/documents?space_id=${spaceId}`).catch(() => []),
          apiClient<MemoryItem[]>(`/api/v1/memories?space_id=${spaceId}`).catch(() => []),
          apiClient<GoalItem[]>(`/api/v1/goals?space_id=${spaceId}`).catch(() => []),
        ]);

        if (spaceRes) {
          setSpace(spaceRes);
          setCurrentSpace(spaceRes);
        }
        setConversations(convsRes || []);
        setMessages(msgsRes || []);
        setDocuments(docsRes || []);
        setMemories(memsRes || []);
        setGoals(goalsRes || []);

        if (msgsRes && msgsRes.length > 0) {
          const last = msgsRes[msgsRes.length - 1];
          if (last.role === "assistant") {
            setThoughtExpanded({ [last.id]: false });
          }
        }
      } catch (err) {
        console.error("Failed to load conversation thread:", err);
      }
    };

    loadSessionData();
  }, [spaceId, conversationId]);

  // Handle auto-send initial prompt
  const hasAutoSent = useRef(false);
  useEffect(() => {
    if (initialPrompt && !hasAutoSent.current && messages.length === 0) {
      hasAutoSent.current = true;
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, messages.length]);

  // Handle textarea auto-height
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Create New Thread
  const handleNewSession = async () => {
    try {
      const newConv = await apiClient<ConversationItem>("/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          title: "New Reasoning Session",
        }),
      });
      setConversations((prev) => [newConv, ...prev]);
      router.push(`/spaces/${spaceId}/conversations/${newConv.id}`);
    } catch (err) {
      console.error("Failed to create new conversation:", err);
    }
  };

  // Delete Thread
  const handleDeleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Delete this thread?")) return;

    try {
      await apiClient(`/api/v1/conversations/${id}`, { method: "DELETE" });
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);

      if (id === conversationId) {
        if (remaining.length > 0) {
          router.push(`/spaces/${spaceId}/conversations/${remaining[0].id}`);
        } else {
          handleNewSession();
        }
      }
    } catch (err) {
      console.error("Failed to delete thread:", err);
    }
  };

  // Send Message with Streaming
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isStreaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    const userMsg: MessageItem = {
      id: userMsgId,
      conversation_id: conversationId,
      role: "user",
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    const initialAssistantMsg: MessageItem = {
      id: assistantMsgId,
      conversation_id: conversationId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      metadata_json: {},
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsStreaming(true);
    setAgentStatus("Thinking...");
    setThoughtExpanded((prev) => ({ ...prev, [assistantMsgId]: true }));

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ content: textToSend }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                const event = parsed.event;
                const data = parsed.data;

                if (event === "token") {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: msg.content + (data.text || "") }
                        : msg
                    )
                  );
                } else if (event === "agent.status") {
                  setAgentStatus(data.status || "Thinking...");
                } else if (event === "action_proposals" || event === "proposals") {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? {
                            ...msg,
                            metadata_json: {
                              ...msg.metadata_json,
                              action_proposals: data.proposals || [data],
                            },
                          }
                        : msg
                    )
                  );
                } else if (event === "citations") {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, citations: data.citations }
                        : msg
                    )
                  );
                }
              } catch {
                // Ignore chunk parse errors
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: msg.content || "Autonomous agent encountered a streaming connection reset.",
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setAgentStatus(null);
    }
  };

  // 1-Click Action Approval
  const handleApproveProposal = async (proposal: ActionProposal, messageId: string) => {
    const propId = proposal.proposal_id || proposal.id;
    if (!propId || executingProposalId) return;

    setExecutingProposalId(propId);
    try {
      const result = await apiClient<{ success: boolean; target_id?: string; message?: string }>(
        `/api/v1/actions/${propId}/approve`,
        { method: "POST" }
      );

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const proposals = msg.metadata_json?.action_proposals || [];
          const updated = proposals.map((p: ActionProposal) =>
            (p.proposal_id || p.id) === propId
              ? { ...p, status: "executed" as const, executed_target_id: result.target_id }
              : p
          );
          return {
            ...msg,
            metadata_json: { ...msg.metadata_json, action_proposals: updated },
          };
        })
      );
    } catch (err: any) {
      console.error("Failed to approve proposal:", err);
      alert(err.message || "Failed to execute action proposal.");
    } finally {
      setExecutingProposalId(null);
    }
  };

  // Reject Proposal
  const handleRejectProposal = async (proposal: ActionProposal, messageId: string) => {
    const propId = proposal.proposal_id || proposal.id;
    if (!propId || executingProposalId) return;

    setExecutingProposalId(propId);
    try {
      await apiClient(`/api/v1/actions/${propId}/reject`, { method: "POST" });
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const proposals = msg.metadata_json?.action_proposals || [];
          const updated = proposals.map((p: ActionProposal) =>
            (p.proposal_id || p.id) === propId
              ? { ...p, status: "rejected" as const }
              : p
          );
          return {
            ...msg,
            metadata_json: { ...msg.metadata_json, action_proposals: updated },
          };
        })
      );
    } catch (err) {
      console.error("Failed to reject proposal:", err);
    } finally {
      setExecutingProposalId(null);
    }
  };

  // Copy Message
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const currentArchetype = getSpaceArchetype(space);
  const currentConv = conversations.find((c) => c.id === conversationId);

  const filteredConversations = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(threadSearch.toLowerCase())
  );

  return (
    <div className="h-screen w-screen bg-[#07070a] text-[#f8fafc] flex overflow-hidden select-none font-sans">
      {/* 1. Primary Workspace Sidebar (Collapsible Icon Rail or Full Sidebar) */}
      <CommandSidebar
        spaceId={spaceId}
        space={space}
        spaces={spaces}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 2. Collapsible Threads Panel */}
      {isThreadsOpen && (
        <aside className="w-60 shrink-0 border-r border-white/[0.07] bg-[#090a10] flex flex-col justify-between p-3 z-10 animate-in slide-in-from-left duration-150">
          <div className="space-y-2.5 min-w-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-300">Threads</span>
              <button
                type="button"
                onClick={handleNewSession}
                className="p-1 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="New Thread"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder="Search threads..."
                className="w-full bg-white/[0.03] text-[11px] text-white placeholder-slate-500 pl-7 pr-2.5 py-1 rounded-lg border border-white/[0.06] focus:border-white/20 focus:outline-none transition-colors"
              />
            </div>

            {/* Thread list */}
            <div className="space-y-0.5 overflow-y-auto max-h-[calc(100vh-210px)] pr-0.5">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === conversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => router.push(`/spaces/${spaceId}/conversations/${conv.id}`)}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer truncate ${
                      isActive
                        ? "bg-white/[0.08] text-white font-medium"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="truncate text-xs">{conv.title || "Reasoning Thread"}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteThread(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all rounded cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setIsContextDrawerOpen(true)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <span>Grounded Files</span>
              <span className="font-mono text-white">{documents.length}</span>
            </button>
          </div>
        </aside>
      )}

      {/* 3. Main Agent Chat Cockpit (Claude / ChatGPT Benchmark) */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#07070a]">
        {/* Sleek Top Header */}
        <header className="h-14 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#07070a]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 min-w-0">
            {/* Sidebar Collapse Toggle */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Expand workspace sidebar" : "Collapse workspace sidebar"}
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Threads Toggle */}
            <button
              type="button"
              onClick={() => setIsThreadsOpen(!isThreadsOpen)}
              className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                isThreadsOpen
                  ? "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  : "text-slate-500 hover:text-white hover:bg-white/[0.04]"
              }`}
              title="Toggle thread history"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-white/[0.08] mx-1" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                {space?.name || "Workspace"}
              </span>
              <span className="text-slate-600 text-xs">/</span>
              <span className="text-xs text-slate-400 truncate max-w-[200px]">
                {currentConv?.title || "New Thread"}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Workspace Deck Toggle */}
            <button
              type="button"
              onClick={() => setIsDeckOpen(!isDeckOpen)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 border ${
                isDeckOpen
                  ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-medium"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.06]"
              }`}
              title="Toggle Workspace Deck"
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span>Workspace Deck</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 ml-0.5">
                {documents.length}
              </span>
            </button>
            <button
              type="button"
              onClick={handleNewSession}
              className="px-3 py-1 rounded-lg bg-white text-[#09090b] hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-sm flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>
        </header>

        {/* Message Stream (Calibrated Reading Width) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 w-full space-y-6">
          <div className="max-w-3xl xl:max-w-4xl mx-auto w-full space-y-6">
            {messages.length === 0 ? (
              /* Empty State / Welcome Screen */
              <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-16 animate-in fade-in duration-300 w-full">
                <div className="space-y-3 max-w-lg">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20">
                    <div className="w-full h-full bg-[#090a10] rounded-[14px] flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold text-white tracking-tight">
                    What are we building today?
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Grounded in <strong className="text-white font-medium">{space?.name || "workspace"}</strong> with {documents.length} indexed files and autonomous execution capabilities.
                  </p>
                </div>

                {/* Sample Starters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {currentArchetype.samplePrompts.slice(0, 4).map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(promptText)}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.16] hover:bg-white/[0.05] text-left transition-all text-xs text-slate-300 hover:text-white flex flex-col justify-between group cursor-pointer shadow-xs"
                    >
                      <span className="font-medium text-slate-200 group-hover:text-white leading-relaxed text-[13px]">
                        {promptText}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-indigo-300 mt-2 flex items-center gap-1">
                        <span>Ask MYND</span>
                        <span>→</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const proposals: ActionProposal[] = msg.metadata_json?.action_proposals || [];
                const citations = msg.citations || [];
                const isLatestAssistant = !isUser && index === messages.length - 1 && isStreaming;

                return isUser ? (
                  /* User Prompt (Clean Soft Pill Bubble) */
                  <div key={msg.id} className="flex justify-end my-4">
                    <div className="bg-[#1f202b] text-slate-100 px-5 py-3 rounded-2xl rounded-tr-md max-w-xl text-[15px] leading-relaxed border border-white/[0.07] shadow-sm">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  /* Assistant Response (Clean Open Prose Canvas) */
                  <div key={msg.id} className="flex flex-col space-y-3.5 my-6 group w-full">
                    {/* Identity Row with Glowing AI Brand Mark */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-cyan-400 p-[1px] shadow-sm shadow-indigo-500/20 flex items-center justify-center shrink-0">
                        <div className="w-full h-full bg-[#090a10] rounded-[11px] flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white tracking-tight">MYND</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                          Reasoning
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Reasoning Accordion (Claude 3.7 Style) */}
                    {(isLatestAssistant || msg.content.length > 50) && (
                      <div className="text-xs pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setThoughtExpanded((prev) => ({
                              ...prev,
                              [msg.id]: !prev[msg.id],
                            }))
                          }
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-slate-400 hover:text-slate-200 transition-all cursor-pointer text-[11px] font-mono"
                        >
                          <Brain className={`w-3.5 h-3.5 text-indigo-400 ${isLatestAssistant ? "animate-pulse" : ""}`} />
                          <span>
                            {isLatestAssistant
                              ? agentStatus || "Thinking..."
                              : "Thought process"}
                          </span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${thoughtExpanded[msg.id] ? "rotate-180" : ""}`} />
                        </button>

                        {thoughtExpanded[msg.id] && (
                          <div className="mt-2 pl-3.5 border-l-2 border-indigo-500/30 text-xs text-slate-400 space-y-1.5 leading-relaxed italic bg-white/[0.01] py-2 pr-3 rounded-r-lg max-w-4xl">
                            <p>1. Analyzed active workspace files and domain milestones.</p>
                            <p>2. Verified invariants and constraints for {space?.name || "workspace"}.</p>
                            <p>3. Formulated factual synthesis with structured execution proposals.</p>
                            {citations.length > 0 && (
                              <p className="text-indigo-300 not-italic font-mono text-[11px] pt-0.5">
                                Grounded in {citations.length} evidence sources.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prose Body with Artifact Canvas Link */}
                    <div className="text-[15px] text-slate-100 leading-7 space-y-3 font-sans w-full">
                      {msg.content ? (
                        <FormattedContent
                          text={msg.content}
                          onOpenArtifact={(art) => {
                            setSelectedArtifact(art);
                            setDeckTab("artifacts");
                            setIsDeckOpen(true);
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 py-1 text-sm">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          <span>Formulating response...</span>
                        </div>
                      )}

                      {/* Sources */}
                      {citations.length > 0 && (
                        <div className="pt-2 flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="text-slate-500 text-[11px] font-mono uppercase font-bold">Sources:</span>
                          {citations.map((c, i) => {
                            const title = typeof c === "string" ? c : c.document_title || "Evidence";
                            return (
                              <span
                                key={i}
                                className="px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.07] text-[11px] flex items-center gap-1"
                              >
                                <BookOpen className="w-2.5 h-2.5 text-indigo-400" />
                                <span>{title}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Interactive Action Proposals */}
                    {proposals.length > 0 && (
                      <div className="space-y-3 w-full pt-2">
                        {proposals.map((prop) => {
                          const propId = prop.proposal_id || prop.id;
                          const isExecuting = executingProposalId === propId;
                          const isExecuted = prop.status === "executed";
                          const isRejected = prop.status === "rejected";
                          const title =
                            prop.parameters?.name ||
                            prop.parameters?.description ||
                            prop.reason ||
                            `${prop.action_type.replace(/_/g, " ")} Proposal`;

                          return (
                            <div
                              key={propId}
                              className={`rounded-2xl border p-4 space-y-2.5 text-xs ${
                                isExecuted
                                  ? "bg-emerald-950/20 border-emerald-500/30"
                                  : isRejected
                                  ? "bg-rose-950/20 border-rose-500/20 opacity-60"
                                  : "bg-white/[0.03] border-indigo-500/30"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="uppercase font-semibold text-indigo-300">
                                  Action Proposal: {prop.action_type.replace(/_/g, " ")}
                                </span>
                                <span className="text-emerald-400">
                                  {prop.confidence || "High Confidence"}
                                </span>
                              </div>

                              <div className="text-sm font-medium text-white">{title}</div>
                              {prop.reason && <p className="text-xs text-slate-300">{prop.reason}</p>}

                              <div className="pt-2 flex items-center justify-between">
                                {isExecuted ? (
                                  <span className="text-emerald-400 font-medium">Executed into Workspace</span>
                                ) : isRejected ? (
                                  <span className="text-rose-400">Proposal Rejected</span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={isExecuting}
                                      onClick={() => handleRejectProposal(prop, msg.id)}
                                      className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isExecuting}
                                      onClick={() => handleApproveProposal(prop, msg.id)}
                                      className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      {isExecuting ? "Executing..." : "Approve & Execute"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Hover Actions Toolbar */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 pt-1.5 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Copy response"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage(messages[index - 1]?.content || "")}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Retry"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Good response"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Bad response"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Studio Input Composer */}
        <div className="px-6 pb-6 bg-gradient-to-t from-[#07070a] via-[#07070a]/95 to-transparent w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-3xl xl:max-w-4xl mx-auto w-full"
          >
            <div className="relative rounded-2xl sm:rounded-3xl bg-[#141520]/95 backdrop-blur-xl border border-white/[0.1] focus-within:border-white/25 focus-within:ring-1 focus-within:ring-white/20 transition-all p-3.5 px-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] w-full">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={`Message MYND in ${space?.name || "workspace"}...`}
                disabled={isStreaming}
                className="w-full bg-transparent text-[15px] text-slate-100 placeholder:text-slate-500 py-1.5 px-1 focus:outline-none resize-none leading-relaxed max-h-48"
              />

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] mt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeckTab("scope");
                      setIsDeckOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs text-slate-300 hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3 text-indigo-400" />
                    <span>{documents.length} Grounded Files</span>
                  </button>

                  <div className="hidden sm:flex items-center bg-white/[0.03] border border-white/[0.06] rounded-full p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveMode("reason")}
                      className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                        activeMode === "reason" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Reasoning
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMode("action")}
                      className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                        activeMode === "action" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Action
                    </button>
                  </div>
                </div>

                {/* Circular Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all ${
                    input.trim() && !isStreaming
                      ? "bg-white text-black hover:bg-slate-200 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                      : "bg-white/[0.08] text-slate-500 cursor-not-allowed"
                  }`}
                  title="Send message (Enter)"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Subtle Disclaimer */}
            <p className="text-[11px] text-slate-500 text-center mt-2.5">
              MYND can make mistakes. Verify important workspace facts and code.
            </p>
          </form>
        </div>
      </main>

      {/* 4. Live Workspace Deck (Claude Artifacts & Canvas Style Studio Pane) */}
      {isDeckOpen && (
        <aside className="w-80 lg:w-96 shrink-0 border-l border-white/[0.08] bg-[#090a12] flex flex-col justify-between z-10 animate-in slide-in-from-right duration-150 select-none">
          {/* Deck Header & Tabs */}
          <div className="p-3.5 border-b border-white/[0.07] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white tracking-tight">Workspace Deck</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDeckOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Collapse Deck"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-3 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.06] text-xs">
              <button
                type="button"
                onClick={() => setDeckTab("scope")}
                className={`py-1 rounded-md transition-all cursor-pointer font-medium text-[11px] flex items-center justify-center gap-1 ${
                  deckTab === "scope" ? "bg-white/10 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Scope ({documents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDeckTab("milestones")}
                className={`py-1 rounded-md transition-all cursor-pointer font-medium text-[11px] flex items-center justify-center gap-1 ${
                  deckTab === "milestones" ? "bg-white/10 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <Target className="w-3 h-3" />
                <span>Goals ({goals.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDeckTab("artifacts")}
                className={`py-1 rounded-md transition-all cursor-pointer font-medium text-[11px] flex items-center justify-center gap-1 ${
                  deckTab === "artifacts" ? "bg-white/10 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Canvas</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
            {deckTab === "scope" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>Grounded Documents ({documents.length})</span>
                    <Link
                      href={`/spaces/${spaceId}/knowledge`}
                      className="text-indigo-400 hover:text-indigo-300 font-normal"
                    >
                      Manage
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {documents.length === 0 ? (
                      <p className="text-slate-500 text-[11px] italic py-2">No documents indexed in this space yet.</p>
                    ) : (
                      documents.map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                          className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.14] hover:bg-white/[0.04] transition-colors flex items-center justify-between group block"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="text-xs text-slate-200 group-hover:text-white truncate">
                              {doc.title}
                            </span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-white shrink-0 ml-1.5" />
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Invariant Principles ({memories.length})
                  </div>
                  <div className="space-y-1.5">
                    {memories.length === 0 ? (
                      <p className="text-slate-500 text-[11px] italic py-1">No invariant principles locked.</p>
                    ) : (
                      memories.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1"
                        >
                          <div className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                            {m.memory_type}
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {m.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {deckTab === "milestones" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Sprint Goals ({goals.length})</span>
                  <Link
                    href={`/spaces/${spaceId}/goals`}
                    className="text-indigo-400 hover:text-indigo-300 font-normal"
                  >
                    View All
                  </Link>
                </div>
                <div className="space-y-2">
                  {goals.length === 0 ? (
                    <p className="text-slate-500 text-[11px] italic py-2">No active goals found in space.</p>
                  ) : (
                    goals.map((g) => (
                      <div
                        key={g.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-indigo-400">
                            {g.status === "completed" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-200 font-medium leading-snug">
                              {g.description}
                            </p>
                            {g.created_at && (
                              <span className="text-[10px] font-mono text-slate-500 block mt-1">
                                Added {new Date(g.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <Link
                    href={`/spaces/${spaceId}/tasks`}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <span>Autonomous Workflows</span>
                    <span className="text-indigo-400 font-mono">Open →</span>
                  </Link>
                </div>
              </div>
            )}

            {deckTab === "artifacts" && (
              <div className="space-y-3 h-full flex flex-col">
                {selectedArtifact ? (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2 truncate">
                        <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-mono text-xs text-white truncate font-medium">
                          {selectedArtifact.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedArtifact.content);
                          alert("Artifact copied to clipboard!");
                        }}
                        className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="flex-1 rounded-xl bg-[#0b0c13] border border-white/[0.08] overflow-hidden flex flex-col">
                      <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.05] text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>{selectedArtifact.language || "PLAIN TEXT"}</span>
                        <span>{selectedArtifact.content.split("\n").length} lines</span>
                      </div>
                      <pre className="p-3.5 overflow-auto text-xs font-mono text-slate-200 leading-relaxed flex-1 max-h-[calc(100vh-280px)]">
                        <code>{selectedArtifact.content}</code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-400">
                      <Code2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-white">Live Artifacts Canvas</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-[220px]">
                        Click <strong className="text-indigo-300">Canvas</strong> on any code block or synthesis in chat to inspect it here live side-by-side.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Deck Footer */}
          <div className="p-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span className="truncate">{space?.name || "Workspace"} Context</span>
            <span className="text-emerald-400 font-medium">● Synced</span>
          </div>
        </aside>
      )}
    </div>
  );
}
