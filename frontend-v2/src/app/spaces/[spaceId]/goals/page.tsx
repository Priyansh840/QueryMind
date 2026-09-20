"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { GoalItem, ProjectItem, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  ArrowRight,
  ChevronRight,
  FolderGit2,
  TrendingUp,
  X,
} from "lucide-react";

interface GoalsPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function GoalsPage({ params }: GoalsPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingGoalId, setTogglingGoalId] = useState<string | null>(null);

  // New Goal State
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const loadGoalsData = async () => {
    try {
      const [spaceRes, projsRes, goalsRes] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<ProjectItem[]>(`/api/v1/projects?space_id=${spaceId}`).catch(() => []),
        apiClient<GoalItem[]>("/api/v1/goals").catch(() => []),
      ]);

      if (spaceRes) setSpace(spaceRes);
      setProjects(projsRes || []);

      const projectIds = new Set((projsRes || []).map((p) => p.id));
      const spaceGoals = (goalsRes || []).filter(
        (g) => !g.project_id || projectIds.has(g.project_id)
      );
      setGoals(spaceGoals);
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoalsData();
  }, [spaceId]);

  // Toggle Goal Status
  const handleToggleGoal = async (goal: GoalItem) => {
    setTogglingGoalId(goal.id);
    const nextStatus = goal.status === "completed" ? "active" : "completed";
    try {
      await apiClient(`/api/v1/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, status: nextStatus } : g))
      );
    } catch (err) {
      console.error("Failed to update goal:", err);
    } finally {
      setTogglingGoalId(null);
    }
  };

  // Create Goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalDescription.trim()) return;

    try {
      const created = await apiClient<GoalItem>("/api/v1/goals", {
        method: "POST",
        body: JSON.stringify({
          description: newGoalDescription.trim(),
          project_id: selectedProjectId || undefined,
        }),
      });

      setGoals((prev) => [created, ...prev]);
      setNewGoalDescription("");
      setIsCreatingGoal(false);
    } catch (err) {
      console.error("Failed to create goal:", err);
      alert("Failed to create milestone goal.");
    }
  };

  const completedCount = goals.filter((g) => g.status === "completed").length;
  const velocityPct = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  return (
    <div className="h-screen w-screen bg-[#08090d] text-zinc-100 flex overflow-hidden select-none font-sans antialiased">
      {/* 1. Global Navigation Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Goals Viewport */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#08090d] ambient-mesh">
        {/* Top Header */}
        <header className="h-14 px-6 md:px-8 xl:px-12 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#08090d]/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white tracking-tight truncate flex items-center gap-2">
                <span>Goals & Milestones</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                  DECOMPOSITION LAYER
                </span>
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingGoal(true)}
            className="btn-white-premium flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Milestone</span>
          </button>
        </header>

        {/* Executive Goal Velocity Banner */}
        <div className="px-6 md:px-8 xl:px-12 py-3 border-b border-white/[0.06] bg-[#0a0b10] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Overall Milestone Velocity:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {completedCount}/{goals.length} ({velocityPct}%)
              </span>
            </div>
            <div className="w-32 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full progress-gradient transition-all duration-500"
                style={{ width: `${velocityPct}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            Across {projects.length} Active Initiatives
          </div>
        </div>

        {/* Goals Body */}
        <div className="flex-1 px-6 md:px-8 xl:px-12 py-8 max-w-[1700px] mx-auto w-full space-y-6 min-w-0 relative z-[1]">
          {/* New Goal Drawer */}
          {isCreatingGoal && (
            <div className="glass-card p-5 space-y-3 shadow-xl animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span>Define New Strategic Milestone</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingGoal(false)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-3">
                <input
                  type="text"
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  placeholder="e.g. Implement full vector embeddings pipeline with zero regressions"
                  autoFocus
                  className="w-full bg-[#12131c] text-xs text-white placeholder-zinc-500 px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:border-emerald-400/50 focus:outline-hidden"
                />

                {projects.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">Attach to Project:</span>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="bg-[#12131c] text-xs text-white px-2.5 py-1.5 rounded-lg border border-white/[0.08] focus:outline-hidden cursor-pointer"
                    >
                      <option value="">None (Top-Level Goal)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingGoal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white bg-white/[0.04] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newGoalDescription.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-200 text-black disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    Create Milestone
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="p-12 rounded-xl border border-dashed border-white/[0.08] text-center space-y-3 bg-[#0d0e15]">
              <Target className="w-8 h-8 text-zinc-500 mx-auto" />
              <div className="text-xs font-semibold text-white">No strategic goals defined yet</div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Define measurable milestones. MYND converts goals into projects, tasks, actions, and verifiable outcomes.
              </p>
              <button
                type="button"
                onClick={() => setIsCreatingGoal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Goal</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 stagger-children">
              {goals.map((goal) => {
                const isCompleted = goal.status === "completed";
                const isToggling = togglingGoalId === goal.id;
                const parentProj = projects.find((p) => p.id === goal.project_id);

                return (
                  <div
                    key={goal.id}
                    className="glass-card p-4 flex items-center justify-between gap-4 hover-glow-emerald"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleGoal(goal)}
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-600 hover:text-emerald-400 transition-colors" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                          className={`text-xs font-medium truncate block hover:text-white transition-colors ${
                            isCompleted ? "line-through text-zinc-600" : "text-zinc-200"
                          }`}
                        >
                          {goal.description}
                        </Link>
                        {parentProj && (
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-mono">
                            <FolderGit2 className="w-3 h-3 text-indigo-400" />
                            <span>{parentProj.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                            : "bg-white/[0.04] text-zinc-400 border border-white/[0.06]"
                        }`}
                      >
                        {goal.status}
                      </span>
                      <Link
                        href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
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
      </main>
    </div>
  );
}
