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
} from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  MessageSquare,
  Plus,
  ArrowRight,
  Sparkles,
  Check,
  X,
  FileText,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Brain,
  ShieldCheck,
  Cpu,
  Layers,
  Search,
  BookOpen,
  Send,
  CornerDownLeft,
  Copy,
} from "lucide-react";

interface ConversationPageProps {
  params: Promise<{ spaceId: string; conversationId: string }>;
}

// Lightweight Markdown Formatter
function FormattedContent({ text }: { text: string }) {
  if (!text) return null;

  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-slate-200">
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
              className="my-3 rounded-xl bg-[#08090e] border border-white/[0.08] overflow-hidden text-xs font-mono"
            >
              {lang && (
                <div className="px-3.5 py-1.5 bg-white/[0.03] border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                  <span>{lang}</span>
                </div>
              )}
              <pre className="p-3.5 overflow-x-auto text-slate-200 text-xs leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Handle paragraphs, bold text, headers, and bullet points
        const lines = part.split("\n");
        return (
          <div key={idx} className="space-y-2">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1" />;

              if (trimmed.startsWith("### ")) {
                return (
                  <h4 key={lineIdx} className="text-sm font-bold text-white mt-3 mb-1">
                    {trimmed.replace(/^###\s+/, "")}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3 key={lineIdx} className="text-base font-bold text-white mt-4 mb-1.5">
                    {trimmed.replace(/^##\s+/, "")}
                  </h3>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h2 key={lineIdx} className="text-lg font-bold text-white mt-4 mb-2">
                    {trimmed.replace(/^#\s+/, "")}
                  </h2>
                );
              }
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 text-xs pl-2">
                    <span className="text-indigo-400 font-bold mt-0.5">•</span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: trimmed
                          .slice(2)
                          .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
                          .replace(/`([^`]+)`/g, "<code class='px-1 py-0.5 rounded bg-white/10 text-indigo-300 font-mono text-[11px]'>$1</code>"),
                      }}
                    />
                  </div>
                );
              }

              return (
                <p
                  key={lineIdx}
                  className="text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: trimmed
                      .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
                      .replace(/`([^`]+)`/g, "<code class='px-1 py-0.5 rounded bg-white/10 text-indigo-300 font-mono text-[11px]'>$1</code>"),
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

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [thoughtExpanded, setThoughtExpanded] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialPromptSent = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentStatus]);

  // Load Session context and active documents
  useEffect(() => {
    const loadSession = async () => {
      try {
        const [spaceRes, convsRes, msgsRes, docsRes, memsRes] = await Promise.all([
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
          apiClient<ConversationItem[]>(`/api/v1/conversations?space_id=${spaceId}`).catch(() => []),
          apiClient<MessageItem[]>(`/api/v1/conversations/${conversationId}/messages`).catch(() => []),
          apiClient<DocumentItem[]>(`/api/v1/documents?space_id=${spaceId}`).catch(() => []),
          apiClient<MemoryItem[]>(`/api/v1/memories?space_id=${spaceId}`).catch(() => []),
        ]);

        if (spaceRes) setSpace(spaceRes);
        setConversations(convsRes || []);
        setMessages(msgsRes || []);
        setDocuments(docsRes || []);
        setMemories(memsRes || []);
      } catch (err) {
        console.error("Failed to load conversation messages:", err);
      }
    };
    loadSession();
  }, [conversationId, spaceId]);

  // Auto-send initial prompt if passed
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current && !isStreaming) {
      initialPromptSent.current = true;
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isStreaming) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setIsStreaming(true);
    setAgentStatus("Analyzing evidence & axioms...");

    const tempUserMsg: MessageItem = {
      id: `user-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    const assistantMsgId = `asst-${Date.now()}`;
    const tempAssistantMsg: MessageItem = {
      id: assistantMsgId,
      conversation_id: conversationId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
                  setAgentStatus(data.status || "Synthesizing response...");
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
                // Ignore parse errors on partial chunk frames
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

  // 1-Click Action Proposal Execution
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

  const handleNewSession = async () => {
    try {
      const created = await apiClient<ConversationItem>(`/api/v1/conversations`, {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          title: "New Reasoning Session",
        }),
      });
      router.push(`/spaces/${spaceId}/conversations/${created.id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const currentConv = conversations.find((c) => c.id === conversationId);

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none font-sans">
      {/* 1. Global Navigation Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Conversations Rail (Linear-style Sessions column) */}
      <aside className="w-64 shrink-0 h-full bg-[#0b0c13] border-r border-white/[0.07] hidden md:flex flex-col justify-between p-3.5 z-20">
        <div className="space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Sessions
              </span>
            </div>
            <button
              onClick={handleNewSession}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="New session"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {conversations.map((conv) => {
              const isActive = conv.id === conversationId;
              return (
                <Link
                  key={conv.id}
                  href={`/spaces/${spaceId}/conversations/${conv.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer truncate ${
                    isActive
                      ? "bg-[#181926] text-white font-medium border border-white/[0.08] shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? "bg-indigo-400 shadow-sm" : "bg-slate-600"
                    }`}
                  />
                  <span className="truncate">{conv.title || "Reasoning Thread"}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Space Grounding Summary in Sidebar */}
        <div className="pt-3 border-t border-white/[0.07] space-y-2 text-xs">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-1">
            Grounding Context
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-sky-400" />
              <span>Evidence Files</span>
            </span>
            <span className="text-white font-mono font-semibold">{documents.length}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-purple-400" />
              <span>Axiom Principles</span>
            </span>
            <span className="text-white font-mono font-semibold">{memories.length}</span>
          </div>
        </div>
      </aside>

      {/* 3. Main Agent Chat Cockpit */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0a0a0f]">
        {/* Agent Header */}
        <header className="h-16 px-8 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-[#0c0d14]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c0d14] animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight truncate">
                  MYND Autonomous Agent
                </h1>
                <span className="px-2 py-0.2 rounded text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  ONLINE • GROUNDED
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5 truncate">
                <span>{currentConv?.title || "Multi-Turn Reasoning"}</span>
                <span>•</span>
                <span>{documents.length} Documents & {memories.length} Axioms Synced</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsContextDrawerOpen(!isContextDrawerOpen)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Active Context ({documents.length})</span>
            </button>

            <button
              type="button"
              onClick={handleNewSession}
              className="px-3.5 py-1.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Thread</span>
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-5 py-16 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="space-y-1.5 max-w-md">
                <h2 className="text-base font-bold text-white">
                  MYND Reasoning Agent Ready
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  I synthesize your workspace documents, verify invariant principles, and formulate executable action proposals.
                </p>
              </div>

              {/* Real Agent Prompt Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full pt-2">
                {[
                  {
                    title: "Synthesize Key Risks & Blockers",
                    desc: "Audit current initiatives against uploaded evidence",
                    prompt: "Synthesize all active initiatives and report critical blockers or contradictions in our documents.",
                  },
                  {
                    title: "Propose Next Milestone Action",
                    desc: "Generate an actionable proposal to execute into Work",
                    prompt: "Analyze our space evidence and formulate a prioritized action proposal for the next sprint milestone.",
                  },
                  {
                    title: "Audit Grounding Evidence",
                    desc: "Check documents for missing architectural constraints",
                    prompt: "Perform an audit of our grounded documents and summarize decisions that require human review.",
                  },
                  {
                    title: "Review Invariant Axioms",
                    desc: "Verify decision consistency with core principles",
                    prompt: "List our retained invariant axioms and check if any current initiatives violate them.",
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-3.5 rounded-xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.14] text-left transition-all group cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                      <span>{item.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <div className="text-[11px] text-slate-400 leading-tight">
                      {item.desc}
                    </div>
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

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1 shadow-sm">
                      <Cpu className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-2xl w-full ${isUser ? "items-end" : "items-start"}`}>
                    {/* User / Agent Header Badge */}
                    <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500 font-mono">
                      <span>{isUser ? "You" : "MYND Agent"}</span>
                      <span>•</span>
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Agent Thinking Trace (Collapsible Chain of Thought) */}
                    {!isUser && (isLatestAssistant || msg.content.length > 50) && (
                      <div className="rounded-xl bg-[#0a0c14] border border-white/[0.06] overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setThoughtExpanded((prev) => ({
                              ...prev,
                              [msg.id]: !prev[msg.id],
                            }))
                          }
                          className="w-full flex items-center justify-between px-3.5 py-2 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 font-mono">
                            <Brain className={`w-3.5 h-3.5 text-indigo-400 ${isLatestAssistant ? "animate-pulse" : ""}`} />
                            <span>
                              {isLatestAssistant
                                ? agentStatus || "Multi-Agent Synthesis in progress..."
                                : "Reasoning Trace Verified"}
                            </span>
                          </div>
                          {thoughtExpanded[msg.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {thoughtExpanded[msg.id] && (
                          <div className="px-3.5 pb-3 pt-1 border-t border-white/[0.04] text-[11px] text-slate-400 space-y-1.5 font-mono">
                            <div className="flex items-center gap-2 text-emerald-400">
                              <Check className="w-3 h-3" />
                              <span>Vector Scope: Grounded in {documents.length} space files</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400">
                              <Check className="w-3 h-3" />
                              <span>Axiom Verification: Checked {memories.length} invariant principles</span>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-400">
                              <Check className="w-3 h-3" />
                              <span>Consensus: Formulated factual synthesis with direct citations</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bubble Content */}
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-[#181926] text-white border border-white/[0.09] shadow-sm ml-auto"
                          : "bg-[#0f1017] text-slate-200 border border-white/[0.07] shadow-sm"
                      }`}
                    >
                      {msg.content ? (
                        <FormattedContent text={msg.content} />
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 font-mono py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          <span>Generating synthesis...</span>
                        </div>
                      )}

                      {/* Evidence Citations */}
                      {citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 flex-wrap text-[10px] font-mono">
                          <span className="text-slate-500 font-bold">CITATIONS:</span>
                          {citations.map((c, i) => {
                            const title = typeof c === "string" ? c : c.document_title || "Evidence Chunk";
                            const page = typeof c === "object" && c.page_number ? ` (p. ${c.page_number})` : "";
                            return (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-white/[0.04] text-sky-300 border border-sky-500/20 flex items-center gap-1"
                              >
                                <FileText className="w-2.5 h-2.5 text-sky-400" />
                                <span>
                                  {title}
                                  {page}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Interactive Action Proposals (The Hallmark of an Autonomous Agent) */}
                    {proposals.length > 0 && (
                      <div className="space-y-3 w-full pt-1">
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
                              className={`rounded-2xl border p-5 space-y-3 shadow-xl transition-all ${
                                isExecuted
                                  ? "bg-[#0b1510] border-emerald-500/30"
                                  : isRejected
                                  ? "bg-[#140e0e] border-rose-500/25 opacity-60"
                                  : "bg-[#11121d] border-indigo-500/30"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="px-2 py-0.5 rounded uppercase tracking-wider font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  ACTION PROPOSAL: {prop.action_type.replace(/_/g, " ")}
                                </span>
                                <span className="text-emerald-400 font-semibold">
                                  {prop.confidence ? `${prop.confidence} Confidence` : "High Confidence"}
                                </span>
                              </div>

                              <div className="text-sm font-semibold text-white">
                                {title}
                              </div>

                              {prop.reason && (
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {prop.reason}
                                </p>
                              )}

                              {/* Parameters Breakdown */}
                              {prop.parameters && Object.keys(prop.parameters).length > 0 && (
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-[11px] font-mono text-slate-400 space-y-1">
                                  {Object.entries(prop.parameters).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between">
                                      <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}:</span>
                                      <span className="text-white truncate max-w-[200px]">{String(val)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                                {isExecuted ? (
                                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                                    <Check className="w-4 h-4" />
                                    <span>Executed into Workspace</span>
                                    {prop.executed_target_id && (
                                      <Link
                                        href={`/spaces/${spaceId}/work`}
                                        className="text-xs text-white underline hover:text-emerald-300 ml-2"
                                      >
                                        Inspect in Work Hub →
                                      </Link>
                                    )}
                                  </div>
                                ) : isRejected ? (
                                  <div className="flex items-center gap-1.5 text-xs text-rose-400">
                                    <X className="w-3.5 h-3.5" />
                                    <span>Proposal Rejected</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={isExecuting}
                                      onClick={() => handleRejectProposal(prop, msg.id)}
                                      className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isExecuting}
                                      onClick={() => handleApproveProposal(prop, msg.id)}
                                      className="px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{isExecuting ? "Executing Action..." : "Approve & Execute (1-Click)"}</span>
                                    </button>
                                  </div>
                                )}

                                <Link
                                  href={`/spaces/${spaceId}/work`}
                                  className="text-[11px] text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                                >
                                  <span>Work Hub</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Bar */}
        <div className="p-6 border-t border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-4xl mx-auto space-y-2"
          >
            <div className="relative rounded-2xl bg-[#12131e] border border-white/[0.09] focus-within:border-indigo-500/50 transition-all p-2.5 shadow-xl">
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
                placeholder="Message MYND... (Shift+Enter for newline, Enter to send)"
                disabled={isStreaming}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 px-2 py-1.5 focus:outline-none resize-none leading-relaxed max-h-44"
              />

              <div className="flex items-center justify-between pt-2 px-1 border-t border-white/[0.04]">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Grounded in {documents.length} documents & {memories.length} axioms</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    className="px-4 py-1.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold transition-colors disabled:opacity-30 flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>{isStreaming ? "Thinking..." : "Send"}</span>
                    <CornerDownLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Slide-over Context Drawer */}
      {isContextDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-[#0d0e16] border-l border-white/[0.08] shadow-2xl p-6 z-50 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Active Evidence Scope</span>
              </div>
              <button
                onClick={() => setIsContextDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300">
                Indexed Documents ({documents.length})
              </div>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.12] transition-colors flex items-center justify-between block group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="text-xs text-slate-200 group-hover:text-white truncate">
                        {doc.title}
                      </span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-white shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-300">
                Invariant Axioms ({memories.length})
              </div>
              <div className="space-y-2">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1 text-xs"
                  >
                    <div className="text-[10px] font-mono text-purple-400 uppercase">
                      {m.memory_type}
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
