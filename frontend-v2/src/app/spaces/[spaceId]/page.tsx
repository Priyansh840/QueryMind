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
    <div className="flex h-screen w-screen overflow-hidden bg-[#08090d] text-zinc-100 antialiased font-sans">
      {/* 1. Command Sidebar */}
      <CommandSidebar
        spaceId={spaceId}
        space={space}
        spaces={spaces}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Executive Viewport */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-[#08090d] ambient-mesh">
        {/* Top Header */}
        <header className="px-6 md:px-8 xl:px-12 h-14 border-b border-white/[0.06] bg-[#08090d]/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#12131c] border border-white/[0.08] flex items-center justify-center text-xs text-zinc-200 shrink-0">
              {space?.icon || "📁"}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white tracking-tight truncate flex items-center gap-2">
                <span>{space?.name || "Workspace"}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                  {space?.type || "space"}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadSpaceData(true)}
              className="p-1.5 rounded-lg bg-[#12131c] hover:bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#12131c] hover:bg-zinc-800 border border-white/[0.08] text-xs text-zinc-200 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Add Document</span>
            </button>

            <Link
              href={`/spaces/${spaceId}/conversations`}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>New Session</span>
            </Link>
          </div>
        </header>

        {/* Overview Body */}
        <div className="px-6 md:px-8 xl:px-12 py-8 max-w-[1700px] w-full mx-auto space-y-8 relative z-[1]">
          {/* STATS METRIC STRIP */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            <Link
              href={`/spaces/${spaceId}/knowledge`}
              className="stat-card p-5 hover-glow-sky group block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">Grounding Documents</span>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {documents.length}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>{knowledgeItems.length} indexed chunks</span>
              </div>
            </Link>

            <Link
              href={`/spaces/${spaceId}/work`}
              className="stat-card p-5 hover-glow-emerald group block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">Active Initiatives</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <FolderGit2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {projects.length}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Operational roadmap</span>
              </div>
            </Link>

            <Link
              href={`/spaces/${spaceId}/work`}
              className="stat-card p-5 hover-glow-amber group block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">Milestone Progress</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {completedGoalsCount}
                <span className="text-sm font-normal text-zinc-500 ml-1">/ {goals.length}</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{goals.length > 0 ? `${Math.round((completedGoalsCount / goals.length) * 100)}% achieved` : "No targets set"}</span>
              </div>
            </Link>

            <Link
              href={`/spaces/${spaceId}/memory`}
              className="stat-card p-5 hover-glow-purple group block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">Retained Axioms</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Brain className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {memories.length}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Verified workspace rules</span>
              </div>
            </Link>
          </div>

          {/* PENDING ACTIONS APPROVAL QUEUE (Prominent if pending) */}
          {pendingActions.length > 0 && (
            <div className="p-5 rounded-xl bg-[#0e0d14] border border-amber-500/30 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <h2 className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
                    Action Approvals Required ({pendingActions.length})
                  </h2>
                </div>
                <Link
                  href={`/spaces/${spaceId}/tasks`}
                  className="text-xs text-amber-400/80 hover:text-amber-300 transition-colors font-mono"
                >
                  View full queue in Tasks →
                </Link>
              </div>

              <div className="space-y-2.5">
                {pendingActions.slice(0, 3).map((proposal) => {
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
                      className="p-4 rounded-xl bg-[#08090d] border border-white/[0.08] hover:border-amber-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                            {proposal.action_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-medium text-white truncate">
                            {title}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
                          {proposal.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRejectAction(propId)}
                          disabled={isExecuting}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-mono border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveAction(propId)}
                          disabled={isExecuting}
                          className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isExecuting ? "Executing..." : "Authorize"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ASYMMETRIC 12-COLUMN OPERATIONAL GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT 8-COLUMN COLUMN: DIRECTIVE BAR, INITIATIVES & MILESTONES */}
            <div className="lg:col-span-8 space-y-6">
              {/* CENTRAL DIRECTIVE BAR (Ask MYND) */}
              <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] space-y-3.5 shadow-sm animate-fade-in-up-delayed">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-semibold">
                      Directive Substrate
                    </span>
                    <span className="text-xs font-medium text-zinc-200">
                      Direct Workspace Reasoning
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {documents.length} docs • {memories.length} rules
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLaunchDirective();
                  }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    placeholder="Ask anything about this space, audit decisions, or generate milestones..."
                    className="w-full bg-white/[0.03] text-xs text-white placeholder-zinc-500 pl-4 pr-24 py-3 rounded-xl border border-white/[0.08] focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:outline-hidden transition-all font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!commandInput.trim()}
                    className="absolute right-2 btn-primary-glow px-3.5 py-1.5 text-xs font-medium disabled:opacity-30 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>Dispatch</span>
                    <Send className="w-3 h-3" />
                  </button>
                </form>

                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    SUGGESTED:
                  </span>
                  {[
                    "Summarize primary objectives and open risks",
                    "Audit stored documents for missing specifications",
                    "Formulate actionable milestones for this space",
                  ].map((promptText, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleLaunchDirective(promptText)}
                      className="px-2.5 py-1 rounded-md bg-[#12131c] hover:bg-zinc-800 border border-white/[0.08] hover:border-indigo-500/30 text-zinc-300 hover:text-white transition-colors text-[11px] cursor-pointer"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </div>

              {/* INITIATIVES SECTION */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                      Active Initiatives ({projects.length})
                    </h2>
                  </div>
                  <Link
                    href={`/spaces/${spaceId}/work`}
                    className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 font-mono"
                  >
                    <span>Manage Hub</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {projects.length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#0d0e15] border border-dashed border-white/[0.08] text-center text-xs text-zinc-500">
                    No active initiatives recorded. Dispatch a directive to formulate strategic projects.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {projects.map((proj) => {
                      const projectGoals = goals.filter((g) => g.project_id === proj.id);
                      const completed = projectGoals.filter((g) => g.status === "completed").length;
                      const pct = projectGoals.length > 0 ? Math.round((completed / projectGoals.length) * 100) : 0;

                      return (
                        <Link
                          key={proj.id}
                          href={`/spaces/${spaceId}/work/projects/${proj.id}`}
                          className="glass-card p-4 hover-glow-emerald group block"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                              {proj.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 capitalize font-medium">
                              {proj.status}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                            {proj.description || "Active initiative for space objectives."}
                          </p>

                          <div className="space-y-1.5 pt-1 border-t border-white/[0.05]">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                              <span>{completed}/{projectGoals.length} targets</span>
                              <span className="font-semibold text-emerald-400">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                              <div
                                className="h-full progress-gradient transition-all duration-500"
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

              {/* MILESTONES CHECKLIST */}
              <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                      Milestones Checklist
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 font-medium">
                    {completedGoalsCount} of {goals.length} achieved
                  </span>
                </div>

                {goals.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-4 text-center">
                    No active milestones set for this workspace.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {goals.slice(0, 5).map((goal) => {
                      const isCompleted = goal.status === "completed";
                      const isToggling = togglingGoalId === goal.id;

                      return (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-[#08090d] border border-white/[0.06] hover:border-white/[0.14] transition-colors text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleGoal(goal)}
                              className="cursor-pointer shrink-0"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-zinc-600 hover:text-zinc-400 transition-colors" />
                              )}
                            </button>
                            <Link
                              href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                              className={`truncate hover:text-white transition-colors text-xs ${
                                isCompleted ? "line-through text-zinc-600" : "text-zinc-200 font-medium"
                              }`}
                            >
                              {goal.description}
                            </Link>
                          </div>

                          <Link
                            href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-mono shrink-0 ml-3"
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

            {/* RIGHT 4-COLUMN RAIL: EVIDENCE VAULT, NOTE INGESTION, RETAINED RULES */}
            <div className="lg:col-span-4 space-y-6">
              {/* Grounded Evidence Vault */}
              <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold">
                      Vault
                    </span>
                    <h3 className="text-xs font-semibold text-zinc-200">
                      Grounded Evidence
                    </h3>
                  </div>
                  <Link
                    href={`/spaces/${spaceId}/knowledge`}
                    className="text-xs text-zinc-400 hover:text-sky-400 transition-colors flex items-center gap-1 font-mono"
                  >
                    <span>All ({documents.length})</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {documents.length === 0 ? (
                  <div className="p-5 rounded-lg bg-[#08090d] border border-dashed border-white/[0.08] text-center text-xs text-zinc-500">
                    No documents uploaded. Add a file to ground workspace reasoning.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.slice(0, 3).map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-lg bg-[#08090d] border border-white/[0.06] hover:border-sky-500/30 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-200 truncate">
                              {doc.title}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              {doc.type.toUpperCase()} • Indexed
                            </div>
                          </div>
                        </div>

                        <Link
                          href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-[11px] text-zinc-300 hover:text-white transition-colors shrink-0 font-mono"
                        >
                          Inspect
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fast Note Scratchpad */}
              <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] space-y-3 shadow-sm">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Jot to Workspace Memory</span>
                </div>

                <form onSubmit={handleCaptureNote} className="space-y-2.5">
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="Record decision, constraint, or factual premise..."
                    className="w-full bg-[#08090d] border border-white/[0.08] focus:border-emerald-500/50 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden resize-none h-20 leading-relaxed font-sans"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!quickNote.trim() || isCapturing}
                      className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
                    >
                      {isCapturing ? "Ingesting..." : "Save Note"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Retained Axioms */}
              <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold">
                      Axioms
                    </span>
                    <h3 className="text-xs font-semibold text-zinc-200">
                      Retained Rules
                    </h3>
                  </div>
                  <Link
                    href={`/spaces/${spaceId}/memory`}
                    className="text-[11px] text-zinc-400 hover:text-purple-400 transition-colors font-mono"
                  >
                    View All →
                  </Link>
                </div>

                <div className="space-y-2">
                  {memories.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg bg-[#08090d] border border-white/[0.06] hover:border-purple-500/30 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-purple-400 uppercase font-semibold">
                            {m.memory_type}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {Math.round((Number(m.confidence) || 0.95) * 100)}% conf
                          </span>
                        </div>
                        <p className="text-zinc-300 line-clamp-2 leading-relaxed text-[11px]">
                          {m.content}
                        </p>
                      </div>

                      <button
                        onClick={() => handleReinforceMemory(m.id)}
                        disabled={reinforcingMemoryId === m.id}
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-300 hover:text-white border border-white/[0.08] shrink-0 transition-colors cursor-pointer font-mono"
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
