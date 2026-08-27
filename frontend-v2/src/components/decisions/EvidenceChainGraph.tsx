"use client";

import React from "react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { DecisionDetail } from "@/types/api";
import {
  FileText,
  Brain,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowDown,
  ArrowRight,
} from "lucide-react";

interface EvidenceChainGraphProps {
  decision: DecisionDetail;
}

export const EvidenceChainGraph: React.FC<EvidenceChainGraphProps> = ({ decision }) => {
  const isExecuted = decision.status === "executed";
  const isRejected = decision.status === "rejected";
  const isPending = decision.status === "pending";

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        Grounded Lineage: Evidence → Analysis → Decision → Action
      </div>

      <div className="flex flex-col gap-3">
        {/* Node 1: Evidence Sources */}
        <Surface variant="primary" className="p-3.5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-blue-500/10 text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  1. Grounded Knowledge Evidence
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {decision.evidence.length > 0
                    ? `${decision.evidence.length} verified source citations retrieved from Qdrant/PostgreSQL`
                    : "Space-scoped document knowledge context"}
                </div>
              </div>
            </div>
            <Badge variant="outline" size="sm">
              Evidence Layer
            </Badge>
          </div>
        </Surface>

        <div className="flex justify-center text-[var(--border-strong)]">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Node 2: Multi-Agent Analysis & Synthesis */}
        <Surface variant="primary" className="p-3.5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-purple-500/10 text-purple-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  2. Analysis & Conclusion
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                  {decision.conclusion}
                </div>
              </div>
            </div>
            <Badge variant="outline" size="sm">
              {decision.confidence} confidence
            </Badge>
          </div>
        </Surface>

        <div className="flex justify-center text-[var(--border-strong)]">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Node 3: Proposed Decision */}
        <Surface variant="primary" className="p-3.5 border-l-4 border-l-[var(--accent-primary)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--accent-text)]">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  3. Decision Proposal: {decision.action_type.replace(/_/g, " ")}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  User approval boundary enforced before state execution
                </div>
              </div>
            </div>
            <Badge variant={isExecuted ? "default" : isRejected ? "outline" : "accent"} size="sm">
              {decision.status}
            </Badge>
          </div>
        </Surface>

        <div className="flex justify-center text-[var(--border-strong)]">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* Node 4: Action Execution & Outcome */}
        <Surface
          variant="primary"
          className={`p-3.5 border-l-4 ${
            isExecuted ? "border-l-emerald-500" : isRejected ? "border-l-rose-500" : "border-l-[var(--border-strong)]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-[var(--radius-xs)] ${
                  isExecuted
                    ? "bg-emerald-500/10 text-emerald-400"
                    : isRejected
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                }`}
              >
                {isExecuted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isRejected ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  4. Action Outcome
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {decision.outcome
                    ? decision.outcome.summary
                    : isPending
                    ? "Awaiting user approval before committing database changes"
                    : "Action proposal rejected by user"}
                </div>
              </div>
            </div>
            <Badge variant="outline" size="sm">
              {isExecuted ? "Executed" : isRejected ? "Rejected" : "Pending Approval"}
            </Badge>
          </div>
        </Surface>
      </div>
    </div>
  );
};
