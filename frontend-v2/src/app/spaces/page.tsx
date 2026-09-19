"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Space } from "@/types/api";
import { CreateSpaceDialog } from "@/components/modals/CreateSpaceDialog";
import {
  SPACE_ARCHETYPES,
  SpaceArchetypeId,
  getSpaceArchetype,
} from "@/lib/spaces/spaceArchetypes";
import {
  Plus,
  ArrowRight,
  Search,
  BookOpen,
  CheckCircle2,
  Brain,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronRight,
  Zap,
} from "lucide-react";

export default function SpacesDirectoryPage() {
  const { spaces, currentSpace, setCurrentSpace, refreshSpaces } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | SpaceArchetypeId>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createArchetype, setCreateArchetype] = useState<SpaceArchetypeId>("study");

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
    <div className="min-h-screen w-screen bg-[#07070a] text-slate-100 flex flex-col select-none font-sans antialiased overflow-y-auto">
      {/* Top Header */}
      <header className="h-16 px-8 border-b border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
            M
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Domain Workspaces</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                DIRECTORY
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Isolated sovereign contexts for tasks, academic study, and deep research
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openCreateWithArchetype("study")}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Domain Space</span>
        </button>
      </header>

      {/* Main Directory Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 pb-16 space-y-8">
        {/* Quick Launch Template Strip */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white tracking-tight">
              Launch Task-Specific Template
            </span>
            <span className="text-[11px] text-slate-500">
              Pre-configured with domain axioms and specialized reasoning personas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {(["study", "tasks", "research", "executive"] as SpaceArchetypeId[]).map((typeId) => {
              const item = SPACE_ARCHETYPES[typeId];

              return (
                <div
                  key={typeId}
                  onClick={() => openCreateWithArchetype(typeId)}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-4.5 space-y-3 hover:border-white/25 hover:bg-[#10111a] transition-all cursor-pointer group shadow-xs relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-lg border border-white/[0.08]"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      {item.icon}
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold"
                      style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                        borderColor: `${item.color}30`,
                      }}
                    >
                      {item.id}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                    <span>1-Click Launch</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Directory Search & Filter Sub-Bar */}
        <div className="pt-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#12131b] border border-white/[0.08] rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "all"
                    ? "bg-white/[0.12] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Spaces ({spaces.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("study")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "study"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>📚</span>
                <span>Study & Academics</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("tasks")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "tasks"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>⚡</span>
                <span>Tasks & Execution</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("research")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "research"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🔬</span>
                <span>Deep Research</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("executive")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedFilter === "executive"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>💼</span>
                <span>Executive</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                className="w-full bg-[#12131c] text-xs text-white placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-xl border border-white/[0.08] focus:border-white/20 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Spaces Cards Grid */}
          {filteredSpaces.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-3 bg-[#0c0d14]/40">
              <div className="text-3xl">🛸</div>
              <div className="text-sm font-semibold text-white">No spaces found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No spaces match your filter. Launch a new space tailored for your specific task or study subject.
              </p>
              <button
                type="button"
                onClick={() => openCreateWithArchetype(selectedFilter === "all" ? "study" : selectedFilter)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Launch Space</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {filteredSpaces.map((sp) => {
                const isCurrent = currentSpace?.id === sp.id;
                const archetype = getSpaceArchetype(sp);

                return (
                  <div
                    key={sp.id}
                    className={`rounded-2xl border bg-[#0c0d14] p-5 flex flex-col justify-between space-y-4 hover:border-white/25 hover:bg-[#0f1019] transition-all shadow-xs relative group ${
                      isCurrent
                        ? "border-indigo-500/40 ring-1 ring-indigo-500/20"
                        : "border-white/[0.07]"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border border-white/10 shrink-0 shadow-sm"
                            style={{ backgroundColor: `${sp.color || archetype.color}20` }}
                          >
                            {sp.icon || archetype.icon}
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
                          className="px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold shrink-0"
                          style={{
                            backgroundColor: `${archetype.color}15`,
                            color: archetype.color,
                            borderColor: `${archetype.color}30`,
                          }}
                        >
                          {archetype.badge.split(" ")[0]}
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
                        <span>{isCurrent ? "Active Space" : "Sovereign Context"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/spaces/${sp.id}/conversations`}
                          onClick={() => setCurrentSpace(sp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                          title="Open Sessions"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/spaces/${sp.id}`}
                          onClick={() => setCurrentSpace(sp)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#09090b] hover:bg-slate-200 transition-colors"
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
