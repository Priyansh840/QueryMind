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
    <div className="flex h-screen w-screen overflow-hidden bg-[#08080c] text-slate-100 font-sans">
      <CommandSidebar spaceId={spaceId} space={space} />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <header className="h-16 px-8 border-b border-white/[0.06] bg-[#0c0d12]/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-4">
            <Link
              href={`/spaces/${spaceId}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#818cf8]" />
                <span>Invariant Memory & Beliefs Ledger</span>
              </h1>
              <div className="text-xs text-slate-400 font-mono">
                {memories.length} Active Axioms • {concepts.length} Qdrant Vector Concepts
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 text-xs">
              {["all", "rule", "preference", "concept"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded capitalize transition-colors ${
                    filterType === type
                      ? "bg-white/10 text-white font-medium"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="max-w-5xl w-full mx-auto px-8 py-8 space-y-8">
          {/* Add New Axiom Form */}
          <div className="p-4 rounded-2xl bg-[#0e0f17] border border-white/[0.08] shadow-lg space-y-3">
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-[#818cf8]" />
              <span>Record New Invariant Principle or Rule</span>
            </div>
            <form onSubmit={handleAddMemory} className="flex flex-col gap-3">
              <textarea
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                placeholder="Type organizational axiom or invariant (e.g. 'Never deploy unverified schemas without rollback scripts')..."
                className="w-full bg-[#14141d] border border-white/[0.06] focus:border-[#818cf8]/50 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none h-20"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Type:</span>
                  <select
                    value={newMemoryType}
                    onChange={(e) => setNewMemoryType(e.target.value)}
                    className="bg-[#14141d] border border-white/[0.06] text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
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
                  className="px-4 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium transition-colors disabled:opacity-40"
                >
                  {isAdding ? "Recording..." : "Add Axiom"}
                </button>
              </div>
            </form>
          </div>

          {/* Memories Ledger */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Retained Space Principles ({filteredMemories.length})
            </div>

            <div className="space-y-2.5">
              {filteredMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-4 rounded-xl bg-[#0c0d13] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-start justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#818cf8]/15 text-[#818cf8]">
                        {mem.memory_type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.round(mem.confidence * 100)}% Confidence
                      </span>
                      {mem.reinforcement_count ? (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          • Reinforced {mem.reinforcement_count}x
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {mem.content}
                    </p>
                  </div>

                  <button
                    onClick={() => handleReinforce(mem.id)}
                    disabled={reinforcingId === mem.id}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-[#818cf8] hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
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
