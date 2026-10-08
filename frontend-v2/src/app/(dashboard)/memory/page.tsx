"use client";

import React, { useState } from "react";
import { Brain, Sparkles, Check, Trash2 } from "lucide-react";

export default function MemoryPage() {
  const [memories, setMemories] = useState([
    { id: "m-1", text: "User prioritizes clean, unbloated software architectures and minimal UI design.", type: "preference" },
    { id: "m-2", text: "Space creation must always request explicit user approval to prevent proliferation.", type: "rule" },
    { id: "m-3", text: "Antigravity plugin documentation is referenced for AI tooling workflows.", type: "fact" },
  ]);

  const removeMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 32px", width: "100%" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Retained Memory
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Facts, rules, and preferences learned and retained across all sessions.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {memories.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderRadius: "12px",
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <Brain size={18} style={{ color: "var(--accent)", marginTop: "2px" }} />
              <div>
                <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {m.text}
                </p>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                  {m.type}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeMemory(m.id)}
              style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: "6px" }}
              className="hover:text-[#EF4444]"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
