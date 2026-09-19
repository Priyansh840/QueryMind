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
import {
  ProjectItem,
  GoalItem,
  ActionProposal,
  ActionProposalListResponse,
  Space,
} from "@/types/api";
import {
  Folder,
  ArrowLeft,
  RefreshCw,
  Clock,
  Target,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface ProjectDetailPageProps {
  params: Promise<{ spaceId: string; projectId: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const resolvedParams = use(params);
  const { spaceId, projectId } = resolvedParams;

  const [space, setSpace] = useState<Space | null>(null);
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [originatingDecision, setOriginatingDecision] = useState<ActionProposal | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);

  const loadProjectData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [spaceData, projectData, goalsData, actionsData] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<ProjectItem>(`/api/v1/projects/${projectId}`),
        apiClient<GoalItem[]>(`/api/v1/goals?project_id=${projectId}`).catch(() => []),
        apiClient<ActionProposalListResponse>(`/api/v1/actions?space_id=${spaceId}&limit=50`).catch(
          () => ({ items: [], total: 0, limit: 50, offset: 0 })
        ),
      ]);

      if (projectData.space_id !== spaceId) {
        throw new Error("This project does not belong to the selected space.");
      }

      if (spaceData) setSpace(spaceData);
      setProject(projectData);
      setGoals(goalsData || []);

      // Deterministic Authoritative Match: executed_target_id == projectId
      const matchedDecision = actionsData.items.find(
        (a: ActionProposal) => a.executed_target_id === projectId
      );
      setOriginatingDecision(matchedDecision || null);
    } catch (err: any) {
      console.error("Failed to load project details:", err);
      setError(err?.message || "Project not found or unauthorized.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [spaceId, projectId]);

  // Handle real goal status toggle via existing PATCH /api/v1/goals/{id}
  const handleToggleGoalStatus = async (goal: GoalItem) => {
    const newStatus = goal.status === "completed" ? "active" : "completed";
    setUpdatingGoalId(goal.id);
    try {
      const updated = await apiClient<GoalItem>(`/api/v1/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (err: any) {
      console.error("Failed to update goal status:", err);
      alert(err?.message || "Failed to update goal status.");
    } finally {
      setUpdatingGoalId(null);
    }
  };

  if (isLoading && !project) {
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

  if (error || !project) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            icon={<AlertCircle className="w-8 h-8 text-[var(--error-text)]" />}
            title="Project Not Found"
            description={error || "The requested project could not be found or you do not have permission to view it."}
            actionLabel="Return to Work"
            onAction={() => {
              window.location.href = `/spaces/${spaceId}/work`;
            }}
          />
        </div>
      </AppShell>
    );
  }

  const completedGoals = goals.filter((g) => g.status === "completed");
  const pendingGoals = goals.filter((g) => g.status !== "completed");

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
              Project Detail
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadProjectData(true)}
              disabled={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* =========================================================================
            1. WHAT? — Objective, Name & Status
            ========================================================================= */}
        <Surface variant="primary" className="p-6 border-l-4 border-l-[var(--accent-primary)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                  Project Initiative
                </span>
                <Badge variant={project.status === "active" ? "default" : "outline"} size="sm">
                  {project.status}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {project.name}
              </h1>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] shrink-0 self-start">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created {formatRelativeTime(project.created_at)}</span>
            </div>
          </div>
        </Surface>

        {/* =========================================================================
            2. WHY? — Originating Decision & Evidence Provenance
            ========================================================================= */}
        <section aria-labelledby="why-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 id="why-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
              Why this exists (Origin & Governance)
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
                This project does not have a recorded decision trace in this space.
              </p>
            </Surface>
          )}
        </section>

        {/* =========================================================================
            3. WHAT BELONGS TO IT? — Associated Goals & Outcomes
            ========================================================================= */}
        <section aria-labelledby="goals-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--accent-primary)]" />
              <h2 id="goals-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                Associated Goals
              </h2>
            </div>
            {goals.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {completedGoals.length} of {goals.length} completed
              </span>
            )}
          </div>

          {goals.length > 0 ? (
            <div className="space-y-2">
              {goals.map((goal) => {
                const isCompleted = goal.status === "completed";
                const isUpdating = updatingGoalId === goal.id;
                return (
                  <Surface
                    key={goal.id}
                    variant="primary"
                    className="p-3.5 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-mynd flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleGoalStatus(goal)}
                        className="text-[var(--text-muted)] hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                        title={isCompleted ? "Mark as active" : "Mark as completed"}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <span
                          className={`text-xs font-medium block truncate ${
                            isCompleted
                              ? "line-through text-[var(--text-muted)]"
                              : "text-[var(--text-primary)]"
                          }`}
                        >
                          {goal.description}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Created {formatRelativeTime(goal.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={isCompleted ? "default" : "outline"} size="sm">
                        {goal.status}
                      </Badge>
                      <Link href={`/spaces/${spaceId}/work/goals/${goal.id}`}>
                        <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                          Detail
                        </Button>
                      </Link>
                    </div>
                  </Surface>
                );
              })}
            </div>
          ) : (
            <Surface variant="primary" className="p-6 text-center border border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-secondary)]">
                No goals currently associated with this project.
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Goals can be linked to this project during MYND reasoning sessions.
              </p>
            </Surface>
          )}
        </section>

        {/* =========================================================================
            4. WHAT NEXT? — Remaining Incomplete Work
            ========================================================================= */}
        {pendingGoals.length > 0 && (
          <section aria-labelledby="next-heading" className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
              <h2 id="next-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                What Needs Attention Next
              </h2>
            </div>

            <Surface variant="secondary" className="p-4 border border-[var(--border-subtle)] space-y-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {pendingGoals.length} pending {pendingGoals.length === 1 ? "goal" : "goals"} to complete:
              </span>
              <ul className="space-y-1.5 pt-1 text-xs text-[var(--text-secondary)] list-disc list-inside">
                {pendingGoals.map((g) => (
                  <li key={g.id} className="truncate">
                    {g.description}
                  </li>
                ))}
              </ul>
            </Surface>
          </section>
        )}
      </div>
    </AppShell>
  );
}
