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
  const [activeTab, setActiveTab] = useState<"all" | "projects" | "goals" | "decisions">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [togglingGoalId, setTogglingGoalId] = useState<string | null>(null);

  // New Project State
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const created = await apiClient<ProjectItem>(`/api/v1/projects`, {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          name: newProjectName.trim(),
        }),
      });
      setProjects((prev) => [created, ...prev]);
      setNewProjectName("");
      setIsCreatingProject(false);
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Failed to create project.");
    }
  };

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Work Substrate */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-white truncate">
              Work & Initiatives Hub
            </h1>
            <p className="text-xs text-slate-400 truncate">
              Real outcomes, deliverables, and decisions executed in this space
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingProject(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </header>

        {/* Work Body */}
        <div className="flex-1 p-8 pb-16 max-w-7xl mx-auto w-full space-y-6 min-w-0">
          {/* New Project Modal Form */}
          {isCreatingProject && (
            <div className="rounded-2xl border border-white/[0.1] bg-[#0c0d12] p-4 space-y-3">
              <div className="text-xs font-semibold text-white">Create New Project</div>
              <form onSubmit={handleCreateProject} className="flex gap-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q4 Vector Search Migration"
                  autoFocus
                  className="flex-1 bg-[#12131a] text-sm text-white placeholder-slate-500 px-3.5 py-2 rounded-xl border border-white/[0.08] focus:border-white/20 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "all" ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All Work
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("projects")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "projects" ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Projects ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("goals")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "goals" ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Goals & Milestones ({goals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("decisions")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "decisions" ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Decisions Log ({decisions.length})
            </button>
          </div>

          {/* Projects Section */}
          {activeTab !== "goals" && activeTab !== "decisions" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-white">Active Projects</div>
              {projects.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-white/[0.08] text-center text-xs text-slate-500">
                  No projects active. Create a project or approve a proposal from a reasoning session.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((proj) => {
                    const projGoals = goals.filter((g) => g.project_id === proj.id);
                    const completed = projGoals.filter((g) => g.status === "completed").length;

                    return (
                      <Link
                        key={proj.id}
                        href={`/spaces/${spaceId}/work/projects/${proj.id}`}
                        className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-4 space-y-3 hover:border-white/20 transition-all text-decoration-none block group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="text-sm font-semibold text-white group-hover:text-[#818cf8] transition-colors truncate">
                              {proj.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {projGoals.length} {projGoals.length === 1 ? "milestone" : "milestones"} • {completed} completed
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/20">
                            {proj.status || "Active"}
                          </span>
                        </div>

                        {projGoals.length > 0 && (
                          <div className="w-full h-1 rounded-full bg-[#1b1b24] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#818cf8]"
                              style={{
                                width: `${Math.round((completed / projGoals.length) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Goals & Milestones Section */}
          {activeTab !== "projects" && activeTab !== "decisions" && (
            <div className="space-y-3 pt-4">
              <div className="text-xs font-semibold text-white">Tracked Milestones</div>
              {goals.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-white/[0.08] text-center text-xs text-slate-500">
                  No milestones tracked yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {goals.map((goal) => {
                    const isCompleted = goal.status === "completed";
                    const isToggling = togglingGoalId === goal.id;

                    return (
                      <div
                        key={goal.id}
                        className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0c0d12] flex items-center justify-between gap-3 hover:border-white/[0.12] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleGoal(goal)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500 hover:text-[#818cf8]" />
                            )}
                          </button>
                          <Link
                            href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                            className={`text-xs font-medium truncate hover:text-indigo-300 transition-colors ${
                              isCompleted ? "line-through text-slate-500" : "text-slate-200"
                            }`}
                          >
                            {goal.description}
                          </Link>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono uppercase text-slate-500">
                            {goal.status}
                          </span>
                          <Link
                            href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                            title="Inspect milestone"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Decisions Section */}
          {(activeTab === "all" || activeTab === "decisions") && (
            <div className="space-y-3 pt-4">
              <div className="text-xs font-semibold text-white">Decisions & Proposals Log</div>
              {decisions.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-white/[0.08] text-center text-xs text-slate-500">
                  No decision proposals recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {decisions.map((dec) => {
                    const isExecuted = dec.status === "executed";
                    const title =
                      dec.parameters?.name ||
                      dec.parameters?.description ||
                      dec.reason ||
                      `${dec.action_type.replace(/_/g, " ")} Proposal`;

                    return (
                      <div
                        key={dec.id}
                        className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0c0d12] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-mono uppercase bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                              {dec.action_type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                              {title}
                            </span>
                          </div>
                          {dec.reason && (
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {dec.reason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md ${
                              isExecuted
                                ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
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
        </div>
      </main>
    </div>
  );
}
