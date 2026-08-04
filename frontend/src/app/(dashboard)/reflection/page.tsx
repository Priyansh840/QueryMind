"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function ReflectionPage() {
  return (
    <>
      <Navbar title="Weekly Reflection" subtitle="AI-generated insights about your progress" />

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/10 flex items-center justify-center mb-6">
            <Sparkles className="w-12 h-12 text-amber-400/50" />
          </div>
          <p className="text-lg font-medium text-slate-400">
            No reflections yet
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            After a week of using QueryMind, AI will generate insights about
            what you&apos;ve learned, completed, and suggest what to focus on next.
          </p>
        </motion.div>
      </div>
    </>
  );
}
