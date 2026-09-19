"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { ActionProposal } from "@/types/api";

interface BlockingApprovalToastProps {
  proposal: ActionProposal | null;
  onReview: () => void;
  className?: string;
}

export const BlockingApprovalToast: React.FC<BlockingApprovalToastProps> = ({
  proposal,
  onReview,
  className,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!proposal || isDismissed) return null;

  const title =
    proposal.action_type === "create_project" || proposal.action_type === "create_goal"
      ? "Pipeline Ingestion Optimization requires sign-off."
      : `${proposal.action_type.replace(/_/g, " ")} requires sign-off.`;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#15151e] border border-white/10 shadow-2xl max-w-sm space-y-3 animate-in slide-in-from-bottom-5 duration-200 select-none ${
        className || ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <AlertTriangle className="w-3.5 h-3.5 text-[#f87171] shrink-0" />
          <span>Blocking Approval</span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-white transition-colors p-0.5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-snug">
        {title}
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onReview}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer shadow-sm"
        >
          Review Now
        </button>
      </div>
    </div>
  );
};
