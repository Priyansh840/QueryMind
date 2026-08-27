"use client";

import React from "react";
import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { WorkflowListItem } from "@/types/api";
import {
  Zap,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface WorkflowCardProps {
  workflow: WorkflowListItem;
  spaceId: string;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, spaceId }) => {
  const isRunning = workflow.status === "running" || workflow.status === "planning";
  const isCompleted = workflow.status === "completed";
  const isFailed = workflow.status === "failed";
  const isAwaiting = workflow.status === "awaiting_approval";

  return (
    <Surface
      variant="primary"
      className="p-4 border-l-4 border-l-[var(--accent-primary)] hover:border-[var(--border-strong)] transition-mynd flex flex-col gap-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--accent-text)] shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Autonomous Workflow
          </span>
          <StatusIndicator status={workflow.status as any} label={workflow.status} size="sm" />
          <Badge variant="outline" size="sm">
            {workflow.completed_steps_count} / {workflow.steps_count} Steps Completed
          </Badge>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link href={`/spaces/${spaceId}/tasks/${workflow.id}`}>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
              Execution Trace
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <h3 className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
          {workflow.goal}
        </h3>
        {workflow.current_step && isRunning && (
          <div className="mt-2 flex items-center gap-2 p-2 bg-[var(--surface-secondary)]/80 rounded-[var(--radius-xs)] text-xs text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0" />
            <span className="text-[11px] font-mono">Active Step: {workflow.current_step}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[var(--text-muted)]">
            ID: {workflow.id.slice(0, 8)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <Clock className="w-3 h-3" />
          <span>Launched {formatRelativeTime(workflow.created_at)}</span>
        </div>
      </div>
    </Surface>
  );
};
