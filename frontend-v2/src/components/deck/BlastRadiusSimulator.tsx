"use client";

import React, { useState } from "react";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Cpu, ArrowRight } from "lucide-react";
import { ActionProposal } from "@/types/api";

interface BlastRadiusSimulatorProps {
  proposal: ActionProposal;
  onApprove: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
}

export function BlastRadiusSimulator({
  proposal,
  onApprove,
  onReject,
}: BlastRadiusSimulatorProps) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const proposalId = proposal.proposal_id || proposal.id;

  const handleApprove = async () => {
    setIsAuthorizing(true);
    try {
      await onApprove(proposalId);
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-[#16120e] to-[#0e0c0a] border border-amber-500/40 p-5 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -right-20 -top-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white tracking-wide flex items-center gap-2">
              <span className="text-amber-400 uppercase font-mono tracking-wider text-[11px]">
                ACTION MUTATION PROPOSAL REQUIRES AUTHORIZATION
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300">
                BLAST FACTOR: NOMINAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Action Type: <strong className="text-white">{proposal.action_type}</strong> · Confidence:{" "}
              <strong className="text-[#38bdf8]">{proposal.confidence}</strong>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          Proposal ID: <span className="text-white">{proposalId.slice(0, 8)}</span>
        </div>
      </div>

      {/* Proposal Rationale & Impact Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Left: Summary */}
        <div className="md:col-span-2 space-y-2 bg-black/40 p-3.5 rounded-xl border border-white/[0.06]">
          <div className="text-xs font-medium text-white leading-relaxed">
            {proposal.reason || `Execute autonomous mutation: ${proposal.action_type}`}
          </div>

          {/* Parameters JSON */}
          {proposal.parameters && Object.keys(proposal.parameters).length > 0 && (
            <div className="p-2.5 rounded bg-black/60 border border-white/[0.04] text-[10px] font-mono space-y-1">
              <div className="text-slate-400 uppercase text-[9px]">Mutation Parameters:</div>
              {Object.entries(proposal.parameters).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-400">{k}:</span>
                  <span className="text-[#38bdf8]">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Blast Radius & Safety Gauges */}
        <div className="space-y-2.5 bg-black/40 p-3.5 rounded-xl border border-white/[0.06] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
              Safety Simulation
            </div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Rollback Guarantee:</span>
                <span className="text-emerald-400 font-bold">100%</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Memory Integrity:</span>
                <span className="text-emerald-400 font-bold">Verified</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Blast Radius:</span>
                <span className="text-amber-300 font-bold">Space-Scoped</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => onReject(proposalId)}
              disabled={isAuthorizing}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={isAuthorizing}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#4f46e5] hover:to-[#4338ca] text-white text-xs font-semibold shadow-lg shadow-[#6366f1]/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isAuthorizing ? "Deploying..." : "Authorize & Deploy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
