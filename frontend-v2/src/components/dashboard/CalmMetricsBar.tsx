"use client";

import React from "react";
import { FileText, CheckCircle2, FolderGit2, MessageSquare } from "lucide-react";

interface CalmMetricsBarProps {
  documentsCount: number;
  pendingProposalsCount: number;
  projectsCount: number;
  conversationsCount: number;
  onReviewPending?: () => void;
  className?: string;
}

export const CalmMetricsBar: React.FC<CalmMetricsBarProps> = ({
  documentsCount,
  pendingProposalsCount,
  projectsCount,
  conversationsCount,
  onReviewPending,
  className,
}) => {
  return (
    <div
      className={`grid grid-cols-2 lg:grid-cols-4 gap-3 select-none ${
        className || ""
      }`}
    >
      {/* 1. Documents */}
      <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-slate-400">
            Grounded Documents
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {documentsCount}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400">
          <FileText className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Decisions */}
      <div
        onClick={pendingProposalsCount > 0 ? onReviewPending : undefined}
        className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
          pendingProposalsCount > 0
            ? "bg-[#151216] border-[#f87171]/25 hover:border-[#f87171]/40 cursor-pointer"
            : "bg-[#0c0d12] border-white/[0.06]"
        }`}
      >
        <div>
          <div className="text-[11px] font-medium text-slate-400">
            Pending Approvals
          </div>
          <div
            className={`text-xl font-bold mt-1 ${
              pendingProposalsCount > 0 ? "text-[#f87171]" : "text-white"
            }`}
          >
            {pendingProposalsCount}
          </div>
        </div>
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
            pendingProposalsCount > 0
              ? "bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]"
              : "bg-white/[0.03] border-white/[0.06] text-slate-400"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      {/* 3. Projects */}
      <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-slate-400">
            Active Projects
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {projectsCount}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400">
          <FolderGit2 className="w-4 h-4" />
        </div>
      </div>

      {/* 4. Sessions */}
      <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-slate-400">
            Reasoning Sessions
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {conversationsCount}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400">
          <MessageSquare className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
