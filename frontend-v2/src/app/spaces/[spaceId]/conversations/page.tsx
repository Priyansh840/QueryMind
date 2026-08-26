"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api/client";
import { ConversationItem, Space } from "@/types/api";
import { MessageSquare, Plus, ArrowRight, Trash2, Sparkles, Clock } from "lucide-react";

interface SpaceConversationsPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceConversationsPage({ params }: SpaceConversationsPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  const [space, setSpace] = useState<Space | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadConversations = async () => {
    try {
      const spaceData = await apiClient<Space>(`/api/v1/spaces/${spaceId}`);
      setSpace(spaceData);

      const convRes = await apiClient<ConversationItem[]>(
        `/api/v1/conversations?space_id=${spaceId}`
      );
      setConversations(convRes || []);
    } catch (err) {
      console.error("Failed to load space conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadConversations();
  }, [spaceId]);

  const handleCreateConversation = async () => {
    setIsCreating(true);
    try {
      const newConv = await apiClient<ConversationItem>("/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          title: "New Contextual Thread",
        }),
      });

      router.push(`/spaces/${spaceId}/conversations/${newConv.id}`);
    } catch (err) {
      console.error("Failed to create conversation:", err);
      alert("Failed to start new conversation.");
      setIsCreating(false);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await apiClient(`/api/v1/conversations/${convId}`, {
        method: "DELETE",
      });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-wider text-[var(--accent-text)] uppercase">
                {space?.name || "Space"}
              </span>
              <span className="text-xs text-[var(--border-strong)]">•</span>
              <span className="text-xs text-[var(--text-muted)]">Conversations</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Multi-Agent Contextual Threads
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Interactive sessions where MYND retrieves knowledge, reasons over goals, and proposes autonomous actions.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            isLoading={isCreating}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleCreateConversation}
          >
            New Conversation
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : conversations.length > 0 ? (
          <Surface variant="primary" className="divide-y divide-[var(--border-subtle)] overflow-hidden">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => router.push(`/spaces/${spaceId}/conversations/${conv.id}`)}
                className="p-4 flex items-center justify-between text-xs hover:bg-[var(--surface-hover)]/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--accent-surface)] text-[var(--accent-text)] shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-primary)] truncate text-sm">
                      {conv.title || "Untitled Conversation"}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{conv.created_at ? new Date(conv.created_at).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <IconButton
                    label="Delete Thread"
                    size="sm"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--error-text)]" />
                  </IconButton>

                  <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </Surface>
        ) : (
          <EmptyState
            icon={<MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />}
            title="No conversations yet in this space"
            description="Start a multi-agent contextual thread to ask questions, analyze documents, and propose actions."
            actionLabel="Start First Thread"
            onAction={handleCreateConversation}
          />
        )}
      </div>
    </AppShell>
  );
}
