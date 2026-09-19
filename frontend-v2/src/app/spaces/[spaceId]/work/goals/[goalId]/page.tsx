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
import {
  GoalItem,
  ProjectItem,
  ActionProposal,
  ActionProposalListResponse,
  Space,
} from "@/types/api";
import {
  Target,
  ArrowLeft,
  RefreshCw,
  Clock,
  Folder,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Calendar,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface GoalDetailPageProps {
  params: Promise<{ spaceId: string; goalId: string }>;
}

export default function GoalDetailPage({ params }: GoalDetailPageProps) {
  const resolvedParams = use(params);
  const { spaceId, goalId } = resolvedParams;

  const [space, setSpace] = useState<Space | null>(null);
  const [goal, setGoal] = useState<GoalItem | null>(null);
  const [parentProject, setParentProject] = useState<ProjectItem | null>(null);
  const [originatingDecision, setOriginatingDecision] = useState<ActionProposal | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadGoalData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [spaceData, goalData, actionsData] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<GoalItem>(`/api/v1/goals/${goalId}`),
        apiClient<ActionProposalListResponse>(`/api/v1/actions?space_id=${spaceId}&limit=50`).catch(
          () => ({ items: [], total: 0, limit: 50, offset: 0 })
        ),
      ]);

      if (spaceData) setSpace(spaceData);
      setGoal(goalData);

      // Verify Space Isolation: Goal must either belong to a project in this space,
      // or have been created by an action proposal executed in this space.
      if (goalData.project_id) {
        try {
          const projData = await apiClient<ProjectItem>(`/api/v1/projects/${goalData.project_id}`);
          if (projData.space_id !== spaceId) {
            throw new Error("This goal belongs to another space.");
          }
          setParentProject(projData);
        } catch (err: any) {
          throw new Error(err?.message || "This goal belongs to another space or project is unavailable.");
        }
      } else {
        const wasCreatedInSpace = actionsData.items.some(
          (a: ActionProposal) => a.executed_target_id === goalId
        );
        if (!wasCreatedInSpace) {
          throw new Error("This goal does not belong to the selected space.");
        }
        setParentProject(null);
      }

      // Deterministic Authoritative Match: executed_target_id == goalId
      const matchedDecision = actionsData.items.find(
        (a: ActionProposal) => a.executed_target_id === goalId
      );
      setOriginatingDecision(matchedDecision || null);
    } catch (err: any) {
      console.error("Failed to load goal details:", err);
      setError(err?.message || "Goal not found or unauthorized.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadGoalData();
  }, [spaceId, goalId]);

  // Handle safe status toggle via existing PATCH /api/v1/goals/{id}
  const handleToggleStatus = async () => {
    if (!goal) return;
    const newStatus = goal.status === "completed" ? "active" : "completed";
    setIsUpdatingStatus(true);
    try {
      const updated = await apiClient<GoalItem>(`/api/v1/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setGoal(updated);
    } catch (err: any) {
      console.error("Failed to update goal status:", err);
      alert(err?.message || "Failed to update goal status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading && !goal) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error || !goal) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            icon={<AlertCircle className="w-8 h-8 text-[var(--error-text)]" />}
            title="Goal Not Found"
            description={error || "The requested goal could not be found or you do not have permission to view it."}
            actionLabel="Return to Work"
            onAction={() => {
              window.location.href = `/spaces/${spaceId}/work`;
            }}
          />
        </div>
      </AppShell>
    );
  }

  const isCompleted = goal.status === "completed";

  return (
    <AppShell>
      <div className="space-y-8 pb-16 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/spaces/${spaceId}/work`}>
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Work & Initiatives
              </Button>
            </Link>
            <span className="text-xs text-[var(--border-strong)]">/</span>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Goal Detail
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadGoalData(true)}
              disabled={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* =========================================================================
            1. WHAT? — Objective, Description & Status
            ========================================================================= */}
        <Surface variant="primary" className="p-6 border-l-4 border-l-emerald-500 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Tracked Goal
                </span>
                <Badge variant={isCompleted ? "success" : "default"} size="sm">
                  {goal.status}
                </Badge>
              </div>
              <h1 className={`text-2xl font-bold tracking-tight text-[var(--text-primary)] ${isCompleted ? "line-through opacity-75" : ""}`}>
                {goal.description}
              </h1>
            </div>

            <div className="flex flex-col sm:items-end gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Created {formatRelativeTime(goal.created_at)}</span>
              </div>

              {/* Real Goal Status Toggle */}
              <Button
                variant={isCompleted ? "outline" : "primary"}
                size="sm"
                onClick={handleToggleStatus}
                disabled={isUpdatingStatus}
                leftIcon={
                  isCompleted ? (
                    <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )
                }
              >
                {isUpdatingStatus
                  ? "Updating..."
                  : isCompleted
                  ? "Mark Active"
                  : "Mark Completed"}
              </Button>
            </div>
          </div>
        </Surface>

        {/* =========================================================================
            2. PART OF? — Associated Project Relationship
            ========================================================================= */}
        <section aria-labelledby="project-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 id="project-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
              Associated Project
            </h2>
          </div>

          {parentProject ? (
            <Surface variant="primary" className="p-5 border border-[var(--border-subtle)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Part of Project:</span>
                    <Badge variant={parentProject.status === "active" ? "default" : "outline"} size="sm">
                      {parentProject.status}
                    </Badge>
                  </div>
                  <div className="text-base font-semibold text-[var(--text-primary)]">
                    {parentProject.name}
                  </div>
                </div>

                <Link href={`/spaces/${spaceId}/work/projects/${parentProject.id}`}>
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View Project
                  </Button>
                </Link>
              </div>
            </Surface>
          ) : (
            <Surface variant="secondary" className="p-4 border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
              This goal is independent and not attached to a parent project initiative.
            </Surface>
          )}
        </section>

        {/* =========================================================================
            3. WHY? — Originating Decision & Evidence Provenance
            ========================================================================= */}
        <section aria-labelledby="why-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 id="why-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
              Origin & Decision Provenance
            </h2>
          </div>

          {originatingDecision ? (
            <Surface variant="primary" className="p-4 border border-[var(--border-subtle)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" size="sm">
                    Approved Decision
                  </Badge>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatRelativeTime(originatingDecision.created_at)}
                  </span>
                </div>

                <Link
                  href={`/spaces/${spaceId}/decisions/${originatingDecision.proposal_id || originatingDecision.id}`}
                  className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1 font-semibold"
                >
                  View Full Decision Trace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                  {originatingDecision.reason}
                </p>
              </div>

              {originatingDecision.conversation_id && (
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                  <Sparkles className="w-3 h-3 text-[var(--accent-text)]" />
                  <span>Originating Session:</span>
                  <Link
                    href={`/spaces/${spaceId}/conversations/${originatingDecision.conversation_id}`}
                    className="text-[var(--accent-text)] hover:underline font-medium"
                  >
                    Open Session Discussion
                  </Link>
                </div>
              )}
            </Surface>
          ) : (
            <Surface variant="secondary" className="p-4 border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Related decision information unavailable</span>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                This goal does not have a recorded decision trace in this space.
              </p>
            </Surface>
          )}
        </section>

        {/* =========================================================================
            4. ACTIVITY & STATUS AUDIT
            ========================================================================= */}
        <section aria-labelledby="activity-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 id="activity-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
              Record & Lifecycle
            </h2>
          </div>

          <Surface variant="primary" className="p-4 border border-[var(--border-subtle)]">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Goal Identifier:</span>
                <span className="font-mono text-[11px] text-[var(--text-secondary)]">{goal.id}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Current State:</span>
                <Badge variant={isCompleted ? "success" : "default"} size="sm">
                  {goal.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-[var(--text-muted)]">Recorded Timestamp:</span>
                <span className="text-[var(--text-secondary)]">{new Date(goal.created_at).toLocaleString()}</span>
              </div>
            </div>
          </Surface>
        </section>
      </div>
    </AppShell>
  );
}
