"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  FileText,
  Zap,
} from "lucide-react";
import { ActionProposal, Citation, MessageItem } from "@/types/api";
import { apiClient } from "@/lib/api/client";

interface ReasoningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  initialPrompt?: string;
  onProposalExecuted?: () => void;
}

export function ReasoningDrawer({
  isOpen,
  onClose,
  spaceId,
  initialPrompt = "",
  onProposalExecuted,
}: ReasoningDrawerProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState(initialPrompt);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentPhase, setAgentPhase] = useState<string | null>(null);
  const [currentStreamingText, setCurrentStreamingText] = useState("");
  const [currentProposals, setCurrentProposals] = useState<ActionProposal[]>([]);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // If initialPrompt changes and drawer opens, prefill
  useEffect(() => {
    if (initialPrompt && isOpen) {
      setInputText(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Initialize or fetch latest conversation when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function initConversation() {
      try {
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
          const created = await apiClient<{ id: string }>(
            `/api/v1/spaces/${spaceId}/conversations`,
            {
              method: "POST",
              body: JSON.stringify({ title: "Workspace Co-Pilot Session" }),
            }
          );
          if (isMounted) {
            setConversationId(created.id);
            setMessages([]);
          }
        }
      } catch (err) {
        console.error("Failed to initialize conversation in drawer:", err);
      }
    }

    initConversation();
    return () => {
      isMounted = false;
    };
  }, [spaceId, isOpen]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamingText, agentPhase]);

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
    setAgentPhase("Analyzing workspace context...");
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
        console.error("Stream error in drawer:", err);
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

      if (onProposalExecuted) onProposalExecuted();
    } catch (err) {
      console.error("Failed to approve action proposal:", err);
    } finally {
      setExecutingProposalId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Dim Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Body */}
      <div className="relative w-full max-w-lg h-full bg-[#0b0c10] border-l border-white/[0.08] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0e0e14]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
                <span>MYND Reasoning Co-Pilot</span>
                <span className="text-[10px] text-slate-500 font-mono">active</span>
              </div>
              <div className="text-[10px] text-slate-400">Direct executive guidance & autonomous synthesis</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Close drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {messages.length === 0 && !isStreaming && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-400">
                <Bot className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-sm">
                <div className="text-sm font-semibold text-white">How can MYND assist?</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ask questions against your grounded documents, request an initiative audit, or formulate action plans.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 w-full max-w-xs pt-2">
                {[
                  "Synthesize key insights from grounded docs",
                  "Propose next strategic milestones",
                  "Audit risks and pending decisions",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#6366f1]/40 hover:bg-white/[0.06] text-slate-300 transition-colors text-[11px]"
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
                      : "bg-[#12131a] border border-white/[0.06] rounded-xl px-4 py-3 text-slate-200"
                  }`}
                >
                  <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                    {msg.content}
                  </div>

                  {/* Citations */}
                  {citations.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                      {citations.map((c, i) => {
                        const title = typeof c === "string" ? c : c.document_title;
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] text-slate-300"
                          >
                            <FileText className="w-2.5 h-2.5 text-[#38bdf8]" />
                            <span>{title}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Embedded Action Proposals */}
                  {proposals.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                      {proposals.map((prop, idx) => {
                        const propId = prop.proposal_id || prop.id;
                        const isExecuted = prop.status === "executed";
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-[#181824] border border-amber-500/25 space-y-2"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1.5 font-medium text-amber-300">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Proposal: {prop.action_type}</span>
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

                            {!isExecuted && (
                              <div className="pt-1 flex justify-end">
                                <button
                                  onClick={() => handleApproveProposal(prop, msg.id)}
                                  disabled={executingProposalId === propId}
                                  className="px-3 py-1 rounded bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-[11px] transition-colors disabled:opacity-50"
                                >
                                  {executingProposalId === propId ? "Executing..." : "Approve Plan"}
                                </button>
                              </div>
                            )}
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

          {/* Live Streaming State */}
          {isStreaming && (
            <div className="flex gap-3 justify-start">
              <div className="w-6 h-6 rounded-full bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8] shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="max-w-[88%] space-y-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl px-4 py-3 text-slate-200">
                {agentPhase && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#38bdf8]">
                    <Sparkles className="w-3 h-3 animate-spin" />
                    <span>{agentPhase}</span>
                  </div>
                )}
                <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {currentStreamingText || "Synthesizing..."}
                  <span className="inline-block w-1.5 h-3 ml-0.5 bg-[#818cf8] animate-pulse" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-white/[0.06] bg-[#0c0d12]">
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
              placeholder="Ask anything or direct an action..."
              className="w-full bg-transparent px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isStreaming}
              className="mr-2 p-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white disabled:opacity-30 disabled:hover:bg-[#6366f1] transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between px-1 pt-2 text-[10px] text-slate-500 font-mono">
            <span>Press Enter to send</span>
            <span>Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
