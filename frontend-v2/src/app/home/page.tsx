"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import {
  Space,
  GoalItem,
  ActionProposal,
  ConversationItem,
  DocumentItem,
  ProjectItem,
} from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { getSpaceArchetype } from "@/lib/spaces/spaceArchetypes";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  MessageSquare,
  Target,
  Send,
  Zap,
  FolderGit2,
  Check,
  Brain,
  Shield,
  Layers,
} from "lucide-react";

export default function GlobalHomePage() {
  const router = useRouter();
  const { user, profile, spaces, currentSpace, setCurrentSpace } = useAuth();

  // Real Workspace Data State
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [pendingActions, setPendingActions] = useState<ActionProposal[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationItem[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Command Bar State
  const [commandInput, setCommandInput] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(currentSpace?.id || "");
  const [activeMode, setActiveMode] = useState<"directive" | "task" | "plan">("directive");
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const [togglingGoalId, setTogglingGoalId] = useState<string | null>(null);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Leader";

  useEffect(() => {
    if (spaces.length > 0 && !selectedSpaceId) {
      setSelectedSpaceId(currentSpace?.id || spaces[0].id);
    }
  }, [spaces, currentSpace, selectedSpaceId]);

  // Load Real Data
  const loadHomeData = async () => {
    try {
      const [goalsRes, projsRes, convsRes] = await Promise.all([
        apiClient<GoalItem[]>("/api/v1/goals").catch(() => []),
        apiClient<ProjectItem[]>("/api/v1/projects").catch(() => []),
        apiClient<ConversationItem[]>("/api/v1/conversations").catch(() => []),
      ]);

      setGoals(goalsRes || []);
      setProjects(projsRes || []);
      setRecentConversations(convsRes || []);

      const activeId = currentSpace?.id || (spaces.length > 0 ? spaces[0].id : null);
      if (activeId) {
        const [actionsRes, docsRes] = await Promise.all([
          apiClient<ActionProposal[]>(`/api/v1/spaces/${activeId}/actions/pending`).catch(() => []),
          apiClient<DocumentItem[]>(`/api/v1/documents?space_id=${activeId}`).catch(() => []),
        ]);
        setPendingActions(actionsRes || []);
        setRecentDocuments(docsRes || []);
      }
    } catch (err) {
      console.error("Failed to load command center data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [currentSpace?.id]);

  // Submit Directive
  const handleLaunchDirective = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = commandInput.trim();
    if (!text) return;

    const targetSpaceId = selectedSpaceId || currentSpace?.id || (spaces[0]?.id ?? "");
    if (!targetSpaceId) {
      router.push("/spaces");
      return;
    }

    try {
      const created = await apiClient<{ id: string }>(`/api/v1/conversations`, {
        method: "POST",
        body: JSON.stringify({
          space_id: targetSpaceId,
          title: text.slice(0, 48),
        }),
      });
      router.push(`/spaces/${targetSpaceId}/conversations/${created.id}?prompt=${encodeURIComponent(text)}`);
    } catch (err) {
      console.error("Failed to start session:", err);
      router.push(`/spaces/${targetSpaceId}/conversations`);
    }
  };

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
      console.error("Failed to toggle goal status:", err);
    } finally {
      setTogglingGoalId(null);
    }
  };

  // 1-Click Approve Action Proposal
  const handleApproveProposal = async (proposalId: string) => {
    setExecutingProposalId(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/approve`, { method: "POST" });
      setPendingActions((prev) => prev.filter((p) => (p.proposal_id || p.id) !== proposalId));
      await loadHomeData();
    } catch (err) {
      console.error("Failed to approve action:", err);
      alert("Failed to execute proposal.");
    } finally {
      setExecutingProposalId(null);
    }
  };

  // Reject Action Proposal
  const handleRejectProposal = async (proposalId: string) => {
    setExecutingProposalId(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/reject`, { method: "POST" });
      setPendingActions((prev) => prev.filter((p) => (p.proposal_id || p.id) !== proposalId));
    } catch (err) {
      console.error("Failed to reject action:", err);
    } finally {
      setExecutingProposalId(null);
    }
  };

  // Real Metrics
  const completedGoalsCount = goals.filter((g) => g.status === "completed").length;
  const activeGoals = goals.filter((g) => g.status !== "completed");
  const primaryMilestone = activeGoals[0] || goals[0];

  return (
    <div className="h-screen w-screen bg-[#08090d] text-zinc-100 flex overflow-hidden select-none font-sans antialiased">
      {/* 1. Global Navigation Sidebar */}
      <CommandSidebar spaceId={currentSpace?.id || (spaces[0]?.id ?? "")} space={currentSpace} spaces={spaces} />

      {/* 2. Main Command Center Viewport */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#08090d]">
        {/* Top Header Bar */}
        <header className="h-14 px-6 md:px-10 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#08090d]/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2.5">
              <span>Command Center</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-400 border border-white/[0.08] font-medium">
                {spaces.length} Spaces Connected
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/spaces"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>All Spaces</span>
            </Link>
          </div>
        </header>

        {/* Command Center Body - Professional Multi-Column */}
        <div className="flex-1 p-6 md:p-8 xl:px-12 pb-20 max-w-[1700px] mx-auto w-full space-y-7">
          {/* Executive Daily Pulse & Greeting */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {getGreeting()}, {displayName}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Autonomous workspace executive substrate. Manage strategic priorities and authorized actions.
                </p>
              </div>

              {/* Real Summary Ticker */}
              <div className="flex items-center gap-2.5 text-xs flex-wrap">
                <div className="px-3 py-1.5 rounded-lg bg-[#0d0e15] border border-white/[0.08] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-zinc-400">Initiatives:</span>
                  <span className="font-semibold text-white font-mono">{projects.length}</span>
                </div>

                <div className="px-3 py-1.5 rounded-lg bg-[#0d0e15] border border-white/[0.08] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-zinc-400">Milestones:</span>
                  <span className="font-semibold text-white font-mono">{completedGoalsCount}/{goals.length}</span>
                </div>

                {pendingActions.length > 0 && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300 font-medium">Pending Approvals:</span>
                    <span className="font-bold text-amber-200 font-mono">{pendingActions.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PRIMARY FOCUS ANCHOR (Grounded in Real Top Milestone) */}
            {primaryMilestone && (
              <div className="p-4 rounded-xl bg-[#0d0e15] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                      Primary Milestone
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {primaryMilestone.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">
                    {primaryMilestone.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={togglingGoalId === primaryMilestone.id}
                    onClick={() => handleToggleGoal(primaryMilestone)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {primaryMilestone.status === "completed" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Mark Achieved</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Directive Input (Speed-of-Thought Substrate) */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0d0e15] space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 p-0.5 bg-[#12141f] border border-white/[0.06] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveMode("directive")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      activeMode === "directive"
                        ? "bg-white text-black font-semibold shadow-xs"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Directive
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("task")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      activeMode === "task"
                        ? "bg-white text-black font-semibold shadow-xs"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Execution Target
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("plan")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      activeMode === "plan"
                        ? "bg-white text-black font-semibold shadow-xs"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Milestone Plan
                  </button>
                </div>

                {spaces.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-xs font-mono">Space:</span>
                    <select
                      value={selectedSpaceId}
                      onChange={(e) => setSelectedSpaceId(e.target.value)}
                      className="bg-[#12141f] text-xs text-zinc-200 px-3 py-1.5 rounded-lg border border-white/[0.08] focus:outline-hidden cursor-pointer"
                    >
                      {spaces.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <form onSubmit={handleLaunchDirective} className="relative flex items-center">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder={
                    activeMode === "task"
                      ? "Define execution deliverable or task..."
                      : activeMode === "plan"
                      ? "Formulate strategic milestones for upcoming sprint..."
                      : "Direct autonomous reasoning across projects or audit space decisions..."
                  }
                  className="w-full bg-[#12141f] text-xs md:text-sm text-white placeholder-zinc-500 pl-4 pr-28 py-3 rounded-xl border border-white/[0.08] focus:border-white/[0.25] focus:outline-hidden transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commandInput.trim()}
                  className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-30 text-black text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Dispatch</span>
                  <Send className="w-3 h-3" />
                </button>
              </form>

              {/* Editorial Triggers */}
              <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                <span className="text-zinc-500 font-mono text-[10px] uppercase">SUGGESTIONS:</span>
                {[
                  "Synthesize all active initiatives and report critical blockers",
                  "Audit stored documents for missing specifications",
                  "Formulate milestone roadmap for the upcoming sprint",
                ].map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCommandInput(promptText)}
                    className="px-2.5 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-zinc-400 hover:text-white transition-colors cursor-pointer text-[11px]"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main 12-Column Asymmetric Grid: 8 Cols (Operations) / 4 Cols (Substrate) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            {/* Left/Center Column (8 Cols): Milestones + Sessions + Evidence */}
            <div className="lg:col-span-8 space-y-7">
              {/* Strategic Milestones */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                      Strategic Milestones ({activeGoals.length} Active)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                    {completedGoalsCount}/{goals.length} Completed
                  </span>
                </div>

                {activeGoals.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-white/[0.08] text-center space-y-2 bg-[#0d0e15]">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                    <div className="text-xs font-semibold text-zinc-200">All current milestones complete</div>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Use the directive composer above to plan your next milestone sprint.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {activeGoals.slice(0, 6).map((goal, idx) => {
                      const isCompleted = goal.status === "completed";
                      const isToggling = togglingGoalId === goal.id;
                      const parentProj = projects.find((p) => p.id === goal.project_id);
                      const priority = idx === 0 ? "P0" : idx < 3 ? "P1" : "P2";

                      return (
                        <div
                          key={goal.id}
                          className="p-4 rounded-xl border border-white/[0.08] bg-[#0d0e15] hover:border-white/[0.16] flex flex-col justify-between space-y-3 transition-all shadow-xs"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                                  priority === "P0"
                                    ? "bg-rose-500/15 text-rose-400 border-rose-500/25"
                                    : priority === "P1"
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                                    : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                                }`}
                              >
                                {priority}
                              </span>

                              {parentProj && (
                                <span className="text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] truncate max-w-[140px]">
                                  {parentProj.name}
                                </span>
                              )}
                            </div>

                            <p
                              className={`text-xs font-medium leading-relaxed ${
                                isCompleted ? "line-through text-zinc-500" : "text-zinc-100"
                              }`}
                            >
                              {goal.description}
                            </p>
                          </div>

                          <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-xs">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleGoal(goal)}
                              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-zinc-500 hover:text-white transition-colors" />
                              )}
                              <span>{isCompleted ? "Completed" : "Mark Achieved"}</span>
                            </button>

                            <span className="text-[10px] font-mono uppercase text-zinc-500">
                              {goal.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2-Column Split: Reasoning Sessions & Grounded Evidence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Recent Sessions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                      <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                        Recent Sessions
                      </h3>
                    </div>
                  </div>

                  {recentConversations.length === 0 ? (
                    <div className="p-5 rounded-xl border border-dashed border-white/[0.07] text-center text-xs text-zinc-500 bg-[#0d0e15]">
                      No active sessions yet. Dispatch a directive above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentConversations.slice(0, 3).map((conv) => (
                        <Link
                          key={conv.id}
                          href={`/spaces/${conv.space_id}/conversations/${conv.id}`}
                          className="p-3.5 rounded-xl bg-[#0d0e15] border border-white/[0.07] hover:border-white/[0.18] flex items-center justify-between gap-3 text-decoration-none block group transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 shrink-0">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors truncate block">
                                {conv.title || "Reasoning Session"}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Active Session
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Grounded Evidence Documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                        Grounded Documents
                      </h3>
                    </div>
                  </div>

                  {recentDocuments.length === 0 ? (
                    <div className="p-5 rounded-xl border border-dashed border-white/[0.07] text-center text-xs text-zinc-500 bg-[#0d0e15]">
                      No documents ingested in space.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentDocuments.slice(0, 3).map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/spaces/${doc.space_id}/knowledge/documents/${doc.id}`}
                          className="p-3.5 rounded-xl bg-[#0d0e15] border border-white/[0.07] hover:border-white/[0.18] flex items-center justify-between gap-3 text-decoration-none block group transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors truncate block">
                                {doc.title}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {doc.type.toUpperCase()} • Indexed
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Verified
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (4 Cols): Action Authorizations + Spaces + Substrate */}
            <div className="lg:col-span-4 space-y-6">
              {/* Action Authorizations (High Priority Module if pending) */}
              {pendingActions.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#0e0d14] border border-amber-500/30 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                        Authorizations Required ({pendingActions.length})
                      </h3>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">1-Click</span>
                  </div>

                  <div className="space-y-2.5">
                    {pendingActions.map((proposal) => {
                      const propId = proposal.proposal_id || proposal.id;
                      const isExecuting = executingProposalId === propId;
                      const title =
                        proposal.parameters?.name ||
                        proposal.parameters?.description ||
                        proposal.reason ||
                        `${proposal.action_type.replace(/_/g, " ")} Proposal`;

                      return (
                        <div
                          key={propId}
                          className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.08] hover:border-amber-500/30 space-y-2 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                              {proposal.action_type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                              {title}
                            </span>
                          </div>

                          {proposal.reason && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {proposal.reason}
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.04]">
                            <button
                              type="button"
                              disabled={isExecuting}
                              onClick={() => handleRejectProposal(propId)}
                              className="px-2.5 py-1 rounded text-[11px] font-medium text-zinc-400 hover:text-white bg-white/[0.04] transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              disabled={isExecuting}
                              onClick={() => handleApproveProposal(propId)}
                              className="flex items-center gap-1 px-3 py-1 rounded text-[11px] font-semibold bg-amber-400 hover:bg-amber-300 text-black transition-colors cursor-pointer shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>{isExecuting ? "Executing..." : "Authorize"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spaces Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                      Workspaces ({spaces.length})
                    </h3>
                  </div>
                  <Link
                    href="/spaces"
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors font-mono"
                  >
                    All Spaces →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
                  {spaces.slice(0, 4).map((sp) => {
                    const isCurrent = currentSpace?.id === sp.id;
                    const archetype = getSpaceArchetype(sp);

                    return (
                      <div
                        key={sp.id}
                        onClick={() => {
                          setCurrentSpace(sp);
                          router.push(`/spaces/${sp.id}`);
                        }}
                        className={`p-3.5 rounded-xl border bg-[#0d0e15] space-y-2 hover:bg-[#11131d] hover:border-white/[0.18] transition-all cursor-pointer group shadow-xs ${
                          isCurrent ? "border-white/[0.25]" : "border-white/[0.07]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs text-zinc-200 font-medium">
                            {sp.icon || "📁"}
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                            {archetype.badge.split(" ")[0]}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                            {sp.name}
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-1">
                            {sp.description || archetype.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                          <span>{isCurrent ? "Active" : "Open"}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Substrate Grounding Status */}
              <div className="p-5 rounded-2xl bg-[#0d0e15] border border-white/[0.07] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200">System Grounding</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Online
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Reasoning directives are grounded against indexed vector memory. Autonomous agent actions require explicit user authorization.
                </p>

                <div className="pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-[#08090d] border border-white/[0.04]">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Documents</div>
                    <div className="text-sm font-bold text-white mt-0.5">{recentDocuments.length}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#08090d] border border-white/[0.04]">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Spaces</div>
                    <div className="text-sm font-bold text-white mt-0.5">{spaces.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

