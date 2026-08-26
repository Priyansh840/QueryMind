"use client";

import React, { useEffect, useState, use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiClient } from "@/lib/api/client";
import { Space } from "@/types/api";
import { Activity, Clock } from "lucide-react";

interface SpaceActivityPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceActivityPage({ params }: SpaceActivityPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const [space, setSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSpace() {
      setIsLoading(true);
      try {
        const spaceData = await apiClient<Space>(`/api/v1/spaces/${spaceId}`);
        setSpace(spaceData);
      } catch (err) {
        console.error("Failed to load space:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSpace();
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
              <span className="text-xs text-[var(--text-muted)]">Activity Stream</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Workspace Activity & Audit
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Complete chronological record of document ingestions, agent runs, and action executions in this space.
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <EmptyState
            icon={<Activity className="w-8 h-8 text-[var(--text-muted)]" />}
            title="Activity log initialized"
            description="All verified PostgreSQL mutations and multi-agent operations in this space will be streamed here."
          />
        )}
      </div>
    </AppShell>
  );
}
