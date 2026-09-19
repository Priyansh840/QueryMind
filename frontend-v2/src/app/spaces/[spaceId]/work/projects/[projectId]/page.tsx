"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { ProjectItem, GoalItem, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  AlertCircle,
  Layers,
} from "lucide-react";

interface ProjectDetailPageProps {
  params: Promise<{ spaceId: string; projectId: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const projectId = resolvedParams.projectId;
  const router = useRouter();

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add milestone inline
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [togglingGoalId, setTogglingGoalId] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [projRes, goalsRes, spaceRes] = await Promise.all([
          apiClient<ProjectItem>(`/api/v1/projects/${projectId}`),
          apiClient<GoalItem[]>(`/api/v1/goals?project_id=${projectId}`).catch(() => []),
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        ]);
        setProject(projRes);
        setGoals(goalsRes || []);
        if (spaceRes) setSpace(spaceRes);
      } catch (err: any) {
        console.error("Failed to load project:", err);
        setError(err.message || "Project not found or unauthorized.");
      } finally {
        setIsLoading(false);
      }
    };
    loadProject();
  }, [projectId, spaceId]);

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
      console.error("Failed to toggle goal:", err);
    } finally {
      setTogglingGoalId(null);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalDesc.trim()) return;

    try {
      const created = await apiClient<GoalItem>(`/api/v1/goals`, {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          description: newGoalDesc.trim(),
        }),
      });
      setGoals((prev) => [...prev, created]);
      setNewGoalDesc("");
      setIsAddingGoal(false);
    } catch (err) {
      console.error("Failed to add milestone:", err);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await apiClient(`/api/v1/projects/${projectId}`, {
        method: "DELETE",
      });
      router.push(`/spaces/${spaceId}/work`);
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="text-xs font-mono text-slate-400 animate-pulse">
          LOADING INITIATIVE...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#0c0d12] border border-white/[0.08] text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[#f87171] mx-auto" />
          <h2 className="text-sm font-semibold text-white">Project Not Found</h2>
          <p className="text-xs text-slate-400">{error || "Unable to locate project."}</p>
          <button
            type="button"
            onClick={() => router.push(`/spaces/${spaceId}/work`)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors"
          >
            Return to Work Hub
          </button>
        </div>
      </div>
    );
  }

  const completedCount = goals.filter((g) => g.status === "completed").length;

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/spaces/${spaceId}/work`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white truncate">
                {project.name}
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Initiative • {goals.length} Milestones ({completedCount} Completed)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDeleteProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Project</span>
          </button>
        </header>

        {/* Project Body */}
        <div className="flex-1 p-8 pb-16 max-w-5xl mx-auto w-full space-y-6 min-w-0">
          {/* Milestones Card */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">
                Project Milestones & Deliverables
              </div>
              <button
                type="button"
                onClick={() => setIsAddingGoal(true)}
                className="flex items-center gap-1 text-xs text-[#818cf8] hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            {isAddingGoal && (
              <form onSubmit={handleAddGoal} className="flex gap-2">
                <input
                  type="text"
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  placeholder="e.g. Implement rate limiter middleware"
                  autoFocus
                  className="flex-1 bg-[#12131a] text-xs text-white placeholder-slate-500 px-3 py-2 rounded-xl border border-white/[0.08] focus:border-white/20 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!newGoalDesc.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#6366f1] text-xs font-semibold text-white cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-xs text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="space-y-2">
              {goals.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  No milestones tracked under this initiative.
                </div>
              ) : (
                goals.map((g) => {
                  const isCompleted = g.status === "completed";
                  const isToggling = togglingGoalId === g.id;

                  return (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl border border-white/[0.05] bg-[#12131a] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleGoal(g)}
                          className="cursor-pointer text-slate-400 hover:text-white"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500 hover:text-[#818cf8]" />
                          )}
                        </button>
                        <span
                          className={`text-xs ${
                            isCompleted ? "line-through text-slate-500" : "text-slate-200"
                          }`}
                        >
                          {g.description}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-slate-500">
                        {g.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
