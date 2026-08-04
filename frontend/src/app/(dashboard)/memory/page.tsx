"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Brain, Lightbulb, Target, BookOpen, Heart, Pencil, Trash2, Filter } from "lucide-react";

const memoryCategories = [
  { label: "All", icon: Brain, count: 0 },
  { label: "Facts", icon: BookOpen, count: 0 },
  { label: "Skills", icon: Lightbulb, count: 0 },
  { label: "Goals", icon: Target, count: 0 },
  { label: "Interests", icon: Heart, count: 0 },
];

export default function MemoryPage() {
  return (
    <>
      <Navbar title="Memory Engine" subtitle="What QueryMind knows about you" />

      <div className="p-6 space-y-6">
        {/* Category tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 overflow-x-auto pb-2"
        >
          {memoryCategories.map((cat, i) => (
            <button
              key={cat.label}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                i === 0
                  ? "bg-indigo-500/15 border border-indigo-500/25 text-indigo-400"
                  : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
              <span className="px-1.5 py-0.5 rounded-full bg-slate-700/50 text-[10px]">
                {cat.count}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Empty state */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/10 flex items-center justify-center mb-6">
            <Brain className="w-12 h-12 text-purple-400/50" />
          </div>
          <p className="text-lg font-medium text-slate-400">
            No memories yet
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            QueryMind automatically learns about you from your chats and
            documents. Start a conversation to build your memory!
          </p>
        </motion.div>
      </div>
    </>
  );
}
