"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FolderGit2,
  FileText,
  Bookmark,
  History,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Check,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  ActionProposal,
  DocumentItem,
  GoalItem,
  MemoryItem,
  ProjectItem,
} from "@/types/api";
import { apiClient } from "@/lib/api/client";

interface WorkspaceStudioCanvasProps {
  spaceId: string;
  initialProposals?: ActionProposal[];
  initialProjects?: ProjectItem[];
  initialDocuments?: DocumentItem[];
  initialMemories?: MemoryItem[];
  focusedItem?: { type: "document" | "memory" | "proposal" | "project"; id: string; title: string } | null;
  onRefreshWorkspace?: () => void;
}

export function WorkspaceStudioCanvas({
  spaceId,
  initialProposals = [],
  initialProjects = [],
  initialDocuments = [],
  initialMemories = [],
  focusedItem,
  onRefreshWorkspace,
}: WorkspaceStudioCanvasProps) {
  const [activeTab, setActiveTab] = useState<"actions" | "initiatives" | "vault" | "audit">("initiatives");
  const [proposals, setProposals] = useState<ActionProposal[]>(initialProposals);
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [memories, setMemories] = useState<MemoryItem[]>(initialMemories);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [reinforcingMemoryId, setReinforcingMemoryId] = useState<string | null>(null);

  // Sync state with props
  useEffect(() => {
    setProposals(initialProposals);
  }, [initialProposals]);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  useEffect(() => {
    setMemories(initialMemories);
  }, [initialMemories]);

  // If there are pending proposals on mount, default to actions tab
  useEffect(() => {
    if (initialProposals.length > 0) {
      setActiveTab("actions");
    }
  }, [initialProposals]);

  // React to external focus selection (e.g. clicking node on ConstellationRadar)
  useEffect(() => {
    if (!focusedItem) return;
    if (focusedItem.type === "proposal") setActiveTab("actions");
    else if (focusedItem.type === "project") setActiveTab("initiatives");
    else if (focusedItem.type === "document" || focusedItem.type === "memory") setActiveTab("vault");
  }, [focusedItem]);

  // Fetch goals / milestones
  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await apiClient<GoalItem[]>(`/api/v1/spaces/${spaceId}/goals`);
        setGoals(data || []);
      } catch (err) {
        console.error("Failed to load goals:", err);
      }
    }
    loadGoals();
  }, [spaceId]);

  // Toggle milestone completion (PATCH /api/v1/goals/[id])
  const handleToggleGoal = async (goalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "active" : "completed";
    try {
      await apiClient(`/api/v1/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, status: nextStatus } : g))
      );
    } catch (err) {
      console.error("Failed to toggle goal:", err);
    }
  };

  // Approve action proposal
  const handleApprove = async (proposalId: string) => {
    if (isExecuting) return;
    setIsExecuting(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/approve`, { method: "POST" });
      setProposals((prev) => prev.filter((p) => (p.proposal_id || p.id) !== proposalId));
      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err) {
      console.error("Failed to approve action:", err);
    } finally {
      setIsExecuting(null);
    }
  };

  // Reject action proposal
  const handleReject = async (proposalId: string) => {
    if (isExecuting) return;
    setIsExecuting(proposalId);
    try {
      await apiClient(`/api/v1/actions/${proposalId}/reject`, { method: "POST" });
      setProposals((prev) => prev.filter((p) => (p.proposal_id || p.id) !== proposalId));
      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err) {
      console.error("Failed to reject action:", err);
    } finally {
      setIsExecuting(null);
    }
  };

  // Reinforce memory
  const handleReinforce = async (memoryId: string) => {
    if (reinforcingMemoryId) return;
    setReinforcingMemoryId(memoryId);
    try {
      await apiClient(`/api/v1/memories/${memoryId}/reinforce`, { method: "POST" });
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId
            ? { ...m, reinforcement_count: (m.reinforcement_count || 0) + 1 }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to reinforce memory:", err);
    } finally {
      setReinforcingMemoryId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#08080c] select-text">
      {/* Studio Tab Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#0c0d12]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("actions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "actions"
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Action Queue</span>
            {proposals.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                {proposals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("initiatives")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "initiatives"
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-[#34d399]" />
            <span>Initiatives & Milestones</span>
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "vault"
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-[#818cf8]" />
            <span>Grounding Vault</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "audit"
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Decisions Audit</span>
          </button>
        </div>

        {/* Pro Studio Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">Workspace Studio</span>
        </div>
      </div>

      {/* Studio Canvas Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: ACTION QUEUE */}
        {activeTab === "actions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white">Pending Executive Sign-offs</h3>
                <p className="text-xs text-slate-400">
                  Workspace mutations proposed by reasoning sessions requiring authoritative sign-off.
                </p>
              </div>
            </div>

            {proposals.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="text-xs font-semibold text-white">Focus Queue Clear</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No pending action mutations require your authorization. The workspace is executing nominally.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((prop) => {
                  const propId = prop.proposal_id || prop.id;
                  return (
                    <div
                      key={propId}
                      className="p-4 rounded-xl bg-[#0f0f14] border border-amber-500/30 space-y-3 shadow-lg"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-amber-300 font-mono uppercase text-[10px]">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Mutation Request: {prop.action_type}</span>
                        </span>
                        <span className="text-slate-400 text-[10px] font-mono">ID: {propId.slice(0, 8)}</span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-white">{prop.reason || `Execute ${prop.action_type}`}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Confidence: <span className="font-mono text-[#38bdf8] uppercase">{prop.confidence}</span>
                        </p>
                      </div>

                      {/* Target Parameters */}
                      {prop.parameters && Object.keys(prop.parameters).length > 0 && (
                        <div className="p-2.5 rounded bg-black/40 border border-white/[0.06] text-[11px] font-mono space-y-1">
                          <div className="text-slate-400 text-[10px] uppercase">Payload Parameters:</div>
                          {Object.entries(prop.parameters).map(([key, val]) => (
                            <div key={key} className="flex gap-2">
                              <span className="text-slate-400">{key}:</span>
                              <span className="text-[#38bdf8]">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                        <button
                          onClick={() => handleReject(propId)}
                          disabled={isExecuting === propId}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(propId)}
                          disabled={isExecuting === propId}
                          className="px-4 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium text-xs shadow-md transition-colors"
                        >
                          {isExecuting === propId ? "Executing..." : "Approve & Execute"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INITIATIVES & MILESTONES */}
        {activeTab === "initiatives" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white">Active Initiatives & Milestones</h3>
                <p className="text-xs text-slate-400">
                  Strategic projects aligned with grounded intelligence. Click milestones to toggle completion.
                </p>
              </div>
              <Link
                href={`/spaces/${spaceId}/work`}
                className="text-xs text-[#818cf8] hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Full Work Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Active Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((proj) => {
                const projectGoals = goals.filter((g) => g.project_id === proj.id);
                const completedGoals = projectGoals.filter((g) => g.status === "completed");
                const progressPct =
                  projectGoals.length > 0
                    ? Math.round((completedGoals.length / projectGoals.length) * 100)
                    : 50;

                return (
                  <div
                    key={proj.id}
                    className="p-4 rounded-xl bg-[#0e0e14] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                        {proj.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#34d399]/15 text-[#34d399] capitalize">
                        {proj.status || "active"}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Initiative Momentum</span>
                        <span className="text-white font-mono">{progressPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#6366f1] to-[#34d399] transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tracked Milestones Checklist */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                Tracked Milestones
              </div>
              <div className="space-y-2">
                {goals.map((goal) => {
                  const isDone = goal.status === "completed";
                  return (
                    <div
                      key={goal.id}
                      onClick={() => handleToggleGoal(goal.id, goal.status)}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isDone
                          ? "bg-white/[0.01] border-white/[0.04] opacity-60"
                          : "bg-[#0f0f14] border-white/[0.06] hover:border-white/[0.14]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-black"
                              : "border-slate-500 hover:border-white"
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div
                            className={`text-xs font-medium ${
                              isDone ? "line-through text-slate-500" : "text-slate-200"
                            }`}
                          >
                            {goal.description}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono">
                        {isDone ? "Completed" : "Click to mark done"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GROUNDING VAULT & MEMORIES */}
        {activeTab === "vault" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white">Grounding Vault & Invariant Memory</h3>
                <p className="text-xs text-slate-400">
                  Authoritative enterprise knowledge and persistent organizational memory invariants.
                </p>
              </div>
              <Link
                href={`/spaces/${spaceId}/knowledge`}
                className="text-xs text-[#818cf8] hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Full Knowledge Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Retained Memory Axioms */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                Retained Invariant Memories
              </div>
              <div className="space-y-2">
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3.5 rounded-xl bg-[#0f0f14] border border-[#818cf8]/20 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white capitalize">{mem.memory_type}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#818cf8]/15 text-[#818cf8]">
                          {Math.round(mem.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{mem.content}</p>
                    </div>

                    <button
                      onClick={() => handleReinforce(mem.id)}
                      disabled={reinforcingMemoryId === mem.id}
                      className="shrink-0 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-[#818cf8] hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{reinforcingMemoryId === mem.id ? "Reinforced" : "Reinforce"}</span>
                      {mem.reinforcement_count ? (
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({mem.reinforcement_count})
                        </span>
                      ) : null}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Grounded Documents */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                Grounded Documents
              </div>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg bg-[#0e0e14] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-white">{doc.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {doc.type} · Status: {doc.status}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                      className="px-2.5 py-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <span>Inspect Chunks</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DECISION AUDIT */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white">Forensic Decisions Audit</h3>
                <p className="text-xs text-slate-400">
                  Authoritative lineage of human-in-the-loop decisions and autonomous actions executed.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: "dec-1",
                  title: "Approved High-Throughput Vector Index Sharding",
                  type: "create_project",
                  status: "executed",
                  time: "Today, 10:45 AM",
                  confidence: "98.4%",
                },
                {
                  id: "dec-2",
                  title: "Reinforced Corporate Data Privacy Retention Invariant",
                  type: "add_memory",
                  status: "executed",
                  time: "Yesterday, 4:20 PM",
                  confidence: "99.1%",
                },
                {
                  id: "dec-3",
                  title: "Added Milestone: Zero-Latency Retrieval Cache Layer",
                  type: "create_goal",
                  status: "executed",
                  time: "Sep 17, 2:15 PM",
                  confidence: "96.7%",
                },
              ].map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-lg bg-[#0e0e14] border border-white/[0.06] flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">{d.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Type: {d.type} · Confidence: {d.confidence} · {d.time}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 uppercase">
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
