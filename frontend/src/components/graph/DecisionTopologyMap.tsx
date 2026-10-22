"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMyndStore, KnowledgeObject, ConnectedNeighbor } from "@/lib/mynd-store";
import {
  Layers,
  ShieldAlert,
  Target,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";

interface DecisionNodeItem {
  id: string;
  type: "PRIORITY" | "DECISION" | "RISK" | "NEXT_ACTION";
  tier: 1 | 2 | 3;
  numberPrefix?: string;
  badgeLabel: string;
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  glowColor: string;
  title: string;
  supportingCount: number;
  actionLabel?: string;
  actionType?: string;
  evidenceItems?: Array<{ id: string; title: string; snippet?: string; type: string }>;
  x: number;
  y: number;
}

interface PathConnection {
  fromId: string;
  toId: string;
  label?: string;
  isRiskPath?: boolean;
}

export default function DecisionTopologyMap() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const setSelectedObject = useMyndStore((state) => state.setSelectedObject);
  const setActiveContextTab = useMyndStore((state) => state.setActiveContextTab);
  const setContextPanelCollapsed = useMyndStore((state) => state.setContextPanelCollapsed);

  const currentSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node-priority");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Dynamic Responsive Canvas Width
  const [canvasWidth, setCanvasWidth] = useState<number>(860);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setCanvasWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Curated 4-node Decision Topology
  const nodes: DecisionNodeItem[] = useMemo(() => {
    const spaceName = currentSpace?.name || "Career";
    const cx = Math.max(340, Math.round(canvasWidth / 2));
    const spreadX = Math.min(210, Math.max(170, Math.round(canvasWidth * 0.22)));

    return [
      {
        id: "node-priority",
        type: "PRIORITY",
        tier: 1,
        numberPrefix: "1",
        badgeLabel: "TOP GOAL",
        badgeColor: "#10B981",
        badgeBg: "rgba(16, 185, 129, 0.12)",
        borderColor: "rgba(16, 185, 129, 0.35)",
        glowColor: "rgba(16, 185, 129, 0.2)",
        title: "Set goals for your uploaded documents",
        supportingCount: 12,
        actionLabel: "Set goal",
        actionType: "create_goal",
        evidenceItems: [
          { id: "e1", title: "Recommendation Ranking Whitepaper", snippet: "Key insights on signal weighting across content tiers", type: "document" },
          { id: "e2", title: "YouTube System Design Notes", snippet: "High throughput candidate generation pipelines", type: "note" },
          { id: "e3", title: "Career Space Architecture Guide", snippet: "Domain objectives pending alignment", type: "document" },
        ],
        x: cx,
        y: 44,
      },
      {
        id: "node-decision",
        type: "DECISION",
        tier: 2,
        numberPrefix: "2",
        badgeLabel: "DECISION NEEDED",
        badgeColor: "#8B5CF6",
        badgeBg: "rgba(139, 92, 246, 0.14)",
        borderColor: "rgba(139, 92, 246, 0.35)",
        glowColor: "rgba(139, 92, 246, 0.2)",
        title: "Key choices & study topics to review",
        supportingCount: 54,
        actionLabel: "Review",
        actionType: "chat_eval",
        evidenceItems: [
          { id: "e4", title: "Microservices vs Modular Monolith", snippet: "Evaluation trade-offs for indexing latency", type: "note" },
          { id: "e5", title: "Database Query Benchmarks", snippet: "PostgreSQL pgvector vs Qdrant latency benchmarks", type: "document" },
        ],
        x: cx - spreadX,
        y: 147,
      },
      {
        id: "node-risk",
        type: "RISK",
        tier: 2,
        badgeLabel: "POTENTIAL RISK",
        badgeColor: "#F59E0B",
        badgeBg: "rgba(245, 158, 11, 0.15)",
        borderColor: "rgba(245, 158, 11, 0.5)",
        glowColor: "rgba(245, 158, 11, 0.25)",
        title: "Differences or conflicting notes found",
        supportingCount: 8,
        actionLabel: "Check risk",
        actionType: "audit_risk",
        evidenceItems: [
          { id: "e6", title: "Inconsistent Taxonomy Across 6 Documents", snippet: "Terminology mismatch detected between career notes and goals", type: "document" },
          { id: "e7", title: "Conflicting Retrieval Hypotheses", snippet: "Critic agent flagged ambiguous premise in study schedule", type: "reflection" },
        ],
        x: cx + spreadX,
        y: 147,
      },
      {
        id: "node-nextmove",
        type: "NEXT_ACTION",
        tier: 3,
        numberPrefix: "3",
        badgeLabel: "RECOMMENDED NEXT STEP",
        badgeColor: "#6366F1",
        badgeBg: "rgba(99, 102, 241, 0.14)",
        borderColor: "rgba(99, 102, 241, 0.45)",
        glowColor: "rgba(99, 102, 241, 0.25)",
        title: "Create a goal from these documents",
        supportingCount: 4,
        actionLabel: "Set goal",
        actionType: "define_goal",
        evidenceItems: [
          { id: "e8", title: "Core Synthesis Draft", snippet: "Automated synthesis candidate prepared from 12 notes", type: "note" },
        ],
        x: cx,
        y: 250,
      },
    ];
  }, [currentSpace?.name, canvasWidth]);

  // Directed Causal Path Connections
  const connections: PathConnection[] = useMemo(() => [
    { fromId: "node-priority", toId: "node-decision", label: "needs decision" },
    { fromId: "node-priority", toId: "node-risk", label: "watch for risks", isRiskPath: true },
    { fromId: "node-decision", toId: "node-nextmove", label: "leads to next step" },
    { fromId: "node-risk", toId: "node-nextmove", label: "resolves risk", isRiskPath: true },
  ], []);

  // Cubic Bezier SVG Curve Generator from bottom of parent to top of child
  const renderCubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const cardHalfH = 33; // Exactly half of 66px card height
    const startY = y1 + cardHalfH;
    const endY = y2 - cardHalfH;
    const dy = endY - startY;
    const cy1 = startY + dy * 0.48;
    const cy2 = startY + dy * 0.52;
    return `M ${x1} ${startY} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${endY}`;
  };

  // Node selection triggers deep inspector in Right Sidebar
  const handleNodeClick = (node: DecisionNodeItem) => {
    setSelectedNodeId(node.id);

    const neighbors: ConnectedNeighbor[] = connections
      .filter((c) => c.fromId === node.id || c.toId === node.id)
      .map((c) => {
        const otherId = c.fromId === node.id ? c.toId : c.fromId;
        const otherNode = nodes.find((n) => n.id === otherId);
        return {
          id: otherId,
          label: otherNode?.title || "Connected Node",
          category: otherNode?.type.toLowerCase(),
          color: otherNode?.badgeColor,
        };
      });

    const objToSelect: KnowledgeObject = {
      id: node.id,
      title: node.title,
      type: node.badgeLabel,
      category: node.type.toLowerCase(),
      summary: `Decision Node: ${node.title}. Clustered from ${node.supportingCount} supporting knowledge assets.`,
      confidence: "94%",
      keyIdeas: [
        `Category: ${node.badgeLabel}`,
        `Supporting Evidence: ${node.supportingCount} items indexed`,
        node.type === "RISK"
          ? "Agent Critic Warning: Multi-source grounding ambiguity detected."
          : "Action ready for execution in active space.",
      ],
      updated: "Live Second Brain Node",
      connectedNeighbors: neighbors,
      decisionType: node.type,
      evidenceCount: node.supportingCount,
      evidenceItems: node.evidenceItems,
      action: node.actionLabel
        ? { label: node.actionLabel, actionType: node.actionType }
        : undefined,
    };

    setSelectedObject(objToSelect);
    setActiveContextTab("radar");
    setContextPanelCollapsed(false);
  };

  // Node Action Execution
  const handleNodeAction = (node: DecisionNodeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.actionType === "create_goal" || node.actionType === "define_goal") {
      router.push(`/goals?new=true&title=${encodeURIComponent(node.title)}`);
    } else if (node.actionType === "chat_eval") {
      router.push(`/chat?q=${encodeURIComponent(`Evaluate decision options for: "${node.title}". Synthesize supporting evidence from my uploaded documents.`)}`);
    } else if (node.actionType === "audit_risk") {
      router.push(`/chat?q=${encodeURIComponent(`Perform an adversarial audit on: "${node.title}". Where are the exact grounding discrepancies in my notes?`)}`);
    } else {
      handleNodeClick(node);
    }
  };

  return (
    <div
      style={{
        background: "var(--surface, #0f0f17)",
        border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
        borderRadius: "14px",
        padding: "15px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.28)",
        maxWidth: "880px",
        width: "100%",
        margin: "0 auto",
      }}
    >
      {/* 1. Header Bar: Clean, Uncluttered Title & Telemetry */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--text-primary, #ffffff)",
              margin: 0,
              letterSpacing: "-0.015em",
            }}
          >
            Decision map
          </h2>
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-tertiary, rgba(255, 255, 255, 0.45))",
            }}
          >
            &bull; 4 active nodes &bull; 57 grounded assets
          </span>
        </div>

        {/* Subtle space telemetry badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "10.5px",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.6)",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "9999px",
            padding: "2px 9px",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#10B981",
              boxShadow: "0 0 6px #10B981",
            }}
          />
          <span>{currentSpace?.name || "Career"}</span>
        </div>
      </div>

      {/* 2. Main Spatial Canvas Area (Proportional 294px) */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          height: "294px",
          background: "radial-gradient(ellipse at 50% 20%, #16152a 0%, #0a0a10 100%)",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* SVG Connector Paths Layer with Flow Particles */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <defs>
            <linearGradient id="gradient-edge-normal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="gradient-edge-risk" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {connections.map((conn, idx) => {
            const from = nodes.find((n) => n.id === conn.fromId);
            const to = nodes.find((n) => n.id === conn.toId);
            if (!from || !to) return null;

            const isConnectedToHovered =
              hoveredNodeId === from.id || hoveredNodeId === to.id;
            const isConnectedToSelected =
              selectedNodeId === from.id || selectedNodeId === to.id;
            const isHighlighted = isConnectedToHovered || isConnectedToSelected;

            const pathD = renderCubicBezier(from.x, from.y, to.x, to.y);

            return (
              <g key={`path-${conn.fromId}-${conn.toId}-${idx}`}>
                {/* Glow Shadow on Highlight */}
                {isHighlighted && (
                  <path
                    d={pathD}
                    stroke={conn.isRiskPath ? "#F59E0B" : from.badgeColor}
                    strokeWidth="5"
                    strokeOpacity="0.3"
                    fill="none"
                  />
                )}

                {/* Primary Path Curve */}
                <path
                  d={pathD}
                  stroke={
                    isHighlighted
                      ? conn.isRiskPath
                        ? "#F59E0B"
                        : from.badgeColor
                      : conn.isRiskPath
                      ? "rgba(245, 158, 11, 0.3)"
                      : "rgba(255, 255, 255, 0.12)"
                  }
                  strokeWidth={isHighlighted ? "2.2" : "1.5"}
                  strokeDasharray={conn.isRiskPath ? "5,4" : isHighlighted ? "none" : "4,4"}
                  fill="none"
                  style={{ transition: "all 0.2s ease" }}
                />

                {/* Animated Directional Flow Particle */}
                <circle
                  r={isHighlighted ? "3" : "2"}
                  fill={conn.isRiskPath ? "#F59E0B" : from.badgeColor}
                >
                  <animateMotion
                    path={pathD}
                    dur={conn.isRiskPath ? "1.8s" : "2.2s"}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Spatial Decision Nodes */}
        <div style={{ position: "absolute", inset: 0 }}>
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;

            return (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  position: "absolute",
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  transform: "translate(-50%, -50%)",
                  width: "210px",
                  height: "66px",
                  boxSizing: "border-box",
                  background: isSelected
                    ? `linear-gradient(145deg, ${node.badgeBg}, rgba(17, 17, 26, 0.98))`
                    : "rgba(14, 14, 22, 0.95)",
                  border: isSelected
                    ? `2px solid ${node.badgeColor}`
                    : isHovered
                    ? `1.5px solid ${node.badgeColor}`
                    : `1px solid ${node.borderColor}`,
                  boxShadow: isSelected
                    ? `0 0 20px ${node.glowColor}, 0 6px 18px rgba(0, 0, 0, 0.5)`
                    : isHovered
                    ? `0 4px 14px rgba(0, 0, 0, 0.4)`
                    : "0 3px 10px rgba(0, 0, 0, 0.3)",
                  borderRadius: "10px",
                  padding: "7px 11px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  zIndex: isSelected ? 30 : isHovered ? 25 : 10,
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                }}
              >
                {/* Micro-Row 1: Badge on left, Count / Caution on right */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: node.badgeColor,
                        boxShadow: `0 0 5px ${node.badgeColor}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        color: node.badgeColor,
                        textTransform: "uppercase",
                      }}
                    >
                      {node.numberPrefix ? `${node.numberPrefix} - ` : ""}
                      {node.badgeLabel}
                    </span>
                  </div>

                  {node.type === "RISK" ? (
                    <span
                      style={{
                        fontSize: "7.5px",
                        fontWeight: 700,
                        color: "#F59E0B",
                        background: "rgba(245, 158, 11, 0.18)",
                        padding: "1px 4px",
                        borderRadius: "3px",
                      }}
                    >
                      CAUTION
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "8.5px",
                        color: "rgba(255, 255, 255, 0.45)",
                        fontWeight: 500,
                      }}
                    >
                      {node.supportingCount} items
                    </span>
                  )}
                </div>

                {/* Micro-Row 2: Title */}
                <div
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={node.title}
                >
                  {node.title}
                </div>

                {/* Micro-Row 3: Clean 1-Click Action Pill */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingTop: "2px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  {node.actionLabel && (
                    <button
                      onClick={(e) => handleNodeAction(node, e)}
                      style={{
                        background:
                          node.type === "NEXT_ACTION"
                            ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                            : `${node.badgeColor}22`,
                        border: `1px solid ${node.badgeColor}66`,
                        borderRadius: "3px",
                        padding: "1px 6px",
                        fontSize: "8.5px",
                        fontWeight: 600,
                        color: node.type === "NEXT_ACTION" ? "#FFFFFF" : node.badgeColor,
                        cursor: "pointer",
                        boxShadow:
                          node.type === "NEXT_ACTION"
                            ? "0 2px 6px rgba(99, 102, 241, 0.3)"
                            : "none",
                      }}
                    >
                      {node.actionLabel} &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
