"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { DocumentItem, MemoryItem, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { DocumentUploadDialog } from "@/components/modals/DocumentUploadDialog";
import { SpaceSettingsModal } from "@/components/modals/SpaceSettingsModal";
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Brain,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
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
  const [activeTab, setActiveTab] = useState<"all" | "documents" | "memories">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reinforcingId, setReinforcingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadKnowledgeData = async () => {
    try {
      const [spaceRes, docsRes, memsRes] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<DocumentItem[]>(`/api/v1/documents/?space_id=${spaceId}`).catch(() => []),
        apiClient<MemoryItem[]>(`/api/v1/memories?space_id=${spaceId}`).catch(() => []),
      ]);

      if (spaceRes) setSpace(spaceRes);
      setDocuments(docsRes || []);
      setMemories(memsRes || []);
    } catch (err) {
      console.error("Failed to load knowledge data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeData();
  }, [spaceId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await apiClient<{ results: any[] }>(
        `/api/v1/search?space_id=${spaceId}&query=${encodeURIComponent(searchQuery.trim())}&types=document,memory`
      ).catch(() => ({ results: [] }));
      setSearchResults(res.results || []);
    } catch (err) {
      console.error("Failed search:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReinforceMemory = async (memoryId: string) => {
    setReinforcingId(memoryId);
    try {
      await apiClient(`/api/v1/memories/${memoryId}/reinforce`, {
        method: "POST",
      });
      // Update memory count locally
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId
            ? { ...m, reinforcement_count: (m.reinforcement_count || 1) + 1 }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to reinforce memory:", err);
    } finally {
      setReinforcingId(null);
    }
  };

  const handleDeleteDocument = async (documentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document and its vector embeddings?")) return;

    setDeletingId(documentId);
    try {
      await apiClient(`/api/v1/documents/${documentId}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

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

  const filteredDocuments = documents.filter((d) =>
    searchQuery && !searchResults
      ? d.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const filteredMemories = memories.filter((m) =>
    searchQuery && !searchResults
      ? m.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none">
      {/* 1. Command Sidebar */}
      <CommandSidebar
        spaceId={spaceId}
        space={space}
        spaces={spaces}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Knowledge Substrate */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-white truncate">
              Knowledge Hub
            </h1>
            <p className="text-xs text-slate-400 truncate">
              What MYND knows about this space and uses as grounding evidence
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest Document</span>
            </button>
          </div>
        </header>

        {/* Knowledge Body Container */}
        <div className="flex-1 p-8 pb-16 max-w-7xl mx-auto w-full space-y-6 min-w-0">
          {/* Search & Ingestion Bar */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-4 select-none">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-500 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setSearchResults(null);
                }}
                placeholder="Search across documents, extracted facts, and workspace memory..."
                className="w-full bg-[#12131a] text-sm text-white placeholder-slate-500 pl-11 pr-24 py-3 rounded-xl border border-white/[0.07] focus:border-white/20 focus:outline-hidden transition-colors"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-30 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-white/[0.08] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Knowledge ({documents.length + memories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "documents"
                  ? "bg-white/[0.08] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Documents ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("memories")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "memories"
                  ? "bg-white/[0.08] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Retained Memory ({memories.length})
            </button>
          </div>

          {/* Content Views */}
          {activeTab !== "memories" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-white">
                Grounded Documents
              </div>

              {filteredDocuments.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-2 bg-[#0c0d12]/50">
                  <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-semibold text-white">No documents found</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Upload specifications, notes, or PDFs to build grounding evidence for autonomous decisions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(true)}
                    className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors cursor-pointer"
                  >
                    Upload Document
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => {
                    const ext = doc.title.split(".").pop()?.toUpperCase() || "DOC";
                    const isReady = doc.status === "completed" || !doc.status;
                    const isDeleting = deletingId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        onClick={() =>
                          router.push(`/spaces/${spaceId}/knowledge/documents/${doc.id}`)
                        }
                        className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-4 flex flex-col justify-between space-y-3 hover:border-white/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8]/25 shrink-0">
                              {ext}
                            </span>
                            <span className="text-xs font-semibold text-white truncate group-hover:text-[#818cf8] transition-colors">
                              {doc.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteDocument(doc.id, e)}
                            title="Delete document"
                            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isReady ? "bg-cyan-400" : "bg-amber-400 animate-pulse"
                              }`}
                            />
                            <span>{isReady ? "Ready for MYND" : "Processing"}</span>
                          </div>

                          <span>
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

          {activeTab !== "documents" && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#818cf8]" />
                  <span>Retained Knowledge & Memory</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Learned facts and patterns synthesized by MYND
                </span>
              </div>

              {filteredMemories.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-1.5 bg-[#0c0d12]/50">
                  <Brain className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-semibold text-white">No retained memories yet</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    As you hold reasoning sessions, MYND extracts key invariants, patterns, and preferences into memory.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMemories.map((mem) => {
                    const isReinforcing = reinforcingId === mem.id;

                    return (
                      <div
                        key={mem.id}
                        className="rounded-xl border border-white/[0.06] bg-[#0c0d12] p-3.5 space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/[0.04] border border-white/[0.08] text-slate-300">
                            {mem.memory_type || "FACT"}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteMemory(mem.id, e)}
                            className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed font-normal">
                          {mem.content}
                        </p>

                        <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Reinforced {mem.reinforcement_count || 1} {mem.reinforcement_count === 1 ? "time" : "times"}
                          </span>

                          <button
                            type="button"
                            disabled={isReinforcing}
                            onClick={() => handleReinforceMemory(mem.id)}
                            className="flex items-center gap-1 text-[11px] font-medium text-[#818cf8] hover:text-white transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isReinforcing ? "Reinforcing..." : "Reinforce"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
