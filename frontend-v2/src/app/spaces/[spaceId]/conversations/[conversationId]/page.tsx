"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiClient } from "@/lib/api/client";
import { streamMessageSSE } from "@/lib/api/stream";
import {
  ConversationItem,
  MessageItem,
  Citation,
  AgentActivityStep,
  Space,
  ActionProposal,
} from "@/types/api";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { AgentActivityDrawer } from "@/components/chat/AgentActivityDrawer";
import { DocumentDetailModal } from "@/components/documents/DocumentDetailModal";
import {
  MessageSquare,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Folder,
} from "lucide-react";

interface ConversationDetailPageProps {
  params: Promise<{ spaceId: string; conversationId: string }>;
}

export default function ConversationDetailPage({ params }: ConversationDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const conversationId = resolvedParams.conversationId;
  const router = useRouter();

  const [space, setSpace] = useState<Space | null>(null);
  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeActivitySteps, setActiveActivitySteps] = useState<AgentActivityStep[]>([]);
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inspectingDocId, setInspectingDocId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversationAndMessages = async () => {
    try {
      setError(null);
      const [spaceData, convData, msgData] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`),
        apiClient<ConversationItem>(`/api/v1/conversations/${conversationId}`),
        apiClient<MessageItem[]>(`/api/v1/conversations/${conversationId}/messages`),
      ]);

      setSpace(spaceData);
      setConversation(convData);
      setMessages(msgData || []);
    } catch (err: any) {
      console.error("Failed to load conversation:", err);
      setError(err?.message || "Failed to load conversation thread.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadConversationAndMessages();
  }, [spaceId, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, activeActivitySteps]);

  // Send message and stream SSE
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    setError(null);
    setIsStreaming(true);
    setStreamingText("");
    setActiveActivitySteps([]);
    setStreamingCitations([]);

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
        onCitation: (cit) => {
          setStreamingCitations((prev) => {
            const exists = prev.some((c) =>
              typeof cit === "object"
                ? c.document_title === cit.document_title && c.chunk_id === cit.chunk_id
                : c.document_title === cit
            );
            if (!exists) {
              return [
                ...prev,
                typeof cit === "object" ? cit : { document_title: cit },
              ];
            }
            return prev;
          });
        },
        onMessageCompleted: async () => {
          // Refresh messages from authoritative PostgreSQL database
          const refreshed = await apiClient<MessageItem[]>(
            `/api/v1/conversations/${conversationId}/messages`
          );
          setMessages(refreshed || []);
          setIsStreaming(false);
          setStreamingText("");
          setActiveActivitySteps([]);
          setStreamingCitations([]);
        },
        onError: (errData) => {
          console.error("SSE Stream Error:", errData);
          setError(typeof errData === "string" ? errData : JSON.stringify(errData));
          setIsStreaming(false);
        },
      });
    } catch (err: any) {
      console.error("Failed to stream message:", err);
      setError(err?.message || "Failed to communicate with MYND orchestrator.");
      setIsStreaming(false);
    }
  };

  // Open source document inspector on citation click
  const handleCitationClick = async (cit: string | Citation) => {
    const title = typeof cit === "object" ? cit.document_title : cit;
    try {
      const docs = await apiClient<any[]>(`/api/v1/documents/?space_id=${spaceId}`);
      const matched = docs.find((d) => d.title === title || d.title.includes(title));
      if (matched) {
        setInspectingDocId(matched.id);
      } else {
        alert(`Document "${title}" is indexed in this Space context.`);
      }
    } catch (err) {
      console.error("Could not inspect document:", err);
    }
  };

  return (
    <AppShell>
      <DocumentDetailModal
        isOpen={!!inspectingDocId}
        onClose={() => setInspectingDocId(null)}
        documentId={inspectingDocId}
      />

      <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-4xl mx-auto">
        {/* =========================================================================
            1. Conversation Header
            ========================================================================= */}
        <header className="py-3 px-4 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] mb-4 flex items-center justify-between shrink-0 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/spaces/${spaceId}/conversations`}>
              <IconButton label="Back to Conversations" size="sm">
                <ArrowLeft className="w-4 h-4 text-[var(--text-muted)]" />
              </IconButton>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {conversation?.title || "Contextual Thread"}
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-surface)] text-[var(--accent-text)] font-medium">
                  {space?.name || "Space"}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                LangGraph multi-agent synthesis with grounded Space RAG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <IconButton label="Refresh Thread" size="sm" onClick={loadConversationAndMessages}>
              <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </IconButton>
          </div>
        </header>

        {/* =========================================================================
            2. Chat Messages Viewport
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-16 w-3/4 ml-auto" />
              <Skeleton className="h-28 w-4/5" />
              <Skeleton className="h-16 w-2/3 ml-auto" />
            </div>
          ) : messages.length > 0 || isStreaming ? (
            <div>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCitationClick={handleCitationClick}
                />
              ))}

              {/* Streaming Assistant In-Flight Bubble */}
              {isStreaming && (
                <div className="flex items-start gap-3.5 my-4">
                  <div className="w-7 h-7 rounded-[var(--radius-xs)] bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  </div>

                  <div className="max-w-2xl w-full rounded-[var(--radius-md)] p-4 bg-[var(--surface-primary)] border border-[var(--border-subtle)] space-y-2 shadow-[var(--shadow-sm)]">
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] border-b border-[var(--border-subtle)]/60 pb-1.5 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                        MYND Thinking...
                      </span>
                      <span className="animate-pulse">Live</span>
                    </div>

                    {/* Agent Activity Drawer */}
                    {activeActivitySteps.length > 0 && (
                      <AgentActivityDrawer steps={activeActivitySteps} isLive={true} />
                    )}

                    {/* Streaming Text */}
                    {streamingText ? (
                      <div className="text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
                        {streamingText}
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--text-muted)] italic">
                        Gathering workspace context & reasoning...
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={<Sparkles className="w-8 h-8 text-[var(--accent-primary)]" />}
                title="Start a Contextual Conversation"
                description={`Ask MYND to synthesize documents, analyze goals, or suggest workflows grounded in "${space?.name || "this Space"}".`}
              />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="my-2 p-3 bg-[var(--error-surface)] border border-[var(--error-border)] rounded-[var(--radius-sm)] text-xs text-[var(--error-text)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* =========================================================================
            3. Message Composer Footer
            ========================================================================= */}
        <div className="pt-2 shrink-0">
          <MessageComposer
            onSend={handleSendMessage}
            disabled={isStreaming || isLoading}
            placeholder={`Ask MYND about ${space?.name || "this workspace"}...`}
          />
        </div>
      </div>
    </AppShell>
  );
}
