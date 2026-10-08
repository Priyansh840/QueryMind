"use client";

import React from "react";
import { Sparkles, ArrowRight, Lightbulb, TrendingUp } from "lucide-react";

export default function IntelligencePage() {
  const insights = [
    {
      title: "Grounded Knowledge Synthesis",
      summary: "Documents across General and Career spaces suggest an emphasis on developer tooling, distributed architectures, and AI agent workflows.",
      type: "Executive Summary",
    },
    {
      title: "Opportunity: Cross-Space Memory Alignment",
      summary: "Knowledge items from plugins and specification guides can be reinforced into long-term memory for faster contextual retrieval.",
      type: "Recommendation",
    },
  ];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 32px", width: "100%" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Intelligence Briefings
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Synthesized patterns, executive briefings, and autonomous workspace insights.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {insights.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: "22px",
              borderRadius: "14px",
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Sparkles size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase" }}>
                {item.type}
              </span>
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
              {item.title}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {item.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
