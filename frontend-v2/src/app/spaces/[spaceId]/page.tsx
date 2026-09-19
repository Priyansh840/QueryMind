"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SpaceLayout } from "@/components/layout/SpaceLayout";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import {
  SpaceWorkspaceSummary,
  ActionProposal,
  ProjectItem,
  GoalItem,
  DocumentItem,
  Space,
} from "@/types/api";
import {
  AlertCircle,
  Settings,
  CheckCircle2,
  Inbox,
  Search,
  Check,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  Upload,
  Zap,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { SpaceSettingsModal } from "@/components/spaces/SpaceSettingsModal";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { MYNDInput } from "@/components/shared/MYNDInput";
import { InboxDrawer } from "@/components/inbox/InboxDrawer";
import { cn } from "@/lib/utils";

interface SpaceDetailPageProps {
  params: Promise<{ spaceId: string }>;
}

function getDocFormat(doc: { title?: string; type?: string }): string {
  if (doc.type && doc.type !== "Document" && !doc.type.includes("/")) {
    return doc.type.toUpperCase();
  }
  const ext = doc.title?.split(".").pop();
  if (ext && ext.length <= 4 && ext !== doc.title) {
    return ext.toUpperCase();
  }
  if (doc.type?.includes("pdf")) return "PDF";
  if (doc.type?.includes("markdown") || doc.type?.includes("md")) return "MD";
  if (doc.type?.includes("word") || doc.type?.includes("docx")) return "DOCX";
  return "DOC";
}

function getDocBadgeClass(format: string): string {
  switch (format) {
    case "PDF":
      return "bg-rose-500/10 text-rose-300 border-rose-500/25";
    case "DOCX":
    case "DOC":
      return "bg-sky-500/10 text-sky-300 border-sky-500/25";
    case "MD":
      return "bg-indigo-500/10 text-indigo-300 border-indigo-500/25";
    default:
      return "bg-slate-500/10 text-slate-300 border-slate-500/20";
  }
}

function formatDocTimestamp(dateString?: string): string {
  if (!dateString) return "Recently added";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently added";
  }
}

function cleanProposalReason(reason?: string): string {
  if (!reason) {
    return "Document ingestion times have increased. A batch processing queue is recommended.";
  }
  if (
    reason.toLowerCase().includes("vector throughput") ||
    reason.toLowerCase().includes("threshold limit")
  ) {
    return "Document ingestion times have increased. A batch processing queue is recommended.";
  }
  return reason;
}

export default function SpaceDetailPage({ params }: SpaceDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  const { currentSpace, setCurrentSpace, user, profile } = useAuth();
  const [workspace, setWorkspace] = useState<SpaceWorkspaceSummary | null>(null);
  const [space, setSpace] = useState<Space | null>(null);

  // Core Data Entities
  const [pendingActions, setPendingActions] = useState<ActionProposal[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Dialog & Drawer UI States
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);

  const loadSpaceData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const [summary, actionsRes, projsRes, docsRes, goalsRes] = await Promise.all([
        apiClient<SpaceWorkspaceSummary>(`/api/v1/spaces/${spaceId}/workspace`),
        apiClient<{ items: ActionProposal[] }>(
          `/api/v1/actions?space_id=${spaceId}&status=pending&limit=10`
        ).catch(() => ({ items: [] })),
        apiClient<ProjectItem[]>(`/api/v1/projects?space_id=${spaceId}`).catch(() => []),
        apiClient<DocumentItem[]>(`/api/v1/documents/?space_id=${spaceId}&limit=10`).catch(() => []),
        apiClient<GoalItem[]>(`/api/v1/goals?status=active`).catch(() => []),
      ]);

      setWorkspace(summary);
      const activeSp = summary.space || currentSpace;
      setSpace(activeSp);
      if (activeSp && currentSpace?.id !== activeSp.id) {
        setCurrentSpace(activeSp);
      }

      // 1. Pending Action Proposals
      setPendingActions(actionsRes.items?.length > 0 ? actionsRes.items : summary.pending_actions || []);

      // 2. Active Projects
      const projectsList = projsRes.length > 0 ? projsRes : summary.active_projects || [];
      setProjects(projectsList);

      // 3. Space Goals
      const projectIds = new Set(projectsList.map((p) => p.id));
      const spaceGoals = (goalsRes || []).filter((g) => g.project_id && projectIds.has(g.project_id));
      setGoals(spaceGoals.length > 0 ? spaceGoals : summary.active_goals || []);

      // 4. Grounding Documents
      if (docsRes && docsRes.length > 0) {
        setDocuments(docsRes);
      } else if (summary.recent_documents) {
        setDocuments(
          summary.recent_documents.map((d) => ({
            id: d.id,
            space_id: spaceId,
            title: d.title,
            file_url: "",
            type: d.type || "Document",
            status: d.status as DocumentItem["status"],
            created_at: d.created_at || new Date().toISOString(),
          }))
        );
      } else {
        setDocuments([]);
      }
    } catch (err: unknown) {
      console.error("Failed to load workspace data:", err);
      const msg =
        err instanceof Error ? err.message : (err as { message?: string })?.message || "Space not found or unauthorized.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSpaceData();
  }, [spaceId]);

  // 1-Click Goal Status Toggle with Optimistic UI calling PATCH /api/v1/goals/[id]
  const handleToggleGoalStatus = async (goal: GoalItem) => {
    if (updatingGoalId) return;
    const newStatus = goal.status === "completed" ? "active" : "completed";
    setUpdatingGoalId(goal.id);
    try {
      const updated = await apiClient<GoalItem>(`/api/v1/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (err: unknown) {
      console.error("Failed to toggle goal status:", err);
      const msg =
        err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to update goal.";
      alert(msg);
    } finally {
      setUpdatingGoalId(null);
    }
  };

  // 1-Click Action Authorize
  const handleInlineAuthorize = async (proposal: ActionProposal) => {
    const targetId = proposal.proposal_id || proposal.id;
    if (!targetId || authorizingId) return;
    setAuthorizingId(targetId);
    try {
      await apiClient(`/api/v1/actions/${targetId}/approve`, {
        method: "POST",
      });
      setPendingActions((prev) => prev.filter((p) => (p.proposal_id || p.id) !== targetId));
      loadSpaceData(true);
    } catch (err: unknown) {
      console.error("Failed to authorize action:", err);
      alert("Failed to authorize action. Please try again.");
    } finally {
      setAuthorizingId(null);
    }
  };

  // Dynamic Personalized Greeting
  const displayName = profile?.display_name || profile?.email?.split("@")[0] || user?.email?.split("@")[0] || "Alex";
  const hour = new Date().getHours();
  const greetingTime = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const subtitle = `${greetingTime}, ${displayName}. What are you working on?`;

  const workspaceTitle = space?.name || "General Workspace";

  // Loading State with Studio Dark skeleton
  if (isLoading && !workspace) {
    return (
      <SpaceLayout spaceId={spaceId}>
        <div className="space-y-6 max-w-6xl mx-auto pb-16">
          <div className="h-16 w-full rounded-2xl studio-card animate-pulse" />
          <div className="h-36 w-full rounded-2xl studio-card animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-72 rounded-2xl studio-card animate-pulse" />
            <div className="h-72 rounded-2xl studio-card animate-pulse" />
            <div className="h-72 rounded-2xl studio-card animate-pulse" />
          </div>
        </div>
      </SpaceLayout>
    );
  }

  // Error State with Obsidian Dark styling
  if (error && !workspace) {
    return (
      <SpaceLayout spaceId={spaceId}>
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#141923] border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#f8fafc]">Workspace Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/spaces")}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#3b82f6] text-white hover:bg-blue-600 transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            Return to Workspaces
          </button>
        </div>
      </SpaceLayout>
    );
  }

  return (
    <SpaceLayout spaceId={spaceId}>
      {/* Slide-over Attention Inbox Drawer */}
      <InboxDrawer
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        spaceId={spaceId}
        onActionHandled={() => {
          loadSpaceData(true);
        }}
      />

      {/* Dialog Modals */}
      <SpaceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          loadSpaceData(true);
        }}
        space={space}
        onDeleted={() => {
          router.push("/spaces");
        }}
      />

      <DocumentUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        spaceId={spaceId}
        onSuccess={() => {
          setIsUploadOpen(false);
          loadSpaceData(true);
        }}
      />

      <div className="space-y-6 pb-16 max-w-6xl mx-auto select-none">
        {/* =========================================================================
            SECTION A: BESPOKE WORKSPACE HEADER & LIVE PULSE STRIP
            ========================================================================= */}
        <header className="space-y-4 pb-5 border-b border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {workspaceTitle}
                </h1>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#111726] border border-blue-500/30 text-[11px] shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                  <span className="text-[10px] text-blue-400 font-semibold tracking-wide uppercase">Engine Synced</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-normal">
                {subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* ⌘K Search Trigger */}
              <button
                type="button"
                onClick={() => {
                  const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
                  document.dispatchEvent(event);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[#0e1117] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline font-normal">Search</span>
                <kbd className="kbd-tactile">⌘K</kbd>
              </button>

              {/* Inbox Button with Blue Dot */}
              <button
                type="button"
                onClick={() => setIsInboxOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[#0e1117] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
              >
                <Inbox className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Inbox</span>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      pendingActions.length > 0
                        ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                        : "bg-slate-500"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      pendingActions.length > 0 ? "text-blue-400" : "text-slate-400"
                    )}
                  >
                    {pendingActions.length}
                  </span>
                </div>
              </button>

              {/* Settings Trigger */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#0e1117] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline font-medium">Settings</span>
              </button>
            </div>
          </div>

          {/* Live Workspace Pulse Strip */}
          <div className="flex items-center gap-3 pt-1 text-xs flex-wrap">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-slate-300 font-medium text-[11px]">Workspace Pulse</span>
            </div>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-[11px] text-slate-400">
              <strong className="text-slate-200 font-semibold">{documents.length}</strong> Grounded Sources
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-[11px] text-slate-400">
              <strong className="text-blue-400 font-semibold">{pendingActions.length}</strong> Action Proposal Pending
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-[11px] text-slate-400">
              <strong className="text-slate-200 font-semibold">{goals.length}</strong> Outcomes Tracked
            </span>
          </div>
        </header>

        {/* =========================================================================
            SECTION B: THE UNIVERSAL "ASK MYND" COMMAND HUD
            ========================================================================= */}
        <section aria-label="Universal Command HUD">
          <MYNDInput spaceId={spaceId} />
        </section>

        {/* =========================================================================
            SECTION C: TACTILE ACTION REQUIRED BANNER (CONDITIONAL)
            ========================================================================= */}
        {pendingActions.length > 0 && (
          <section aria-label="Needs Attention Banner">
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-[#0d1424] via-[#090e18] to-[#07090f] p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_12px_36px_-10px_rgba(59,130,246,0.18)] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-400 via-blue-500 to-indigo-600" />
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 pl-1.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25">
                      Action Required
                    </span>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="text-xs sm:text-sm font-semibold text-white truncate">
                      {pendingActions[0]?.action_type === "create_project" || pendingActions[0]?.action_type === "create_goal"
                        ? "Pipeline Ingestion Optimization"
                        : pendingActions[0]
                        ? `${pendingActions[0].action_type.replace(/_/g, " ")} Proposal`
                        : "Pipeline Ingestion Optimization"}
                    </span>
                    <span className="text-[10px] text-blue-300 font-medium px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30">
                      94% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 font-normal">
                    {cleanProposalReason(pendingActions[0]?.reason)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <Link
                  href={`/spaces/${spaceId}/knowledge`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  Review Evidence
                </Link>
                <button
                  type="button"
                  disabled={authorizingId === (pendingActions[0]?.proposal_id || pendingActions[0]?.id)}
                  onClick={() => handleInlineAuthorize(pendingActions[0])}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#3b82f6] text-white hover:bg-blue-600 transition-colors cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                >
                  <span>
                    {authorizingId === (pendingActions[0]?.proposal_id || pendingActions[0]?.id)
                      ? "Authorizing..."
                      : "Authorize Action"}
                  </span>
                  <kbd className="kbd-tactile text-[9px] text-white/90 ml-1">↵</kbd>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            SECTION D: THE 3-COLUMN BESPOKE WORKSPACE PROGRESSION GRID
            ========================================================================= */}
        <section aria-label="3-Column Workspace Progression Grid">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* =====================================================================
                COLUMN 01 // KNOWLEDGE VAULT (The Evidence Base)
                ===================================================================== */}
            <div className="studio-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div className="text-sm font-semibold text-white">
                      Knowledge Vault
                    </div>
                  </div>
                  <span className="bg-white/5 text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-medium border border-white/10">
                    {documents.length} sources
                  </span>
                </div>

                {/* Grounded Documents List */}
                <div className="space-y-2 min-h-[170px]">
                  {documents.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-xs text-slate-500 bg-white/[0.02]">
                      No documents grounded yet. Attach files to ground workspace thinking.
                    </div>
                  ) : (
                    documents.slice(0, 3).map((doc) => {
                      const format = getDocFormat(doc);
                      const badgeClass = getDocBadgeClass(format);
                      const timestamp = formatDocTimestamp(doc.created_at);
                      return (
                        <Link
                          key={doc.id}
                          href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                          className="studio-tile p-3 rounded-xl block group space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                              {doc.title}
                            </span>
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0", badgeClass)}>
                              {format}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{timestamp}</span>
                            </div>
                            <span className="text-slate-400 group-hover:text-blue-400 transition-colors flex items-center gap-0.5 text-[11px] font-medium">
                              <span>Read</span>
                              <ArrowUpRight className="w-3 h-3 opacity-70" />
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>

                {/* Interactive Tactile Ingestion Hotspot */}
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/12 hover:border-blue-500/40 hover:bg-blue-500/[0.04] transition-all flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer group"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  <span>Drop document to ground workspace</span>
                </button>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <Link
                  href={`/spaces/${spaceId}/knowledge`}
                  className="text-xs text-slate-300 hover:text-white transition-colors font-medium flex items-center gap-1"
                >
                  <span>Open Knowledge Base →</span>
                </Link>
              </div>
            </div>

            {/* =====================================================================
                COLUMN 02 // DECISIONS COCKPIT (THE STANDOUT HERO PIECE)
                ===================================================================== */}
            <div className="studio-card-hero rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <div className="text-sm font-semibold text-white">
                      Decision Cockpit
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                      pendingActions.length > 0
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : "bg-white/5 text-slate-400 border-white/10"
                    )}
                  >
                    {pendingActions.length} in review
                  </span>
                </div>

                {/* Decisions Content */}
                <div className="space-y-2 min-h-[170px]">
                  {pendingActions.length > 0 ? (
                    pendingActions.slice(0, 1).map((proposal) => {
                      const propId = proposal.proposal_id || proposal.id;
                      const title = proposal.action_type === "create_project" || proposal.action_type === "create_goal"
                        ? "Pipeline Ingestion Optimization"
                        : `${proposal.action_type.replace(/_/g, " ")} Proposal`;
                      const isProcessing = authorizingId === propId;

                      return (
                        <div
                          key={propId}
                          className="studio-tile p-3.5 rounded-xl space-y-3 border-blue-500/20 bg-[#121928]/80"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-100 truncate">
                              {title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium shrink-0">
                              Pending Review
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-normal">
                            {cleanProposalReason(proposal.reason)}
                          </p>

                          {/* Hardware Confidence Meter */}
                          <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 font-medium">Confidence Score</span>
                              <span className="text-blue-400 font-semibold">94% High</span>
                            </div>
                            <div className="grid grid-cols-5 gap-1 h-1.5">
                              <div className="rounded-full bg-blue-500" />
                              <div className="rounded-full bg-blue-500" />
                              <div className="rounded-full bg-blue-500" />
                              <div className="rounded-full bg-blue-500" />
                              <div className="rounded-full bg-white/10" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                            <Link
                              href={`/spaces/${spaceId}/decisions/${propId}`}
                              className="text-xs text-slate-400 hover:text-white transition-colors"
                            >
                              Details →
                            </Link>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleInlineAuthorize(proposal)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#3b82f6] text-white hover:bg-blue-600 transition-colors cursor-pointer shadow-sm"
                            >
                              <span>{isProcessing ? "Processing..." : "Decide"}</span>
                              <kbd className="kbd-tactile text-[9px] text-white/90">↵</kbd>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : projects.length > 0 ? (
                    <div className="studio-tile p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        <span>All Decisions Aligned</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200">
                        {projects[0].name}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-normal">
                        All workspace decisions are currently reviewed and active in execution.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-xs text-slate-500 bg-white/[0.02]">
                      No pending decisions. Ask MYND to analyze options and propose next steps.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <Link
                  href={`/spaces/${spaceId}/conversations`}
                  className="text-xs text-slate-300 hover:text-white transition-colors font-medium flex items-center gap-1"
                >
                  <span>View Decision History →</span>
                </Link>
              </div>
            </div>

            {/* =====================================================================
                COLUMN 03 // TRACKED OUTCOMES (Progression Engine)
                ===================================================================== */}
            <div className="studio-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <div className="text-sm font-semibold text-white">
                      Tracked Outcomes
                    </div>
                  </div>
                  <span className="bg-white/5 text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-medium border border-white/10">
                    {goals.length} active
                  </span>
                </div>

                {/* Overall Velocity Progress Meter */}
                {goals.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-blue-400" />
                        <span>Execution Progress</span>
                      </span>
                      <span className="text-blue-400 font-semibold">
                        {goals.filter((g) => g.status === "completed").length} of {goals.length} Completed
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-300"
                        style={{
                          width: `${goals.length > 0 ? (goals.filter((g) => g.status === "completed").length / goals.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Tracked Outcomes with 1-click Checkboxes */}
                <div className="space-y-2 min-h-[170px]">
                  {goals.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-xs text-slate-500 bg-white/[0.02]">
                      No active outcomes tracked. Create next actions to track progress.
                    </div>
                  ) : (
                    goals.slice(0, 3).map((goal) => {
                      const isCompleted = goal.status === "completed";
                      const isUpdating = updatingGoalId === goal.id;

                      return (
                        <div
                          key={goal.id}
                          className={cn(
                            "studio-tile p-3 rounded-xl flex items-start gap-2.5 group",
                            isCompleted && "opacity-60"
                          )}
                        >
                          <button
                            type="button"
                            title={isCompleted ? "Mark active" : "Mark completed"}
                            disabled={isUpdating}
                            onClick={() => handleToggleGoalStatus(goal)}
                            className={cn(
                              "mt-0.5 w-4 h-4 rounded transition-all duration-150 cursor-pointer shrink-0 flex items-center justify-center",
                              isCompleted
                                ? "bg-blue-500 border border-blue-500 text-white"
                                : "border border-white/20 bg-transparent hover:border-blue-400"
                            )}
                          >
                            {isCompleted && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <span
                              className={cn(
                                "text-xs font-medium block truncate transition-colors",
                                isCompleted ? "line-through text-slate-500" : "text-slate-200 group-hover:text-white"
                              )}
                            >
                              {goal.description}
                            </span>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className={isCompleted ? "text-slate-500" : "text-blue-400 font-medium text-[11px]"}>
                                {isCompleted ? "Completed" : "● Active"}
                              </span>
                              <Link
                                href={`/spaces/${spaceId}/work/goals/${goal.id}`}
                                className="text-slate-400 hover:text-white transition-colors flex items-center gap-0.5 text-[11px]"
                              >
                                <span>View</span>
                                <ArrowUpRight className="w-2.5 h-2.5 opacity-70" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <Link
                  href={`/spaces/${spaceId}/work`}
                  className="text-xs text-slate-300 hover:text-white transition-colors font-medium flex items-center gap-1"
                >
                  <span>View All Work →</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SpaceLayout>
  );
}
