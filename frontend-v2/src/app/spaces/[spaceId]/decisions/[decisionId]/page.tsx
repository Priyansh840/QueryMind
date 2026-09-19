"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { DecisionDetail, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  ArrowLeft,
  ShieldCheck,
  Check,
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

interface DecisionDetailPageProps {
  params: Promise<{ spaceId: string; decisionId: string }>;
}

export default function DecisionDetailPage({ params }: DecisionDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const decisionId = resolvedParams.decisionId;
  const router = useRouter();

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    const loadDecision = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [decRes, spaceRes] = await Promise.all([
          apiClient<DecisionDetail>(`/api/v1/actions/${decisionId}/decision`),
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        ]);
        setDecision(decRes);
        if (spaceRes) setSpace(spaceRes);
      } catch (err: any) {
        console.error("Failed to load decision detail:", err);
        setError(err.message || "Decision not found.");
      } finally {
        setIsLoading(false);
      }
    };
    loadDecision();
  }, [decisionId, spaceId]);

  const handleApprove = async () => {
    if (!decision || isApproving) return;
    setIsApproving(true);
    try {
      await apiClient(`/api/v1/actions/${decisionId}/approve`, {
        method: "POST",
      });
      setDecision((prev) => (prev ? { ...prev, status: "executed" } : null));
    } catch (err) {
      console.error("Failed to approve action:", err);
      alert("Failed to execute action.");
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="text-xs font-mono text-slate-400 animate-pulse">
          AUDITING DECISION LINEAGE...
        </div>
      </div>
    );
  }

  if (error || !decision) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#0c0d12] border border-white/[0.08] text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[#f87171] mx-auto" />
          <h2 className="text-sm font-semibold text-white">Decision Not Found</h2>
          <p className="text-xs text-slate-400">{error || "Unable to locate decision."}</p>
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

  const isExecuted = decision.status === "executed";

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/spaces/${spaceId}/work`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white truncate">
                Decision Forensic Trace
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Lineage • Grounding Evidence ➔ Outcome
              </p>
            </div>
          </div>

          {!isExecuted && (
            <button
              type="button"
              disabled={isApproving}
              onClick={handleApprove}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isApproving ? "Executing..." : "Authorize Sign-Off"}</span>
            </button>
          )}
        </header>

        {/* Forensic Body */}
        <div className="flex-1 p-8 pb-16 max-w-4xl mx-auto w-full space-y-6 min-w-0">
          {/* Decision Brief Card */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-6 space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded-md uppercase tracking-wider bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8]/25 font-bold">
                {decision.action_type.replace(/_/g, " ")}
              </span>
              <span className="text-slate-400">
                Confidence: {decision.confidence || "High"}
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">
                {decision.title}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {decision.conclusion}
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
              <span>Status: <strong className="text-white uppercase font-mono">{decision.status}</strong></span>
              {decision.outcome?.target_id && (
                <Link
                  href={`/spaces/${spaceId}/work`}
                  className="text-[#818cf8] hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>View Created Resource</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Supporting Evidence Citations */}
          {decision.evidence && decision.evidence.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-white">Supporting Grounding Evidence</div>
              <div className="space-y-2">
                {decision.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0c0d12] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#818cf8]">
                      <span>{ev.document_title}</span>
                      {ev.page_number && <span>Page {ev.page_number}</span>}
                    </div>
                    {ev.snippet && (
                      <p className="text-xs text-slate-300 font-mono leading-relaxed">
                        &ldquo;{ev.snippet}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
