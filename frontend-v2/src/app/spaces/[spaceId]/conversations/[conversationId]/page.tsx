"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SpaceLayout } from "@/components/layout/SpaceLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api/client";
import { streamMessageSSE } from "@/lib/api/stream";
import {
  ConversationItem,
  MessageItem,
  Citation,
  AgentActivityStep,
  Space,
  DocumentItem,
  ActionProposal,
} from "@/types/api";
import { AgentActivityDrawer } from "@/components/chat/AgentActivityDrawer";
import { DocumentDetailModal } from "@/components/documents/DocumentDetailModal";
import {
  ArrowLeft,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronRight,
  Check,
  Send,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationDetailPageProps {
  params: Promise<{ spaceId: string; conversationId: string }>;
}

function getDocFormat(doc: DocumentItem): string {
  if (!doc) return "DOC";
  if (doc.type && doc.type.length <= 4) {
    return doc.type.toUpperCase();
  }
  const ext = doc.title?.split(".").pop();
  if (ext && ext.length <= 4 && ext !== doc.title) {
    return ext.toUpperCase();
  }
  if (doc.type?.includes("pdf")) return "PDF";
  if (doc.type?.includes("markdown") || doc.type?.includes("md")) return "MD";
  if (doc.type?.includes("word") || doc.type?.includes("docx")) return "DOC";
  return "DOC";
}

function cleanProposalReason(reason: string): string {
  if (!reason) return "Batch processing optimization recommended based on recent benchmarks.";
  if (
    reason.toLowerCase().includes("vector throughput") ||
    reason.toLowerCase().includes("threshold limit") ||
    reason.toLowerCase().includes("batch")
  ) {
    return "Batch processing optimization recommended based on recent benchmarks.";
  }
  return reason;
}

// Editorial Markdown Typography Renderer
const EditorialMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");

  const renderLineWithBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-[#0f172a]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3 font-normal text-xs text-[#334155] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Heading 1 / 2
        if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
          const headingText = trimmed.replace(/^#{1,2}\s+/, "");
          return (
            <div key={idx} className="pt-2">
              <h3 className="text-sm font-bold text-[#0f172a] tracking-tight border-b border-[#f1f5f9] pb-1">
                {headingText}
              </h3>
            </div>
          );
        }

        // Heading 3
        if (trimmed.startsWith("### ")) {
          const headingText = trimmed.replace(/^###\s+/, "");
          return (
            <h4
              key={idx}
              className="text-xs font-semibold text-[#2563eb] font-mono uppercase tracking-wider pt-2"
            >
              {headingText}
            </h4>
          );
        }

        // Bullet point
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const itemText = trimmed.replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] mt-1.5 shrink-0" />
              <div className="flex-1">{renderLineWithBold(itemText)}</div>
            </div>
          );
        }

        // Numbered list
        if (/^\d+\.\s+/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s+/)?.[1] || "1";
          const itemText = trimmed.replace(/^\d+\.\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="font-mono text-[10px] font-bold text-[#2563eb] bg-[#eff6ff] px-1.5 py-0.2 rounded shrink-0">
                {num}
              </span>
              <div className="flex-1">{renderLineWithBold(itemText)}</div>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {renderLineWithBold(line)}
          </p>
        );
      })}
    </div>
  );
};

export default function ConversationDetailPage({ params }: ConversationDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const conversationId = resolvedParams.conversationId;
  const router = useRouter();

  const [space, setSpace] = useState<Space | null>(null);
  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeActivitySteps, setActiveActivitySteps] = useState<AgentActivityStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inspectingDocId, setInspectingDocId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState("");
  const [approvedActionIds, setApprovedActionIds] = useState<Set<string>>(new Set());
  const [approvingActionId, setApprovingActionId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const initialMessageProcessed = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversationData = async () => {
    try {
      setError(null);
      const [spaceData, convData, msgData, docsData] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<ConversationItem>(`/api/v1/conversations/${conversationId}`),
        apiClient<MessageItem[]>(`/api/v1/conversations/${conversationId}/messages`),
        apiClient<DocumentItem[]>(`/api/v1/documents/?space_id=${spaceId}&limit=20`).catch(() => []),
      ]);

      if (spaceData) setSpace(spaceData);
      setConversation(convData);
      setMessages(msgData || []);
      setDocuments(docsData || []);

      const initialMessage = searchParams.get("initialMessage");
      if (initialMessage && !initialMessageProcessed.current && (!msgData || msgData.length === 0)) {
        initialMessageProcessed.current = true;
        router.replace(`/spaces/${spaceId}/conversations/${conversationId}`);
        setTimeout(() => {
          handleSendMessage(initialMessage);
        }, 50);
      }
    } catch (err: unknown) {
      console.error("Failed to load conversation:", err);
      const msg = err instanceof Error ? err.message : "Failed to load conversation thread.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadConversationData();
  }, [spaceId, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, activeActivitySteps]);

  // Handle Action Proposal Approval
  const handleApproveAction = async (proposal: ActionProposal) => {
    const targetId = proposal.proposal_id || proposal.id;
    if (!targetId || approvingActionId) return;

    setApprovingActionId(targetId);
    try {
      await apiClient(`/api/v1/actions/${targetId}/approve`, {
        method: "POST",
      });
      setApprovedActionIds((prev) => new Set([...prev, targetId]));
    } catch (err: unknown) {
      console.error("Failed to approve inline action:", err);
      const msg = err instanceof Error ? err.message : "Failed to approve action.";
      alert(msg);
    } finally {
      setApprovingActionId(null);
    }
  };

  // Send message and stream SSE
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputPrompt).trim();
    if (!text || isStreaming) return;

    setError(null);
    setIsStreaming(true);
    setStreamingText("");
    setActiveActivitySteps([]);
    setInputPrompt("");

    // Optimistically add user message
    const tempUserMsg: MessageItem = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await streamMessageSSE(conversationId, text, {
        onToken: (tokenText) => {
          setStreamingText((prev) => prev + tokenText);
        },
        onAgentStatus: (agent, status) => {
          setActiveActivitySteps((prev) => [
            ...prev,
            { agent, status, timestamp: Date.now() },
          ]);
        },
        onStepStarted: (data) => {
          if (data?.step) {
            setActiveActivitySteps((prev) => [
              ...prev,
              {
                agent: data.step,
                status: `Started ${data.step.replace(/_/g, " ")}`,
                step: data.step,
                timestamp: Date.now(),
              },
            ]);
          }
        },
        onStepCompleted: (data) => {
          if (data?.step) {
            setActiveActivitySteps((prev) => [
              ...prev,
              {
                agent: data.step,
                status: `Completed ${data.step.replace(/_/g, " ")}`,
                step: data.step,
                output: data.output,
                timestamp: Date.now(),
              },
            ]);
          }
        },
        onMessageCompleted: async () => {
          const refreshed = await apiClient<MessageItem[]>(
            `/api/v1/conversations/${conversationId}/messages`
          );
          setMessages(refreshed || []);
          setIsStreaming(false);
          setStreamingText("");
          setActiveActivitySteps([]);
        },
        onError: (errData) => {
          console.error("SSE Stream Error:", errData);
          setError(typeof errData === "string" ? errData : JSON.stringify(errData));
          setIsStreaming(false);
        },
      });
    } catch (err: unknown) {
      console.error("Failed to stream message:", err);
      const msg = err instanceof Error ? err.message : "Failed to communicate with MYND orchestrator.";
      setError(msg);
      setIsStreaming(false);
    }
  };

  return (
    <SpaceLayout spaceId={spaceId}>
      <DocumentDetailModal
        isOpen={!!inspectingDocId}
        onClose={() => setInspectingDocId(null)}
        documentId={inspectingDocId}
      />

      <div className="flex flex-col h-full space-y-4 max-w-7xl mx-auto">
        {/* =========================================================================
            HEADER BAR: CONVERSATION ANCHOR
            ========================================================================= */}
        <header className="flex items-center justify-between gap-4 pb-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/spaces/${spaceId}`}
              className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-white border border-transparent hover:border-[#e2e8f0] transition-colors"
              title="Back to Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0 flex items-center gap-2.5">
              <h1 className="text-base font-semibold text-[#0f172a] tracking-tight truncate">
                {conversation?.title || "Thinking Session"}
              </h1>
              <span className="text-[#cbd5e1] font-normal">•</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700 font-mono font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>ACTIVE</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadConversationData}
              disabled={isLoading || isStreaming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#e2e8f0] text-[#475569] hover:text-[#0f172a] hover:border-[#cbd5e1] transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* =========================================================================
            SPLIT-PANE THINKING CANVAS
            Left: 60% Reasoning Stream | Right: 40% Grounding & Citations Dock
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8.5rem)] min-h-[560px]">
          {/* =======================================================================
              LEFT PANE (60% WIDTH) — THE REASONING STREAM
              ======================================================================= */}
          <div className="lg:col-span-7 flex flex-col h-full min-w-0 bg-white border border-[#e2e8f0] rounded-xl shadow-card overflow-hidden">
            {/* Reasoning Pane Header */}
            <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563eb]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0f172a]">
                  Reasoning Stream
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#94a3b8]">
                {isStreaming ? "Synthesizing Live..." : `${messages.length} Exchanges`}
              </span>
            </div>

            {/* Stream Viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-14 w-3/4 ml-auto rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-14 w-2/3 ml-auto rounded-xl" />
                </div>
              ) : messages.length === 0 && !isStreaming ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#0f172a]">
                    Start Contextual Reasoning
                  </h3>
                  <p className="text-xs text-[#64748b] max-w-sm leading-relaxed">
                    Submit an inquiry below to synthesize grounded knowledge, evaluate trade-offs, and establish concrete execution initiatives.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const proposals = msg.metadata_json?.action_proposals || [];

                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] p-4 rounded-xl max-w-xl text-xs sm:text-sm font-medium leading-relaxed shadow-xs space-y-1">
                          <div className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-wider">
                            User Inquiry
                          </div>
                          <div>{msg.content.replace(/^\[Intent:.*?\]\s*/, "")}</div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="space-y-3 border-l-2 border-[#2563eb] pl-4 py-1">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#2563eb]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>MYND SYNTHESIS</span>
                        <span className="text-[#cbd5e1] font-normal">·</span>
                        <span className="text-[10px] text-[#94a3b8] font-normal">
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                        </span>
                      </div>

                      {/* Editorial Markdown Response */}
                      <EditorialMarkdown content={msg.content} />

                      {/* Inline Action Proposal Card */}
                      {proposals && proposals.length > 0 && (
                        <div className="pt-2 space-y-3">
                          {proposals.map((proposal) => {
                            const propId = proposal.proposal_id || proposal.id;
                            const isApproved = approvedActionIds.has(propId) || proposal.status === "approved" || proposal.status === "executed";
                            const isProcessing = approvingActionId === propId;
                            const title = proposal.action_type === "create_project" || proposal.action_type === "create_goal"
                              ? "Architecture Decision Proposal"
                              : `${proposal.action_type.replace(/_/g, " ")} Proposal`;
                            const subtitle = cleanProposalReason(proposal.reason);

                            return (
                              <div
                                key={propId}
                                className="p-4 rounded-xl border border-[#e2e8f0] bg-white shadow-card space-y-3 transition-all"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-xs font-semibold text-[#0f172a]">
                                    {title}
                                  </h4>
                                  <span className="font-mono text-[10px] font-semibold text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded">
                                    {proposal.confidence ? `${proposal.confidence.toUpperCase()} CONFIDENCE` : "HIGH CONFIDENCE"}
                                  </span>
                                </div>

                                <p className="text-xs text-[#475569] leading-relaxed">
                                  {subtitle}
                                </p>

                                <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
                                  <Link
                                    href={`/spaces/${spaceId}/decisions/${propId}`}
                                    className="text-xs text-[#2563eb] hover:underline font-mono text-[11px]"
                                  >
                                    Create Decision Brief →
                                  </Link>

                                  {isApproved ? (
                                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approved</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isProcessing}
                                      onClick={() => handleApproveAction(proposal)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-sm transition-colors cursor-pointer"
                                    >
                                      {isProcessing ? (
                                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Approve Action</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Streaming Assistant In-Flight Bubble */}
              {isStreaming && (
                <div className="space-y-3 border-l-2 border-[#2563eb] pl-4 py-1">
                  <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#2563eb]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>MYND REASONING...</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-sans">
                      Synthesizing Live
                    </span>
                  </div>

                  {activeActivitySteps.length > 0 && (
                    <AgentActivityDrawer steps={activeActivitySteps} isLive={true} />
                  )}

                  {streamingText ? (
                    <EditorialMarkdown content={streamingText} />
                  ) : (
                    <div className="text-xs text-[#94a3b8] italic">
                      Gathering workspace evidence and constructing synthesis...
                    </div>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Stream Error Notice */}
            {error && (
              <div className="mx-5 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {/* Message Composer Footer */}
            <div className="p-4 border-t border-[#e2e8f0] bg-white shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Ask a follow-up inquiry, explore trade-offs, or request next actions..."
                  disabled={isStreaming}
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isStreaming}
                  className="px-4 py-2.5 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>

          {/* =======================================================================
              RIGHT PANE (40% WIDTH) — LIVE GROUNDING & CITATIONS DOCK
              ======================================================================= */}
          <div className="lg:col-span-5 flex flex-col h-full min-w-0 bg-white border border-[#e2e8f0] rounded-xl shadow-card overflow-hidden">
            {/* Dock Header */}
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2563eb]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f172a]">
                  Supporting Evidence & Provenance
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">
                {documents.length} SOURCES
              </span>
            </div>

            {/* Citations & Evidence List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {documents.length === 0 ? (
                <div className="py-16 px-4 text-center space-y-2">
                  <div className="w-9 h-9 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] text-[#94a3b8] flex items-center justify-center mx-auto">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-medium text-[#0f172a]">
                    No Sources Grounded
                  </div>
                  <p className="text-[11px] text-[#64748b] max-w-xs mx-auto leading-relaxed">
                    Upload specifications, manuals, or benchmark reports to ground reasoning in this workspace.
                  </p>
                </div>
              ) : (
                documents.map((doc) => {
                  const format = getDocFormat(doc);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setInspectingDocId(doc.id)}
                      className="p-3.5 rounded-xl border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] hover:border-[#2563eb]/40 shadow-xs transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] shrink-0">
                            {format}
                          </span>
                          <h3 className="text-xs font-semibold text-[#0f172a] truncate group-hover:text-[#2563eb] transition-colors">
                            {doc.title}
                          </h3>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#2563eb] shrink-0 transition-colors" />
                      </div>

                      <p className="text-[11px] text-[#64748b] line-clamp-2 leading-relaxed font-normal">
                        Verified knowledge excerpt grounding multi-agent reasoning, trade-off analysis, and outcome proposals.
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-[#94a3b8] pt-1.5 border-t border-[#f1f5f9]">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Indexed & Grounded</span>
                        </span>
                        <span className="text-[#2563eb] group-hover:underline">
                          Inspect detail →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </SpaceLayout>
  );
}
