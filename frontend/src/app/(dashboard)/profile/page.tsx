"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";
import {
  User,
  Mail,
  Briefcase,
  BookOpen,
  Target,
  Heart,
  Camera,
  FileText,
  MessageSquare,
  Brain,
  Edit3,
  Plus,
  X,
  Sparkles,
} from "lucide-react";

export default function ProfilePage() {
  const userProfile = useMyndStore((state) => state.userProfile);
  const setUserProfile = useMyndStore((state) => state.setUserProfile);
  const openEditProfile = useMyndStore((state) => state.openEditProfile);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const spaces = useMyndStore((state) => state.spaces);

  const [memoryCount, setMemoryCount] = useState(0);

  // New tag inputs
  const [newSkillInput, setNewSkillInput] = useState("");
  const [newInterestInput, setNewInterestInput] = useState("");
  const [newGoalInput, setNewGoalInput] = useState("");

  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Fetch real memory count from backend
  useEffect(() => {
    queryMindApi
      .getMemories()
      .then((mems) => {
        if (Array.isArray(mems)) setMemoryCount(mems.length);
      })
      .catch(() => setMemoryCount(0));
  }, []);

  const initials = (() => {
    const name = userProfile.name?.trim();
    if (!name) return "?";
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const skills = userProfile.skills || [];
  const interests = userProfile.interests || [];
  const goals = userProfile.goals || [];

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillInput.trim()) return;
    const updated = [...skills, newSkillInput.trim()];
    setUserProfile({ skills: updated });
    setNewSkillInput("");
    setIsAddingSkill(false);
  };

  const handleRemoveSkill = (index: number) => {
    const updated = skills.filter((_, i) => i !== index);
    setUserProfile({ skills: updated });
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterestInput.trim()) return;
    const updated = [...interests, newInterestInput.trim()];
    setUserProfile({ interests: updated });
    setNewInterestInput("");
    setIsAddingInterest(false);
  };

  const handleRemoveInterest = (index: number) => {
    const updated = interests.filter((_, i) => i !== index);
    setUserProfile({ interests: updated });
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;
    const updated = [...goals, newGoalInput.trim()];
    setUserProfile({ goals: updated });
    setNewGoalInput("");
    setIsAddingGoal(false);
  };

  const handleRemoveGoal = (index: number) => {
    const updated = goals.filter((_, i) => i !== index);
    setUserProfile({ goals: updated });
  };

  const profileStats = [
    { label: "Documents", value: uploadedDocuments.length, icon: FileText, color: "#00f0ff" },
    { label: "Active Spaces", value: spaces.length, icon: Sparkles, color: "#a855f7" },
    { label: "Neural Memories", value: memoryCount, icon: Brain, color: "#22d3ee" },
  ];

  return (
    <>
      <Navbar title="Profile" />
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Avatar & Info Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <NeonCard className="p-6" hover={false} glow="purple">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-5">
                {/* Avatar */}
                <div className="relative group cursor-pointer" onClick={openEditProfile}>
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden shadow-lg transition-transform group-hover:scale-105"
                    style={{
                      background: "#D97706",
                      border: "2.5px solid #FFFFFF",
                    }}
                  >
                    {userProfile.avatarUrl ? (
                      <img
                        src={userProfile.avatarUrl}
                        alt={userProfile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white tracking-wider">
                        {initials}
                      </span>
                    )}
                  </div>
                  {/* Camera Icon Overlay */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditProfile();
                    }}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#1E1E1E] border border-white/30 flex items-center justify-center text-white/90 shadow-md hover:bg-[#2F2F2F] hover:scale-110 transition-all"
                    title="Edit profile photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* User Details */}
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[#FFFFFF] tracking-tight">
                      {userProfile.name || "Set your name"}
                    </h2>
                    {userProfile.username && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-medium">
                        @{userProfile.username}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#9CA3AF] flex items-center gap-2 mt-1">
                    <Mail className="w-3.5 h-3.5" /> {userProfile.email || "No email set"}
                  </p>
                  <p className="text-sm text-[#9CA3AF] flex items-center gap-2 mt-0.5">
                    <Briefcase className="w-3.5 h-3.5" /> {userProfile.role || "No role set"}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
                    <span className="text-xs text-[#10B981] font-medium tracking-wide">AUTHENTICATED USER</span>
                  </div>
                </div>
              </div>

              {/* Edit Profile Action Button */}
              <button
                type="button"
                onClick={openEditProfile}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:opacity-90 transition-all self-stretch sm:self-auto justify-center shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit profile</span>
              </button>
            </div>
          </NeonCard>
        </motion.div>

        {/* Real Live Stats */}
        <div className="grid grid-cols-3 gap-4">
          {profileStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <NeonCard className="p-4 text-center">
                <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>
                  <AnimatedCounter target={stat.value} duration={1.5} />
                </div>
                <p className="text-[10px] text-[#9CA3AF] mt-1 font-mono uppercase tracking-wider font-semibold">
                  {stat.label}
                </p>
              </NeonCard>
            </motion.div>
          ))}
        </div>

        {/* Real Dynamic Skills */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <NeonCard className="p-5" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#e0e7ff] font-mono flex items-center gap-2">
                <Target className="w-4 h-4 text-[#a855f7]" />
                <span>Skills</span>
                <span className="text-xs text-[#9CA3AF]">({skills.length})</span>
              </h3>
              {!isAddingSkill && (
                <button
                  type="button"
                  onClick={() => setIsAddingSkill(true)}
                  className="flex items-center gap-1 text-xs text-[#a855f7] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Skill</span>
                </button>
              )}
            </div>

            {isAddingSkill && (
              <form onSubmit={handleAddSkill} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="e.g. Next.js, Python, PostgreSQL..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#171717] border border-white/10 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white text-xs font-semibold"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSkill(false)}
                  className="px-2 py-1.5 text-xs text-[#9CA3AF]"
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/20 text-xs text-[#a855f7] font-mono"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(idx)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-xs text-[#6B7280]">No skills added yet. Click &quot;Add Skill&quot; to customize.</p>
              )}
            </div>
          </NeonCard>
        </motion.div>

        {/* Real Dynamic Interests */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <NeonCard className="p-5" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#e0e7ff] font-mono flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#f472b6]" />
                <span>Interests</span>
                <span className="text-xs text-[#9CA3AF]">({interests.length})</span>
              </h3>
              {!isAddingInterest && (
                <button
                  type="button"
                  onClick={() => setIsAddingInterest(true)}
                  className="flex items-center gap-1 text-xs text-[#f472b6] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Interest</span>
                </button>
              )}
            </div>

            {isAddingInterest && (
              <form onSubmit={handleAddInterest} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newInterestInput}
                  onChange={(e) => setNewInterestInput(e.target.value)}
                  placeholder="e.g. Distributed Systems, Generative AI..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#171717] border border-white/10 text-xs text-white focus:outline-none focus:border-[#f472b6]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#f472b6] text-white text-xs font-semibold"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingInterest(false)}
                  className="px-2 py-1.5 text-xs text-[#9CA3AF]"
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              {interests.length > 0 ? (
                interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f472b6]/10 border border-[#f472b6]/20 text-xs text-[#f472b6] font-mono"
                  >
                    <span>{interest}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(idx)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-xs text-[#6B7280]">No interests added yet. Click &quot;Add Interest&quot; to customize.</p>
              )}
            </div>
          </NeonCard>
        </motion.div>

        {/* Real Dynamic Goals */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <NeonCard className="p-5" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#e0e7ff] font-mono flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#22d3ee]" />
                <span>Goals</span>
                <span className="text-xs text-[#9CA3AF]">({goals.length})</span>
              </h3>
              {!isAddingGoal && (
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(true)}
                  className="flex items-center gap-1 text-xs text-[#22d3ee] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Goal</span>
                </button>
              )}
            </div>

            {isAddingGoal && (
              <form onSubmit={handleAddGoal} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  placeholder="e.g. Build production distributed architectures..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#171717] border border-white/10 text-xs text-white focus:outline-none focus:border-[#22d3ee]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#22d3ee] text-black text-xs font-semibold"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="px-2 py-1.5 text-xs text-[#9CA3AF]"
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="space-y-2">
              {goals.length > 0 ? (
                goals.map((goal, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#3d4270] font-mono w-5">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm text-[#e0e7ff]">{goal}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGoal(idx)}
                      className="text-[#9CA3AF] hover:text-red-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#6B7280]">No goals added yet. Click &quot;Add Goal&quot; to set your milestones.</p>
              )}
            </div>
          </NeonCard>
        </motion.div>
      </div>
    </>
  );
}
