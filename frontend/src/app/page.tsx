"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap,
  Brain,
  Search,
  Upload,
  MessageSquare,
  Shield,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Knowledge Vault",
    description: "Upload PDFs, DOCX, images, and text files. AI extracts, chunks, and indexes everything automatically.",
    color: "indigo",
  },
  {
    icon: MessageSquare,
    title: "AI Chat (RAG)",
    description: "Ask questions about your documents. Get accurate answers with citations pointing to exact sources.",
    color: "cyan",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Search using natural language. No keywords needed — just describe what you're looking for.",
    color: "purple",
  },
  {
    icon: Brain,
    title: "Memory Engine",
    description: "QueryMind remembers your preferences, goals, skills, and interests across every conversation.",
    color: "emerald",
  },
  {
    icon: Shield,
    title: "Spaces",
    description: "Isolated knowledge spaces for different areas of your life. No cross-contamination.",
    color: "amber",
  },
  {
    icon: Sparkles,
    title: "AI Agents",
    description: "Specialized AI agents for planning, research, writing, and coding — working together.",
    color: "rose",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-20 h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">QueryMind</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-white transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 lg:px-20 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Second Brain
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold leading-tight max-w-4xl mx-auto">
            <span className="text-white">Your </span>
            <span className="gradient-text">AI Second Brain</span>
            <br />
            <span className="text-white">That Actually </span>
            <span className="gradient-text">Remembers</span>
          </h1>

          <p className="text-lg text-slate-400 mt-6 max-w-2xl mx-auto leading-relaxed">
            Upload documents, ask questions, and let AI organize your knowledge.
            QueryMind builds a personal knowledge graph that grows smarter with
            every interaction.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center gap-2"
              >
                Launch Dashboard
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <a
              href="https://github.com/Priyansh840/QueryMind"
              target="_blank"
              rel="noopener noreferrer"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-white font-medium hover:border-slate-600 transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub
              </motion.button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 lg:px-20 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            Everything Your Brain Needs
          </h2>
          <p className="text-slate-400 mt-3 max-w-lg mx-auto">
            A complete AI-powered knowledge management system designed to think
            the way you think.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6"
            >
              <div
                className={`w-12 h-12 rounded-2xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 flex items-center justify-center mb-4`}
              >
                <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 px-6 lg:px-20 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-slate-500">
              QueryMind © 2026 — Built with ❤️
            </span>
          </div>
          <a
            href="https://github.com/Priyansh840/QueryMind"
            className="text-sm text-slate-500 hover:text-white transition-all"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
