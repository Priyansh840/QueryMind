"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { GoalItem, ProjectItem, ActionProposal, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Trash2,
  AlertCircle,
  Target,
  FolderGit2,
  ShieldCheck,
  Calendar,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface GoalDetailPageProps {
  params: Promise<{ spaceId: string; goalId: string }>;
}

export default function GoalDetailPage({ params }: GoalDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const goalId = resolvedParams.goalId;
  const router = useRouter();

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [goal, setGoal] = useState<GoalItem | null>(null);
  const [parentProject, setParentProject] = useState<ProjectItem | null>(null);
  const [originatingDecision, setOriginatingDecision] = useState<ActionProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGoalData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [goalRes, spaceRes] = await Promise.all([
          apiClient<GoalItem>(`/api/v1/goals/${goalId}`),
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        ]);

        setGoal(goalRes);
        if (spaceRes) setSpace(spaceRes);

        // Fetch parent project if associated
        if (goalRes.project_id) {
          try {
            const projRes = await apiClient<ProjectItem>(`/api/v1/projects/${goalRes.project_id}`);
            setParentProject(projRes);
          } catch (pErr) {
            console.warn("Parent project fetch failed:", pErr);
          }
        }

        // Fetch decisions/actions to verify originating decision provenance
        try {
          const actionsRes = await apiClient<ActionProposal[]>(
            `/api/v1/spaces/${spaceId}/actions`
          ).catch(() => []);
          if (Array.isArray(actionsRes)) {
            const matched = actionsRes.find(
              (a) => a.executed_target_id === goalId || (a.parameters && a.parameters.goal_id === goalId)
            );
            if (matched) setOriginatingDecision(matched);
          }
        } catch (aErr) {
          console.warn("Originating decision search failed:", aErr);
        }
      } catch (err: any) {
        console.error("Failed to load goal details:", err);
        setError(err.message || "Goal not found or unauthorized.");
      } finally {
        setIsLoading(false);
      }
    };

    loadGoalData();
  }, [goalId, spaceId]);

  // 1-Click Toggle Status (active ↔ completed)
  const handleToggleStatus = async () => {
    if (!goal || isToggling) return;
    setIsToggling(true);
    const newStatus = goal.status === "completed" ? "active" : "completed";

    try {
      const updated = await apiClient<GoalItem>(`/api/v1/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setGoal(updated);
    } catch (err: any) {
      console.error("Failed to toggle goal status:", err);
      alert(err.message || "Failed to update milestone status.");
    } finally {
      setIsToggling(false);
    }
  };

  // Delete Goal
  const handleDeleteGoal = async () => {
    if (!confirm("Are you sure you want to delete this tracked milestone?")) return;
    try {
      await apiClient(`/api/v1/goals/${goalId}`, { method: "DELETE" });
      router.push(`/spaces/${spaceId}/work`);
    } catch (err: any) {
      console.error("Failed to delete goal:", err);
      alert(err.message || "Failed to delete goal.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#08090d] text-white">
        <div className="text-xs font-mono text-slate-400 animate-pulse">
          LOADING TRACKED MILESTONE...
        </div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#08090d] text-white p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#0c0d12] border border-white/[0.08] text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-sm font-semibold text-white">Milestone Not Found</h2>
          <p className="text-xs text-slate-400">{error || "Unable to locate milestone."}</p>
          <button
            type="button"
            onClick={() => router.push(`/spaces/${spaceId}/work`)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors"
          >
            Return to Work Hub
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = goal.status === "completed";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#08090d] text-slate-100 antialiased font-sans">
      <CommandSidebar spaceId={spaceId} space={space} />

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-[#08090d]">
        {/* Top Header */}
        <header className="px-8 py-5 border-b border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={parentProject ? `/spaces/${spaceId}/work/projects/${parentProject.id}` : `/spaces/${spaceId}/work`}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
              title="Return"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                <Link href={`/spaces/${spaceId}/work`} className="hover:text-white transition-colors">
                  Work
                </Link>
                {parentProject && (
                  <>
                    <span>/</span>
                    <Link
                      href={`/spaces/${spaceId}/work/projects/${parentProject.id}`}
                      className="hover:text-white transition-colors truncate max-w-[140px]"
                    >
                      {parentProject.name}
                    </Link>
                  </>
                )}
                <span>/</span>
                <span className="text-white font-medium">Milestone Detail</span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Tracked Milestone</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleToggleStatus}
              disabled={isToggling}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
                isCompleted
                  ? "bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300"
                  : "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              }`}
            >
              {isCompleted ? (
                <>
                  <Circle className="w-3.5 h-3.5" />
                  <span>Mark Active</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Completed</span>
                </>
              )}
            </button>

            <button
              onClick={handleDeleteGoal}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              title="Delete milestone"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-8 max-w-4xl space-y-6">
          {/* Card 1: Objective & Status */}
          <div className="p-6 rounded-2xl bg-[#0f1017] border border-white/[0.07] space-y-4">
            <div className="flex items-center justify-between">
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                  isCompleted
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                }`}
              >
                {goal.status}
              </span>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Created {new Date(goal.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <h2
                className={`text-lg font-medium leading-relaxed ${
                  isCompleted ? "line-through text-slate-400" : "text-white"
                }`}
              >
                {goal.description}
              </h2>
            </div>
          </div>

          {/* Card 2: Part of Project */}
          <div className="p-6 rounded-2xl bg-[#0f1017] border border-white/[0.07] space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-sky-400" />
              <span>Parent Initiative</span>
            </div>

            {parentProject ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-white">{parentProject.name}</div>
                  <div className="text-xs text-slate-400">
                    Status: <span className="capitalize font-mono text-slate-300">{parentProject.status}</span>
                  </div>
                </div>

                <Link
                  href={`/spaces/${spaceId}/work/projects/${parentProject.id}`}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-white font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>View Project</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                This milestone is an independent standalone objective not bound to a specific project.
              </p>
            )}
          </div>

          {/* Card 3: Originating Decision Provenance */}
          <div className="p-6 rounded-2xl bg-[#0f1017] border border-white/[0.07] space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Originating Decision Provenance</span>
            </div>

            {originatingDecision ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Action Proposal: {originatingDecision.action_type}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Executed
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {originatingDecision.reason}
                </p>
                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
                  <Link
                    href={`/spaces/${spaceId}/decisions/${originatingDecision.proposal_id || originatingDecision.id}`}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <span>Inspect Forensic Decision Trace</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    href={`/spaces/${spaceId}/conversations/${originatingDecision.conversation_id}`}
                    className="text-slate-400 hover:text-white"
                  >
                    View Reasoning Session →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Related decision provenance information unavailable. This milestone may have been defined directly by a workspace member.
              </p>
            )}
          </div>

          {/* Card 4: Metadata & Lifecycle */}
          <div className="p-5 rounded-2xl bg-[#0c0d12] border border-white/[0.04] flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>IDENTIFIER: {goal.id}</span>
            <span>TYPE: Milestone / Goal</span>
          </div>
        </div>
      </main>
    </div>
  );
}
