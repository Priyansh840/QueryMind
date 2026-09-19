"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { ProjectItem, GoalItem, ActionProposal, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  Layers,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock,
  ExternalLink,
  Target,
  Sparkles,
  Zap,
  TrendingUp,
  Cpu,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  FolderGit2,
} from "lucide-react";

interface WorkPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function WorkPage({ params }: WorkPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [decisions, setDecisions] = useState<ActionProposal[]>([]);
  
  // 4 Primary Sub-Pillars for Work
  const [activeTab, setActiveTab] = useState<"initiatives" | "milestones" | "decisions" | "workflows">("initiatives");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [togglingGoalId, setTogglingGoalId] = useState<string | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // New Project State
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  const loadWorkData = async () => {
    try {
      const [spaceRes, projsRes, goalsRes, decisionsRes] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<ProjectItem[]>(`/api/v1/projects?space_id=${spaceId}`).catch(() => []),
        apiClient<GoalItem[]>(`/api/v1/goals`).catch(() => []),
        apiClient<{ items: ActionProposal[] }>(`/api/v1/actions?space_id=${spaceId}&limit=50`).catch(
          () => ({ items: [] })
        ),
      ]);

      if (spaceRes) setSpace(spaceRes);
      setProjects(projsRes || []);

      const projectIds = new Set((projsRes || []).map((p) => p.id));
      const spaceGoals = (goalsRes || []).filter((g) => g.project_id && projectIds.has(g.project_id));
      setGoals(spaceGoals.length > 0 ? spaceGoals : goalsRes || []);
      setDecisions(decisionsRes.items || []);
    } catch (err) {
      console.error("Failed to load work data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkData();
  }, [spaceId]);

  // Toggle Goal / Milestone
  const handleToggleGoal = async (goal: GoalItem) => {
    setTogglingGoalId(goal.id);
    const newStatus = goal.status === "completed" ? "active" : "completed";
    try {
      await apiClient<GoalItem>(`/api/v1/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, status: newStatus } : g))
      );
    } catch (err) {
      console.error("Failed to toggle goal status:", err);
      alert("Failed to update milestone status.");
    } finally {
      setTogglingGoalId(null);
    }
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const created = await apiClient<ProjectItem>(`/api/v1/projects`, {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined,
        }),
      });
      setProjects((prev) => [created, ...prev]);
      setNewProjectName("");
      setNewProjectDesc("");
      setIsCreatingProject(false);
    } catch (err) {
      console.error("Failed to create initiative:", err);
      alert("Failed to create initiative.");
    }
  };

  // Approve Decision Action
  const handleApproveAction = async (proposalId: string) => {
    setExecutingActionId(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/approve`, { method: "POST" });
      setDecisions((prev) =>
        prev.map((d) =>
          d.id === proposalId || d.proposal_id === proposalId
            ? { ...d, status: "executed" }
            : d
        )
      );
    } catch (err) {
      console.error("Failed to approve decision:", err);
      alert("Failed to execute proposal.");
    } finally {
      setExecutingActionId(null);
    }
  };

  // Metrics Calculations
  const completedGoalsCount = goals.filter((g) => g.status === "completed").length;
  const velocityPercentage = goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0;
  const executedDecisionsCount = decisions.filter((d) => d.status === "executed").length;
  const pendingDecisionsCount = decisions.filter((d) => d.status === "pending").length;

  // Filtered Goals
  const filteredGoals = selectedProjectFilter === "all"
    ? goals
    : goals.filter((g) => g.project_id === selectedProjectFilter);

  return (
    <div className="h-screen w-screen bg-[#07070a] text-slate-100 flex overflow-hidden select-none font-sans antialiased">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Executive Work Hub */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#09090d]">
        {/* Top Header */}
        <header className="h-16 px-8 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-[#0c0d14]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight truncate flex items-center gap-2">
                <span>Work & Initiatives</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                  OPERATIONAL HUB
                </span>
              </h1>
              <p className="text-xs text-slate-400 truncate">
                Deliverables, milestones, authorized governance, and background execution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreatingProject(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Initiative</span>
            </button>
          </div>
        </header>

        {/* Executive Velocity Strip */}
        <div className="px-8 py-3.5 border-b border-white/[0.06] bg-[#0a0a0f] grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">{projects.length} Initiatives</div>
              <div className="text-[10px] text-slate-400">Active projects in space</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {completedGoalsCount}/{goals.length} Milestones ({velocityPercentage}%)
              </div>
              <div className="w-24 h-1 bg-white/[0.08] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${velocityPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {executedDecisionsCount} Authorized
              </div>
              <div className="text-[10px] text-slate-400">
                {pendingDecisionsCount > 0 ? `${pendingDecisionsCount} pending approval` : "All decisions aligned"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Autonomous</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[10px] text-slate-400">Subagent pipeline ready</div>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="px-8 pt-3 pb-3 border-b border-white/[0.06] bg-[#09090d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-[#12131b] border border-white/[0.08] rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("initiatives")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "initiatives"
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Initiatives</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-slate-300">
                {projects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("milestones")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "milestones"
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Milestones</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-slate-300">
                {goals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("decisions")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "decisions"
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Decisions & Audit</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-slate-300">
                {decisions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("workflows")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "workflows"
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Workflows</span>
            </button>
          </div>

          {/* Project Filter for Milestones */}
          {activeTab === "milestones" && projects.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Initiative:</span>
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                aria-label="Filter milestones by initiative"
                className="bg-[#12131c] text-xs text-white px-2.5 py-1 rounded-lg border border-white/[0.08] focus:outline-hidden"
              >
                <option value="all">All Initiatives</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Work Content Viewport */}
        <div className="flex-1 p-8 pb-16 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          {/* Inline Project Creator Drawer */}
          {isCreatingProject && (
            <div className="rounded-2xl border border-white/[0.1] bg-[#0c0d14] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-emerald-400" />
                  <span>Launch New Initiative</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-3">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Initiative Title (e.g. Real-Time Neural Knowledge Map)"
                  autoFocus
                  className="w-full bg-[#11121b] text-xs text-white placeholder-slate-500 px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:border-emerald-400/50 focus:outline-hidden"
                />
                <input
                  type="text"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Brief objective or deliverable scope (optional)"
                  className="w-full bg-[#11121b] text-xs text-white placeholder-slate-500 px-3.5 py-2 rounded-xl border border-white/[0.08] focus:border-emerald-400/50 focus:outline-hidden"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newProjectName.trim()}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Launch Initiative
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 1: Initiatives */}
          {activeTab === "initiatives" && (
            <div className="space-y-4">
              {projects.length === 0 ? (
                <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-3 bg-[#0c0d14]/40">
                  <FolderGit2 className="w-10 h-10 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold text-white">No initiatives launched yet</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Initiatives organize milestones, autonomous tasks, and verifiable outcomes in this space.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(true)}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Initiative</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((proj) => {
                    const projGoals = goals.filter((g) => g.project_id === proj.id);
                    const completed = projGoals.filter((g) => g.status === "completed").length;
                    const pct = projGoals.length > 0 ? Math.round((completed / projGoals.length) * 100) : 0;

                    return (
                      <Link
                        key={proj.id}
                        href={`/spaces/${spaceId}/work/projects/${proj.id}`}
                        className="rounded-2xl border border-white/[0.07] bg-[#0c0d14] p-5 space-y-4 hover:border-emerald-500/40 hover:bg-[#0f1019] transition-all text-decoration-none block group shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate flex items-center gap-2">
                              <span>{proj.name}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                            {(proj as any).description && (
                              <p className="text-xs text-slate-400 line-clamp-1">
                                {(proj as any).description}
                              </p>
                            )}
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                            {proj.status || "Active"}
                          </span>
                        </div>

                        {/* Progress Bar & Milestones Count */}
                        <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">
                              {projGoals.length} {projGoals.length === 1 ? "Milestone" : "Milestones"}
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {completed}/{projGoals.length} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Milestones */}
          {activeTab === "milestones" && (
            <div className="space-y-3">
              {filteredGoals.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-2 bg-[#0c0d14]/40">
                  <Target className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-semibold text-white">No milestones found</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Milestones are created directly or authorized from agent reasoning sessions.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredGoals.map((goal) => {
                    const isCompleted = goal.status === "completed";
                    const isToggling = togglingGoalId === goal.id;
                    const parentProj = projects.find((p) => p.id === goal.project_id);

                    return (
                      <div
                        key={goal.id}
                        className="p-4 rounded-xl border border-white/[0.07] bg-[#0c0d14] flex items-center justify-between gap-4 hover:border-white/[0.14] transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleGoal(goal)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-500 hover:text-emerald-400 transition-colors" />
                            )}
                          </button>

                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                              className={`text-xs font-semibold truncate block hover:text-emerald-300 transition-colors ${
                                isCompleted ? "line-through text-slate-500" : "text-slate-200"
                              }`}
                            >
                              {goal.description}
                            </Link>
                            {parentProj && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span>{parentProj.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md ${
                              isCompleted
                                ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                                : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                            }`}
                          >
                            {goal.status}
                          </span>
                          <Link
                            href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                            title="Inspect milestone"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Decisions & Governance */}
          {activeTab === "decisions" && (
            <div className="space-y-3">
              {decisions.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-2 bg-[#0c0d14]/40">
                  <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-semibold text-white">No decisions recorded yet</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    When MYND proposes action plans in conversations, all authorized and rejected decisions are forensically logged here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {decisions.map((dec) => {
                    const isExecuted = dec.status === "executed";
                    const isPending = dec.status === "pending";
                    const isExecuting = executingActionId === dec.id || executingActionId === dec.proposal_id;
                    const title =
                      dec.parameters?.name ||
                      dec.parameters?.description ||
                      dec.reason ||
                      `${dec.action_type.replace(/_/g, " ")} Proposal`;

                    return (
                      <div
                        key={dec.id}
                        className="p-4.5 rounded-2xl border border-white/[0.07] bg-[#0c0d14] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 font-bold">
                              {dec.action_type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                              {title}
                            </span>
                          </div>
                          {dec.reason && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {dec.reason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {isPending && (
                            <button
                              type="button"
                              disabled={isExecuting}
                              onClick={() => handleApproveAction(dec.id || dec.proposal_id || "")}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isExecuting ? "Executing..." : "Authorize"}</span>
                            </button>
                          )}

                          <span
                            className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-lg ${
                              isExecuted
                                ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-bold"
                                : isPending
                                ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                                : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                            }`}
                          >
                            {dec.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Autonomous Workflows */}
          {activeTab === "workflows" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <span>Autonomous Background Pipelines</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Multi-agent workflows running asynchronously across documents and tasks
                    </p>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                    DISPATCH ENGINE ACTIVE
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#11121b] border border-white/[0.06] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-white">
                      Workflow Pipeline Inspector
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Inspect step traces, subprocess execution logs, and validation checkpoints
                    </div>
                  </div>
                  <Link
                    href={`/spaces/${spaceId}/tasks/wf-active-inspection`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors"
                  >
                    <span>Open Inspector</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
