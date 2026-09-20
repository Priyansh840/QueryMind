"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { ActionProposal, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  Zap,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FileText,
  Target,
  Search,
  Filter,
  Layers,
  RotateCcw,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

interface ActionsPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function ActionsPage({ params }: ActionsPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<"all" | "pending" | "executed" | "rejected">("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const loadActions = async () => {
    try {
      const [spaceRes, actionsRes] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        apiClient<{ items: ActionProposal[] }>(`/api/v1/actions?space_id=${spaceId}&limit=50`).catch(
          () => ({ items: [] })
        ),
      ]);

      if (spaceRes) setSpace(spaceRes);
      setProposals(actionsRes?.items || []);
    } catch (err) {
      console.error("Failed to load actions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [spaceId]);

  // 1-Click Approve
  const handleApprove = async (proposalId: string) => {
    setApprovingId(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/approve`, {
        method: "POST",
      });
      // Mark as executed locally
      setProposals((prev) =>
        prev.map((p) =>
          p.proposal_id === proposalId || p.id === proposalId
            ? { ...p, status: "executed", executed_at: new Date().toISOString() }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to approve action proposal:", err);
    } finally {
      setApprovingId(null);
    }
  };

  // Reject Proposal
  const handleReject = async (proposalId: string) => {
    setRejectingId(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/reject`, {
        method: "POST",
      });
      // Mark as rejected locally
      setProposals((prev) =>
        prev.map((p) =>
          p.proposal_id === proposalId || p.id === proposalId
            ? { ...p, status: "rejected" }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to reject action proposal:", err);
    } finally {
      setRejectingId(null);
    }
  };

  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const executedProposals = proposals.filter((p) => p.status === "executed");
  const rejectedProposals = proposals.filter((p) => p.status === "rejected");

  const filteredProposals = proposals.filter((p) => {
    if (actionFilter === "pending") return p.status === "pending";
    if (actionFilter === "executed") return p.status === "executed";
    if (actionFilter === "rejected") return p.status === "rejected";
    return true;
  });

  // Action type helper icon
  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case "create_goal":
      case "update_goal":
        return <Target className="w-4 h-4 text-emerald-400" />;
      case "summarize_document":
      case "create_document":
        return <FileText className="w-4 h-4 text-sky-400" />;
      case "search":
      case "research":
        return <Search className="w-4 h-4 text-indigo-400" />;
      default:
        return <Zap className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="h-screen w-screen bg-[#08090d] text-zinc-100 flex overflow-hidden select-none font-sans antialiased">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Actions Substrate */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#08090d] ambient-mesh">
        {/* Header Bar */}
        <header className="h-14 px-6 md:px-8 xl:px-12 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#08090d]/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white truncate">
                  Actions & Outcomes
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                  VERIFIABLE GOVERNANCE
                </span>
              </div>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08]">
            <button
              onClick={() => setActionFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                actionFilter === "all"
                  ? "bg-white/[0.12] text-white shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All ({proposals.length})
            </button>
            <button
              onClick={() => setActionFilter("pending")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                actionFilter === "pending"
                  ? "bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Pending Review ({pendingProposals.length})</span>
            </button>
            <button
              onClick={() => setActionFilter("executed")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                actionFilter === "executed"
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Outcomes ({executedProposals.length})</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 px-6 md:px-8 xl:px-12 py-8 pb-20 max-w-[1700px] mx-auto w-full space-y-8 min-w-0">
          {/* Executive KPI Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] hover:border-white/[0.2] transition-all space-y-1.5 shadow-xs">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Total Actions Proposed</div>
              <div className="text-2xl font-bold text-white tracking-tight">{proposals.length}</div>
            </div>
            <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] hover:border-white/[0.2] transition-all space-y-1.5 shadow-xs">
              <div className="text-[11px] font-mono text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                <span>Pending Approval</span>
              </div>
              <div className="text-2xl font-bold text-amber-400 tracking-tight">
                {pendingProposals.length}
              </div>
            </div>
            <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] hover:border-white/[0.2] transition-all space-y-1.5 shadow-xs">
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified Outcomes</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                {executedProposals.length}
              </div>
            </div>
            <div className="p-5 rounded-xl bg-[#0d0e15] border border-white/[0.08] hover:border-white/[0.2] transition-all space-y-1.5 shadow-xs">
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>Safety Guardrail</span>
              </div>
              <div className="text-sm font-semibold text-zinc-200 tracking-tight pt-1">
                Human-in-the-Loop
              </div>
            </div>
          </div>

          {/* Pending Approval Section */}
          {pendingProposals.length > 0 && actionFilter !== "executed" && actionFilter !== "rejected" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Awaiting Human Authorization ({pendingProposals.length})
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Autonomous agents will not proceed without approval
                </span>
              </div>

              <div className="space-y-3">
                {pendingProposals.map((proposal) => {
                  const pId = proposal.proposal_id || proposal.id;
                  const isApproving = approvingId === pId;
                  const isRejecting = rejectingId === pId;

                  return (
                    <div
                      key={pId}
                      className="glass-card p-5 border-amber-500/25 space-y-4 hover-glow-amber"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            {getActionIcon(proposal.action_type)}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-semibold uppercase text-amber-200">
                                {proposal.action_type.replace("_", " ")}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                                Confidence: {proposal.confidence}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-white leading-relaxed">
                              {proposal.reason}
                            </p>
                          </div>
                        </div>

                        {/* Approval Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isApproving || isRejecting}
                            onClick={() => handleReject(pId)}
                            className="px-3 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 text-xs text-slate-400 font-medium transition-all flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            disabled={isApproving || isRejecting}
                            onClick={() => handleApprove(pId)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1.5"
                          >
                            {isApproving ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                <span>Executing...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve & Execute</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Parameters Preview */}
                      {proposal.parameters && Object.keys(proposal.parameters).length > 0 && (
                        <div className="pt-2 border-t border-white/[0.05] flex flex-wrap gap-2 items-center text-[11px]">
                          <span className="text-slate-500 font-medium">Parameters:</span>
                          {Object.entries(proposal.parameters).map(([key, val]) => (
                            <span
                              key={key}
                              className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.06] text-slate-300 font-mono text-[10px]"
                            >
                              {key}: {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Outcome Ledger Section (Executed & Completed Actions) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.05]">
              <div className="space-y-0.5">
                <h2 className="text-xs font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verifiable Outcomes & Action Ledger</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Every completed action produces an outcome result, artifact record, and impact trace
                </p>
              </div>

              <span className="text-xs font-mono text-slate-500">
                {filteredProposals.length} total entries
              </span>
            </div>

            {filteredProposals.length === 0 ? (
              <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-3 bg-[#0c0d14]">
                <Zap className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-xs font-semibold text-white">No actions recorded in this view</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When you converse with MYND in this space, suggested interventions and execution results will be recorded in this verifiable ledger.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProposals.map((item) => {
                  const isExecuted = item.status === "executed";
                  const isPending = item.status === "pending";
                  const isRejected = item.status === "rejected";

                  return (
                    <div
                      key={item.id || item.proposal_id}
                      className="p-5 rounded-2xl border border-white/[0.07] bg-[#0c0d14] hover:border-white/[0.14] space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                            {getActionIcon(item.action_type)}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-white capitalize">
                                {item.action_type.replace("_", " ")}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${
                                  isExecuted
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    : isPending
                                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                    : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                }`}
                              >
                                {item.status}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {new Date(item.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {item.reason}
                            </p>
                          </div>
                        </div>

                        {/* Status Icon */}
                        <div className="shrink-0">
                          {isExecuted && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                          {isPending && <Clock className="w-5 h-5 text-amber-400" />}
                          {isRejected && <XCircle className="w-5 h-5 text-slate-500" />}
                        </div>
                      </div>

                      {/* Verifiable Outcome Card Details */}
                      {isExecuted && (
                        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1.5">
                          <div className="font-semibold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Verified Execution Outcome</span>
                          </div>
                          <p className="text-slate-300 text-[11px]">
                            Action executed successfully with high deterministic grounding. Changes were recorded in this space&apos;s memory and persistent workspace state.
                          </p>
                          {item.executed_target_id && (
                            <div className="text-[10px] font-mono text-emerald-400 pt-1">
                              Target Ref: {item.executed_target_id}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
