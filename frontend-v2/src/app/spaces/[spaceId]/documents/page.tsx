"use client";

import React, { useEffect, useState, use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button, IconButton } from "@/components/ui/Button";
import { Input, SearchInput } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api/client";
import { DocumentItem, DocumentSearchResult, Space } from "@/types/api";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { DocumentDetailModal } from "@/components/documents/DocumentDetailModal";
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  Search,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  HardDrive,
  RefreshCw,
} from "lucide-react";

interface SpaceDocumentsPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceDocumentsPage({ params }: SpaceDocumentsPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const [space, setSpace] = useState<Space | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const loadDocuments = async () => {
    try {
      const spaceData = await apiClient<Space>(`/api/v1/spaces/${spaceId}`);
      setSpace(spaceData);

      const docs = await apiClient<DocumentItem[]>(`/api/v1/documents/?space_id=${spaceId}`);
      setDocuments(docs || []);
    } catch (err) {
      console.error("Failed to load space documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadDocuments();
  }, [spaceId]);

  // Handle semantic RAG search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const results = await apiClient<DocumentSearchResult[]>("/api/v1/documents/search", {
        method: "POST",
        body: JSON.stringify({
          query: searchQuery.trim(),
          space_id: spaceId,
          top_k: 5,
        }),
      });
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  // Handle document deletion
  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document and remove its vectors from Qdrant?")) {
      return;
    }

    setDeletingDocId(docId);
    try {
      await apiClient(`/api/v1/documents/${docId}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (searchResults) {
        setSearchResults((prev) => prev?.filter((r) => r.document_id !== docId) || null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document. Please try again.");
    } finally {
      setDeletingDocId(null);
    }
  };

  return (
    <AppShell>
      <DocumentUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        spaceId={spaceId}
        onSuccess={() => {
          loadDocuments();
        }}
      />

      <DocumentDetailModal
        isOpen={!!selectedDocId}
        onClose={() => setSelectedDocId(null)}
        documentId={selectedDocId}
      />

      <div className="space-y-6 pb-12">
        {/* =========================================================================
            1. Header Section
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-wider text-[var(--accent-text)] uppercase">
                {space?.name || "Space"}
              </span>
              <span className="text-xs text-[var(--border-strong)]">•</span>
              <span className="text-xs text-[var(--text-muted)]">Documents & Knowledge</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Knowledge Base
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Parsed, indexed documents powering semantic retrieval and multi-agent reasoning in this workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <IconButton label="Refresh" size="md" onClick={loadDocuments}>
              <RefreshCw className="w-4 h-4 text-[var(--text-muted)]" />
            </IconButton>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsUploadOpen(true)}
            >
              Upload Document
            </Button>
          </div>
        </div>

        {/* =========================================================================
            2. Semantic RAG Search in Space
            ========================================================================= */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={handleClearSearch}
              placeholder="Search knowledge in this Space (e.g. 'What are the main architecture goals?')..."
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="md"
            isLoading={isSearching}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
          >
            Retrieve
          </Button>
        </form>

        {/* =========================================================================
            3. Semantic Search Results View
            ========================================================================= */}
        {searchResults !== null && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                  Retrieval Results ({searchResults.length})
                </span>
                <span className="text-xs text-[var(--text-muted)]">for &quot;{searchQuery}&quot;</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                Clear Search
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((res, idx) => (
                  <Surface
                    key={`${res.chunk_id}-${idx}`}
                    variant="primary"
                    className="p-4 border-l-2 border-l-[var(--accent-primary)] hover:border-[var(--border-strong)] transition-mynd"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[var(--info-text)]" />
                        <span className="font-semibold text-[var(--text-primary)]">
                          {res.document_title || "Document Chunk"}
                        </span>
                        {res.page_number && <span>• Page {res.page_number}</span>}
                      </div>
                      <Badge variant="outline" size="sm">
                        Score: {(res.score * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {res.content}
                    </p>
                  </Surface>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
                No matching semantic chunks found in this space for &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            4. Document Library List
            ========================================================================= */}
        {searchResults === null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                All Documents ({documents.length})
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : documents.length > 0 ? (
              <Surface variant="primary" className="divide-y divide-[var(--border-subtle)] overflow-hidden">
                {documents.map((doc) => {
                  const isDeleting = deletingDocId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className="p-4 flex items-center justify-between text-xs hover:bg-[var(--surface-hover)]/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--info-text)] shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--text-primary)] truncate text-sm">
                            {doc.title}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-1">
                            <span>{doc.type || "Document"}</span>
                            <span>•</span>
                            <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <StatusIndicator status={doc.status} label={doc.status} size="sm" />

                        <div className="flex items-center gap-1">
                          <IconButton
                            label="View Details & Chunks"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocId(doc.id);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          </IconButton>
                          <IconButton
                            label="Delete Document"
                            size="sm"
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteDocument(doc.id, e)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--error-text)]" />
                          </IconButton>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Surface>
            ) : (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-[var(--text-muted)]" />}
                title="No documents uploaded to this space"
                description="Upload PDFs, markdown notes, or specs to ground MYND reasoning and synthesis in this context."
                actionLabel="Upload First Document"
                onAction={() => setIsUploadOpen(true)}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
