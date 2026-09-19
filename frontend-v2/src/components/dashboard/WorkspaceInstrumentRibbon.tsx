"use client";

import React from "react";
import { ShieldAlert, BookOpen, Layers, Sparkles, CheckCircle2 } from "lucide-react";

interface WorkspaceInstrumentRibbonProps {
  documentsCount: number;
  chunksCount: number;
  pendingProposalsCount: number;
  projectsCount: number;
  goalsCount: number;
  completedGoalsCount: number;
  conversationsCount: number;
  onReviewPending?: () => void;
  className?: string;
}

export const WorkspaceInstrumentRibbon: React.FC<WorkspaceInstrumentRibbonProps> = ({
  documentsCount,
  chunksCount,
  pendingProposalsCount,
  projectsCount,
  goalsCount,
  completedGoalsCount,
  conversationsCount,
  onReviewPending,
  className,
}) => {
  const milestonePercent =
    goalsCount > 0 ? Math.round((completedGoalsCount / goalsCount) * 100) : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d14]/90 backdrop-blur-xl shadow-2xl p-1 select-none ${
        className || ""
      }`}
    >
      {/* Top subtle highlight shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#818cf8]/30 to-transparent" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
        {/* Quadrant 1: Grounding Substrate */}
        <div className="p-4 flex flex-col justify-between space-y-2 hover:bg-white/[0.02] transition-colors rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Grounding Vault</span>
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">QDRANT / POSTGRES</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              {documentsCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Files Ingested
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#38bdf8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
            <span className="font-mono">{chunksCount} chunk partitions indexed</span>
          </div>
        </div>

        {/* Quadrant 2: Decision Velocity */}
        <div
          onClick={pendingProposalsCount > 0 ? onReviewPending : undefined}
          className={`p-4 flex flex-col justify-between space-y-2 rounded-xl transition-all ${
            pendingProposalsCount > 0
              ? "bg-[#f87171]/[0.04] hover:bg-[#f87171]/[0.08] cursor-pointer border border-[#f87171]/20"
              : "hover:bg-white/[0.02]"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldAlert
                className={`w-3.5 h-3.5 ${
                  pendingProposalsCount > 0 ? "text-[#f87171]" : "text-[#818cf8]"
                }`}
              />
              <span>Decision Docket</span>
            </span>
            {pendingProposalsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30 animate-pulse">
                ACTION REQ
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-semibold">SYNCHRONIZED</span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight font-mono ${
                pendingProposalsCount > 0 ? "text-[#f87171]" : "text-white"
              }`}
            >
              {pendingProposalsCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Pending Sign-Off
            </span>
          </div>

          <div
            className={`text-[11px] font-medium flex items-center gap-1.5 ${
              pendingProposalsCount > 0 ? "text-[#f87171]" : "text-slate-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                pendingProposalsCount > 0 ? "bg-[#f87171] animate-ping" : "bg-[#818cf8]"
              }`}
            />
            <span>
              {pendingProposalsCount > 0
                ? "Human authorization blocking execution"
                : "All autonomous actions approved"}
            </span>
          </div>
        </div>

        {/* Quadrant 3: Outcome Momentum */}
        <div className="p-4 flex flex-col justify-between space-y-2 hover:bg-white/[0.02] transition-colors rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#818cf8]" />
              <span>Tracked Outcomes</span>
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">{milestonePercent}% COMPLETED</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              {projectsCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Active Projects
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-1 bg-[#1a1b24] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(milestonePercent, 12)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>{completedGoalsCount} of {goalsCount || 3} milestones executed</span>
            </div>
          </div>
        </div>

        {/* Quadrant 4: Reasoning Synthesis Engine */}
        <div className="p-4 flex flex-col justify-between space-y-2 hover:bg-white/[0.02] transition-colors rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
              <span>Reasoning Mesh</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              {conversationsCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Active Sessions
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="text-slate-500 font-mono">State:</span>
            <span className="text-slate-300 font-mono">Synthesizer & Researcher Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
