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
    <div className="h-screen w-screen bg-[#08090d] text-zinc-100 flex overflow-hidden select-none font-sans antialiased">
      {/* 1. Primary Command Sidebar */}
      <CommandSidebar
        spaceId={activeSpaceId}
        space={activeSpace}
        spaces={spaces}
      />

      {/* 2. Main Workspaces Substrate */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#08090d] ambient-mesh">
        {/* Executive Header Bar */}
        <header className="h-14 px-6 md:px-10 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#08090d]/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-semibold tracking-tight flex items-center gap-2.5">
              <span className="gradient-text-brand">Workspaces</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                {spaces.length} spaces
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-52 sm:w-72 group">
              <Search className="w-3.5 h-3.5 text-zinc-500 group-focus-within:text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                className="w-full bg-white/[0.03] text-xs text-zinc-200 placeholder-zinc-500 pl-8 pr-3 py-2 rounded-xl border border-white/[0.08] focus:border-indigo-500/40 focus:bg-white/[0.05] focus:outline-hidden transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => openCreateWithArchetype("study")}
              className="btn-primary-glow flex items-center gap-1.5 px-4 py-2 text-xs font-medium cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Workspace</span>
            </button>
          </div>
        </header>

        {/* Content Body - Full Width Grid */}
        <div className="flex-1 p-6 md:p-8 xl:px-12 pb-20 max-w-[1700px] mx-auto w-full space-y-6 min-w-0 relative z-[1]">
          {/* Domain Filter Pills with Rich Accents */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3 animate-fade-in-up">
            <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "all"
                    ? "bg-white/10 text-white shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                All ({spaces.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("study")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  selectedFilter === "study"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-zinc-400 hover:text-amber-300"
                }`}
              >
                Study
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("tasks")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  selectedFilter === "tasks"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-zinc-400 hover:text-emerald-300"
                }`}
              >
                Tasks & Sprint
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("research")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  selectedFilter === "research"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-zinc-400 hover:text-cyan-300"
                }`}
              >
                Research
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("executive")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  selectedFilter === "executive"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-zinc-400 hover:text-purple-300"
                }`}
              >
                Executive
              </button>
            </div>

            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
              Showing {filteredSpaces.length} of {spaces.length} spaces
            </span>
          </div>

          {/* Primary Workspaces Grid: 1 to 4 Columns */}
          {filteredSpaces.length === 0 ? (
            <div className="p-12 rounded-xl border border-dashed border-white/[0.08] text-center space-y-2.5 bg-[#0d0e15]">
              <div className="text-xs font-medium text-zinc-200">No workspaces match your filter</div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Create a new sovereign space with tailored grounding documents and axioms.
              </p>
              <button
                type="button"
                onClick={() => openCreateWithArchetype(selectedFilter === "all" ? "study" : selectedFilter)}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Space</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
              {filteredSpaces.map((sp) => {
                const isCurrent = currentSpace?.id === sp.id;
                const archetype = getSpaceArchetype(sp);
                const initial = sp.name ? sp.name.trim().slice(0, 2).toUpperCase() : "WS";
                const glowClass = archetype.id === 'study' ? 'hover-glow-amber' : archetype.id === 'tasks' ? 'hover-glow-emerald' : archetype.id === 'research' ? 'hover-glow-sky' : 'hover-glow-purple';

                return (
                  <div
                    key={sp.id}
                    className={`glass-card-glow p-5 flex flex-col justify-between space-y-4 relative group ${glowClass} ${
                      isCurrent
                        ? "border-indigo-500/40 ring-1 ring-indigo-500/15"
                        : ""
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Card Header: Monogram, Title, Domain Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Monogram Badge */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-mono font-bold border shrink-0 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
                            style={{
                              backgroundColor: `${archetype.color}12`,
                              borderColor: `${archetype.color}30`,
                              color: archetype.color,
                              boxShadow: `0 0 20px ${archetype.color}10`,
                            }}
                          >
                            {sp.icon || archetype.icon || initial}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors truncate">
                              {sp.name}
                            </h3>
                            <div className="text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
                              <span>/{sp.slug || "space"}</span>
                              {sp.is_default && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-400">default</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold shrink-0 border"
                          style={{
                            backgroundColor: `${archetype.color}12`,
                            color: archetype.color,
                            borderColor: `${archetype.color}30`,
                          }}
                        >
                          {archetype.id}
                        </span>
                      </div>

                      {/* Card Description */}
                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                        {sp.description || archetype.description}
                      </p>

                      {/* Domain Capabilities Pill Strip */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-zinc-400">
                          {archetype.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-zinc-500">
                          Axiom Grounded
                        </span>
                      </div>
                    </div>

                    {/* Card Footer with Status & Links */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrent ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                          }`}
                        />
                        <span>{isCurrent ? "Active Node" : "Available"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/spaces/${sp.id}/conversations`}
                          onClick={() => setCurrentSpace(sp)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          Chat
                        </Link>
                        <Link
                          href={`/spaces/${sp.id}/tasks`}
                          onClick={() => setCurrentSpace(sp)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          Tasks
                        </Link>
                        <Link
                          href={`/spaces/${sp.id}`}
                          onClick={() => setCurrentSpace(sp)}
                          className="btn-white-premium px-3 py-1.5 text-xs flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Template Strip */}
          <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 tracking-tight">
                Quick Starters by Domain
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Pre-configured with domain axioms and reasoning agents
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
              {(["study", "tasks", "research", "executive"] as SpaceArchetypeId[]).map((typeId) => {
                const item = SPACE_ARCHETYPES[typeId];
                const glowClass = typeId === 'study' ? 'hover-glow-amber' : typeId === 'tasks' ? 'hover-glow-emerald' : typeId === 'research' ? 'hover-glow-sky' : 'hover-glow-purple';

                return (
                  <button
                    key={typeId}
                    type="button"
                    onClick={() => openCreateWithArchetype(typeId)}
                    className={`glass-card p-4 text-left group cursor-pointer space-y-2 ${glowClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate leading-relaxed transition-colors">
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
