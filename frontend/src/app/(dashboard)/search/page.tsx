"use client";

import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import { motion } from "framer-motion";
import { Search as SearchIcon, Sparkles, FileText, ArrowRight, Clock, Zap } from "lucide-react";
import { useState } from "react";

const suggestions = [
  "How do transformers work?",
  "My notes on React patterns",
  "Compare supervised vs unsupervised learning",
  "What are my career goals?",
];

const mockResults = [
  { title: "Transformers Architecture Notes", source: "machine_learning_notes.pdf", relevance: 96, snippet: "The transformer architecture relies on self-attention mechanisms to process sequential data..." },
  { title: "Deep Learning Chapter 5 — Attention", source: "deep_learning_ch5.pdf", relevance: 89, snippet: "Attention allows the model to focus on relevant parts of the input sequence..." },
  { title: "Project Ideas — NLP Pipeline", source: "project_ideas.txt", relevance: 72, snippet: "Build a RAG-based knowledge assistant using embeddings and vector search..." },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  return (
    <>
      <Navbar title="Semantic Search" />
      <div className="p-6 space-y-6">
        {/* Search Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative">
            <div className="flex items-center gap-3 neon-input !p-0 !px-5 !py-4 !rounded-2xl border-pulse">
              <SearchIcon className="w-5 h-5 text-[#00f0ff]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setSearched(true); }}
                placeholder="Search your knowledge using natural language..."
                className="flex-1 bg-transparent outline-none text-base text-[#e0e7ff] placeholder:text-[#3d4270] font-[family-name:var(--font-mono)]"
              />
              <motion.button
                onClick={() => setSearched(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-white text-sm font-semibold shadow-[0_0_15px_rgba(0,240,255,0.2)]"
              >
                <Zap className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        {!searched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
            <p className="text-xs text-[#6b7294] font-[family-name:var(--font-mono)] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Suggested Queries
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); setSearched(true); }}
                  className="px-4 py-2 rounded-full bg-[#111128] border border-[rgba(0,240,255,0.08)] text-sm text-[#6b7294] hover:text-[#00f0ff] hover:border-[rgba(0,240,255,0.2)] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            <p className="text-xs text-[#6b7294] font-[family-name:var(--font-mono)]">
              // found {mockResults.length} results for &quot;{query || "transformers"}&quot;
            </p>
            {mockResults.map((result, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <NeonCard className="p-5 group cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/15 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[#a855f7]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#e0e7ff]">{result.title}</h3>
                        <p className="text-[10px] text-[#3d4270] font-[family-name:var(--font-mono)] flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" /> {result.source}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 rounded-full bg-[#111128] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] to-[#a855f7]"
                          style={{ width: `${result.relevance}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#00f0ff] font-[family-name:var(--font-mono)]">
                        {result.relevance}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[#6b7294] mt-3 leading-relaxed">{result.snippet}</p>
                </NeonCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
