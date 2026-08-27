"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiClient } from "@/lib/api/client";
import { SpaceMemorySummary, MemoryItem } from "@/types/api";
import { MemoryCard } from "@/components/memory/MemoryCard";
import { CreateMemoryModal } from "@/components/memory/CreateMemoryModal";
import {
  Brain,
  Plus,
  Repeat,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  FileText,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface SpaceMemoryPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceMemoryPage({ params }: SpaceMemoryPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const [summary, setSummary] = useState<SpaceMemorySummary | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemorySummary = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await apiClient<SpaceMemorySummary>(`/api/v1/memories/space/${spaceId}/summary`);
      setSummary(data);
    } catch (err: any) {
      console.error("Failed to load space memory summary:", err);
      setError(err?.message || "Failed to load space memory.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMemorySummary();
  }, [spaceId]);

  const memories = summary?.memories || [];
  const connections = summary?.connections || [];
  const insights = summary?.insights || [];
  const stats = summary?.stats;

  return (
    <AppShell>
      <div className="space-y-8 pb-16 max-w-7xl mx-auto">
        {/* Memory Header Brief */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[var(--border-subtle)] pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-xl shrink-0 font-bold text-[var(--accent-primary)] shadow-sm">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Space Memory & Connections
                </h1>
                <Badge variant="outline" size="sm">
                  Durable Knowledge
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                Persistent facts, reinforced workspace patterns, and cross-session knowledge connections scoped strictly to this Space.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMemorySummary(true)}
              disabled={isLoading || isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Record Memory
            </Button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <Surface variant="primary" className="p-4 border-l-4 border-l-[var(--error-border)] bg-[var(--error-surface)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[var(--error-text)]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadMemorySummary()}>
                Retry
              </Button>
            </div>
          </Surface>
        )}

        {/* SECTION 1: INSIGHT SYNTHESIS & RECURRING PATTERNS */}
        <section aria-labelledby="insights-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-text)]" />
              <h2 id="insights-heading" className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                Grounded Insight Synthesis ({insights.length})
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((ins) => (
                <Surface key={ins.id} variant="primary" className="p-4 border-l-2 border-l-[var(--accent-primary)] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {ins.title}
                    </span>
                    <Badge variant={ins.confidence === "high" ? "default" : "outline"} size="sm">
                      {ins.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {ins.summary}
                  </p>
                  <div className="pt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                    <span>Grounded in {ins.source_count} source reference(s)</span>
                    <span>{formatRelativeTime(ins.created_at)}</span>
                  </div>
                </Surface>
              ))}
            </div>
          ) : (
            <Surface variant="primary" className="p-6 text-center border border-dashed border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-secondary)]">
                No recurring insights synthesized yet. As conversations and documents accumulate, MYND surfaces cross-session patterns here.
              </p>
            </Surface>
          )}
        </section>

        {/* SECTION 2: SPACE MEMORIES (Chronological Reinforced Knowledge) */}
        <section aria-labelledby="memories-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[var(--accent-text)]" />
              <h2 id="memories-heading" className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                Recorded Workspace Memories ({memories.length})
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : memories.length > 0 ? (
            <div className="space-y-3">
              {memories.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  spaceId={spaceId}
                  onReinforced={() => loadMemorySummary(true)}
                />
              ))}
            </div>
          ) : (
            <Surface variant="primary" className="p-8 text-center border border-dashed border-[var(--border-subtle)]">
              <Brain className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">No space memories recorded</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                Capture critical decisions, rules, and operational constraints for this Space.
              </p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Record First Memory
              </Button>
            </Surface>
          )}
        </section>

        {/* SECTION 3: REASONING CONNECTIONS & STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Surface variant="primary" className="p-4 space-y-3 border border-[var(--border-subtle)]">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Cross-Entity Connection Graph
            </div>
            {connections.length > 0 ? (
              <div className="space-y-2">
                {connections.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)]/70 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[var(--text-primary)] capitalize">{c.source_type}</span>
                      <span className="text-[var(--text-muted)] mx-1.5">→ {c.relation} →</span>
                      <span className="font-semibold text-[var(--text-primary)] capitalize">{c.target_type}</span>
                    </div>
                    <Badge variant="outline" size="sm">
                      {Math.round(c.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
                Connections between documents, conversations, and decisions will appear here as multi-agent reasoning tasks execute.
              </p>
            )}
          </Surface>

          <Surface variant="secondary" className="p-4 space-y-3 border border-[var(--border-subtle)]">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Memory Scope Statistics
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                <div className="text-[11px] text-[var(--text-muted)]">Active Memories</div>
                <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                  {stats?.memories_count ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                <div className="text-[11px] text-[var(--text-muted)]">Synthesized Insights</div>
                <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                  {stats?.insights_count ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                <div className="text-[11px] text-[var(--text-muted)]">Indexed Documents</div>
                <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                  {stats?.documents_count ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                <div className="text-[11px] text-[var(--text-muted)]">Conversations</div>
                <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                  {stats?.conversations_count ?? 0}
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </div>

      <CreateMemoryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        spaceId={spaceId}
        onMemoryCreated={() => loadMemorySummary(true)}
      />
    </AppShell>
  );
}
