"use client";

import React from "react";
import { useMyndStore } from "@/lib/mynd-store";

export default function ObjectDetailModal() {
  const selectedObject = useMyndStore((state) => state.selectedObject);
  const closeObjectModal = useMyndStore((state) => state.closeObjectModal);
  const openAskAi = useMyndStore((state) => state.openAskAi);

  if (!selectedObject) return null;

  return (
    <div
      className="settings-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeObjectModal();
      }}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        className="settings-box"
        style={{ maxWidth: "700px", width: "92%", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="settings-header" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", fontSize: "11px" }}>
              {selectedObject.type || "Document"}
            </span>
            <span style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-primary)" }}>
              {selectedObject.title}
            </span>
            {selectedObject.version && (
              <span className="kbd" style={{ fontSize: "10px" }}>
                {selectedObject.version}
              </span>
            )}
          </div>
          <button className="close-btn" onClick={closeObjectModal}>
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Metadata Row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-secondary)" }}>
            {selectedObject.updated && <div>🕒 Updated: {selectedObject.updated}</div>}
            {selectedObject.confidence && <div>🎯 Confidence: {selectedObject.confidence}</div>}
            {selectedObject.connections && <div>🔗 Connections: {selectedObject.connections} linked nodes</div>}
          </div>

          {/* Tags */}
          {selectedObject.tags && selectedObject.tags.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {selectedObject.tags.map((t) => (
                <span
                  key={t}
                  className="kbd"
                  style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)", fontSize: "11px" }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          {selectedObject.summary && (
            <div style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                Autonomous AI Summary
              </div>
              <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--text-primary)" }}>{selectedObject.summary}</p>
            </div>
          )}

          {/* Key Ideas */}
          {selectedObject.keyIdeas && selectedObject.keyIdeas.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                Key Concepts
              </div>
              <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {selectedObject.keyIdeas.map((idea, i) => (
                  <li key={i}>{idea}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Main Content */}
          {selectedObject.content && (
            <div style={{ borderTop: "1px solid var(--divider)", paddingTop: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                Source Content
              </div>
              <pre
                style={{
                  background: "var(--surface-subtle)",
                  padding: "12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontFamily: "var(--mono)",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.5",
                  border: "1px solid var(--border)",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {selectedObject.content}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface)",
          }}
        >
          <button
            className="kbd"
            onClick={() => {
              openAskAi(selectedObject.title);
              closeObjectModal();
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "var(--accent-soft)", color: "var(--accent)", border: "none", cursor: "pointer" }}
          >
            <span className="alive-dot" /> Ask AI about this object
          </button>

          <button
            className="kbd"
            onClick={closeObjectModal}
            style={{ padding: "6px 16px", cursor: "pointer", background: "var(--text-primary)", color: "var(--bg)", border: "none" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
