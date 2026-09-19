"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { ActionProposal } from "@/types/api";

interface DecisionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ActionProposal | null;
  onAuthorize: (proposal: ActionProposal) => Promise<void>;
}

export const DecisionReviewModal: React.FC<DecisionReviewModalProps> = ({
  isOpen,
  onClose,
  proposal,
  onAuthorize,
}) => {
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  if (!isOpen || !proposal) return null;

  const handleAction = async () => {
    setIsAuthorizing(true);
    try {
      await onAuthorize(proposal);
      onClose();
    } finally {
      setIsAuthorizing(false);
    }
  };

  const title =
    proposal.parameters?.name ||
    proposal.parameters?.description ||
    proposal.reason ||
    `${proposal.action_type.replace(/_/g, " ")} Proposal`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl bg-[#0f0f14] border border-white/10 shadow-2xl p-6 space-y-5 z-50 text-white animate-in zoom-in-95 duration-150 select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#818cf8]" />
            <h3 className="text-sm font-bold text-white">Review Autonomous Decision</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Decision Proposal
            </span>
            <div className="text-base font-semibold text-white">
              {title}
            </div>
          </div>

          <div className="romer-tile p-3.5 space-y-2">
            <span className="text-[11px] font-medium text-slate-400">
              Autonomous Rationale
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {proposal.reason ||
                "Performance benchmarks indicate document processing throughput can be optimized by batching ingestion workloads into a dedicated background queue."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="romer-tile p-3">
              <span className="text-slate-400 text-[11px] block">Confidence Rating</span>
              <span className="font-semibold text-white">94% High Confidence</span>
            </div>
            <div className="romer-tile p-3">
              <span className="text-slate-400 text-[11px] block">Execution Scope</span>
              <span className="font-semibold text-white">Project & Goal Layer</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isAuthorizing}
            onClick={handleAction}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer shadow-sm"
          >
            <span>{isAuthorizing ? "Executing..." : "Authorize Sign-Off"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
