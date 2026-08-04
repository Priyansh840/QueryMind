"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Clock, FileText, MessageSquare, Brain, Upload } from "lucide-react";

export default function TimelinePage() {
  return (
    <>
      <Navbar title="Timeline" subtitle="Your activity history" />

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-slate-800/30 flex items-center justify-center mb-6">
            <Clock className="w-12 h-12 text-slate-600" />
          </div>
          <p className="text-lg font-medium text-slate-400">
            No activity yet
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Your timeline will show uploads, chats, and memories as you interact with QueryMind.
          </p>
        </motion.div>
      </div>
    </>
  );
}
