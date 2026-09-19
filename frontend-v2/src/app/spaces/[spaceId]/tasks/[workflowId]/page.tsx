"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { WorkflowDetail, WorkflowStepItem, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Activity,
  Terminal,
  RefreshCw,
  Zap,
} from "lucide-react";

interface WorkflowDetailPageProps {
  params: Promise<{ spaceId: string; workflowId: string }>;
}

export default function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const workflowId = resolvedParams.workflowId;
  const router = useRouter();

  const { currentSpace } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchWorkflow = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [wfRes, spaceRes] = await Promise.all([
        apiClient<WorkflowDetail>(`/api/v1/workflows/${workflowId}`),
        apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
      ]);
      setWorkflow(wfRes);
      if (spaceRes) setSpace(spaceRes);

      // Auto-expand running or awaiting approval steps
      const newExpanded: Record<string, boolean> = {};
      wfRes.steps.forEach((s) => {
        if (s.status === "running" || s.status === "awaiting_approval") {
          newExpanded[s.id] = true;
        }
      });
      setExpandedSteps((prev) => ({ ...prev, ...newExpanded }));
    } catch (err: any) {
      console.error("Failed to load workflow details:", err);
      setError(err.message || "Workflow not found or unauthorized.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
  }, [workflowId, spaceId]);

  // Polling for active running workflows
  useEffect(() => {
    if (!workflow) return;
    const isWorking = workflow.status === "running" || workflow.status === "planning";
    if (!isWorking) return;

    const interval = setInterval(() => {
      fetchWorkflow(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [workflow?.status]);

  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleApproveStep = async (stepId: string) => {
    setActionInProgress(stepId);
    try {
      await apiClient(`/api/v1/workflows/${workflowId}/steps/${stepId}/approve`, {
        method: "POST",
      });
      await fetchWorkflow(true);
    } catch (err: any) {
      console.error("Failed to approve step:", err);
      alert(err.message || "Approval failed.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectStep = async (stepId: string) => {
    setActionInProgress(stepId);
    try {
      await apiClient(`/api/v1/workflows/${workflowId}/steps/${stepId}/reject`, {
        method: "POST",
      });
      await fetchWorkflow(true);
    } catch (err: any) {
      console.error("Failed to reject step:", err);
      alert(err.message || "Rejection failed.");
    } finally {
      setActionInProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="text-xs font-mono text-slate-400 animate-pulse flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400 animate-spin" />
          <span>INSPECTING AUTONOMOUS WORKFLOW...</span>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#0c0d12] border border-white/[0.08] text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-sm font-semibold text-white">Workflow Not Found</h2>
          <p className="text-xs text-slate-400">{error || "Unable to inspect workflow."}</p>
          <button
            type="button"
            onClick={() => router.push(`/spaces/${spaceId}/tasks`)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors"
          >
            Return to Actions & Audit
          </button>
        </div>
      </div>
    );
  }

  const stepsCount = workflow.steps.length;
  const completedCount = workflow.steps.filter((s) => s.status === "completed").length;
  const progressPct = stepsCount > 0 ? Math.round((completedCount / stepsCount) * 100) : 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-slate-100 antialiased font-sans">
      <CommandSidebar spaceId={spaceId} space={space} />

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-[#0a0a0f]">
        {/* Top Header */}
        <header className="px-8 py-5 border-b border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/spaces/${spaceId}/tasks`}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
              title="Return to Actions"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                <Link href={`/spaces/${spaceId}/work`} className="hover:text-white transition-colors">
                  Work
                </Link>
                <span>/</span>
                <Link href={`/spaces/${spaceId}/tasks`} className="hover:text-white transition-colors">
                  Tasks
                </Link>
                <span>/</span>
                <span className="text-white font-medium">Execution Inspector</span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2.5 truncate max-w-xl">
                <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">{workflow.goal}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchWorkflow(true)}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            </button>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono uppercase font-semibold border flex items-center gap-1.5 ${
                workflow.status === "completed"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : workflow.status === "awaiting_approval"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : workflow.status === "running"
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  : "bg-white/5 text-slate-400 border-white/10"
              }`}
            >
              {workflow.status === "running" && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              )}
              <span>{workflow.status.replace("_", " ")}</span>
            </span>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-8 max-w-5xl space-y-6">
          {/* Progress Card */}
          <div className="p-6 rounded-2xl bg-[#0f1017] border border-white/[0.07] space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono uppercase tracking-wider">
                Pipeline Progress: Step {completedCount} of {stepsCount}
              </span>
              <span className="text-white font-mono font-bold">{progressPct}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6366f1] to-[#10b981] transition-all duration-500 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Steps Pipeline */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Execution Pipeline & Agent Steps</span>
            </div>

            <div className="space-y-3">
              {workflow.steps.map((step: WorkflowStepItem) => {
                const isStepExpanded = !!expandedSteps[step.id];
                const isRunning = step.status === "running";
                const isCompleted = step.status === "completed";
                const isAwaiting = step.status === "awaiting_approval";
                const isFailed = step.status === "failed";

                return (
                  <div
                    key={step.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isAwaiting
                        ? "bg-[#14120e] border-amber-500/30"
                        : isRunning
                        ? "bg-[#0e101a] border-indigo-500/30"
                        : "bg-[#0f1017] border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    {/* Step Header */}
                    <div
                      onClick={() => toggleStepExpanded(step.id)}
                      className="p-5 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 border ${
                            isCompleted
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : isRunning
                              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400 animate-pulse"
                              : isAwaiting
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                              : "bg-white/5 border-white/5 text-slate-500"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            String(step.step_order).padStart(2, "0")
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-sm font-semibold text-white truncate">
                              {step.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                              {step.intent_type}
                            </span>
                          </div>
                          {step.description && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold border ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isRunning
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : isAwaiting
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                              : "bg-white/5 text-slate-500 border-white/5"
                          }`}
                        >
                          {step.status.replace("_", " ")}
                        </span>

                        <div className="text-slate-400 p-1">
                          {isStepExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step Expanded Content */}
                    {isStepExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-white/[0.04] space-y-4">
                        {/* Approval banner if awaiting */}
                        {isAwaiting && (
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                            <div className="text-xs text-amber-200">
                              This autonomous step requires human verification before continuing.
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRejectStep(step.id)}
                                disabled={actionInProgress === step.id}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApproveStep(step.id)}
                                disabled={actionInProgress === step.id}
                                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors shadow-sm"
                              >
                                {actionInProgress === step.id ? "Approving..." : "Approve Step"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Output Summary */}
                        {step.output_summary && (
                          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] space-y-1.5">
                            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                              Output Summary
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed font-sans">
                              {step.output_summary}
                            </p>
                          </div>
                        )}

                        {/* Nested Agent Runs */}
                        {step.agent_runs && step.agent_runs.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Agent Execution Runs ({step.agent_runs.length})</span>
                            </div>

                            <div className="space-y-2">
                              {step.agent_runs.map((run) => (
                                <div
                                  key={run.id}
                                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-white font-mono">
                                      {run.agent_type}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                                        run.status === "completed"
                                          ? "text-emerald-400 bg-emerald-500/10"
                                          : run.status === "failed"
                                          ? "text-rose-400 bg-rose-500/10"
                                          : "text-slate-400 bg-white/5"
                                      }`}
                                    >
                                      {run.status}
                                    </span>
                                  </div>

                                  {run.output_summary && (
                                    <pre className="p-2 rounded bg-black/50 border border-white/[0.04] text-[11px] text-slate-300 overflow-x-auto font-mono">
                                      {JSON.stringify(run.output_summary, null, 2)}
                                    </pre>
                                  )}

                                  {run.error && (
                                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                      {run.error}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic">
                            No agent subprocess telemetry logged for this step yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="p-5 rounded-2xl bg-[#0c0d12] border border-white/[0.04] flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>WORKFLOW ID: {workflow.id}</span>
            <span>OBJECTIVE ID: {workflow.objective_id}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
