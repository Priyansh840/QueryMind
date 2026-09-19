"use client";

import React, { useState } from "react";
import {
  BrainCircuit,
  Compass,
  Search,
  ShieldAlert,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: "active" | "indexing" | "evaluating" | "ready";
  thought: string;
  throughput: string;
  color: string;
  badgeBg: string;
  icon: React.ReactNode;
}

export function AgentOrchestrationHUD() {
  const [isExpanded, setIsExpanded] = useState(true);

  const agents: AgentStatus[] = [
    {
      id: "planner",
      name: "Planner Agent",
      role: "Strategic Decomposition",
      status: "active",
      thought: "Resolving initiative milestones against Q3 vector roadmap",
      throughput: "98.5% confidence",
      color: "#10b981",
      badgeBg: "rgba(16, 185, 129, 0.15)",
      icon: <Compass className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: "researcher",
      name: "Researcher Agent",
      role: "Vector Knowledge Extraction",
      status: "indexing",
      thought: "Scanning 48 vector chunks across Qdrant enterprise collections",
      throughput: "14ms avg retrieval",
      color: "#38bdf8",
      badgeBg: "rgba(56, 189, 248, 0.15)",
      icon: <Search className="w-3.5 h-3.5 text-[#38bdf8]" />,
    },
    {
      id: "critic",
      name: "Critic Agent",
      role: "Grounding & Anti-Hallucination",
      status: "evaluating",
      thought: "Verifying factual lineage against source chunk citations",
      throughput: "0.02% drift rate",
      color: "#f59e0b",
      badgeBg: "rgba(245, 158, 11, 0.15)",
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: "synthesizer",
      name: "Synthesizer Agent",
      role: "Invariant Memory Formation",
      status: "ready",
      thought: "Reinforcing cross-document semantic clusters into axioms",
      throughput: "12 memory invariants",
      color: "#a78bfa",
      badgeBg: "rgba(167, 139, 250, 0.15)",
      icon: <Sparkles className="w-3.5 h-3.5 text-[#a78bfa]" />,
    },
    {
      id: "decision",
      name: "Decision Analyzer",
      role: "Blast Radius & Safety Audit",
      status: "active",
      thought: "Simulating rollback blast radius for pending system mutations",
      throughput: "Zero-loss barrier",
      color: "#f43f5e",
      badgeBg: "rgba(244, 63, 94, 0.15)",
      icon: <BrainCircuit className="w-3.5 h-3.5 text-rose-400" />,
    },
  ];

  return (
    <div className="w-full rounded-2xl bg-[#09090e] border border-white/[0.08] shadow-2xl overflow-hidden transition-all">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] bg-[#0d0e14] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8]">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white tracking-wide flex items-center gap-2">
              <span>MULTI-AGENT ORCHESTRATION SWARM</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                5 ACTIVE CORES
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Autonomous cognitive consensus loop operating across vector knowledge and human governance
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
          title={isExpanded ? "Collapse Swarm HUD" : "Expand Swarm HUD"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Agents Grid */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#07070b]/60">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-3 rounded-xl bg-[#0e0f17] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {agent.icon}
                    <span className="text-xs font-semibold text-white truncate">
                      {agent.name.split(" ")[0]}
                    </span>
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-bold"
                    style={{ backgroundColor: agent.badgeBg, color: agent.color }}
                  >
                    {agent.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-tight truncate">
                  {agent.role}
                </div>
              </div>

              <div className="text-[10px] text-slate-300 line-clamp-2 bg-black/40 p-1.5 rounded border border-white/[0.04] leading-relaxed">
                "{agent.thought}"
              </div>

              <div className="pt-1 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>METRIC:</span>
                <span className="text-white font-medium">{agent.throughput}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
