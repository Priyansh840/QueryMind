"use client";

import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";
import { User, Mail, Briefcase, BookOpen, Target, Heart, Camera, FileText, MessageSquare, Brain } from "lucide-react";

const skills = ["React", "Next.js", "Python", "FastAPI", "Docker", "PostgreSQL", "TypeScript", "Tailwind"];
const interests = ["Machine Learning", "NLP", "Neuroscience", "Systems Design", "Open Source"];
const goals = ["Build QueryMind", "Learn Rust", "Publish a paper on RAG systems"];

const profileStats = [
  { label: "Documents", value: 24, icon: FileText, color: "#00f0ff" },
  { label: "Conversations", value: 156, icon: MessageSquare, color: "#a855f7" },
  { label: "Memories", value: 89, icon: Brain, color: "#22d3ee" },
];

export default function ProfilePage() {
  return (
    <>
      <Navbar title="Profile" />
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Avatar & Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <NeonCard className="p-6" hover={false} glow="purple">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00f0ff]/20 to-[#a855f7]/20 border-2 border-[rgba(0,240,255,0.2)] flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.15)]">
                  <span className="text-2xl font-bold gradient-text font-[family-name:var(--font-mono)]">PS</span>
                </div>
                <button className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-[#e0e7ff] font-[family-name:var(--font-mono)]">
                  Priyansh Sinha
                </h2>
                <p className="text-sm text-[#6b7294] flex items-center gap-2 mt-1">
                  <Mail className="w-3.5 h-3.5" /> priyansh@gmail.com
                </p>
                <p className="text-sm text-[#6b7294] flex items-center gap-2 mt-0.5">
                  <Briefcase className="w-3.5 h-3.5" /> Computer Science Student
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-2 h-2 rounded-full bg-[#22d3ee] shadow-[0_0_6px_rgba(34,211,238,0.6)] animate-pulse" />
                  <span className="text-xs text-[#22d3ee] font-[family-name:var(--font-mono)]">NEURAL LINK ACTIVE</span>
                </div>
              </div>
            </div>
          </NeonCard>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {profileStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <NeonCard className="p-4 text-center">
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

        {/* Skills */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <NeonCard className="p-5" hover={false}>
            <h3 className="text-sm font-semibold text-[#e0e7ff] mb-3 font-[family-name:var(--font-mono)] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#a855f7]" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-lg bg-[#a855f7]/[0.06] border border-[#a855f7]/15 text-xs text-[#a855f7] font-[family-name:var(--font-mono)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </NeonCard>
        </motion.div>

        {/* Interests */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <NeonCard className="p-5" hover={false}>
            <h3 className="text-sm font-semibold text-[#e0e7ff] mb-3 font-[family-name:var(--font-mono)] flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#f472b6]" />
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1.5 rounded-lg bg-[#f472b6]/[0.06] border border-[#f472b6]/15 text-xs text-[#f472b6] font-[family-name:var(--font-mono)]"
                >
                  {interest}
                </span>
              ))}
            </div>
          </NeonCard>
        </motion.div>

        {/* Goals */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <NeonCard className="p-5" hover={false}>
            <h3 className="text-sm font-semibold text-[#e0e7ff] mb-3 font-[family-name:var(--font-mono)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#22d3ee]" />
              Goals
            </h3>
            <div className="space-y-2">
              {goals.map((goal, i) => (
                <div
                  key={goal}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[rgba(0,240,255,0.03)] transition-all"
                >
                  <span className="text-xs text-[#3d4270] font-[family-name:var(--font-mono)] w-5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-[#e0e7ff]">{goal}</span>
                </div>
              ))}
            </div>
          </NeonCard>
        </motion.div>
      </div>
    </>
  );
}
