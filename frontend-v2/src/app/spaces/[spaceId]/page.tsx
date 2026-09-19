"use client";

import React, { useEffect, useState, use } from "react";
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
  Space,
} from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { ConstellationRadar, ConstellationNode } from "@/components/studio/ConstellationRadar";
import { ReasoningStreamPanel } from "@/components/studio/ReasoningStreamPanel";
import { WorkspaceStudioCanvas } from "@/components/studio/WorkspaceStudioCanvas";
import { DocumentUploadDialog } from "@/components/modals/DocumentUploadDialog";
import { SpaceSettingsModal } from "@/components/modals/SpaceSettingsModal";
import { Plus, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";

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
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  // Studio Interactive State
  const [isStreaming, setIsStreaming] = useState(false);
  const [focusedItem, setFocusedItem] = useState<{
    type: "document" | "memory" | "proposal" | "project";
    id: string;
    title: string;
  } | null>(null);

  // Dialog UI States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSpaceData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const [summary, actionsRes, projsRes, docsRes, memsRes] = await Promise.all([
        apiClient<SpaceWorkspaceSummary>(`/api/v1/spaces/${spaceId}/workspace`).catch(() => null),
        apiClient<ActionProposal[]>(`/api/v1/spaces/${spaceId}/actions/pending`).catch(() => []),
        apiClient<ProjectItem[]>(`/api/v1/spaces/${spaceId}/projects`).catch(() => []),
        apiClient<DocumentItem[]>(`/api/v1/spaces/${spaceId}/documents`).catch(() => []),
        apiClient<MemoryItem[]>(`/api/v1/spaces/${spaceId}/memories`).catch(() => []),
      ]);

      if (summary) setWorkspace(summary);
      setPendingActions(actionsRes || []);
      setProjects(projsRes || []);
      setDocuments(docsRes || []);
      setMemories(memsRes || []);

      const spaceMeta = spaces.find((s) => s.id === spaceId);
      if (spaceMeta) {
        setSpace(spaceMeta);
        setCurrentSpace(spaceMeta);
      }
    } catch (err: any) {
      console.error("Failed to load workspace data:", err);
      setError("Unable to load workspace telemetry. Verify backend connectivity.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSpaceData();
  }, [spaceId]);

  // Handle radar node selection
  const handleSelectRadarNode = (node: ConstellationNode) => {
    if (node.type === "core") return;
    setFocusedItem({
      type: node.type as "document" | "memory" | "proposal" | "project",
      id: node.id,
      title: node.title,
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#08080c] text-slate-100 font-sans">
      {/* Sleek Command Sidebar */}
      <CommandSidebar
        spaceId={spaceId}
        space={space}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Executive Header */}
        <header className="h-14 px-6 border-b border-white/[0.06] bg-[#0c0d12] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white tracking-tight">
                {space?.name || "Executive Workspace"}
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-white/[0.05] border border-white/[0.08] text-slate-300">
                {space?.is_default ? "Default Space" : "Workspace"}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 pl-3 border-l border-white/[0.06]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px]">Neural Engine Online</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadSpaceData(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Add Document</span>
            </button>

            <button
              onClick={() => router.push(`/spaces/${spaceId}/conversations`)}
              className="px-3.5 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium shadow-md transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Full Sessions Hub</span>
            </button>
          </div>
        </header>

        {/* Constellation Radar Ribbon (Interactive Living Graph) */}
        <ConstellationRadar
          documents={documents}
          memories={memories.map((m) => ({
            id: m.id,
            title: m.content.length > 30 ? `${m.content.slice(0, 30)}...` : m.content,
            confidence: `${Math.round(m.confidence * 100)}%`,
          }))}
          projects={projects}
          proposals={pendingActions.map((p) => ({
            id: p.proposal_id || p.id,
            title: p.reason || p.action_type,
          }))}
          isStreaming={isStreaming}
          onSelectNode={handleSelectRadarNode}
        />

        {/* Dual-Engine Studio Layout */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Engine: Persistent Reasoning Stream (45%) */}
          <section className="w-[45%] h-full flex flex-col min-w-[360px] max-w-[560px]">
            <ReasoningStreamPanel
              spaceId={spaceId}
              onStreamingChange={setIsStreaming}
              onSelectEvidence={(item) => setFocusedItem(item)}
            />
          </section>

          {/* Right Engine: Reactive Workspace Studio (55%) */}
          <section className="flex-1 h-full flex flex-col min-w-[440px]">
            <WorkspaceStudioCanvas
              spaceId={spaceId}
              initialProposals={pendingActions}
              initialProjects={projects}
              initialDocuments={documents}
              initialMemories={memories}
              focusedItem={focusedItem}
              onRefreshWorkspace={() => loadSpaceData(true)}
            />
          </section>
        </main>
      </div>

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
