"use client";

import React from "react";
import Link from "next/link";
import KnowledgeMap from "@/components/graph/KnowledgeMap";
import { useMyndStore } from "@/lib/mynd-store";
import {
  FileText,
  FileCode,
  BookOpen,
  Plus,
  ArrowRight,
  Sun,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const userProfile = useMyndStore((state) => state.userProfile);
  const isFocusMode = useMyndStore((state) => state.isFocusMode);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const openSettings = useMyndStore((state) => state.openSettings);
  const recentObjects = useMyndStore((state) => state.recentObjects);
  const activityFeed = useMyndStore((state) => state.activityFeed);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 1. Greeting Hero Section */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "var(--text-tertiary)",
              fontWeight: 500,
            }}
          >
            <Sun style={{ width: "16px", height: "16px", color: "var(--text-secondary)" }} />
            <span>Good evening, {userProfile.name.split(" ")[0]}</span>
          </div>

          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            You&apos;re in flow
          </h1>

          <div
            onClick={() => selectSpace("career")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <span>Focused on {userProfile.focusDomain || "Career & Systems Architecture"}</span>
            <span>➔</span>
          </div>
        </div>

        <button
          onClick={toggleFocusMode}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "9999px",
            background: isFocusMode ? "#FFFFFF" : "var(--surface)",
            border: isFocusMode ? "1px solid #FFFFFF" : "1px solid var(--border)",
            fontSize: "13px",
            fontWeight: 600,
            color: isFocusMode ? "#000000" : "var(--text-primary)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isFocusMode ? "#000000" : "#737373",
            }}
          />
          <span>{isFocusMode ? "Exit Focus" : "Focus Mode"}</span>
        </button>
      </div>

      {/* 2. Continue where you left off */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Continue where you left off
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
          }}
        >
          {/* Card 1: Resume 2026 */}
          <div
            onClick={() =>
              openObjectModal(
                recentObjects[0] || {
                  id: "resume-2026",
                  title: "Resume 2026",
                  type: "PDF",
                  updated: "2h ago",
                }
              )
            }
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-xs)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--surface-hover)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FileText style={{ width: "18px", height: "18px" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Resume 2026
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  PDF • Updated 2h ago
                </p>
              </div>
            </div>
            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "var(--surface-hover, var(--border))",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "95%",
                  height: "100%",
                  borderRadius: "2px",
                  background: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Card 2: Google Interview Prep */}
          <div
            onClick={() =>
              openObjectModal(
                recentObjects[1] || {
                  id: "google-prep",
                  title: "Google Interview Prep",
                  type: "Notes",
                  updated: "5h ago",
                }
              )
            }
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-xs)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--surface-hover)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BookOpen style={{ width: "18px", height: "18px" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Google Interview Prep
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Notes • Updated 5h ago
                </p>
              </div>
            </div>
            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "var(--surface-hover, var(--border))",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "80%",
                  height: "100%",
                  borderRadius: "2px",
                  background: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Card 3: Kalyra Streaming Engine */}
          <div
            onClick={() =>
              openObjectModal(
                recentObjects[2] || {
                  id: "kalyra-engine",
                  title: "Kalyra Streaming Engine",
                  type: "Code",
                  updated: "Yesterday",
                }
              )
            }
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-xs)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--surface-hover)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FileCode style={{ width: "18px", height: "18px" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Kalyra Streaming Engine
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Code • Updated yesterday
                </p>
              </div>
            </div>
            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "var(--surface-hover, var(--border))",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "72%",
                  height: "100%",
                  borderRadius: "2px",
                  background: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Card 4: + New Capture */}
          <Link
            href="/vault"
            style={{
              background: "var(--surface-subtle)",
              borderRadius: "16px",
              border: "1px dashed var(--border-strong)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <Plus style={{ width: "20px", height: "20px", color: "var(--text-tertiary)" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
              New Capture
            </span>
          </Link>
        </div>
      </div>

      {/* 3. Knowledge Map Section */}
      <div>
        <KnowledgeMap />
      </div>

      {/* 4. Recent Activity Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Recent Activity
          </h2>
          <Link
            href="/activity"
            style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", textDecoration: "underline" }}
          >
            View all
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {activityFeed.map((item, idx) => (
            <div
              key={`${item.id || "act"}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: item.bg || "var(--surface-hover)",
                  color: item.color || "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.iconType === "code" ? (
                  <FileCode style={{ width: "14px", height: "14px" }} />
                ) : item.iconType === "sparkles" ? (
                  <Sparkles style={{ width: "14px", height: "14px" }} />
                ) : (
                  <FileText style={{ width: "14px", height: "14px" }} />
                )}
              </div>
              <span style={{ fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
                {item.title}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                {item.time} • {item.space}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
