"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, CircleDashed, Sparkles } from "lucide-react";
import { AgentActivityStep } from "@/types/api";

interface AgentActivityDrawerProps {
  steps: AgentActivityStep[];
  isLive?: boolean;
}

export const AgentActivityDrawer: React.FC<AgentActivityDrawerProps> = ({
  steps,
  isLive = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(isLive);

  if (!steps || steps.length === 0) return null;

  const activeStep = steps[steps.length - 1];

  return (
    <div className="my-3 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] bg-[var(--surface-primary)] overflow-hidden transition-mynd">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
          <span className="font-medium text-[var(--text-primary)] truncate">
            {isLive ? activeStep?.status || "Agent Reasoning in Progress..." : "Multi-Agent Synthesis Trail"}
          </span>
          {isLive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] shrink-0 ml-2">
          <span>{steps.length} steps</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 space-y-2 text-xs">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            return (
              <div key={`${step.timestamp}-${idx}`} className="flex items-start gap-2.5">
                {isLive && isLast ? (
                  <CircleDashed className="w-3.5 h-3.5 text-[var(--accent-primary)] animate-spin shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
                      {step.agent.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{step.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
