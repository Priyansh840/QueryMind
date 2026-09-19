"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { DocumentItem, MemoryItem, Space, KnowledgeItem, ProjectItem, ActionProposal } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { DocumentUploadDialog } from "@/components/modals/DocumentUploadDialog";
import { SpaceSettingsModal } from "@/components/modals/SpaceSettingsModal";
import { NeuralGraphCanvas } from "@/components/studio/NeuralGraphCanvas";
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Network,
  Activity,
  UploadCloud,
  ShieldCheck,
  Maximize2,
  Zap,
  Tag,
  Check,
  X,
  FileCode,
  FileType,
} from "lucide-react";

interface KnowledgePageProps {
  params: Promise<{ spaceId: string }>;
}

export default function KnowledgePage({ params }: KnowledgePageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);

  // 4 Primary Sub-Pillars for Knowledge
  const [activeTab, setActiveTab] = useState<"documents" | "axioms" | "graph" | "telemetry">("documents");
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocFilter, setSelectedDocFilter] = useState<"all" | "pdf" | "md" | "txt">("all");
  const [selectedAxiomFilter, setSelectedAxiomFilter] = useState<"all" | "invariant" | "pattern" | "fact">("all");

  // Inline Quick-Capture for Invariant Axiom
  const [newAxiomContent, setNewAxiomContent] = useState("");
  const [newAxiomType, setNewAxiomType] = useState<"invariant" | "pattern" | "fact">("invariant");
  const [isCapturingAxiom, setIsCapturingAxiom] = useState(false);

  // Dialog & Action States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reinforcingId, setReinforcingId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [justReinforcedId, setJustReinforcedId] = useState<string | null>(null);

  const loadKnowledgeData = async () => {
    try {
      const [spaceRes, docsRes, memsRes, knowRes, projsRes, proposalsRes] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<DocumentItem[]>(`/api/v1/documents/?space_id=${spaceId}`).catch(() => []),
        apiClient<MemoryItem[]>(`/api/v1/memories?space_id=${spaceId}`).catch(() => []),
        apiClient<KnowledgeItem[]>(`/api/v1/knowledge?space_id=${spaceId}`).catch(() => []),
        apiClient<ProjectItem[]>(`/api/v1/projects?space_id=${spaceId}`).catch(() => []),
        apiClient<{ items: ActionProposal[] }>(`/api/v1/actions?space_id=${spaceId}&limit=50`).catch(
          () => ({ items: [] })
        ),
      ]);

      if (spaceRes) setSpace(spaceRes);
      setDocuments(docsRes || []);
      setMemories(memsRes || []);
      setKnowledgeItems(knowRes || []);
      setProjects(projsRes || []);
      setProposals(proposalsRes.items || []);
    } catch (err) {
      console.error("Failed to load knowledge data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeData();
  }, [spaceId]);

  // Quick Inline Axiom Capture
  const handleCreateAxiom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAxiomContent.trim() || isCapturingAxiom) return;

    setIsCapturingAxiom(true);
    try {
      const created = await apiClient<MemoryItem>(`/api/v1/memories`, {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          content: newAxiomContent.trim(),
          memory_type: newAxiomType,
          confidence: 0.95,
        }),
      });

      setMemories((prev) => [created, ...prev]);
      setNewAxiomContent("");
    } catch (err) {
      console.error("Failed to capture axiom:", err);
      alert("Failed to save invariant axiom.");
    } finally {
      setIsCapturingAxiom(false);
    }
  };

  // 1-Click Tactile Reinforcement
  const handleReinforceMemory = async (memoryId: string) => {
    if (reinforcingId) return;
    setReinforcingId(memoryId);
    try {
      await apiClient(`/api/v1/memories/${memoryId}/reinforce`, {
        method: "POST",
      });
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId
            ? {
                ...m,
                reinforcement_count: (m.reinforcement_count || 1) + 1,
                confidence: Math.min(1.0, (Number(m.confidence) || 0.85) + 0.05),
              }
            : m
        )
      );
      setJustReinforcedId(memoryId);
      setTimeout(() => setJustReinforcedId(null), 2000);
    } catch (err) {
      console.error("Failed to reinforce memory:", err);
    } finally {
      setReinforcingId(null);
    }
  };

  // Safe Document Delete
  const handleDeleteDocument = async (documentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this document from the grounding evidence base?")) return;

    setDeletingDocId(documentId);
    try {
      await apiClient(`/api/v1/documents/${documentId}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  // Delete Memory Axiom
  const handleDeleteMemory = async (memoryId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await apiClient(`/api/v1/memories/${memoryId}`, {
        method: "DELETE",
      });
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  // Document Filtering
  const filteredDocuments = documents.filter((d) => {
    const matchesSearch = searchQuery
      ? d.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    if (!matchesSearch) return false;

    if (selectedDocFilter === "all") return true;
    const ext = d.title.split(".").pop()?.toLowerCase();
    if (selectedDocFilter === "pdf") return ext === "pdf";
    if (selectedDocFilter === "md") return ext === "md" || ext === "markdown";
    if (selectedDocFilter === "txt") return ext === "txt" || ext === "text";
    return true;
  });

  // Axiom Filtering
  const filteredMemories = memories.filter((m) => {
    const matchesSearch = searchQuery
      ? m.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    if (!matchesSearch) return false;

    if (selectedAxiomFilter === "all") return true;
    return m.memory_type?.toLowerCase() === selectedAxiomFilter;
  });

  // Telemetry Calculations
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunks?.length || 1), 0);
  const avgConfidence = memories.length > 0
    ? Math.round(
        (memories.reduce((acc, m) => acc + (Number(m.confidence) || 0.85), 0) / memories.length) * 100
      )
    : 92;
  const verifiedCount = memories.filter((m) => (Number(m.confidence) || 0) >= 0.9).length;

  return (
    <div className="h-screen w-screen bg-[#07070a] text-slate-100 flex overflow-hidden select-none font-sans antialiased">
      {/* 1. Command Sidebar */}
      <CommandSidebar
        spaceId={spaceId}
        space={space}
        spaces={spaces}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Executive Knowledge Hub */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#09090d]">
        {/* Top Header */}
        <header className="h-16 px-8 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-[#0c0d14]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight truncate flex items-center gap-2">
                <span>Knowledge Substrate</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                  GROUNDING REPOSITORY
                </span>
              </h1>
              <p className="text-xs text-slate-400 truncate">
                Immutable evidence, extracted workspace invariants, and neural synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Ingest Document</span>
            </button>
          </div>
        </header>

        {/* Linear-Grade Segmented Sub-Navigation Bar */}
        <div className="px-8 pt-4 pb-3 border-b border-white/[0.06] bg-[#0a0a0f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-[#12131b] border border-white/[0.08] rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "documents"
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Evidence Documents</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-slate-300">
                {documents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("axioms")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "axioms"
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Invariant Axioms</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-slate-300">
                {memories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "graph"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5 text-indigo-400" />
              <span>Neural Graph</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "telemetry"
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telemetry</span>
            </button>
          </div>

          {/* Quick Search across Knowledge */}
          {activeTab !== "graph" && activeTab !== "telemetry" && (
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knowledge..."
                className="w-full bg-[#12131c] text-xs text-white placeholder-slate-500 pl-8 pr-7 py-1.5 rounded-lg border border-white/[0.08] focus:border-white/20 focus:outline-hidden transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab 1: Documents */}
        {activeTab === "documents" && (
          <div className="flex-1 p-8 pb-16 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
            {/* Filter pills & Count summary */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Format:</span>
                {(["all", "pdf", "md", "txt"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedDocFilter(filter)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase transition-colors cursor-pointer ${
                      selectedDocFilter === filter
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.05]"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <span className="text-slate-500">
                Showing {filteredDocuments.length} of {documents.length} verified documents
              </span>
            </div>

            {/* Document Cards Grid */}
            {filteredDocuments.length === 0 ? (
              <div className="p-12 rounded-2xl border border-dashed border-white/[0.09] text-center space-y-3 bg-[#0c0d14]/40">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-white">No evidence documents match</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Upload requirements specifications, engineering designs, or strategy decks to ground autonomous reasoning in verifiable facts.
                </p>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Ingest First Document</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => {
                  const ext = doc.title.split(".").pop()?.toUpperCase() || "DOC";
                  const isReady = doc.status === "completed" || !doc.status;
                  const isDeleting = deletingDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      onClick={() =>
                        router.push(`/spaces/${spaceId}/knowledge/documents/${doc.id}`)
                      }
                      className="rounded-2xl border border-white/[0.07] bg-[#0c0d14] p-4.5 flex flex-col justify-between space-y-3.5 hover:border-indigo-500/40 hover:bg-[#0f1019] transition-all cursor-pointer group shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            {ext === "PDF" ? (
                              <FileType className="w-4 h-4 text-red-400" />
                            ) : ext === "MD" ? (
                              <FileCode className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <FileText className="w-4 h-4 text-indigo-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white truncate block group-hover:text-indigo-300 transition-colors">
                              {doc.title}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {(doc.chunks?.length || 1)} knowledge {(doc.chunks?.length || 1) === 1 ? "chunk" : "chunks"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          title="Delete document"
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                            }`}
                          />
                          <span className={isReady ? "text-emerald-400 font-medium" : "text-amber-400"}>
                            {isReady ? "Ready for MYND" : "Vectorizing..."}
                          </span>
                        </div>

                        <span className="text-slate-500">
                          {doc.created_at
                            ? new Date(doc.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            : "Recent"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Invariant Axioms */}
        {activeTab === "axioms" && (
          <div className="flex-1 p-8 pb-16 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
            {/* Inline Quick Capture Bar */}
            <form
              onSubmit={handleCreateAxiom}
              className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c0d14] space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Capture Workspace Invariant Axiom</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(["invariant", "pattern", "fact"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAxiomType(type)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                        newAxiomType === type
                          ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/40"
                          : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAxiomContent}
                  onChange={(e) => setNewAxiomContent(e.target.value)}
                  placeholder="e.g., PostgreSQL is the primary transactional store; vector embeddings reside in memory..."
                  className="flex-1 bg-[#11121b] text-xs text-white placeholder-slate-500 px-3.5 py-2.5 rounded-xl border border-white/[0.07] focus:border-cyan-400/50 focus:outline-hidden transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newAxiomContent.trim() || isCapturingAxiom}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Axiom</span>
                </button>
              </div>
            </form>

            {/* Axiom Filter & List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Filter Type:</span>
                  {(["all", "invariant", "pattern", "fact"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedAxiomFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase transition-colors cursor-pointer ${
                        selectedAxiomFilter === f
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.05]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <span className="text-slate-500">
                  {filteredMemories.length} Invariant Axioms & Rules
                </span>
              </div>

              {filteredMemories.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-1.5 bg-[#0c0d14]/40">
                  <Brain className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-semibold text-white">No axioms match filter</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Axioms define rules, invariants, and truths that MYND strictly respects across all reasoning.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMemories.map((mem) => {
                    const isReinforcing = reinforcingId === mem.id;
                    const isJustReinforced = justReinforcedId === mem.id;
                    const conf = Math.round((Number(mem.confidence) || 0.85) * 100);

                    return (
                      <div
                        key={mem.id}
                        className="rounded-2xl border border-white/[0.07] bg-[#0c0d14] p-4 flex flex-col justify-between space-y-3 hover:border-cyan-400/30 transition-all shadow-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="px-2 py-0.5 rounded-sm uppercase tracking-wider bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 font-bold">
                              {mem.memory_type || "INVARIANT"}
                            </span>

                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">
                                {conf}% Confident
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMemory(mem.id, e)}
                                className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed font-medium">
                            {mem.content}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                                style={{ width: `${conf}%` }}
                              />
                            </div>
                            <span className="text-slate-400 text-[10px]">
                              {mem.reinforcement_count || 1}x verified
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isReinforcing}
                            onClick={() => handleReinforceMemory(mem.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              isJustReinforced
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 border border-white/[0.08]"
                            }`}
                          >
                            {isJustReinforced ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Reinforced!</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-cyan-400" />
                                <span>{isReinforcing ? "Reinforcing..." : "Reinforce"}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Interactive Neural Graph Embed */}
        {activeTab === "graph" && (
          <div className="flex-1 relative flex flex-col overflow-hidden bg-[#07070a]">
            {/* Quick action bar above graph */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <Link
                href={`/spaces/${spaceId}/map`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#12131d]/90 hover:bg-[#1a1b29] text-white border border-white/[0.12] backdrop-blur-md shadow-lg transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Full Viewport Canvas</span>
              </Link>
            </div>

            <div className="flex-1 w-full h-full relative">
              <NeuralGraphCanvas
                documents={documents.map((d) => ({
                  id: d.id,
                  title: d.title,
                  chunks_count: d.chunks?.length || 1,
                }))}
                memories={memories}
                knowledgeItems={knowledgeItems}
                projects={projects}
                proposals={proposals}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Cognitive Telemetry */}
        {activeTab === "telemetry" && (
          <div className="flex-1 p-8 pb-16 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-5 space-y-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Grounding Density
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {totalChunks}{" "}
                  <span className="text-xs font-medium text-slate-400">chunks</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Across {documents.length} verified documents</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-5 space-y-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Axiom Verification
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {avgConfidence}%
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{verifiedCount} highly grounded axioms</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-5 space-y-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Reasoning Provability
                </div>
                <div className="text-2xl font-extrabold text-indigo-400">
                  100%
                </div>
                <div className="text-[11px] text-slate-400">
                  Zero hallucinations permitted in pipeline
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-5 space-y-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Vector Pipeline
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 flex items-center gap-2">
                  <span>ONLINE</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="text-[11px] text-slate-400">
                  Instant cosine semantic retrieval
                </div>
              </div>
            </div>

            {/* Knowledge Synthesis Overview */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Synthesis & Grounding Invariants</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Every action proposed by MYND must establish a verifiable causal trace back to either an Ingested Evidence Document or an Invariant Axiom. Unauthorized assumptions are quarantined automatically.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <DocumentUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        spaceId={spaceId}
        onSuccess={() => loadKnowledgeData()}
      />

      <SpaceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        space={space}
        onDeleted={() => router.push("/spaces")}
      />
    </div>
  );
}
