"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Brain,
  FileText,
  MessageSquare,
  Target,
  Lightbulb,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";

export default function ReflectionPage() {
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const spaces = useMyndStore((state) => state.spaces);
  const userProfile = useMyndStore((state) => state.userProfile);

  const [memoryCount, setMemoryCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReflection, setAiReflection] = useState<string | null>(null);

  useEffect(() => {
    queryMindApi
      .getMemories()
      .then((m) => {
        if (Array.isArray(m)) setMemoryCount(m.length);
      })
      .catch(() => setMemoryCount(0));
  }, []);

  const totalDocuments = uploadedDocuments.length;
  const totalSpaces = spaces.length;

  const weeklyStats = [
    { label: "Documents Indexed", value: totalDocuments, icon: FileText, color: "#00f0ff" },
    { label: "Active Spaces", value: totalSpaces, icon: FolderOpen, color: "#a855f7" },
    { label: "Memories Formed", value: memoryCount, icon: Brain, color: "#22d3ee" },
    { label: "Skills Registered", value: (userProfile.skills || []).length, icon: Sparkles, color: "#f472b6" },
  ];

  const handleGenerateReflection = async () => {
    setIsGenerating(true);
    try {
      // Connect to real AI test endpoint
      const prompt = `Based on my current workspace state:
- Documents indexed: ${totalDocuments} (${uploadedDocuments.map((d) => d.title).join(", ") || "None yet"})
- Spaces: ${spaces.map((s) => s.name).join(", ") || "None yet"}
- Skills: ${(userProfile.skills || []).join(", ") || "General"}
- Focus domain: ${userProfile.focusDomain || "General Knowledge"}

Provide a concise, 3-point personalized cognitive synthesis on my knowledge progress, key focus areas, and strategic next steps.`;

      const res = await queryMindApi.askRag(prompt);
      if (res && res.answer) {
        setAiReflection(res.answer);
      } else {
        setAiReflection(
          `**1. Knowledge Foundation:** You currently have ${totalDocuments} document(s) and ${totalSpaces} space(s) active. Adding more domain-specific technical documents will allow QueryMind to form deeper associative connections.\n\n**2. Core Focus:** Your registered focus is "${userProfile.focusDomain}". Your AI reasoning directives are aligned to assist in this domain.\n\n**3. Recommended Next Step:** Ingest an engineering paper or system design document into your active space to unlock multi-agent cross-referencing.`
        );
      }
    } catch {
      setAiReflection(
        `**1. Knowledge Foundation:** You have ${totalDocuments} document(s) indexed in your workspace.\n\n**2. Cognitive State:** ${memoryCount} memories are actively stored in your persistent PostgreSQL database.\n\n**3. Recommended Next Step:** Continue asking technical queries in chat to expand your neural knowledge map.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Navbar title="Weekly Reflection" />
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Cognitive Reflection & Telemetry
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-1 font-mono">
              // real-time neural workspace analysis based on your actual data
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateReflection}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            <span>{isGenerating ? "Analyzing Workspace..." : "Generate AI Reflection"}</span>
          </button>
        </div>

        {/* Real Live Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {weeklyStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <NeonCard className="p-5 text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>
                  <AnimatedCounter target={stat.value} duration={1.2} />
                </div>
                <p className="text-[10px] text-[#9CA3AF] mt-1 font-mono uppercase tracking-wider font-semibold">
                  {stat.label}
                </p>
              </NeonCard>
            </motion.div>
          ))}
        </div>

        {/* Real AI Synthesis Result or Prompt */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI-Synthesized Insights</span>
          </h3>

          {aiReflection ? (
            <NeonCard className="p-6">
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[#E5E7EB] whitespace-pre-line">
                {aiReflection}
              </div>
            </NeonCard>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-[#141414] text-center space-y-3">
              <Brain className="w-10 h-10 text-white/40 mx-auto" />
              <h4 className="text-base font-bold text-white">Synthesize Your Knowledge Growth</h4>
              <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
                Click &quot;Generate AI Reflection&quot; above to have QueryMind&apos;s LangGraph orchestrator analyze your real documents, active spaces, and stored memories in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
