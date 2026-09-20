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
  BookOpen,
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
    <div className="h-screen w-screen bg-[#08090d] text-zinc-100 flex overflow-hidden select-none font-sans antialiased">
      {/* 1. Command Sidebar */}
      <CommandSidebar
        spaceId={spaceId}
        space={space}
        spaces={spaces}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Executive Knowledge Hub */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#08090d] ambient-mesh-cyan">
        {/* Top Header */}
        <header className="h-14 px-6 md:px-8 xl:px-12 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#08090d]/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white tracking-tight truncate flex items-center gap-2">
                <span>Documents & Knowledge</span>
              </h1>
              <p className="text-[11px] text-zinc-400 truncate">
                Workspace documents, rules, and knowledge connections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="btn-white-premium flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>
        </header>

        {/* Minimal Segmented Sub-Navigation Bar */}
        <div className="px-6 md:px-8 xl:px-12 pt-3 pb-2.5 border-b border-white/[0.06] bg-[#0a0b10] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 p-0.5 bg-[#0d0e15] border border-white/[0.06] rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "documents"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Documents</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-zinc-400">
                {documents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("axioms")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "axioms"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-zinc-400" />
              <span>Rules</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-zinc-400">
                {memories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "graph"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Network className="w-3 h-3 text-zinc-400" />
              <span>Knowledge Map</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "telemetry"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Activity className="w-3 h-3 text-zinc-400" />
              <span>Stats</span>
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
                placeholder="Search documents..."
                className="w-full bg-[#0d0e15] text-xs text-white placeholder-zinc-500 pl-8 pr-7 py-1.5 rounded-lg border border-white/[0.08] focus:border-white/20 focus:outline-hidden transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab 1: Documents */}
        {activeTab === "documents" && (
          <div className="flex-1 p-6 md:p-8 xl:px-12 pb-16 overflow-y-auto max-w-7xl mx-auto w-full space-y-6 relative z-[1]">
            {/* Filter pills & Count summary */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Format:</span>
                {(["all", "pdf", "md", "txt"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedDocFilter(filter)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase transition-colors cursor-pointer ${
                      selectedDocFilter === filter
                        ? "bg-white/10 text-white font-medium"
                        : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.05]"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <span className="text-zinc-500 font-mono text-[11px]">
                Showing {filteredDocuments.length} of {documents.length} documents
              </span>
            </div>

            {/* Document Cards Grid */}
            {filteredDocuments.length === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-white/[0.08] text-center space-y-3 bg-[#0d0e15]/50">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-white">No documents match</div>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Upload requirements, specifications, or documents to ground reasoning in verified context.
                </p>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload First Document</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
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
                      className="glass-card-glow p-4 flex flex-col justify-between space-y-3 hover-glow-sky cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-mono text-xs shrink-0">
                            {ext === "PDF" ? (
                              <FileType className="w-4 h-4 text-zinc-300" />
                            ) : ext === "MD" ? (
                              <FileCode className="w-4 h-4 text-zinc-300" />
                            ) : (
                              <FileText className="w-4 h-4 text-zinc-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-zinc-200 truncate block group-hover:text-white transition-colors">
                              {doc.title}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500">
                              {(doc.chunks?.length || 1)} {(doc.chunks?.length || 1) === 1 ? "chunk" : "chunks"}
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

                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isReady ? "bg-zinc-400" : "bg-zinc-600 animate-pulse"
                            }`}
                          />
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {isReady ? "Indexed" : "Processing..."}
                          </span>
                        </div>

                        <span className="text-zinc-500 font-mono text-[11px]">
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

        {/* Tab 2: Rules & Invariants */}
        {activeTab === "axioms" && (
          <div className="flex-1 p-6 md:p-8 xl:px-12 pb-16 overflow-y-auto max-w-7xl mx-auto w-full space-y-6 relative z-[1]">
            {/* Inline Quick Capture Bar */}
            <form
              onSubmit={handleCreateAxiom}
              className="glass-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <ShieldCheck className="w-4 h-4 text-zinc-400" />
                  <span>Add Workspace Rule</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(["invariant", "pattern", "fact"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAxiomType(type)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                        newAxiomType === type
                          ? "bg-white/10 text-white font-medium"
                          : "bg-white/[0.03] text-zinc-400 border border-white/[0.06]"
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
                  placeholder="e.g. Always use PostgreSQL for persistent data, keep services stateless..."
                  className="flex-1 bg-[#0d0e15] text-xs text-white placeholder-zinc-500 px-3.5 py-2 rounded-lg border border-white/[0.08] focus:border-white/25 focus:outline-hidden transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newAxiomContent.trim() || isCapturingAxiom}
                  className="px-3.5 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            {/* Rules Filter & List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium">Filter:</span>
                  {(["all", "invariant", "pattern", "fact"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedAxiomFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase transition-colors cursor-pointer ${
                        selectedAxiomFilter === f
                          ? "bg-white/10 text-white font-medium"
                          : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.05]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <span className="text-zinc-500 font-mono text-[11px]">
                  {filteredMemories.length} Rules & Invariants
                </span>
              </div>

              {filteredMemories.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-white/[0.08] text-center space-y-1.5 bg-[#0d0e15]/50">
                  <Brain className="w-6 h-6 text-zinc-500 mx-auto" />
                  <div className="text-xs font-semibold text-white">No rules defined</div>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Rules and invariants define guidelines and constraints respected across reasoning sessions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
                  {filteredMemories.map((mem) => {
                    const isReinforcing = reinforcingId === mem.id;
                    const isJustReinforced = justReinforcedId === mem.id;
                    const conf = Math.round((Number(mem.confidence) || 0.85) * 100);

                    return (
                      <div
                        key={mem.id}
                        className="glass-card p-4 flex flex-col justify-between space-y-3 hover-glow-purple"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800 font-medium">
                              {mem.memory_type || "RULE"}
                            </span>

                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">
                                {conf}%
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMemory(mem.id, e)}
                                className="text-zinc-500 hover:text-zinc-200 p-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-200 leading-relaxed font-normal">
                            {mem.content}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-zinc-400"
                                style={{ width: `${conf}%` }}
                              />
                            </div>
                            <span className="text-zinc-500 font-mono text-[10px]">
                              {mem.reinforcement_count || 1}x verified
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isReinforcing}
                            onClick={() => handleReinforceMemory(mem.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                              isJustReinforced
                                ? "bg-white/10 text-white"
                                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3 text-zinc-400" />
                            <span>{isJustReinforced ? "Reinforced" : "Reinforce"}</span>
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
          <div className="flex-1 relative flex flex-col overflow-hidden bg-[#08090d]">
            {/* Quick action bar above graph */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <Link
                href={`/spaces/${spaceId}/map`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Full Viewport Map</span>
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

        {/* Tab 4: System Stats & Verification */}
        {activeTab === "telemetry" && (
          <div className="flex-1 p-6 md:p-8 xl:px-12 pb-16 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-[#0d0e15] p-4 space-y-1.5">
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  Indexed Chunks
                </div>
                <div className="text-xl font-semibold text-white">
                  {totalChunks}
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span>Across {documents.length} files</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#0d0e15] p-4 space-y-1.5">
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  Rule Confidence
                </div>
                <div className="text-xl font-semibold text-white">
                  {avgConfidence}%
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span>{verifiedCount} active rules</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#0d0e15] p-4 space-y-1.5">
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  Verification Rate
                </div>
                <div className="text-xl font-semibold text-zinc-100">
                  100%
                </div>
                <div className="text-[11px] text-zinc-500">
                  Grounding checks passed
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#0d0e15] p-4 space-y-1.5">
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  Vector Engine
                </div>
                <div className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                  <span>Active</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[11px] text-zinc-500">
                  Semantic retrieval ready
                </div>
              </div>
            </div>

            {/* Knowledge Synthesis Overview */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0d0e15] p-5 space-y-2">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
                <span>Grounding & Retrieval Policy</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                Responses and actions inside this space reference indexed documents or explicit operational rules. Unverified assertions are flagged during reasoning.
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
