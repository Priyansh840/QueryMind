"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { ActionProposal, DecisionDetail } from "@/types/api";
import {
  ShieldAlert,
  FileText,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";

interface DecisionCardProps {
  proposal: ActionProposal;
  spaceId: string;
  onApprove?: (proposal: ActionProposal) => void;
  onReject?: (proposal: ActionProposal) => void;
  onOpenEvidence?: (proposal: ActionProposal) => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  proposal,
  spaceId,
  onApprove,
  onReject,
  onOpenEvidence,
}) => {
  return (
    <Surface
      variant="primary"
      className="p-4 border-l-2 border-l-[var(--accent-primary)] hover:border-[var(--border-strong)] transition-mynd flex flex-col gap-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--accent-text)] shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            {proposal.action_type.replace(/_/g, " ")}
          </span>
          <StatusIndicator status={proposal.status as any} label={proposal.status} size="sm" />
          <Badge variant="outline" size="sm">
            {proposal.confidence} confidence
          </Badge>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link href={`/spaces/${spaceId}/decisions/${proposal.proposal_id || proposal.id}`}>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
              Decision Trace
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
          {proposal.reason}
        </p>
        {proposal.parameters && Object.keys(proposal.parameters).length > 0 && (
          <div className="mt-2 p-2 bg-[var(--surface-secondary)]/70 rounded-[var(--radius-xs)] text-[11px] font-mono text-[var(--text-muted)] truncate">
            {JSON.stringify(proposal.parameters)}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-3">
          <Link
            href={`/spaces/${spaceId}/conversations/${proposal.conversation_id}`}
            className="hover:text-[var(--accent-text)] transition-mynd flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-[var(--accent-text)]" />
            <span>Originating Thread</span>
          </Link>
          <Link
            href={`/spaces/${spaceId}/decisions/${proposal.proposal_id || proposal.id}`}
            className="hover:text-[var(--accent-text)] transition-mynd flex items-center gap-1 font-medium text-[var(--accent-text)]"
          >
            <Layers className="w-3 h-3" />
            <span>View Evidence & Graph</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <Clock className="w-3 h-3" />
          <span>{new Date(proposal.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    </Surface>
  );
};
