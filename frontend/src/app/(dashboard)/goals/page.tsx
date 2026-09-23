"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  RefreshCw,
  Sparkles,
  Calendar,
  Layers,
  Flag,
  ChevronRight,
  TrendingUp,
  CheckSquare,
  AlertCircle,
  Clock,
  Zap,
  X,
  Edit3,
  Check,
  MessageSquare,
  Send,
  Bot,
  FileText,
  FolderKanban,
} from "lucide-react";
import { queryMindApi, GoalData } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";

interface GoalTask {
  id: string;
  title: string;
  completed: boolean;
  priority?: "high" | "medium" | "low";
}

interface EnrichedGoal extends GoalData {
  category?: string;
  target_date?: string;
  priority?: "high" | "medium" | "low";
  progress?: number;
  tasks?: GoalTask[];
  // Backwards compatibility for previously saved records
  milestones?: GoalTask[];
  space_name?: string;
  space_ids?: string[];
}

// Normalize task title to identify identical/similar tasks across different goals
export const normalizeTaskTitle = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
};

// Priority weight calculation:
// Base: High = 3 points, Medium = 2 points, Low = 1 point
export const TASK_WEIGHTS: Record<"high" | "medium" | "low", number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// Calculate effective task priority based on base priority + shared cross-goal synergy:
// If a task appears across multiple active goals (count >= 2), its priority escalates:
// - Low -> Medium (or High if count >= 3)
// - Medium -> High (or Critical/High if count >= 3)
// - High -> High (Max multiplier)
export const getEffectiveTaskPriority = (
  basePriority: "high" | "medium" | "low" = "medium",
  sharedGoalCount: number = 1
): { effectivePriority: "high" | "medium" | "low"; isBoosted: boolean; weightMultiplier: number } => {
  if (sharedGoalCount <= 1) {
    return {
      effectivePriority: basePriority,
      isBoosted: false,
      weightMultiplier: TASK_WEIGHTS[basePriority] || 2,
    };
  }

  // Escalation rule when shared across 2 or more goals
  let effectivePriority: "high" | "medium" | "low" = "high";
  if (sharedGoalCount === 2 && basePriority === "low") {
    effectivePriority = "medium";
  } else {
    effectivePriority = "high";
  }

  // Boost weight: bonus +1 or +2 weight points for strategic cross-goal leverage
  const baseWeight = TASK_WEIGHTS[basePriority] || 2;
  const boostedWeight = Math.min(baseWeight + (sharedGoalCount - 1), 5);

  return {
    effectivePriority,
    isBoosted: true,
    weightMultiplier: boostedWeight,
  };
};

export const computeGoalProgress = (
  tasks: GoalTask[] = [],
  frequencyMap?: Map<string, { count: number }>
): number => {
  if (!tasks || tasks.length === 0) return 0;
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const t of tasks) {
    const norm = normalizeTaskTitle(t.title);
    const sharedCount = frequencyMap?.get(norm)?.count || 1;
    const { weightMultiplier } = getEffectiveTaskPriority(t.priority || "medium", sharedCount);

    totalWeight += weightMultiplier;
    if (t.completed) {
      earnedWeight += weightMultiplier;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((earnedWeight / totalWeight) * 100);
};

const PRESET_CATEGORIES = [
  { id: "all", label: "All Goals" },
  { id: "career", label: "Career & Projects", color: "#6366F1" },
  { id: "knowledge", label: "Learning & Research", color: "#10B981" },
  { id: "architecture", label: "System & Architecture", color: "#F59E0B" },
  { id: "personal", label: "Personal Growth", color: "#EC4899" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<EnrichedGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedGoal, setSelectedGoal] = useState<EnrichedGoal | null>(null);

  // Form State for Defining a New Goal
  const [goalDescription, setGoalDescription] = useState("");
  const [category, setCategory] = useState("career");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("high");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [taskPriorityInput, setTaskPriorityInput] = useState<"high" | "medium" | "low">("medium");
  const [stagedTasks, setStagedTasks] = useState<Array<{ title: string; priority: "high" | "medium" | "low"; reasoning?: string }>>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // AI Recommendation State
  const [isAiRecommending, setIsAiRecommending] = useState(false);
  const [aiContextNote, setAiContextNote] = useState<string | null>(null);

  // Modal Task Creation State
  const [modalTaskInput, setModalTaskInput] = useState("");
  const [modalTaskPriority, setModalTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [isModalAiRecommending, setIsModalAiRecommending] = useState(false);

  // Modal Tab & Goal Chat State
  const [activeModalTab, setActiveModalTab] = useState<"tasks" | "chat">("tasks");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; citations?: Array<{ document_title?: string; page_number?: number; snippet: string; score?: number }>; timestamp?: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatSpacesSearched, setChatSpacesSearched] = useState<string[]>([]);

  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const setActiveGoal = useMyndStore((state) => state.setActiveGoal);

  // Sync selectedGoal with activeGoal in store
  const handleSelectGoal = (goal: EnrichedGoal | null) => {
    setSelectedGoal(goal);
    setActiveGoal(goal);
  };

  // Keep activeGoal in store synced whenever selectedGoal changes
  useEffect(() => {
    setActiveGoal(selectedGoal);
  }, [selectedGoal, setActiveGoal]);

  // Clear activeGoal when unmounting
  useEffect(() => {
    return () => {
      setActiveGoal(null);
    };
  }, [setActiveGoal]);

  // Set default space
  useEffect(() => {
    if (activeSpaceId) {
      setSelectedSpaceId(activeSpaceId);
      setSelectedSpaceIds((prev) => (prev.length === 0 ? [activeSpaceId] : prev));
    } else if (spaces.length > 0) {
      setSelectedSpaceId(spaces[0].id);
      setSelectedSpaceIds((prev) => (prev.length === 0 ? [spaces[0].id] : prev));
    }
  }, [activeSpaceId, spaces]);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const data = await queryMindApi.getGoals();
      if (Array.isArray(data)) {
        // Hydrate with local metadata if stored
        const storedMetaStr = typeof window !== "undefined" ? localStorage.getItem("mynd_goals_meta") : null;
        const storedMeta: Record<string, Partial<EnrichedGoal>> = storedMetaStr ? JSON.parse(storedMetaStr) : {};

        const enriched: EnrichedGoal[] = data.map((g) => {
          const meta = storedMeta[g.id] || {};
          const goalSpaceIds: string[] = meta.space_ids || (g.project_id ? [g.project_id] : []);
          const space = spaces.find((s) => s.id === (g.project_id || meta.space_name));
          // Migrate old milestones to tasks if needed
          const tasks: GoalTask[] = (meta.tasks || meta.milestones || []).map((t) => ({
            id: t.id,
            title: t.title,
            completed: Boolean(t.completed),
            priority: t.priority || "medium",
          }));
          const calculatedProgress = g.status === "completed" ? 100 : computeGoalProgress(tasks);

          return {
            ...g,
            category: meta.category || "career",
            target_date: meta.target_date || "",
            priority: meta.priority || "high",
            progress: calculatedProgress,
            tasks,
            milestones: tasks,
            space_name: space?.name || meta.space_name || "General Workspace",
            space_ids: goalSpaceIds,
          };
        });
        setGoals(enriched);
      }
    } catch (err) {
      console.warn("Error fetching goals from API", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [spaces]);

  // Persist extra metadata to localStorage
  const saveGoalsMeta = (updatedGoals: EnrichedGoal[]) => {
    const metaMap: Record<string, Partial<EnrichedGoal>> = {};
    updatedGoals.forEach((g) => {
      metaMap[g.id] = {
        category: g.category,
        target_date: g.target_date,
        priority: g.priority,
        progress: g.progress,
        tasks: g.tasks || g.milestones,
        milestones: g.tasks || g.milestones,
        space_name: g.space_name,
        space_ids: g.space_ids,
      };
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("mynd_goals_meta", JSON.stringify(metaMap));
    }
  };

  const handleAddStagedTask = () => {
    if (!taskInput.trim()) return;
    setStagedTasks((prev) => [
      ...prev,
      { title: taskInput.trim(), priority: taskPriorityInput },
    ]);
    setTaskInput("");
  };

  const handleRemoveStagedTask = (index: number) => {
    setStagedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  // AI Auto-recommendation for new goals
  const handleAutoRecommendTasks = async () => {
    if (!goalDescription.trim()) return;
    setIsAiRecommending(true);
    setAiContextNote(null);
    try {
      const res = await queryMindApi.recommendGoalTasks({
        goal_description: goalDescription.trim(),
        space_id: selectedSpaceId || undefined,
        space_ids: selectedSpaceIds.length > 0 ? selectedSpaceIds : (selectedSpaceId ? [selectedSpaceId] : undefined),
        category,
      });

      if (res && Array.isArray(res.suggested_tasks) && res.suggested_tasks.length > 0) {
        setStagedTasks(res.suggested_tasks);
        if (res.context_used) {
          setAiContextNote(res.context_used);
        }
      }
    } catch (err: any) {
      console.error("AI recommendation error:", err);
      const msg = err?.response?.data?.detail || "Could not generate tasks. Please check your backend connection.";
      alert(`AI Task Generation: ${msg}`);
    } finally {
      setIsAiRecommending(false);
    }
  };

  // AI Auto-recommendation inside the Goal Detail Modal
  const handleModalAutoRecommendTasks = async (goal: EnrichedGoal) => {
    setIsModalAiRecommending(true);
    try {
      const res = await queryMindApi.recommendGoalTasks({
        goal_description: goal.description,
        space_id: goal.project_id || undefined,
        space_ids: goal.space_ids && goal.space_ids.length > 0 ? goal.space_ids : (goal.project_id ? [goal.project_id] : undefined),
        category: goal.category,
      });

      if (res && Array.isArray(res.suggested_tasks) && res.suggested_tasks.length > 0) {
        const existingTasks = goal.tasks || goal.milestones || [];
        const existingTitles = new Set(existingTasks.map((t) => t.title.toLowerCase().trim()));
        
        const newTasks: GoalTask[] = res.suggested_tasks
          .filter((st) => !existingTitles.has(st.title.toLowerCase().trim()))
          .map((st, idx) => ({
            id: `t-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
            title: st.title,
            completed: false,
            priority: st.priority,
          }));

        if (newTasks.length > 0) {
          const combined = [...existingTasks, ...newTasks];
          const calcProgress = computeGoalProgress(combined);
          
          setSelectedGoal((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              tasks: combined,
              milestones: combined,
              progress: calcProgress,
            };
          });

          setGoals((prevGoals) => {
            const next = prevGoals.map((g) => {
              if (g.id === goal.id) {
                return {
                  ...g,
                  tasks: combined,
                  milestones: combined,
                  progress: calcProgress,
                };
              }
              return g;
            });
            saveGoalsMeta(next);
            return next;
          });
        } else {
          alert("All recommended tasks for this goal are already in your list!");
        }
      }
    } catch (err: any) {
      console.error("Modal AI recommendation failed:", err);
      const msg = err?.response?.data?.detail || "Could not generate tasks. Please check your backend connection.";
      alert(`AI Task Suggestion: ${msg}`);
    } finally {
      setIsModalAiRecommending(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalDescription.trim()) return;

    setIsSubmitting(true);
    const assignedSpace = spaces.find((s) => s.id === selectedSpaceId);

    const initialTasks: GoalTask[] = stagedTasks.map((t, idx) => ({
      id: `t-${Date.now()}-${idx}`,
      title: t.title,
      completed: false,
      priority: t.priority,
    }));

    try {
      const created = await queryMindApi.createGoal({
        description: goalDescription.trim(),
        project_id: selectedSpaceId || undefined,
      });

      const effectiveSpaceIds = selectedSpaceIds.length > 0 ? selectedSpaceIds : (selectedSpaceId ? [selectedSpaceId] : []);
      const newEnriched: EnrichedGoal = {
        ...created,
        category,
        target_date: targetDate,
        priority,
        progress: 0,
        tasks: initialTasks,
        milestones: initialTasks,
        space_name: assignedSpace?.name || "General Workspace",
        space_ids: effectiveSpaceIds,
      };

      const nextGoals = [newEnriched, ...goals];
      setGoals(nextGoals);
      saveGoalsMeta(nextGoals);

      // Reset form
      setGoalDescription("");
      setTargetDate("");
      setStagedTasks([]);
      setIsFormOpen(false);
    } catch {
      // Local fallback
      const effectiveSpaceIds = selectedSpaceIds.length > 0 ? selectedSpaceIds : (selectedSpaceId ? [selectedSpaceId] : []);
      const localGoal: EnrichedGoal = {
        id: `goal-${Date.now()}`,
        user_id: "local",
        description: goalDescription.trim(),
        status: "in_progress",
        created_at: new Date().toISOString(),
        category,
        target_date: targetDate,
        priority,
        progress: 0,
        tasks: initialTasks,
        milestones: initialTasks,
        space_name: assignedSpace?.name || "General Workspace",
        space_ids: effectiveSpaceIds,
      };

      const nextGoals = [localGoal, ...goals];
      setGoals(nextGoals);
      saveGoalsMeta(nextGoals);

      setGoalDescription("");
      setTargetDate("");
      setStagedTasks([]);
      setIsFormOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleGoal = async (goal: EnrichedGoal) => {
    const newStatus = goal.status === "completed" ? "in_progress" : "completed";
    const newProgress = newStatus === "completed" ? 100 : 0;
    try {
      await queryMindApi.updateGoal(goal.id, { status: newStatus });
    } catch {
      // Offline fallback
    }

    const nextGoals = goals.map((g) => {
      if (g.id === goal.id) {
        const updatedTasks = (g.tasks || g.milestones || []).map((t) => ({
          ...t,
          completed: newStatus === "completed",
        }));
        return {
          ...g,
          status: newStatus,
          progress: newProgress,
          tasks: updatedTasks,
          milestones: updatedTasks,
        };
      }
      return g;
    });

    setGoals(nextGoals);
    saveGoalsMeta(nextGoals);
    if (selectedGoal?.id === goal.id) {
      setSelectedGoal(nextGoals.find((x) => x.id === goal.id) || null);
    }
  };

  const handleToggleTask = (goalId: string, taskId: string) => {
    const nextGoals = goals.map((g) => {
      if (g.id === goalId) {
        const currentTasks = g.tasks || g.milestones || [];
        const updatedTasks = currentTasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const calcProgress = computeGoalProgress(updatedTasks);
        const isAllDone = updatedTasks.length > 0 && updatedTasks.every((t) => t.completed);

        return {
          ...g,
          tasks: updatedTasks,
          milestones: updatedTasks,
          progress: calcProgress,
          status: isAllDone ? "completed" : "in_progress",
        };
      }
      return g;
    });

    setGoals(nextGoals);
    saveGoalsMeta(nextGoals);
    if (selectedGoal?.id === goalId) {
      setSelectedGoal(nextGoals.find((x) => x.id === goalId) || null);
    }
  };

  const handleAddModalTask = (goalId: string) => {
    if (!modalTaskInput.trim()) return;
    const newTask: GoalTask = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: modalTaskInput.trim(),
      completed: false,
      priority: modalTaskPriority,
    };
    const nextGoals = goals.map((g) => {
      if (g.id === goalId) {
        const updated = [...(g.tasks || g.milestones || []), newTask];
        const calcProgress = computeGoalProgress(updated);
        return {
          ...g,
          tasks: updated,
          milestones: updated,
          progress: calcProgress,
        };
      }
      return g;
    });
    setGoals(nextGoals);
    saveGoalsMeta(nextGoals);
    if (selectedGoal?.id === goalId) {
      setSelectedGoal(nextGoals.find((x) => x.id === goalId) || null);
    }
    setModalTaskInput("");
  };

  const handleRemoveModalTask = (goalId: string, taskId: string) => {
    const nextGoals = goals.map((g) => {
      if (g.id === goalId) {
        const updated = (g.tasks || g.milestones || []).filter((t) => t.id !== taskId);
        const calcProgress = computeGoalProgress(updated);
        return {
          ...g,
          tasks: updated,
          milestones: updated,
          progress: calcProgress,
        };
      }
      return g;
    });
    setGoals(nextGoals);
    saveGoalsMeta(nextGoals);
    if (selectedGoal?.id === goalId) {
      setSelectedGoal(nextGoals.find((x) => x.id === goalId) || null);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await queryMindApi.deleteGoal(id);
    } catch {
      // Ignore
    }
    const nextGoals = goals.filter((g) => g.id !== id);
    setGoals(nextGoals);
    saveGoalsMeta(nextGoals);
    if (selectedGoal?.id === id) {
      setSelectedGoal(null);
    }
  };

  const handleToggleGoalSpace = (goalId: string, spaceId: string) => {
    const nextGoals = goals.map((g) => {
      if (g.id === goalId) {
        const current = g.space_ids || (g.project_id ? [g.project_id] : []);
        const exists = current.includes(spaceId);
        const updated = exists ? current.filter((id) => id !== spaceId) : [...current, spaceId];
        return {
          ...g,
          space_ids: updated,
        };
      }
      return g;
    });
    setGoals(nextGoals);
    saveGoalsMeta(nextGoals);
    if (selectedGoal?.id === goalId) {
      setSelectedGoal(nextGoals.find((x) => x.id === goalId) || null);
    }
  };

  const handleSendGoalChat = async (goal: EnrichedGoal) => {
    if (!chatInput.trim() || isSendingChat) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setIsSendingChat(true);

    const newMsgItem = {
      role: "user" as const,
      content: userMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsgItem]);

    try {
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const effectiveSpaceIds = goal.space_ids && goal.space_ids.length > 0 
        ? goal.space_ids 
        : (goal.project_id ? [goal.project_id] : []);

      const res = await queryMindApi.sendGoalChatMessage(goal.id, {
        message: userMsg,
        history: historyPayload,
        goal_description: goal.description,
        progress: goal.progress || 0,
        tasks: goal.tasks || goal.milestones || [],
        target_date: goal.target_date,
        space_ids: effectiveSpaceIds,
      });

      if (res && res.response) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.response,
            citations: res.citations || [],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        if (res.spaces_searched) {
          setChatSpacesSearched(res.spaces_searched);
        }
      }
    } catch (err: any) {
      console.error("Goal chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I ran into a temporary error reaching the intelligence service. Please check your model or try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Stats calculation
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const activeGoals = totalGoals - completedGoals;
  const overallRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // Filtered goals
  const filteredGoals = useMemo(() => {
    if (selectedFilter === "all") return goals;
    return goals.filter((g) => g.category === selectedFilter);
  }, [goals, selectedFilter]);

  // Map each normalized task title to the goals that reference it (Cross-Goal Synergy)
  const taskGoalFrequencyMap = useMemo(() => {
    const map = new Map<string, { count: number; goalTitles: string[]; goalIds: string[] }>();
    goals.forEach((g) => {
      const tasks = g.tasks || g.milestones || [];
      const seenInGoal = new Set<string>();
      tasks.forEach((t) => {
        const norm = normalizeTaskTitle(t.title);
        if (!norm || seenInGoal.has(norm)) return;
        seenInGoal.add(norm);

        const current = map.get(norm) || { count: 0, goalTitles: [], goalIds: [] };
        current.count += 1;
        current.goalTitles.push(g.description);
        current.goalIds.push(g.id);
        map.set(norm, current);
      });
    });
    return map;
  }, [goals]);

  // ───────────────────────────────────────────────────────────
  // A. GOAL-SPECIFIC SCREEN (In-place workspace screen replacement)
  // When a goal is selected, this screen replaces the "All Goals" list.
  // The right sidebar (ContextPanel) automatically hosts the Goal Copilot Chat.
  // ───────────────────────────────────────────────────────────
  if (selectedGoal) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
        {/* Top Header / Navigation Bar */}
        <div
          style={{
            padding: "16px 20px",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setSelectedGoal(null);
                setChatMessages([]);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border)",
                background: "var(--surface-subtle)",
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms var(--ease)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              ← Back to Goals
            </button>

            <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />

            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                flexShrink: 0,
              }}
            >
              {selectedGoal.category || "Objective"}
            </span>

            {selectedGoal.priority && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                  background:
                    selectedGoal.priority === "high"
                      ? "rgba(239, 68, 68, 0.15)"
                      : selectedGoal.priority === "medium"
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(16, 185, 129, 0.15)",
                  color:
                    selectedGoal.priority === "high"
                      ? "#EF4444"
                      : selectedGoal.priority === "medium"
                      ? "#F59E0B"
                      : "#10B981",
                }}
              >
                {selectedGoal.priority} Priority
              </span>
            )}

            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "400px",
              }}
              title={selectedGoal.description}
            >
              {selectedGoal.description}
            </h2>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleToggleGoal(selectedGoal)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface-subtle)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms var(--ease)",
              }}
            >
              {selectedGoal.status === "completed" ? (
                <>
                  <Circle style={{ width: "13px", height: "13px" }} />
                  <span>In-Progress</span>
                </>
              ) : (
                <>
                  <CheckCircle2 style={{ width: "13px", height: "13px", color: "var(--color-success)" }} />
                  <span>Mark Completed</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDeleteGoal(selectedGoal.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                background: "rgba(239, 68, 68, 0.08)",
                color: "#EF4444",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 style={{ width: "13px", height: "13px" }} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Goal Content: Progress, Metadata, Spaces & Actionable Tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Progress Summary Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingUp style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Weighted Goal Completion
                </span>
              </div>
              <span style={{ fontSize: "24px", fontWeight: 800, color: selectedGoal.status === "completed" ? "#10B981" : "var(--text-primary)" }}>
                {selectedGoal.progress || 0}%
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "10px",
                background: "var(--surface-subtle)",
                borderRadius: "9999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${selectedGoal.progress || 0}%`,
                  height: "100%",
                  background: selectedGoal.status === "completed" ? "#10B981" : "var(--accent)",
                  borderRadius: "9999px",
                  transition: "width 300ms var(--ease)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-tertiary)" }}>
              <span>
                {(selectedGoal.tasks || selectedGoal.milestones || []).filter((t) => t.completed).length} of{" "}
                {(selectedGoal.tasks || selectedGoal.milestones || []).length} tasks finished
              </span>
              <span>
                {selectedGoal.status === "completed" ? "Goal Accomplished" : "Active Strategic Outcome"}
              </span>
            </div>
          </div>

          {/* Goal Metadata Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                Goal Metadata & Alignment
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                  Primary Space
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                  {spaces.find((s) => s.id === selectedGoal.project_id)?.name || "Universal / None"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                  Target Completion
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                  {selectedGoal.target_date
                    ? new Date(selectedGoal.target_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No deadline specified"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                  Date Created
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                  {selectedGoal.created_at
                    ? new Date(selectedGoal.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recently"}
                </p>
              </div>
            </div>

            {/* Associated Knowledge Spaces Multi-Select Chips */}
            <div style={{ marginTop: "8px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Associated Knowledge Spaces (Scoped Copilot Context):
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Toggle spaces to expand or narrow RAG scope
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {spaces.map((sp) => {
                  const currentSpaces = selectedGoal.space_ids || (selectedGoal.project_id ? [selectedGoal.project_id] : []);
                  const isAttached = currentSpaces.includes(sp.id);
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handleToggleGoalSpace(selectedGoal.id, sp.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: isAttached ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: isAttached ? "var(--accent-soft)" : "var(--surface-subtle)",
                        color: isAttached ? "var(--accent)" : "var(--text-secondary)",
                        transition: "all 150ms ease",
                      }}
                    >
                      <FolderKanban style={{ width: "12px", height: "12px" }} />
                      <span>{sp.name}</span>
                      {isAttached && <CheckCircle2 style={{ width: "12px", height: "12px", marginLeft: "2px" }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actionable Tasks Checklist */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Actionable Tasks & Milestones
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "var(--surface-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {(selectedGoal.tasks || selectedGoal.milestones || []).length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleModalAutoRecommendTasks(selectedGoal)}
                disabled={isModalAiRecommending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--accent)",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isModalAiRecommending ? "not-allowed" : "pointer",
                  opacity: isModalAiRecommending ? 0.6 : 1,
                  transition: "all 150ms ease",
                }}
              >
                <Sparkles style={{ width: "13px", height: "13px" }} />
                <span>{isModalAiRecommending ? "Generating Tasks..." : "AI Auto-Suggest Tasks"}</span>
              </button>
            </div>

            {/* Cross-Goal Synergy Information Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(139, 92, 246, 0.08)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                fontSize: "12px",
                color: "#C4B5FD",
              }}
            >
              <Zap style={{ width: "14px", height: "14px", color: "#A78BFA", flexShrink: 0 }} />
              <span>
                <strong>Cross-Goal Priority Booster Active:</strong> Tasks shared across 2 or more strategic goals automatically escalate to High Priority with enhanced completion weight.
              </span>
            </div>

            {/* Task List Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(selectedGoal.tasks || selectedGoal.milestones || []).length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                  No tasks configured yet. Add high-impact tasks below or click &ldquo;AI Auto-Suggest Tasks&rdquo; to draft them instantly.
                </div>
              ) : (
                (selectedGoal.tasks || selectedGoal.milestones || []).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: t.completed ? "var(--surface-subtle)" : "var(--surface)",
                      border: "1px solid var(--border)",
                      transition: "all 150ms ease",
                    }}
                  >
                    <div
                      onClick={() => handleToggleTask(selectedGoal.id, t.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flex: 1,
                        cursor: "pointer",
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          color: t.completed ? "#10B981" : "var(--text-tertiary)",
                        }}
                      >
                        {t.completed ? (
                          <CheckCircle2 style={{ width: "18px", height: "18px" }} />
                        ) : (
                          <Circle style={{ width: "18px", height: "18px" }} />
                        )}
                      </button>

                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: t.completed ? "var(--text-tertiary)" : "var(--text-primary)",
                          textDecoration: t.completed ? "line-through" : "none",
                        }}
                      >
                        {t.title}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {(() => {
                        const norm = normalizeTaskTitle(t.title);
                        const matchData = taskGoalFrequencyMap.get(norm);
                        const sharedCount = matchData ? matchData.count : 1;
                        const { effectivePriority, isBoosted, weightMultiplier } = getEffectiveTaskPriority(
                          t.priority || "medium",
                          sharedCount
                        );

                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {/* Shared Across Multiple Goals Synergy Tag */}
                            {isBoosted && (
                              <span
                                title={`Shared across ${sharedCount} goals: ${matchData?.goalTitles.join(" • ")}`}
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background: "rgba(139, 92, 246, 0.15)",
                                  color: "#A78BFA",
                                  border: "1px solid rgba(139, 92, 246, 0.3)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                <Zap style={{ width: "10px", height: "10px", color: "#A78BFA" }} />
                                <span>{sharedCount} Goals ({weightMultiplier}x Boost)</span>
                              </span>
                            )}

                            {/* Priority Badge */}
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                background:
                                  effectivePriority === "high"
                                    ? "rgba(239, 68, 68, 0.15)"
                                    : effectivePriority === "medium"
                                    ? "rgba(245, 158, 11, 0.15)"
                                    : "rgba(16, 185, 129, 0.15)",
                                color:
                                  effectivePriority === "high"
                                    ? "#EF4444"
                                    : effectivePriority === "medium"
                                    ? "#F59E0B"
                                    : "#10B981",
                                border: isBoosted
                                  ? "1px solid rgba(239, 68, 68, 0.4)"
                                  : "1px solid transparent",
                              }}
                            >
                              {effectivePriority === "high"
                                ? `High (${weightMultiplier}x)`
                                : effectivePriority === "medium"
                                ? `Med (${weightMultiplier}x)`
                                : `Low (${weightMultiplier}x)`}
                            </span>
                          </div>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveModalTask(selectedGoal.id, t.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "4px",
                          cursor: "pointer",
                          color: "var(--text-ghost)",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-ghost)")}
                      >
                        <Trash2 style={{ width: "14px", height: "14px" }} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Task Input Row */}
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <input
                type="text"
                placeholder="Enter next strategic task..."
                value={modalTaskInput}
                onChange={(e) => setModalTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddModalTask(selectedGoal.id);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />

              <select
                value={modalTaskPriority}
                onChange={(e) => setModalTaskPriority(e.target.value as any)}
                style={{
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  outline: "none",
                }}
              >
                <option value="high">High (3x)</option>
                <option value="medium">Medium (2x)</option>
                <option value="low">Low (1x)</option>
              </select>

              <button
                type="button"
                onClick={() => handleAddModalTask(selectedGoal.id)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add Task
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────
  // B. ALL GOALS SCREEN (Default view)
  // ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "980px", margin: "0 auto" }}>
      {/* 1. Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 10px", borderRadius: "var(--r-full)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "8px" }}>
            <Target style={{ width: "13px", height: "13px" }} />
            <span>Strategic Goal Engine</span>
          </div>
          <h1 style={{ fontSize: "var(--t-display)", fontWeight: "var(--w-bold)", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Goals & Strategic Objectives
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Define, structure, and track high-impact outcomes aligned with your knowledge spaces.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={fetchGoals}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer", transition: "all 150ms var(--ease)" }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <RefreshCw style={{ width: "14px", height: "14px" }} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 18px", borderRadius: "var(--r-md)", background: isFormOpen ? "var(--surface-hover)" : "var(--accent)", color: isFormOpen ? "var(--text-primary)" : "var(--accent-contrast)", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "var(--shadow-sm)", transition: "all 150ms var(--ease)" }}
          >
            <Plus style={{ width: "15px", height: "15px" }} />
            <span>{isFormOpen ? "Close Form" : "Define Goal"}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Active Goals</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>{activeGoals}</div>
          <div style={{ fontSize: "11px", color: "var(--text-ghost)" }}>In-progress targets</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Completed Goals</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-success)" }}>{completedGoals}</div>
          <div style={{ fontSize: "11px", color: "var(--text-ghost)" }}>Verified achievements</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Overall Execution Rate</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent)" }}>{overallRate}%</div>
          <div style={{ width: "100%", height: "4px", background: "var(--surface-subtle)", borderRadius: "var(--r-full)", marginTop: "4px", overflow: "hidden" }}>
            <div style={{ width: `${overallRate}%`, height: "100%", background: "var(--accent)", borderRadius: "var(--r-full)", transition: "width 400ms var(--ease)" }} />
          </div>
        </div>
      </div>

      {/* 3. Define Goal Form Panel (Collapsible / Expandable) */}
      {isFormOpen && (
        <form
          onSubmit={handleCreateGoal}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-xl)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "var(--shadow-md)",
            animation: "fadeIn 200ms ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <Sparkles style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              Define Strategic Goal
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Goal Statement *
            </label>
            <input
              type="text"
              required
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              placeholder="e.g. Master Distributed Consensus Algorithms & Deploy Raft Implementation"
              style={{ width: "100%", height: "42px", padding: "0 14px", background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {/* Category */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Domain Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: "100%", height: "40px", padding: "0 10px", background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
              >
                <option value="career">Career & Projects</option>
                <option value="knowledge">Learning & Research</option>
                <option value="architecture">System & Architecture</option>
                <option value="personal">Personal Growth</option>
              </select>
            </div>

            {/* Space Alignment & Multi-Space Association */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Associated Knowledge Spaces
                </label>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  {selectedSpaceIds.length} space{selectedSpaceIds.length === 1 ? "" : "s"} linked
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "6px", background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", minHeight: "42px", alignItems: "center" }}>
                {spaces.map((s) => {
                  const isSelected = selectedSpaceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSpaceIds((prev) => {
                          const exists = prev.includes(s.id);
                          const next = exists ? prev.filter((id) => id !== s.id) : [...prev, s.id];
                          if (next.length > 0) {
                            setSelectedSpaceId(next[0]);
                          } else {
                            setSelectedSpaceId("");
                          }
                          return next;
                        });
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: isSelected ? 600 : 500,
                        background: isSelected ? "var(--accent)" : "var(--surface)",
                        color: isSelected ? "var(--accent-contrast)" : "var(--text-secondary)",
                        border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      <Layers style={{ width: "12px", height: "12px" }} />
                      <span>{s.name}</span>
                      {isSelected && <Check style={{ width: "12px", height: "12px" }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Date */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Target Completion Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ width: "100%", height: "40px", padding: "0 10px", background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
              />
            </div>

            {/* Priority */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{ width: "100%", height: "40px", padding: "0 10px", background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Actionable Tasks & Priority Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                  Key Tasks & Subtasks
                </label>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  High (3x), Medium (2x), Low (1x) weighted towards progress
                </span>
              </div>

              {/* AI Auto-Recommend Button */}
              <button
                type="button"
                onClick={handleAutoRecommendTasks}
                disabled={isAiRecommending || !goalDescription.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  background: "var(--accent-soft)",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  color: "var(--accent)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isAiRecommending || !goalDescription.trim() ? "not-allowed" : "pointer",
                  opacity: isAiRecommending || !goalDescription.trim() ? 0.6 : 1,
                  transition: "all 150ms ease",
                }}
              >
                <Sparkles style={{ width: "14px", height: "14px" }} />
                <span>{isAiRecommending ? "AI Searching & Formulating Tasks..." : "AI Auto-Breakdown Tasks"}</span>
              </button>
            </div>

            {aiContextNote && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  fontSize: "12px",
                  color: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>✨</span>
                <span>AI synthesized tasks using knowledge base: {aiContextNote}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddStagedTask();
                  }
                }}
                placeholder="e.g. Implement Raft Leader Election simulator module"
                style={{ flex: 1, minWidth: "220px", height: "38px", padding: "0 12px", background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
              />

              <select
                value={taskPriorityInput}
                onChange={(e) => setTaskPriorityInput(e.target.value as any)}
                style={{ height: "38px", padding: "0 10px", background: "var(--surface-subtle)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: "12px", outline: "none" }}
              >
                <option value="high">High Importance (3x)</option>
                <option value="medium">Medium Importance (2x)</option>
                <option value="low">Low Importance (1x)</option>
              </select>

              <button
                type="button"
                onClick={handleAddStagedTask}
                style={{ padding: "0 16px", height: "38px", borderRadius: "var(--r-md)", background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                + Add Task
              </button>
            </div>

            {stagedTasks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                {stagedTasks.map((t, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "var(--r-sm)", background: "var(--surface-subtle)", border: "1px solid var(--border)", fontSize: "13px", color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>#{idx + 1}</span>
                      <span>{t.title}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          background:
                            t.priority === "high"
                              ? "rgba(239, 68, 68, 0.15)"
                              : t.priority === "medium"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(16, 185, 129, 0.15)",
                          color:
                            t.priority === "high"
                              ? "#EF4444"
                              : t.priority === "medium"
                              ? "#F59E0B"
                              : "#10B981",
                        }}
                      >
                        {t.priority} ({t.priority === "high" ? "3x" : t.priority === "medium" ? "2x" : "1x"})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStagedTask(idx)}
                      style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", fontSize: "12px" }}
                      onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-error)")}
                      onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-ghost)")}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              style={{ padding: "8px 16px", borderRadius: "var(--r-md)", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !goalDescription.trim()}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 20px", borderRadius: "var(--r-md)", background: "var(--accent)", color: "var(--accent-contrast)", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", opacity: isSubmitting || !goalDescription.trim() ? 0.5 : 1 }}
            >
              <Zap style={{ width: "14px", height: "14px" }} />
              <span>{isSubmitting ? "Creating..." : "Save Goal"}</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Category Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", borderBottom: "1px solid var(--border)" }}>
        {PRESET_CATEGORIES.map((cat) => {
          const isSelected = selectedFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedFilter(cat.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "var(--r-full)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms var(--ease)",
                border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                background: isSelected ? "var(--accent-soft)" : "transparent",
                color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {cat.color && (
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cat.color }} />
              )}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Goals Card Grid */}
      {isLoading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: "14px" }}>
          Loading real-time goals...
        </div>
      ) : filteredGoals.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {filteredGoals.map((g) => {
            const isDone = g.status === "completed";
            const tasks = g.tasks || g.milestones || [];
            const completedCount = tasks.filter((t) => t.completed).length;
            const progress = g.progress || 0;

            return (
              <div
                key={g.id}
                onClick={() => setSelectedGoal(g)}
                style={{
                  background: "var(--surface)",
                  border: isDone ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  cursor: "pointer",
                  transition: "transform 150ms var(--ease), border-color 150ms var(--ease), box-shadow 150ms var(--ease)",
                  boxShadow: "var(--shadow-xs)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = isDone ? "rgba(16, 185, 129, 0.6)" : "var(--border-strong)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = isDone ? "rgba(16, 185, 129, 0.35)" : "var(--border)";
                  e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                }}
              >
                {/* Accent line on top of card */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: isDone
                      ? "#10B981"
                      : progress > 60
                      ? "#6366F1"
                      : progress > 25
                      ? "#F59E0B"
                      : "var(--border-strong)",
                  }}
                />

                {/* Card Header: Category & Priority */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Layers style={{ width: "12px", height: "12px" }} />
                    <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.space_name || "General"}
                    </span>
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {g.priority && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "9999px",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          background:
                            g.priority === "high"
                              ? "rgba(239, 68, 68, 0.15)"
                              : g.priority === "medium"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(16, 185, 129, 0.15)",
                          color:
                            g.priority === "high"
                              ? "#EF4444"
                              : g.priority === "medium"
                              ? "#F59E0B"
                              : "#10B981",
                        }}
                      >
                        {g.priority}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleGoal(g);
                      }}
                      title={isDone ? "Mark as In-Progress" : "Mark as Completed"}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "2px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 style={{ width: "18px", height: "18px", color: "var(--color-success)" }} />
                      ) : (
                        <Circle style={{ width: "18px", height: "18px", color: "var(--text-ghost)" }} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Main: Goal Title */}
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: isDone ? "var(--text-tertiary)" : "var(--text-primary)",
                      lineHeight: "1.4",
                      margin: "0 0 6px 0",
                      textDecoration: isDone ? "line-through" : "none",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {g.description}
                  </h3>

                  {g.target_date && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                      <Calendar style={{ width: "11px", height: "11px" }} />
                      <span>Target: {new Date(g.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Progress Bar & Percentage */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>
                      {tasks.length > 0 ? `${completedCount}/${tasks.length} tasks` : "Progress"}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: isDone ? "var(--color-success)" : "var(--text-primary)",
                      }}
                    >
                      {progress}%
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      background: "var(--surface-subtle)",
                      borderRadius: "9999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: isDone ? "var(--color-success)" : "var(--accent)",
                        borderRadius: "9999px",
                        transition: "width 300ms var(--ease)",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px dashed var(--border-strong)", borderRadius: "var(--r-xl)", padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <Target style={{ width: "36px", height: "36px", color: "var(--text-ghost)" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            No goals found in this category
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", maxWidth: "420px", margin: 0 }}>
            Define an objective above to set target outcomes, align spaces, and track autonomous execution.
          </p>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            style={{ marginTop: "8px", padding: "8px 18px", borderRadius: "var(--r-md)", background: "var(--accent)", color: "var(--accent-contrast)", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            + Define First Goal
          </button>
        </div>
      )}
    </div>
  );
}
