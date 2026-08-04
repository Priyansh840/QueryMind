"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import {
  FolderOpen,
  MessageSquare,
  Brain,
  Upload,
  TrendingUp,
  Zap,
  ArrowRight,
  FileText,
  Clock,
} from "lucide-react";

const stats = [
  { label: "Documents", value: "0", icon: FolderOpen, color: "from-indigo-500 to-indigo-600" },
  { label: "Conversations", value: "0", icon: MessageSquare, color: "from-cyan-500 to-cyan-600" },
  { label: "Memories", value: "0", icon: Brain, color: "from-purple-500 to-purple-600" },
  { label: "Vectors", value: "0", icon: TrendingUp, color: "from-emerald-500 to-emerald-600" },
];

const quickActions = [
  { label: "Upload Document", icon: Upload, href: "/vault", color: "indigo" },
  { label: "Start Chat", icon: MessageSquare, href: "/chat", color: "cyan" },
  { label: "Search Knowledge", icon: Zap, href: "/search", color: "purple" },
];

export default function DashboardPage() {
  return (
    <>
      <Navbar title="Dashboard" subtitle="Welcome back, Priyansh" />

      <div className="p-6 space-y-6">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-white">
            Good evening! <span className="text-3xl">👋</span>
          </h2>
          <p className="text-slate-400 mt-1">
            Here&apos;s what&apos;s happening with your second brain today.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <a key={action.label} href={action.href}>
                <div className="glass-card p-5 group cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl bg-${action.color}-500/10 border border-${action.color}-500/20 flex items-center justify-center`}
                    >
                      <action.icon className={`w-5 h-5 text-${action.color}-400`} />
                    </div>
                    <span className="font-medium text-white">{action.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity + AI Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Recent Activity
            </h3>
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No recent activity yet</p>
              <p className="text-xs mt-1">Upload your first document to get started!</p>
            </div>
          </motion.div>

          {/* AI Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              AI Suggestions
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 ai-pulse" />
                <div>
                  <p className="text-sm text-white">Upload your first document</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Start building your knowledge base by uploading a PDF, DOCX, or text file.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5" />
                <div>
                  <p className="text-sm text-white">Try the AI Chat</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ask questions about your uploaded documents and get AI-powered answers.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
