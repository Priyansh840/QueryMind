"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { Space, WorkflowListItem, GoalItem, ProjectItem } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowRight,
  Zap,
  Plus,
  Filter,
  Sparkles,
  ChevronDown,
  Layers,
  Flag,
  RotateCcw,
  Play,
  Check,
  ListTodo,
} from "lucide-react";

interface TasksPageProps {
  params: Promise<{ spaceId: string }>;
}

interface ExecutionTask {
  id: string;
  title: string;
  project_id?: string;
  milestone_name?: string;
  priority: "P0" | "P1" | "P2";
  status: "planned" | "in_progress" | "waiting_human" | "completed";
  estimated_time?: string;
  suggested_by_ai?: boolean;
  created_at: string;
}

export default function TasksPage({ params }: TasksPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active view tab: "tasks" or "workflows"
  const [activeTab, setActiveTab] = useState<"tasks" | "workflows">("tasks");

  // Filters & State
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  // Tasks state
  const [tasks, setTasks] = useState<ExecutionTask[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"P0" | "P1" | "P2">("P1");
  const [newTaskProject, setNewTaskProject] = useState<string>("");
  const [newTaskEstTime, setNewTaskEstTime] = useState<string>("30m");

  // Loading initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [spaceRes, workflowsRes, goalsRes, projsRes] = await Promise.all([
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
          apiClient<WorkflowListItem[]>(`/api/v1/workflows?space_id=${spaceId}`).catch(() => []),
          apiClient<GoalItem[]>("/api/v1/goals").catch(() => []),
          apiClient<ProjectItem[]>(`/api/v1/projects?space_id=${spaceId}`).catch(() => []),
        ]);

        if (spaceRes) setSpace(spaceRes);
        setWorkflows(workflowsRes || []);
        setProjects(projsRes || []);

        const projectIds = new Set((projsRes || []).map((p) => p.id));
        const spaceGoals = (goalsRes || []).filter(
          (g) => !g.project_id || projectIds.has(g.project_id)
        );
        setGoals(spaceGoals);

        // Seed or map execution tasks from persistent goals and space context
        const initialTasks: ExecutionTask[] = spaceGoals.map((g, idx) => {
          const matchedProj = (projsRes || []).find((p) => p.id === g.project_id);
          return {
            id: g.id,
            title: g.description,
            project_id: g.project_id || undefined,
            milestone_name: matchedProj ? matchedProj.name : "Core Milestone",
            priority: idx === 0 ? "P0" : idx % 2 === 0 ? "P1" : "P2",
            status: g.status === "completed" ? "completed" : idx === 0 ? "in_progress" : "planned",
            estimated_time: idx === 0 ? "45m" : "30m",
            suggested_by_ai: false,
            created_at: g.created_at,
          };
        });

        // Add domain-adaptive suggested tasks if empty or few
        if (initialTasks.length < 3) {
          const domain = spaceRes?.icon === "📚" ? "study" : spaceRes?.icon === "🔬" ? "research" : "general";
          const suggestions: ExecutionTask[] = [
            {
              id: `suggested-1-${spaceId}`,
              title:
                domain === "study"
                  ? "Synthesize key chapter formulas and test practice problem sets"
                  : domain === "research"
                  ? "Extract comparative findings across ground truth documents"
                  : "Finalize core milestone deliverables and operational metrics",
              milestone_name: projsRes?.[0]?.name || "Executive Sprint",
              priority: "P0",
              status: "planned",
              estimated_time: "25m",
              suggested_by_ai: true,
              created_at: new Date().toISOString(),
            },
            {
              id: `suggested-2-${spaceId}`,
              title: "Run automated consistency audit across grounding documents",
              milestone_name: projsRes?.[0]?.name || "Executive Sprint",
              priority: "P1",
              status: "planned",
              estimated_time: "15m",
              suggested_by_ai: true,
              created_at: new Date().toISOString(),
            },
          ];
          setTasks([...initialTasks, ...suggestions]);
        } else {
          setTasks(initialTasks);
        }
      } catch (err) {
        console.error("Failed to load tasks substrate:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [spaceId]);

  // Toggle Task Completion
  const handleToggleTask = async (task: ExecutionTask) => {
    const nextStatus = task.status === "completed" ? "planned" : "completed";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    // If it's a persistent backend goal, update in backend
    if (!task.id.startsWith("suggested-") && !task.id.startsWith("local-")) {
      try {
        await apiClient(`/api/v1/goals/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: nextStatus === "completed" ? "completed" : "active",
          }),
        });
      } catch (err) {
        console.error("Failed to sync goal status:", err);
      }
    }
  };

  // Cycle Status
  const handleCycleStatus = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const sequence: ExecutionTask["status"][] = ["planned", "in_progress", "waiting_human", "completed"];
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentIdx = sequence.indexOf(t.status);
        const nextIdx = (currentIdx + 1) % sequence.length;
        return { ...t, status: sequence[nextIdx] };
      })
    );
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const matchedProject = projects.find((p) => p.id === newTaskProject);

    try {
      // Create persistent goal in backend
      const createdGoal = await apiClient<GoalItem>("/api/v1/goals", {
        method: "POST",
        body: JSON.stringify({
          description: newTaskTitle.trim(),
          project_id: newTaskProject || undefined,
        }),
      }).catch(() => null);

      const newTask: ExecutionTask = {
        id: createdGoal?.id || `local-${Date.now()}`,
        title: newTaskTitle.trim(),
        project_id: newTaskProject || undefined,
        milestone_name: matchedProject ? matchedProject.name : "Direct Initiative",
        priority: newTaskPriority,
        status: "planned",
        estimated_time: newTaskEstTime,
        suggested_by_ai: false,
        created_at: new Date().toISOString(),
      };

      setTasks((prev) => [newTask, ...prev]);
      setNewTaskTitle("");
      setIsCreatingTask(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  // Filters logic
  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterProject !== "all" && t.project_id !== filterProject) return false;
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const plannedCount = tasks.filter((t) => t.status === "planned").length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="h-screen w-screen bg-[#07070a] text-[#f8fafc] flex overflow-hidden select-none font-sans">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Execution Substrate */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-[#07070a]/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white truncate">
                  Tasks & Execution
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Execution Board
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Context-anchored execution checklist, priorities, and autonomous agent workflows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <button
                onClick={() => setActiveTab("tasks")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "tasks"
                    ? "bg-white/[0.1] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Tasks ({tasks.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("workflows")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "workflows"
                    ? "bg-white/[0.1] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Autonomous Workflows ({workflows.length})</span>
              </button>
            </div>

            <button
              onClick={() => setIsCreatingTask((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-8 pb-20 max-w-6xl mx-auto w-full space-y-6 min-w-0">
          {/* Velocity & Status Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#0c0d14] border border-white/[0.07] space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Total Tasks</div>
              <div className="text-xl font-bold text-white tracking-tight flex items-baseline gap-2">
                <span>{tasks.length}</span>
                <span className="text-xs font-normal text-emerald-400 font-mono">
                  {completionRate}% done
                </span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0d14] border border-white/[0.07] space-y-1">
              <div className="text-[11px] font-medium text-slate-400">In Progress</div>
              <div className="text-xl font-bold text-amber-400 tracking-tight">
                {inProgressCount}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0d14] border border-white/[0.07] space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Planned</div>
              <div className="text-xl font-bold text-slate-200 tracking-tight">
                {plannedCount}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0d14] border border-white/[0.07] space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Autonomous Agents</div>
              <div className="text-xl font-bold text-indigo-400 tracking-tight flex items-center gap-1.5">
                <span>{workflows.length}</span>
                <span className="text-[11px] font-normal text-slate-400">workflows</span>
              </div>
            </div>
          </div>

          {/* Inline Add Task Drawer */}
          {isCreatingTask && (
            <form
              onSubmit={handleCreateTask}
              className="p-5 rounded-2xl bg-[#0e0f18] border border-indigo-500/30 space-y-4 shadow-xl transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Create Execution Task</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingTask(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>

              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What task needs execution? (e.g. Conduct sensitivity analysis on pricing assumptions)"
                className="w-full bg-[#08080c] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  {/* Priority selector */}
                  <div className="flex items-center rounded-lg bg-black/40 border border-white/[0.08] p-0.5 text-xs">
                    {(["P0", "P1", "P2"] as const).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setNewTaskPriority(p)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                          newTaskPriority === p
                            ? p === "P0"
                              ? "bg-rose-500/20 text-rose-300 font-semibold"
                              : p === "P1"
                              ? "bg-amber-500/20 text-amber-300 font-semibold"
                              : "bg-slate-500/20 text-slate-300 font-semibold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Milestone selector */}
                  {projects.length > 0 && (
                    <select
                      value={newTaskProject}
                      onChange={(e) => setNewTaskProject(e.target.value)}
                      className="bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="">No Milestone / Direct</option>
                      {projects.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Time estimation */}
                  <select
                    value={newTaskEstTime}
                    onChange={(e) => setNewTaskEstTime(e.target.value)}
                    className="bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="15m">~15 min</option>
                    <option value="30m">~30 min</option>
                    <option value="45m">~45 min</option>
                    <option value="1h">~1 hour</option>
                    <option value="2h">~2 hours</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-sm transition-all"
                >
                  Create Task
                </button>
              </div>
            </form>
          )}

          {activeTab === "tasks" ? (
            <div className="space-y-4">
              {/* Task Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400">Filter:</span>

                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Priorities</option>
                    <option value="P0">P0 Urgent</option>
                    <option value="P1">P1 High</option>
                    <option value="P2">P2 Normal</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="in_progress">In Progress</option>
                    <option value="planned">Planned</option>
                    <option value="waiting_human">Waiting on Human</option>
                    <option value="completed">Completed</option>
                  </select>

                  {projects.length > 0 && (
                    <select
                      value={filterProject}
                      onChange={(e) => setFilterProject(e.target.value)}
                      className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="all">All Milestones</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </div>
              </div>

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-3 bg-[#0c0d14]">
                  <CheckSquare className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-semibold text-white">No tasks matching current filter</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Create a new task or adjust your status and priority filters above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => {
                    const isDone = task.status === "completed";
                    const isInProgress = task.status === "in_progress";
                    const isWaiting = task.status === "waiting_human";

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task)}
                        className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isDone
                            ? "bg-[#090a0f]/60 border-white/[0.04] opacity-60"
                            : isInProgress
                            ? "bg-[#0d0e19] border-amber-500/30 hover:border-amber-500/50"
                            : "bg-[#0c0d14] border-white/[0.07] hover:border-white/[0.15]"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTask(task);
                            }}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                              isDone
                                ? "bg-emerald-500 border-emerald-400 text-black shadow-sm"
                                : "border-white/20 hover:border-emerald-400 text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-medium tracking-tight truncate ${
                                  isDone ? "line-through text-slate-500" : "text-slate-100"
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.suggested_by_ai && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>AI Suggested</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
                              {task.milestone_name && (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-slate-500" />
                                  <span>{task.milestone_name}</span>
                                </span>
                              )}
                              {task.estimated_time && (
                                <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{task.estimated_time}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Priority pill */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${
                              task.priority === "P0"
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                : task.priority === "P1"
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-white/[0.04] text-slate-400 border-white/[0.07]"
                            }`}
                          >
                            {task.priority}
                          </span>

                          {/* Status Clickable Cycle Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCycleStatus(task.id, e)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors flex items-center gap-1.5 ${
                              isDone
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : isInProgress
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                : isWaiting
                                ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                                : "bg-white/[0.04] text-slate-400 border-white/[0.07] hover:border-white/20"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span className="capitalize">{task.status.replace("_", " ")}</span>
                          </button>

                          {/* Action button */}
                          <Link
                            href={`/spaces/${spaceId}/conversations`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                            title="Discuss or Execute with AI Agent"
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
          ) : (
            /* Autonomous Workflows Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.05]">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">Autonomous Agent Workflows</div>
                  <p className="text-[11px] text-slate-400">
                    Multi-step autonomous executions running on behalf of this space
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {workflows.length} active executions
                </span>
              </div>

              {workflows.length === 0 ? (
                <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-3 bg-[#0c0d14]">
                  <Zap className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-semibold text-white">No autonomous background workflows</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    When you ask MYND to conduct multi-step research, document generation, or deep synthesis, background workflows will track their progression here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflows.map((wf) => {
                    const isCompleted = wf.status === "completed";

                    return (
                      <div
                        key={wf.id}
                        className="rounded-2xl border border-white/[0.07] bg-[#0c0d14] hover:border-white/[0.14] p-5 flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-2 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isCompleted ? "bg-emerald-400" : "bg-indigo-400 animate-pulse"
                              }`}
                            />
                            <Link
                              href={`/spaces/${spaceId}/tasks/${wf.id}`}
                              className="text-sm font-semibold text-white hover:text-indigo-300 transition-colors truncate"
                            >
                              {wf.goal}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="font-mono text-[11px] text-indigo-300">
                              {wf.completed_steps_count} of {wf.steps_count} steps completed
                            </span>
                            {wf.current_step && (
                              <>
                                <span>•</span>
                                <span className="truncate">Current: {wf.current_step}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase bg-white/[0.04] text-slate-300 border border-white/[0.07]">
                            {wf.status}
                          </span>
                          <Link
                            href={`/spaces/${spaceId}/tasks/${wf.id}`}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-white font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <span>Inspect Steps</span>
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
        </div>
      </main>
    </div>
  );
}
