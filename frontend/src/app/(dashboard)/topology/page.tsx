"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Network,
  Sparkles,
  Layers,
  ShieldAlert,
  Target,
  ArrowRight,
  Database,
  ExternalLink,
  Zap,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import DecisionTopologyMap from "@/components/graph/DecisionTopologyMap";

export default function TopologyPage() {
  const router = useRouter();
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  const groundedDocsCount = useMemo(() => {
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      if (!activeSpaceId) return uploadedDocuments.length;
      const count = uploadedDocuments.filter((d) => !d.spaceId || d.spaceId === activeSpaceId).length;
      return count > 0 ? count : uploadedDocuments.length;
    }
    return 6;
  }, [uploadedDocuments, activeSpaceId]);

  return (
    <div
      className="w-full stagger"
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        paddingBottom: "60px",
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & SPACE SELECTOR
          ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 50%, var(--surface) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "28px 32px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A78BFA" }}>
                # CAUSAL REASONING &amp; DEPENDENCY TOPOLOGY
              </span>
            </div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Network size={24} style={{ color: "#A78BFA" }} />
              <span>Spatial Decision &amp; Causal Topology Map</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "6px", maxWidth: "700px", fontSize: "13.5px", lineHeight: "1.5" }}>
              Visual causal graph mapping core priorities, architectural evaluation nodes, critic risks, and strategic next actions across your grounded knowledge assets.
            </p>
          </div>

          {/* Quick Actions & Space Domain Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Space:</span>
              <select
                value={activeSpaceId || ""}
                onChange={(e) => selectSpace(e.target.value)}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/intelligence"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "rgba(139, 92, 246, 0.15)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                color: "#C4B5FD",
                fontSize: "12.5px",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 150ms ease",
              }}
            >
              <Sparkles size={13} />
              <span>Multi-Doc Synthesis</span>
            </Link>

            <Link
              href="/vault"
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontSize: "12.5px",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 150ms ease",
              }}
            >
              <Database size={13} style={{ color: "#38BDF8" }} />
              <span>Vault</span>
            </Link>
          </div>
        </div>

        {/* 4 Diagnostic KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Grounded Space Assets
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {groundedDocsCount} Documents
            </div>
            <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px" }}>
              Space: {activeSpace?.name || "General"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Decision Graph Nodes
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              4 Active Tiers
            </div>
            <div style={{ fontSize: "11px", color: "#8B5CF6", marginTop: "2px" }}>
              Tier 1 Priority • Next Best Move
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Agent Critic Risk Telemetry
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#F59E0B", marginTop: "4px" }}>
              1 Risk Signal
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
              Cross-pollution &amp; grounding audit
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Causal Engine
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              Qdrant + Graph
            </div>
            <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10B981" }} />
              <span>Live Synchronized</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. INTERACTIVE DECISION TOPOLOGY CANVAS
          ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: "16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, #8B5CF6 0%, #10B981 50%, #6366F1 100%)",
          }}
        />

        {/* Command Deck Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "2px 8px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10B981",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10B981" }} />
              Live Causal Graph
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>&bull;</span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Space: <strong style={{ color: "var(--text-primary)" }}>{activeSpace?.name || "Workspace"}</strong>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
              Click any node to inspect causal evidence in Context Inspector
            </span>
          </div>
        </div>

        {/* Decision Topology Canvas */}
        <div style={{ padding: "20px 24px 28px 24px" }}>
          <DecisionTopologyMap />

          {/* Bottom Causal Telemetry Action Bar */}
          <div
            style={{
              marginTop: "20px",
              padding: "14px 20px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
              <span style={{ color: "#F59E0B", display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                <ShieldAlert size={16} />
                <span>Agent Critic Telemetry:</span>
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                Grounding mismatch identified between active knowledge documents in {activeSpace?.name || "Workspace"}.
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link
                href="/intelligence"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 15px",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#EF4444",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 150ms ease",
                }}
              >
                <Zap size={13} />
                <span>Audit Risk in Cross-Synthesis</span>
              </Link>

              <Link
                href="/goals"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 15px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#10B981",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 150ms ease",
                }}
              >
                <ArrowRight size={13} />
                <span>Formulate Roadmap</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
