"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { SpaceWorkspaceSummary, ActionProposal } from "@/types/api";
import {
  Sparkles,
  FileText,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Plus,
  Compass,
  ArrowUpRight,
  Clock,
  Folder,
  Settings,
  Activity,
  CheckCircle2,
  Cpu,
  Layers,
  RefreshCw,
} from "lucide-react";
import { SpaceSettingsModal } from "@/components/spaces/SpaceSettingsModal";
import { ActionProposalCard } from "@/components/chat/ActionProposalCard";
import { DecisionCard } from "@/components/decisions/DecisionCard";
import { formatRelativeTime } from "@/lib/utils";

interface SpaceDetailPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceDetailPage({ params }: SpaceDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const { currentSpace, setCurrentSpace } = useAuth();
  const [workspace, setWorkspace] = useState<SpaceWorkspaceSummary | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaceData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const summary = await apiClient<SpaceWorkspaceSummary>(`/api/v1/spaces/${spaceId}/workspace`);
      setWorkspace(summary);
      if (currentSpace?.id !== summary.space.id) {
        setCurrentSpace(summary.space);
      }
    } catch (err: any) {
      console.error("Failed to load workspace data:", err);
      setError(err?.message || "Space workspace not found or unauthorized.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [spaceId]);

  const space = workspace?.space || currentSpace;
  const pendingActions = workspace?.pending_actions || [];
  const activeWork = workspace?.active_work || [];
  const activity = workspace?.recent_activity || [];
  const documents = workspace?.recent_documents || [];
  const conversations = workspace?.recent_conversations || [];
  const stats = workspace?.stats;

  if (isLoading && !workspace) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error && !workspace) {
    return (
      <AppShell>
        <EmptyState
          icon={<AlertCircle className="w-8 h-8 text-[var(--error-text)]" />}
          title="Space Not Found"
          description={error || "The requested space could not be found or you do not have permission to view it."}
          actionLabel="Return to Spaces"
          onAction={() => {
            window.location.href = "/spaces";
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 pb-16 max-w-7xl mx-auto">
        {/* Space Context Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[var(--border-subtle)] pb-6">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center text-xl shrink-0 font-bold shadow-sm"
              style={{
                backgroundColor: space?.color ? `${space.color}20` : "var(--surface-secondary)",
                color: space?.color || "var(--accent-primary)",
                border: `1px solid ${space?.color ? `${space.color}40` : "var(--border-subtle)"}`,
              }}
            >
              {space?.icon || "📁"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {space?.name || "Space Workspace"}
                </h1>
                {space?.is_default && (
                  <Badge variant="outline" size="sm">
                    Default Space
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                {space?.description || "Space-scoped intelligence, verified evidence, decisions, and multi-agent execution."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadWorkspaceData(true)}
              disabled={isLoading || isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            <Link href={`/spaces/${spaceId}/conversations`}>
              <Button variant="primary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                Ask MYND
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Space Settings"
            >
              <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
            </Button>
          </div>
        </div>

        {/* Global Error Banner if silent refresh failed */}
        {error && (
          <Surface variant="primary" className="p-4 border-l-4 border-l-[var(--error-border)] bg-[var(--error-surface)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[var(--error-text)]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadWorkspaceData()}>
                Retry
              </Button>
            </div>
          </Surface>
        )}

        {/* SECTION 1: WHAT MATTERS NOW (High Priority Decisions & Attention) */}
        <section aria-labelledby="what-matters-now-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <h2 id="what-matters-now-heading" className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                What Matters Now
              </h2>
            </div>
            {pendingActions.length > 0 && (
              <Badge variant="accent" size="sm">
                {pendingActions.length} Pending {pendingActions.length === 1 ? "Decision" : "Decisions"}
              </Badge>
            )}
          </div>

          {pendingActions.length > 0 ? (
            <div className="space-y-3">
              {pendingActions.map((proposal) => (
                <DecisionCard
                  key={proposal.id || proposal.proposal_id}
                  proposal={proposal}
                  spaceId={spaceId}
                />
              ))}
            </div>
          ) : (
            <Surface variant="primary" className="p-4 flex items-center justify-between gap-4 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">All decisions up to date</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    No pending action approvals or blocked workflows in this workspace.
                  </p>
                </div>
              </div>
              <Link href={`/spaces/${spaceId}/conversations`}>
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Start Conversation
                </Button>
              </Link>
            </Surface>
          )}
        </section>

        {/* SECTION 2 & 3: TWO-COLUMN DECISION & AGENT WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): What Changed? (Chronological Real Audit Stream) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--text-secondary)]" />
                <h2 className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  What Changed
                </h2>
              </div>
              <Link href={`/spaces/${spaceId}/activity`}>
                <span className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1 font-medium">
                  View Full Audit <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            {activity.length > 0 ? (
              <Surface variant="primary" className="p-2 divide-y divide-[var(--border-subtle)]">
                {activity.map((item) => (
                  <div key={item.id} className="p-3 hover:bg-[var(--surface-secondary)]/40 transition-mynd rounded-[var(--radius-sm)] flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--accent-text)] mt-0.5 shrink-0">
                        {item.type.includes("doc") ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : item.type.includes("action") ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {item.title}
                          </span>
                          {item.status && (
                            <Badge variant={item.status === "completed" || item.status === "approved" ? "default" : "outline"} size="sm">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                      {formatRelativeTime(item.created_at)}
                    </div>
                  </div>
                ))}
              </Surface>
            ) : (
              <Surface variant="primary" className="p-8 text-center border border-dashed border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  No activity recorded yet in this workspace. Upload documents or initiate conversations to begin.
                </p>
              </Surface>
            )}
          </div>

          {/* Right Column (5 cols): What is MYND Working On? + Active Work */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--text-secondary)]" />
                <h2 className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  Active MYND Work
                </h2>
              </div>
            </div>

            {activeWork.length > 0 ? (
              <Surface variant="primary" className="p-4 space-y-3 border-l-2 border-l-[var(--accent-primary)]">
                {activeWork.map((work) => (
                  <div key={work.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                          {work.agent_type} Agent
                        </span>
                        <StatusIndicator status="running" label={work.status} size="sm" />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
                        Task: {work.task_id || "Orchestration Pipeline"}
                      </p>
                    </div>
                  </div>
                ))}
              </Surface>
            ) : (
              <Surface variant="primary" className="p-6 text-center border border-[var(--border-subtle)]">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-2 text-[var(--text-muted)]">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">No active background tasks</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  MYND executes tasks on-demand during chat and document ingestion.
                </p>
              </Surface>
            )}

            {/* Quick Workspace Stats Box */}
            <Surface variant="secondary" className="p-4 space-y-3 border border-[var(--border-subtle)]">
              <div className="text-xs font-semibold text-[var(--text-primary)] tracking-wider uppercase">
                Workspace Scope Summary
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)]">Indexed Documents</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {stats?.documents_count ?? 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)]">Vector Chunks</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {stats?.chunks_count ?? 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)]">Conversations</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {stats?.conversations_count ?? 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)]">Decisions Needed</div>
                  <div className="text-base font-bold text-[var(--accent-text)] mt-0.5">
                    {stats?.pending_actions_count ?? 0}
                  </div>
                </div>
              </div>
            </Surface>
          </div>
        </div>

        {/* SECTION 4: CONTEXTUAL EVIDENCE & KNOWLEDGE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Knowledge Context */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
                <h2 className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  Grounding Knowledge
                </h2>
              </div>
              <Link href={`/spaces/${spaceId}/documents`}>
                <span className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1 font-medium">
                  All Documents ({stats?.documents_count ?? 0}) <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            {documents.length > 0 ? (
              <Surface variant="primary" className="p-2 divide-y divide-[var(--border-subtle)]">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/spaces/${spaceId}/documents`}
                    className="p-3 hover:bg-[var(--surface-secondary)]/50 transition-mynd rounded-[var(--radius-sm)] flex items-center justify-between gap-3 block"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {doc.title}
                      </span>
                    </div>
                    <Badge variant={doc.status === "completed" ? "default" : "outline"} size="sm">
                      {doc.type}
                    </Badge>
                  </Link>
                ))}
              </Surface>
            ) : (
              <Surface variant="primary" className="p-6 text-center border border-dashed border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  No documents ingested into this Space yet.
                </p>
                <Link href={`/spaces/${spaceId}/documents`}>
                  <Button variant="outline" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Upload Knowledge
                  </Button>
                </Link>
              </Surface>
            )}
          </div>

          {/* Recent Conversations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--text-secondary)]" />
                <h2 className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  Recent Conversations
                </h2>
              </div>
              <Link href={`/spaces/${spaceId}/conversations`}>
                <span className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1 font-medium">
                  All Threads <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            {conversations.length > 0 ? (
              <Surface variant="primary" className="p-2 divide-y divide-[var(--border-subtle)]">
                {conversations.map((c) => (
                  <Link
                    key={c.id}
                    href={`/spaces/${spaceId}/conversations/${c.id}`}
                    className="p-3 hover:bg-[var(--surface-secondary)]/50 transition-mynd rounded-[var(--radius-sm)] flex items-center justify-between gap-3 block"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {c.title || "Untitled Conversation"}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </Link>
                ))}
              </Surface>
            ) : (
              <Surface variant="primary" className="p-6 text-center border border-dashed border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  No conversation threads in this Space.
                </p>
                <Link href={`/spaces/${spaceId}/conversations`}>
                  <Button variant="outline" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                    New Conversation
                  </Button>
                </Link>
              </Surface>
            )}
          </div>
        </div>

        {/* SECTION 5: WHAT MYND IS LEARNING (Space Memory & Cross-Session Insights) */}
        <section aria-labelledby="learning-heading" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-text)]" />
              <h2 id="learning-heading" className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                What MYND is Learning
              </h2>
            </div>
            <Link href={`/spaces/${spaceId}/memory`}>
              <span className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1 font-medium">
                Explore Memory & Connections <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>

          <Surface variant="primary" className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-[var(--accent-primary)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Cross-Session Pattern Synthesis Active
                </span>
                <Badge variant="outline" size="sm">
                  Durable Space Memory
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                MYND continuously synthesizes persistent facts, recurring patterns, and decision linkages across your uploaded documents and conversations.
              </p>
            </div>
            <Link href={`/spaces/${spaceId}/memory`}>
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View Space Memory
              </Button>
            </Link>
          </Surface>
        </section>
      </div>

      {space && (
        <SpaceSettingsModal
          isOpen={isSettingsOpen}
          space={space}
          onClose={() => {
            setIsSettingsOpen(false);
            loadWorkspaceData(true);
          }}
          onDeleted={() => {
            window.location.href = "/spaces";
          }}
        />
      )}
    </AppShell>
  );
}
