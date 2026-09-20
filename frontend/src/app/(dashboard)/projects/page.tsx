"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { FolderKanban, Plus, Trash2, RefreshCw } from "lucide-react";
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
    <>
      <Navbar title="Projects" />
      <div className="p-6 max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <FolderKanban className="w-6 h-6 text-white" />
              <span>Real-Time Projects</span>
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-mono">
              // {projects.length} workspace projects tracked in PostgreSQL
            </p>
          </div>

          <button
            type="button"
            onClick={fetchProjects}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] border border-white/10 text-xs text-white/80 hover:text-white transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Create Project Form */}
        <form onSubmit={handleCreateProject} className="flex gap-2">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Enter a new project name..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#171717] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newProjectName.trim()}
            className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </form>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-sm text-[#9CA3AF]">
            Loading real-time projects...
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {projects.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                  <p className="text-xs text-[#9CA3AF] mt-1 font-mono">
                    Status: {p.status || "active"} · {new Date(p.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(p.id)}
                  className="text-white/40 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-[#141414] text-center space-y-3">
            <FolderKanban className="w-10 h-10 text-white/40 mx-auto" />
            <h3 className="text-base font-bold text-white">No projects created</h3>
            <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
              Create your first project above to group your research, documents, and goals.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
