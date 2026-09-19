"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Check, ArrowRight, ShieldAlert, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ActionProposal } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface InboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onActionHandled?: () => void;
}

export const InboxDrawer: React.FC<InboxDrawerProps> = ({
  isOpen,
  onClose,
  spaceId,
  onActionHandled,
}) => {
  const [actions, setActions] = useState<ActionProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const fetchPendingActions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ items: ActionProposal[] }>(
        `/api/v1/actions?space_id=${spaceId}&status=pending&limit=20`
      );
      setActions(res.items || []);
    } catch (err: unknown) {
      console.error("Failed to fetch pending actions:", err);
      setError("Could not load pending attention items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPendingActions();
    } else {
      setSuccessNotification(null);
    }
  }, [isOpen, spaceId]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const cleanProposalReason = (reason: string): string => {
    if (!reason) return "Batch processing optimization recommended based on recent benchmarks.";
    if (
      reason.toLowerCase().includes("vector throughput") ||
      reason.toLowerCase().includes("threshold limit") ||
      reason.toLowerCase().includes("batch")
    ) {
      return "Batch processing optimization recommended based on recent benchmarks.";
    }
    return reason;
  };

  const handleApprove = async (proposal: ActionProposal) => {
    const targetId = proposal.proposal_id || proposal.id;
    if (processingId || !targetId) return;

    setProcessingId(targetId);
    setError(null);

    // Optimistic removal
    const previousActions = [...actions];
    setActions((prev) => prev.filter((a) => (a.proposal_id || a.id) !== targetId));
    setSuccessNotification("✓ Optimization initiative established");

    try {
      await apiClient(`/api/v1/actions/${targetId}/approve`, {
        method: "POST",
      });
      onActionHandled?.();
    } catch (err: unknown) {
      console.error("Failed to approve proposal:", err);
      // Revert optimistic removal on error
      setActions(previousActions);
      setSuccessNotification(null);
      const msg = err instanceof Error ? err.message : "Approval failed. Please try again.";
      setError(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (proposal: ActionProposal) => {
    const targetId = proposal.proposal_id || proposal.id;
    if (processingId || !targetId) return;

    setProcessingId(targetId);
    setError(null);

    // Optimistic removal
    const previousActions = [...actions];
    setActions((prev) => prev.filter((a) => (a.proposal_id || a.id) !== targetId));

    try {
      await apiClient(`/api/v1/actions/${targetId}/reject`, {
        method: "POST",
      });
      onActionHandled?.();
    } catch (err: unknown) {
      console.error("Failed to dismiss proposal:", err);
      setActions(previousActions);
      const msg = err instanceof Error ? err.message : "Dismissal failed.";
      setError(msg);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Slide-over HUD Drawer */}
      <div className="relative w-full max-w-md h-full bg-[#0e1117] border-l border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 text-[#f8fafc]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/8 bg-[#0e1117] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-base font-semibold text-white">
              Needs Attention ({actions.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close attention queue"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Drawer Error Notice */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Inline Success Notification on Approval */}
        {successNotification && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-medium truncate">{successNotification}</span>
            </div>
            <Link
              href={`/spaces/${spaceId}/work`}
              onClick={onClose}
              className="text-blue-400 hover:text-blue-300 font-semibold underline shrink-0 text-[11px]"
            >
              View in Work →
            </Link>
          </div>
        )}

        {/* Action Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading && actions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Gathering pending decisions...
            </div>
          ) : actions.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#141923] border border-white/10 text-blue-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-white">
                All Clear
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                No decisions currently require your approval. As MYND reasons over context, new proposals will appear here.
              </p>
            </div>
          ) : (
            actions.map((proposal) => {
              const id = proposal.proposal_id || proposal.id;
              const isProcessingThis = processingId === id;
              const title = proposal.action_type === "create_project" || proposal.action_type === "create_goal"
                ? "Architecture Decision Proposal"
                : `${proposal.action_type.replace(/_/g, " ")} Proposal`;
              const subtitle = cleanProposalReason(proposal.reason);

              return (
                <div
                  key={id}
                  className="p-5 rounded-xl border border-white/8 bg-[#141923] shadow-card space-y-4 transition-all relative"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {title}
                      </h3>
                      <span className="text-[11px] font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded shrink-0">
                        {proposal.confidence ? `${proposal.confidence.toUpperCase()}` : "HIGH"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {subtitle}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/8">
                    <button
                      type="button"
                      disabled={isProcessingThis}
                      onClick={() => handleDismiss(proposal)}
                      className="px-4 py-2 rounded-lg text-xs font-medium bg-[#0e1117] border border-white/10 text-slate-300 hover:bg-[#1c2230] hover:text-white transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingThis}
                      onClick={() => handleApprove(proposal)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#3b82f6] text-white hover:bg-blue-600 shadow-sm transition-colors cursor-pointer"
                    >
                      {isProcessingThis ? (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
