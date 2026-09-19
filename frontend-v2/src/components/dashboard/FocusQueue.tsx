"use client";

import React from "react";
import { ActionProposal } from "@/types/api";
import { Check, ArrowRight } from "lucide-react";

interface FocusQueueProps {
  proposals: ActionProposal[];
  onAuthorize: (proposal: ActionProposal) => void;
  onSelect?: (proposal: ActionProposal) => void;
  authorizingId?: string | null;
  className?: string;
}

export const FocusQueue: React.FC<FocusQueueProps> = ({
  proposals,
  onAuthorize,
  onSelect,
  authorizingId,
  className,
}) => {
  if (proposals.length === 0) {
    return null; // When no approvals are needed, don't clutter the screen!
  }

  const primary = proposals[0];
  const id = primary.proposal_id || primary.id;
  const isProcessing = authorizingId === id;
  const title =
    primary.parameters?.name ||
    primary.parameters?.description ||
    primary.reason ||
    `${primary.action_type.replace(/_/g, " ")} Proposal`;

  return (
    <div
      className={`rounded-2xl border border-[#f87171]/20 bg-[#120f13] p-4 space-y-3 select-none ${
        className || ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f87171]" />
          <span className="text-xs font-semibold text-white">
            Action Awaiting Your Approval
          </span>
        </div>
        {proposals.length > 1 && (
          <span className="text-[11px] text-slate-400">
            +{proposals.length - 1} more
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-sm font-semibold text-white">
          {title}
        </div>
        {primary.reason && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {primary.reason}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelect && onSelect(primary)}
          className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          View Full Details
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onAuthorize(primary)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isProcessing ? "Approving..." : "Approve"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
