"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { Space, WorkflowListItem } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { Zap, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface TasksPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function TasksPage({ params }: TasksPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const [spaceRes, workflowsRes] = await Promise.all([
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
          apiClient<WorkflowListItem[]>(`/api/v1/workflows?space_id=${spaceId}`).catch(() => []),
        ]);
        if (spaceRes) setSpace(spaceRes);
        setWorkflows(workflowsRes || []);
      } catch (err) {
        console.error("Failed to load workflows:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, [spaceId]);

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Tasks Substrate */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-white truncate">
              Background Tasks & Workflows
            </h1>
            <p className="text-xs text-slate-400 truncate">
              Autonomous multi-agent executions running on behalf of this space
            </p>
          </div>
        </header>

        {/* Tasks Body */}
        <div className="flex-1 p-8 pb-16 max-w-5xl mx-auto w-full space-y-6 min-w-0">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-white">Autonomous Workflows</div>

            {workflows.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-2 bg-[#0c0d12]">
                <Zap className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-xs font-semibold text-white">No active background tasks</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Long-running research and multi-step synthesis tasks appear here as agents execute across your grounding documents.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {workflows.map((wf) => {
                  const isCompleted = wf.status === "completed";

                  return (
                    <div
                      key={wf.id}
                      className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-5 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCompleted ? "bg-emerald-400" : "bg-[#818cf8] animate-pulse"
                            }`}
                          />
                          <span className="text-sm font-semibold text-white truncate">
                            {wf.goal}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span className="font-mono text-[11px]">
                            {wf.completed_steps_count} of {wf.steps_count} steps completed
                          </span>
                          {wf.current_step && (
                            <>
                              <span>•</span>
                              <span>Current: {wf.current_step}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                        {wf.status}
                      </span>
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
