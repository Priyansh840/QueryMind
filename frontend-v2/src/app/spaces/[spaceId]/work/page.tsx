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
  WorkflowListItem,
  Space,
} from "@/types/api";
import { DecisionCard } from "@/components/decisions/DecisionCard";
import {
  CheckSquare,
  Target,
  Layers,
  ArrowRight,
  RefreshCw,
  Clock,
  Cpu,
  AlertCircle,
  Folder,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface WorkPageProps {
  params: Promise<{ spaceId: string }>;
}

type FilterTab = "all" | "projects" | "goals" | "decisions" | "background";

export default function WorkPage({ params }: WorkPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const [space, setSpace] = useState<Space | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [actions, setActions] = useState<ActionProposal[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [spaceData, projectsData, goalsData, actionsData, workflowsData] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<ProjectItem[]>(`/api/v1/projects?space_id=${spaceId}`).catch(() => []),
        apiClient<GoalItem[]>(`/api/v1/goals`).catch(() => []),
        apiClient<ActionProposalListResponse>(`/api/v1/actions?space_id=${spaceId}&limit=50`).catch(() => ({
          items: [],
          total: 0,
          limit: 50,
          offset: 0,
        })),
        apiClient<WorkflowListItem[]>(`/api/v1/workflows?space_id=${spaceId}`).catch(() => []),
      ]);

      if (spaceData) setSpace(spaceData);
      setProjects(projectsData || []);

      // Filter goals strictly isolated to this space:
      // Either linked to a project in this space, or created by an action executed in this space
      const projectIds = new Set((projectsData || []).map((p: ProjectItem) => p.id));
      const spaceActionGoalTargetIds = new Set(
        (actionsData?.items || [])
          .filter((a: ActionProposal) => a.action_type === "create_goal" && a.executed_target_id)
          .map((a: ActionProposal) => a.executed_target_id)
      );
      const spaceGoals = (goalsData || []).filter(
        (g: GoalItem) =>
          (g.project_id && projectIds.has(g.project_id)) ||
          spaceActionGoalTargetIds.has(g.id)
      );
      setGoals(spaceGoals);

      setActions(actionsData?.items || []);
      setWorkflows(workflowsData || []);
    } catch (err: any) {
      console.error("Failed to load work data:", err);
      setError(err?.message || "Failed to load initiatives and work.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkData();
  }, [spaceId]);

  // Derived counts for filters
  const pendingActions = actions.filter((a) => a.status === "pending");
  const recordedDecisions = actions.filter((a) => a.status !== "pending");
  const runningWorkflows = workflows.filter(
    (w) => w.status === "running" || w.status === "planning" || w.status === "awaiting_approval"
  );

  const filterTabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "all", label: "All Work" },
    { id: "projects", label: "Projects", count: projects.length },
    { id: "goals", label: "Goals", count: goals.length },
    { id: "decisions", label: "Decisions", count: actions.length },
    { id: "background", label: "Background Work", count: workflows.length },
  ];

  if (isLoading && !space && projects.length === 0) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 pb-16 max-w-6xl mx-auto">
        {/* =========================================================================
            1. HEADER
            ========================================================================= */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-b border-[var(--border-subtle)] pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-xl shrink-0 font-bold text-[var(--accent-primary)] shadow-sm">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Work & Initiatives
                </h1>
                <span className="text-xs text-[var(--text-muted)]">•</span>
                <span className="text-xs font-semibold text-[var(--accent-text)]">
                  {space?.name || "Workspace"}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-xl leading-relaxed">
                What the team is working toward and what has already been decided.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadWorkData(true)}
              disabled={isLoading || isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <Surface variant="primary" className="p-3.5 border-l-4 border-l-[var(--error-border)] bg-[var(--error-surface)]">
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--error-text)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadWorkData()}>
                Retry
              </Button>
            </div>
          </Surface>
        )}

        {/* Filter Navigation Bar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-[var(--radius-sm)] font-medium transition-mynd flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-[var(--accent-primary)]/20 text-[var(--accent-text)] font-semibold"
                        : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            SECTION 1: ACTIVE WORK (Projects & Goals)
            ========================================================================= */}
        {(activeFilter === "all" || activeFilter === "projects" || activeFilter === "goals") && (
          <section aria-labelledby="active-work-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 id="active-work-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  Active Work
                </h2>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {projects.length} {projects.length === 1 ? "Project" : "Projects"} • {goals.length}{" "}
                {goals.length === 1 ? "Goal" : "Goals"}
              </span>
            </div>

            {projects.length > 0 || goals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Projects */}
                {(activeFilter === "all" || activeFilter === "projects") &&
                  projects.map((project) => {
                    const projectGoals = goals.filter((g) => g.project_id === project.id);
                    return (
                      <Surface
                        key={project.id}
                        variant="primary"
                        className="p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-mynd flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                  Project
                                </span>
                                <Badge variant={project.status === "active" ? "default" : "outline"} size="sm">
                                  {project.status}
                                </Badge>
                              </div>
                              <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                                {project.name}
                              </h3>
                            </div>
                            <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                              {formatRelativeTime(project.created_at)}
                            </span>
                          </div>

                          {projectGoals.length > 0 && (
                            <div className="pt-1 text-[11px] text-[var(--text-secondary)]">
                              <span>{projectGoals.length} associated {projectGoals.length === 1 ? "goal" : "goals"}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[var(--text-muted)]">Tracked Outcome</span>
                          <Link
                            href={`/spaces/${spaceId}/work/projects/${project.id}`}
                            className="text-[var(--accent-text)] hover:underline flex items-center gap-1 font-semibold"
                          >
                            Open Project <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </Surface>
                    );
                  })}

                {/* Goals */}
                {(activeFilter === "all" || activeFilter === "goals") &&
                  goals.map((goal) => {
                    const parentProject = projects.find((p) => p.id === goal.project_id);
                    return (
                      <Surface
                        key={goal.id}
                        variant="primary"
                        className="p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-mynd flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                  Goal
                                </span>
                                <Badge variant={goal.status === "active" ? "default" : "outline"} size="sm">
                                  {goal.status}
                                </Badge>
                              </div>
                              <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1 leading-snug">
                                {goal.description}
                              </h3>
                            </div>
                            <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                              {formatRelativeTime(goal.created_at)}
                            </span>
                          </div>

                          {parentProject && (
                            <div className="pt-1 text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                              <span className="text-[var(--text-muted)]">Part of:</span>
                              <span className="font-medium text-[var(--text-primary)]">{parentProject.name}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[var(--text-muted)]">Target Outcome</span>
                          <Link
                            href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                            className="text-[var(--accent-text)] hover:underline flex items-center gap-1 font-semibold"
                          >
                            Open Goal <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </Surface>
                    );
                  })}
              </div>
            ) : (
              <Surface variant="primary" className="p-6 text-center border border-[var(--border-subtle)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  No active initiatives yet.
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                  Projects and goals appear here when decisions turn into tracked work. Use the Space Overview to
                  ask MYND a question and approve an initiative proposal.
                </p>
              </Surface>
            )}
          </section>
        )}

        {/* =========================================================================
            SECTION 2: DECISIONS (Recorded Choices & Rationale)
            ========================================================================= */}
        {(activeFilter === "all" || activeFilter === "decisions") && (
          <section aria-labelledby="decisions-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 id="decisions-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  Decisions
                </h2>
                {pendingActions.length > 0 && (
                  <Badge variant="accent" size="sm">
                    {pendingActions.length} Pending
                  </Badge>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {actions.length} {actions.length === 1 ? "Record" : "Records"}
              </span>
            </div>

            {actions.length > 0 ? (
              <div className="space-y-3">
                {actions.map((proposal) => (
                  <DecisionCard
                    key={proposal.id || proposal.proposal_id}
                    proposal={proposal}
                    spaceId={spaceId}
                    onStatusChange={() => loadWorkData(true)}
                  />
                ))}
              </div>
            ) : (
              <Surface variant="primary" className="p-6 text-center border border-[var(--border-subtle)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  No decisions recorded yet.
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                  Important choices made with MYND can be preserved with their rationale and evidence.
                  When MYND synthesizes options in a session, you can sign off and record the decision here.
                </p>
              </Surface>
            )}
          </section>
        )}

        {/* =========================================================================
            SECTION 3: BACKGROUND WORK (Long-Running MYND Requests)
            ========================================================================= */}
        {(activeFilter === "all" || activeFilter === "background") && (
          <section aria-labelledby="background-work-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 id="background-work-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  Background Work
                </h2>
                {runningWorkflows.length > 0 && (
                  <Badge variant="default" size="sm">
                    {runningWorkflows.length} Running
                  </Badge>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {workflows.length} {workflows.length === 1 ? "Job" : "Jobs"}
              </span>
            </div>

            {workflows.length > 0 ? (
              <div className="space-y-2.5">
                {workflows.map((wf) => {
                  const isRunning = wf.status === "running" || wf.status === "planning";
                  const isCompleted = wf.status === "completed";
                  const isAwaiting = wf.status === "awaiting_approval";

                  const humanStatus = isRunning
                    ? "MYND is researching"
                    : isCompleted
                    ? "Research completed"
                    : isAwaiting
                    ? "Needs your review"
                    : wf.status;

                  return (
                    <Surface
                      key={wf.id}
                      variant="primary"
                      className={`p-3.5 border transition-mynd flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isRunning
                          ? "border-l-4 border-l-[var(--accent-primary)] bg-[var(--surface-primary)]"
                          : "border-[var(--border-subtle)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-[var(--radius-xs)] shrink-0 ${
                            isRunning
                              ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                              : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                          }`}
                        >
                          <Cpu className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {wf.goal}
                            </span>
                            <StatusIndicator status={wf.status as any} label={humanStatus} size="sm" />
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-1">
                            {wf.steps_count > 0 && (
                              <span>
                                Step {wf.completed_steps_count} of {wf.steps_count}
                                {wf.current_step ? ` • ${wf.current_step}` : ""}
                              </span>
                            )}
                            <span>{formatRelativeTime(wf.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Link href={`/spaces/${spaceId}/tasks/${wf.id}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                            {isRunning ? "View Progress" : "Execution Details"}
                          </Button>
                        </Link>
                      </div>
                    </Surface>
                  );
                })}
              </div>
            ) : (
              <Surface variant="primary" className="p-6 text-center border border-[var(--border-subtle)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  No background work right now.
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                  Long-running MYND requests will appear here while they're being processed.
                </p>
              </Surface>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
