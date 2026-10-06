"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Trash2, RefreshCw, Layers, ArrowRight, Target, CheckCircle2 } from "lucide-react";
import { queryMindApi, ProjectData } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await queryMindApi.getProjects(activeSpaceId || undefined);
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Error fetching projects from API", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [activeSpaceId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await queryMindApi.createProject({
        name: newProjectName.trim(),
        space_id: activeSpaceId || (spaces[0]?.id || "default"),
      });
      setProjects((prev) => [created, ...prev]);
      setNewProjectName("");
    } catch {
      // Local fallback
      const localProject: ProjectData = {
        id: `proj-${Date.now()}`,
        name: newProjectName.trim(),
        space_id: activeSpaceId || "default",
        status: "active",
        created_at: new Date().toISOString(),
      };
      setProjects((prev) => [localProject, ...prev]);
      setNewProjectName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await queryMindApi.deleteProject(id);
    } catch {
      // Ignore
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "980px", margin: "0 auto", width: "100%" }}>
      {/* 1. Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px",
              borderRadius: "9999px",
              background: "rgba(59, 130, 246, 0.12)",
              color: "#60A5FA",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            <FolderKanban style={{ width: "13px", height: "13px" }} />
            <span>Workspace Initiatives</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
            Active Projects & Initiatives
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Group your research, documents, strategic milestones, and outcomes into structured initiatives.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={fetchProjects}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <RefreshCw style={{ width: "14px", height: "14px" }} />
            <span>Sync</span>
          </button>

          <Link
            href="/goals"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <Target style={{ width: "14px", height: "14px" }} />
            <span>View Goals</span>
          </Link>
        </div>
      </div>

      {/* 2. Create Project Form */}
      <form
        onSubmit={handleCreateProject}
        style={{
          display: "flex",
          gap: "10px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "8px 10px",
          borderRadius: "14px",
        }}
      >
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="Enter a new project name (e.g. Compiler Design Engine, Exam Preparation)..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "14px",
            padding: "8px 10px",
          }}
        />
        <button
          type="submit"
          disabled={isSubmitting || !newProjectName.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 18px",
            borderRadius: "10px",
            background: "var(--text-primary)",
            color: "var(--bg-app, #000000)",
            fontWeight: 700,
            fontSize: "13px",
            border: "none",
            cursor: isSubmitting || !newProjectName.trim() ? "not-allowed" : "pointer",
            opacity: isSubmitting || !newProjectName.trim() ? 0.5 : 1,
            transition: "all 150ms ease",
          }}
        >
          <Plus style={{ width: "15px", height: "15px" }} />
          <span>Add Project</span>
        </button>
      </form>

      {/* 3. Projects Grid */}
      {isLoading ? (
        <div style={{ padding: "48px", textAlign: "center", fontSize: "14px", color: "var(--text-tertiary)" }}>
          Loading real-time projects...
        </div>
      ) : projects.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {projects.map((p) => (
            <div
              key={p.id}
              style={{
                padding: "18px",
                borderRadius: "16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                transition: "all 150ms ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#60A5FA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FolderKanban style={{ width: "18px", height: "18px" }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {p.name}
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "3px 0 0 0" }}>
                      Created {new Date(p.created_at || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteProject(p.id)}
                  title="Delete project"
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
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#EF4444")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
                >
                  <Trash2 style={{ width: "15px", height: "15px" }} />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#10B981",
                  }}
                >
                  <CheckCircle2 style={{ width: "13px", height: "13px" }} />
                  <span>Status: {p.status || "active"}</span>
                </div>

                <Link
                  href="/goals"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    textDecoration: "none",
                  }}
                >
                  <span>Goals</span>
                  <ArrowRight style={{ width: "13px", height: "13px" }} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "48px 24px",
            borderRadius: "20px",
            border: "1px dashed var(--border-strong)",
            background: "var(--surface)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "var(--surface-hover)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-tertiary)",
            }}
          >
            <FolderKanban style={{ width: "24px", height: "24px" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              No projects created yet
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", maxWidth: "420px", margin: "6px 0 0 0" }}>
              Create your first project above to group your syllabus, study roadmaps, documents, and strategic goals.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
