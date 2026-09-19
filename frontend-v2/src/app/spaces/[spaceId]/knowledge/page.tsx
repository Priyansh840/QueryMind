"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiClient } from "@/lib/api/client";
import {
  DocumentItem,
  MemoryItem,
  SearchResponse,
  SearchResultItem,
  Space,
} from "@/types/api";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import {
  Layers,
  FileText,
  Brain,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  AlertCircle,
  Clock,
  Trash2,
  ArrowRight,
  ThumbsUp,
  CheckCircle2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface KnowledgePageProps {
  params: Promise<{ spaceId: string }>;
}

type KnowledgeFilterTab = "all" | "documents" | "memory";

export default function KnowledgePage({ params }: KnowledgePageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  const [space, setSpace] = useState<Space | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<KnowledgeFilterTab>("all");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Loading & Action State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [reinforcingMemoryId, setReinforcingMemoryId] = useState<string | null>(null);

  const loadKnowledgeData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [spaceData, docsData, memoriesData] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<DocumentItem[]>(`/api/v1/documents/?space_id=${spaceId}`).catch(() => []),
        apiClient<MemoryItem[]>(`/api/v1/memories?space_id=${spaceId}`).catch(() => []),
      ]);

      if (spaceData) setSpace(spaceData);
      setDocuments(docsData || []);
      setMemories(memoriesData || []);
    } catch (err: any) {
      console.error("Failed to load knowledge data:", err);
      setError(err?.message || "Failed to load knowledge for this space.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadKnowledgeData();
  }, [spaceId]);

  // Handle Search using backend Space-scoped search API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await apiClient<SearchResponse>(
        `/api/v1/search?query=${encodeURIComponent(q)}&space_id=${spaceId}&types=document,knowledge,memory`
      );
      setSearchResults(res?.results || []);
    } catch (err) {
      console.error("Knowledge search error:", err);
      // Fallback: search client-side
      const docMatches: SearchResultItem[] = documents
        .filter((d) => d.title.toLowerCase().includes(q.toLowerCase()))
        .map((d) => ({
          id: d.id,
          type: "document",
          title: d.title,
          snippet: `Document (${d.type || "knowledge"})`,
          space_id: spaceId,
          href: `/spaces/${spaceId}/knowledge/documents/${d.id}`,
        }));
      const memoryMatches: SearchResultItem[] = memories
        .filter((m) => m.content.toLowerCase().includes(q.toLowerCase()))
        .map((m) => ({
          id: m.id,
          type: "memory",
          title: m.content.slice(0, 50),
          snippet: m.content,
          space_id: spaceId,
          href: `/spaces/${spaceId}/knowledge`,
        }));
      setSearchResults([...docMatches, ...memoryMatches]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  // Handle Document Deletion
  const handleDeleteDocument = async (docId: string, docTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${docTitle}"?`)) {
      return;
    }

    setDeletingDocId(docId);
    try {
      await apiClient(`/api/v1/documents/${docId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (searchResults) {
        setSearchResults((prev) => prev?.filter((r) => r.id !== docId) || null);
      }
    } catch (err: any) {
      console.error("Failed to delete document:", err);
      alert(err?.message || "Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  // Handle Memory Reinforcement
  const handleReinforceMemory = async (memoryId: string) => {
    setReinforcingMemoryId(memoryId);
    try {
      const updated = await apiClient<MemoryItem>(`/api/v1/memories/${memoryId}/reinforce`, {
        method: "POST",
      });
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? updated : m)));
    } catch (err: any) {
      console.error("Failed to reinforce memory:", err);
      alert(err?.message || "Failed to reinforce knowledge item.");
    } finally {
      setReinforcingMemoryId(null);
    }
  };

  // Filter Tabs Configuration
  const filterTabs: { id: KnowledgeFilterTab; label: string; count?: number }[] = [
    { id: "all", label: "All Knowledge" },
    { id: "documents", label: "Documents", count: documents.length },
    { id: "memory", label: "Retained Knowledge", count: memories.length },
  ];

  if (isLoading && !space && documents.length === 0) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </AppShell>
    );
  }

  const isSpaceEmpty = documents.length === 0 && memories.length === 0 && !isLoading;

  return (
    <AppShell>
      <DocumentUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        spaceId={spaceId}
        onSuccess={() => {
          loadKnowledgeData(true);
        }}
      />

      <div className="space-y-8 pb-16 max-w-6xl mx-auto">
        {/* =========================================================================
            1. HEADER — What MYND knows about this Space
            ========================================================================= */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-b border-[var(--border-subtle)] pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-xl shrink-0 font-bold text-[var(--accent-primary)] shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Knowledge
                </h1>
                <span className="text-xs text-[var(--text-muted)]">•</span>
                <span className="text-xs font-semibold text-[var(--accent-text)]">
                  {space?.name || "Workspace"}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-xl leading-relaxed">
                What MYND knows about this Space and uses as evidence when reasoning and proposing actions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadKnowledgeData(true)}
              disabled={isLoading || isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsUploadOpen(true)}
            >
              Add Knowledge
            </Button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <Surface variant="primary" className="p-3.5 border-l-4 border-l-[var(--error-border)] bg-[var(--error-surface)]">
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--error-text)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadKnowledgeData()}>
                Retry
              </Button>
            </div>
          </Surface>
        )}

        {/* =========================================================================
            2. USER-FACING KNOWLEDGE SEARCH
            ========================================================================= */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={handleClearSearch}
              placeholder="Search what MYND knows about this Space (e.g. policies, architecture, vendor facts)..."
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="md"
            isLoading={isSearching}
            leftIcon={<Search className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
          >
            Search
          </Button>
        </form>

        {/* =========================================================================
            3. SEARCH RESULTS (Clean, Human Excerpts without Vector Jargon)
            ========================================================================= */}
        {searchResults !== null && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                  Knowledge Matches ({searchResults.length})
                </span>
                <span className="text-xs text-[var(--text-muted)]">for &quot;{searchQuery}&quot;</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                Clear Search
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((item, idx) => (
                  <Surface
                    key={`${item.id}-${idx}`}
                    variant="primary"
                    className="p-4 border-l-2 border-l-[var(--accent-primary)] hover:border-[var(--border-strong)] transition-mynd"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
                      <div className="flex items-center gap-2">
                        {item.type === "document" ? (
                          <FileText className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                        ) : (
                          <Brain className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                        )}
                        <span className="font-semibold text-[var(--text-primary)]">
                          {item.title}
                        </span>
                        <Badge variant="outline" size="sm">
                          {item.type}
                        </Badge>
                      </div>

                      {item.type === "document" && (
                        <Link
                          href={`/spaces/${spaceId}/knowledge/documents/${item.id}`}
                          className="text-[var(--accent-text)] hover:underline flex items-center gap-1 font-semibold"
                        >
                          View Document <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    {item.snippet && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {item.snippet}
                      </p>
                    )}
                  </Surface>
                ))}
              </div>
            ) : (
              <Surface variant="primary" className="p-8 text-center border border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  No matching knowledge found in this space for &quot;{searchQuery}&quot;.
                </p>
              </Surface>
            )}
          </div>
        )}

        {/* =========================================================================
            4. FILTER NAVIGATION BAR
            ========================================================================= */}
        {searchResults === null && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs rounded-[var(--radius-sm)] font-medium transition-mynd flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === "number" && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-text)] font-semibold"
                          : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            5. EMPTY SPACE STATE
            ========================================================================= */}
        {searchResults === null && isSpaceEmpty && (
          <EmptyState
            icon={<Layers className="w-8 h-8 text-[var(--text-muted)]" />}
            title="MYND doesn't know much about this Space yet."
            description="Documents and retained records give MYND evidence it can use when answering questions and evaluating decisions."
            actionLabel="Add your first document"
            onAction={() => setIsUploadOpen(true)}
          />
        )}

        {/* =========================================================================
            6. DOCUMENTS (Grounding Evidence Sources)
            ========================================================================= */}
        {searchResults === null && !isSpaceEmpty && (activeFilter === "all" || activeFilter === "documents") && (
          <section aria-labelledby="documents-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 id="documents-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  Documents & Files
                </h2>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {documents.length} {documents.length === 1 ? "Source" : "Sources"}
              </span>
            </div>

            {documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {documents.map((doc) => {
                  const isReady = doc.status === "completed";
                  const isProcessing = doc.status === "processing" || doc.status === "pending";
                  const isFailed = doc.status === "failed";
                  const isDeleting = deletingDocId === doc.id;

                  const humanStatusLabel = isReady
                    ? "Ready for MYND"
                    : isProcessing
                    ? "Processing document..."
                    : isFailed
                    ? "Needs attention"
                    : doc.status;

                  return (
                    <Surface
                      key={doc.id}
                      variant="primary"
                      className="p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-mynd flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                {doc.type || "Document"}
                              </span>
                              <Badge
                                variant={isReady ? "default" : isFailed ? "outline" : "accent"}
                                size="sm"
                              >
                                {humanStatusLabel}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1 truncate">
                              {doc.title}
                            </h3>
                          </div>

                          <button
                            type="button"
                            title="Remove document"
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteDocument(doc.id, doc.title, e)}
                            className="text-[var(--text-muted)] hover:text-[var(--error-text)] p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Added {formatRelativeTime(doc.created_at)}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-[var(--text-muted)]">Evidence Source</span>
                        <Link
                          href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                          className="text-[var(--accent-text)] hover:underline flex items-center gap-1 font-semibold"
                        >
                          View Excerpts <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </Surface>
                  );
                })}
              </div>
            ) : (
              <Surface variant="primary" className="p-6 text-center border border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-secondary)]">No documents uploaded to this space yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-2 text-xs"
                >
                  Upload First Document
                </Button>
              </Surface>
            )}
          </section>
        )}

        {/* =========================================================================
            7. RETAINED KNOWLEDGE (Facts & Preferences from Sessions)
            ========================================================================= */}
        {searchResults === null && !isSpaceEmpty && (activeFilter === "all" || activeFilter === "memory") && (
          <section aria-labelledby="memory-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 id="memory-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  Retained Knowledge & Facts
                </h2>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {memories.length} {memories.length === 1 ? "Record" : "Records"}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Knowledge MYND has retained from previous sessions and verified work in this Space.
            </p>

            {memories.length > 0 ? (
              <div className="space-y-3">
                {memories.map((mem) => {
                  const isReinforcing = reinforcingMemoryId === mem.id;
                  return (
                    <Surface
                      key={mem.id}
                      variant="primary"
                      className="p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-mynd flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" size="sm">
                            {mem.memory_type}
                          </Badge>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Retained {formatRelativeTime(mem.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                          {mem.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isReinforcing}
                          onClick={() => handleReinforceMemory(mem.id)}
                          leftIcon={<ThumbsUp className="w-3 h-3 text-[var(--accent-text)]" />}
                          className="text-xs"
                        >
                          Reinforce ({mem.reinforcement_count || 1})
                        </Button>
                      </div>
                    </Surface>
                  );
                })}
              </div>
            ) : (
              <Surface variant="primary" className="p-6 text-center border border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  No retained facts or patterns recorded yet.
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-md mx-auto">
                  As you converse with MYND and approve decisions, important facts and preferences are preserved here.
                </p>
              </Surface>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
