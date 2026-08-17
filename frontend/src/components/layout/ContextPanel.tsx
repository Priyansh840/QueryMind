"use client";

import React, { useState } from "react";
import { useMyndStore } from "@/lib/mynd-store";

export default function ContextPanel() {
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const openAskAi = useMyndStore((state) => state.openAskAi);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);

  const [activeTab, setActiveTab] = useState<"summary" | "connections" | "notes">("summary");

  const currentSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  return (
    <aside className="app-context-panel">
      {/* Context Header */}
      <div className="context-header">
        <div className="context-header-left">
          <span
            className="context-header-icon"
            style={{ color: currentSpace.color || "var(--accent-purple)" }}
          >
            <span className="space-dot" style={{ background: currentSpace.color || "var(--accent-purple)", width: "10px", height: "10px" }} />
          </span>
          <span className="context-header-title">{currentSpace.name} Space</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="kbd"
            onClick={() => openAskAi(`${currentSpace.name} Space`)}
            title="Ask AI about this space"
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <span className="alive-dot" /> AI
          </button>
        </div>
      </div>

      <div className="context-header-meta">
        {currentSpace.desc}
      </div>

      {/* Tabs */}
      <div className="context-tabs-row">
        <span
          className={`context-tab ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          Summary
        </span>
        <span
          className={`context-tab ${activeTab === "connections" ? "active" : ""}`}
          onClick={() => setActiveTab("connections")}
        >
          Connections
        </span>
        <span
          className={`context-tab ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          Objects
        </span>
      </div>

      {/* Panel Body */}
      <div className="context-panel-body" style={{ padding: "20px var(--s-24)", display: "flex", flexDirection: "column", gap: "18px" }}>
        {activeTab === "summary" && (
          <>
            {/* Live Synthesis Banner */}
            <div style={{ background: "var(--accent-soft)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }}>
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                </svg>
              </span>
              <span style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.45" }}>
                {currentSpace.liveUpdate?.text || "Continuous observation active across all space entities."}
              </span>
            </div>

            {/* Space Goal Progress */}
            {currentSpace.goal && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <span style={{ fontWeight: 600 }}>Space Objective</span>
                  <span>{currentSpace.goal.progress}%</span>
                </div>
                <div className="continue-card-progress-bar" style={{ height: "6px" }}>
                  <div
                    className="continue-card-progress-fill"
                    style={{ width: `${currentSpace.goal.progress}%`, background: currentSpace.color || "var(--accent)" }}
                  />
                </div>
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{currentSpace.goal.title}</span>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span className="nav-group-label" style={{ padding: 0 }}>Suggested Actions</span>
              <button
                className="kbd"
                style={{ justifyContent: "flex-start", padding: "8px 12px", cursor: "pointer", fontSize: "12px" }}
                onClick={() => openAskAi(`Synthesize key insights for ${currentSpace.name}`)}
              >
                ⚡ Synthesize latest notes
              </button>
              <button
                className="kbd"
                style={{ justifyContent: "flex-start", padding: "8px 12px", cursor: "pointer", fontSize: "12px" }}
                onClick={() => openAskAi(`Find cross-space connections with ${currentSpace.name}`)}
              >
                🔍 Detect cross-space overlap
              </button>
            </div>
          </>
        )}

        {activeTab === "connections" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span className="nav-group-label" style={{ padding: 0 }}>Semantic Graph Links</span>
            <div style={{ padding: "10px", borderRadius: "6px", background: "var(--surface-subtle)", border: "1px solid var(--border)", fontSize: "12px" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Resume ↔ Systems Architecture</div>
              <div style={{ color: "var(--text-tertiary)", marginTop: "4px" }}>Strong correlation (98% cosine similarity)</div>
            </div>
            <div style={{ padding: "10px", borderRadius: "6px", background: "var(--surface-subtle)", border: "1px solid var(--border)", fontSize: "12px" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Google Prep ↔ Kalyra Streaming</div>
              <div style={{ color: "var(--text-tertiary)", marginTop: "4px" }}>System design patterns linked (92%)</div>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span className="nav-group-label" style={{ padding: 0 }}>Objects in Space</span>
            {currentSpace.sections?.knowledge?.map((obj) => (
              <div
                key={obj.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
                onClick={() => openObjectModal(obj)}
              >
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{obj.title}</div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>{obj.type} • {obj.updated}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
