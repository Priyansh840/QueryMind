"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import { MemoryItem, KnowledgeItem, Space } from "@/types/api";
import {
  Bookmark,
  Sparkles,
  Plus,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Cpu,
  ArrowLeft,
  Filter,
} from "lucide-react";

export default function SpaceMemoryPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const { currentSpace, spaces } = useAuth();
  const space = spaces.find((s) => s.id === spaceId) || currentSpace;

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [concepts, setConcepts] = useState<KnowledgeItem[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [newMemoryText, setNewMemoryText] = useState("");
  const [newMemoryType, setNewMemoryType] = useState("rule");
  const [isAdding, setIsAdding] = useState(false);
  const [reinforcingId, setReinforcingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [memsRes, knowRes] = await Promise.all([
        apiClient<MemoryItem[]>(`/api/v1/memories?space_id=${spaceId}`).catch(() => []),
        apiClient<KnowledgeItem[]>(`/api/v1/knowledge?space_id=${spaceId}`).catch(() => []),
      ]);
      setMemories(memsRes || []);
      setConcepts(knowRes || []);
    } catch (err) {
      console.error("Failed to load memory data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spaceId]);

  const handleReinforce = async (memoryId: string) => {
    if (reinforcingId) return;
    setReinforcingId(memoryId);
    try {
      await apiClient(`/api/v1/memories/${memoryId}/reinforce`, { method: "POST" });
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId
            ? { ...m, reinforcement_count: (m.reinforcement_count || 0) + 1 }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to reinforce memory:", err);
    } finally {
      setReinforcingId(null);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await apiClient("/api/v1/memories", {
        method: "POST",
        body: JSON.stringify({
          content: newMemoryText.trim(),
          space_id: spaceId,
          memory_type: newMemoryType,
          importance: "high",
        }),
      });
      setNewMemoryText("");
      loadData();
    } catch (err) {
      console.error("Failed to add memory:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const filteredMemories =
    filterType === "all"
      ? memories
      : memories.filter((m) => m.memory_type.toLowerCase() === filterType.toLowerCase());

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#08090d] text-zinc-100 font-sans antialiased select-none">
      <CommandSidebar spaceId={spaceId} space={space} />

      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#08090d] ambient-mesh">
        {/* Header */}
        <header className="h-14 px-6 md:px-8 xl:px-12 border-b border-white/[0.06] bg-[#08090d]/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <Bookmark className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white tracking-tight truncate flex items-center gap-2">
                <span>Invariant Memory & Beliefs</span>
              </h1>
              <p className="text-[11px] text-zinc-400 truncate">
                {memories.length} axioms · {concepts.length} grounded concepts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-[#0d0e15] border border-white/[0.06] rounded-lg text-xs">
              {["all", "rule", "preference", "concept"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                    filterType === type
                      ? "bg-white/10 text-white font-medium"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="max-w-5xl w-full mx-auto px-6 md:px-8 xl:px-12 py-8 space-y-6 relative z-[1]">
          {/* Add New Axiom Form */}
          <div className="glass-card p-4 space-y-3 animate-fade-in-up">
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Record New Invariant Principle or Rule</span>
            </div>
            <form onSubmit={handleAddMemory} className="flex flex-col gap-3">
              <textarea
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                placeholder="Type organizational axiom or invariant (e.g. 'Never deploy unverified schemas without rollback scripts')..."
                className="w-full bg-[#08090d] border border-white/[0.08] focus:border-white/20 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden resize-none h-20"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400">Type:</span>
                  <select
                    value={newMemoryType}
                    onChange={(e) => setNewMemoryType(e.target.value)}
                    className="bg-[#08090d] border border-white/[0.08] text-zinc-200 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden"
                  >
                    <option value="rule">Rule</option>
                    <option value="preference">Preference</option>
                    <option value="concept">Concept</option>
                    <option value="axiom">Axiom</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!newMemoryText.trim() || isAdding}
                  className="btn-white-premium px-3.5 py-1.5 text-xs font-medium disabled:opacity-40 cursor-pointer"
                >
                  {isAdding ? "Recording..." : "Add Axiom"}
                </button>
              </div>
            </form>
          </div>

          {/* Memories Ledger */}
          <div className="space-y-3">
            <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">
              Retained Space Principles ({filteredMemories.length})
            </div>

            <div className="space-y-2.5 stagger-children">
              {filteredMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="glass-card p-4 flex items-start justify-between gap-4 hover-glow-amber"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {mem.memory_type}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {Math.round(mem.confidence * 100)}%
                      </span>
                      {mem.reinforcement_count ? (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          · {mem.reinforcement_count}x reinforced
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed">
                      {mem.content}
                    </p>
                  </div>

                  <button
                    onClick={() => handleReinforce(mem.id)}
                    disabled={reinforcingId === mem.id}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{reinforcingId === mem.id ? "Reinforced" : "Reinforce"}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
