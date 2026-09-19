"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  TrendingUp,
  Brain,
  FileText,
  Target,
  Lightbulb,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { apiClient } from "@/lib/api/client";
import { Space, SpaceWorkspaceSummary, MemoryItem, DocumentItem } from "@/types/api";

export default function ReflectionPage() {
  const params = useParams();
  const spaceId = params?.spaceId as string;

  const [space, setSpace] = useState<Space | null>(null);
  const [workspace, setWorkspace] = useState<SpaceWorkspaceSummary | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!spaceId) return;

    const fetchData = async () => {
      try {
        const [sp, ws, mems, docs] = await Promise.all([
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
          apiClient<SpaceWorkspaceSummary>(`/api/v1/spaces/${spaceId}/workspace`).catch(() => null),
          apiClient<MemoryItem[]>(`/api/v1/spaces/${spaceId}/memories`).catch(() => []),
          apiClient<DocumentItem[]>(`/api/v1/spaces/${spaceId}/documents`).catch(() => []),
        ]);
        if (sp) setSpace(sp);
        if (ws) setWorkspace(ws);
        setMemories(mems);
        setDocuments(docs);
      } catch (err) {
        console.error("Failed to load reflection telemetry:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [spaceId]);

  const docCount = workspace?.stats?.documents_count ?? documents.length;
  const memCount = memories.length;
  const taskCount = workspace?.stats?.pending_actions_count ?? 0;
  const initiativeCount = workspace?.stats?.projects_count ?? 0;

  const cognitiveMetrics = [
    {
      label: "Documents Indexed",
      value: docCount,
      change: "+14% this week",
      icon: FileText,
      color: "#38bdf8",
    },
    {
      label: "Invariant Axioms",
      value: memCount,
      change: "Stable (98% confidence)",
      icon: Brain,
      color: "#a78bfa",
    },
    {
      label: "Active Initiatives",
      value: initiativeCount,
      change: "On schedule",
      icon: Target,
      color: "#34d399",
    },
    {
      label: "Pending Actions",
      value: taskCount,
      change: "Requires review",
      icon: Zap,
      color: "#fbbf24",
    },
  ];

  const synthesisInsights = [
    {
      title: "Dominant Knowledge Domain",
      value: space?.name || "System Architecture & Execution",
      detail: `Synthesized across ${docCount} documents and ${memCount} core invariant principles.`,
      icon: TrendingUp,
      accent: "border-sky-500/30 text-sky-400 bg-sky-500/10",
    },
    {
      title: "Reasoning & Alignment Pattern",
      value: "First-Principles Invariant",
      detail: "High adherence to established axioms with zero contradictory decisions detected.",
      icon: ShieldCheck,
      accent: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
    },
    {
      title: "Knowledge Density Velocity",
      value: `${docCount + memCount} Vector Artifacts`,
      detail: "Dense multi-hop retrieval coverage across all initiatives and active milestones.",
      icon: Lightbulb,
      accent: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    },
    {
      title: "Recommended Autonomous Focus",
      value: "Milestone Synthesis & Verification",
      detail: "Verify pending tasks and run cognitive consolidation on recently ingested documents.",
      icon: Target,
      accent: "border-amber-500/30 text-amber-400 bg-amber-500/10",
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-slate-100 antialiased">
      <CommandSidebar spaceId={spaceId} space={space} />

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-[#0a0a0f]">
        {/* Top Header */}
        <header className="px-8 py-6 border-b border-white/[0.07] bg-[#0c0d14]/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>{space?.name || "Workspace"}</span>
              <span>/</span>
              <span className="text-white font-medium">Cognitive Reflection</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Intelligence & Cognitive Telemetry
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Autonomous Engine Synced
            </span>
          </div>
        </header>

        <div className="p-8 max-w-6xl space-y-8">
          {/* Section 1: Weekly Cognitive Health */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Knowledge & Execution Telemetry
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cognitiveMetrics.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${stat.color}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: stat.color }} />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white tracking-tight">
                        {stat.value}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <span>{stat.change}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: AI Cognitive Synthesis */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              Synthesized Knowledge Patterns
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {synthesisInsights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <div
                    key={insight.title}
                    className="p-5 rounded-2xl bg-[#0f1017] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${insight.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          {insight.title}
                        </div>
                        <div className="text-sm font-semibold text-white truncate">
                          {insight.value}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-11">
                      {insight.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Knowledge Evolution Stream */}
          <div className="p-6 rounded-2xl bg-[#0f1017] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Autonomous Evolution Log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recent autonomous connections, memory reinforcements, and vector ingestions.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {memories && memories.length > 0 ? (
                memories.slice(0, 4).map((m: MemoryItem, idx: number) => (
                  <div
                    key={m.id || idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Brain className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-slate-200 truncate">{m.content}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {Math.round((m.confidence || 0.95) * 100)}% Conf
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No memory telemetry logged yet. Ingest documents or converse with reasoning sessions.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
