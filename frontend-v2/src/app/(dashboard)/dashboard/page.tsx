"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  FileText,
  Target,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileCode,
  Folder,
  Cpu,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi, GoalData } from "@/lib/api";

export default function DashboardHomePage() {
  const spaces = useMyndStore((state) => state.spaces);
  const userProfile = useMyndStore((state) => state.userProfile);

  const userName = userProfile?.name?.split(" ")[0] || "there";

  const [greetingData, setGreetingData] = useState({
    greeting: "Welcome back",
    icon: "●",
    note: "Your workspace is synthesized and ready.",
    today: "",
  });

  const [realDocuments, setRealDocuments] = useState<any[]>([]);
  const [recentGoals, setRecentGoals] = useState<GoalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Time calculation deferred for clean hydration
  useEffect(() => {
    const hour = new Date().getHours();
    let greeting = "Welcome back";
    let note = "Your workspace is synthesized and ready.";

    if (hour >= 5 && hour < 12) {
      greeting = "Good morning";
      note = "Hope you have an insightful day ahead.";
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
      note = "Reviewing today's key goals and document grounding.";
    } else if (hour >= 17 && hour < 22) {
      greeting = "Good evening";
      note = "Winding down or checking in on workspace outcomes?";
    } else {
      greeting = "Working late";
      note = "Quiet hours for deep focus and synthesis.";
    }

    const today = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(new Date());

    setGreetingData({ greeting, icon: "●", note, today });
  }, []);

  // Fetch real goals, documents, and spaces directly from backend
  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        const [goalsData, docsData, spacesData] = await Promise.allSettled([
          queryMindApi.getGoals(),
          queryMindApi.listDocuments(),
          queryMindApi.getSpaces(),
        ]);

        if (goalsData.status === "fulfilled" && Array.isArray(goalsData.value)) {
          setRecentGoals(goalsData.value);
        }
        if (docsData.status === "fulfilled" && Array.isArray(docsData.value)) {
          setRealDocuments(docsData.value);
        }
        if (spacesData.status === "fulfilled" && Array.isArray(spacesData.value)) {
          useMyndStore.setState({
            spaces: spacesData.value.map((s) => ({
              id: s.id,
              name: s.name,
              desc: s.description || "Workspace",
              color: s.color || "#6366f1",
              icon: s.icon || "folder",
              status: "synced",
              count: 0,
              updated: "Recently",
              pinned: false,
            })),
          });
        }
      } catch (err) {
        console.warn("Could not fetch real workspace data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkspaceData();
  }, []);

  // Toggle goal status
  const handleToggleGoal = async (goal: GoalData) => {
    const nextStatus = goal.status === "completed" ? "active" : "completed";
    try {
      await queryMindApi.updateGoal(goal.id, { status: nextStatus });
      setRecentGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, status: nextStatus } : g))
      );
    } catch (err) {
      console.error("Failed to update goal:", err);
    }
  };

  const totalDocs = realDocuments.length;
  const activeGoalsCount = recentGoals.filter((g) => g.status !== "completed").length;
  const recentDocs = realDocuments.slice(0, 5);

  // Compute space statistics for Domain Horizons
  const domainHorizons = spaces.map((space) => {
    const spaceDocs = realDocuments.filter((d) => d.space_id === space.id);
    const spaceGoals = recentGoals.filter((g) => g.space_id === space.id);
    const percentage = totalDocs > 0 ? Math.round((spaceDocs.length / totalDocs) * 100) : 0;
    return {
      ...space,
      docsCount: spaceDocs.length,
      goalsCount: spaceGoals.length,
      percentage,
    };
  });

  return (
    <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "44px 36px", width: "100%" }}>
      {/* 1. Warm Greeting Banner */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "20px",
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            fontSize: "12px",
            color: "var(--text-tertiary)",
            marginBottom: "12px",
          }}
        >
          <span style={{ color: "#10B981", fontSize: "10px" }}>●</span>
          <span>{greetingData.today || "Today"}</span>
        </div>

        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
          }}
        >
          {greetingData.greeting}, {userName}.
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "var(--text-secondary)",
            marginTop: "6px",
            lineHeight: 1.5,
          }}
        >
          {greetingData.note}
        </p>
      </div>

      {/* 2. Hero Visual: Domain Horizons (Space Comparison & Knowledge Breakdown) */}
      <div
        style={{
          background: "var(--surface-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "26px",
          marginBottom: "36px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={18} style={{ color: "var(--accent)" }} />
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                Domain Horizons
              </h2>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
              Knowledge grounding, document density, and active goals across your domains
            </p>
          </div>

          <Link
            href="/spaces"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--accent)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>Manage All Spaces</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Global Distribution Segmented Bar */}
        {totalDocs > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                height: "10px",
                borderRadius: "5px",
                background: "var(--surface-secondary)",
                display: "flex",
                overflow: "hidden",
                gap: "2px",
              }}
            >
              {domainHorizons.map((h) => {
                if (h.percentage === 0) return null;
                return (
                  <div
                    key={h.id}
                    style={{
                      width: `${h.percentage}%`,
                      background: h.color || "var(--accent)",
                      transition: "width 0.4s ease",
                    }}
                    title={`${h.name}: ${h.docsCount} docs (${h.percentage}%)`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Domain Space Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          {domainHorizons.map((domain) => (
            <div
              key={domain.id}
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.15s ease",
              }}
              className="hover:border-[var(--border-strong)]"
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: `${domain.color || "#6366f1"}20`,
                        color: domain.color || "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Folder size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {domain.name}
                      </h3>
                      <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                        {domain.percentage}% of knowledge
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "14px" }}>
                  {domain.desc || "Dedicated domain workspace."}
                </p>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--text-tertiary)", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                  <span>{domain.docsCount} documents</span>
                  <span>{domain.goalsCount} goals</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Global Space-Independent Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "36px",
        }}
      >
        <div style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Active Spaces
            </span>
            <Boxes size={16} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: "12px" }}>
            {spaces.length}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Isolated domain environments
          </div>
        </div>

        <div style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Knowledge Vault
            </span>
            <FileText size={16} style={{ color: "#10B981" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: "12px" }}>
            {totalDocs}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Total indexed documents
          </div>
        </div>

        <div style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Tracked Goals
            </span>
            <Target size={16} style={{ color: "#F59E0B" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: "12px" }}>
            {activeGoalsCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            In-flight milestone objectives
          </div>
        </div>

        <div style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Reasoning Engine
            </span>
            <Cpu size={16} style={{ color: "#A855F7" }} />
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#10B981", marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
            Operational
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
            Autonomous proposal loop active
          </div>
        </div>
      </div>

      {/* 4. Side-by-Side: Recent Documents & Recent Goals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
          gap: "24px",
          marginBottom: "40px",
        }}
      >
        {/* Recent Documents Panel */}
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--surface-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981" }}>
                  <FileText size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Recent Documents</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Latest files uploaded across all spaces</p>
                </div>
              </div>

              <Link
                href="/vault"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--accent)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {recentDocs.length === 0 ? (
              <div
                style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: "13px",
                  borderRadius: "10px",
                  background: "var(--surface-secondary)",
                }}
              >
                No documents uploaded yet. Upload a PDF or file in the Knowledge Vault.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {recentDocs.map((doc) => {
                  const spaceMatch = spaces.find((s) => s.id === doc.space_id);
                  return (
                    <div
                      key={doc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "var(--surface-secondary)",
                        border: "1px solid var(--border-subtle)",
                        transition: "all 0.15s ease",
                      }}
                      className="hover:border-[var(--border-strong)]"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                        <FileCode size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                            {doc.title || doc.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px", display: "flex", gap: "8px" }}>
                            <span>{(doc.type || "PDF").toUpperCase()}</span>
                            {spaceMatch && (
                              <span style={{ color: spaceMatch.color || "var(--accent)" }}>
                                • {spaceMatch.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "#10B981",
                          flexShrink: 0,
                        }}
                      >
                        ✓ Ready
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" }}>
            <Link
              href="/vault"
              style={{
                fontSize: "12px",
                color: "var(--text-tertiary)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              className="hover:text-[var(--text-primary)]"
            >
              <span>Add new documents to Vault</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Recent Goals Panel */}
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--surface-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F59E0B" }}>
                  <Target size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Active Goals & Milestones</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Tangible outcomes from workspace decisions</p>
                </div>
              </div>

              <Link
                href="/goals"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--accent)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                Loading milestones...
              </div>
            ) : recentGoals.length === 0 ? (
              <div
                style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: "13px",
                  borderRadius: "10px",
                  background: "var(--surface-secondary)",
                }}
              >
                No active goals recorded yet. Formulate goals through Reasoning Chat.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {recentGoals.slice(0, 5).map((goal) => {
                  const isDone = goal.status === "completed";
                  return (
                    <div
                      key={goal.id}
                      onClick={() => handleToggleGoal(goal)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "var(--surface-secondary)",
                        border: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      className="hover:border-[var(--border-strong)]"
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} style={{ color: "#10B981", flexShrink: 0 }} />
                      ) : (
                        <Circle size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontSize: "13px",
                          color: isDone ? "var(--text-tertiary)" : "var(--text-primary)",
                          textDecoration: isDone ? "line-through" : "none",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {goal.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" }}>
            <Link
              href="/goals"
              style={{
                fontSize: "12px",
                color: "var(--text-tertiary)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              className="hover:text-[var(--text-primary)]"
            >
              <span>Manage all goals & milestones</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
