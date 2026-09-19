"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import {
  SpaceWorkspaceSummary,
  ActionProposal,
  ProjectItem,
  GoalItem,
  DocumentItem,
  MemoryItem,
  KnowledgeItem,
  Space,
} from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { DocumentUploadDialog } from "@/components/modals/DocumentUploadDialog";
import { SpaceSettingsModal } from "@/components/modals/SpaceSettingsModal";
import { getSpaceArchetype } from "@/lib/spaces/spaceArchetypes";
import {
  Sparkles,
  Plus,
  ArrowRight,
  FolderGit2,
  FileText,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Check,
  Zap,
  RefreshCw,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Circle,
  MessageSquare,
  AlertCircle,
  Send,
  Clock,
} from "lucide-react";

interface SpaceDetailPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceDetailPage({ params }: SpaceDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  const { currentSpace, setCurrentSpace, spaces } = useAuth();
  const [workspace, setWorkspace] = useState<SpaceWorkspaceSummary | null>(null);
  const [space, setSpace] = useState<Space | null>(null);

  // Core Entities
  const [pendingActions, setPendingActions] = useState<ActionProposal[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);

  // Local UI State
  const [quickNote, setQuickNote] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reinforcingMemoryId, setReinforcingMemoryId] = useState<string | null>(null);
  const [togglingGoalId, setTogglingGoalId] = useState<string | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const loadSpaceData = async (silent = false) => {
    try {
      const [summary, actionsRes, projsRes, docsRes, memsRes, knowRes, goalsRes] = await Promise.all([
        apiClient<SpaceWorkspaceSummary>(`/api/v1/spaces/${spaceId}/workspace`).catch(() => null),
        apiClient<ActionProposal[]>(`/api/v1/spaces/${spaceId}/actions/pending`).catch(() => []),
        apiClient<ProjectItem[]>(`/api/v1/projects?space_id=${spaceId}`).catch(() => []),
        apiClient<DocumentItem[]>(`/api/v1/documents?space_id=${spaceId}`).catch(() => []),
        apiClient<MemoryItem[]>(`/api/v1/memories?space_id=${spaceId}`).catch(() => []),
        apiClient<KnowledgeItem[]>(`/api/v1/knowledge?space_id=${spaceId}`).catch(() => []),
        apiClient<GoalItem[]>(`/api/v1/goals`).catch(() => []),
      ]);

      if (summary) setWorkspace(summary);
      setPendingActions(actionsRes || []);
      setProjects(projsRes || []);
      setDocuments(docsRes || []);
      setMemories(memsRes || []);
      setKnowledgeItems(knowRes || []);

      const projectIds = new Set((projsRes || []).map((p) => p.id));
      const spaceGoals = (goalsRes || []).filter((g) => !g.project_id || projectIds.has(g.project_id));
      setGoals(spaceGoals);

      const spaceMeta = spaces.find((s) => s.id === spaceId);
      if (spaceMeta) {
        setSpace(spaceMeta);
        setCurrentSpace(spaceMeta);
      }
    } catch (err: any) {
      console.error("Failed to load workspace data:", err);
    }
  };

  useEffect(() => {
    loadSpaceData();
  }, [spaceId]);

  // Submit natural directive to new conversation
  const handleLaunchDirective = async (promptText?: string) => {
    const text = (promptText || commandInput).trim();
    if (!text) return;

    try {
      const created = await apiClient<{ id: string }>(`/api/v1/conversations`, {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          title: text.slice(0, 40),
        }),
      });
      router.push(`/spaces/${spaceId}/conversations/${created.id}?prompt=${encodeURIComponent(text)}`);
    } catch (err) {
      console.error("Failed to start session:", err);
      router.push(`/spaces/${spaceId}/conversations`);
    }
  };

  // Quick note capture directly into space memory/Qdrant
  const handleCaptureNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim() || isCapturing) return;
    setIsCapturing(true);
    try {
      await apiClient("/api/v1/knowledge", {
        method: "POST",
        body: JSON.stringify({
          content: quickNote.trim(),
          space_id: spaceId,
          knowledge_type: "note",
        }),
      });
      setQuickNote("");
      await loadSpaceData(true);
    } catch (err) {
      console.error("Failed to capture note:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Toggle goal milestone status
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
      console.error("Failed to toggle milestone:", err);
    } finally {
      setTogglingGoalId(null);
    }
  };

  // Approve pending action proposal
  const handleApproveAction = async (proposalId: string) => {
    setExecutingActionId(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/approve`, { method: "POST" });
      setPendingActions((prev) => prev.filter((p) => (p.proposal_id || p.id) !== proposalId));
      await loadSpaceData(true);
    } catch (err) {
      console.error("Failed to approve action:", err);
      alert("Failed to execute proposal.");
    } finally {
      setExecutingActionId(null);
    }
  };

  // Reject pending action proposal
  const handleRejectAction = async (proposalId: string) => {
    setExecutingActionId(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/reject`, { method: "POST" });
      setPendingActions((prev) => prev.filter((p) => (p.proposal_id || p.id) !== proposalId));
    } catch (err) {
      console.error("Failed to reject action:", err);
    } finally {
      setExecutingActionId(null);
    }
  };

  // 1-Click Reinforce Memory Axiom
  const handleReinforceMemory = async (memoryId: string) => {
    if (reinforcingMemoryId) return;
    setReinforcingMemoryId(memoryId);
    try {
      await apiClient(`/api/v1/memories/${memoryId}/reinforce`, { method: "POST" });
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId ? { ...m, confidence: Math.min(1.0, (Number(m.confidence) || 0.8) + 0.05) } : m
        )
      );
    } catch (err) {
      console.error("Failed to reinforce axiom:", err);
    } finally {
      setReinforcingMemoryId(null);
    }
  };

  const completedGoalsCount = goals.filter((g) => g.status === "completed").length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-slate-100 antialiased font-sans">
      {/* 1. Command Sidebar */}
      <CommandSidebar
        spaceId={spaceId}
        space={space}
        spaces={spaces}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Executive Viewport */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-[#0a0a0f]">
        {/* Top Header */}
        <header className="px-8 py-5 border-b border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
          {(() => {
            const currentArchetype = getSpaceArchetype(space);
            return (
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-white/10 shrink-0 shadow-sm"
                  style={{ backgroundColor: `${space?.color || currentArchetype.color}20` }}
                >
                  {space?.icon || currentArchetype.icon}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-white tracking-tight truncate flex items-center gap-2">
                    <span>{space?.name || "Executive Workspace"}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono uppercase border font-bold"
                      style={{
                        backgroundColor: `${currentArchetype.color}15`,
                        color: currentArchetype.color,
                        borderColor: `${currentArchetype.color}30`,
                      }}
                    >
                      {currentArchetype.badge}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {space?.description || currentArchetype.description}
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => loadSpaceData(true)}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh workspace telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-200 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Document</span>
            </button>

            <Link
              href={`/spaces/${spaceId}/conversations`}
              className="px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>New Session</span>
            </Link>
          </div>
        </header>

        {/* Overview Body */}
        <div className="p-8 max-w-6xl w-full mx-auto space-y-8">
          {/* STATS METRIC STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href={`/spaces/${spaceId}/knowledge`}
              className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.14] transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Indexed Evidence</span>
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight group-hover:text-sky-400 transition-colors">
                {documents.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {knowledgeItems.length} vector chunks active
              </div>
            </Link>

            <Link
              href={`/spaces/${spaceId}/work`}
              className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.14] transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Active Initiatives</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FolderGit2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                {projects.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Outcome tracking active
              </div>
            </Link>

            <Link
              href={`/spaces/${spaceId}/work`}
              className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.14] transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Tracked Milestones</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                {completedGoalsCount}/{goals.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {goals.length > 0 ? `${Math.round((completedGoalsCount / goals.length) * 100)}% completed` : "Ready to plan"}
              </div>
            </Link>

            <Link
              href={`/spaces/${spaceId}/memory`}
              className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.14] transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Invariant Axioms</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Brain className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight group-hover:text-purple-400 transition-colors">
                {memories.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Consistent principles
              </div>
            </Link>
          </div>

          {/* PENDING ACTIONS APPROVAL QUEUE (Prominent if pending) */}
          {pendingActions.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#14120f] border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h2 className="text-sm font-semibold text-white">
                    Action Proposals Awaiting Your Decision ({pendingActions.length})
                  </h2>
                </div>
                <Link
                  href={`/spaces/${spaceId}/tasks`}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  View all in Audit →
                </Link>
              </div>

              <div className="space-y-3">
                {pendingActions.slice(0, 2).map((proposal) => {
                  const propId = proposal.proposal_id || proposal.id;
                  const isExecuting = executingActionId === propId;
                  const title =
                    proposal.parameters?.name ||
                    proposal.parameters?.description ||
                    proposal.reason ||
                    `${proposal.action_type.replace(/_/g, " ")} Proposal`;

                  return (
                    <div
                      key={propId}
                      className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                            {proposal.action_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm font-semibold text-white truncate">
                            {title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                          {proposal.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRejectAction(propId)}
                          disabled={isExecuting}
                          className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveAction(propId)}
                          disabled={isExecuting}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isExecuting ? "Executing..." : "Approve & Execute"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CENTRAL DIRECTIVE BAR (Ask MYND) */}
          <div className="p-6 rounded-2xl bg-[#0f1017] border border-white/[0.08] space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Issue Directive to MYND
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Multi-hop retrieval across {documents.length} files & {memories.length} axioms
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLaunchDirective();
              }}
              className="relative flex items-center bg-[#13141f] border border-white/[0.08] focus-within:border-indigo-500/50 rounded-xl p-1.5 transition-all shadow-inner"
            >
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Ask anything about this space, audit decisions, or generate new initiatives..."
                className="w-full bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!commandInput.trim()}
                className="px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold transition-colors disabled:opacity-30 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>Reason</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {(() => {
              const currentArchetype = getSpaceArchetype(space);
              return (
                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-slate-400">
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <span>{currentArchetype.icon}</span>
                    <span>{currentArchetype.name.toUpperCase()} SUGGESTIONS:</span>
                  </span>
                  {currentArchetype.samplePrompts.map((promptText, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleLaunchDirective(promptText)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-colors text-[11px] cursor-pointer"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* 2-COLUMN OPERATIONAL GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* COLUMN 1: ACTIVE INITIATIVES & TRACKED MILESTONES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Active Initiatives
                  </h2>
                </div>
                <Link
                  href={`/spaces/${spaceId}/work`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <span>Work Hub</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#0f1017] border border-dashed border-white/[0.08] text-center text-xs text-slate-500">
                  No projects initialized yet. Ask MYND to propose an initiative based on your documents.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 3).map((proj) => {
                    const projectGoals = goals.filter((g) => g.project_id === proj.id);
                    const completed = projectGoals.filter((g) => g.status === "completed").length;
                    const pct = projectGoals.length > 0 ? Math.round((completed / projectGoals.length) * 100) : 0;

                    return (
                      <Link
                        key={proj.id}
                        href={`/spaces/${spaceId}/work/projects/${proj.id}`}
                        className="p-4 rounded-2xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.14] transition-all block group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                            {proj.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                            {proj.status}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>{completed} of {projectGoals.length} milestones complete</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Milestones Checklist */}
              <div className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Immediate Milestones Checklist</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {completedGoalsCount}/{goals.length}
                  </span>
                </div>

                {goals.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    No milestones active. Add one from the Work Hub.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {goals.slice(0, 4).map((goal) => {
                      const isCompleted = goal.status === "completed";
                      const isToggling = togglingGoalId === goal.id;

                      return (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleGoal(goal)}
                              className="text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                            <Link
                              href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                              className={`truncate hover:text-white transition-colors ${
                                isCompleted ? "line-through text-slate-500" : "text-slate-200"
                              }`}
                            >
                              {goal.description}
                            </Link>
                          </div>

                          <Link
                            href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                            className="text-[10px] text-slate-500 hover:text-white transition-colors font-mono shrink-0 ml-2"
                          >
                            Details →
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: GROUNDED EVIDENCE & QUICK CAPTURE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-sky-400" />
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Grounded Evidence & Notes
                  </h2>
                </div>
                <Link
                  href={`/spaces/${spaceId}/knowledge`}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1"
                >
                  <span>Vault Hub</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Recent Documents */}
              <div className="space-y-3">
                {documents.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#0f1017] border border-dashed border-white/[0.08] text-center text-xs text-slate-500">
                    No documents uploaded. Add a PDF or document to ground MYND's reasoning.
                  </div>
                ) : (
                  documents.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {doc.title}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {doc.type.toUpperCase()} • Ready for Reasoning
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-300 hover:text-white transition-colors shrink-0"
                      >
                        Inspect
                      </Link>
                    </div>
                  ))
                )}
              </div>

              {/* Fast Knowledge Note Ingestion */}
              <div className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] space-y-3">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Jot Note to Space Vector Memory</span>
                </div>

                <form onSubmit={handleCaptureNote} className="space-y-2.5">
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="Record architectural decision, constraint, or factual premise..."
                    className="w-full bg-[#13141f] border border-white/[0.08] focus:border-sky-500/50 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none h-20 leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!quickNote.trim() || isCapturing}
                      className="px-4 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {isCapturing ? "Embedding..." : "Ingest to Memory"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Invariant Axioms Preview */}
              <div className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-400" />
                    <span>Retained Invariant Principles</span>
                  </span>
                  <Link
                    href={`/spaces/${spaceId}/memory`}
                    className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View All →
                  </Link>
                </div>

                <div className="space-y-2">
                  {memories.slice(0, 2).map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-purple-400 uppercase">
                            {m.memory_type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {Math.round((Number(m.confidence) || 0.95) * 100)}% Conf
                          </span>
                        </div>
                        <p className="text-slate-300 line-clamp-2 leading-relaxed text-[11px]">
                          {m.content}
                        </p>
                      </div>

                      <button
                        onClick={() => handleReinforceMemory(m.id)}
                        disabled={reinforcingMemoryId === m.id}
                        className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-purple-300 border border-white/[0.06] shrink-0 transition-colors cursor-pointer"
                      >
                        {reinforcingMemoryId === m.id ? "Done" : "Reinforce"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Upload Dialog Modal */}
      <DocumentUploadDialog
        isOpen={isUploadOpen}
        spaceId={spaceId}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          setIsUploadOpen(false);
          loadSpaceData(true);
        }}
      />

      {/* Space Settings Modal */}
      <SpaceSettingsModal
        isOpen={isSettingsOpen}
        space={space}
        onClose={() => setIsSettingsOpen(false)}
        onDeleted={() => router.push("/spaces")}
      />
    </div>
  );
}
