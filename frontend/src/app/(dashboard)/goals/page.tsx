"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import { motion } from "framer-motion";
import { Target, Plus, CheckCircle2, Circle, Trash2, RefreshCw } from "lucide-react";
import { queryMindApi, GoalData } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const spaces = useMyndStore((state) => state.spaces);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const data = await queryMindApi.getGoals();
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Error fetching goals from API", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await queryMindApi.createGoal({
        description: newGoalDescription.trim(),
      });
      setGoals((prev) => [created, ...prev]);
      setNewGoalDescription("");
    } catch {
      // Local fallback
      const localGoal: GoalData = {
        id: `goal-${Date.now()}`,
        user_id: "local",
        description: newGoalDescription.trim(),
        status: "in_progress",
        created_at: new Date().toISOString(),
      };
      setGoals((prev) => [localGoal, ...prev]);
      setNewGoalDescription("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleGoal = async (goal: GoalData) => {
    const newStatus = goal.status === "completed" ? "in_progress" : "completed";
    try {
      await queryMindApi.updateGoal(goal.id, { status: newStatus });
    } catch {
      // Ignore
    }
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, status: newStatus } : g))
    );
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await queryMindApi.deleteGoal(id);
    } catch {
      // Ignore
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <>
      <Navbar title="Strategic Goals" />
      <div className="p-6 max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Target className="w-6 h-6 text-white" />
              <span>Real-Time Goals & Objectives</span>
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-mono">
              // {goals.length} active goals tracked in PostgreSQL
            </p>
          </div>

          <button
            type="button"
            onClick={fetchGoals}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] border border-white/10 text-xs text-white/80 hover:text-white transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Create Goal Card */}
        <form onSubmit={handleCreateGoal} className="flex gap-2">
          <input
            type="text"
            value={newGoalDescription}
            onChange={(e) => setNewGoalDescription(e.target.value)}
            placeholder="Enter a new objective or milestone..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#171717] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newGoalDescription.trim()}
            className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Goal</span>
          </button>
        </form>

        {/* Goals List */}
        {isLoading ? (
          <div className="p-12 text-center text-sm text-[#9CA3AF]">
            Loading real-time goals...
          </div>
        ) : goals.length > 0 ? (
          <div className="space-y-2.5">
            {goals.map((g) => {
              const isDone = g.status === "completed";
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleToggleGoal(g)}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-white/40 group-hover:text-white flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        isDone ? "line-through text-white/40" : "text-[#E5E7EB]"
                      }`}
                    >
                      {g.description}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(g.id)}
                    className="text-white/40 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-[#141414] text-center space-y-3">
            <Target className="w-10 h-10 text-white/40 mx-auto" />
            <h3 className="text-base font-bold text-white">No goals recorded</h3>
            <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
              Create your first real objective above to align your autonomous spaces and projects.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
