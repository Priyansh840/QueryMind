"use client";

import React, { useEffect, useState, use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { apiClient } from "@/lib/api/client";
import { ActionProposal, Space } from "@/types/api";
import { ShieldAlert, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface SpaceActionsPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceActionsPage({ params }: SpaceActionsPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const [space, setSpace] = useState<Space | null>(null);
  const [actions, setActions] = useState<ActionProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActions() {
      setIsLoading(true);
      try {
        const spaceData = await apiClient<Space>(`/api/v1/spaces/${spaceId}`);
        setSpace(spaceData);

        const actRes = await apiClient<{ items: ActionProposal[]; total: number }>(
          `/api/v1/actions?space_id=${spaceId}&limit=50`
        );
        setActions(actRes?.items || []);
      } catch (err) {
        console.error("Failed to load space actions:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadActions();
  }, [spaceId]);

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-wider text-[var(--accent-text)] uppercase">
                {space?.name || "Space"}
              </span>
              <span className="text-xs text-[var(--border-strong)]">•</span>
              <span className="text-xs text-[var(--text-muted)]">Action Center</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Workspace Action Proposals
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Proposals synthesized by MYND requiring explicit user approval prior to execution.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : actions.length > 0 ? (
          <div className="space-y-3">
            {actions.map((act) => (
              <Surface key={act.id} variant="primary" className="p-4.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--accent-text)] shrink-0 mt-0.5">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {act.action_type.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <StatusIndicator status={act.status} label={act.status} size="sm" />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{act.reason}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-[var(--text-muted)] shrink-0 self-end md:self-center">
                    {act.created_at ? new Date(act.created_at).toLocaleDateString() : ""}
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShieldAlert className="w-8 h-8 text-[var(--text-muted)]" />}
            title="No action proposals in this space yet"
            description="When you interact with MYND in this space, grounded mutation proposals will appear here for your review."
          />
        )}
      </div>
    </AppShell>
  );
}
