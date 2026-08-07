"use client";

import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Brain, FileText, MessageSquare, Target, Lightbulb } from "lucide-react";

const insights = [
  {
    title: "Most Active Topic",
    value: "Machine Learning",
    detail: "15 documents, 42 chats, 23 memories related to ML",
    icon: TrendingUp,
    color: "#00f0ff",
  },
  {
    title: "Learning Pattern",
    value: "Deep Diver",
    detail: "You tend to deeply explore topics rather than skimming across many",
    icon: Brain,
    color: "#a855f7",
  },
  {
    title: "Knowledge Growth",
    value: "+34% this week",
    detail: "You've added 12 documents and created 89 new knowledge connections",
    icon: Lightbulb,
    color: "#22d3ee",
  },
  {
    title: "Suggested Focus",
    value: "Reinforcement Learning",
    detail: "Based on your recent interests, this topic could complement your ML knowledge",
    icon: Target,
    color: "#f472b6",
  },
];

const weeklyStats = [
  { label: "Documents Added", value: 12, icon: FileText, color: "#00f0ff" },
  { label: "Chats Completed", value: 28, icon: MessageSquare, color: "#a855f7" },
  { label: "Memories Formed", value: 15, icon: Brain, color: "#22d3ee" },
  { label: "Insights Generated", value: 7, icon: Sparkles, color: "#f472b6" },
];

export default function ReflectionPage() {
  return (
    <>
      <Navbar title="Weekly Reflection" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold text-[#e0e7ff] font-[family-name:var(--font-mono)]">
            Week of <span className="gradient-text">Aug 1 – Aug 7, 2026</span>
          </h2>
          <p className="text-sm text-[#6b7294] mt-1 font-[family-name:var(--font-mono)]">
            // ai-generated cognitive analysis
          </p>
        </motion.div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {weeklyStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <NeonCard className="p-5 text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}20` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="text-2xl font-bold font-[family-name:var(--font-mono)]" style={{ color: stat.color }}>
                  <AnimatedCounter target={stat.value} duration={1.5} />
                </div>
                <p className="text-[10px] text-[#6b7294] mt-1 font-[family-name:var(--font-mono)] uppercase tracking-wider">
                  {stat.label}
                </p>
              </NeonCard>
            </motion.div>
          ))}
        </div>

        {/* AI Insights */}
        <div>
          <h3 className="text-sm font-semibold text-[#e0e7ff] mb-4 font-[family-name:var(--font-mono)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#a855f7]" />
            AI-Generated Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, i) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <NeonCard className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${insight.color}10`, border: `1px solid ${insight.color}20` }}
                    >
                      <insight.icon className="w-5 h-5" style={{ color: insight.color }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#3d4270] font-[family-name:var(--font-mono)] uppercase tracking-wider mb-1">
                        {insight.title}
                      </p>
                      <h4 className="text-base font-semibold text-[#e0e7ff]">{insight.value}</h4>
                      <p className="text-xs text-[#6b7294] mt-1 leading-relaxed">{insight.detail}</p>
                    </div>
                  </div>
                </NeonCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
