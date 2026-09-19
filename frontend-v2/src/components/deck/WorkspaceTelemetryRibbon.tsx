"use client";

import React from "react";
import { Activity, Database, Cpu, ShieldCheck, Zap } from "lucide-react";

interface WorkspaceTelemetryRibbonProps {
  documentsCount: number;
  conceptsCount: number;
  memoriesCount: number;
  initiativesCount: number;
  activeAgentsCount?: number;
}

export function WorkspaceTelemetryRibbon({
  documentsCount,
  conceptsCount,
  memoriesCount,
  initiativesCount,
  activeAgentsCount = 5,
}: WorkspaceTelemetryRibbonProps) {
  return (
    <div className="w-full bg-[#07070b] border-b border-white/[0.06] px-6 py-2 flex items-center justify-between text-[11px] select-none">
      {/* Left: Engine Status & Nodes */}
      <div className="flex items-center gap-4 text-slate-300">
        <div className="flex items-center gap-2 font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-white tracking-wide uppercase text-[10px]">
            SOVEREIGN CORE V4.8
          </span>
        </div>

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-[#38bdf8]" />
            <span className="text-white font-medium">{documentsCount}</span> Docs Grounded
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[#a78bfa]" />
            <span className="text-white font-medium">{conceptsCount}</span> Vector Concepts
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#818cf8]" />
            <span className="text-white font-medium">{memoriesCount}</span> Invariants
          </span>
        </div>
      </div>

      {/* Right: Live Diagnostics Telemetry */}
      <div className="flex items-center gap-4 font-mono text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>QDRANT: 14ms LATENCY</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#818cf8]">
          <Zap className="w-3 h-3" />
          <span>{activeAgentsCount} AGENTS IN SWARM</span>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-slate-500">
          <span>COHERENCE:</span>
          <span className="text-white font-semibold">99.8%</span>
        </div>
      </div>
    </div>
  );
}
