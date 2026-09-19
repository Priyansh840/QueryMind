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
} from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  MessageSquare,
  Plus,
  ArrowRight,
  Sparkles,
  Check,
  ShieldCheck,
  FileText,
  User,
  Bot,
  ExternalLink,
} from "lucide-react";

interface ConversationPageProps {
  params: Promise<{ spaceId: string; conversationId: string }>;
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const conversationId = resolvedParams.conversationId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt");

  const { currentSpace, spaces, user } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialPromptSent = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentStatus]);

  // Load Space, Conversation List, and Messages
  useEffect(() => {
    const loadSession = async () => {
      try {
        const [spaceRes, convsRes, msgsRes] = await Promise.all([
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
          apiClient<ConversationItem[]>(`/api/v1/conversations?space_id=${spaceId}`).catch(() => []),
          apiClient<MessageItem[]>(`/api/v1/conversations/${conversationId}/messages`).catch(() => []),
        ]);

        if (spaceRes) setSpace(spaceRes);
        setConversations(convsRes || []);
        setMessages(msgsRes || []);
      } catch (err) {
        console.error("Failed to load conversation messages:", err);
      }
    };
    loadSession();
  }, [conversationId, spaceId]);

  // Handle Initial Prompt auto-send if arrived with ?prompt=...
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current && !isStreaming) {
      initialPromptSent.current = true;
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isStreaming) return;

    setInput("");
    setIsStreaming(true);
    setAgentStatus("Gathering workspace context...");

    // Optimistically append user message
    const tempUserMsg: MessageItem = {
      id: `user-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    // Optimistically create empty assistant placeholder
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
                  setAgentStatus(data.status || "Reasoning...");
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
                // Ignore parse errors on partial frames
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
                content: msg.content || "Autonomous agent completed reasoning.",
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setAgentStatus(null);
    }
  };

  const handleApproveProposal = async (proposal: ActionProposal, messageId: string) => {
    const propId = proposal.proposal_id || proposal.id;
    if (!propId || executingProposalId) return;

    setExecutingProposalId(propId);
    try {
      const result = await apiClient<{ success: boolean; target_id?: string; message?: string }>(
        `/api/v1/actions/${propId}/approve`,
        {
          method: "POST",
        }
      );

      // Update proposal state locally in message metadata
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
    } catch (err) {
      console.error("Failed to approve proposal:", err);
      alert("Failed to execute action proposal.");
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
          title: "New Reasoning Thread",
        }),
      });
      router.push(`/spaces/${spaceId}/conversations/${created.id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Reasoning View */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white truncate">
                Autonomous Reasoning Session
              </h1>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Multi-Agent Synthesis • Space Grounded
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Thread</span>
          </button>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-16">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] text-[#818cf8] flex items-center justify-center border border-white/[0.08]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-white">
                Ready for Contextual Reasoning
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Ask questions about your uploaded documents, request architectural reviews, or have MYND synthesize action proposals for your projects.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              const proposals: ActionProposal[] = msg.metadata_json?.action_proposals || [];
              const citations = msg.citations || [];

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[#141522] border border-[#818cf8]/25 flex items-center justify-center text-[#818cf8] shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-2xl ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-[#181926] text-white border border-white/[0.08]"
                          : "bg-[#0c0d12] text-slate-200 border border-white/[0.06]"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Source Citations */}
                      {citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2 flex-wrap text-[10px] font-mono text-slate-400">
                          <span className="text-slate-500">GROUNDING:</span>
                          {citations.map((c, i) => {
                            const title = typeof c === "string" ? c : c.document_title;
                            return (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded-sm bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                              >
                                {title}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Embedded Action Proposals */}
                    {proposals.length > 0 && (
                      <div className="space-y-2 w-full">
                        {proposals.map((prop) => {
                          const propId = prop.proposal_id || prop.id;
                          const isExecuting = executingProposalId === propId;
                          const isExecuted = prop.status === "executed";
                          const title =
                            prop.parameters?.name ||
                            prop.parameters?.description ||
                            prop.reason ||
                            `${prop.action_type.replace(/_/g, " ")} Proposal`;

                          return (
                            <div
                              key={propId}
                              className="rounded-xl border border-[#818cf8]/20 bg-[#12131e] p-4 space-y-2.5 shadow-md"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-[#818cf8]/15 text-[#818cf8] font-bold">
                                  PROPOSAL: {prop.action_type.replace(/_/g, " ")}
                                </span>
                                {prop.confidence && (
                                  <span className="text-slate-400">
                                    {prop.confidence} Confidence
                                  </span>
                                )}
                              </div>

                              <div className="text-xs font-semibold text-white">
                                {title}
                              </div>

                              {prop.reason && (
                                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                                  {prop.reason}
                                </p>
                              )}

                              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                                {isExecuted ? (
                                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Executed into Workspace</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isExecuting}
                                    onClick={() => handleApproveProposal(prop, msg.id)}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isExecuting ? "Executing..." : "Approve & Execute"}</span>
                                  </button>
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
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Agent Streaming Indicator */}
          {isStreaming && agentStatus && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <span className="w-2 h-2 rounded-full bg-[#818cf8] animate-pulse" />
              <span className="font-mono text-[11px]">{agentStatus}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-6 border-t border-white/[0.06] bg-[#09090b]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-4xl mx-auto relative flex items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask MYND to analyze, synthesize, or propose next steps..."
              disabled={isStreaming}
              className="w-full bg-[#12131a] text-sm text-white placeholder-slate-500 pl-4 pr-24 py-3 rounded-xl border border-white/[0.07] focus:border-white/20 focus:outline-hidden transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-30 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Send</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
