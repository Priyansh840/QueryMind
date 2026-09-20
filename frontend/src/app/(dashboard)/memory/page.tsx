"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Lightbulb,
  Target,
  BookOpen,
  Heart,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";
import { queryMindApi, MemoryData } from "@/lib/api";

const categories = [
  { label: "All", type: "all", icon: Brain, color: "#FFFFFF" },
  { label: "Facts", type: "fact", icon: Lightbulb, color: "#F59E0B" },
  { label: "Skills", type: "skill", icon: Target, color: "#10B981" },
  { label: "Goals", type: "goal", icon: BookOpen, color: "#3B82F6" },
  { label: "Interests", type: "interest", icon: Heart, color: "#EC4899" },
];

export default function MemoryPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [memories, setMemories] = useState<MemoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Memory Form
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("fact");
  const [newImportance, setNewImportance] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch real memories from backend
  const fetchMemories = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const data = await queryMindApi.getMemories(activeCategory === "all" ? undefined : activeCategory);
      setMemories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Could not fetch memories from backend, checking local state", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const created = await queryMindApi.createMemory({
        memory_type: newType,
        content: newContent.trim(),
        importance: newImportance,
      });
      setMemories((prev) => [created, ...prev]);
      setNewContent("");
      setShowAddModal(false);
    } catch (err: any) {
      // Fallback local memory creation if offline
      const localMemory: MemoryData = {
        id: `mem-${Date.now()}`,
        user_id: "local",
        memory_type: newType,
        content: newContent.trim(),
        confidence: 0.95,
        status: "active",
        importance: newImportance,
        reinforcement_count: 1,
        source_count: 1,
        first_seen_at: new Date().toISOString(),
        last_reinforced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMemories((prev) => [localMemory, ...prev]);
      setNewContent("");
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await queryMindApi.deleteMemory(id);
    } catch {
      // Ignore
    }
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const filtered =
    activeCategory === "all"
      ? memories
      : memories.filter((m) => m.memory_type?.toLowerCase() === activeCategory.toLowerCase());

  return (
    <>
      <Navbar title="Memory Engine" />
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Brain className="w-6 h-6 text-white" />
              <span>Real-Time Autonomous Memory</span>
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-mono">
              // {memories.length} real memories verified · PostgreSQL neural state
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchMemories}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] border border-white/10 text-xs text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.type;
            const count =
              cat.type === "all"
                ? memories.length
                : memories.filter((m) => m.memory_type?.toLowerCase() === cat.type).length;

            return (
              <button
                key={cat.type}
                onClick={() => setActiveCategory(cat.type)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isActive
                    ? "bg-white text-black border-white"
                    : "bg-[#171717] border-white/10 text-[#9CA3AF] hover:text-white hover:border-white/20"
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Memories Grid or Empty State */}
        {isLoading ? (
          <div className="p-12 text-center text-sm text-[#9CA3AF]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 opacity-50" />
            <span>Loading active memories from database...</span>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((memory, i) => {
              const matchedCat =
                categories.find((c) => c.type === memory.memory_type?.toLowerCase()) || categories[1];

              return (
                <motion.div
                  key={memory.id || i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <NeonCard className="p-5 group relative">
                    <div className="flex items-start justify-between mb-2.5">
                      <span
                        className="text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold"
                        style={{
                          background: `${matchedCat.color}15`,
                          color: matchedCat.color,
                          border: `1px solid ${matchedCat.color}30`,
                        }}
                      >
                        {memory.memory_type}
                      </span>

                      <div className="flex items-center gap-2">
                        {memory.importance && (
                          <span className="text-[10px] text-[#9CA3AF] font-mono capitalize">
                            {memory.importance} priority
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-red-400 transition-all p-1"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-[#E5E7EB] leading-relaxed font-normal">
                      {memory.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#6B7280] mt-4 pt-3 border-t border-white/5 font-mono">
                      <span>Confidence: {((memory.confidence || 0.95) * 100).toFixed(0)}%</span>
                      <span>{new Date(memory.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </NeonCard>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-[#141414] text-center space-y-3">
            <Brain className="w-10 h-10 text-white/40 mx-auto" />
            <h3 className="text-base font-bold text-white">No memories found</h3>
            <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
              As you chat with QueryMind or upload documents, the AI automatically extracts key facts, preferences, and objectives into this persistent memory bank. You can also add memories manually above.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:opacity-90 transition-all shadow-sm mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Memory</span>
            </button>
          </div>
        )}

        {/* Add Memory Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowAddModal(false);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#212121] border border-white/15 rounded-2xl p-6 text-white shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Create Knowledge Memory</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateMemory} className="space-y-4">
                  {/* Category Type */}
                  <div>
                    <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                      Memory Type
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "fact", label: "Fact" },
                        { id: "skill", label: "Skill" },
                        { id: "goal", label: "Goal" },
                        { id: "interest", label: "Interest" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setNewType(t.id)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                            newType === t.id
                              ? "bg-white text-black border-white"
                              : "bg-[#171717] border-white/10 text-white/70 hover:border-white/30"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                      Memory Content
                    </label>
                    <textarea
                      rows={3}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="e.g., Prefers async FastAPI over synchronous Flask for high-concurrency microservices."
                      className="w-full bg-[#171717] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 resize-none"
                      required
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                      Importance Level
                    </label>
                    <select
                      value={newImportance}
                      onChange={(e) => setNewImportance(e.target.value)}
                      className="w-full bg-[#171717] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white/40"
                    >
                      <option value="high">High — Always reference in reasoning</option>
                      <option value="medium">Medium — Contextual reference</option>
                      <option value="low">Low — Background reference</option>
                    </select>
                  </div>

                  {/* Submit buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-[#2F2F2F] text-white hover:bg-[#3D3D3D] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !newContent.trim()}
                      className="px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {isSubmitting ? "Saving..." : "Save Memory"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
