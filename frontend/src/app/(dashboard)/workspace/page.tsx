"use client";

import React, { useState } from "react";
import { useMyndStore } from "@/lib/mynd-store";

export default function WorkspacePage() {
  const spaces = useMyndStore((state) => state.spaces);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openSettings = useMyndStore((state) => state.openSettings);
  const setRoute = useMyndStore((state) => state.setRoute);

  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  return (
    <>
      <div className="workspace-top-bar stagger" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1
            className="section-title"
            style={{ fontSize: "var(--t-display)", fontWeight: "var(--w-bold)", letterSpacing: "-0.02em" }}
          >
            Workspace
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            All your knowledge, organized in connected spaces.
          </p>
        </div>
        <div className="workspace-controls" style={{ display: "flex", gap: "12px" }}>
          <div className="view-toggle" style={{ display: "flex", background: "var(--surface-subtle)", padding: "2px", borderRadius: "6px", border: "1px solid var(--border)" }}>
            <button
              className={`view-toggle-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "4px",
                background: viewMode === "cards" ? "var(--surface)" : "transparent",
                color: viewMode === "cards" ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: viewMode === "cards" ? "var(--shadow-xs)" : "none",
              }}
            >
              Cards
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 500,
                borderRadius: "4px",
                background: viewMode === "list" ? "var(--surface)" : "transparent",
                color: viewMode === "list" ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: viewMode === "list" ? "var(--shadow-xs)" : "none",
              }}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Spaces Grid */}
      <div
        className="spaces-grid stagger"
        style={{
          display: "grid",
          gridTemplateColumns: viewMode === "cards" ? "repeat(auto-fill, minmax(260px, 1fr))" : "1fr",
          gap: "16px",
          marginTop: "32px",
        }}
      >
        {spaces.map((s) => (
          <div
            key={s.id}
            className="space-card detailed-space-card"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "20px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-xs)",
              transition: "all 180ms ease",
            }}
            onClick={() => selectSpace(s.id)}
          >
            <div className="space-card-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                className="space-card-icon-circle"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: `${s.color || "var(--accent-purple)"}15`,
                  color: s.color || "var(--accent-purple)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span className="space-dot" style={{ background: s.color || "var(--accent-purple)", width: "10px", height: "10px" }} />
              </div>
              <div>
                <div
                  className="space-card-name"
                  style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}
                >
                  {s.name}
                </div>
                <div
                  className="space-card-count"
                  style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}
                >
                  {s.count} objects
                </div>
              </div>
            </div>
            <div
              className="space-card-desc"
              style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.45", marginTop: "14px", flex: 1 }}
            >
              {s.desc}
            </div>
            <div
              className="space-card-footer"
              style={{ marginTop: "16px", textAlign: "right", fontSize: "11px", color: "var(--text-tertiary)" }}
            >
              {s.updated}
            </div>
          </div>
        ))}

        <div
          className="space-card detailed-space-card"
          onClick={() => openSettings("integrations")}
          style={{
            border: "1px dashed var(--border-strong)",
            background: "transparent",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            minHeight: "140px",
            cursor: "pointer",
            opacity: 0.8,
            transition: "all 180ms ease",
          }}
        >
          <div
            style={{
              background: "var(--surface-hover)",
              color: "var(--text-secondary)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Add new space
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="activity-section stagger" style={{ marginTop: "40px" }}>
        <div className="section-label-row" style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="section-title-text" style={{ fontSize: "16px", fontWeight: 700 }}>
            Recent Activity
          </span>
          <span
            className="nav-group-add"
            style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)", cursor: "pointer" }}
            onClick={() => setRoute("intelligence")}
          >
            View all
          </span>
        </div>
        <div className="vertical-activity-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="space-dot" style={{ background: "var(--accent-purple)" }} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                Resume 2026 updated
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>2h ago · Career</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="space-dot" style={{ background: "#10B981" }} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                New connection created: Resume ↔ Projects
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>3h ago · Career</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="space-dot" style={{ background: "#3B82F6" }} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                Kalyra Engine commit pushed (7 commits)
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>yesterday · Career</span>
          </div>
        </div>
      </div>
    </>
  );
}
