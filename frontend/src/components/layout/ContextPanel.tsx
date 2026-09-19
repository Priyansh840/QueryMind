"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import {
  FileText,
  MoreHorizontal,
  X,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  Sparkles,
  MessageSquare,
  ArrowUpRight,
  Code2,
  Copy,
  Check,
  PanelRightClose,
  PanelRightOpen,
  Layers,
  Activity,
  Compass,
  Cpu,
  Zap,
} from "lucide-react";

export default function ContextPanel() {
  const router = useRouter();
  const selectedObject = useMyndStore((state) => state.selectedObject);
  const setSelectedObject = useMyndStore((state) => state.setSelectedObject);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const activityFeed = useMyndStore((state) => state.activityFeed);
  const openAskAi = useMyndStore((state) => state.openAskAi);
  const toggleMilestone = useMyndStore((state) => state.toggleMilestone);

  const [activeTab, setActiveTab] = useState<"summary" | "connections" | "timeline" | "ai">("summary");
  const [askAiQuery, setAskAiQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Active space
  const currentSpace = useMemo(() => {
    return (
      spaces.find(
        (s) =>
          s.id === activeSpaceId ||
          s.name.toLowerCase() === activeSpaceId?.toLowerCase()
      ) || spaces[0]
    );
  }, [spaces, activeSpaceId]);

  const spaceColor = currentSpace?.color || "#FFFFFF";

  // Check if content looks like code
  const isCode = useMemo(() => {
    if (!selectedObject) return false;
    const typeStr = (selectedObject.type || "").toLowerCase();
    const content = selectedObject.content || selectedObject.summary || "";
    return (
      typeStr.includes("code") ||
      content.trim().startsWith("//") ||
      content.includes("import ") ||
      content.includes("class ") ||
      content.includes("function ") ||
      content.includes("export ")
    );
  }, [selectedObject]);

  // Formatted code snippet
  const formattedCode = useMemo(() => {
    if (!selectedObject) return "";
    const raw = selectedObject.content || selectedObject.summary || "";
    // Clean up semi-colons followed by code to have clean line breaks if mashed into one line
    if (raw.includes(";") && !raw.includes("\n")) {
      return raw.replace(/;(?=\s*[a-zA-Z}])/g, ";\n");
    }
    return raw;
  }, [selectedObject]);

  // Active document or fallback
  const activeDoc = selectedObject;

  // Space-specific documents for semantic connections
  const connectedObjects: KnowledgeObject[] = useMemo(() => {
    if (!currentSpace) return [];
    return uploadedDocuments
      .filter((d) => d.id !== activeDoc?.id && (d.spaceId === currentSpace.id || !d.spaceId))
      .slice(0, 4);
  }, [currentSpace, uploadedDocuments, activeDoc?.id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askAiQuery.trim()) return;
    const targetPrefix = activeDoc ? `Regarding ${activeDoc.title}` : `In ${currentSpace.name} Space`;
    openAskAi(`${targetPrefix}: ${askAiQuery}`);
    setAskAiQuery("");
  };

  // If collapsed, show a sleek vertical mini-dock
  if (isCollapsed) {
    return (
      <aside
        style={{
          width: "52px",
          height: "100vh",
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          gap: "16px",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Intelligence Panel"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "var(--surface-hover)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <PanelRightOpen style={{ width: "16px", height: "16px" }} />
        </button>

        <div style={{ width: "24px", height: "1px", background: "var(--border)" }} />

        {/* Space Aura Dot */}
        <div
          title={`${currentSpace.name} Domain Active`}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: `${spaceColor}15`,
            color: spaceColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => setIsCollapsed(false)}
        >
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: spaceColor }} />
        </div>

        {/* Resident AI trigger */}
        <button
          onClick={() => openAskAi(`${currentSpace.name} Space`)}
          title={`Ask ${currentSpace.agentPersona?.name || "Resident AI"}`}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "transparent",
            border: "none",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Sparkles style={{ width: "16px", height: "16px" }} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="app-context-panel"
      style={{
        width: "var(--context-w, 360px)",
        height: "100vh",
        background: "var(--bg)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          background: `linear-gradient(180deg, ${spaceColor}08 0%, var(--surface) 100%)`,
        }}
      >
        {/* Left: Context Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--surface-hover)",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {activeDoc ? (
              isCode ? (
                <Code2 style={{ width: "16px", height: "16px" }} />
              ) : (
                <FileText style={{ width: "16px", height: "16px" }} />
              )
            ) : (
              <Compass style={{ width: "16px", height: "16px" }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeDoc ? activeDoc.title : `${currentSpace.name} Domain`}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
              {activeDoc
                ? `${activeDoc.type || "Document"} • In ${currentSpace.name}`
                : "Active Neural Workspace"}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {activeDoc && (
            <button
              onClick={() =>
                router.push(
                  `/chat?prompt=${encodeURIComponent(
                    `Analyze and synthesize insights from "${activeDoc.title}": ${activeDoc.summary || ""}`
                  )}`
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                background: `${spaceColor}15`,
                color: spaceColor,
                border: `1px solid ${spaceColor}30`,
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Chat with this item"
            >
              <MessageSquare style={{ width: "12px", height: "12px" }} />
              <span>Chat</span>
            </button>
          )}

          {activeDoc && (
            <button
              onClick={() => setSelectedObject(null)}
              style={{
                padding: "5px",
                borderRadius: "6px",
                background: "transparent",
                border: "none",
                color: "var(--text-tertiary)",
                cursor: "pointer",
              }}
              title="Return to Space Hub"
            >
              <X style={{ width: "15px", height: "15px" }} />
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(true)}
            style={{
              padding: "5px",
              borderRadius: "6px",
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
            }}
            title="Collapse Sidebar"
          >
            <PanelRightClose style={{ width: "15px", height: "15px" }} />
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          padding: "0 16px",
          background: "var(--surface)",
        }}
      >
        {(["summary", "connections", "timeline", "ai"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: "12px",
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: activeTab === tab ? `2px solid ${spaceColor}` : "2px solid transparent",
              background: "transparent",
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 150ms ease",
            }}
          >
            {tab === "ai" ? "Ask AI" : tab}
          </button>
        ))}
      </div>

      {/* 3. Panel Body */}
      <div
        style={{
          flex: 1,
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          overflowY: "auto",
        }}
      >
        {/* ========================================================= */}
        {/* TAB 1: SUMMARY / INTELLIGENCE                             */}
        {/* ========================================================= */}
        {activeTab === "summary" && (
          <>
            {/* If an object is selected: render Document Inspection */}
            {activeDoc ? (
              <>
                {/* Content View: Code Studio Card or Executive Briefing Card */}
                {isCode ? (
                  <div
                    style={{
                      borderRadius: "10px",
                      background: "#0F172A",
                      border: "1px solid #1E293B",
                      overflow: "hidden",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#1E293B",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "11px",
                        color: "#94A3B8",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Code2 style={{ width: "13px", height: "13px", color: "#38BDF8" }} />
                        <span style={{ fontWeight: 600, color: "#F1F5F9" }}>Source Extract</span>
                      </div>
                      <button
                        onClick={() => handleCopy(formattedCode)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: copied ? "#10B981" : "#94A3B8",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                        }}
                      >
                        {copied ? (
                          <>
                            <Check style={{ width: "12px", height: "12px" }} />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy style={{ width: "12px", height: "12px" }} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre
                      style={{
                        padding: "12px",
                        margin: 0,
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        lineHeight: "1.55",
                        color: "#E2E8F0",
                        maxHeight: "220px",
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {formattedCode}
                    </pre>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      background: "var(--surface-subtle)",
                      borderTop: "1px solid var(--border)",
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: `3px solid ${spaceColor}`,
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: spaceColor, marginBottom: "6px" }}>
                      Executive Synthesis
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        lineHeight: "1.55",
                        color: "var(--text-secondary)",
                        margin: 0,
                      }}
                    >
                      {activeDoc.summary ||
                        "Resource indexed and vectorized. Ready for context-isolated agent retrieval."}
                    </p>
                  </div>
                )}

                {/* Key Takeaways & Highlights */}
                <div>
                  <h4
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-tertiary)",
                      marginBottom: "10px",
                    }}
                  >
                    Key Highlights & Tags
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(activeDoc.keyIdeas && activeDoc.keyIdeas.length > 0
                      ? activeDoc.keyIdeas
                      : [
                          "Verified Vector Indexing",
                          "Domain Scope: " + currentSpace.name,
                          "Semantic Cohesion: High",
                        ]
                    ).map((highlight, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <CheckCircle2 style={{ width: "14px", height: "14px", color: "#10B981", marginTop: "2px", flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, lineHeight: "1.4" }}>
                          {highlight}
                        </span>
                      </div>
                    ))}
                  </div>

                  {activeDoc.tags && activeDoc.tags.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                      {activeDoc.tags.map((tag) => (
                        <span key={tag} className="kbd" style={{ fontSize: "10px", padding: "2px 6px" }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Suggestions / Recommendations */}
                <div>
                  <h4
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-tertiary)",
                      marginBottom: "10px",
                    }}
                  >
                    Autonomous Suggestions
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                        <TrendingUp style={{ width: "14px", height: "14px", color: "#10B981", flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                          Cross-reference with {currentSpace.name} milestones
                        </span>
                      </div>
                      <button
                        onClick={() => openAskAi(`Cross-reference "${activeDoc.title}" with current milestones in ${currentSpace.name}`)}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: "var(--surface-hover)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Apply
                      </button>
                    </div>

                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                        <Lightbulb style={{ width: "14px", height: "14px", color: "var(--text-secondary)", flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                          Extract 3 practice interview questions
                        </span>
                      </div>
                      <button
                        onClick={() => openAskAi(`Extract 3 technical questions based on "${activeDoc.title}"`)}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: "var(--surface-hover)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Run
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* If no document selected: render Space & Neural Intelligence Hub */
              <>
                {/* Resident Specialist Card */}
                {currentSpace.agentPersona && (
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      background: `linear-gradient(135deg, ${spaceColor}14 0%, var(--surface) 100%)`,
                      border: `1px solid ${spaceColor}30`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "#262626",
                          color: "#FFFFFF",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          fontWeight: 700,
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        AI
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                          {currentSpace.agentPersona.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          {currentSpace.agentPersona.title}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
                      {currentSpace.agentPersona.specialty}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#10B981" }}>
                      <span className="alive-dot" style={{ background: "#10B981" }} />
                      <span style={{ fontWeight: 600 }}>Active & Watching Domain</span>
                    </div>
                  </div>
                )}

                {/* Domain Telemetry Radar */}
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: "10px" }}>
                    Cognitive Telemetry
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Qdrant Vectors</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: spaceColor, marginTop: "2px" }}>~1,420</div>
                    </div>
                    <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Cohesion Index</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#10B981", marginTop: "2px" }}>94.2%</div>
                    </div>
                  </div>
                </div>

                {/* Active Milestones Checklist */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>
                      Active Milestones
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: spaceColor }}>
                      {currentSpace.goal?.progress || 0}%
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(currentSpace.milestones || []).slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMilestone(currentSpace.id, m.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          background: m.completed ? "var(--surface-subtle)" : "var(--surface)",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        <span style={{ color: m.completed ? spaceColor : "var(--text-tertiary)", fontWeight: 700 }}>
                          {m.completed ? "✓" : "○"}
                        </span>
                        <span
                          style={{
                            color: m.completed ? "var(--text-tertiary)" : "var(--text-primary)",
                            textDecoration: m.completed ? "line-through" : "none",
                            flex: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {m.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* One-Click Domain Actions */}
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                    One-Click Actions
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <button
                      onClick={() => openAskAi(`Synthesize all key findings and documents in ${currentSpace.name}`)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Zap style={{ width: "13px", height: "13px", color: spaceColor }} />
                      <span>Synthesize {currentSpace.name} Briefing</span>
                    </button>

                    <button
                      onClick={() => openAskAi(`Identify knowledge gaps and blind spots in ${currentSpace.name}`)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Lightbulb style={{ width: "13px", height: "13px", color: "var(--text-secondary)" }} />
                      <span>Audit Knowledge Gaps</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Bottom Mini Ask AI Input Bar */}
            <form onSubmit={handleAskAiSubmit} style={{ marginTop: "auto", paddingTop: "8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                }}
              >
                <Sparkles style={{ width: "14px", height: "14px", color: spaceColor, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={activeDoc ? "Ask AI about this item..." : `Query ${currentSpace.name} Brain...`}
                  value={askAiQuery}
                  onChange={(e) => setAskAiQuery(e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    flex: 1,
                  }}
                />
              </div>
            </form>
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CONNECTIONS                                        */}
        {/* ========================================================= */}
        {activeTab === "connections" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>
              Semantic Neighbors (Qdrant)
            </div>

            {connectedObjects.length === 0 ? (
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textAlign: "center", padding: "20px" }}>
                No direct connections found. Upload more documents to form neural links.
              </div>
            ) : (
              connectedObjects.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedObject(item)}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = spaceColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.title}
                    </span>
                    <span className="badge" style={{ fontSize: "10px", background: `${spaceColor}15`, color: spaceColor }}>
                      {98 - idx * 4}% Match
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                    {item.type || "Doc"} • Click to inspect
                  </div>
                </div>
              ))
            )}

            <button
              onClick={() => router.push(`/chat?prompt=Explore graph connections between documents in ${currentSpace.name}`)}
              style={{
                marginTop: "10px",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--surface-subtle)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <span>Explore Knowledge Constellation</span>
              <ArrowUpRight style={{ width: "13px", height: "13px" }} />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TIMELINE                                           */}
        {/* ========================================================= */}
        {activeTab === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>
              Audit & Ingestion Timeline
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "12px", borderLeft: `2px solid ${spaceColor}`, paddingLeft: "12px" }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {activeDoc ? activeDoc.title : currentSpace.name} Synchronized
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Vector embeddings cached in Qdrant • 10 minutes ago
                </div>
              </div>

              <div style={{ fontSize: "12px", borderLeft: "2px solid var(--border)", paddingLeft: "12px" }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  Autonomous Specialist Sync
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Checked domain cohesion & link integrity • 2 hours ago
                </div>
              </div>

              <div style={{ fontSize: "12px", borderLeft: "2px solid var(--border)", paddingLeft: "12px" }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  Memory Consolidation Event
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  System checkpoint committed to PostgreSQL • Yesterday
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: ASK AI                                             */}
        {/* ========================================================= */}
        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>
              Autonomous Co-pilot
            </div>

            <button
              onClick={() =>
                router.push(
                  `/chat?prompt=${encodeURIComponent(
                    activeDoc
                      ? `Deeply synthesize and extract key architectural concepts from "${activeDoc.title}": ${activeDoc.summary || ""}`
                      : `Provide an executive intelligence briefing across the ${currentSpace.name} space.`
                  )}`
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${spaceColor} 0%, var(--accent) 100%)`,
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: `0 2px 10px ${spaceColor}44`,
              }}
            >
              <span>🚀 Launch Streaming Chat</span>
              <ArrowUpRight style={{ width: "14px", height: "14px" }} />
            </button>

            <button
              onClick={() =>
                openAskAi(
                  activeDoc
                    ? `What are the top 3 critical takeaways from "${activeDoc.title}"?`
                    : `What are the top 3 priorities in the ${currentSpace.name} domain?`
                )
              }
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              ✨ Extract Top 3 Key Takeaways
            </button>

            <button
              onClick={() =>
                openAskAi(
                  activeDoc
                    ? `Identify conceptual gaps or blind spots in "${activeDoc.title}".`
                    : `Identify missing resources or knowledge gaps in ${currentSpace.name}.`
                )
              }
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              🔍 Pinpoint Blind Spots & Gaps
            </button>

            <button
              onClick={() =>
                openAskAi(
                  activeDoc
                    ? `Formulate 5 technical interview or examination questions testing knowledge of "${activeDoc.title}".`
                    : `Generate 5 high-impact questions testing mastery of ${currentSpace.name}.`
                )
              }
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              🎯 Generate Mastery / Exam Questions
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
