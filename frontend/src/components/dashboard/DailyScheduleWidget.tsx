"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi, GoalData } from "@/lib/api";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Zap,
  Sparkles,
  ArrowRight,
  MessageSquare,
  FileText,
  RotateCw,
  Flame,
  Award,
} from "lucide-react";

interface ScheduleBlock {
  id: string;
  blockNumber: number;
  timeSlot: string;
  durationMinutes: number;
  title: string;
  deliverable?: string;
  goalId: string;
  goalTitle: string;
  goalCategory?: string;
  docId?: string;
  docTitle?: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  reasoning?: string;
}

interface DailyScheduleWidgetProps {
  compact?: boolean;
  onOpenChatSprint?: (prompt: string) => void;
}

export default function DailyScheduleWidget({ compact = false, onOpenChatSprint }: DailyScheduleWidgetProps) {
  const router = useRouter();
  const setFocusObjective = useMyndStore((state) => state.setFocusObjective);
  const setFocusDuration = useMyndStore((state) => state.setFocusDuration);
  const startFocusTimer = useMyndStore((state) => state.startFocusTimer);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);

  const [capacityHours, setCapacityHours] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("querymind_daily_capacity");
      return saved ? parseInt(saved, 10) : 2;
    }
    return 2;
  });

  const [goals, setGoals] = useState<GoalData[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [recentCelebration, setRecentCelebration] = useState<{ title: string; xp: number } | null>(null);

  // Load goals and documents
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [goalsRes, docsRes] = await Promise.allSettled([
          queryMindApi.getGoals(),
          queryMindApi.listDocuments(),
        ]);

        if (isMounted) {
          if (goalsRes.status === "fulfilled" && Array.isArray(goalsRes.value)) {
            setGoals(goalsRes.value);
            // Collect already completed tasks
            const initialCompleted = new Set<string>();
            goalsRes.value.forEach((g) => {
              (g.tasks || []).forEach((t: any) => {
                if (t.completed) initialCompleted.add(t.id);
              });
            });
            setCompletedTaskIds(initialCompleted);
          }
          if (docsRes.status === "fulfilled" && Array.isArray(docsRes.value)) {
            setDocuments(docsRes.value);
          }
        }
      } catch (err) {
        console.warn("Failed to load goals for daily schedule:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCapacityChange = (hours: number) => {
    setCapacityHours(hours);
    if (typeof window !== "undefined") {
      localStorage.setItem("querymind_daily_capacity", hours.toString());
    }
  };

  // Generate structured time-blocks based on capacity and active goal priorities
  const scheduleBlocks: ScheduleBlock[] = useMemo(() => {
    if (!goals || goals.length === 0) return [];

    const activeGoalsList = goals.filter((g) => g.status !== "completed");
    const candidateTasks: Array<{
      task: any;
      goal: GoalData;
      weight: number;
    }> = [];

    activeGoalsList.forEach((g) => {
      (g.tasks || []).forEach((t: any) => {
        // Compute priority weight
        let weight = 1;
        if (t.priority === "high") weight = 3;
        else if (t.priority === "medium") weight = 2;

        // If not completed locally
        if (!completedTaskIds.has(t.id) && !t.completed) {
          candidateTasks.push({ task: t, goal: g, weight });
        }
      });
    });

    // Sort by priority weight
    candidateTasks.sort((a, b) => b.weight - a.weight);

    // Number of blocks based on capacity:
    // 1 hr -> 2 blocks (35m, 25m)
    // 2 hrs -> 3 blocks (45m, 45m, 30m)
    // 4 hrs -> 4 blocks (60m, 60m, 60m, 60m)
    let blockConfigs = [
      { slot: "Morning Deep Dive", duration: 45 },
      { slot: "Afternoon Practice", duration: 45 },
      { slot: "Evening Synthesis", duration: 30 },
    ];

    if (capacityHours === 1) {
      blockConfigs = [
        { slot: "Priority Focus", duration: 35 },
        { slot: "Active Recall & Review", duration: 25 },
      ];
    } else if (capacityHours === 4) {
      blockConfigs = [
        { slot: "Phase 1: First Principles", duration: 60 },
        { slot: "Phase 2: Complex Scenarios", duration: 60 },
        { slot: "Phase 3: Applied Practice", duration: 60 },
        { slot: "Phase 4: Synthesis & Quiz", duration: 60 },
      ];
    }

    const blocks: ScheduleBlock[] = [];
    const usedTaskIds = new Set<string>();

    for (let i = 0; i < blockConfigs.length; i++) {
      const cfg = blockConfigs[i];
      const match = candidateTasks.find((c) => !usedTaskIds.has(c.task.id));

      if (match) {
        usedTaskIds.add(match.task.id);
        const docId = Array.isArray(match.goal.document_ids) ? match.goal.document_ids[0] : undefined;
        const matchedDoc = docId ? documents.find((d) => d.id === docId) : undefined;

        blocks.push({
          id: match.task.id,
          blockNumber: i + 1,
          timeSlot: cfg.slot,
          durationMinutes: cfg.duration,
          title: match.task.title,
          deliverable: match.task.deliverable,
          goalId: match.goal.id,
          goalTitle: match.goal.description,
          goalCategory: match.goal.category || "General",
          docId,
          docTitle: matchedDoc?.title || matchedDoc?.filename,
          completed: completedTaskIds.has(match.task.id),
          priority: match.task.priority || "medium",
          reasoning: match.task.reasoning,
        });
      } else {
        // Fallback default blocks if user has fewer tasks than time-blocks
        blocks.push({
          id: `placeholder-${i}`,
          blockNumber: i + 1,
          timeSlot: cfg.slot,
          durationMinutes: cfg.duration,
          title: i === 0 ? "Review Core Notes & Concepts" : "Practice Problems & Flashcards",
          deliverable: "Summarize top 3 insights in your scratchpad",
          goalId: "",
          goalTitle: "General Knowledge Mastery",
          goalCategory: "Study",
          completed: false,
          priority: "medium",
        });
      }
    }

    return blocks;
  }, [goals, documents, capacityHours, completedTaskIds]);

  // Handle toggling task completion in real goal
  const handleToggleBlockCompletion = async (block: ScheduleBlock) => {
    const isNowCompleted = !completedTaskIds.has(block.id);

    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (isNowCompleted) next.add(block.id);
      else next.delete(block.id);
      return next;
    });

    if (isNowCompleted) {
      setRecentCelebration({ title: block.title, xp: 50 });
      setTimeout(() => setRecentCelebration(null), 3500);
    }

    // Sync to backend goal if real goal ID
    if (block.goalId && !block.id.startsWith("placeholder-")) {
      const targetGoal = goals.find((g) => g.id === block.goalId);
      if (targetGoal) {
        const updatedTasks = (targetGoal.tasks || []).map((t: any) =>
          t.id === block.id ? { ...t, completed: isNowCompleted } : t
        );
        try {
          await queryMindApi.updateGoal(targetGoal.id, { tasks: updatedTasks });
        } catch (err) {
          console.error("Failed to sync scheduled task completion:", err);
        }
      }
    }
  };

  // Launch Deep Work focus timer for a block
  const handleStartFocusSession = (block: ScheduleBlock) => {
    setFocusObjective(`${block.title} (${block.goalTitle})`);
    setFocusDuration(block.durationMinutes, "focus");
    startFocusTimer();
    toggleFocusMode();
  };

  // Launch Chat Sprint for a block
  const handleStartChatSprint = (block: ScheduleBlock) => {
    const prompt = `Conduct a high-yield ${block.durationMinutes}-minute study sprint on "${block.title}" under my goal "${block.goalTitle}". Ask me 3 diagnostic questions first, identify traps, and ground explanations in my uploaded documents.`;
    if (onOpenChatSprint) {
      onOpenChatSprint(prompt);
    } else {
      router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
    }
  };

  const totalMinutes = scheduleBlocks.reduce((acc, b) => acc + b.durationMinutes, 0);
  const completedMinutes = scheduleBlocks
    .filter((b) => completedTaskIds.has(b.id))
    .reduce((acc, b) => acc + b.durationMinutes, 0);
  const percentComplete = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;
  const completedCount = scheduleBlocks.filter((b) => completedTaskIds.has(b.id)).length;

  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(18, 18, 22, 0.95) 0%, rgba(10, 10, 14, 0.98) 100%)",
        border: "1px solid var(--border-strong, rgba(255, 255, 255, 0.14))",
        borderRadius: "16px",
        padding: compact ? "16px 18px" : "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "-50px",
          right: "-30px",
          width: "240px",
          height: "180px",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header Row: Title, Subtitle, and Daily Capacity Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          paddingBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10B981",
              flexShrink: 0,
            }}
          >
            <Clock size={16} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2
                style={{
                  fontSize: compact ? "14.5px" : "16.5px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  margin: 0,
                  letterSpacing: "-0.015em",
                }}
              >
                Today&apos;s AI Study Schedule
              </h2>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34D399",
                  fontWeight: 600,
                }}
              >
                Time-Blocked
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-tertiary, #A3A3A3)",
                margin: "2px 0 0 0",
              }}
            >
              Goal-aligned study blocks dynamically balanced for today
            </p>
          </div>
        </div>

        {/* Capacity Selector: 1h / 2h / 4h */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 600 }}>
            Available Today:
          </span>
          <div
            style={{
              display: "inline-flex",
              padding: "2px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            {[1, 2, 4].map((hrs) => {
              const isSelected = capacityHours === hrs;
              return (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => handleCapacityChange(hrs)}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "6px",
                    background: isSelected ? "#FFFFFF" : "transparent",
                    color: isSelected ? "#000000" : "var(--text-secondary)",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {hrs} hr{hrs > 1 ? "s" : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress & Completion Meter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "8px",
          padding: "8px 12px",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Flame size={14} style={{ color: percentComplete === 100 ? "#10B981" : "#F59E0B" }} />
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
            <strong style={{ color: "#FFFFFF" }}>{completedMinutes} min</strong> / {totalMinutes} min ({completedCount}/{scheduleBlocks.length} blocks done)
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ flex: 1, maxWidth: "200px", height: "6px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${percentComplete}%`,
              background: percentComplete === 100 ? "#10B981" : "linear-gradient(90deg, #10B981, #3B82F6)",
              transition: "width 0.3s ease",
              borderRadius: "3px",
            }}
          />
        </div>

        {recentCelebration && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              color: "#10B981",
              fontWeight: 700,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <Award size={13} />
            <span>+50 XP Earned!</span>
          </div>
        )}
      </div>

      {/* Schedule Time-Blocks Timeline List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {scheduleBlocks.map((block, idx) => {
          const isDone = completedTaskIds.has(block.id);
          const isUpNext = !isDone && scheduleBlocks.slice(0, idx).every((b) => completedTaskIds.has(b.id));

          return (
            <div
              key={block.id}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: isDone
                  ? "rgba(16, 185, 129, 0.04)"
                  : isUpNext
                  ? "rgba(255, 255, 255, 0.045)"
                  : "rgba(255, 255, 255, 0.02)",
                border: isDone
                  ? "1px solid rgba(16, 185, 129, 0.25)"
                  : isUpNext
                  ? "1px solid rgba(255, 255, 255, 0.16)"
                  : "1px solid rgba(255, 255, 255, 0.07)",
                transition: "all 0.15s ease",
              }}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => handleToggleBlockCompletion(block)}
                title={isDone ? "Mark incomplete" : "Mark block completed (+50 XP)"}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: isDone ? "#10B981" : "rgba(255, 255, 255, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "2px",
                  flexShrink: 0,
                }}
              >
                {isDone ? <CheckCircle2 size={18} color="#10B981" /> : <Circle size={18} />}
              </button>

              {/* Block Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: isDone ? "rgba(16, 185, 129, 0.15)" : isUpNext ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
                      color: isDone ? "#34D399" : isUpNext ? "#FFFFFF" : "var(--text-secondary)",
                    }}
                  >
                    Block {block.blockNumber} &bull; {block.durationMinutes}m
                  </span>

                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {block.timeSlot}
                  </span>

                  {isUpNext && (
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "rgba(245, 158, 11, 0.18)",
                        color: "#F59E0B",
                      }}
                    >
                      Up Next
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: isDone ? "rgba(255, 255, 255, 0.45)" : "#FFFFFF",
                    textDecoration: isDone ? "line-through" : "none",
                    lineHeight: 1.4,
                    marginBottom: "4px",
                  }}
                >
                  {block.title}
                </div>

                {block.deliverable && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: isDone ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.6)",
                      lineHeight: 1.4,
                      marginBottom: "6px",
                    }}
                  >
                    Target: {block.deliverable}
                  </div>
                )}

                {/* Tags row: Parent Goal + Document link */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "var(--text-secondary)",
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    🎯 {block.goalTitle}
                  </span>

                  {block.docTitle && (
                    <Link
                      href={`/vault`}
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.25)",
                        color: "#60A5FA",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <FileText size={10} />
                      <span>{block.docTitle}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {/* Start Focus Timer */}
                <button
                  type="button"
                  onClick={() => handleStartFocusSession(block)}
                  title={`Start ${block.durationMinutes}m focus timer for this block`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 9px",
                    borderRadius: "6px",
                    background: isUpNext ? "#FFFFFF" : "rgba(255, 255, 255, 0.06)",
                    border: isUpNext ? "1px solid #FFFFFF" : "1px solid rgba(255, 255, 255, 0.12)",
                    color: isUpNext ? "#000000" : "var(--text-primary)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Zap size={11} fill={isUpNext ? "currentColor" : "none"} />
                  <span>Start</span>
                </button>

                {/* AI Chat Sprint */}
                <button
                  type="button"
                  onClick={() => handleStartChatSprint(block)}
                  title="Ask AI Copilot to guide you through this block"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 8px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "var(--text-secondary)",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <MessageSquare size={11} />
                  <span>Tutor</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
