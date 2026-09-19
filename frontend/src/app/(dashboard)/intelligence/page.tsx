"use client";

import React, { useState } from "react";
import { useMyndStore } from "@/lib/mynd-store";

export default function IntelligencePage() {
  const [filter, setFilter] = useState("all");
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const selectSpace = useMyndStore((state) => state.selectSpace);

  const activities = [
    {
      id: "act-1",
      time: "2h ago",
      color: "#FFFFFF",
      bg: "var(--surface-hover)",
      title: "Resume 2026 updated",
      desc: "PDF document was updated with Redis streaming metrics",
      space: "Career",
      action: () =>
        openObjectModal({
          id: "obj-car-1",
          title: "Resume 2026 Final Draft",
          type: "Document",
          version: "v2.4",
          updated: "2h ago",
          summary: "Updated with Staff AI metrics",
        }),
    },
    {
      id: "act-2",
      time: "3h ago",
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.15)",
      title: "New connection created: Resume ↔ Projects",
      desc: "2 knowledge nodes were autonomously linked (98% match)",
      space: "Career",
      action: () => selectSpace("career"),
    },
    {
      id: "act-3",
      time: "5h ago",
      color: "#FFFFFF",
      bg: "var(--surface-hover)",
      title: "System Design Notes added",
      desc: "New notes added to System Design section",
      space: "Research",
      action: () => selectSpace("research"),
    },
    {
      id: "act-4",
      time: "Yesterday",
      color: "#FFFFFF",
      bg: "var(--surface-hover)",
      title: "Kalyra Engine commit pushed (7 commits)",
      desc: "Transcoding pipelines merged into master",
      space: "Career",
      action: () => selectSpace("career"),
    },
    {
      id: "act-5",
      time: "2 days ago",
      color: "#EF4444",
      bg: "rgba(239, 68, 68, 0.15)",
      title: "Google Interview Prep – Review scheduled",
      desc: "Tomorrow at 10:00 AM",
      space: "Career",
      action: () => selectSpace("career"),
    },
  ];

  return (
    <div className="intelligence-page stagger" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "var(--t-display)", fontWeight: "var(--w-bold)", letterSpacing: "-0.02em" }}>
            Intelligence & Activity
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
            Autonomous connections, memory updates, and event stream across your spaces.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          {["all", "career", "research", "personal"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="kbd"
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: "1px solid var(--border)",
                background: filter === f ? "var(--accent-soft)" : "var(--surface)",
                color: filter === f ? "var(--accent)" : "var(--text-secondary)",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {activities
          .filter((a) => filter === "all" || a.space.toLowerCase() === filter)
          .map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 120ms ease",
                boxShadow: "var(--shadow-xs)",
              }}
              onClick={item.action}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: item.bg,
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span className="space-dot" style={{ background: item.color }} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {item.desc}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="kbd" style={{ fontSize: "11px" }}>
                  {item.space}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{item.time}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
