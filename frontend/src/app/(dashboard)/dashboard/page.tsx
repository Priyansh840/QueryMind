"use client";

import React from "react";
import Link from "next/link";
import KnowledgeMap from "@/components/graph/KnowledgeMap";
import { useMyndStore } from "@/lib/mynd-store";
import { Upload, FileText, Sparkles, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const userProfile = useMyndStore((state) => state.userProfile);
  const isFocusMode = useMyndStore((state) => state.isFocusMode);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const recentObjects = useMyndStore((state) => state.recentObjects);
  const activityFeed = useMyndStore((state) => state.activityFeed);
  const setRoute = useMyndStore((state) => state.setRoute);

  return (
    <>
      {/* 1. Greeting Hero */}
      <div className="greeting-hero-container stagger">
        <div className="greeting-text-block">
          <div className="greeting-time-row">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>Welcome, {userProfile.name}</span>
          </div>
          <h1 className="greeting-headline">You&apos;re in flow</h1>
          <div
            className="greeting-subtitle"
            onClick={() => selectSpace("general")}
          >
            {recentObjects.length} active knowledge objects indexed →
          </div>
        </div>

        <button
          className="focus-mode-btn"
          onClick={toggleFocusMode}
          style={isFocusMode ? { background: "var(--accent-soft)", borderColor: "var(--accent)" } : undefined}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          <span>{isFocusMode ? "Exit Focus" : "Focus Mode"}</span>
        </button>
      </div>

      {/* 2. Continue Section */}
      <div className="continue-section stagger">
        <div className="section-label-row">
          <span className="section-title-text">Continue where you left off</span>
          {recentObjects.length > 0 && (
            <Link
              href="/vault"
              style={{ fontSize: "var(--t-caption)", fontWeight: 600, color: "var(--accent)" }}
            >
              Vault ({recentObjects.length})
            </Link>
          )}
        </div>

        <div className="continue-cards-grid">
          {recentObjects.length === 0 ? (
            <Link
              href="/vault"
              className="continue-card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px 20px",
                border: "1px dashed var(--border-strong)",
                background: "var(--surface)",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--surface-subtle)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Upload style={{ width: "16px", height: "16px" }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Upload your first document
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  PDFs, notes, research — start building your knowledge vault
                </div>
              </div>
              <ArrowRight style={{ width: "14px", height: "14px", color: "var(--text-ghost)", marginLeft: "auto" }} />
            </Link>
          ) : (
            recentObjects.slice(0, 3).map((obj) => (
              <div
                key={obj.id}
                className="continue-card"
                onClick={() => openObjectModal(obj)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px 20px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: obj.iconBg || "var(--surface-subtle)",
                    color: obj.iconColor || "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText style={{ width: "16px", height: "16px" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {obj.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                    {obj.type} • {obj.updated || obj.time || "recently"}
                  </div>
                </div>
                {obj.badge && (
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 8px", borderRadius: "var(--r-full)" }}>
                    {obj.badge}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Quick Actions */}
      <div className="stagger" style={{ marginTop: "8px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href="/chat"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "var(--r-lg)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid transparent",
            transition: "all 200ms var(--ease)",
          }}
        >
          <Sparkles style={{ width: "14px", height: "14px" }} />
          <span>Chat with AI</span>
        </Link>
        <Link
          href="/vault"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "var(--r-lg)",
            background: "var(--surface)",
            color: "var(--text-secondary)",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid var(--border)",
            transition: "all 200ms var(--ease)",
          }}
        >
          <Upload style={{ width: "14px", height: "14px" }} />
          <span>Upload Document</span>
        </Link>
      </div>

      {/* 4. Knowledge Graph Canvas */}
      <div className="stagger" style={{ marginTop: "24px" }}>
        <div className="section-label-row" style={{ marginBottom: "12px" }}>
          <span className="section-title-text">Knowledge Map</span>
        </div>
        <div
          style={{
            height: "320px",
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          <KnowledgeMap />
        </div>
      </div>

      {/* 5. Activity Timeline */}
      <div className="stagger" style={{ marginTop: "28px", paddingBottom: "40px" }}>
        <div className="section-label-row" style={{ marginBottom: "12px" }}>
          <span className="section-title-text">Recent Activity</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {activityFeed.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-tertiary)", padding: "16px 0" }}>
              No activity yet. Upload documents or chat with AI to get started.
            </div>
          ) : (
            activityFeed.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "var(--r-full)",
                    background: "var(--accent)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--text-primary)", flex: 1 }}>{item.title}</span>
                <span style={{ fontSize: "11px", color: "var(--text-ghost)", whiteSpace: "nowrap" }}>
                  {item.time || ""}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
