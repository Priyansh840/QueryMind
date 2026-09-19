"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { ConstellationRadar, ConstellationNode } from "@/components/studio/ConstellationRadar";
import { ArrowLeft, Sparkles, Filter, ExternalLink } from "lucide-react";
import { DocumentItem, MemoryItem, KnowledgeItem, ProjectItem, ActionProposal } from "@/types/api";

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
  const [selectedNode, setSelectedNode] = useState<ConstellationNode | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [docsRes, memsRes, knowRes, projsRes, actionsRes] = await Promise.all([
          apiClient<DocumentItem[]>(`/api/v1/spaces/${spaceId}/documents`).catch(() => []),
          apiClient<MemoryItem[]>(`/api/v1/spaces/${spaceId}/memories`).catch(() => []),
          apiClient<KnowledgeItem[]>(`/api/v1/knowledge?space_id=${spaceId}`).catch(() => []),
          apiClient<ProjectItem[]>(`/api/v1/spaces/${spaceId}/projects`).catch(() => []),
          apiClient<ActionProposal[]>(`/api/v1/spaces/${spaceId}/actions/pending`).catch(() => []),
        ]);
        setDocuments(docsRes || []);
        setMemories(memsRes || []);
        setKnowledgeItems(knowRes || []);
        setProjects(projsRes || []);
        setProposals(actionsRes || []);
      } catch (err) {
        console.error("Failed to load map data:", err);
      }
    }
    loadData();
  }, [spaceId]);

  const space = spaces.find((s) => s.id === spaceId) || currentSpace;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07070a] text-slate-100">
      <CommandSidebar spaceId={spaceId} space={space} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="h-14 px-6 border-b border-white/[0.06] bg-[#0c0d12] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href={`/spaces/${spaceId}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Canvas</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div>
              <h1 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Neural Knowledge Map</span>
              </h1>
              <div className="text-[10px] text-slate-400">
                Full-canvas vector space representation of grounded intelligence & retained memory
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>{documents.length} Docs</span>
            <span>•</span>
            <span>{knowledgeItems.length} Concepts</span>
            <span>•</span>
            <span>{memories.length} Memories</span>
            <span>•</span>
            <span>{projects.length} Initiatives</span>
          </div>
        </div>

        {/* Full Canvas View */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <ConstellationRadar
            documents={documents}
            memories={memories.map((m) => ({
              id: m.id,
              title: m.content.length > 30 ? `${m.content.slice(0, 30)}...` : m.content,
              confidence: `${Math.round(m.confidence * 100)}%`,
            }))}
            knowledgeItems={knowledgeItems}
            projects={projects}
            proposals={proposals.map((p) => ({
              id: p.proposal_id || p.id,
              title: p.reason || p.action_type,
            }))}
            onSelectNode={(node) => setSelectedNode(node)}
          />

          {/* Selected Node Inspector Tray */}
          {selectedNode && (
            <div className="p-4 border-t border-white/[0.08] bg-[#0b0c10]/95 backdrop-blur-md flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <div>
                  <div className="font-semibold text-white text-sm">{selectedNode.title}</div>
                  <div className="text-xs text-slate-400">
                    Type: <span className="capitalize">{selectedNode.type}</span> · {selectedNode.subtitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedNode.type === "document" && (
                  <Link
                    href={`/spaces/${spaceId}/knowledge/documents/${selectedNode.id}`}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors flex items-center gap-1.5"
                  >
                    <span>Inspect Chunks</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                <button
                  onClick={() => setSelectedNode(null)}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
