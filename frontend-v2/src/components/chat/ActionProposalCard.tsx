"use client";

import React, { useState } from "react";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { apiClient } from "@/lib/api/client";
import { ActionProposal } from "@/types/api";
import { ShieldAlert, Check, X, AlertCircle } from "lucide-react";

interface ActionProposalCardProps {
  proposal: ActionProposal;
  onStatusChange?: (updatedProposal: ActionProposal) => void;
}

export const ActionProposalCard: React.FC<ActionProposalCardProps> = ({
  proposal,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<string>(proposal.status);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // Backend action execution / approval endpoint
      const res = await apiClient<any>(`/api/v1/actions/${proposal.proposal_id || proposal.id}/approve`, {
        method: "POST",
      });
      const newStatus = res?.status || "approved";
      setStatus(newStatus);
      if (onStatusChange) {
        onStatusChange({ ...proposal, status: newStatus });
      }
    } catch (err: any) {
      console.error("Failed to approve action:", err);
      setError(err?.message || "Action approval failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await apiClient<any>(`/api/v1/actions/${proposal.proposal_id || proposal.id}/reject`, {
        method: "POST",
      });
      const newStatus = res?.status || "rejected";
      setStatus(newStatus);
      if (onStatusChange) {
        onStatusChange({ ...proposal, status: newStatus });
      }
    } catch (err: any) {
      console.error("Failed to reject action:", err);
      setError(err?.message || "Action rejection failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Surface
      variant="primary"
      className="my-3 p-4 border-l-2 border-l-[var(--accent-primary)] hover:border-[var(--border-strong)] transition-mynd"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--accent-text)] shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Proposed Action: {proposal.action_type.replace(/_/g, " ")}
              </span>
              <StatusIndicator status={status as any} label={status} size="sm" />
              <Badge variant="outline" size="sm">
                {proposal.confidence} confidence
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              {proposal.reason}
            </p>
            {proposal.parameters && Object.keys(proposal.parameters).length > 0 && (
              <div className="mt-2 p-2 bg-[var(--surface-secondary)]/60 rounded-[var(--radius-xs)] text-[11px] font-mono text-[var(--text-muted)] truncate">
                {JSON.stringify(proposal.parameters)}
              </div>
            )}
          </div>
        </div>

        {status === "pending" && (
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={handleReject}
              leftIcon={<X className="w-3.5 h-3.5" />}
            >
              Reject
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isProcessing}
              onClick={handleApprove}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Approve
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2.5 p-2 bg-[var(--error-surface)] border border-[var(--error-border)] rounded-[var(--radius-xs)] text-xs text-[var(--error-text)] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </Surface>
  );
};
