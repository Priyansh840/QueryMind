"use client";

import React, { useState } from "react";
import { useMyndStore } from "@/lib/mynd-store";

export default function IntelligencePage() {
  const [filter, setFilter] = useState("all");
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const spaces = useMyndStore((state) => state.spaces);
  const activityFeed = useMyndStore((state) => state.activityFeed);

  const filterOptions = ["all", ...spaces.map((s) => s.name.toLowerCase())];

  const filteredActivities = activityFeed.filter(
    (a) => filter === "all" || (a.space && a.space.toLowerCase() === filter)
  );

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
        {spaces.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {filterOptions.map((f) => (
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
        )}
      </div>

      {/* Activity Timeline List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredActivities.length > 0 ? (
          filteredActivities.map((item, idx) => (
            <div
              key={item.id || `act-${idx}`}
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
              onClick={() => {
                const matchedSpace = spaces.find(
                  (s) => s.id === item.space || s.name.toLowerCase() === (item.space || "").toLowerCase()
                );
                if (matchedSpace) {
                  selectSpace(matchedSpace.id);
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: item.bg || "var(--surface-hover)",
                    color: item.color || "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span className="space-dot" style={{ background: item.color || "#FFFFFF" }} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {item.text || "Knowledge synchronization event"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {item.space && (
                  <span className="kbd" style={{ fontSize: "11px" }}>
                    {item.space}
                  </span>
                )}
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{item.time}</span>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px dashed var(--border-strong)",
              color: "var(--text-tertiary)",
            }}
          >
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              No intelligence events yet
            </p>
            <p style={{ fontSize: "12px", margin: "6px 0 0 0" }}>
              Events, memory updates, and autonomous connections will appear here as you interact with your spaces.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
