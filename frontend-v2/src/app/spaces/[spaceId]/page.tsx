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
import { WorkspaceTelemetryRibbon } from "@/components/deck/WorkspaceTelemetryRibbon";
import { BlastRadiusSimulator } from "@/components/deck/BlastRadiusSimulator";
import { NeuralNexusEngine } from "@/components/deck/NeuralNexusEngine";
import { ReasoningDrawer } from "@/components/studio/ReasoningDrawer";
import { DocumentUploadDialog } from "@/components/modals/DocumentUploadDialog";
import { SpaceSettingsModal } from "@/components/modals/SpaceSettingsModal";
import {
  Sparkles,
  Plus,
  Send,
  FolderGit2,
  FileText,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Check,
  Zap,
  RefreshCw,
  Cpu,
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

  // Core Data Entities
  const [pendingActions, setPendingActions] = useState<ActionProposal[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);

  // Quick Capture & Drawer States
  const [quickNote, setQuickNote] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialPrompt, setDrawerInitialPrompt] = useState("");
  const [commandInput, setCommandInput] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reinforcingMemoryId, setReinforcingMemoryId] = useState<string | null>(null);

  // Keyboard shortcut: ⌘K or Ctrl+K opens Reasoning Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsDrawerOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadSpaceData = async (silent = false) => {
    try {
      const [summary, actionsRes, projsRes, docsRes, memsRes, knowRes, goalsRes] = await Promise.all([
        apiClient<SpaceWorkspaceSummary>(`/api/v1/spaces/${spaceId}/workspace`).catch(() => null),
        apiClient<ActionProposal[]>(`/api/v1/spaces/${spaceId}/actions/pending`).catch(() => []),
        apiClient<ProjectItem[]>(`/api/v1/spaces/${spaceId}/projects`).catch(() => []),
        apiClient<DocumentItem[]>(`/api/v1/spaces/${spaceId}/documents`).catch(() => []),
        apiClient<MemoryItem[]>(`/api/v1/spaces/${spaceId}/memories`).catch(() => []),
        apiClient<KnowledgeItem[]>(`/api/v1/knowledge?space_id=${spaceId}`).catch(() => []),
        apiClient<GoalItem[]>(`/api/v1/spaces/${spaceId}/goals`).catch(() => []),
      ]);

      if (summary) setWorkspace(summary);
      setPendingActions(actionsRes || []);
      setProjects(projsRes || []);
      setDocuments(docsRes || []);
      setMemories(memsRes || []);
      setKnowledgeItems(knowRes || []);
      setGoals(goalsRes || []);

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

  // Handle Command Prompt Submission
  const handleCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;
    setDrawerInitialPrompt(commandInput);
    setCommandInput("");
    setIsDrawerOpen(true);
  };

  // Quick note capture to Qdrant
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
      loadSpaceData(true);
    } catch (err) {
      console.error("Failed to capture note to Qdrant:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Toggle Goal Status (PATCH /api/v1/goals/[id])
  const handleToggleGoal = async (goalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "active" : "completed";
    try {
      await apiClient(`/api/v1/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, status: nextStatus } : g))
      );
    } catch (err) {
      console.error("Failed to toggle goal status:", err);
    }
  };

  // Approve Action Proposal
  const handleApproveProposal = async (proposalId: string) => {
    try {
      await apiClient(`/api/v1/actions/${proposalId}/approve`, { method: "POST" });
      setPendingActions((prev) => prev.filter((p) => (p.proposal_id || p.id) !== proposalId));
      loadSpaceData(true);
    } catch (err) {
      console.error("Failed to approve action:", err);
    }
  };

  // Reject Action Proposal
  const handleRejectProposal = async (proposalId: string) => {
    try {
      await apiClient(`/api/v1/actions/${proposalId}/reject`, { method: "POST" });
      setPendingActions((prev) => prev.filter((p) => (p.proposal_id || p.id) !== proposalId));
      loadSpaceData(true);
    } catch (err) {
      console.error("Failed to reject action:", err);
    }
  };

  // Reinforce Memory
  const handleReinforceMemory = async (memoryId: string) => {
    if (reinforcingMemoryId) return;
    setReinforcingMemoryId(memoryId);
    try {
      await apiClient(`/api/v1/memories/${memoryId}/reinforce`, { method: "POST" });
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId
            ? { ...m, reinforcement_count: (m.reinforcement_count || 0) + 1 }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to reinforce memory:", err);
    } finally {
      setReinforcingMemoryId(null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050508] text-slate-100 font-sans">
      {/* Sleek Command Sidebar */}
      <CommandSidebar
        spaceId={spaceId}
        space={space}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 px-8 border-b border-white/[0.06] bg-[#09090f]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>{space?.name || "Sovereign Intelligence Deck"}</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[#6366f1]/20 border border-[#6366f1]/30 text-[#818cf8]">
                  AUTONOMOUS COMMAND
                </span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Multi-Agent Consensus Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadSpaceData(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href={`/spaces/${spaceId}/map`}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Full Neural Map</span>
            </Link>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold shadow-lg shadow-[#6366f1]/25 transition-colors flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Ask MYND</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">⌘K</kbd>
            </button>
          </div>
        </header>

        {/* Real-time Diagnostics HUD Ribbon */}
        <WorkspaceTelemetryRibbon
          documentsCount={documents.length}
          conceptsCount={knowledgeItems.length}
          memoriesCount={memories.length}
          initiativesCount={projects.length}
        />

        {/* Master Command Deck Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8 space-y-8">
          {/* SECTION 1: EMBEDDED NEURAL NEXUS ENGINE */}
          <section className="space-y-2">
            <NeuralNexusEngine
              documents={documents}
              knowledgeItems={knowledgeItems}
              memories={memories}
              projects={projects}
              proposals={pendingActions}
              spaceId={spaceId}
            />
          </section>

          {/* SECTION 2: EXECUTIVE DIRECTIVE COMMAND PROMPT */}
          <section className="space-y-2.5">
            <form
              onSubmit={handleCommandSubmit}
              className="relative flex items-center bg-[#0d0e16] border border-white/[0.08] focus-within:border-[#6366f1]/50 rounded-2xl p-2 shadow-2xl transition-all"
            >
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Issue Sovereign Directive: Ask anything, audit vectors, or formulate next initiatives..."
                className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-sans"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-all shadow-md shrink-0"
                title="Send directive"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 px-2">
              <span className="text-[11px] text-slate-500 font-mono">DIRECTIVES:</span>
              {[
                "Synthesize grounded docs for strategy gaps",
                "Execute autonomous milestone evaluation",
                "Simulate blast radius for pending actions",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDrawerInitialPrompt(prompt);
                    setIsDrawerOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-slate-300 hover:text-white transition-colors text-[11px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          {/* SECTION 3: BLAST RADIUS SIMULATOR (If pending action exists) */}
          {pendingActions.length > 0 && (
            <section className="space-y-2 animate-in fade-in duration-300">
              <BlastRadiusSimulator
                proposal={pendingActions[0]}
                onApprove={handleApproveProposal}
                onReject={handleRejectProposal}
              />
            </section>
          )}

          {/* SECTION 4: TACTICAL 3-COLUMN OPERATIONAL LEDGER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* COLUMN 1: ACTIVE INITIATIVES & MILESTONES */}
            <section className="p-5 rounded-2xl bg-[#09090e] border border-white/[0.06] space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-[#10b981]" />
                  <h2 className="text-xs font-semibold text-white tracking-wider uppercase">
                    Active Initiatives
                  </h2>
                </div>
                <Link
                  href={`/spaces/${spaceId}/work`}
                  className="text-xs text-[#818cf8] hover:text-white transition-colors flex items-center gap-1 font-mono"
                >
                  <span>Work Hub</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {projects.slice(0, 2).map((proj) => {
                  const projectGoals = goals.filter((g) => g.project_id === proj.id);
                  const completedGoals = projectGoals.filter((g) => g.status === "completed");
                  const progressPct =
                    projectGoals.length > 0
                      ? Math.round((completedGoals.length / projectGoals.length) * 100)
                      : 50;

                  return (
                    <div
                      key={proj.id}
                      className="p-3.5 rounded-xl bg-[#0e0f17] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{proj.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-400 capitalize">
                          {proj.status || "active"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Velocity</span>
                          <span className="text-white">{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#6366f1] to-[#10b981] transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Milestones Checklist */}
              <div className="space-y-2 pt-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Tracked Milestones
                </div>
                <div className="space-y-1.5">
                  {goals.slice(0, 3).map((goal) => {
                    const isDone = goal.status === "completed";
                    return (
                      <div
                        key={goal.id}
                        onClick={() => handleToggleGoal(goal.id, goal.status)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isDone
                            ? "bg-white/[0.01] border-white/[0.04] opacity-50"
                            : "bg-[#0e0f17] border-white/[0.06] hover:border-white/[0.14]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-black"
                                : "border-slate-500 hover:border-white"
                            }`}
                          >
                            {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span
                            className={`text-xs ${
                              isDone ? "line-through text-slate-500" : "text-slate-200"
                            }`}
                          >
                            {goal.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* COLUMN 2: GROUNDED VAULT & QDRANT CONCEPTS */}
            <section className="p-5 rounded-2xl bg-[#09090e] border border-white/[0.06] space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-[#38bdf8]" />
                  <h2 className="text-xs font-semibold text-white tracking-wider uppercase">
                    Grounded Vault
                  </h2>
                </div>
                <Link
                  href={`/spaces/${spaceId}/knowledge`}
                  className="text-xs text-[#818cf8] hover:text-white transition-colors flex items-center gap-1 font-mono"
                >
                  <span>Vault Hub</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Grounded Documents */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Indexed Files ({documents.length})
                </div>
                <div className="space-y-1.5">
                  {documents.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-lg bg-[#0e0f17] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8]">
                          <FileText className="w-3 h-3" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white truncate max-w-[160px]">
                            {doc.title}
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono">{doc.type}</div>
                        </div>
                      </div>

                      <Link
                        href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Inspect chunks"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Note Capture to Qdrant */}
              <div className="pt-2 border-t border-white/[0.04]">
                <form
                  onSubmit={handleCaptureNote}
                  className="p-2 rounded-xl bg-[#0e0f17] border border-white/[0.08] focus-within:border-[#38bdf8]/40 flex items-center gap-2 transition-all"
                >
                  <input
                    type="text"
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="Jot knowledge note to Qdrant..."
                    className="w-full bg-transparent px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!quickNote.trim() || isCapturing}
                    className="px-2.5 py-1 rounded bg-[#38bdf8]/20 hover:bg-[#38bdf8]/30 border border-[#38bdf8]/40 text-[#38bdf8] hover:text-white text-[10px] font-medium transition-colors shrink-0 disabled:opacity-40"
                  >
                    {isCapturing ? "Embedding..." : "Embed"}
                  </button>
                </form>
              </div>
            </section>

            {/* COLUMN 3: RETAINED INVARIANT MEMORIES & AXIOMS */}
            <section className="p-5 rounded-2xl bg-[#09090e] border border-white/[0.06] space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#a78bfa]" />
                  <h2 className="text-xs font-semibold text-white tracking-wider uppercase">
                    Invariant Memory
                  </h2>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {memories.length} Axioms
                </span>
              </div>

              <div className="space-y-2">
                {memories.slice(0, 3).map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3 rounded-xl bg-[#0e0f17] border border-[#818cf8]/20 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white capitalize">
                          {mem.memory_type}
                        </span>
                        <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-[#818cf8]/15 text-[#818cf8]">
                          {Math.round(mem.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                        {mem.content}
                      </p>
                    </div>

                    <button
                      onClick={() => handleReinforceMemory(mem.id)}
                      disabled={reinforcingMemoryId === mem.id}
                      className="shrink-0 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[9px] text-[#818cf8] hover:text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{reinforcingMemoryId === mem.id ? "Done" : "Reinforce"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* On-Demand Slide-over Reasoning Drawer */}
      <ReasoningDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerInitialPrompt("");
        }}
        spaceId={spaceId}
        initialPrompt={drawerInitialPrompt}
        onProposalExecuted={() => loadSpaceData(true)}
      />

      {/* Upload Document Modal */}
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
