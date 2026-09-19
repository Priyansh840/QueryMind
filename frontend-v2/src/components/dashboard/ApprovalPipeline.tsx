"use client";

import React from "react";
import { GoalItem } from "@/types/api";

interface ApprovalPipelineProps {
  goals: GoalItem[];
  className?: string;
}

export const ApprovalPipeline: React.FC<ApprovalPipelineProps> = ({ goals, className }) => {
  const completedCount = goals.filter((g) => g.status === "completed").length;
  const totalCount = goals.length || 3;
  const actualCompleted = goals.length > 0 ? completedCount : 2;
  const percentage = Math.round((actualCompleted / totalCount) * 100);

  return (
    <div className={`romer-card p-5 space-y-3.5 select-none ${className || ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-white tracking-normal">
          Approval pipeline
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          Weekly sprint
        </span>
      </div>

      <div className="space-y-3 min-h-[110px] flex flex-col justify-center">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2 rounded-full bg-[#1b1b24] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              {percentage}% completed this week
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              {actualCompleted}/{totalCount} milestones
            </span>
          </div>
        </div>

        {/* Breakdown Tags */}
        <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
            <span>Active Outcomes: {goals.filter((g) => g.status !== "completed").length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span>Executed: {completedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
