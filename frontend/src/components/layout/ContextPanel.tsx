"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";
import {
  PanelRightClose,
  PanelRightOpen,
  Target,
  Compass,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  GitBranch,
  Circle,
  Diamond,
  Hexagon,
  Sparkles,
  RefreshCw,
  Scale,
  ArrowUpRight,
  Sliders,
  ShieldCheck,
  Check,
  Search,
} from "lucide-react";

/* ─── Refined Cognitive Design Tokens ─── */
const COGNITIVE_THEME = {
  lavender: "#8B7EC8",
  lavenderHover: "#7C6DBE",
  lavenderSoft: "rgba(139, 126, 200, 0.09)",
  lavenderBorder: "rgba(139, 126, 200, 0.22)",
  lavenderGlow: "rgba(139, 126, 200, 0.16)",
  violet: "#7C5CBF",
  violetSoft: "rgba(124, 92, 191, 0.08)",
  indigo: "#6366F1",
  indigoSoft: "rgba(99, 102, 241, 0.08)",
  indigoBorder: "rgba(99, 102, 241, 0.2)",
  emerald: "#10B981",
  emeraldSoft: "rgba(16, 185, 129, 0.08)",
  emeraldBorder: "rgba(16, 185, 129, 0.2)",
  amber: "#F59E0B",
  amberSoft: "rgba(245, 158, 11, 0.08)",
  amberBorder: "rgba(245, 158, 11, 0.22)",
  rose: "#F43F5E",
  roseSoft: "rgba(244, 63, 94, 0.08)",
  roseBorder: "rgba(244, 63, 94, 0.2)",
  cyan: "#06B6D4",
  cyanSoft: "rgba(6, 182, 212, 0.08)",
  cyanBorder: "rgba(6, 182, 212, 0.2)",
};

/* ─── Section Header with Micro Pill ─── */
function SectionHeader({
  icon,
  title,
  count,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  count?: string | number;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2px",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <span style={{ display: "flex", alignItems: "center", opacity: 0.9 }}>{icon}</span>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {title}
        </span>
        {count !== undefined && (
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: "999px",
              background: "var(--surface-hover)",
              color: "var(--text-tertiary)",
              border: "1px solid var(--border)",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ─── Epistemic Belief Card ─── */
function BeliefCard({
  belief,
  conviction,
  domain,
  onProbe,
}: {
  belief: string;
  conviction: number;
  domain: string;
  onProbe?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "11px 13px",
        borderRadius: "10px",
        background: hovered ? "var(--surface-hover)" : "var(--surface)",
        border: `1px solid ${hovered ? COGNITIVE_THEME.indigoBorder : "var(--border)"}`,
        transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontSize: "9.5px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: COGNITIVE_THEME.indigo,
          }}
        >
          {domain}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--text-tertiary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {conviction}% conviction
          </span>
          <div
            style={{
              width: "36px",
              height: "4px",
              borderRadius: "2px",
              background: "var(--surface-subtle)",
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: `${conviction}%`,
                height: "100%",
                background: COGNITIVE_THEME.indigo,
                borderRadius: "2px",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: "12px",
          lineHeight: "1.48",
          color: "var(--text-secondary)",
          fontStyle: "italic",
        }}
      >
        &ldquo;{belief}&rdquo;
      </div>

      {hovered && onProbe && (
        <button
          type="button"
          onClick={onProbe}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "8px",
            fontSize: "10px",
            fontWeight: 600,
            color: COGNITIVE_THEME.indigo,
            background: COGNITIVE_THEME.indigoSoft,
            border: `1px solid ${COGNITIVE_THEME.indigoBorder}`,
            padding: "3px 8px",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 120ms ease",
          }}
        >
          <span>Examine basis</span>
          <ArrowUpRight style={{ width: "10px", height: "10px" }} />
        </button>
      )}
    </div>
  );
}

/* ─── Dialectic Tension Slider Component ─── */
function DialecticTensionItem({
  labelA,
  labelB,
  ratio,
  summary,
}: {
  labelA: string;
  labelB: string;
  ratio: number; // 0 to 100 representing pull towards B
  summary: string;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: "10px",
        background: "var(--surface)",
        border: `1px solid ${COGNITIVE_THEME.roseBorder}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "8px",
        }}
      >
        <span style={{ color: ratio < 50 ? COGNITIVE_THEME.rose : "var(--text-secondary)" }}>
          {labelA}
        </span>
        <span style={{ fontSize: "9.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
          vs
        </span>
        <span style={{ color: ratio >= 50 ? COGNITIVE_THEME.rose : "var(--text-secondary)" }}>
          {labelB}
        </span>
      </div>

      {/* Tension Balance Bar */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "5px",
          background: "var(--surface-subtle)",
          borderRadius: "999px",
          border: "1px solid var(--border)",
          marginBottom: "8px",
          overflow: "visible",
        }}
      >
        {/* Indicator Pip */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${ratio}%`,
            transform: "translate(-50%, -50%)",
            width: "11px",
            height: "11px",
            borderRadius: "50%",
            background: COGNITIVE_THEME.rose,
            border: "2px solid var(--surface)",
            boxShadow: `0 0 6px ${COGNITIVE_THEME.roseSoft}`,
            transition: "left 300ms ease",
          }}
        />
      </div>

      <div style={{ fontSize: "11.5px", lineHeight: "1.45", color: "var(--text-secondary)" }}>
        {summary}
      </div>
    </div>
  );
}

/* ─── Interactive Thought Evolution Node ─── */
function EvolutionStep({
  period,
  thesis,
  catalyst,
  isCurrent,
  isFirst,
  onSelect,
}: {
  period: string;
  thesis: string;
  catalyst?: string;
  isCurrent?: boolean;
  isFirst?: boolean;
  onSelect?: () => void;
}) {
  const [expanded, setExpanded] = useState(isCurrent);

  return (
    <div style={{ display: "flex", gap: "10px", position: "relative" }}>
      {/* Node column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "18px",
          flexShrink: 0,
        }}
      >
        {!isFirst && (
          <div
            style={{
              width: "1px",
              height: "10px",
              background: isCurrent ? COGNITIVE_THEME.lavender : "var(--border)",
            }}
          />
        )}
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            width: isCurrent ? "12px" : "8px",
            height: isCurrent ? "12px" : "8px",
            borderRadius: "50%",
            background: isCurrent ? COGNITIVE_THEME.lavender : "var(--text-tertiary)",
            border: isCurrent ? `3px solid ${COGNITIVE_THEME.lavenderSoft}` : "none",
            boxShadow: isCurrent ? `0 0 10px ${COGNITIVE_THEME.lavenderGlow}` : "none",
            cursor: "pointer",
            transition: "all 180ms ease",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            width: "1px",
            flex: 1,
            background: "var(--border)",
            minHeight: "14px",
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          paddingBottom: "14px",
          paddingTop: isFirst ? "0" : "1px",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            marginBottom: "3px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: isCurrent ? COGNITIVE_THEME.lavender : "var(--text-tertiary)",
              }}
            >
              {period}
            </span>
            {isCurrent && (
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: COGNITIVE_THEME.lavenderSoft,
                  color: COGNITIVE_THEME.lavender,
                  border: `1px solid ${COGNITIVE_THEME.lavenderBorder}`,
                }}
              >
                Current Model
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            fontSize: "12px",
            lineHeight: "1.45",
            color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
            fontWeight: isCurrent ? 500 : 400,
          }}
        >
          &ldquo;{thesis}&rdquo;
        </div>

        {expanded && catalyst && (
          <div
            style={{
              marginTop: "6px",
              padding: "6px 9px",
              borderRadius: "6px",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
              fontSize: "10.5px",
              color: "var(--text-tertiary)",
              lineHeight: "1.4",
            }}
          >
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Catalyst: </span>
            {catalyst}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: MYND MIND STATE COGNITIVE PANEL
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ContextPanel() {
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const isCollapsed = useMyndStore((state) => state.isContextPanelCollapsed);
  const setIsCollapsed = useMyndStore((state) => state.setContextPanelCollapsed);
  const openAskAi = useMyndStore((state) => state.openAskAi);

  /* Section fold states */
  const [isEvolutionFolded, setIsEvolutionFolded] = useState(false);
  const [isRipplesFolded, setIsRipplesFolded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  /* Interactive Hypothesis Simulator Selection */
  const [activeHypothesisIndex, setActiveHypothesisIndex] = useState(0);

  /* Backend data states */
  const [localGoals, setLocalGoals] = useState<any[]>([]);
  const [localDocs, setLocalDocs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [goalsRes, docsRes] = await Promise.all([
        queryMindApi.getGoals().catch(() => []),
        queryMindApi.listDocuments(activeSpaceId || undefined).catch(() => []),
      ]);
      if (Array.isArray(goalsRes)) setLocalGoals(goalsRes);
      if (Array.isArray(docsRes)) setLocalDocs(docsRes);
    } catch {
      /* silent */
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  }, [activeSpaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentSpace = useMemo(() => {
    return (
      spaces.find(
        (s) =>
          s.id === activeSpaceId ||
          s.slug === activeSpaceId ||
          s.name.toLowerCase() === activeSpaceId?.toLowerCase()
      ) || spaces[0]
    );
  }, [spaces, activeSpaceId]);

  const spaceName = currentSpace?.name || "General";

  /* Goals data */
  const activeGoals = useMemo(() => localGoals.filter((g) => g.status !== "completed"), [localGoals]);
  const primaryGoal = activeGoals[0];

  /* Simulated Hypotheses for the "If This Changes..." Engine */
  const hypothesisPresets = useMemo(() => [
    {
      id: "focus-switch",
      label: "Pivot Focus",
      premise: `Shift priority from ${primaryGoal?.description || "current goal"} to Architectural Rigor & Reliability`,
      ripples: [
        { level: "1st Order", desc: "Refactor core event loop & add idempotency checks across workers" },
        { level: "2nd Order", desc: "Temporary 40% reduction in user-facing feature additions" },
        { level: "3rd Order", desc: "Autonomous synthesis stability reaches 99.8% for enterprise workspaces" },
      ],
    },
    {
      id: "ambient-indexing",
      label: "Ambient Ingestion",
      premise: "Automate knowledge ingestion directly from browser telemetry & commits",
      ripples: [
        { level: "1st Order", desc: "No manual file uploading or note copying required" },
        { level: "2nd Order", desc: "Graph density increases 4x, requiring automated noise filtering" },
        { level: "3rd Order", desc: "MYND anticipates context shifts before manual prompt input" },
      ],
    },
    {
      id: "recovery-priority",
      label: "Cognitive Balance",
      premise: "Prioritize uninterrupted 8-hour sleep & cognitive recovery protocol",
      ripples: [
        { level: "1st Order", desc: "Nighttime notification silence enforced at 22:30" },
        { level: "2nd Order", desc: "Morning synthesis briefs replace late-night drafting sessions" },
        { level: "3rd Order", desc: "Long-term mental clarity score elevates by +28%" },
      ],
    },
  ], [primaryGoal]);

  const activeHypothesis = hypothesisPresets[activeHypothesisIndex] || hypothesisPresets[0];

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem("querymind_sidebar_collapsed", String(collapsed));
    }
  };

  /* ─── COLLAPSED MINIMAL RAIL VIEW ─── */
  if (isCollapsed) {
    return (
      <aside
        style={{
          width: "52px",
          height: "100vh",
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          gap: "14px",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => handleToggleCollapse(false)}
          title="Open Mind State (Model of How You Think)"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: COGNITIVE_THEME.lavenderSoft,
            border: `1px solid ${COGNITIVE_THEME.lavenderBorder}`,
            color: COGNITIVE_THEME.lavender,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = COGNITIVE_THEME.lavenderGlow;
            e.currentTarget.style.borderColor = COGNITIVE_THEME.lavender;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = COGNITIVE_THEME.lavenderSoft;
            e.currentTarget.style.borderColor = COGNITIVE_THEME.lavenderBorder;
          }}
        >
          <PanelRightOpen style={{ width: "16px", height: "16px" }} />
        </button>

        <div style={{ width: "24px", height: "1px", background: "var(--border)" }} />

        {/* Pulsing Cognitive Sync Indicator */}
        <div
          title="Mind State Model: Active Sync"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: COGNITIVE_THEME.lavender,
            boxShadow: `0 0 8px ${COGNITIVE_THEME.lavender}`,
            animation: "mindPulse 2.5s ease-in-out infinite",
          }}
        />

        {/* Rail Dimension Icons */}
        {[
          { icon: <Target style={{ width: "15px", height: "15px" }} />, label: "Goal Anchor", color: COGNITIVE_THEME.lavender },
          { icon: <Lightbulb style={{ width: "15px", height: "15px" }} />, label: "Beliefs", color: COGNITIVE_THEME.indigo },
          { icon: <Compass style={{ width: "15px", height: "15px" }} />, label: "Decisions", color: COGNITIVE_THEME.emerald },
          { icon: <HelpCircle style={{ width: "15px", height: "15px" }} />, label: "Uncertainties", color: COGNITIVE_THEME.amber },
          { icon: <Scale style={{ width: "15px", height: "15px" }} />, label: "Tensions", color: COGNITIVE_THEME.rose },
          { icon: <GitBranch style={{ width: "15px", height: "15px" }} />, label: "Evolution", color: COGNITIVE_THEME.lavender },
          { icon: <Zap style={{ width: "15px", height: "15px" }} />, label: "Ripples", color: COGNITIVE_THEME.cyan },
        ].map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleToggleCollapse(false)}
            title={item.label}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "transparent",
              border: "none",
              color: item.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 150ms ease",
              opacity: 0.75,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.opacity = "1";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.opacity = "0.75";
            }}
          >
            {item.icon}
          </button>
        ))}
      </aside>
    );
  }

  /* ─── FULL REFINED MIND STATE PANEL ─── */
  return (
    <aside
      className="app-context-panel"
      style={{
        width: "var(--context-w, 360px)",
        height: "100vh",
        background: "var(--bg)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 10,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── 1. PANEL HEADER ── */}
      <div
        style={{
          padding: "16px 20px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Luminous Brain Glyph */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "9px",
              background: `linear-gradient(135deg, ${COGNITIVE_THEME.lavenderSoft}, ${COGNITIVE_THEME.violetSoft})`,
              border: `1px solid ${COGNITIVE_THEME.lavenderBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 2px 8px ${COGNITIVE_THEME.lavenderGlow}`,
            }}
          >
            <Brain style={{ width: "16px", height: "16px", color: COGNITIVE_THEME.lavender }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Mind State
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  background: COGNITIVE_THEME.lavenderSoft,
                  color: COGNITIVE_THEME.lavender,
                  border: `1px solid ${COGNITIVE_THEME.lavenderBorder}`,
                }}
              >
                Live Model
              </span>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)", marginTop: "1px" }}>
              Cognitive model of your reasoning
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            onClick={fetchData}
            title="Refresh Cognitive State"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "5px",
              display: "flex",
              alignItems: "center",
              borderRadius: "6px",
              transition: "all 150ms ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--surface-hover)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <RefreshCw
              style={{
                width: "13px",
                height: "13px",
                transform: isSyncing ? "rotate(180deg)" : "none",
                transition: "transform 400ms ease",
              }}
            />
          </button>

          <button
            type="button"
            onClick={() => handleToggleCollapse(true)}
            title="Collapse Mind State"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "5px",
              display: "flex",
              alignItems: "center",
              borderRadius: "6px",
              transition: "all 150ms ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--surface-hover)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <PanelRightClose style={{ width: "15px", height: "15px" }} />
          </button>
        </div>
      </div>

      {/* ── 2. SCROLLABLE COGNITIVE CANVAS ── */}
      <div
        className="mind-state-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "22px",
        }}
      >
        {/* ── A. CURRENTLY THINKING ABOUT (Active Cognitive Vector) ── */}
        <div>
          <SectionHeader
            icon={<Zap style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.lavender }} />}
            title="Currently Thinking About"
          />

          <div
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: `linear-gradient(145deg, ${COGNITIVE_THEME.lavenderSoft}, var(--surface))`,
              border: `1px solid ${COGNITIVE_THEME.lavenderBorder}`,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            {/* Top row metadata */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: COGNITIVE_THEME.lavender,
                    boxShadow: `0 0 6px ${COGNITIVE_THEME.lavender}`,
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: COGNITIVE_THEME.lavender,
                  }}
                >
                  {spaceName} Space Focus
                </span>
              </div>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                }}
              >
                Depth: Deep
              </span>
            </div>

            {/* Core Thought Title */}
            <div
              style={{
                fontSize: "14.5px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
                lineHeight: "1.35",
                marginBottom: "8px",
              }}
            >
              {primaryGoal?.description || `Synthesizing architectural knowledge in ${spaceName}`}
            </div>

            {/* Inferred rationale */}
            <div
              style={{
                fontSize: "11.5px",
                lineHeight: "1.45",
                color: "var(--text-secondary)",
              }}
            >
              MYND detects heavy activity centered on{" "}
              <strong style={{ color: "var(--text-primary)" }}>{spaceName}</strong>. Your focus is
              converging toward establishing durable foundations before scaling.
            </div>

            {/* Action pill */}
            <div
              style={{
                marginTop: "11px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "9px",
                borderTop: `1px solid ${COGNITIVE_THEME.lavenderSoft}`,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  openAskAi(
                    `Let's explore the active thought premise: "${primaryGoal?.description || spaceName}". What are the key blindspots?`
                  )
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "transparent",
                  border: "none",
                  color: COGNITIVE_THEME.lavender,
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <span>Probe premise with Copilot</span>
                <ArrowRight style={{ width: "11px", height: "11px" }} />
              </button>
            </div>
          </div>
        </div>

        {/* ── B. GOAL (North Star Anchor) ── */}
        <div>
          <SectionHeader
            icon={<Target style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.lavender }} />}
            title="Strategic Goal Anchor"
            count={activeGoals.length}
          />
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <div
                style={{
                  marginTop: "3px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: `2px solid ${COGNITIVE_THEME.lavender}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "12.5px",
                    lineHeight: "1.45",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                  }}
                >
                  {primaryGoal?.description || `Mastery and structured synthesis of ${spaceName}`}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                  Anchor Status: Aligned with current decision pathways
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── C. INFERRED BELIEFS (Mental Models) ── */}
        <div>
          <SectionHeader
            icon={<Lightbulb style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.indigo }} />}
            title="Inferred Beliefs"
            count="3"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <BeliefCard
              domain="Architecture"
              conviction={94}
              belief="A second brain must model the user's reasoning and decisions, not simply act as an archive of text."
              onProbe={() =>
                openAskAi("Examine my belief: Why must a second brain model decisions rather than just act as a document store?")
              }
            />
            <BeliefCard
              domain="Execution"
              conviction={82}
              belief="Clarity of thought precedes velocity of output; unresolved tensions compound over time."
              onProbe={() =>
                openAskAi("Analyze how unresolved cognitive tensions are currently impacting my decision velocity.")
              }
            />
          </div>
        </div>

        {/* ── D. ACTIVE DECISIONS (Branching Forks) ── */}
        <div>
          <SectionHeader
            icon={<Compass style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.emerald }} />}
            title="Active Decisions"
            count="2"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Decision 1 */}
            <div
              style={{
                padding: "11px 13px",
                borderRadius: "10px",
                background: COGNITIVE_THEME.emeraldSoft,
                border: `1px solid ${COGNITIVE_THEME.emeraldBorder}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "5px",
                }}
              >
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: COGNITIVE_THEME.emerald,
                  }}
                >
                  Decision Fork #1
                </span>
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: COGNITIVE_THEME.emerald,
                  }}
                >
                  Weighing Options
                </span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "1.45",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "4px",
                }}
              >
                Deep Cognitive Second-Brain vs. Standard Notion/Note App
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                Favoring deep personal cognitive modeling over generic multi-user document collaboration.
              </div>
            </div>

            {/* Decision 2 */}
            <div
              style={{
                padding: "11px 13px",
                borderRadius: "10px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "5px",
                }}
              >
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Decision Fork #2
                </span>
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "var(--surface-hover)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Committed
                </span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "1.45",
                  color: "var(--text-primary)",
                }}
              >
                Pure Light-Mode Minimalist Aesthetic with Lavender Accent
              </div>
            </div>
          </div>
        </div>

        {/* ── E. UNCERTAINTIES & BLINDSPOTS ── */}
        <div>
          <SectionHeader
            icon={<HelpCircle style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.amber }} />}
            title="Uncertainties & Inquiries"
            count="2"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                padding: "11px 13px",
                borderRadius: "10px",
                background: "var(--surface)",
                border: `1.5px dashed ${COGNITIVE_THEME.amberBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "1.45",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                  marginBottom: "4px",
                }}
              >
                How much ambient indexing should happen without active user intervention?
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "6px",
                }}
              >
                <span style={{ fontSize: "10.5px", color: COGNITIVE_THEME.amber, fontWeight: 600 }}>
                  High Strategic Leverage
                </span>
                <button
                  type="button"
                  onClick={() =>
                    openAskAi(
                      "Explore the trade-offs of autonomous ambient knowledge indexing versus explicit user confirmation in MYND."
                    )
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "10.5px",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  Explore with AI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── F. TENSIONS (Cognitive Dialectics) ── */}
        <div>
          <SectionHeader
            icon={<Scale style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.rose }} />}
            title="Cognitive Tensions"
            count="1"
          />
          <DialecticTensionItem
            labelA="Speed of Prototyping"
            labelB="Architectural Depth"
            ratio={68}
            summary="You want rapid experimental velocity, but your architectural beliefs require strict consistency and relational integrity."
          />
        </div>

        <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />

        {/* ── G. THOUGHT EVOLUTION (Temporal Shifts) ── */}
        <div>
          <div
            onClick={() => setIsEvolutionFolded(!isEvolutionFolded)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              marginBottom: "10px",
            }}
          >
            <SectionHeader
              icon={<GitBranch style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.lavender }} />}
              title="Thought Evolution"
              count="5 pivots"
            />
            {isEvolutionFolded ? (
              <ChevronDown style={{ width: "13px", height: "13px", color: "var(--text-tertiary)" }} />
            ) : (
              <ChevronUp style={{ width: "13px", height: "13px", color: "var(--text-tertiary)" }} />
            )}
          </div>

          {!isEvolutionFolded && (
            <div
              style={{
                padding: "14px 14px 4px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <EvolutionStep
                period="Jan"
                thesis="I want to build an AI productivity assistant"
                catalyst="Realized generic assistants are reactive and forget who the user is."
                isFirst
              />
              <EvolutionStep
                period="Feb"
                thesis="RAG and vector search alone aren't enough"
                catalyst="Standard RAG returns facts, but has no concept of what decisions matter."
              />
              <EvolutionStep
                period="Mar"
                thesis="Persistent cognitive memory is required"
                catalyst="Needed a system that preserves context across weeks and months."
              />
              <EvolutionStep
                period="Apr"
                thesis="MYND should understand contextual relationships"
                catalyst="Shifted from flat document storage to a multi-space knowledge topology."
              />
              <EvolutionStep
                period="Now"
                thesis="MYND must model decisions and consequences, not just data."
                catalyst="Current active thesis: A true second brain helps the user think clearly."
                isCurrent
              />
            </div>
          )}
        </div>

        {/* ── H. IF THIS CHANGES... (Interactive Ripple Simulator) ── */}
        <div>
          <div
            onClick={() => setIsRipplesFolded(!isRipplesFolded)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              marginBottom: "10px",
            }}
          >
            <SectionHeader
              icon={<Zap style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.cyan }} />}
              title="If This Changes..."
              count="Interactive"
            />
            {isRipplesFolded ? (
              <ChevronDown style={{ width: "13px", height: "13px", color: "var(--text-tertiary)" }} />
            ) : (
              <ChevronUp style={{ width: "13px", height: "13px", color: "var(--text-tertiary)" }} />
            )}
          </div>

          {!isRipplesFolded && (
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                background: `linear-gradient(145deg, ${COGNITIVE_THEME.cyanSoft}, var(--surface))`,
                border: `1px solid ${COGNITIVE_THEME.cyanBorder}`,
              }}
            >
              {/* Hypothesis Selector Pills */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  paddingBottom: "8px",
                  marginBottom: "10px",
                }}
              >
                {hypothesisPresets.map((hypo, idx) => {
                  const isSelected = idx === activeHypothesisIndex;
                  return (
                    <button
                      key={hypo.id}
                      type="button"
                      onClick={() => setActiveHypothesisIndex(idx)}
                      style={{
                        padding: "4px 9px",
                        borderRadius: "6px",
                        fontSize: "10.5px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        border: isSelected
                          ? `1px solid ${COGNITIVE_THEME.cyan}`
                          : "1px solid var(--border)",
                        background: isSelected
                          ? COGNITIVE_THEME.cyanSoft
                          : "var(--surface)",
                        color: isSelected
                          ? COGNITIVE_THEME.cyan
                          : "var(--text-secondary)",
                        transition: "all 120ms ease",
                      }}
                    >
                      {hypo.label}
                    </button>
                  );
                })}
              </div>

              {/* Inquired Premise */}
              <div
                style={{
                  fontSize: "11.5px",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  marginBottom: "10px",
                  lineHeight: "1.4",
                }}
              >
                Hypothesis: {activeHypothesis.premise}
              </div>

              {/* Cascading Ripples */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeHypothesis.ripples.map((rip, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "11px",
                      lineHeight: "1.4",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: "4px",
                        background: "var(--surface)",
                        color: COGNITIVE_THEME.cyan,
                        border: `1px solid ${COGNITIVE_THEME.cyanBorder}`,
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      {rip.level}
                    </span>
                    <span>{rip.desc}</span>
                  </div>
                ))}
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={() =>
                  openAskAi(
                    `Simulate consequence chain in MYND: What happens if I make this change: "${activeHypothesis.premise}"? Detail 1st, 2nd, and 3rd order impacts.`
                  )
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginTop: "12px",
                  width: "100%",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${COGNITIVE_THEME.cyanBorder}`,
                  background: "var(--surface)",
                  color: COGNITIVE_THEME.cyan,
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = COGNITIVE_THEME.cyanSoft;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "var(--surface)";
                }}
              >
                <span>Simulate Full Ripple with Copilot</span>
                <ArrowRight style={{ width: "12px", height: "12px" }} />
              </button>
            </div>
          )}
        </div>

        <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />

        {/* ── I. MYND UNDERSTANDS (Cognitive State Topology) ── */}
        <div>
          <SectionHeader
            icon={<Hexagon style={{ width: "11px", height: "11px", color: COGNITIVE_THEME.lavender }} />}
            title="MYND Understands"
          />

          <div
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Top Stat Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Coherence</div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: COGNITIVE_THEME.lavender,
                    marginTop: "2px",
                  }}
                >
                  94.2%
                </div>
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Stability</div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: COGNITIVE_THEME.emerald,
                    marginTop: "2px",
                  }}
                >
                  High
                </div>
              </div>
            </div>

            {/* Counts Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "Connected Thoughts", count: localDocs.length + localGoals.length + 18, color: COGNITIVE_THEME.lavender },
                { label: "Active Decision Forks", count: Math.max(2, activeGoals.length), color: COGNITIVE_THEME.emerald },
                { label: "Unresolved Uncertainties", count: 2, color: COGNITIVE_THEME.amber },
                { label: "Evolving Inferred Beliefs", count: 3, color: COGNITIVE_THEME.indigo },
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    padding: "3px 0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: row.color,
                      }}
                    />
                    <span>{row.label}</span>
                  </div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Styles for Scrollbar & Pulse Animation ── */}
      <style>{`
        @keyframes mindPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
        .mind-state-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .mind-state-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .mind-state-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }
        .mind-state-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }
      `}</style>
    </aside>
  );
}
