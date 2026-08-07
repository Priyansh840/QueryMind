"use client";

import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import { motion } from "framer-motion";
import { Brain, Lightbulb, Target, BookOpen, Heart, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const categories = [
  { label: "All", icon: Brain, color: "#00f0ff" },
  { label: "Facts", icon: Lightbulb, color: "#f97316" },
  { label: "Skills", icon: Target, color: "#a855f7" },
  { label: "Goals", icon: BookOpen, color: "#22d3ee" },
  { label: "Interests", icon: Heart, color: "#f472b6" },
];

const mockMemories = [
  { category: "Facts", text: "Prefers Python over JavaScript for backend development", confidence: 95, source: "Chat #42" },
  { category: "Skills", text: "Proficient in React, Next.js, and Tailwind CSS", confidence: 90, source: "Profile" },
  { category: "Goals", text: "Building an AI-powered second brain application", confidence: 98, source: "Chat #1" },
  { category: "Interests", text: "Fascinated by transformer architectures and attention mechanisms", confidence: 85, source: "Chat #23" },
  { category: "Facts", text: "Currently a computer science student", confidence: 92, source: "Profile" },
  { category: "Goals", text: "Learn Rust for systems programming", confidence: 78, source: "Chat #38" },
  { category: "Skills", text: "Experienced with Docker and containerized deployments", confidence: 88, source: "Chat #15" },
  { category: "Interests", text: "Enjoys reading about neuroscience and memory systems", confidence: 80, source: "Chat #31" },
];

export default function MemoryPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? mockMemories
      : mockMemories.filter((m) => m.category === activeCategory);

  const catColor = categories.find((c) => c.label === activeCategory)?.color || "#00f0ff";

  return (
    <>
      <Navbar title="Memory Engine" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-[#6b7294] font-[family-name:var(--font-mono)]">
            // {mockMemories.length} memories indexed · neural pathways active
          </p>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 flex-wrap"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? "text-[#e0e7ff]"
                    : "bg-transparent border-[rgba(100,116,180,0.08)] text-[#6b7294] hover:text-[#e0e7ff] hover:border-[rgba(0,240,255,0.15)]"
                }`}
                style={
                  isActive
                    ? {
                        background: `${cat.color}10`,
                        borderColor: `${cat.color}30`,
                        color: cat.color,
                        boxShadow: `0 0 15px ${cat.color}15`,
                      }
                    : undefined
                }
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </motion.div>

        {/* Memory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((memory, i) => {
            const cat = categories.find((c) => c.label === memory.category);
            const color = cat?.color || "#00f0ff";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <NeonCard className="p-5 group">
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full font-[family-name:var(--font-mono)] uppercase tracking-wider"
                      style={{
                        background: `${color}10`,
                        color: color,
                        border: `1px solid ${color}20`,
                      }}
                    >
                      {memory.category}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-1 rounded hover:bg-[rgba(0,240,255,0.06)]">
                        <Pencil className="w-3 h-3 text-[#3d4270]" />
                      </button>
                      <button className="p-1 rounded hover:bg-[rgba(244,114,182,0.06)]">
                        <Trash2 className="w-3 h-3 text-[#3d4270]" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[#e0e7ff] leading-relaxed">{memory.text}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(100,116,180,0.06)]">
                    <span className="text-[10px] text-[#3d4270] font-[family-name:var(--font-mono)]">
                      Source: {memory.source}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-12 rounded-full bg-[#111128] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${memory.confidence}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-[family-name:var(--font-mono)]" style={{ color }}>
                        {memory.confidence}%
                      </span>
                    </div>
                  </div>
                </NeonCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
