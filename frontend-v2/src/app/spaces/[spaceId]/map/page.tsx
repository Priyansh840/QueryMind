"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { NeuralGraphCanvas, GraphNode } from "@/components/studio/NeuralGraphCanvas";
import {
  ArrowLeft,
  Sparkles,
  ExternalLink,
  X,
  FileText,
  Brain,
  FolderGit2,
  Check,
  Layers,
  ChevronRight,
  Zap,
  Cpu,
} from "lucide-react";
import {
  DocumentItem,
  MemoryItem,
  KnowledgeItem,
  ProjectItem,
  ActionProposal,
  Space,
} from "@/types/api";

export default function SpaceKnowledgeMapPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();
  const { currentSpace, spaces } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isReinforcing, setIsReinforcing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [docsRes, memsRes, knowRes, projsRes, actionsRes] = await Promise.all([
          apiClient<DocumentItem[]>(`/api/v1/documents/?space_id=${spaceId}`).catch(() => []),
          apiClient<MemoryItem[]>(`/api/v1/memories?space_id=${spaceId}`).catch(() => []),
          apiClient<KnowledgeItem[]>(`/api/v1/knowledge?space_id=${spaceId}`).catch(() => []),
          apiClient<ProjectItem[]>(`/api/v1/projects?space_id=${spaceId}`).catch(() => []),
          apiClient<{ items: ActionProposal[] } | ActionProposal[]>(
            `/api/v1/actions?space_id=${spaceId}&limit=50`
          ).catch(() => ({ items: [] })),
        ]);
        setDocuments(docsRes || []);
        setMemories(memsRes || []);
        setKnowledgeItems(knowRes || []);
        setProjects(projsRes || []);
        const actionList = Array.isArray(actionsRes)
          ? actionsRes
          : (actionsRes && "items" in actionsRes && Array.isArray(actionsRes.items))
          ? actionsRes.items
          : [];
        setProposals(actionList);
      } catch (err) {
        console.error("Failed to load map data:", err);
      }
    }
    loadData();
  }, [spaceId]);

  const space = spaces.find((s) => s.id === spaceId) || currentSpace;

  const handleReinforce = async (memoryId: string) => {
    if (isReinforcing) return;
    setIsReinforcing(true);
    try {
      await apiClient(`/api/v1/memories/${memoryId}/reinforce`, { method: "POST" });
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId
            ? { ...m, confidence: Math.min(1.0, (Number(m.confidence) || 0.8) + 0.05) }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to reinforce memory:", err);
    } finally {
      setIsReinforcing(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4 text-sky-400" />;
      case "memory":
        return <Brain className="w-4 h-4 text-purple-400" />;
      case "project":
        return <FolderGit2 className="w-4 h-4 text-emerald-400" />;
      case "proposal":
        return <Zap className="w-4 h-4 text-amber-400" />;
      default:
        return <Cpu className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#08090d] text-zinc-100 antialiased font-sans select-none">
      <CommandSidebar spaceId={spaceId} space={space} />

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-13 px-6 border-b border-white/[0.06] bg-[#08090d]/80 backdrop-blur-xl flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <Link
              href={`/spaces/${spaceId}`}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </Link>

            <div className="h-4 w-px bg-white/10" />

            <div>
              <h1 className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Knowledge Map</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span>{documents.length} Documents</span>
            <span className="text-zinc-600">•</span>
            <span>{memories.length} Rules</span>
            <span className="text-zinc-600">•</span>
            <span>{projects.length} Projects</span>
            <span className="text-zinc-600">•</span>
            <span>{knowledgeItems.length} Concepts</span>
          </div>
        </header>

        {/* 100% Full-Canvas Viewport with Force Physics */}
        <div className="flex-1 relative w-full h-full overflow-hidden">
          <NeuralGraphCanvas
            documents={documents}
            memories={memories}
            knowledgeItems={knowledgeItems}
            projects={projects}
            proposals={proposals.map((p) => ({
              id: p.proposal_id || p.id,
              reason: p.reason,
              action_type: p.action_type,
            }))}
            selectedNodeId={selectedNode?.id}
            onSelectNode={(node) => setSelectedNode(node)}
          />

          {/* Slide-over Frosted Glass Inspector Drawer */}
          {selectedNode && (
            <div className="absolute top-4 bottom-4 right-6 w-96 bg-[#0c0d16]/95 backdrop-blur-3xl border border-white/[0.12] rounded-3xl shadow-2xl p-6 z-30 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-md"
                      style={{
                        backgroundColor: `${selectedNode.color}15`,
                        borderColor: `${selectedNode.color}35`,
                      }}
                    >
                      {getNodeIcon(selectedNode.type)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                        {selectedNode.type} Node
                      </span>
                      <h2 className="text-sm font-bold text-white leading-tight truncate">
                        {selectedNode.title}
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtitle & Confidence */}
                {selectedNode.subtitle && (
                  <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-slate-300 flex items-center justify-between">
                    <span>{selectedNode.subtitle}</span>
                  </div>
                )}

                {/* Content Details */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Vector Content & Lineage
                  </div>
                  <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.05] text-xs text-slate-200 leading-relaxed max-h-56 overflow-y-auto font-sans shadow-inner">
                    {selectedNode.content || selectedNode.subtitle || "No additional excerpt recorded."}
                  </div>
                </div>

                {/* Direct Action triggers based on Node Type */}
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  {selectedNode.type === "document" && (
                    <Link
                      href={`/spaces/${spaceId}/knowledge/documents/${selectedNode.id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 font-semibold text-xs transition-colors cursor-pointer shadow-md"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Inspect Vector Chunks</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  )}

                  {selectedNode.type === "memory" && (
                    <button
                      type="button"
                      onClick={() => handleReinforce(selectedNode.id)}
                      disabled={isReinforcing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-md"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>{isReinforcing ? "Reinforcing..." : "Reinforce Axiom (+5%)"}</span>
                    </button>
                  )}

                  {selectedNode.type === "project" && (
                    <Link
                      href={`/spaces/${spaceId}/work/projects/${selectedNode.id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors cursor-pointer shadow-md"
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span>Inspect Initiative in Work Hub</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}

                  {selectedNode.type === "concept" && (
                    <Link
                      href={`/spaces/${spaceId}/knowledge`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition-colors cursor-pointer shadow-md"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>View in Knowledge Vault</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-white/[0.06] text-[11px] font-mono text-slate-500 flex items-center justify-between">
                <span>NODE: {selectedNode.id.slice(0, 14)}...</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PHYSICS STABLE
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
