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

  const [executionResult, setExecutionResult] = useState<{ message?: string; status?: string } & Record<string, unknown> | null>(null);

  const handleApprove = async () => {
    if (isProcessing || status !== "pending") return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await apiClient<{ status?: string } & Record<string, unknown>>(
        `/api/v1/actions/${proposal.proposal_id || proposal.id}/approve`,
        { method: "POST" }
      );
      const newStatus = (res?.status || "executed") as ActionProposal["status"];
      setStatus(newStatus);
      setExecutionResult(res);
      if (onStatusChange) {
        onStatusChange({ ...proposal, status: newStatus });
      }
    } catch (err: unknown) {
      console.error("Failed to approve action:", err);
      const msg = err instanceof Error ? err.message : "Action approval failed.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing || status !== "pending") return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await apiClient<{ status?: string } & Record<string, unknown>>(
        `/api/v1/actions/${proposal.proposal_id || proposal.id}/reject`,
        { method: "POST" }
      );
      const newStatus = (res?.status || "rejected") as ActionProposal["status"];
      setStatus(newStatus);
      if (onStatusChange) {
        onStatusChange({ ...proposal, status: newStatus });
      }
    } catch (err: unknown) {
      console.error("Failed to reject action:", err);
      const msg = err instanceof Error ? err.message : "Action rejection failed.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const isExecuted = status === "executed" || status === "approved";

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
              <StatusIndicator status={status as "pending" | "approved" | "rejected" | "executed" | "failed"} label={status} size="sm" />
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

      {isExecuted && (() => {
        const targetId = executionResult?.target_id || proposal.executed_target_id;
        const isProject = proposal.action_type === "create_project";
        const isGoal = proposal.action_type === "create_goal";

        let outcomeHref = proposal.space_id ? `/spaces/${proposal.space_id}/work` : "#";
        let outcomeLabel = "View in Work →";

        if (isProject && targetId && proposal.space_id) {
          outcomeHref = `/spaces/${proposal.space_id}/work/projects/${targetId}`;
          outcomeLabel = "View Project →";
        } else if (isGoal && targetId && proposal.space_id) {
          outcomeHref = `/spaces/${proposal.space_id}/work/goals/${targetId}`;
          outcomeLabel = "View Goal →";
        }

        return (
          <div className="mt-3 p-3 rounded-[var(--radius-sm)] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium min-w-0">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">
                {executionResult?.message ||
                  (isProject
                    ? `✓ Project created: ${proposal.parameters?.name || "New Project"}`
                    : isGoal
                    ? `✓ Goal created: ${proposal.parameters?.description || "New Goal"}`
                    : "✓ Action executed successfully")}
              </span>
            </div>
            <a
              href={outcomeHref}
              className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1 font-semibold shrink-0"
            >
              {outcomeLabel}
            </a>
          </div>
        );
      })()}

      {error && (
        <div className="mt-2.5 p-2 bg-[var(--error-surface)] border border-[var(--error-border)] rounded-[var(--radius-xs)] text-xs text-[var(--error-text)] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </Surface>
  );
};
