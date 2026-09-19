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
  ShieldCheck,
  Target,
  Plus,
  Send,
  Zap,
  FolderGit2,
  Check,
  X,
  ExternalLink,
  Search,
  BookOpen,
  Cpu,
} from "lucide-react";

export default function GlobalHomePage() {
  const router = useRouter();
  const { user, profile, spaces, currentSpace, setCurrentSpace } = useAuth();

  // State across all spaces
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [pendingActions, setPendingActions] = useState<ActionProposal[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationItem[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Command Bar & Quick Capture
  const [commandInput, setCommandInput] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(currentSpace?.id || "");
  const [activeMode, setActiveMode] = useState<"ask" | "plan" | "research" | "capture">("ask");
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

  // Load Cross-Space Data
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

      // If we have an active space, load its pending actions & documents
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

  // Submit Global Directive
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

  // Toggle Goal Milestone Status
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

  // Metrics
  const completedGoalsCount = goals.filter((g) => g.status === "completed").length;
  const activeGoals = goals.filter((g) => g.status !== "completed");

  return (
    <div className="h-screen w-screen bg-[#07070a] text-slate-100 flex overflow-hidden select-none font-sans antialiased">
      {/* 1. Global Navigation Sidebar */}
      <CommandSidebar spaceId={currentSpace?.id || (spaces[0]?.id ?? "")} space={currentSpace} spaces={spaces} />

      {/* 2. Main Command Center Viewport */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#09090d]">
        {/* Top Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>MYND Command Center</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  INTELLIGENCE LAYER ACTIVE
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                Cross-workspace executive control, proactive directives, and outcome tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/spaces"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.08] transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>All Spaces ({spaces.length})</span>
            </Link>
          </div>
        </header>

        {/* Command Center Body */}
        <div className="flex-1 p-8 pb-16 max-w-6xl mx-auto w-full space-y-8">
          {/* Hero Greeting & Global AI Directive Input */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {getGreeting()}, <span className="text-indigo-400">{displayName}</span>.
              </h2>
              <p className="text-xs text-slate-400">
                What are you working on today? Dispatch autonomous reasoning, formulate milestones, or search across knowledge.
              </p>
            </div>

            {/* Global Directive Composer */}
            <div className="p-4 rounded-2xl border border-white/[0.09] bg-[#0c0d14] space-y-3 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 text-xs">
                {/* Mode Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-[#12131c] border border-white/[0.06] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveMode("ask")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeMode === "ask"
                        ? "bg-white/[0.12] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Ask MYND
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("plan")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeMode === "plan"
                        ? "bg-white/[0.12] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Plan Milestones
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("research")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeMode === "research"
                        ? "bg-white/[0.12] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Deep Research
                  </button>
                </div>

                {/* Target Space Selector */}
                {spaces.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[11px]">Space:</span>
                    <select
                      value={selectedSpaceId}
                      onChange={(e) => setSelectedSpaceId(e.target.value)}
                      className="bg-[#12131c] text-xs text-white px-2.5 py-1 rounded-lg border border-white/[0.08] focus:outline-hidden cursor-pointer"
                    >
                      {spaces.map((s) => {
                        const arch = getSpaceArchetype(s);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.icon || arch.icon} {s.name}
                          </option>
                        );
                      })}
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
                    activeMode === "plan"
                      ? "Describe an objective (e.g. Launch the next product sprint with 5 milestones)..."
                      : activeMode === "research"
                      ? "Ask for a comparative research synthesis across uploaded papers or specs..."
                      : "Ask anything about your projects, audit open blockers, or synthesize notes..."
                  }
                  className="w-full bg-[#11121b] text-xs text-white placeholder-slate-500 pl-4 pr-24 py-3 rounded-xl border border-white/[0.08] focus:border-indigo-500/50 focus:outline-hidden transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commandInput.trim()}
                  className="absolute right-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Dispatch</span>
                  <Send className="w-3 h-3" />
                </button>
              </form>

              {/* Quick Prompt Suggestions */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-slate-500 font-mono">QUICK DIRECTIVES:</span>
                {[
                  "Synthesize all active initiatives and report critical blockers",
                  "Formulate milestone roadmap for the upcoming sprint",
                  "Audit recent decisions against strategic objectives",
                ].map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCommandInput(promptText);
                    }}
                    className="px-2.5 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pending AI Action Approvals Queue (High Priority) */}
          {pendingActions.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#14110b] border border-amber-500/30 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Pending AI Action Approvals ({pendingActions.length})
                  </h3>
                </div>
                <span className="text-[11px] text-amber-400 font-medium">
                  Requires 1-Click Authorization
                </span>
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
                      className="p-4 rounded-xl bg-[#0c0d14] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                            {proposal.action_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-semibold text-white truncate">
                            {title}
                          </span>
                        </div>
                        {proposal.reason && (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {proposal.reason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isExecuting}
                          onClick={() => handleRejectProposal(propId)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isExecuting}
                          onClick={() => handleApproveProposal(propId)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isExecuting ? "Authorizing..." : "Authorize"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2-Column Operational Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Today's Priorities & Milestones */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Today's Priorities & Milestones
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">
                  {completedGoalsCount}/{goals.length} Completed
                </span>
              </div>

              {activeGoals.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-2 bg-[#0c0d14]/40">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-xs font-semibold text-white">All milestones complete!</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Formulate new milestones with MYND or launch a new initiative.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeGoals.slice(0, 6).map((goal) => {
                    const isCompleted = goal.status === "completed";
                    const isToggling = togglingGoalId === goal.id;
                    const parentProj = projects.find((p) => p.id === goal.project_id);

                    return (
                      <div
                        key={goal.id}
                        className="p-3.5 rounded-xl border border-white/[0.07] bg-[#0c0d14] flex items-center justify-between gap-3 hover:border-white/[0.14] transition-all"
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
                              <Circle className="w-4 h-4 text-slate-500 hover:text-emerald-400 transition-colors" />
                            )}
                          </button>
                          <div className="min-w-0 space-y-0.5">
                            <span
                              className={`text-xs font-semibold truncate block ${
                                isCompleted ? "line-through text-slate-500" : "text-slate-200"
                              }`}
                            >
                              {goal.description}
                            </span>
                            {parentProj && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span>{parentProj.name}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06] shrink-0">
                          {goal.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 2: Active Spaces Hub */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Domain Workspaces ({spaces.length})
                  </h3>
                </div>
                <Link
                  href="/spaces"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Manage Spaces →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {spaces.slice(0, 4).map((sp) => {
                  const archetype = getSpaceArchetype(sp);
                  const isCurrent = currentSpace?.id === sp.id;

                  return (
                    <div
                      key={sp.id}
                      onClick={() => {
                        setCurrentSpace(sp);
                        router.push(`/spaces/${sp.id}`);
                      }}
                      className={`p-4 rounded-2xl border bg-[#0c0d14] space-y-2.5 hover:border-white/25 hover:bg-[#10111a] transition-all cursor-pointer group shadow-xs ${
                        isCurrent ? "border-indigo-500/40 ring-1 ring-indigo-500/20" : "border-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm border border-white/10"
                          style={{ backgroundColor: `${sp.color || archetype.color}20` }}
                        >
                          {sp.icon || archetype.icon}
                        </div>
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold"
                          style={{
                            backgroundColor: `${archetype.color}15`,
                            color: archetype.color,
                          }}
                        >
                          {archetype.badge.split(" ")[0]}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {sp.name}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {sp.description || archetype.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{isCurrent ? "Active" : "Sovereign"}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3: Continue Where You Left Off */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Continue Where You Left Off
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Recent reasoning threads and evidence documents
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recent Conversations */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-slate-500 uppercase">
                  Recent Reasoning Sessions
                </div>
                {recentConversations.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-white/[0.07] text-center text-xs text-slate-500">
                    No recent sessions.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {recentConversations.slice(0, 3).map((conv) => (
                      <Link
                        key={conv.id}
                        href={`/spaces/${conv.space_id}/conversations/${conv.id}`}
                        className="p-3 rounded-xl bg-[#0c0d14] border border-white/[0.06] hover:border-white/[0.14] flex items-center justify-between gap-3 text-decoration-none block group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {conv.title || "Reasoning Session"}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Documents */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-slate-500 uppercase">
                  Grounded Evidence Documents
                </div>
                {recentDocuments.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-white/[0.07] text-center text-xs text-slate-500">
                    No documents ingested in active space.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {recentDocuments.slice(0, 3).map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/spaces/${doc.space_id}/knowledge/documents/${doc.id}`}
                        className="p-3 rounded-xl bg-[#0c0d14] border border-white/[0.06] hover:border-white/[0.14] flex items-center justify-between gap-3 text-decoration-none block group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {doc.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Ready
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
