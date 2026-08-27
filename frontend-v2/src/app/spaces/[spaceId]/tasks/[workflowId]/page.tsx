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
import { apiClient } from "@/lib/api/client";
import { WorkflowDetail, WorkflowStepItem } from "@/types/api";
import { ActionProposalCard } from "@/components/chat/ActionProposalCard";
import {
  Cpu,
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  XCircle,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface WorkflowDetailPageProps {
  params: Promise<{ spaceId: string; workflowId: string }>;
}

export default function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const resolvedParams = use(params);
  const { spaceId, workflowId } = resolvedParams;

  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflow = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await apiClient<WorkflowDetail>(`/api/v1/workflows/${workflowId}`);
      setWorkflow(data);
    } catch (err: any) {
      console.error("Failed to load workflow:", err);
      setError(err?.message || "Failed to load workflow execution trace.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRetry = async () => {
    try {
      await apiClient(`/api/v1/workflows/${workflowId}/retry`, { method: "POST" });
      loadWorkflow(true);
    } catch (err: any) {
      alert(err?.message || "Failed to retry workflow");
    }
  };

  const handleCancel = async () => {
    try {
      await apiClient(`/api/v1/workflows/${workflowId}/cancel`, { method: "POST" });
      loadWorkflow(true);
    } catch (err: any) {
      alert(err?.message || "Failed to cancel workflow");
    }
  };

  useEffect(() => {
    loadWorkflow();
    const interval = setInterval(() => {
      if (workflow?.status === "running" || workflow?.status === "planning") {
        loadWorkflow(true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [workflowId, workflow?.status]);

  if (isLoading && !workflow) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error || !workflow) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            icon={<AlertCircle className="w-8 h-8 text-[var(--error-text)]" />}
            title="Workflow Not Found"
            description={error || "The requested workflow could not be loaded."}
            actionLabel="Return to Tasks"
            onAction={() => {
              window.location.href = `/spaces/${spaceId}/tasks`;
            }}
          />
        </div>
      </AppShell>
    );
  }

  const isRunning = workflow.status === "running" || workflow.status === "planning";
  const isFailed = workflow.status === "failed";
  const isCancelled = workflow.status === "cancelled";

  return (
    <AppShell>
      <div className="space-y-8 pb-16 max-w-5xl mx-auto">
        {/* Navigation Breadcrumbs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/spaces/${spaceId}/tasks`}>
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                All Tasks
              </Button>
            </Link>
            <span className="text-xs text-[var(--border-strong)]">/</span>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Autonomous Execution Trace
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadWorkflow(true)}
              disabled={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            {isFailed && (
              <Button variant="outline" size="sm" onClick={handleRetry} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            )}
            {isRunning && (
              <Button variant="outline" size="sm" onClick={handleCancel} leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* SECTION 1: WORKFLOW BRIEF */}
        <Surface variant="primary" className="p-6 border-l-4 border-l-[var(--accent-primary)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                  LangGraph Orchestration Objective
                </span>
                <StatusIndicator status={workflow.status as any} label={workflow.status} size="sm" />
                <Badge variant="outline" size="sm">
                  {workflow.steps.length} Steps
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {workflow.goal}
              </h1>
            </div>
            <div className="text-xs text-[var(--text-muted)] shrink-0 self-start">
              {formatRelativeTime(workflow.created_at)}
            </div>
          </div>
        </Surface>

        {/* SECTION 2: PENDING ACTION PROPOSALS (Human In The Loop) */}
        {workflow.pending_actions && workflow.pending_actions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Required Human Approval
              </h2>
            </div>
            {workflow.pending_actions.map((act) => (
              <ActionProposalCard
                key={act.id || act.proposal_id}
                proposal={act as any}
                onStatusChange={() => loadWorkflow(true)}
              />
            ))}
          </div>
        )}

        {/* SECTION 3: STEP-BY-STEP EXECUTION TRACE */}
        <section aria-labelledby="steps-trace-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="steps-trace-heading" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Multi-Agent Step Pipeline
            </h2>
          </div>

          <div className="space-y-3">
            {workflow.steps.map((step) => {
              const isStepDone = step.status === "completed";
              const isStepRunning = step.status === "running" || step.status === "pending" && isRunning;
              const isStepFailed = step.status === "failed";

              return (
                <Surface
                  key={step.id}
                  variant="primary"
                  className={`p-4 border-l-4 ${
                    isStepDone
                      ? "border-l-emerald-500"
                      : isStepFailed
                      ? "border-l-rose-500"
                      : isStepRunning
                      ? "border-l-[var(--accent-primary)]"
                      : "border-l-[var(--border-strong)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-1.5 rounded-[var(--radius-xs)] shrink-0 mt-0.5 ${
                          isStepDone
                            ? "bg-emerald-500/10 text-emerald-400"
                            : isStepFailed
                            ? "bg-rose-500/10 text-rose-400"
                            : isStepRunning
                            ? "bg-[var(--surface-secondary)] text-[var(--accent-text)]"
                            : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                        }`}
                      >
                        {isStepDone ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isStepFailed ? (
                          <XCircle className="w-4 h-4" />
                        ) : isStepRunning ? (
                          <Cpu className="w-4 h-4 animate-pulse" />
                        ) : (
                          <span className="text-xs font-mono font-semibold px-0.5">{step.step_order}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {step.name}
                          </span>
                          <Badge variant="outline" size="sm">
                            {step.intent_type}
                          </Badge>
                          <StatusIndicator status={step.status as any} label={step.status} size="sm" />
                        </div>
                        {step.description && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Agent Runs */}
                  {step.agent_runs && step.agent_runs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                      <div className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">
                        Agent Execution Logs
                      </div>
                      {step.agent_runs.map((run) => (
                        <div
                          key={run.id}
                          className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)]/80 text-xs font-mono text-[var(--text-secondary)] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-[var(--text-primary)] capitalize">{run.agent_type}</span>
                            <span className="text-[var(--text-muted)] mx-2">—</span>
                            <span>{run.status}</span>
                          </div>
                          {run.completed_at && (
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {formatRelativeTime(run.completed_at)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Surface>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
