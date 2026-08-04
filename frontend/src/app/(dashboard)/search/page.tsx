"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Search as SearchIcon, Sparkles, FileText, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <>
      <Navbar title="Semantic Search" subtitle="Search across all your knowledge" />

      <div className="p-6 space-y-8">
        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your documents..."
              className="w-full pl-14 pr-5 py-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all text-lg"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs">
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                AI-Powered
              </span>
            </div>
          </div>
        </motion.div>

        {/* Suggestion chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto"
        >
          {[
            "What topics have I studied?",
            "Find my notes about AI",
            "Documents about databases",
            "Recent uploads about React",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-sm text-slate-400 hover:border-indigo-500/30 hover:text-white transition-all"
            >
              {suggestion}
            </button>
          ))}
        </motion.div>

        {/* Empty / results area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-slate-800/30 flex items-center justify-center mb-6">
            <SearchIcon className="w-12 h-12 text-slate-600" />
          </div>
          <p className="text-lg font-medium text-slate-400">
            Search your entire knowledge base
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Use natural language to find information across all your documents.
            No keywords needed — just ask!
          </p>
        </motion.div>
      </div>
    </>
  );
}
