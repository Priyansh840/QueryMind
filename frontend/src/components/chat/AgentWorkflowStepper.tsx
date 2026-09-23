"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  Compass,
  Lightbulb,
  ShieldCheck,
  Layers,
  Workflow,
  Check,
} from "lucide-react";

export interface WorkflowStepData {
  step: string;
  status: "running" | "completed" | "pending";
  iteration?: number;
  output?: any;
  results?: any;
  tasks?: Array<{ id?: string; query: string; [key: string]: any }>;
  [key: string]: any;
}

interface AgentWorkflowStepperProps {
  steps: WorkflowStepData[];
  agentStatus?: string | null;
  isStreaming?: boolean;
}

const HUMAN_STEP_CONFIG: Record<
  string,
  {
    label: string;
    detail: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  context_gatherer: {
    label: "Gathered workspace context",
    detail: "Reviewed space settings, profile, and recent goals",
    icon: Layers,
  },
  planner: {
    label: "Formulated response plan",
    detail: "Determined query strategy and objectives",
    icon: Compass,
  },
  researcher: {
    label: "Searched documents & notes",
    detail: "Queried uploaded files and knowledge vault",
    icon: Search,
  },
  critic: {
    label: "Evaluated findings",
    detail: "Verified source evidence and factual grounding",
    icon: ShieldCheck,
  },
  decision_analyzer: {
    label: "Analyzed insights & trade-offs",
    detail: "Assessed recommendations and constraints",
    icon: Lightbulb,
  },
  action_proposer: {
    label: "Constructed actions",
    detail: "Prepared workspace execution proposals",
    icon: Workflow,
  },
  synthesizer: {
    label: "Formulated response",
    detail: "Composed grounded response with citations",
    icon: Sparkles,
  },
};

export default function AgentWorkflowStepper({
  steps,
  agentStatus,
  isStreaming = false,
}: AgentWorkflowStepperProps) {
  // Always default to collapsed like ChatGPT — users can click to inspect thoughts
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() =>
    Math.max(1, Math.min(steps?.length || 1, 5))
  );

  // Live timer while streaming
  useEffect(() => {
    if (!isStreaming) return;
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  if (!steps || steps.length === 0) {
    if (!isStreaming) return null;
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "5px 12px",
          borderRadius: "18px",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid var(--border)",
          fontSize: "12.5px",
          color: "var(--text-secondary)",
          marginBottom: "8px",
        }}
      >
        <Sparkles
          style={{
            width: "13px",
            height: "13px",
            color: "var(--text-secondary)",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        <span>Thinking...</span>
      </div>
    );
  }

  // Determine friendly display label
  const cleanStatus = (agentStatus || "").toLowerCase();
  let liveLabel = "Thinking...";
  if (cleanStatus.includes("search") || cleanStatus.includes("retriev") || cleanStatus.includes("research")) {
    liveLabel = "Searching workspace documents...";
  } else if (cleanStatus.includes("context") || cleanStatus.includes("gather")) {
    liveLabel = "Reviewing workspace context...";
  } else if (cleanStatus.includes("plan")) {
    liveLabel = "Formulating plan...";
  } else if (cleanStatus.includes("analyz") || cleanStatus.includes("evaluat")) {
    liveLabel = "Analyzing insights...";
  } else if (cleanStatus.includes("synthesiz") || cleanStatus.includes("final") || cleanStatus.includes("think")) {
    liveLabel = "Thinking...";
  } else if (agentStatus) {
    liveLabel = agentStatus;
  }

  const finishedLabel =
    elapsedSeconds > 1
      ? `Thought for ${elapsedSeconds} seconds`
      : "Thought for a moment";

  return (
    <div
      style={{
        marginBottom: "6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      {/* ─── Sleek ChatGPT-style Thinking Pill / Header ─── */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: isStreaming ? "5px 12px" : "4px 8px",
          borderRadius: isStreaming ? "18px" : "8px",
          background: isStreaming
            ? "rgba(255, 255, 255, 0.04)"
            : isExpanded
              ? "rgba(255, 255, 255, 0.03)"
              : "transparent",
          border: isStreaming ? "1px solid var(--border)" : "1px solid transparent",
          fontSize: "12.5px",
          fontWeight: 500,
          color: isStreaming ? "var(--text-secondary)" : "var(--text-tertiary)",
          cursor: "pointer",
          transition: "all 150ms ease",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isStreaming) {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isStreaming) {
            e.currentTarget.style.color = "var(--text-tertiary)";
            e.currentTarget.style.background = isExpanded ? "rgba(255, 255, 255, 0.03)" : "transparent";
          }
        }}
      >
        {isStreaming ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "14px",
              height: "14px",
            }}
          >
            <Sparkles
              style={{
                width: "13px",
                height: "13px",
                color: "var(--text-secondary)",
                animation: "spin 3s linear infinite",
              }}
            />
          </span>
        ) : (
          <Sparkles style={{ width: "12px", height: "12px", opacity: 0.7 }} />
        )}

        <span>{isStreaming ? `${liveLabel} (${elapsedSeconds}s)` : finishedLabel}</span>

        {isExpanded ? (
          <ChevronUp style={{ width: "13px", height: "13px", opacity: 0.6 }} />
        ) : (
          <ChevronDown style={{ width: "13px", height: "13px", opacity: 0.6 }} />
        )}
      </button>

      {/* ─── Expandable Thought Process Drawer ─── */}
      {isExpanded && (
        <div
          style={{
            marginTop: "6px",
            marginLeft: "6px",
            paddingLeft: "14px",
            borderLeft: "2px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            paddingTop: "4px",
            paddingBottom: "8px",
            maxWidth: "680px",
            animation: "fadeIn 150ms ease",
          }}
        >
          {steps.map((step, idx) => {
            const conf = HUMAN_STEP_CONFIG[step.step] || {
              label: step.step.replace(/_/g, " "),
              detail: "Processed step",
              icon: Sparkles,
            };
            const Icon = conf.icon;
            const isDone = step.status === "completed";
            const isRunning = step.status === "running";

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  {isDone ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#10B981",
                        fontSize: "9px",
                      }}
                    >
                      <Check style={{ width: "9px", height: "9px" }} />
                    </span>
                  ) : isRunning ? (
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#3B82F6",
                        boxShadow: "0 0 6px #3B82F6",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: "var(--text-ghost)",
                      }}
                    />
                  )}

                  <span
                    style={{
                      fontWeight: 500,
                      color: isRunning ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {conf.label}
                  </span>
                </div>

                <div
                  style={{
                    paddingLeft: "21px",
                    color: "var(--text-tertiary)",
                    fontSize: "11.5px",
                    lineHeight: 1.4,
                  }}
                >
                  {conf.detail}

                  {/* Show search task queries if researcher ran */}
                  {step.step === "researcher" && step.tasks && step.tasks.length > 0 && (
                    <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                      {step.tasks.map((t, tIdx) => (
                        <div key={t.id || tIdx} style={{ fontStyle: "italic", opacity: 0.85 }}>
                          &ldquo;{t.query}&rdquo;
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show action proposal count if action proposer ran */}
                  {step.step === "action_proposer" && step.output?.proposals_count > 0 && (
                    <div style={{ marginTop: "3px", color: "#10B981", fontWeight: 500 }}>
                      ✓ Generated {step.output.proposals_count} workspace action proposal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
