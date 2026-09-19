"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { CreateSpaceDialog } from "@/components/modals/CreateSpaceDialog";
import {
  SPACE_ARCHETYPES,
  SpaceArchetypeId,
  getSpaceArchetype,
} from "@/lib/spaces/spaceArchetypes";
import { Plus, Search, ArrowRight, MessageSquare, CheckSquare, BookOpen } from "lucide-react";

export default function SpacesDirectoryPage() {
  const { spaces, currentSpace, setCurrentSpace, refreshSpaces } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | SpaceArchetypeId>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createArchetype, setCreateArchetype] = useState<SpaceArchetypeId>("study");

  const activeSpace = currentSpace || spaces[0] || null;
  const activeSpaceId = activeSpace?.id || "";

  const openCreateWithArchetype = (archetypeId: SpaceArchetypeId) => {
    setCreateArchetype(archetypeId);
    setIsCreateOpen(true);
  };

  const handleSpaceCreated = (newSpace: Space) => {
    refreshSpaces();
    setCurrentSpace(newSpace);
    router.push(`/spaces/${newSpace.id}`);
  };

  // Filter Spaces
  const filteredSpaces = spaces.filter((space) => {
    const archetype = getSpaceArchetype(space);
    if (selectedFilter !== "all" && archetype.id !== selectedFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        space.name.toLowerCase().includes(q) ||
        (space.description || "").toLowerCase().includes(q) ||
        archetype.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="h-screen w-screen bg-[#07070a] text-[#f8fafc] flex overflow-hidden select-none font-sans">
      {/* 1. Primary Command Sidebar */}
      <CommandSidebar
        spaceId={activeSpaceId}
        space={activeSpace}
        spaces={spaces}
      />

      {/* 2. Main Workspaces Substrate */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Executive Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-[#07070a]/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-white">
              Workspaces
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/[0.05] text-slate-400 border border-white/[0.08]">
              {spaces.length} Sovereign Contexts
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter workspaces..."
                className="w-full bg-white/[0.04] text-xs text-white placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg border border-white/[0.07] focus:border-indigo-500/50 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => openCreateWithArchetype("study")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Workspace</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-8 pb-20 max-w-6xl mx-auto w-full space-y-7 min-w-0">
          {/* Domain Filter Pills */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-1 p-0.5 bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "all"
                    ? "bg-white/[0.1] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({spaces.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("study")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "study"
                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Study
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("tasks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "tasks"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Tasks
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("research")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "research"
                    ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Research
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("executive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "executive"
                    ? "bg-purple-500/20 text-purple-200 border border-purple-500/30 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Executive
              </button>
            </div>

            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              Showing {filteredSpaces.length} of {spaces.length}
            </span>
          </div>

          {/* Primary Workspaces Grid (Front and Center) */}
          {filteredSpaces.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-3 bg-[#0c0d14]">
              <div className="text-xs font-semibold text-white">No workspaces match your filter</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Launch a new sovereign workspace tailored for your specific task, study subject, or research topic.
              </p>
              <button
                type="button"
                onClick={() => openCreateWithArchetype(selectedFilter === "all" ? "study" : selectedFilter)}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Launch Workspace</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpaces.map((sp) => {
                const isCurrent = currentSpace?.id === sp.id;
                const archetype = getSpaceArchetype(sp);
                const initial = sp.name ? sp.name.trim().slice(0, 2).toUpperCase() : "WS";

                return (
                  <div
                    key={sp.id}
                    className={`rounded-2xl border bg-[#0c0d14] p-5 flex flex-col justify-between space-y-4 hover:border-white/[0.18] hover:bg-[#0f1019] transition-all shadow-xs relative group ${
                      isCurrent
                        ? "border-indigo-500/40 ring-1 ring-indigo-500/20"
                        : "border-white/[0.07]"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Sleek Monogram Badge */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold border border-white/10 shrink-0 text-slate-200"
                            style={{ backgroundColor: `${sp.color || archetype.color}20` }}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                              {sp.name}
                            </h3>
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              {sp.slug || "workspace"}
                            </div>
                          </div>
                        </div>

                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-mono uppercase font-semibold shrink-0"
                          style={{
                            backgroundColor: `${archetype.color}12`,
                            color: archetype.color,
                            borderColor: `${archetype.color}25`,
                          }}
                        >
                          {archetype.id}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {sp.description || archetype.description}
                      </p>
                    </div>

                    <div className="pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrent ? "bg-emerald-400" : "bg-slate-600"
                          }`}
                        />
                        <span>{isCurrent ? "Active" : "Sovereign"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/spaces/${sp.id}/conversations`}
                          onClick={() => setCurrentSpace(sp)}
                          className="px-2.5 py-1 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          Chat
                        </Link>
                        <Link
                          href={`/spaces/${sp.id}/tasks`}
                          onClick={() => setCurrentSpace(sp)}
                          className="px-2.5 py-1 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          Tasks
                        </Link>
                        <Link
                          href={`/spaces/${sp.id}`}
                          onClick={() => setCurrentSpace(sp)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-white text-[#09090b] hover:bg-slate-200 transition-colors"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Template Strip (Compact at bottom, not blocking the top) */}
          <div className="pt-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 tracking-tight">
                Quick Template Launchers
              </span>
              <span className="text-[11px] text-slate-500">
                Pre-configured with domain axioms and reasoning agents
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(["study", "tasks", "research", "executive"] as SpaceArchetypeId[]).map((typeId) => {
                const item = SPACE_ARCHETYPES[typeId];

                return (
                  <button
                    key={typeId}
                    type="button"
                    onClick={() => openCreateWithArchetype(typeId)}
                    className="p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all text-left group cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono group-hover:text-white transition-colors">
                        +
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Create Space Dialog */}
      <CreateSpaceDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleSpaceCreated}
        initialArchetype={createArchetype}
      />
    </div>
  );
}
