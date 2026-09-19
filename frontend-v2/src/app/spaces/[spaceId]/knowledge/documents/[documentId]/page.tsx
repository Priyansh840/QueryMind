"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiClient } from "@/lib/api/client";
import { DocumentItem, ActionProposal, ActionProposalListResponse, Space } from "@/types/api";
import {
  FileText,
  ArrowLeft,
  RefreshCw,
  Clock,
  Calendar,
  Layers,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface DocumentDetailPageProps {
  params: Promise<{ spaceId: string; documentId: string }>;
}

export default function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const resolvedParams = use(params);
  const { spaceId, documentId } = resolvedParams;
  const router = useRouter();

  const [space, setSpace] = useState<Space | null>(null);
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [relatedDecisions, setRelatedDecisions] = useState<ActionProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocumentDetails = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [spaceData, docData, actionsData] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<DocumentItem>(`/api/v1/documents/${documentId}`),
        apiClient<ActionProposalListResponse>(`/api/v1/actions?space_id=${spaceId}&limit=50`).catch(
          () => ({ items: [], total: 0, limit: 50, offset: 0 })
        ),
      ]);

      // Verify Space Isolation
      if (docData.space_id !== spaceId) {
        throw new Error("This document belongs to another workspace.");
      }

      if (spaceData) setSpace(spaceData);
      setDoc(docData);

      // Find decisions citing this document
      const matchingActions = (actionsData.items || []).filter((a) => {
        const params = a.parameters || {};
        return (
          params.document_id === documentId ||
          (a.source_recommendation &&
            a.source_recommendation.toLowerCase().includes(docData.title.toLowerCase()))
        );
      });
      setRelatedDecisions(matchingActions);
    } catch (err: any) {
      console.error("Failed to load document details:", err);
      setError(err?.message || "Document not found or unauthorized.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocumentDetails();
  }, [spaceId, documentId]);

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm(`Are you sure you want to remove "${doc.title}" from this Space's knowledge?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/documents/${doc.id}`, { method: "DELETE" });
      router.push(`/spaces/${spaceId}/knowledge`);
    } catch (err: any) {
      console.error("Failed to delete document:", err);
      alert(err?.message || "Failed to remove document.");
      setIsDeleting(false);
    }
  };

  if (isLoading && !doc) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error || !doc) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            icon={<AlertCircle className="w-8 h-8 text-[var(--error-text)]" />}
            title="Document Not Found"
            description={error || "The requested document could not be found or does not belong to this space."}
            actionLabel="Return to Knowledge"
            onAction={() => {
              router.push(`/spaces/${spaceId}/knowledge`);
            }}
          />
        </div>
      </AppShell>
    );
  }

  const isReady = doc.status === "completed";
  const isProcessing = doc.status === "processing" || doc.status === "pending";
  const isFailed = doc.status === "failed";

  const humanStatusLabel = isReady
    ? "Ready for MYND"
    : isProcessing
    ? "Processing document..."
    : isFailed
    ? "Needs attention"
    : doc.status;

  return (
    <AppShell>
      <div className="space-y-8 pb-16 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/spaces/${spaceId}/knowledge`}>
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Knowledge
              </Button>
            </Link>
            <span className="text-xs text-[var(--border-strong)]">/</span>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider truncate max-w-xs">
              {doc.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDocumentDetails(true)}
              disabled={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-[var(--error-text)]" />}
            >
              Remove
            </Button>
          </div>
        </div>

        {/* =========================================================================
            1. WHAT IS THIS? — Title, Type & Readiness
            ========================================================================= */}
        <Surface variant="primary" className="p-6 border-l-4 border-l-[var(--accent-primary)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                  Knowledge Source
                </span>
                <Badge
                  variant={isReady ? "default" : isFailed ? "outline" : "accent"}
                  size="sm"
                >
                  {humanStatusLabel}
                </Badge>
                <Badge variant="outline" size="sm">
                  {doc.type || "Document"}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {doc.title}
              </h1>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] shrink-0 self-start">
              <Calendar className="w-3.5 h-3.5" />
              <span>Added {formatRelativeTime(doc.created_at)}</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {isReady
              ? "MYND has read and indexed this material. It can be retrieved and cited as evidence when answering questions or evaluating proposals."
              : isProcessing
              ? "MYND is currently parsing this document into readable excerpts. It will become available as evidence shortly."
              : "An error occurred while preparing this document. It may need to be re-uploaded."}
          </p>

          {doc.error_message && (
            <div className="p-3 text-xs rounded-[var(--radius-xs)] bg-[var(--error-surface)] text-[var(--error-text)] border border-[var(--error-border)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{doc.error_message}</span>
            </div>
          )}
        </Surface>

        {/* =========================================================================
            2. CITED IN DECISIONS & WORK — Where is this knowledge used?
            ========================================================================= */}
        <section aria-labelledby="usage-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 id="usage-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
              Used as Evidence in Decisions
            </h2>
          </div>

          {relatedDecisions.length > 0 ? (
            <div className="space-y-2.5">
              {relatedDecisions.map((decision) => (
                <Surface
                  key={decision.id || decision.proposal_id}
                  variant="primary"
                  className="p-4 border border-[var(--border-subtle)] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {decision.action_type.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" size="sm">
                        {decision.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {decision.reason}
                    </p>
                  </div>

                  <Link href={`/spaces/${spaceId}/decisions/${decision.proposal_id || decision.id}`}>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      View Decision
                    </Button>
                  </Link>
                </Surface>
              ))}
            </div>
          ) : (
            <Surface variant="secondary" className="p-4 border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
              This document has not been cited in any recorded decisions yet. It remains available for MYND to reference.
            </Surface>
          )}
        </section>

        {/* =========================================================================
            3. EXTRACTED KNOWLEDGE EXCERPTS — What MYND extracted from this file
            ========================================================================= */}
        <section aria-labelledby="excerpts-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
              <h2 id="excerpts-heading" className="text-xs font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                Extracted Knowledge Excerpts ({doc.chunks?.length || 0})
              </h2>
            </div>
            {doc.chunks && doc.chunks.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                Indexed for semantic evidence retrieval
              </span>
            )}
          </div>

          {doc.chunks && doc.chunks.length > 0 ? (
            <div className="space-y-3">
              {doc.chunks.map((chunk, idx) => (
                <Surface
                  key={chunk.id || idx}
                  variant="primary"
                  className="p-4 border border-[var(--border-subtle)] text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Excerpt #{chunk.chunk_index + 1}
                    </span>
                    {chunk.page_number && (
                      <span className="bg-[var(--surface-secondary)] px-2 py-0.5 rounded-[var(--radius-xs)]">
                        Page {chunk.page_number}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans whitespace-pre-wrap">
                    {chunk.content_text}
                  </p>
                </Surface>
              ))}
            </div>
          ) : (
            <Surface variant="secondary" className="p-6 text-center border border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-secondary)]">
                {isProcessing
                  ? "Excerpts are being generated as MYND processes this document."
                  : "No excerpts extracted from this document."}
              </p>
            </Surface>
          )}
        </section>
      </div>
    </AppShell>
  );
}
