"use client";

import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api/client";
import { DocumentItem, DocumentChunk } from "@/types/api";
import { FileText, Calendar, HardDrive, Layers, AlertCircle } from "lucide-react";

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !documentId) {
      setDoc(null);
      return;
    }

    async function fetchDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient<DocumentItem>(`/api/v1/documents/${documentId}`);
        setDoc(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load document details.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [isOpen, documentId]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={doc?.title || "Document Knowledge Details"}
      description="Detailed inspection of parsed text chunks and vector indexing status in Qdrant."
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-[var(--radius-xs)] bg-[var(--error-surface)] text-[var(--error-text)] border border-[var(--error-border)] flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : doc ? (
        <div className="space-y-5">
          {/* Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-[var(--surface-secondary)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">
                Ingestion Status
              </span>
              <div className="mt-1">
                <StatusIndicator status={doc.status} label={doc.status} size="sm" />
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">
                File Type
              </span>
              <span className="text-xs text-[var(--text-primary)] font-medium mt-1 block">
                {doc.type || "Document"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">
                Uploaded On
              </span>
              <span className="text-xs text-[var(--text-primary)] font-medium mt-1 block">
                {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>

          {doc.error_message && (
            <div className="p-3 text-xs rounded-[var(--radius-xs)] bg-[var(--error-surface)] text-[var(--error-text)] border border-[var(--error-border)]">
              <span className="font-semibold block mb-0.5">Ingestion Error</span>
              <span>{doc.error_message}</span>
            </div>
          )}

          {/* Parsed Chunks Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Extracted Vector Chunks ({doc.chunks?.length || 0})</span>
              </span>
            </div>

            {doc.chunks && doc.chunks.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {doc.chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span className="font-mono">Chunk #{chunk.chunk_index + 1}</span>
                      <div className="flex items-center gap-2">
                        {chunk.page_number && <span>Page {chunk.page_number}</span>}
                        {chunk.token_count && <span>~{chunk.token_count} tokens</span>}
                        <Badge variant="outline" size="sm">
                          {chunk.embedding_status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                      {chunk.content_text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-default)] rounded-[var(--radius-sm)]">
                No chunks available or document still processing.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Dialog>
  );
};
