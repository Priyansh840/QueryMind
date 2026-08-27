"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiClient } from "@/lib/api/client";
import { DecisionDetail } from "@/types/api";
import { EvidenceList } from "@/components/decisions/EvidenceList";
import { EvidenceChainGraph } from "@/components/decisions/EvidenceChainGraph";
import { ActionProposalCard } from "@/components/chat/ActionProposalCard";
import {
  ShieldAlert,
  ArrowLeft,
  MessageSquare,
  FileText,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface DecisionDetailPageProps {
  params: Promise<{ spaceId: string; decisionId: string }>;
}

export default function DecisionDetailPage({ params }: DecisionDetailPageProps) {
  const resolvedParams = use(params);
  const { spaceId, decisionId } = resolvedParams;

  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDecision = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await apiClient<DecisionDetail>(`/api/v1/actions/${decisionId}/decision`);
      setDecision(data);
    } catch (err: any) {
      console.error("Failed to load decision detail:", err);
      setError(err?.message || "Decision not found or unauthorized.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDecision();
  }, [decisionId]);

  if (isLoading && !decision) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error || !decision) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            icon={<AlertCircle className="w-8 h-8 text-[var(--error-text)]" />}
            title="Decision Not Found"
            description={error || "The requested decision trace could not be loaded or is unauthorized."}
            actionLabel="Return to Workspace"
            onAction={() => {
              window.location.href = `/spaces/${spaceId}`;
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 pb-16 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/spaces/${spaceId}`}>
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Workspace
              </Button>
            </Link>
            <span className="text-xs text-[var(--border-strong)]">/</span>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Decision Intelligence
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDecision(true)}
              disabled={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            <Link href={`/spaces/${spaceId}/conversations/${decision.conversation_id}`}>
              <Button variant="primary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                Open Conversation
              </Button>
            </Link>
          </div>
        </div>

        {/* Section 1: Decision Header Brief */}
        <Surface variant="primary" className="p-6 border-l-4 border-l-[var(--accent-primary)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                  Proposed Action: {decision.action_type.replace(/_/g, " ")}
                </span>
                <StatusIndicator status={decision.status as any} label={decision.status} size="sm" />
                <Badge variant="outline" size="sm">
                  {decision.confidence} confidence
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {decision.title}
              </h1>
            </div>
            <div className="text-xs text-[var(--text-muted)] shrink-0 self-start">
              {formatRelativeTime(decision.created_at)}
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Conclusion & Grounded Rationale
            </h3>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {decision.conclusion}
            </p>
          </div>

          {decision.parameters && Object.keys(decision.parameters).length > 0 && (
            <div className="p-3 bg-[var(--surface-secondary)]/80 rounded-[var(--radius-xs)] text-xs font-mono text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)] uppercase block text-[10px] mb-1 font-sans font-semibold">
                Action Parameters:
              </span>
              {JSON.stringify(decision.parameters, null, 2)}
            </div>
          )}
        </Surface>

        {/* Section 2: Action Approval Control (if pending) */}
        {decision.status === "pending" && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Decision Approval
            </h2>
            <ActionProposalCard
              proposal={{
                id: decision.id,
                proposal_id: decision.proposal_id,
                user_id: "",
                space_id: decision.space_id,
                conversation_id: decision.conversation_id,
                message_id: decision.message_id,
                action_type: decision.action_type,
                parameters: decision.parameters,
                reason: decision.conclusion,
                confidence: decision.confidence,
                status: decision.status,
                created_at: decision.created_at,
              }}
              onStatusChange={() => loadDecision(true)}
            />
          </div>
        )}

        {/* Section 3: Grounded Lineage Graph */}
        <section aria-labelledby="lineage-graph-heading" className="space-y-3">
          <EvidenceChainGraph decision={decision} />
        </section>

        {/* Section 4: Supporting Evidence Citations */}
        <section aria-labelledby="evidence-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--accent-text)]" />
              <h2 id="evidence-heading" className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Supporting Evidence ({decision.evidence.length})
              </h2>
            </div>
            <Link href={`/spaces/${spaceId}/documents`}>
              <span className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1 font-medium">
                Document Repository →
              </span>
            </Link>
          </div>

          <EvidenceList evidence={decision.evidence} spaceId={spaceId} />
        </section>

        {/* Section 5: Chronological Decision Audit Timeline */}
        <section aria-labelledby="timeline-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
            <h2 id="timeline-heading" className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Decision Audit Timeline
            </h2>
          </div>

          <Surface variant="primary" className="p-4 divide-y divide-[var(--border-subtle)]">
            {decision.timeline.map((evt, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--accent-text)] mt-0.5 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      {evt.title}
                    </div>
                    {evt.status && (
                      <Badge variant="outline" size="sm" className="mt-1">
                        {evt.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                  {formatRelativeTime(evt.timestamp)}
                </div>
              </div>
            ))}
          </Surface>
        </section>
      </div>
    </AppShell>
  );
}
