"use client";

import { Bell, Search, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export default function Navbar({ title = "Dashboard", subtitle }: NavbarProps) {
  return (
    <header className="h-16 glass border-b border-slate-800/50 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Quick search */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 text-sm hover:border-indigo-500/30 transition-all"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Quick search...</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-700/50 text-slate-500">
            ⌘K
          </kbd>
        </motion.button>

        {/* New upload */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ai-pulse" />
        </motion.button>

        {/* User avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold cursor-pointer"
        >
          P
        </motion.div>
      </div>
    </header>
  );
}
