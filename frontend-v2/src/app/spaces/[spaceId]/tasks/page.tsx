"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiClient } from "@/lib/api/client";
import { WorkflowListItem } from "@/types/api";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";
import { CreateWorkflowModal } from "@/components/workflows/CreateWorkflowModal";
import {
  Zap,
  Plus,
  RefreshCw,
  Cpu,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface TasksPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function TasksPage({ params }: TasksPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await apiClient<WorkflowListItem[]>(`/api/v1/workflows?space_id=${spaceId}`);
      setWorkflows(data || []);
    } catch (err: any) {
      console.error("Failed to load workflows:", err);
      setError(err?.message || "Failed to load workflows.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
    // Auto refresh every 5 seconds if there are running workflows
    const interval = setInterval(() => {
      const hasRunning = workflows.some((w) => w.status === "running" || w.status === "planning");
      if (hasRunning) {
        loadWorkflows(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [spaceId, workflows]);

  const activeWorkflows = workflows.filter((w) => w.status === "running" || w.status === "planning" || w.status === "awaiting_approval");
  const completedWorkflows = workflows.filter((w) => w.status === "completed");
  const otherWorkflows = workflows.filter((w) => w.status === "failed" || w.status === "cancelled");

  return (
    <AppShell>
      <div className="space-y-8 pb-16 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[var(--border-subtle)] pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-xl shrink-0 font-bold text-[var(--accent-primary)] shadow-sm">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Tasks & Autonomous Workflows
                </h1>
                <Badge variant="outline" size="sm">
                  LangGraph Orchestration
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                Multi-agent planning, knowledge retrieval, and safe action execution scoped to this Space.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadWorkflows(true)}
              disabled={isLoading || isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Launch Workflow
            </Button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <Surface variant="primary" className="p-4 border-l-4 border-l-[var(--error-border)] bg-[var(--error-surface)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[var(--error-text)]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadWorkflows()}>
                Retry
              </Button>
            </div>
          </Surface>
        )}

        {/* SECTION 1: ACTIVE / RUNNING WORKFLOWS */}
        <section aria-labelledby="active-workflows-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <h2 id="active-workflows-heading" className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                Active Execution ({activeWorkflows.length})
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : activeWorkflows.length > 0 ? (
            <div className="space-y-3">
              {activeWorkflows.map((w) => (
                <WorkflowCard key={w.id} workflow={w} spaceId={spaceId} />
              ))}
            </div>
          ) : (
            <Surface variant="primary" className="p-6 text-center border border-dashed border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-secondary)]">
                No active background workflows currently executing in this Space.
              </p>
            </Surface>
          )}
        </section>

        {/* SECTION 2: COMPLETED WORKFLOWS */}
        {completedWorkflows.length > 0 && (
          <section aria-labelledby="completed-workflows-heading" className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 id="completed-workflows-heading" className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                Completed Workflows ({completedWorkflows.length})
              </h2>
            </div>

            <div className="space-y-3">
              {completedWorkflows.map((w) => (
                <WorkflowCard key={w.id} workflow={w} spaceId={spaceId} />
              ))}
            </div>
          </section>
        )}

        {/* SECTION 3: FAILED / CANCELLED */}
        {otherWorkflows.length > 0 && (
          <section aria-labelledby="other-workflows-heading" className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--text-muted)]" />
              <h2 id="other-workflows-heading" className="text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                Terminated / Failed Workflows ({otherWorkflows.length})
              </h2>
            </div>

            <div className="space-y-3">
              {otherWorkflows.map((w) => (
                <WorkflowCard key={w.id} workflow={w} spaceId={spaceId} />
              ))}
            </div>
          </section>
        )}

        {workflows.length === 0 && !isLoading && (
          <Surface variant="primary" className="p-8 text-center border border-dashed border-[var(--border-subtle)]">
            <Cpu className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">No workflows created</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
              Define a high-level goal and let MYND plan, research, and execute the multi-agent workflow.
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Launch First Workflow
            </Button>
          </Surface>
        )}
      </div>

      <CreateWorkflowModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        spaceId={spaceId}
        onWorkflowCreated={() => loadWorkflows(true)}
      />
    </AppShell>
  );
}
