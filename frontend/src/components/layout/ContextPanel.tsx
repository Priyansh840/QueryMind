"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMyndStore, KnowledgeObject, ConnectedNeighbor } from "@/lib/mynd-store";
import { queryMindApi, ReflectionItem } from "@/lib/api";
import {
  X,
  Sparkles,
  Zap,
  Network,
  FileText,
  Layers,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
  Scale,
  Compass,
  ArrowRight,
  Database,
  Radio,
} from "lucide-react";

export default function ContextPanel() {
  const router = useRouter();

  // Store state
  const selectedObject = useMyndStore((state) => state.selectedObject);
  const setSelectedObject = useMyndStore((state) => state.setSelectedObject);
  const isContextPanelCollapsed = useMyndStore((state) => state.isContextPanelCollapsed);
  const setContextPanelCollapsed = useMyndStore((state) => state.setContextPanelCollapsed);
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const openAskAi = useMyndStore((state) => state.openAskAi);

  // Local UI state
  const [copied, setCopied] = useState(false);
  const [executingAction, setExecutingAction] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [reflections, setReflections] = useState<ReflectionItem[]>([]);

  // If collapsed and nothing selected, hide completely to grant 100% full-width to the workspace
  const isOpen = !isContextPanelCollapsed || selectedObject !== null;

  // Active space context
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // Fetch telemetry signals if drawer is open in telemetry mode
  useEffect(() => {
    if (!selectedObject && isOpen && activeSpace?.id) {
      queryMindApi
        .getReflections(activeSpace.id)
        .then((res) => setReflections(res.items || []))
        .catch(() => setReflections([]));
    }
  }, [selectedObject, isOpen, activeSpace?.id]);

  if (!isOpen) {
    return null;
  }

  // Copy reference handler
  const handleCopy = () => {
    if (!selectedObject) return;
    const textToCopy = `[${selectedObject.type?.toUpperCase() || "OBJECT"}]: ${selectedObject.title}\n${selectedObject.summary || selectedObject.content || ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close / Deselect handler
  const handleClose = () => {
    setSelectedObject(null);
    setContextPanelCollapsed(true);
  };

  // 1-Click Action Execution
  const handleExecuteAction = () => {
    if (!selectedObject?.action) return;
    setExecutingAction(true);
    setTimeout(() => {
      setExecutingAction(false);
      setActionDone(true);
      setTimeout(() => setActionDone(false), 3000);
    }, 800);
  };

  // Helper for Category styling & icon
  const getCategoryMeta = (obj: KnowledgeObject) => {
    const cat = (obj.category || obj.type || "concept").toLowerCase();
    if (cat.includes("decision") || obj.decisionType) {
      return {
        label: "Decision Node",
        icon: Scale,
        color: "#A78BFA",
        bg: "rgba(167, 139, 250, 0.12)",
        border: "rgba(167, 139, 250, 0.25)",
      };
    }
    if (cat.includes("document") || cat.includes("pdf") || obj.sourceDoc) {
      return {
        label: "Source Document",
        icon: FileText,
        color: "#38BDF8",
        bg: "rgba(56, 189, 248, 0.12)",
        border: "rgba(56, 189, 248, 0.25)",
      };
    }
    if (obj.urgency === "CRITICAL" || cat.includes("risk") || cat.includes("radar")) {
      return {
        label: "Critical Signal",
        icon: ShieldAlert,
        color: "#F87171",
        bg: "rgba(248, 113, 113, 0.12)",
        border: "rgba(248, 113, 113, 0.25)",
      };
    }
    return {
      label: "Knowledge Object",
      icon: Layers,
      color: "#34D399",
      bg: "rgba(52, 211, 153, 0.12)",
      border: "rgba(52, 211, 153, 0.25)",
    };
  };

  return (
    <aside
      className="app-context-panel view-enter"
      style={{
        width: "var(--context-w, 360px)",
        height: "100vh",
        background: "var(--surface-primary, #09090b)",
        borderLeft: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 20,
        overflow: "hidden",
        boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* ===================================================================== */}
      {/* SCENARIO 1: AN OBJECT / NODE IS ACTIVELY SELECTED                     */}
      {/* ===================================================================== */}
      {selectedObject ? (
        <>
          {/* 1. Header Toolbar */}
          {(() => {
            const meta = getCategoryMeta(selectedObject);
            const Icon = meta.icon;
            return (
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--surface-secondary, rgba(18, 18, 22, 0.95))",
                }}
              >
                {/* Category Chip */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 9px",
                    borderRadius: "6px",
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                    color: meta.color,
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  <Icon style={{ width: "13px", height: "13px" }} />
                  <span>{meta.label}</span>
                </div>

                {/* Header Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={handleCopy}
                    title="Copy reference snippet"
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: copied ? "#34D399" : "var(--text-secondary, rgba(255, 255, 255, 0.7))",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {copied ? <Check style={{ width: "12px", height: "12px" }} /> : <Copy style={{ width: "12px", height: "12px" }} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>

                  <button
                    onClick={handleClose}
                    title="Close Inspector (Esc)"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "var(--text-secondary, rgba(255, 255, 255, 0.7))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <X style={{ width: "14px", height: "14px" }} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 2. Scrollable Inspector Body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Entity Title & Status */}
            <div>
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary, #FFFFFF)",
                  lineHeight: "1.35",
                  marginBottom: "8px",
                }}
              >
                {selectedObject.title}
              </h2>

              {/* Status & Urgency Badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {selectedObject.urgency && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: selectedObject.urgency === "CRITICAL" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      border: selectedObject.urgency === "CRITICAL" ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(245, 158, 11, 0.4)",
                      color: selectedObject.urgency === "CRITICAL" ? "#F87171" : "#FBBF24",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedObject.urgency}
                  </span>
                )}

                {selectedObject.badge && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "var(--text-secondary, rgba(255, 255, 255, 0.7))",
                    }}
                  >
                    {selectedObject.badge}
                  </span>
                )}

                {selectedObject.confidence && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      color: "#34D399",
                    }}
                  >
                    {typeof selectedObject.confidence === "number"
                      ? `${Math.round(selectedObject.confidence * 100)}% Confidence`
                      : selectedObject.confidence}
                  </span>
                )}

                {selectedObject.category && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: "rgba(139, 92, 246, 0.1)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                      color: "#A78BFA",
                    }}
                  >
                    {selectedObject.category}
                  </span>
                )}
              </div>
            </div>

            {/* Why It Matters / Strategic Impact Callout */}
            {selectedObject.whyItMatters && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(59, 130, 246, 0.08))",
                  border: "1px solid rgba(167, 139, 250, 0.25)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap style={{ width: "12px", height: "12px", color: "#A78BFA" }} />
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Why It Matters
                  </span>
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-primary, #FFFFFF)", lineHeight: "1.45" }}>
                  {selectedObject.whyItMatters}
                </div>
              </div>
            )}

            {/* Core Content / Executive Summary */}
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "var(--surface-secondary, rgba(255, 255, 255, 0.03))",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.07))",
                fontSize: "12px",
                color: "var(--text-secondary, rgba(255, 255, 255, 0.85))",
                lineHeight: "1.55",
                whiteSpace: "pre-wrap",
              }}
            >
              {selectedObject.summary || selectedObject.content || "No detailed summary available for this item."}
            </div>

            {/* Connected Causal Relationships */}
            {selectedObject.connectedNeighbors && selectedObject.connectedNeighbors.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Network style={{ width: "13px", height: "13px", color: "#38BDF8" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary, rgba(255, 255, 255, 0.5))" }}>
                    Connected Relations ({selectedObject.connectedNeighbors.length})
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedObject.connectedNeighbors.map((neighbor: ConnectedNeighbor, idx: number) => (
                    <div
                      key={neighbor.id || idx}
                      onClick={() => {
                        // Pivot inspector to this neighbor
                        setSelectedObject({
                          id: neighbor.id,
                          title: neighbor.label || "Connected Node",
                          summary: `Connected relation (${neighbor.category || "Related"}) to ${selectedObject.title}`,
                          type: "concept",
                          category: neighbor.category || "connected_node",
                        });
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(56, 189, 248, 0.08)";
                        e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-primary, #FFFFFF)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {neighbor.label || "Connected Node"}
                        </div>
                        <div style={{ fontSize: "10px", color: "#38BDF8", marginTop: "2px" }}>
                          {neighbor.category || "Connected relation"}
                        </div>
                      </div>
                      <ArrowRight style={{ width: "12px", height: "12px", color: "rgba(255, 255, 255, 0.4)", flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence & Supporting Snippets */}
            {selectedObject.evidenceItems && selectedObject.evidenceItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileText style={{ width: "13px", height: "13px", color: "#34D399" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary, rgba(255, 255, 255, 0.5))" }}>
                    Evidence Citations ({selectedObject.evidenceItems.length})
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedObject.evidenceItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "rgba(52, 211, 153, 0.05)",
                        border: "1px solid rgba(52, 211, 153, 0.15)",
                        fontSize: "11px",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#34D399", marginBottom: "3px" }}>
                        {item.title}
                      </div>
                      {item.snippet && (
                        <div style={{ color: "var(--text-secondary, rgba(255, 255, 255, 0.75))", fontStyle: "italic", lineHeight: "1.4" }}>
                          &ldquo;{item.snippet}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Specs Pill Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                paddingTop: "6px",
              }}
            >
              {selectedObject.sourceDoc && (
                <div style={{ padding: "8px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: "9.5px", color: "var(--text-tertiary, rgba(255, 255, 255, 0.4))", textTransform: "uppercase" }}>Source Doc</div>
                  <div style={{ fontSize: "11px", color: "var(--text-primary, #FFFFFF)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedObject.sourceDoc}
                  </div>
                </div>
              )}
              {selectedObject.vectorsStored !== undefined && (
                <div style={{ padding: "8px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: "9.5px", color: "var(--text-tertiary, rgba(255, 255, 255, 0.4))", textTransform: "uppercase" }}>Vectors Stored</div>
                  <div style={{ fontSize: "11px", color: "var(--text-primary, #FFFFFF)", fontWeight: 500 }}>
                    {selectedObject.vectorsStored} embeds
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Action Footer Bar */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
              background: "var(--surface-secondary, rgba(18, 18, 22, 0.95))",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {/* 1-Click Action Button (if present) */}
            {selectedObject.action && (
              <button
                onClick={handleExecuteAction}
                disabled={executingAction || actionDone}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "7px",
                  background: actionDone
                    ? "rgba(16, 185, 129, 0.2)"
                    : "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.2))",
                  border: actionDone ? "1px solid #10B981" : "1px solid rgba(16, 185, 129, 0.4)",
                  color: actionDone ? "#10B981" : "#34D399",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: executingAction || actionDone ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {actionDone ? (
                  <>
                    <Check style={{ width: "13px", height: "13px" }} />
                    <span>Action Executed</span>
                  </>
                ) : (
                  <>
                    <Zap style={{ width: "13px", height: "13px" }} />
                    <span>{executingAction ? "Executing..." : `Execute: ${selectedObject.action.label}`}</span>
                  </>
                )}
              </button>
            )}

            {/* Ask Copilot About This Entity */}
            <button
              onClick={() => openAskAi()}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "7px",
                background: "rgba(139, 92, 246, 0.12)",
                border: "1px solid rgba(139, 92, 246, 0.28)",
                color: "#A78BFA",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Sparkles style={{ width: "13px", height: "13px" }} />
              <span>Ask AI Copilot about this</span>
            </button>
          </div>
        </>
      ) : (
        /* ===================================================================== */
        /* SCENARIO 2: WORKSPACE TELEMETRY / SIGNALS (NO OBJECT SELECTED)        */
        /* ===================================================================== */
        <>
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface-secondary, rgba(18, 18, 22, 0.95))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Radio style={{ width: "14px", height: "14px", color: "var(--accent-primary, #10B981)" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary, #FFFFFF)" }}>
                Workspace Telemetry
              </span>
            </div>

            <button
              onClick={handleClose}
              title="Close Drawer (Esc)"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "var(--text-secondary, rgba(255, 255, 255, 0.7))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: "14px", height: "14px" }} />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Active Space Summary Card */}
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "var(--surface-secondary, rgba(255, 255, 255, 0.03))",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.07))",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary, rgba(255, 255, 255, 0.45))" }}>
                  Active Workspace
                </span>
                <span style={{ fontSize: "10px", color: "#10B981", fontWeight: 600 }}>● Connected</span>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary, #FFFFFF)" }}>
                {activeSpace?.name || "Global Workspace"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary, rgba(255, 255, 255, 0.65))" }}>
                {activeSpace?.desc || "Central intelligence and causal decision memory space."}
              </div>
            </div>

            {/* Radar & Divergence Alerts (if any) */}
            {reflections && reflections.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldAlert style={{ width: "13px", height: "13px", color: "#F59E0B" }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary, rgba(255, 255, 255, 0.5))" }}>
                      Active Signals ({reflections.length})
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/intelligence")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#A78BFA",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <span>View all</span>
                    <ExternalLink style={{ width: "10px", height: "10px" }} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {reflections.slice(0, 3).map((item: ReflectionItem, idx: number) => (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: "9px 11px",
                        borderRadius: "6px",
                        background: "rgba(245, 158, 11, 0.05)",
                        border: "1px solid rgba(245, 158, 11, 0.15)",
                        fontSize: "11.5px",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#FBBF24", marginBottom: "3px" }}>
                        {item.title}
                      </div>
                      <div style={{ color: "var(--text-secondary, rgba(255, 255, 255, 0.75))", fontSize: "11px", lineHeight: "1.4" }}>
                        {item.lesson_learned || item.actionable_guidance || ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guidance Callout */}
            <div
              style={{
                padding: "16px 14px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(59, 130, 246, 0.04))",
                border: "1px dashed rgba(139, 92, 246, 0.25)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "8px",
                marginTop: "auto",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(139, 92, 246, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#A78BFA",
                }}
              >
                <Compass style={{ width: "16px", height: "16px" }} />
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary, #FFFFFF)" }}>
                Context Inspector Ready
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary, rgba(255, 255, 255, 0.6))", lineHeight: "1.45" }}>
                Click any decision node, document, or knowledge object in your workspace to inspect its causal connections and metadata here.
              </div>
            </div>
          </div>

          {/* Quick Jump Footer */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
              background: "var(--surface-secondary, rgba(18, 18, 22, 0.95))",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            <button
              onClick={() => router.push("/topology")}
              style={{
                padding: "8px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "var(--text-primary, #FFFFFF)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <Scale style={{ width: "12px", height: "12px", color: "#A78BFA" }} />
              <span>Topology</span>
            </button>

            <button
              onClick={() => router.push("/vault")}
              style={{
                padding: "8px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "var(--text-primary, #FFFFFF)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <Database style={{ width: "12px", height: "12px", color: "#38BDF8" }} />
              <span>Vault</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
