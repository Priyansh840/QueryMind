"use client";

import React, { use } from "react";
import KnowledgeMap from "@/components/graph/KnowledgeMap";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";

export default function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.id;

  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceTab = useMyndStore((state) => state.activeSpaceTab);
  const setSpaceTab = useMyndStore((state) => state.setSpaceTab);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const openAskAi = useMyndStore((state) => state.openAskAi);

  const space = spaces.find((s) => s.id === spaceId) || spaces[0];

  const objects: KnowledgeObject[] = space.sections?.knowledge || [];

  return (
    <>
      {/* Space Header */}
      <div className="space-header-row stagger" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              className="space-dot"
              style={{ background: space.color || "var(--accent-purple)", width: "12px", height: "12px" }}
            />
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>
              {space.status} Space
            </span>
          </div>
          <h1 style={{ fontSize: "var(--t-display)", fontWeight: "var(--w-bold)", letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            {space.name}
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px", maxWidth: "600px", fontSize: "14px" }}>
            {space.desc}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="kbd"
            onClick={() => openAskAi(`${space.name} Space`)}
            style={{ padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
          >
            <span className="alive-dot" /> Ask AI
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-tabs-bar" style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--border)", marginTop: "24px" }}>
        <button
          className={`space-tab-btn ${activeSpaceTab === "overview" ? "active" : ""}`}
          onClick={() => setSpaceTab("overview")}
          style={{
            padding: "10px 0",
            fontSize: "13px",
            fontWeight: activeSpaceTab === "overview" ? 600 : 500,
            color: activeSpaceTab === "overview" ? "var(--text-primary)" : "var(--text-tertiary)",
            borderBottom: activeSpaceTab === "overview" ? "2px solid var(--accent)" : "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          Overview
        </button>
        <button
          className={`space-tab-btn ${activeSpaceTab === "objects" ? "active" : ""}`}
          onClick={() => setSpaceTab("objects")}
          style={{
            padding: "10px 0",
            fontSize: "13px",
            fontWeight: activeSpaceTab === "objects" ? 600 : 500,
            color: activeSpaceTab === "objects" ? "var(--text-primary)" : "var(--text-tertiary)",
            borderBottom: activeSpaceTab === "objects" ? "2px solid var(--accent)" : "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          Objects ({objects.length})
        </button>
        <button
          className={`space-tab-btn ${activeSpaceTab === "graph" ? "active" : ""}`}
          onClick={() => setSpaceTab("graph")}
          style={{
            padding: "10px 0",
            fontSize: "13px",
            fontWeight: activeSpaceTab === "graph" ? 600 : 500,
            color: activeSpaceTab === "graph" ? "var(--text-primary)" : "var(--text-tertiary)",
            borderBottom: activeSpaceTab === "graph" ? "2px solid var(--accent)" : "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          Knowledge Map
        </button>
      </div>

      {/* Tab Contents */}
      {activeSpaceTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", marginTop: "24px" }}>
          {/* Goal & Live Status */}
          {space.goal && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Space Objective</span>
                <span style={{ fontWeight: 600, color: space.color || "var(--accent)" }}>{space.goal.progress}%</span>
              </div>
              <div className="continue-card-progress-bar" style={{ height: "8px", borderRadius: "4px" }}>
                <div
                  className="continue-card-progress-fill"
                  style={{ width: `${space.goal.progress}%`, background: space.color || "var(--accent)" }}
                />
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "10px" }}>
                {space.goal.title}
              </p>
            </div>
          )}

          {/* Objects List */}
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "14px", color: "var(--text-primary)" }}>
              Core Knowledge Objects
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              {objects.map((obj) => (
                <div
                  key={obj.id}
                  className="continue-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => openObjectModal(obj)}
                >
                  <div className="continue-card-top">
                    <div className="continue-card-icon">
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="continue-card-info">
                      <span className="continue-card-title">{obj.title}</span>
                      <span className="continue-card-meta">{obj.type} • {obj.version || "v1.0"}</span>
                    </div>
                  </div>
                  {obj.summary && (
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "10px", lineHeight: "1.4" }}>
                      {obj.summary.slice(0, 100)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSpaceTab === "objects" && (
        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {objects.map((obj) => (
            <div
              key={obj.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={() => openObjectModal(obj)}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{obj.title}</div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                  {obj.type} · Updated {obj.updated} {obj.confidence && `· ${obj.confidence} match`}
                </div>
              </div>
              <button className="kbd" style={{ fontSize: "11px" }}>Inspect</button>
            </div>
          ))}
        </div>
      )}

      {activeSpaceTab === "graph" && (
        <div style={{ marginTop: "24px" }}>
          <KnowledgeMap />
        </div>
      )}
    </>
  );
}
