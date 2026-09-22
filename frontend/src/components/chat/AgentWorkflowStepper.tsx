"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Search,
  Compass,
  Lightbulb,
  Sparkles,
  ShieldCheck,
  Layers,
  Workflow,
  ArrowRight,
  FileText,
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

const AGENT_CONFIG: Record<
  string,
  {
    name: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    shortDesc: string;
    accentColor: string;
  }
> = {
  context_gatherer: {
    name: "Context Gatherer",
    icon: Layers,
    shortDesc: "Scanning workspace knowledge, memory & documents",
    accentColor: "#3B82F6", // blue
  },
  planner: {
    name: "Planner",
    icon: Compass,
    shortDesc: "Formulating inquiry plan & execution strategy",
    accentColor: "#8B5CF6", // purple
  },
  researcher: {
    name: "Researcher",
    icon: Search,
    shortDesc: "Retrieving semantic evidence & document chunks",
    accentColor: "#06B6D4", // cyan
  },
  critic: {
    name: "Evidence Critic",
    icon: ShieldCheck,
    shortDesc: "Verifying relevance, accuracy & grounding",
    accentColor: "#F59E0B", // amber
  },
  decision_analyzer: {
    name: "Decision Analyzer",
    icon: Lightbulb,
    shortDesc: "Synthesizing trade-offs, recommendations & blockers",
    accentColor: "#EC4899", // pink
  },
  action_proposer: {
    name: "Action Proposer",
    icon: Workflow,
    shortDesc: "Constructing executable action proposals",
    accentColor: "#10B981", // emerald
  },
  synthesizer: {
    name: "Synthesizer",
    icon: Sparkles,
    shortDesc: "Generating grounded response with citations",
    accentColor: "#A855F7", // violet
  },
};

export default function AgentWorkflowStepper({
  steps,
  agentStatus,
  isStreaming = false,
}: AgentWorkflowStepperProps) {
  // If streaming, default open; if finished, default collapsed
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  if (!steps || steps.length === 0) {
    if (!isStreaming) return null;
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "16px",
          background: "var(--surface-subtle)",
          border: "1px solid var(--border)",
          fontSize: "12px",
          color: "var(--text-secondary)",
          marginBottom: "10px",
        }}
      >
        <RefreshCw className="animate-spin" style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
        <span>Initializing multi-agent orchestrator...</span>
      </div>
    );
  }

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const activeStep = steps.find((s) => s.status === "running");

  return (
    <div
      style={{
        marginBottom: "12px",
        borderRadius: "14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        overflow: "hidden",
        boxShadow: "var(--shadow-xs)",
        transition: "all 0.2s ease",
      }}
    >
      {/* ── Header / Collapsible Trigger ── */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: isStreaming ? "rgba(255, 255, 255, 0.02)" : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {isStreaming ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10B981",
                position: "relative",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10B981",
                }}
              />
            </span>
          ) : (
            <Zap style={{ width: "14px", height: "14px", color: "#10B981" }} />
          )}

          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", overflow: "hidden" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
              {isStreaming ? "Multi-Agent Reasoning" : "Reasoning Process"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              • {completedCount}/{steps.length} steps {isStreaming ? "in progress" : "completed"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {isStreaming && agentStatus && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                maxWidth: "240px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {agentStatus}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} />
          ) : (
            <ChevronDown style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} />
          )}
        </div>
      </button>

      {/* ── Expanded Stepper Details ── */}
      {isExpanded && (
        <div
          style={{
            padding: "10px 14px 14px",
            borderTop: "1px solid var(--border-subtle, var(--border))",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "var(--surface-subtle)",
          }}
        >
          {/* Horizontal Mini Pipeline Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexWrap: "wrap",
              paddingBottom: "8px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {steps.map((step, idx) => {
              const conf = AGENT_CONFIG[step.step] || {
                name: step.step,
                icon: Workflow,
                accentColor: "var(--accent)",
              };
              const Icon = conf.icon;
              const isDone = step.status === "completed";
              const isRunning = step.status === "running";

              return (
                <React.Fragment key={idx}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "10.5px",
                      fontWeight: isRunning ? 600 : 500,
                      background: isRunning
                        ? "rgba(255, 255, 255, 0.08)"
                        : isDone
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(255, 255, 255, 0.02)",
                      border: isRunning
                        ? `1px solid ${conf.accentColor}`
                        : isDone
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid var(--border)",
                      color: isRunning
                        ? conf.accentColor
                        : isDone
                          ? "#10B981"
                          : "var(--text-tertiary)",
                    }}
                  >
                    <Icon style={{ width: "11px", height: "11px" }} />
                    <span>{conf.name}</span>
                    {isDone && <CheckCircle2 style={{ width: "10px", height: "10px", color: "#10B981" }} />}
                    {isRunning && (
                      <RefreshCw
                        className="animate-spin"
                        style={{ width: "10px", height: "10px", color: conf.accentColor }}
                      />
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <ArrowRight style={{ width: "10px", height: "10px", color: "var(--text-ghost, #555)" }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Detailed Step Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {steps.map((step, idx) => {
              const conf = AGENT_CONFIG[step.step] || {
                name: step.step,
                icon: Workflow,
                shortDesc: "Processing step",
                accentColor: "var(--accent)",
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
                    gap: "4px",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    background: isRunning ? "rgba(255, 255, 255, 0.03)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                    {isDone ? (
                      <CheckCircle2 style={{ width: "13px", height: "13px", color: "#10B981", flexShrink: 0 }} />
                    ) : isRunning ? (
                      <RefreshCw
                        className="animate-spin"
                        style={{ width: "13px", height: "13px", color: conf.accentColor, flexShrink: 0 }}
                      />
                    ) : (
                      <Clock style={{ width: "13px", height: "13px", color: "var(--text-ghost)", flexShrink: 0 }} />
                    )}
                    <span
                      style={{
                        fontWeight: isRunning ? 600 : 500,
                        color: isRunning ? conf.accentColor : isDone ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      {conf.name}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      — {conf.shortDesc}
                    </span>
                  </div>

                  {/* Researcher tasks details */}
                  {step.step === "researcher" && step.tasks && step.tasks.length > 0 && (
                    <div
                      style={{
                        marginLeft: "21px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {step.tasks.map((t, tIdx) => (
                        <div key={t.id || tIdx} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span>↳</span>
                          <span style={{ fontStyle: "italic" }}>&ldquo;{t.query}&rdquo;</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Decision Analyzer / Action Proposer results */}
                  {step.step === "action_proposer" && step.output && (
                    <div
                      style={{
                        marginLeft: "21px",
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      ↳ Formulated {step.output.proposals_count || 0} actionable proposal(s)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
