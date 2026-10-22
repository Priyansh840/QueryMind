"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMyndStore, KnowledgeObject, ConnectedNeighbor } from "@/lib/mynd-store";
import {
  Target,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  BookOpen,
  FileText,
  Network,
  Layers,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  GitBranch,
} from "lucide-react";

interface DecisionNodeItem {
  id: string;
  type: "PRIORITY" | "DECISION" | "RISK" | "NEXT_ACTION" | "DOCUMENT" | "TOPIC";
  tier: 1 | 2 | 3;
  numberPrefix?: string;
  badgeLabel: string;
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  title: string;
  subtitle?: string;
  supportingCount: number;
  sourceDocName?: string;
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
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const setSelectedObject = useMyndStore((state) => state.setSelectedObject);
  const setActiveContextTab = useMyndStore((state) => state.setActiveContextTab);
  const setContextPanelCollapsed = useMyndStore((state) => state.setContextPanelCollapsed);

  const currentSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  const [viewMode, setViewMode] = useState<"flow" | "documents">("flow");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-priority");
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

  // Deduplicate and extract clean document names from store
  const availableDocs = useMemo(() => {
    const list: string[] = [];
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      uploadedDocuments.forEach((doc) => {
        const title = doc.title || (doc as any).name || (doc as any).filename || "";
        if (title && !list.includes(title)) list.push(title);
      });
    }
    // Check space knowledge objects as fallback
    if (list.length === 0 && currentSpace?.sections?.knowledge) {
      currentSpace.sections.knowledge.forEach((obj) => {
        if (obj.title && !list.includes(obj.title)) list.push(obj.title);
      });
    }
    return list;
  }, [uploadedDocuments, currentSpace]);

  const doc1 = availableDocs[0] || "GATE-2023.pdf";
  const doc2 = availableDocs[1] || "GATE-DA-2025-Master-Question-Paper.pdf";
  const hasUploadedDocs = availableDocs.length > 0;

  // Curated 3-tier Decision Flow Nodes
  const flowNodes: DecisionNodeItem[] = useMemo(() => {
    const cx = Math.max(360, Math.round(canvasWidth / 2));
    const spreadX = Math.min(230, Math.max(180, Math.round(canvasWidth * 0.24)));

    return [
      {
        id: "node-priority",
        type: "PRIORITY",
        tier: 1,
        numberPrefix: "1",
        badgeLabel: "CORE GOAL",
        badgeColor: "#10B981",
        badgeBg: "rgba(16, 185, 129, 0.12)",
        borderColor: "rgba(16, 185, 129, 0.35)",
        title: hasUploadedDocs
          ? `Master topics & questions from ${doc1.replace(/\.[^/.]+$/, "")}`
          : "Master core topics across uploaded documents",
        subtitle: hasUploadedDocs ? `Grounded in ${availableDocs.length} uploaded document(s)` : "Key learning objectives for this workspace",
        supportingCount: hasUploadedDocs ? availableDocs.length * 12 : 16,
        sourceDocName: doc1,
        actionLabel: "View Goal",
        actionType: "create_goal",
        evidenceItems: [
          { id: "e1", title: doc1, snippet: "Core syllabus questions, high-weightage topics and past exam patterns.", type: "document" },
          ...(doc2 ? [{ id: "e2", title: doc2, snippet: "Updated question paper benchmarks and question types.", type: "document" }] : []),
        ],
        x: cx,
        y: 48,
      },
      {
        id: "node-decision",
        type: "DECISION",
        tier: 2,
        numberPrefix: "2",
        badgeLabel: "TOPICS TO REVIEW",
        badgeColor: "#8B5CF6",
        badgeBg: "rgba(139, 92, 246, 0.12)",
        borderColor: "rgba(139, 92, 246, 0.35)",
        title: "Key concepts & high-weightage question topics",
        subtitle: "Formulas, problem solving and conceptual questions",
        supportingCount: 42,
        sourceDocName: doc1,
        actionLabel: "Explore Notes",
        actionType: "chat_eval",
        evidenceItems: [
          { id: "e3", title: "Engineering Mathematics & Probability", snippet: "Key probability distributions, matrices, and calculus questions.", type: "note" },
          { id: "e4", title: "Algorithms & Programming", snippet: "Data structures, search methods, and complexity questions.", type: "document" },
        ],
        x: cx - spreadX,
        y: 172,
      },
      {
        id: "node-risk",
        type: "RISK",
        tier: 2,
        badgeLabel: "POINTS TO NOTE",
        badgeColor: "#F59E0B",
        badgeBg: "rgba(245, 158, 11, 0.12)",
        borderColor: "rgba(245, 158, 11, 0.4)",
        title: "Syllabus differences & question paper changes",
        subtitle: "Check differences in marking scheme and paper format",
        supportingCount: 8,
        sourceDocName: doc2 || doc1,
        actionLabel: "Check Notes",
        actionType: "audit_risk",
        evidenceItems: [
          { id: "e5", title: `Changes between ${doc1} & ${doc2}`, snippet: "Marking scheme updates, negative marking rules, and section distributions.", type: "document" },
          { id: "e6", title: "Important Exam Rules", snippet: "Numerical answer type format vs multiple choice questions.", type: "note" },
        ],
        x: cx + spreadX,
        y: 172,
      },
      {
        id: "node-nextmove",
        type: "NEXT_ACTION",
        tier: 3,
        numberPrefix: "3",
        badgeLabel: "RECOMMENDED NEXT STEP",
        badgeColor: "#6366F1",
        badgeBg: "rgba(99, 102, 241, 0.12)",
        borderColor: "rgba(99, 102, 241, 0.4)",
        title: "Create study schedule & practice question bank",
        subtitle: "Generate milestone plan with targeted practice sets",
        supportingCount: 6,
        sourceDocName: doc1,
        actionLabel: "Start Plan",
        actionType: "define_goal",
        evidenceItems: [
          { id: "e7", title: "Practice Milestone 1: Core Fundamentals", snippet: "Review all high-frequency topics from previous year papers.", type: "goal" },
          { id: "e8", title: "Practice Milestone 2: Mock Tests", snippet: "Timed questions with accuracy and speed tracking.", type: "goal" },
        ],
        x: cx,
        y: 296,
      },
    ];
  }, [hasUploadedDocs, doc1, doc2, availableDocs, canvasWidth]);

  // Document Connection Network Nodes
  const documentNodes: DecisionNodeItem[] = useMemo(() => {
    const cx = Math.max(360, Math.round(canvasWidth / 2));
    const spreadX = Math.min(240, Math.max(180, Math.round(canvasWidth * 0.25)));

    return [
      {
        id: "doc-node-1",
        type: "DOCUMENT",
        tier: 1,
        badgeLabel: "SOURCE DOCUMENT",
        badgeColor: "#3B82F6",
        badgeBg: "rgba(59, 130, 246, 0.12)",
        borderColor: "rgba(59, 130, 246, 0.35)",
        title: doc1,
        subtitle: "Uploaded question paper & study reference",
        supportingCount: 32,
        sourceDocName: doc1,
        actionLabel: "Open PDF",
        actionType: "open_doc",
        evidenceItems: [{ id: "d1", title: doc1, snippet: "Master question paper with 65 questions indexed.", type: "document" }],
        x: cx - spreadX,
        y: 80,
      },
      {
        id: "doc-node-2",
        type: "DOCUMENT",
        tier: 1,
        badgeLabel: "SOURCE DOCUMENT",
        badgeColor: "#06B6D4",
        badgeBg: "rgba(6, 182, 212, 0.12)",
        borderColor: "rgba(6, 182, 212, 0.35)",
        title: doc2,
        subtitle: "Master paper with updated questions & syllabus",
        supportingCount: 34,
        sourceDocName: doc2,
        actionLabel: "Open PDF",
        actionType: "open_doc",
        evidenceItems: [{ id: "d2", title: doc2, snippet: "Complete questions and topics indexed.", type: "document" }],
        x: cx + spreadX,
        y: 80,
      },
      {
        id: "doc-topic-1",
        type: "TOPIC",
        tier: 2,
        badgeLabel: "EXTRACTED TOPIC",
        badgeColor: "#8B5CF6",
        badgeBg: "rgba(139, 92, 246, 0.12)",
        borderColor: "rgba(139, 92, 246, 0.35)",
        title: "Mathematics, Probability & Calculus",
        subtitle: "Key questions common to both papers",
        supportingCount: 18,
        actionLabel: "View Notes",
        actionType: "chat_eval",
        x: cx - spreadX * 0.6,
        y: 220,
      },
      {
        id: "doc-topic-2",
        type: "TOPIC",
        tier: 2,
        badgeLabel: "EXTRACTED TOPIC",
        badgeColor: "#10B981",
        badgeBg: "rgba(16, 185, 129, 0.12)",
        borderColor: "rgba(16, 185, 129, 0.35)",
        title: "Data Science, Algorithms & Programming",
        subtitle: "High weightage problem questions",
        supportingCount: 22,
        actionLabel: "View Notes",
        actionType: "chat_eval",
        x: cx + spreadX * 0.6,
        y: 220,
      },
      {
        id: "doc-goal-target",
        type: "PRIORITY",
        tier: 3,
        badgeLabel: "TARGET OBJECTIVE",
        badgeColor: "#EC4899",
        badgeBg: "rgba(236, 72, 153, 0.12)",
        borderColor: "rgba(236, 72, 153, 0.4)",
        title: "Comprehensive GATE Exam Preparation Plan",
        subtitle: "Unified study goals & revision benchmarks",
        supportingCount: 40,
        actionLabel: "Open Goal",
        actionType: "create_goal",
        x: cx,
        y: 315,
      },
    ];
  }, [doc1, doc2, canvasWidth]);

  // Directed Causal Path Connections
  const flowConnections: PathConnection[] = useMemo(() => [
    { fromId: "node-priority", toId: "node-decision", label: "requires review" },
    { fromId: "node-priority", toId: "node-risk", label: "points to watch", isRiskPath: true },
    { fromId: "node-decision", toId: "node-nextmove", label: "leads to next step" },
    { fromId: "node-risk", toId: "node-nextmove", label: "resolves notes", isRiskPath: true },
  ], []);

  const docConnections: PathConnection[] = useMemo(() => [
    { fromId: "doc-node-1", toId: "doc-topic-1", label: "indexes" },
    { fromId: "doc-node-1", toId: "doc-topic-2", label: "indexes" },
    { fromId: "doc-node-2", toId: "doc-topic-1", label: "indexes" },
    { fromId: "doc-node-2", toId: "doc-topic-2", label: "indexes" },
    { fromId: "doc-topic-1", toId: "doc-goal-target", label: "guides" },
    { fromId: "doc-topic-2", toId: "doc-goal-target", label: "guides" },
  ], []);

  const activeNodes = viewMode === "flow" ? flowNodes : documentNodes;
  const activeConnections = viewMode === "flow" ? flowConnections : docConnections;

  // Selected Node reference
  const selectedNode = activeNodes.find((n) => n.id === selectedNodeId) || activeNodes[0];

  // Static Cubic Bezier SVG Curve Generator from bottom of parent to top of child
  const renderCubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const cardHalfH = 42; // exactly half of 84px card height
    const startY = y1 + cardHalfH;
    const endY = y2 - cardHalfH;
    const dy = endY - startY;
    const cy1 = startY + dy * 0.45;
    const cy2 = startY + dy * 0.55;
    return `M ${x1} ${startY} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${endY}`;
  };

  // Node selection triggers deep inspector
  const handleNodeClick = (node: DecisionNodeItem) => {
    setSelectedNodeId(node.id);

    const neighbors: ConnectedNeighbor[] = activeConnections
      .filter((c) => c.fromId === node.id || c.toId === node.id)
      .map((c) => {
        const otherId = c.fromId === node.id ? c.toId : c.fromId;
        const otherNode = activeNodes.find((n) => n.id === otherId);
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
      summary: `${node.title}. Grounded across ${node.supportingCount} key notes in this workspace.`,
      confidence: "98%",
      keyIdeas: [
        `Category: ${node.badgeLabel}`,
        `Supporting Evidence: ${node.supportingCount} items verified`,
        node.subtitle || "Grounded workspace knowledge point.",
      ],
      updated: "Active Space Node",
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
      router.push(`/chat?q=${encodeURIComponent(`Explain key concepts and questions related to: "${node.title}". Use my uploaded documents.`)}`);
    } else if (node.actionType === "audit_risk") {
      router.push(`/chat?q=${encodeURIComponent(`Compare notes and question differences regarding: "${node.title}". Where are the main variations?`)}`);
    } else if (node.actionType === "open_doc") {
      router.push("/vault");
    } else {
      handleNodeClick(node);
    }
  };

  return (
    <div
      style={{
        background: "var(--surface, #0f1015)",
        border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
        borderRadius: "14px",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        maxWidth: "920px",
        width: "100%",
        margin: "0 auto",
      }}
    >
      {/* 1. Header Bar: Clean, Uncluttered Title, Counts & View Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-primary, #ffffff)",
            }}
          >
            <GitBranch size={16} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary, #ffffff)",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Workspace Knowledge Map
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-tertiary, rgba(255, 255, 255, 0.5))",
                }}
              >
                &bull; {activeNodes.length} key nodes &bull; {hasUploadedDocs ? `${availableDocs.length} grounded document(s)` : "Workspace context"}
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary, rgba(255, 255, 255, 0.6))",
                margin: "2px 0 0 0",
              }}
            >
              Interactive map connecting your uploaded papers, key topics, and action goals.
            </p>
          </div>
        </div>

        {/* View Switcher & Space Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* View mode toggle */}
          <div
            style={{
              display: "inline-flex",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "2px",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setViewMode("flow");
                setSelectedNodeId("node-priority");
              }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                background: viewMode === "flow" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                color: viewMode === "flow" ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
              }}
            >
              Goal & Decision Flow
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("documents");
                setSelectedNodeId("doc-node-1");
              }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                background: viewMode === "documents" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                color: viewMode === "documents" ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
              }}
            >
              Document Network
            </button>
          </div>

          {/* Space indicator */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.7)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "4px 9px",
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
            <span>{currentSpace?.name || "General Space"}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Spatial Canvas Area (370px, Static, No Animation) */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          height: "364px",
          background: "#0c0d12",
          backgroundImage: "radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* Static SVG Connector Paths Layer (Zero Animation) */}
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
          {activeConnections.map((conn, idx) => {
            const from = activeNodes.find((n) => n.id === conn.fromId);
            const to = activeNodes.find((n) => n.id === conn.toId);
            if (!from || !to) return null;

            const isConnectedToHovered =
              hoveredNodeId === from.id || hoveredNodeId === to.id;
            const isConnectedToSelected =
              selectedNodeId === from.id || selectedNodeId === to.id;
            const isHighlighted = isConnectedToHovered || isConnectedToSelected;

            const pathD = renderCubicBezier(from.x, from.y, to.x, to.y);

            return (
              <g key={`path-${conn.fromId}-${conn.toId}-${idx}`}>
                {/* Static Path Curve */}
                <path
                  d={pathD}
                  stroke={
                    isHighlighted
                      ? "#FFFFFF"
                      : conn.isRiskPath
                      ? "rgba(245, 158, 11, 0.35)"
                      : "rgba(255, 255, 255, 0.16)"
                  }
                  strokeWidth={isHighlighted ? "2.2" : "1.5"}
                  strokeDasharray={conn.isRiskPath ? "4,4" : "none"}
                  fill="none"
                />

                {/* Static Terminal Anchor Points (Clean dots) */}
                <circle
                  cx={from.x}
                  cy={from.y + 42}
                  r={isHighlighted ? "3.5" : "2.5"}
                  fill={isHighlighted ? "#FFFFFF" : from.badgeColor}
                />
                <circle
                  cx={to.x}
                  cy={to.y - 42}
                  r={isHighlighted ? "3.5" : "2.5"}
                  fill={isHighlighted ? "#FFFFFF" : to.badgeColor}
                />
              </g>
            );
          })}
        </svg>

        {/* Spatial Decision Nodes (Static cards with ample width & readable text) */}
        <div style={{ position: "absolute", inset: 0 }}>
          {activeNodes.map((node) => {
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
                  width: "275px",
                  height: "84px",
                  boxSizing: "border-box",
                  background: isSelected
                    ? "rgba(22, 23, 32, 0.98)"
                    : isHovered
                    ? "rgba(20, 21, 29, 0.96)"
                    : "rgba(14, 15, 22, 0.94)",
                  border: isSelected
                    ? `1.5px solid ${node.badgeColor}`
                    : isHovered
                    ? "1px solid rgba(255, 255, 255, 0.3)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  zIndex: isSelected ? 30 : isHovered ? 25 : 10,
                  boxShadow: isSelected
                    ? `0 0 0 1px ${node.badgeColor}40, 0 8px 24px rgba(0, 0, 0, 0.6)`
                    : "0 3px 12px rgba(0, 0, 0, 0.35)",
                }}
              >
                {/* Header Row: Category Badge + Items count */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: node.badgeColor,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        color: node.badgeColor,
                        textTransform: "uppercase",
                      }}
                    >
                      {node.numberPrefix ? `${node.numberPrefix} • ` : ""}
                      {node.badgeLabel}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "9.5px",
                      color: "rgba(255, 255, 255, 0.45)",
                      fontWeight: 500,
                    }}
                  >
                    {node.supportingCount} items
                  </span>
                </div>

                {/* Title (Full 2-line title, never truncated mid-word) */}
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    lineHeight: 1.35,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={node.title}
                >
                  {node.title}
                </div>

                {/* Footer Row: Grounded document indicator & Clean action button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "4px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      color: "rgba(255, 255, 255, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      maxWidth: "160px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FileText size={10} />
                    <span>{node.sourceDocName || "Workspace"}</span>
                  </span>

                  {node.actionLabel && (
                    <button
                      type="button"
                      onClick={(e) => handleNodeAction(node, e)}
                      style={{
                        background: isSelected ? node.badgeColor : "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "4px",
                        padding: "2px 7px",
                        fontSize: "9.5px",
                        fontWeight: 600,
                        color: isSelected ? "#000000" : "#FFFFFF",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span>{node.actionLabel}</span>
                      <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Detail Panel for the Selected Node (Static, Clean & Informative) */}
      {selectedNode && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "260px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: `${selectedNode.badgeColor}18`,
                border: `1px solid ${selectedNode.badgeColor}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: selectedNode.badgeColor,
                flexShrink: 0,
              }}
            >
              {selectedNode.type === "PRIORITY" ? (
                <Target size={16} />
              ) : selectedNode.type === "RISK" ? (
                <ShieldAlert size={16} />
              ) : selectedNode.type === "DOCUMENT" ? (
                <FileText size={16} />
              ) : (
                <BookOpen size={16} />
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: selectedNode.badgeColor, textTransform: "uppercase" }}>
                  {selectedNode.badgeLabel}
                </span>
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.3)" }}>&bull;</span>
                <span style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)" }}>
                  {selectedNode.supportingCount} grounded knowledge points
                </span>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginTop: "1px" }}>
                {selectedNode.title}
              </div>
              {selectedNode.subtitle && (
                <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.55)", marginTop: "1px" }}>
                  {selectedNode.subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons for the selected node */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                router.push(
                  `/chat?q=${encodeURIComponent(`Explain this knowledge point: "${selectedNode.title}". Reference my uploaded documents.`)}`
                );
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              <MessageSquare size={12} />
              <span>Ask in Chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                router.push(`/goals?new=true&title=${encodeURIComponent(selectedNode.title)}`);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "var(--text-primary, #ffffff)",
                border: "none",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#000000",
                cursor: "pointer",
              }}
            >
              <Target size={12} />
              <span>Create Goal</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
