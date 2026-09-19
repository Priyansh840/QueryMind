"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { ActionProposal } from "@/types/api";
import {
  ShieldAlert,
  ArrowRight,
  ChevronRight,
  Check,
  X,
  Clock,
  MessageSquare,
  Layers,
  AlertCircle,
} from "lucide-react";

interface DecisionCardProps {
  proposal: ActionProposal;
  spaceId: string;
  onApprove?: (proposal: ActionProposal) => void;
  onReject?: (proposal: ActionProposal) => void;
  onStatusChange?: (updatedProposal: ActionProposal) => void;
}

interface ActionExecutionResult {
  target_id?: string;
  action_type?: string;
  status: string;
  message?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  proposal,
  spaceId,
  onApprove,
  onReject,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<string>(proposal.status);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ActionExecutionResult | null>(null);

  const handleApprove = async () => {
    if (isProcessing || status !== "pending") return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await apiClient<ActionExecutionResult>(
        `/api/v1/actions/${proposal.proposal_id || proposal.id}/approve`,
        { method: "POST" }
      );
      const newStatus = res?.status || "executed";
      setStatus(newStatus);
      setExecutionResult(res);
      const updated = { ...proposal, status: newStatus as ActionProposal["status"] };
      onApprove?.(updated);
      onStatusChange?.(updated);
    } catch (err: unknown) {
      console.error("Failed to approve action:", err);
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Action approval failed.";
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
      const res = await apiClient<ActionExecutionResult>(
        `/api/v1/actions/${proposal.proposal_id || proposal.id}/reject`,
        { method: "POST" }
      );
      const newStatus = res?.status || "rejected";
      setStatus(newStatus);
      const updated = { ...proposal, status: newStatus as ActionProposal["status"] };
      onReject?.(updated);
      onStatusChange?.(updated);
    } catch (err: unknown) {
      console.error("Failed to reject action:", err);
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Action rejection failed.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const isExecuted = status === "executed" || status === "approved";

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-[var(--radius-md)] border flex flex-col gap-3.5 transition-mynd relative overflow-hidden",
        status === "pending"
          ? "border-amber-200/90 bg-[#fffcf5] border-l-4 border-l-amber-500 shadow-sm"
          : "border-[var(--border-default)] bg-white shadow-xs"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className={cn(
              "p-2 rounded-[var(--radius-xs)] shrink-0 border",
              status === "pending"
                ? "bg-amber-100/70 text-amber-700 border-amber-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Proposal ·
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                {proposal.action_type.replace(/_/g, " ")}
              </span>
              <Badge
                variant={status === "pending" ? "warning" : status === "executed" || status === "approved" ? "success" : "default"}
                size="sm"
                className="text-[10px] font-mono tracking-wide"
              >
                {status === "pending" ? "AWAITING APPROVAL" : status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {status === "pending" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isProcessing}
                onClick={handleReject}
                leftIcon={<X className="w-3.5 h-3.5" />}
                className="text-xs rounded-[var(--radius-sm)] bg-white hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 shadow-xs"
              >
                Dismiss
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isProcessing}
                onClick={handleApprove}
                leftIcon={<Check className="w-3.5 h-3.5" />}
                className="text-xs rounded-[var(--radius-sm)] font-semibold titanium-btn"
              >
                Approve & Execute
              </Button>
            </div>
          )}

          <Link href={`/spaces/${spaceId}/decisions/${proposal.proposal_id || proposal.id}`}>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />} className="text-xs rounded-[var(--radius-sm)]">
              Details
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
          {proposal.reason}
        </p>

        {/* Structured Engineering Inspector for Payload */}
        {proposal.parameters && Object.keys(proposal.parameters).length > 0 && (
          <div
            className={cn(
              "mt-3 p-3 rounded-[var(--radius-sm)] border text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2",
              status === "pending"
                ? "bg-white/90 border-amber-200/60"
                : "bg-[var(--surface-secondary)] border-[var(--border-subtle)]"
            )}
          >
            {Object.entries(proposal.parameters).map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5 last:border-0 sm:last:border-0">
                <span className="text-[var(--text-muted)] font-mono text-[10px] uppercase tracking-wider">{key.replace(/_/g, " ")}:</span>
                <span className="text-[var(--text-primary)] font-medium truncate max-w-[220px]">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isExecuted && (() => {
        const targetId = executionResult?.target_id || proposal.executed_target_id;
        const isProject = proposal.action_type === "create_project";
        const isGoal = proposal.action_type === "create_goal";

        let outcomeHref = `/spaces/${spaceId}/work`;
        let outcomeLabel = "View in Work";

        if (isProject && targetId) {
          outcomeHref = `/spaces/${spaceId}/work/projects/${targetId}`;
          outcomeLabel = "View Project";
        } else if (isGoal && targetId) {
          outcomeHref = `/spaces/${spaceId}/work/goals/${targetId}`;
          outcomeLabel = "View Goal";
        }

        return (
          <div className="p-3 rounded-[var(--radius-sm)] bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium min-w-0">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="truncate">
                {executionResult?.message ||
                  (isProject
                    ? `Created Project: ${proposal.parameters?.name || "New Project"}`
                    : isGoal
                    ? `Created Goal: ${proposal.parameters?.description || "New Goal"}`
                    : `Created ${proposal.action_type.replace(/_/g, " ")}`)}
              </span>
            </div>
            <Link
              href={outcomeHref}
              className="text-xs text-emerald-900 hover:underline flex items-center gap-1 font-semibold shrink-0"
            >
              {outcomeLabel} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        );
      })()}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-sm)] text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
        <div className="flex items-center gap-3">
          {proposal.conversation_id && (
            <Link
              href={`/spaces/${spaceId}/conversations/${proposal.conversation_id}`}
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 font-mono text-[10px]"
            >
              <MessageSquare className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Session Source</span>
            </Link>
          )}
          <Link
            href={`/spaces/${spaceId}/decisions/${proposal.proposal_id || proposal.id}`}
            className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 font-mono text-[10px] text-[var(--text-secondary)]"
          >
            <Layers className="w-3 h-3 text-[var(--text-muted)]" />
            <span>Audit Trail & Lineage</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-mono text-[10px]">
          <Clock className="w-3 h-3" />
          <span>
            {proposal.created_at
              ? new Date(proposal.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent"}
          </span>
        </div>
      </div>
    </div>
  );
};
