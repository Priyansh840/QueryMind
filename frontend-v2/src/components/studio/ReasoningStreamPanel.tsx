"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Bookmark,
  Layers,
  Zap,
} from "lucide-react";
import { ActionProposal, Citation, MessageItem } from "@/types/api";
import { apiClient } from "@/lib/api/client";

interface ReasoningStreamPanelProps {
  spaceId: string;
  activeConversationId?: string;
  onSelectEvidence?: (item: { type: "document" | "memory" | "proposal"; id: string; title: string }) => void;
  onStreamingChange?: (isStreaming: boolean) => void;
}

export function ReasoningStreamPanel({
  spaceId,
  activeConversationId,
  onSelectEvidence,
  onStreamingChange,
}: ReasoningStreamPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(activeConversationId || null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentPhase, setAgentPhase] = useState<string | null>(null);
  const [currentStreamingText, setCurrentStreamingText] = useState("");
  const [currentProposals, setCurrentProposals] = useState<ActionProposal[]>([]);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize or fetch latest conversation
  useEffect(() => {
    let isMounted = true;
    async function initConversation() {
      try {
        if (activeConversationId) {
          setConversationId(activeConversationId);
          const history = await apiClient<MessageItem[]>(
            `/api/v1/conversations/${activeConversationId}/messages`
          );
          if (isMounted) setMessages(history);
        } else {
          // Fetch conversations list or create a fresh workspace thread
          const list = await apiClient<Array<{ id: string; title: string }>>(
            `/api/v1/spaces/${spaceId}/conversations`
          );
          if (list && list.length > 0) {
            const first = list[0];
            if (isMounted) {
              setConversationId(first.id);
              const history = await apiClient<MessageItem[]>(
                `/api/v1/conversations/${first.id}/messages`
              );
              setMessages(history);
            }
          } else {
            // Create new default conversation
            const created = await apiClient<{ id: string }>(
              `/api/v1/spaces/${spaceId}/conversations`,
              {
                method: "POST",
                body: JSON.stringify({ title: "Strategic Workspace Reasoning" }),
              }
            );
            if (isMounted) {
              setConversationId(created.id);
              setMessages([]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize conversation stream:", err);
      }
    }

    initConversation();
    return () => {
      isMounted = false;
    };
  }, [spaceId, activeConversationId]);

  // Scroll to bottom smoothly on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamingText, agentPhase]);

  // Notify parent of streaming status for radar pulse animation
  useEffect(() => {
    if (onStreamingChange) {
      onStreamingChange(isStreaming);
    }
  }, [isStreaming, onStreamingChange]);

  // Send message and stream SSE
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isStreaming || !conversationId) return;

    setInputText("");
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content: textToSend,
      metadata_json: {},
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setAgentPhase("Initializing reasoning chain...");
    setCurrentStreamingText("");
    setCurrentProposals([]);
    setCurrentCitations([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ content: textToSend }),
          signal: controller.signal,
        }
      );

      if (!response.ok || !response.body) {
        throw new Error(`SSE stream failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      const streamProposals: ActionProposal[] = [];
      const streamCitations: Citation[] = [];

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
            const event = JSON.parse(jsonStr);

            if (event.type === "agent.status" && event.payload?.status) {
              setAgentPhase(event.payload.status);
            } else if (event.type === "token" && event.payload?.token) {
              accumulatedText += event.payload.token;
              setCurrentStreamingText(accumulatedText);
            } else if (event.type === "action_proposals" && event.payload?.proposals) {
              streamProposals.push(...event.payload.proposals);
              setCurrentProposals([...streamProposals]);
            } else if (event.type === "citations" && event.payload?.citations) {
              streamCitations.push(...event.payload.citations);
              setCurrentCitations([...streamCitations]);
            }
          } catch {
            // Ignore partial lines
          }
        }
      }

      // Append finished assistant message
      const assistantMsg: MessageItem = {
        id: `assist-${Date.now()}`,
        conversation_id: conversationId,
        role: "assistant",
        content: accumulatedText || "Analysis complete.",
        metadata_json: {
          action_proposals: streamProposals,
        },
        citations: streamCitations,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Stream error:", err);
      }
    } finally {
      setIsStreaming(false);
      setAgentPhase(null);
      setCurrentStreamingText("");
      setCurrentProposals([]);
      setCurrentCitations([]);
      abortControllerRef.current = null;
    }
  };

  // Handle Proposal Approval
  const handleApproveProposal = async (proposal: ActionProposal, messageId: string) => {
    const propId = proposal.proposal_id || proposal.id;
    if (!propId || executingProposalId) return;

    setExecutingProposalId(propId);
    try {
      const result = await apiClient<{ success: boolean; target_id?: string }>(
        `/api/v1/actions/${propId}/approve`,
        { method: "POST" }
      );

      // Update message metadata locally
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const props = msg.metadata_json?.action_proposals || [];
          const updated = props.map((p: ActionProposal) =>
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
      console.error("Failed to approve action proposal:", err);
    } finally {
      setExecutingProposalId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090d] border-r border-white/[0.06] select-text">
      {/* Engine Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#0c0d12]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8]">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Reasoning Stream</span>
              <span className="text-[10px] text-slate-500 font-mono font-normal">v4.8-active</span>
            </div>
            <div className="text-[10px] text-slate-400">Continuous cognitive synthesis & co-pilot</div>
          </div>
        </div>

        {isStreaming ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[10px] text-[#38bdf8] font-mono animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            <span>{agentPhase || "Reasoning"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Ready</span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.length === 0 && !isStreaming && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-400">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm">
              <div className="text-sm font-semibold text-white">Direct Executive Intent</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct MYND to synthesize grounded documents, audit risks, or formulate high-impact initiative proposals.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-md pt-2">
              {[
                "Synthesize grounded docs for strategy gaps",
                "Propose optimization for active milestones",
                "Audit pending decisions and system risks",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.07] hover:border-[#6366f1]/40 hover:bg-white/[0.06] text-slate-300 transition-colors text-[11px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const proposals = msg.metadata_json?.action_proposals || [];
          const citations = msg.citations || [];

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8] shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[88%] space-y-2.5 ${
                  isUser
                    ? "bg-[#161622] border border-[#6366f1]/20 rounded-xl px-3.5 py-2.5 text-slate-100"
                    : "bg-[#0e0e14] border border-white/[0.06] rounded-xl px-4 py-3 text-slate-200"
                }`}
              >
                {/* Text Content */}
                <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {msg.content}
                </div>

                {/* Grounding Citations */}
                {citations.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                    {citations.map((c, i) => {
                      const title = typeof c === "string" ? c : c.document_title;
                      return (
                        <button
                          key={i}
                          onClick={() =>
                            onSelectEvidence &&
                            onSelectEvidence({
                              type: "document",
                              id: `doc-${i}`,
                              title: title,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] hover:border-[#38bdf8]/40 text-[10px] text-slate-300 transition-colors"
                        >
                          <FileText className="w-2.5 h-2.5 text-[#38bdf8]" />
                          <span>{title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Action Proposals Embedded in Message */}
                {proposals.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    {proposals.map((prop, idx) => {
                      const propId = prop.proposal_id || prop.id;
                      const isExecuted = prop.status === "executed";
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-[#14141d] border border-amber-500/20 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5 font-medium text-amber-300">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Action Proposal: {prop.action_type}</span>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                                isExecuted
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {prop.status}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-white">
                            {prop.reason || `Execute ${prop.action_type}`}
                          </div>

                          <div className="pt-1 flex items-center justify-between">
                            <button
                              onClick={() =>
                                onSelectEvidence &&
                                onSelectEvidence({
                                  type: "proposal",
                                  id: propId,
                                  title: prop.reason || prop.action_type,
                                })
                              }
                              className="text-[10px] text-slate-400 hover:text-white transition-colors"
                            >
                              Inspect Details →
                            </button>

                            {!isExecuted && (
                              <button
                                onClick={() => handleApproveProposal(prop, msg.id)}
                                disabled={executingProposalId === propId}
                                className="px-2.5 py-1 rounded bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[11px] transition-colors disabled:opacity-50"
                              >
                                {executingProposalId === propId ? "Executing..." : "Approve Plan"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Live SSE Streaming Assistant Message */}
        {isStreaming && (
          <div className="flex gap-3 justify-start">
            <div className="w-6 h-6 rounded-full bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8] shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5" />
            </div>

            <div className="max-w-[88%] space-y-2.5 bg-[#0e0e14] border border-white/[0.08] rounded-xl px-4 py-3 text-slate-200">
              {agentPhase && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#38bdf8]">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>{agentPhase}</span>
                </div>
              )}

              <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                {currentStreamingText || "Synthesizing evidence across grounded nodes..."}
                <span className="inline-block w-1.5 h-3 ml-0.5 bg-[#818cf8] animate-pulse" />
              </div>

              {/* Streaming Citations */}
              {currentCitations.length > 0 && (
                <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                  {currentCitations.map((c: Citation, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] text-slate-300"
                    >
                      <FileText className="w-2.5 h-2.5 text-[#38bdf8]" />
                      <span>{c.document_title}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Persistent Prompt Input Dock */}
      <div className="p-3 border-t border-white/[0.06] bg-[#0c0d12]">
        <div className="relative flex items-center bg-[#14141c] border border-white/[0.08] focus-within:border-[#6366f1]/50 rounded-xl transition-all shadow-inner">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Direct MYND: Ask anything or propose initiatives..."
            className="w-full bg-transparent px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isStreaming}
            className="mr-2 p-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white disabled:opacity-30 disabled:hover:bg-[#6366f1] transition-all"
            title="Send directive (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between px-1 pt-2 text-[10px] text-slate-500 font-mono">
          <span>Press Enter to send directive</span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
}
