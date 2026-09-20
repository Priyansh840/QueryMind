"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

const CATEGORY_TAGS = [
  { id: "all", label: "All Spaces" },
  { id: "engineering", label: "Engineering & Architecture" },
  { id: "research", label: "AI & Research" },
  { id: "product", label: "Product & Startup" },
  { id: "academics", label: "Academics" },
  { id: "creative", label: "Creative & Brain Dumps" },
];

export default function SpacesDirectoryPage() {
  const router = useRouter();
  const spaces = useMyndStore((state) => state.spaces);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openCreateSpace = useMyndStore((state) => state.openCreateSpace);
  const deleteSpace = useMyndStore((state) => state.deleteSpace);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Compute live telemetry
  const totalObjects = useMemo(() => {
    return spaces.reduce((acc, s) => {
      const spaceDocs = uploadedDocuments.filter((d) => d.spaceId === s.id).length;
      return acc + Math.max(s.count, spaceDocs);
    }, 0);
  }, [spaces, uploadedDocuments]);

  const totalVectors = useMemo(() => {
    return uploadedDocuments.reduce((acc, d) => acc + (d.vectorsStored || d.chunks || 1), 0);
  }, [uploadedDocuments]);

  const activeAgents = useMemo(() => {
    return spaces.filter((s) => s.agentPersona?.status === "active" || s.agentPersona).length;
  }, [spaces]);

  // Filtered spaces
  const filteredSpaces = useMemo(() => {
    return spaces.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.agentPersona?.name && s.agentPersona.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      if (selectedCategory === "engineering") return s.name.toLowerCase().includes("engineer") || s.name.toLowerCase().includes("system") || s.name.toLowerCase().includes("career") || s.desc.toLowerCase().includes("architecture");
      if (selectedCategory === "research") return s.name.toLowerCase().includes("research") || s.name.toLowerCase().includes("ai") || s.name.toLowerCase().includes("neural") || s.desc.toLowerCase().includes("paper");
      if (selectedCategory === "product") return s.name.toLowerCase().includes("product") || s.name.toLowerCase().includes("startup") || s.desc.toLowerCase().includes("strategy");
      if (selectedCategory === "academics") return s.name.toLowerCase().includes("college") || s.name.toLowerCase().includes("academic") || s.name.toLowerCase().includes("study") || s.name.toLowerCase().includes("course");
      if (selectedCategory === "creative") return s.name.toLowerCase().includes("idea") || s.name.toLowerCase().includes("creative") || s.name.toLowerCase().includes("personal") || s.name.toLowerCase().includes("vault");
      return true;
    });
  }, [spaces, searchQuery, selectedCategory]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "60px" }}>
      {/* Hero & Telemetry HUD */}
      <div
        className="stagger"
        style={{
          position: "relative",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 50%, var(--surface) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "32px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span className="alive-dot" />
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>
                Domain Memory Partitions
              </span>
            </div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              Knowledge Spaces
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "6px", maxWidth: "600px", fontSize: "14px", lineHeight: "1.5" }}>
              Isolate contexts, stream continuous vector embeddings, and pair each project with a dedicated Resident AI Specialist.
            </p>
          </div>

          <button
            onClick={openCreateSpace}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#FFFFFF",
              color: "#000000",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "transform 150ms ease",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#000000" strokeWidth="2.5" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create New Space</span>
          </button>
        </div>

        {/* Telemetry Metrics Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            marginTop: "28px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Active Spaces</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              <AnimatedCounter target={spaces.length} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Knowledge Objects</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              <AnimatedCounter target={totalObjects} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Qdrant Vectors</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              <AnimatedCounter target={totalVectors} prefix="~" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Resident AI Agents</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#10B981", marginTop: "4px" }}>
              <AnimatedCounter target={activeAgents} suffix=" Active" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "420px" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}>
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search spaces or specialists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 14px 9px 36px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          {/* Quick Breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-tertiary)" }}>
            <Link href="/workspace" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Workspace</Link>
            <span>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Spaces Gallery</span>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {CATEGORY_TAGS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: selectedCategory === cat.id ? "1px solid #FFFFFF" : "1px solid var(--border)",
                background: selectedCategory === cat.id ? "#FFFFFF" : "var(--surface)",
                color: selectedCategory === cat.id ? "#000000" : "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: selectedCategory === cat.id ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 150ms ease",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spaces Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {spaces.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "48px 24px",
              textAlign: "center",
              borderRadius: "16px",
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
              No Spaces Provisioned Yet
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "440px", margin: 0, lineHeight: 1.5 }}>
              Your workspace starts clean. You can choose domain presets from the interests page, or create custom spaces tailored to your work.
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                onClick={openCreateSpace}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#FFFFFF",
                  color: "#000000",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Create New Space
              </button>
              <Link
                href="/onboarding"
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Browse Interests
              </Link>
            </div>
          </div>
        )}

        {filteredSpaces.map((space, idx) => {
          const spaceDocs = uploadedDocuments.filter((d) => d.spaceId === space.id);
          const docCount = Math.max(space.count, spaceDocs.length);

          return (
            <div
              key={`spaces-grid-${space.id}-${idx}`}
              onClick={() => {
                selectSpace(space.id);
                router.push(`/spaces/${space.id}`);
              }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "22px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                transition: "all 200ms ease",
                boxShadow: "var(--shadow-xs)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-xs)";
              }}
            >
              {/* Subtle top glow bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "linear-gradient(90deg, rgba(255, 255, 255, 0.25) 0%, transparent 100%)",
                }}
              />

              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "var(--surface-hover)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#FFFFFF",
                        boxShadow: "0 0 6px rgba(255, 255, 255, 0.4)",
                      }}
                    />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {space.name}
                    </h3>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      {docCount} objects · {space.status}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: "11px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#FFFFFF",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {space.pinned ? "Pinned" : "Space"}
                  </span>
                  <button
                    type="button"
                    title={`Delete "${space.name}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to remove space "${space.name}"?`)) {
                        deleteSpace(space.id);
                        queryMindApi.deleteSpace(space.id).catch((err) => console.warn("Backend delete space error:", err));
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#EF4444";
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-tertiary)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.45",
                  margin: "0 0 16px 0",
                  flex: 1,
                }}
              >
                {space.desc}
              </p>

              {/* Resident AI Specialist Chip */}
              {space.agentPersona && (
                <div
                  style={{
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      background: "#262626",
                      color: "#FFFFFF",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    AI
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {space.agentPersona.name}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {space.agentPersona.specialty}
                    </div>
                  </div>
                  <span className="alive-dot" style={{ background: "#FFFFFF" }} />
                </div>
              )}

              {/* Goal Progress Ring / Bar */}
              {space.goal && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Objective</span>
                    <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{space.goal.progress}%</span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", background: "var(--surface-hover)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${space.goal.progress}%`,
                        height: "100%",
                        background: "#FFFFFF",
                        borderRadius: "3px",
                        transition: "width 400ms ease",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Card Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "12px",
                  marginTop: "auto",
                  fontSize: "12px",
                }}
              >
                <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
                  Updated {space.updated}
                </span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                  Enter Space
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </div>
          );
        })}

        {/* "+ Create New Space" Invite Card */}
        <div
          onClick={openCreateSpace}
          style={{
            border: "1.5px dashed var(--border-strong)",
            background: "transparent",
            borderRadius: "14px",
            minHeight: "240px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            cursor: "pointer",
            padding: "24px",
            transition: "all 180ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.background = "var(--surface-subtle)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--surface-hover)",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              Initialize New Space
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
              Custom memory partition & resident AI specialist
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
