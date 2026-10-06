"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import KnowledgeMap from "@/components/graph/KnowledgeMap";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi, GoalData, ProjectData } from "@/lib/api";
import {
  FileText,
  FileCode,
  BookOpen,
  Plus,
  ArrowRight,
  Sun,
  Sparkles,
  Target,
  FolderKanban,
  CheckCircle2,
  Clock,
  Compass,
} from "lucide-react";

export default function DashboardPage() {
  const userProfile = useMyndStore((state) => state.userProfile);
  const isFocusMode = useMyndStore((state) => state.isFocusMode);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openCreateSpace = useMyndStore((state) => state.openCreateSpace);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const openSettings = useMyndStore((state) => state.openSettings);
  const recentObjects = useMyndStore((state) => state.recentObjects);
  const activityFeed = useMyndStore((state) => state.activityFeed);

  const [activeGoals, setActiveGoals] = useState<GoalData[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectData[]>([]);
  const [isLoadingWork, setIsLoadingWork] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadWorkspaceData() {
      setIsLoadingWork(true);
      try {
        const [goalsData, projectsData] = await Promise.all([
          queryMindApi.getGoals().catch(() => []),
          queryMindApi.getProjects(activeSpaceId || undefined).catch(() => []),
        ]);
        if (isMounted) {
          setActiveGoals(Array.isArray(goalsData) ? goalsData.filter((g) => g.status === "active") : []);
          setActiveProjects(Array.isArray(projectsData) ? projectsData.filter((p) => p.status === "active") : []);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setIsLoadingWork(false);
      }
    }
    loadWorkspaceData();
    return () => {
      isMounted = false;
    };
  }, [activeSpaceId]);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // Real time-of-day greeting
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Good night";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  })();

  const displayName = userProfile.name?.trim()
    ? userProfile.name.split(" ")[0]
    : "there";

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
            <span>{greeting}, {displayName}</span>
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

          {spaces.length > 0 ? (
            <div
              onClick={() => selectSpace(activeSpace?.id || spaces[0].id)}
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
              <span>Focused on {activeSpace?.name || spaces[0].name}</span>
              <span>➔</span>
            </div>
          ) : (
            <div
              onClick={openCreateSpace}
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
              <span>No active spaces — Create your first space</span>
              <span>+</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/goals"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "9999px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              cursor: "pointer",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <Target style={{ width: "14px", height: "14px" }} />
            <span>Goals</span>
          </Link>

          <Link
            href="/projects"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "9999px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              cursor: "pointer",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <FolderKanban style={{ width: "14px", height: "14px" }} />
            <span>Projects</span>
          </Link>

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
          {recentObjects.length > 0 ? (
            recentObjects.slice(0, 4).map((obj) => {
              const icon =
                obj.type === "Code" ? (
                  <FileCode style={{ width: "18px", height: "18px" }} />
                ) : obj.type === "Notes" ? (
                  <BookOpen style={{ width: "18px", height: "18px" }} />
                ) : (
                  <FileText style={{ width: "18px", height: "18px" }} />
                );

              return (
                <div
                  key={obj.id}
                  onClick={() => openObjectModal(obj)}
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
                      {icon}
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
                        {obj.title}
                      </h3>
                      <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                        {obj.type} • Updated {obj.updated || obj.time || "recently"}
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
                        width: `${obj.progress || 0}%`,
                        height: "100%",
                        borderRadius: "2px",
                        background: "var(--text-primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "24px 20px",
                borderRadius: "16px",
                border: "1px dashed var(--border-strong)",
                background: "var(--surface-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  No recent documents or captures
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "4px 0 0 0" }}>
                  Upload a PDF, document, or take notes in your spaces to start building your knowledge base.
                </p>
              </div>
              <Link
                href="/vault"
                className="btn btn-secondary"
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                <Plus style={{ width: "14px", height: "14px" }} />
                <span>Add Knowledge</span>
              </Link>
            </div>
          )}

          {/* Card: + New Capture */}
          {recentObjects.length > 0 && (
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
          )}
        </div>
      </div>

      {/* 3. Knowledge Map Section */}
      <div>
        <KnowledgeMap />
      </div>

      {/* 4. Active Initiatives & Focus Goals */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Target style={{ width: "16px", height: "16px", color: "var(--text-primary)" }} />
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Active Goals & Focus Initiatives
            </h2>
          </div>
          <Link
            href="/goals"
            style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", textDecoration: "underline" }}
          >
            Manage Goals
          </Link>
        </div>

        {isLoadingWork ? (
          <div style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
            Loading workspace initiatives...
          </div>
        ) : activeGoals.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {activeGoals.slice(0, 3).map((goal) => {
              const tasks = goal.tasks || [];
              const completedTasks = tasks.filter((t) => t.completed).length;
              const progressPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

              return (
                <Link
                  key={goal.id}
                  href="/goals"
                  style={{
                    background: "var(--surface)",
                    borderRadius: "16px",
                    border: "1px solid var(--border)",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "8px",
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "#10B981",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Target style={{ width: "14px", height: "14px" }} />
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "#10B981",
                        }}
                      >
                        ACTIVE
                      </span>
                    </div>

                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      {tasks.length > 0 ? `${completedTasks}/${tasks.length} tasks` : "Ongoing"}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {goal.description}
                  </h3>

                  {/* Progress Bar */}
                  {tasks.length > 0 && (
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
                          width: `${progressPct}%`,
                          height: "100%",
                          borderRadius: "2px",
                          background: "#10B981",
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "var(--text-tertiary)",
                      marginTop: "auto",
                      paddingTop: "6px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span>{goal.category ? goal.category.toUpperCase() : "GENERAL"}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "var(--text-secondary)", fontWeight: 600 }}>
                      View roadmap ➔
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "24px 20px",
              borderRadius: "16px",
              border: "1px dashed var(--border-strong)",
              background: "var(--surface-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                No active strategic goals set
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "4px 0 0 0" }}>
                Ask QueryMind in chat to generate goals from your documents, or create them manually.
              </p>
            </div>
            <Link
              href="/goals"
              style={{
                padding: "8px 16px",
                borderRadius: "9999px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-primary)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <Plus style={{ width: "13px", height: "13px" }} />
              <span>New Goal</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
