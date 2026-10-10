"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  RefreshCw,
  Layers,
  Calendar,
  AlertCircle,
  CheckSquare,
  Square,
  Bot,
  Send,
  X,
  Zap,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Search,
  Check,
  TrendingUp,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  ListTodo,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import confetti from "canvas-confetti";
import { queryMindApi, GoalData } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";

interface GoalTask {
  id: string;
  title: string;
  completed: boolean;
  sub_goal?: string;
  priority?: "high" | "medium" | "low";
  estimated_time?: string;
  time_phase?: string;
  reasoning?: string;
}

const CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "engineering", label: "Engineering & Architecture" },
  { id: "career", label: "Career & Projects" },
  { id: "research", label: "Research & Learning" },
  { id: "personal", label: "Personal Growth" },
];

const TASK_WEIGHTS: Record<"high" | "medium" | "low", number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function computeProgress(tasks?: GoalTask[], status?: string): number {
  if (status === "completed") return 100;
  if (!tasks || tasks.length === 0) return 0;
  let totalWeight = 0;
  let completedWeight = 0;
  for (const t of tasks) {
    const weight = TASK_WEIGHTS[t.priority || "medium"] || 2;
    totalWeight += weight;
    if (t.completed) completedWeight += weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round((completedWeight / totalWeight) * 100);
}

// Stop words to find cross-goal synergy
const STOP_WORDS = new Set([
  "and", "or", "the", "a", "an", "in", "on", "at", "to", "for", "of", "with", "by",
  "master", "execute", "conquer", "dominate", "perform", "timed", "foundational",
  "core", "advanced", "fundamentals", "mechanics", "drills", "pillars", "sprints",
  "simulation", "foundations", "synthesis", "engineering"
]);

function extractSignificantTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[(),:/\-_&]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function areTasksSemanticallyShared(titleA: string, titleB: string): boolean {
  const normA = titleA.toLowerCase().trim().replace(/[^\w\s]/g, "");
  const normB = titleB.toLowerCase().trim().replace(/[^\w\s]/g, "");
  if (normA === normB) return true;

  const tokensA = extractSignificantTokens(titleA);
  const tokensB = extractSignificantTokens(titleB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const setB = new Set(tokensB);
  const common = tokensA.filter((t) => setB.has(t));
  return common.length >= 2;
}

function GoalsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSpaceFilter = searchParams.get("space_id") || "all";
  const targetGoalId = searchParams.get("goal_id");

  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  // Core Goals State
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GoalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>(initialSpaceFilter);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sub-Goal View State (collapse state by sub_goal title)
  const [collapsedSubGoals, setCollapsedSubGoals] = useState<Record<string, boolean>>({});

  // New Goal Modal State with Auto-Space Verification
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [suggestedSpaceId, setSuggestedSpaceId] = useState<string | null>(null);
  const [verifiedSpaceId, setVerifiedSpaceId] = useState<string>("");
  const [isSpaceVerified, setIsSpaceVerified] = useState(false);
  const [newGoalCategory, setNewGoalCategory] = useState("engineering");
  const [newGoalPriority, setNewGoalPriority] = useState<"high" | "medium" | "low">("medium");
  const [newGoalTargetDate, setNewGoalTargetDate] = useState("");
  const [newGoalTimeframe, setNewGoalTimeframe] = useState<string>("2 weeks");
  const [customTimeframeInput, setCustomTimeframeInput] = useState<string>("");
  const [stagedTasks, setStagedTasks] = useState<
    Array<{
      title: string;
      sub_goal: string;
      priority: "high" | "medium" | "low";
      estimated_time?: string;
      time_phase?: string;
      reasoning?: string;
    }>
  >([]);
  const [stagedTaskInput, setStagedTaskInput] = useState("");
  const [stagedSubGoalInput, setStagedSubGoalInput] = useState("Core Objectives");
  const [isDecomposingWithAi, setIsDecomposingWithAi] = useState(false);
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  // In-Workspace Sub-Task & Sub-Goal State
  const [workspaceTaskInput, setWorkspaceTaskInput] = useState("");
  const [workspaceTargetSubGoal, setWorkspaceTargetSubGoal] = useState("Core Objectives");
  const [newSubGoalNameInput, setNewSubGoalNameInput] = useState("");
  const [isAddingSubGoalSection, setIsAddingSubGoalSection] = useState(false);
  const [isWorkspaceDecomposing, setIsWorkspaceDecomposing] = useState(false);

  // Multi-Goal Ripple Prompt Modal
  const [ripplePrompt, setRipplePrompt] = useState<{
    taskTitle: string;
    sourceGoalId: string;
    matches: Array<{ goalId: string; goalTitle: string; taskId: string }>;
  } | null>(null);

  // Copilot State
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
      citations?: Array<{ document_title?: string; page_number?: number; snippet: string }>;
      timestamp?: string;
    }>
  >([]);
  const [copilotInput, setCopilotInput] = useState("");
  const [isSendingCopilot, setIsSendingCopilot] = useState(false);
  const copilotEndRef = useRef<HTMLDivElement>(null);

  // Auto-suggest space based on goal description semantics
  const autoDetectSpace = (desc: string): string | null => {
    if (!desc.trim() || spaces.length === 0) return null;
    const tokens = extractSignificantTokens(desc);
    if (tokens.length === 0) return spaces[0].id;

    let bestSpaceId: string | null = null;
    let maxScore = -1;

    spaces.forEach((sp) => {
      let score = 0;
      const spTokens = extractSignificantTokens(`${sp.name} ${sp.desc || ""}`);
      tokens.forEach((t) => {
        if (spTokens.includes(t)) score += 3;
        if (sp.name.toLowerCase().includes(t)) score += 5;
      });
      if (score > maxScore) {
        maxScore = score;
        bestSpaceId = sp.id;
      }
    });

    return bestSpaceId || spaces[0].id;
  };

  // Re-run space auto-detection when newGoalDesc changes
  useEffect(() => {
    if (!newGoalDesc.trim()) {
      setSuggestedSpaceId(null);
      setIsSpaceVerified(false);
      return;
    }
    const detected = autoDetectSpace(newGoalDesc);
    setSuggestedSpaceId(detected);
    if (!isSpaceVerified) {
      setVerifiedSpaceId(detected || spaces[0]?.id || "");
    }
  }, [newGoalDesc, spaces]);

  // Fetch real goals from backend
  const fetchGoals = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const data = await queryMindApi.getGoals();
      if (Array.isArray(data)) {
        setGoals(data);

        // Check if a specific goalId was requested via URL param
        if (targetGoalId) {
          const matched = data.find((g) => g.id === targetGoalId);
          if (matched) {
            handleSelectGoal(matched);
          }
        } else if (selectedGoal) {
          const updated = data.find((g) => g.id === selectedGoal.id);
          if (updated) setSelectedGoal(updated);
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch goals:", err);
      setErrorMsg("Failed to synchronize goals from backend.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [targetGoalId]);

  // Compute Task Synergies across active goals
  const synergyMap = useMemo(() => {
    const tokenToGoals = new Map<string, Set<string>>();
    goals.forEach((g) => {
      (g.tasks || []).forEach((t) => {
        if (!t.completed) {
          const tokens = extractSignificantTokens(t.title);
          tokens.forEach((tk) => {
            if (!tokenToGoals.has(tk)) tokenToGoals.set(tk, new Set());
            tokenToGoals.get(tk)!.add(g.id);
          });
        }
      });
    });

    const synergyGoals = new Map<string, number>();
    tokenToGoals.forEach((goalSet) => {
      if (goalSet.size > 1) {
        goalSet.forEach((gId) => {
          synergyGoals.set(gId, (synergyGoals.get(gId) || 0) + 1);
        });
      }
    });

    return synergyGoals;
  }, [goals]);

  // Extract Top Multi-Goal Synergies
  const topSynergies = useMemo(() => {
    const list: Array<{ title: string; count: number; goalTitles: string[]; goalIds: string[] }> = [];

    goals.forEach((g) => {
      (g.tasks || []).forEach((t) => {
        if (t.completed) return;
        const matchingGoals = new Set<string>([g.id]);
        const matchingTitles = new Set<string>([g.description]);

        goals.forEach((other) => {
          if (other.id === g.id) return;
          const match = (other.tasks || []).some(
            (ot) => !ot.completed && areTasksSemanticallyShared(t.title, ot.title)
          );
          if (match) {
            matchingGoals.add(other.id);
            matchingTitles.add(other.description);
          }
        });

        if (matchingGoals.size > 1) {
          const alreadyListed = list.some((item) => areTasksSemanticallyShared(item.title, t.title));
          if (!alreadyListed) {
            list.push({
              title: t.title,
              count: matchingGoals.size,
              goalTitles: Array.from(matchingTitles),
              goalIds: Array.from(matchingGoals),
            });
          }
        }
      });
    });

    return list.sort((a, b) => b.count - a.count).slice(0, 3);
  }, [goals]);

  // Telemetry Calculations
  const metrics = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === "completed").length;
    const inProgress = total - completed;

    let totalTasks = 0;
    let completedTasks = 0;
    goals.forEach((g) => {
      (g.tasks || []).forEach((t) => {
        totalTasks++;
        if (t.completed) completedTasks++;
      });
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { total, completed, inProgress, totalTasks, completedTasks, completionRate, taskRate };
  }, [goals]);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (selectedSpaceFilter !== "all") {
        if (g.space_id !== selectedSpaceFilter && g.project_id !== selectedSpaceFilter) {
          return false;
        }
      }
      if (selectedStatusFilter === "in_progress" && g.status === "completed") return false;
      if (selectedStatusFilter === "completed" && g.status !== "completed") return false;

      if (selectedCategoryFilter !== "all") {
        const cat = (g.category || "engineering").toLowerCase();
        if (cat !== selectedCategoryFilter.toLowerCase()) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = g.description.toLowerCase().includes(q);
        const taskMatch = (g.tasks || []).some((t) => t.title.toLowerCase().includes(q));
        const catMatch = (g.category || "").toLowerCase().includes(q);
        if (!descMatch && !taskMatch && !catMatch) return false;
      }

      return true;
    });
  }, [goals, selectedSpaceFilter, selectedStatusFilter, selectedCategoryFilter, searchQuery]);

  // Toggle Goal status (in_progress <-> completed)
  const handleToggleGoalStatus = async (goal: GoalData) => {
    const nextStatus = goal.status === "completed" ? "in_progress" : "completed";
    try {
      const updated = await queryMindApi.updateGoal(goal.id, {
        status: nextStatus,
      });

      if (nextStatus === "completed") {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#6366f1", "#10b981", "#8b5cf6"],
        });
      }

      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
      if (selectedGoal?.id === goal.id) {
        setSelectedGoal(updated);
      }
    } catch (err: any) {
      console.error("Failed to toggle goal status:", err);
      alert("Failed to update goal: " + (err.message || err));
    }
  };

  // Toggle sub-task completion with Multi-Goal Ripple synergy check
  const handleToggleSubTask = async (goal: GoalData, taskId: string) => {
    const existingTasks = goal.tasks || [];
    let toggledTaskTitle = "";
    let isNowCompleted = false;

    const updatedTasks = existingTasks.map((t) => {
      if (t.id === taskId) {
        toggledTaskTitle = t.title;
        isNowCompleted = !t.completed;
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    // Optimistically update
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, tasks: updatedTasks } : g))
    );
    if (selectedGoal?.id === goal.id) {
      setSelectedGoal({ ...selectedGoal, tasks: updatedTasks });
    }

    try {
      const updated = await queryMindApi.updateGoal(goal.id, {
        tasks: updatedTasks,
      });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
      if (selectedGoal?.id === goal.id) {
        setSelectedGoal(updated);
      }

      // Check for Multi-Goal Ripple if task was just marked COMPLETED
      if (isNowCompleted && toggledTaskTitle) {
        const matchingTargets: Array<{ goalId: string; goalTitle: string; taskId: string }> = [];
        goals.forEach((otherGoal) => {
          if (otherGoal.id === goal.id) return;
          (otherGoal.tasks || []).forEach((ot) => {
            if (!ot.completed && areTasksSemanticallyShared(toggledTaskTitle, ot.title)) {
              matchingTargets.push({
                goalId: otherGoal.id,
                goalTitle: otherGoal.description,
                taskId: ot.id,
              });
            }
          });
        });

        if (matchingTargets.length > 0) {
          setRipplePrompt({
            taskTitle: toggledTaskTitle,
            sourceGoalId: goal.id,
            matches: matchingTargets,
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to update sub-task:", err);
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, tasks: existingTasks } : g))
      );
      if (selectedGoal?.id === goal.id) {
        setSelectedGoal({ ...selectedGoal, tasks: existingTasks });
      }
    }
  };

  // Apply ripple completion across matched goals
  const handleApplyRipple = async () => {
    if (!ripplePrompt) return;
    const { matches } = ripplePrompt;

    for (const match of matches) {
      const targetGoal = goals.find((g) => g.id === match.goalId);
      if (targetGoal) {
        const nextTasks = (targetGoal.tasks || []).map((t) =>
          t.id === match.taskId ? { ...t, completed: true } : t
        );
        try {
          await queryMindApi.updateGoal(match.goalId, { tasks: nextTasks });
          setGoals((prev) =>
            prev.map((g) => (g.id === match.goalId ? { ...g, tasks: nextTasks } : g))
          );
        } catch (err) {
          console.warn("Ripple sync failed for goal:", match.goalId, err);
        }
      }
    }
    setRipplePrompt(null);
  };

  // Add sub-task inside a specific Sub-Goal section in the workspace
  const handleAddWorkspaceTask = async (targetSubGoalName?: string) => {
    if (!workspaceTaskInput.trim() || !selectedGoal) return;
    const existingTasks = selectedGoal.tasks || [];
    const subGoalToUse = targetSubGoalName || workspaceTargetSubGoal || "Core Objectives";

    const newTask: GoalTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: workspaceTaskInput.trim(),
      sub_goal: subGoalToUse,
      completed: false,
      priority: "medium",
    };
    const updatedTasks = [...existingTasks, newTask];

    try {
      const updated = await queryMindApi.updateGoal(selectedGoal.id, {
        tasks: updatedTasks,
      });
      setGoals((prev) => prev.map((g) => (g.id === selectedGoal.id ? updated : g)));
      setSelectedGoal(updated);
      setWorkspaceTaskInput("");
    } catch (err: any) {
      alert("Failed to add task: " + (err.message || err));
    }
  };

  // Create a brand new Sub-Goal section
  const handleCreateSubGoalSection = () => {
    if (!newSubGoalNameInput.trim()) return;
    setWorkspaceTargetSubGoal(newSubGoalNameInput.trim());
    setIsAddingSubGoalSection(false);
    setNewSubGoalNameInput("");
  };

  // Delete sub-task inside workspace
  const handleDeleteSubTask = async (taskId: string) => {
    if (!selectedGoal) return;
    const updatedTasks = (selectedGoal.tasks || []).filter((t) => t.id !== taskId);
    try {
      const updated = await queryMindApi.updateGoal(selectedGoal.id, {
        tasks: updatedTasks,
      });
      setGoals((prev) => prev.map((g) => (g.id === selectedGoal.id ? updated : g)));
      setSelectedGoal(updated);
    } catch (err: any) {
      alert("Failed to delete sub-task: " + (err.message || err));
    }
  };

  // Decompose tasks inside the workspace using AI with Sub-Goals
  const handleWorkspaceDecompose = async () => {
    if (!selectedGoal) return;
    setIsWorkspaceDecomposing(true);
    try {
      const res = await queryMindApi.recommendGoalTasks({
        goal_description: selectedGoal.description,
        space_id: selectedGoal.space_id || undefined,
        category: selectedGoal.category,
        timeframe: selectedGoal.timeframe || selectedGoal.target_date || "2 weeks",
      });

      if (res && Array.isArray(res.suggested_tasks) && res.suggested_tasks.length > 0) {
        const existingTasks = selectedGoal.tasks || [];
        const existingTitles = new Set(existingTasks.map((t) => t.title.toLowerCase().trim()));

        const newTasks: GoalTask[] = res.suggested_tasks
          .filter((st) => !existingTitles.has(st.title.toLowerCase().trim()))
          .map((st, i) => ({
            id: `task-${Date.now()}-${i}`,
            title: st.title,
            sub_goal: st.sub_goal || "Core Objectives",
            completed: false,
            priority: (st.priority as any) || "medium",
            estimated_time: st.estimated_time,
            time_phase: st.time_phase,
            reasoning: st.reasoning,
          }));

        if (newTasks.length > 0) {
          const combined = [...existingTasks, ...newTasks];
          const updated = await queryMindApi.updateGoal(selectedGoal.id, {
            tasks: combined,
          });
          setGoals((prev) => prev.map((g) => (g.id === selectedGoal.id ? updated : g)));
          setSelectedGoal(updated);
        } else {
          alert("All recommended tasks are already in this goal.");
        }
      }
    } catch (err: any) {
      alert("Failed to decompose tasks: " + (err.message || err));
    } finally {
      setIsWorkspaceDecomposing(false);
    }
  };

  // Delete an entire goal
  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this objective and its tracked tasks?")) return;
    try {
      await queryMindApi.deleteGoal(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      if (selectedGoal?.id === goalId) {
        setSelectedGoal(null);
        router.replace("/goals");
      }
    } catch (err: any) {
      alert("Failed to delete goal: " + (err.message || err));
    }
  };

  // Select a goal to enter focus workspace
  const handleSelectGoal = (goal: GoalData) => {
    setSelectedGoal(goal);
    setCopilotMessages([
      {
        role: "assistant",
        content: `**Strategic Goal Advisor Active**\n\nGrounded in the documents and tasks scoped to **"${goal.description}"** within space *${getSpaceName(goal.space_id)}*.\n\nAsk me how to resolve next steps, synthesize domain citations, or unblock tasks.`,
        timestamp: "Just now",
      },
    ]);
  };

  // Send message in Goal Copilot
  const handleSendCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim() || !selectedGoal || isSendingCopilot) return;

    const userMsg = copilotInput.trim();
    setCopilotInput("");
    setCopilotMessages((prev) => [...prev, { role: "user", content: userMsg, timestamp: "Just now" }]);
    setIsSendingCopilot(true);

    try {
      const history = copilotMessages.map((m) => ({ role: m.role, content: m.content }));
      const subGoalNames = Object.keys(
        (selectedGoal.tasks || []).reduce((acc, t) => {
          const groupName = t.sub_goal?.trim() || "Core Objectives";
          acc[groupName] = true;
          return acc;
        }, {} as Record<string, boolean>)
      );
      if (subGoalNames.length === 0) subGoalNames.push("Core Objectives");

      const res = await queryMindApi.sendGoalChatMessage(selectedGoal.id, {
        message: userMsg,
        history,
        goal_description: selectedGoal.description,
        progress: computeProgress(selectedGoal.tasks, selectedGoal.status),
        tasks: selectedGoal.tasks,
        sub_goals: subGoalNames,
        space_ids: selectedGoal.space_id ? [selectedGoal.space_id] : [],
      });

      setCopilotMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.response || "No response received from reasoning copilot.",
          citations: res.citations || [],
          timestamp: "Just now",
        },
      ]);
    } catch (err: any) {
      console.error("Failed to query goal copilot:", err);
      setCopilotMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Unable to retrieve domain reasoning: ${err.message || "Endpoint error"}. Verify backend health.`,
          timestamp: "Just now",
        },
      ]);
    } finally {
      setIsSendingCopilot(false);
    }
  };

  // Auto scroll copilot chat
  useEffect(() => {
    copilotEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotMessages, isSendingCopilot]);

  // AI Task Decomposition for modal creation
  const handleModalDecompose = async () => {
    if (!newGoalDesc.trim()) {
      alert("Please enter a goal description first.");
      return;
    }
    setIsDecomposingWithAi(true);
    const effectiveTf =
      newGoalTimeframe === "custom" && customTimeframeInput.trim()
        ? customTimeframeInput.trim()
        : newGoalTimeframe === "custom"
        ? newGoalTargetDate || "2 weeks"
        : newGoalTimeframe;

    try {
      const res = await queryMindApi.recommendGoalTasks({
        goal_description: newGoalDesc.trim(),
        space_id: verifiedSpaceId || undefined,
        category: newGoalCategory,
        timeframe: effectiveTf,
        target_date: newGoalTargetDate || undefined,
      });

      if (res && Array.isArray(res.suggested_tasks) && res.suggested_tasks.length > 0) {
        const newTasks = res.suggested_tasks.map((t) => ({
          title: t.title,
          sub_goal: t.sub_goal || "Core Objectives",
          priority: (t.priority as any) || "medium",
          estimated_time: t.estimated_time,
          time_phase: t.time_phase,
          reasoning: t.reasoning,
        }));
        setStagedTasks((prev) => [...prev, ...newTasks]);
      }
    } catch (err: any) {
      const defaultTime = effectiveTf.toLowerCase().includes("day") ? "~1.5 hrs" : "~3 hrs";
      setStagedTasks((prev) => [
        {
          title: `Conduct space document audit for ${newGoalDesc.slice(0, 30)}`,
          sub_goal: "Phase 1: Foundations",
          priority: "high",
          estimated_time: defaultTime,
        },
        {
          title: `Implement core architectural prototype`,
          sub_goal: "Phase 2: Execution",
          priority: "medium",
          estimated_time: defaultTime,
        },
        {
          title: `Validate telemetry & benchmark deliverable outcomes`,
          sub_goal: "Phase 3: Validation",
          priority: "low",
          estimated_time: "~1 hr",
        },
      ]);
    } finally {
      setIsDecomposingWithAi(false);
    }
  };

  // Submit New Goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalDesc.trim() || isSubmittingGoal) return;
    setIsSubmittingGoal(true);

    const effectiveTf =
      newGoalTimeframe === "custom" && customTimeframeInput.trim()
        ? customTimeframeInput.trim()
        : newGoalTimeframe === "custom"
        ? newGoalTargetDate || "2 weeks"
        : newGoalTimeframe;

    const formattedTasks: GoalTask[] = stagedTasks.map((t, i) => ({
      id: `task-${Date.now()}-${i}`,
      title: t.title,
      sub_goal: t.sub_goal || "Core Objectives",
      completed: false,
      priority: t.priority,
      estimated_time: t.estimated_time,
      time_phase: t.time_phase,
      reasoning: t.reasoning,
    }));

    try {
      const created = await queryMindApi.createGoal({
        description: newGoalDesc.trim(),
        space_id: verifiedSpaceId || (spaces[0]?.id ?? undefined),
        category: newGoalCategory,
        priority: newGoalPriority,
        target_date: newGoalTargetDate || effectiveTf,
        timeframe: effectiveTf,
        tasks: formattedTasks,
      });

      setGoals((prev) => [created, ...prev]);
      setNewGoalDesc("");
      setStagedTasks([]);
      setStagedTaskInput("");
      setNewGoalTargetDate("");
      setNewGoalTimeframe("2 weeks");
      setCustomTimeframeInput("");
      setIsSpaceVerified(false);
      setIsCreateModalOpen(false);
      handleSelectGoal(created);
    } catch (err: any) {
      alert("Failed to create goal: " + (err.message || err));
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const getSpaceName = (spaceId?: string) => {
    if (!spaceId) return "General Workspace";
    const found = spaces.find((s) => s.id === spaceId);
    return found ? found.name : "General Workspace";
  };

  const getSpaceColor = (spaceId?: string) => {
    if (!spaceId) return "var(--accent)";
    const found = spaces.find((s) => s.id === spaceId);
    return found?.color || "var(--accent)";
  };

  // ─────────────────────────────────────────────────────────────
  // LEVEL 2: SELECTED GOAL FOCUS WORKSPACE
  // ─────────────────────────────────────────────────────────────
  if (selectedGoal) {
    const isCompleted = selectedGoal.status === "completed";
    const progress = computeProgress(selectedGoal.tasks, selectedGoal.status);
    const spaceName = getSpaceName(selectedGoal.space_id);
    const spaceColor = getSpaceColor(selectedGoal.space_id);
    const allTasks = selectedGoal.tasks || [];
    const completedCount = allTasks.filter((t) => t.completed).length;

    // Group tasks by Sub-Goal
    const groupedBySubGoal = allTasks.reduce((acc, t) => {
      const groupName = t.sub_goal?.trim() || "Core Objectives";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(t);
      return acc;
    }, {} as Record<string, GoalTask[]>);

    const subGoalTitles = Object.keys(groupedBySubGoal);
    if (subGoalTitles.length === 0) {
      groupedBySubGoal["Core Objectives"] = [];
    }

    return (
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "44px 36px 80px 36px", width: "100%" }}>
        {/* Navigation & Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "32px",
            padding: "18px 22px",
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            <button
              onClick={() => {
                setSelectedGoal(null);
                router.replace("/goals");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              className="hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            >
              <ArrowLeft size={14} />
              <span>Back to Objectives</span>
            </button>

            <div style={{ width: "1px", height: "18px", background: "var(--border-subtle)" }} />

            <Link
              href={`/spaces/${selectedGoal.space_id || ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "6px",
                background: "var(--surface-secondary)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: spaceColor }} />
              <span>{spaceName}</span>
              <ExternalLink size={11} />
            </Link>

            {selectedGoal.category && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "var(--surface-secondary)",
                  color: "var(--text-tertiary)",
                  textTransform: "capitalize",
                }}
              >
                {selectedGoal.category}
              </span>
            )}

            {selectedGoal.priority && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  background:
                    selectedGoal.priority === "high"
                      ? "rgba(239, 68, 68, 0.15)"
                      : selectedGoal.priority === "medium"
                      ? "rgba(99, 102, 241, 0.15)"
                      : "rgba(107, 114, 128, 0.15)",
                  color:
                    selectedGoal.priority === "high"
                      ? "#f87171"
                      : selectedGoal.priority === "medium"
                      ? "var(--accent)"
                      : "var(--text-tertiary)",
                }}
              >
                {selectedGoal.priority} Priority
              </span>
            )}

            {(selectedGoal.timeframe || selectedGoal.target_date) && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(59, 130, 246, 0.12)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                }}
              >
                <Calendar size={11} />
                <span>{selectedGoal.timeframe || selectedGoal.target_date}</span>
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => handleToggleGoalStatus(selectedGoal)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: isCompleted ? "rgba(16, 185, 129, 0.15)" : "var(--surface-secondary)",
                border: "1px solid",
                borderColor: isCompleted ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)",
                color: isCompleted ? "#10b981" : "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isCompleted ? <CheckCircle2 size={15} /> : <Circle size={15} />}
              <span>{isCompleted ? "Mark In-Progress" : "Mark Completed"}</span>
            </button>

            <button
              onClick={() => handleDeleteGoal(selectedGoal.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#f87171",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Multi-Goal Ripple Modal */}
        {ripplePrompt && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Zap size={20} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Multi-Goal Ripple Synergy Detected
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Task <strong>"{ripplePrompt.taskTitle}"</strong> also appears in {ripplePrompt.matches.length} other active goal(s). Mark completed across all?
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={handleApplyRipple}
                style={{
                  padding: "7px 14px",
                  borderRadius: "7px",
                  background: "#fbbf24",
                  border: "none",
                  color: "#000000",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Mark Completed in All
              </button>
              <button
                onClick={() => setRipplePrompt(null)}
                style={{
                  padding: "7px 12px",
                  borderRadius: "7px",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Keep Separate
              </button>
            </div>
          </div>
        )}

        {/* Focus Workspace 2-Column Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px", alignItems: "start" }}>
          {/* LEFT: Goal -> Sub-Goals -> Tasks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Objective Overview Card */}
            <div
              style={{
                background: "var(--surface-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "22px 24px",
              }}
            >
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: isCompleted ? "var(--text-tertiary)" : "var(--text-primary)",
                  textDecoration: isCompleted ? "line-through" : "none",
                  lineHeight: 1.4,
                  margin: "0 0 16px 0",
                }}
              >
                {selectedGoal.description}
              </h1>

              {/* Progress Bar & Stats */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    Weighted Objective Progress
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: isCompleted ? "#10b981" : "var(--accent)" }}>
                    {progress}%
                  </span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    borderRadius: "999px",
                    background: "var(--surface-secondary)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: isCompleted ? "#10b981" : "var(--accent)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                  <span>{completedCount} of {allTasks.length} tasks completed</span>
                  {selectedGoal.target_date && <span>Target: {selectedGoal.target_date}</span>}
                </div>
              </div>
            </div>

            {/* Hierarchical Sub-Goals & Action Items Section */}
            <div
              style={{
                background: "var(--surface-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "22px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                    Sub-Goals & Milestones Hierarchy
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "2px 0 0 0" }}>
                    Decomposed milestones structured into modular sub-goals.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingSubGoalSection(!isAddingSubGoalSection)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: "7px",
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Plus size={13} />
                    <span>New Sub-Goal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWorkspaceDecompose}
                    disabled={isWorkspaceDecomposing}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "7px",
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: isWorkspaceDecomposing ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    className="hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  >
                    <Bot size={13} className={isWorkspaceDecomposing ? "animate-spin" : ""} />
                    <span>{isWorkspaceDecomposing ? "Decomposing..." : "AI Decompose"}</span>
                  </button>
                </div>
              </div>

              {/* Add New Sub-Goal Section Row */}
              {isAddingSubGoalSection && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    padding: "10px",
                    background: "var(--surface-secondary)",
                    borderRadius: "8px",
                    border: "1px dashed var(--border-strong)",
                    marginBottom: "16px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Sub-Goal title (e.g. Phase 2: Core Architecture)..."
                    value={newSubGoalNameInput}
                    onChange={(e) => setNewSubGoalNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateSubGoalSection();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "7px 11px",
                      borderRadius: "6px",
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateSubGoalSection}
                    disabled={!newSubGoalNameInput.trim()}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "6px",
                      background: "var(--accent)",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: newSubGoalNameInput.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingSubGoalSection(false)}
                    style={{
                      padding: "7px 10px",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-tertiary)",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Hierarchical Sub-Goals Accordion List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {Object.entries(groupedBySubGoal).map(([subGoalTitle, subGoalTasks]) => {
                  const isCollapsed = Boolean(collapsedSubGoals[subGoalTitle]);
                  const subCompleted = subGoalTasks.filter((t) => t.completed).length;
                  const subPct = subGoalTasks.length > 0 ? Math.round((subCompleted / subGoalTasks.length) * 100) : 0;

                  return (
                    <div
                      key={subGoalTitle}
                      style={{
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--surface-secondary)",
                        overflow: "hidden",
                      }}
                    >
                      {/* Sub-Goal Header */}
                      <div
                        onClick={() =>
                          setCollapsedSubGoals((prev) => ({
                            ...prev,
                            [subGoalTitle]: !prev[subGoalTitle],
                          }))
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          cursor: "pointer",
                          background: "var(--surface-primary)",
                          borderBottom: isCollapsed ? "none" : "1px solid var(--border-subtle)",
                          userSelect: "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {isCollapsed ? <ChevronRight size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                            {subGoalTitle}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "var(--surface-hover)",
                              color: "var(--text-secondary)",
                              fontWeight: 500,
                            }}
                          >
                            {subCompleted}/{subGoalTasks.length}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: subPct === 100 ? "#10b981" : "var(--text-tertiary)" }}>
                            {subPct}%
                          </span>
                        </div>
                      </div>

                      {/* Sub-Goal Tasks */}
                      {!isCollapsed && (
                        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {subGoalTasks.length > 0 ? (
                            subGoalTasks.map((task) => (
                              <div
                                key={task.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "9px 12px",
                                  borderRadius: "8px",
                                  background: "var(--surface-primary)",
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                <button
                                  onClick={() => handleToggleSubTask(selectedGoal, task.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    color: task.completed ? "#10b981" : "var(--text-tertiary)",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  {task.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>

                                <span
                                  style={{
                                    flex: 1,
                                    fontSize: "13px",
                                    color: task.completed ? "var(--text-tertiary)" : "var(--text-primary)",
                                    textDecoration: task.completed ? "line-through" : "none",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {task.title}
                                </span>

                                {task.priority && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      padding: "2px 5px",
                                      borderRadius: "4px",
                                      textTransform: "uppercase",
                                      fontWeight: 600,
                                      color:
                                        task.priority === "high"
                                          ? "#f87171"
                                          : task.priority === "medium"
                                          ? "var(--accent)"
                                          : "var(--text-tertiary)",
                                      background: "rgba(255, 255, 255, 0.04)",
                                    }}
                                  >
                                    {task.priority}
                                  </span>
                                )}

                                {task.estimated_time && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontWeight: 500,
                                      color: "var(--text-secondary)",
                                      background: "var(--surface-secondary)",
                                      border: "1px solid var(--border-subtle)",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                    }}
                                  >
                                    ⏱️ {task.estimated_time}
                                  </span>
                                )}

                                <button
                                  onClick={() => handleDeleteSubTask(task.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    color: "var(--text-tertiary)",
                                    cursor: "pointer",
                                  }}
                                  className="hover:text-red-400"
                                  title="Delete task"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p style={{ fontSize: "12px", color: "var(--text-tertiary)", fontStyle: "italic", margin: "4px 0" }}>
                              No tasks in this sub-goal yet.
                            </p>
                          )}

                          {/* Quick inline add task for this specific sub-goal */}
                          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                            <input
                              type="text"
                              placeholder={`+ Add task to ${subGoalTitle}...`}
                              value={workspaceTargetSubGoal === subGoalTitle ? workspaceTaskInput : ""}
                              onChange={(e) => {
                                setWorkspaceTargetSubGoal(subGoalTitle);
                                setWorkspaceTaskInput(e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddWorkspaceTask(subGoalTitle);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: "7px 11px",
                                borderRadius: "6px",
                                background: "var(--surface-primary)",
                                border: "1px dashed var(--border-strong)",
                                color: "var(--text-primary)",
                                fontSize: "12px",
                                outline: "none",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddWorkspaceTask(subGoalTitle)}
                              disabled={workspaceTargetSubGoal !== subGoalTitle || !workspaceTaskInput.trim()}
                              style={{
                                padding: "7px 12px",
                                borderRadius: "6px",
                                background: "var(--accent)",
                                border: "none",
                                color: "#FFFFFF",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor:
                                  workspaceTargetSubGoal === subGoalTitle && workspaceTaskInput.trim()
                                    ? "pointer"
                                    : "not-allowed",
                                opacity:
                                  workspaceTargetSubGoal === subGoalTitle && workspaceTaskInput.trim() ? 1 : 0.6,
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Goal Strategic Advisor Copilot */}
          <div
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 120px)",
              minHeight: "560px",
              maxHeight: "780px",
              position: "sticky",
              top: "24px",
              overflow: "hidden",
            }}
          >
            {/* Copilot Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                background: "var(--surface-primary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(99, 102, 241, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                  }}
                >
                  <Bot size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                    Goal Reasoning Copilot
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    Grounded in {spaceName}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  color: "#10b981",
                  padding: "3px 8px",
                  borderRadius: "20px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                }}
              >
                <span style={{ fontSize: "8px" }}>●</span>
                <span>Active</span>
              </div>
            </div>

            {/* Chat Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {copilotMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      maxWidth: isUser ? "88%" : "94%",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: isUser ? "#4338ca" : "var(--surface-secondary)",
                        border: isUser ? "1px solid rgba(99, 102, 241, 0.45)" : "1px solid var(--border-subtle)",
                        color: isUser ? "#FFFFFF" : "var(--text-primary)",
                        fontSize: "13px",
                        lineHeight: 1.55,
                        boxShadow: isUser ? "0 2px 10px rgba(0, 0, 0, 0.4)" : "0 2px 8px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                          strong: ({ children }) => (
                            <strong style={{ color: isUser ? "#FFFFFF" : "var(--text-primary)", fontWeight: 600 }}>
                              {children}
                            </strong>
                          ),
                          ol: ({ children }) => (
                            <ol style={{ margin: "6px 0 10px 0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                              {children}
                            </ol>
                          ),
                          ul: ({ children }) => (
                            <ul style={{ margin: "6px 0 10px 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                              {children}
                            </ul>
                          ),
                          li: ({ children }) => <li style={{ marginBottom: "2px" }}>{children}</li>,
                          h3: ({ children }) => (
                            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "10px 0 4px 0", color: "var(--text-primary)" }}>
                              {children}
                            </h3>
                          ),
                          h4: ({ children }) => (
                            <h4 style={{ fontSize: "13px", fontWeight: 600, margin: "8px 0 4px 0", color: "var(--accent)" }}>
                              {children}
                            </h4>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {msg.citations && msg.citations.length > 0 && (
                        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>
                            Referenced Space Docs:
                          </div>
                          {msg.citations.map((c, cIdx) => (
                            <div key={cIdx} style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                              • {c.document_title || "Document"} {c.page_number ? `(Page ${c.page_number})` : ""}: "{c.snippet?.slice(0, 60)}..."
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isSendingCopilot && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "var(--surface-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    alignSelf: "flex-start",
                  }}
                >
                  <Bot size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
                  <span>Synthesizing sub-goals and space documents...</span>
                </div>
              )}
              <div ref={copilotEndRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSendCopilot}
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                gap: "8px",
                background: "var(--surface-primary)",
              }}
            >
              <input
                type="text"
                placeholder="Ask how to tackle this objective or sub-goal..."
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={isSendingCopilot || !copilotInput.trim()}
                title="Send message"
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: isSendingCopilot || !copilotInput.trim() ? "var(--surface-secondary)" : "#6366f1",
                  border: "1px solid",
                  borderColor: isSendingCopilot || !copilotInput.trim() ? "var(--border-subtle)" : "#4f46e5",
                  color: isSendingCopilot || !copilotInput.trim() ? "var(--text-tertiary)" : "#FFFFFF",
                  cursor: isSendingCopilot || !copilotInput.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LEVEL 1: ALL OBJECTIVES & GOALS OVERVIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "44px 36px 80px 36px", width: "100%" }}>
      {/* 1. Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--accent-soft)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <Target size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em", lineHeight: 1.2, margin: 0 }}>
                Objectives & Goals Tracker
              </h1>
              <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: 1.5, margin: "6px 0 0 0" }}>
                Directly mapped to your Knowledge Spaces. Track hierarchical sub-goals, tasks, and cross-space leverage.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={fetchGoals}
            disabled={isRefreshing}
            title="Refresh goals from database"
            style={{
              padding: "9px 13px",
              borderRadius: "9px",
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: isRefreshing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setIsSpaceVerified(false);
            }}
            style={{
              padding: "9px 18px",
              borderRadius: "9px",
              background: "var(--accent)",
              border: "none",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <Plus size={16} />
            <span>New Objective</span>
          </button>
        </div>
      </div>

      {/* 2. Top Telemetry KPI Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            padding: "20px 22px",
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Total Objectives
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Across {spaces.length} knowledge spaces
          </div>
        </div>

        <div
          style={{
            padding: "20px 22px",
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Active / In Progress
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--accent)", marginTop: "4px" }}>
            {metrics.inProgress}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Driven by domain grounding
          </div>
        </div>

        <div
          style={{
            padding: "20px 22px",
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Completed Objectives
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>
            {metrics.completed}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {metrics.completionRate}% objective clearance
          </div>
        </div>

        <div
          style={{
            padding: "20px 22px",
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Sub-Tasks Execution
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
            {metrics.completedTasks} / {metrics.totalTasks}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {metrics.taskRate}% actionable tasks verified
          </div>
        </div>
      </div>

      {/* 3. Strategic Multi-Goal Synergy Matrix */}
      {topSynergies.length > 0 && (
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            padding: "24px 26px",
            marginBottom: "36px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Zap size={16} style={{ color: "#fbbf24" }} />
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              High-Leverage Strategic Bottlenecks
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              (Tasks that simultaneously advance 2+ active goals)
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {topSynergies.map((syn, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {syn.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#fbbf24", marginTop: "2px" }}>
                    Advances {syn.count} separate goals
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#fbbf24",
                    fontWeight: 600,
                  }}
                >
                  {syn.count}x Leverage
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filters & Controls */}
      <div
        style={{
          background: "var(--surface-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "22px 24px",
          marginBottom: "36px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Space Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)", marginRight: "4px", whiteSpace: "nowrap" }}>
            Space:
          </span>

          <button
            onClick={() => setSelectedSpaceFilter("all")}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              border: "1px solid",
              whiteSpace: "nowrap",
              background: selectedSpaceFilter === "all" ? "var(--accent-soft)" : "var(--surface-secondary)",
              borderColor: selectedSpaceFilter === "all" ? "var(--accent)" : "transparent",
              color: selectedSpaceFilter === "all" ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            All Spaces ({goals.length})
          </button>

          {spaces.map((s) => {
            const count = goals.filter((g) => g.space_id === s.id || g.project_id === s.id).length;
            const isSelected = selectedSpaceFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSpaceFilter(s.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "1px solid",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: isSelected ? "var(--accent-soft)" : "var(--surface-secondary)",
                  borderColor: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: s.color || "var(--accent)",
                  }}
                />
                <span>{s.name}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status & Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            paddingTop: "10px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {(["all", "in_progress", "completed"] as const).map((status) => {
              const label = status === "all" ? "All Status" : status === "in_progress" ? "In Progress" : "Completed";
              const isSelected = selectedStatusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: isSelected ? 600 : 500,
                    cursor: "pointer",
                    background: isSelected ? "var(--surface-secondary)" : "transparent",
                    border: "1px solid",
                    borderColor: isSelected ? "var(--border-subtle)" : "transparent",
                    color: isSelected ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search
              size={14}
              style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
            />
            <input
              type="text"
              placeholder="Search objectives or tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                borderRadius: "8px",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "12px",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* 5. Error Message */}
      {errorMsg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#f87171",
            fontSize: "13px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 6. Goals Cards Grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: "140px",
                borderRadius: "14px",
                background: "var(--surface-primary)",
                border: "1px solid var(--border-subtle)",
                opacity: 0.5,
              }}
              className="animate-pulse"
            />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div
          style={{
            padding: "64px 32px",
            textAlign: "center",
            background: "var(--surface-primary)",
            borderRadius: "14px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              color: "var(--accent)",
            }}
          >
            <Target size={24} />
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
            No objectives found
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "420px", margin: "4px auto 20px auto" }}>
            {selectedSpaceFilter !== "all"
              ? `There are no objectives scoped to ${getSpaceName(selectedSpaceFilter)}. Add your first objective to start tracking actionable domain outcomes.`
              : "No objectives match your current filters. Create an objective to anchor your knowledge spaces."}
          </p>
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setIsSpaceVerified(false);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "9px",
              background: "var(--accent)",
              border: "none",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Plus size={16} />
            <span>Create First Objective</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {filteredGoals.map((goal) => {
            const isCompleted = goal.status === "completed";
            const progress = computeProgress(goal.tasks, goal.status);
            const spaceName = getSpaceName(goal.space_id);
            const spaceColor = getSpaceColor(goal.space_id);
            const tasks = goal.tasks || [];
            const completedTasksCount = tasks.filter((t) => t.completed).length;
            const synergyCount = synergyMap.get(goal.id) || 0;

            // Extract unique sub-goals count
            const subGoalsSet = new Set(tasks.map((t) => t.sub_goal || "Core Objectives"));

            return (
              <div
                key={goal.id}
                onClick={() => handleSelectGoal(goal)}
                style={{
                  background: "var(--surface-primary)",
                  border: isCompleted ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                  padding: "18px 20px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                }}
                className="hover:border-[var(--border-strong)]"
              >
                <div>
                  {/* Top Metadata Badges */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "2px 7px",
                          borderRadius: "5px",
                          background: "var(--surface-secondary)",
                          color: "var(--text-secondary)",
                          fontSize: "11px",
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: spaceColor }} />
                        <span>{spaceName}</span>
                      </span>

                      {goal.priority && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            background:
                              goal.priority === "high"
                                ? "rgba(239, 68, 68, 0.15)"
                                : goal.priority === "medium"
                                ? "rgba(99, 102, 241, 0.15)"
                                : "rgba(107, 114, 128, 0.15)",
                            color:
                              goal.priority === "high"
                                ? "#f87171"
                                : goal.priority === "medium"
                                ? "var(--accent)"
                                : "var(--text-tertiary)",
                          }}
                        >
                          {goal.priority}
                        </span>
                      )}

                      {subGoalsSet.size > 1 && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "var(--surface-secondary)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {subGoalsSet.size} sub-goals
                        </span>
                      )}

                      {synergyCount > 0 && !isCompleted && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "10px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#fbbf24",
                            fontWeight: 600,
                          }}
                        >
                          <Zap size={9} />
                          <span>Synergy</span>
                        </span>
                      )}

                      {(goal.timeframe || goal.target_date) && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "rgba(59, 130, 246, 0.12)",
                            color: "#60a5fa",
                            border: "1px solid rgba(59, 130, 246, 0.25)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontWeight: 500,
                          }}
                        >
                          <Calendar size={9} />
                          <span>{goal.timeframe || goal.target_date}</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleGoalStatus(goal);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: isCompleted ? "#10b981" : "var(--text-tertiary)",
                      }}
                      title={isCompleted ? "Mark In-Progress" : "Mark Completed"}
                    >
                      {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  </div>

                  {/* Goal Description Title */}
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: isCompleted ? "var(--text-tertiary)" : "var(--text-primary)",
                      textDecoration: isCompleted ? "line-through" : "none",
                      lineHeight: 1.4,
                      margin: "0 0 14px 0",
                    }}
                  >
                    {goal.description}
                  </h3>
                </div>

                {/* Progress & Bottom Bar */}
                <div>
                  <div
                    style={{
                      width: "100%",
                      height: "5px",
                      borderRadius: "999px",
                      background: "var(--surface-secondary)",
                      overflow: "hidden",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: isCompleted ? "#10b981" : "var(--accent)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
                    <span>
                      {completedTasksCount}/{tasks.length} tasks ({progress}%)
                    </span>
                    <span style={{ color: "var(--accent)", fontWeight: 500, display: "flex", alignItems: "center", gap: "3px" }}>
                      <span>Focus Workspace</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Create Goal Modal with Space Auto-Route Verification */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "620px",
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "28px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Define New Objective
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                  QueryMind will automatically analyze and route this objective to the best space.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Goal Description First so space auto-detection can work immediately */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                  Objective Statement / Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Master distributed Raft consensus and build cluster replication tests..."
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "9px",
                    background: "var(--surface-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Space Auto-Detection & Verification Banner */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: isSpaceVerified ? "rgba(16, 185, 129, 0.08)" : "rgba(99, 102, 241, 0.08)",
                  border: isSpaceVerified ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(99, 102, 241, 0.25)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FolderKanban size={16} style={{ color: isSpaceVerified ? "#10b981" : "var(--accent)" }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {isSpaceVerified ? "Space Verified & Assigned" : "Suggested Knowledge Space"}
                    </span>
                  </div>

                  {!isSpaceVerified && suggestedSpaceId && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifiedSpaceId(suggestedSpaceId);
                        setIsSpaceVerified(true);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "var(--accent)",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ✓ Approve Suggestion
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <select
                    value={verifiedSpaceId}
                    onChange={(e) => {
                      setVerifiedSpaceId(e.target.value);
                      setIsSpaceVerified(true);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "7px",
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  >
                    {spaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.id === suggestedSpaceId ? "(AI Recommended)" : ""}
                      </option>
                    ))}
                  </select>

                  {isSpaceVerified && (
                    <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 500 }}>
                      ✓ Verified by user
                    </span>
                  )}
                </div>
              </div>

              {/* Target Timeframe & AI Pacing Selector */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    Target Timeframe & AI Pacing
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    Sub-goals & tasks strictly calibrated to this duration
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "8px" }}>
                  {[
                    { id: "3 days", label: "3 Days", sub: "Crash Sprint (Daily ~1-2h)" },
                    { id: "1 week", label: "1 Week", sub: "Fast Sprint (Daily/Phased)" },
                    { id: "2 weeks", label: "2 Weeks", sub: "Standard (Weekly Phases)" },
                    { id: "1 month", label: "1 Month", sub: "Deep Mastery (4 Weeks)" },
                    { id: "3 months", label: "3 Months", sub: "Macro Roadmap (Phased)" },
                    { id: "custom", label: "Custom", sub: "Specific Date or Pace" },
                  ].map((preset) => {
                    const isSelected = newGoalTimeframe === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setNewGoalTimeframe(preset.id);
                          if (preset.id !== "custom") {
                            setCustomTimeframeInput("");
                          }
                        }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          textAlign: "left",
                          cursor: "pointer",
                          background: isSelected ? "var(--accent-soft)" : "var(--surface-secondary)",
                          border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: 600, color: isSelected ? "var(--accent)" : "var(--text-primary)" }}>
                          {preset.label}
                        </div>
                        <div style={{ fontSize: "10px", color: isSelected ? "var(--accent)" : "var(--text-tertiary)", marginTop: "2px" }}>
                          {preset.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {newGoalTimeframe === "custom" && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <input
                      type="text"
                      placeholder="Enter custom duration (e.g. 5 days, 45 days, 6 months)..."
                      value={customTimeframeInput}
                      onChange={(e) => setCustomTimeframeInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "var(--surface-secondary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Category, Priority & Target Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                    Category
                  </label>
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  >
                    <option value="engineering">Engineering</option>
                    <option value="career">Career</option>
                    <option value="research">Research</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                    Priority
                  </label>
                  <select
                    value={newGoalPriority}
                    onChange={(e) => setNewGoalPriority(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={newGoalTargetDate}
                    onChange={(e) => setNewGoalTargetDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Sub-Goals & Tasks staging */}
              <div
                style={{
                  background: "var(--surface-secondary)",
                  borderRadius: "10px",
                  padding: "14px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Sub-Goals & Tasks ({stagedTasks.length})
                  </span>

                  <button
                    type="button"
                    onClick={handleModalDecompose}
                    disabled={isDecomposingWithAi || !newGoalDesc.trim()}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: isDecomposingWithAi || !newGoalDesc.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Bot size={13} className={isDecomposingWithAi ? "animate-spin" : ""} />
                    <span>
                      {isDecomposingWithAi
                        ? `Pacing for ${newGoalTimeframe}...`
                        : `AI Breakdown (${newGoalTimeframe})`}
                    </span>
                  </button>
                </div>

                {stagedTasks.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
                    {stagedTasks.map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: "var(--surface-primary)",
                          fontSize: "12px",
                          color: "var(--text-primary)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: "10px", color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 5px", borderRadius: "4px" }}>
                            {t.sub_goal}
                          </span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.title}
                          </span>
                          {t.estimated_time && (
                            <span style={{ fontSize: "10px", color: "var(--text-tertiary)", background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", padding: "1px 5px", borderRadius: "4px", marginLeft: "auto", whiteSpace: "nowrap" }}>
                              ⏱️ {t.estimated_time}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setStagedTasks((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", marginLeft: "6px" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="Sub-Goal tag (e.g. Core Objectives)..."
                    value={stagedSubGoalInput}
                    onChange={(e) => setStagedSubGoalInput(e.target.value)}
                    style={{
                      width: "140px",
                      padding: "7px 9px",
                      borderRadius: "6px",
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "11px",
                      outline: "none",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Task item title..."
                    value={stagedTaskInput}
                    onChange={(e) => setStagedTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (stagedTaskInput.trim()) {
                          setStagedTasks((prev) => [
                            ...prev,
                            {
                              title: stagedTaskInput.trim(),
                              sub_goal: stagedSubGoalInput.trim() || "Core Objectives",
                              priority: "medium",
                            },
                          ]);
                          setStagedTaskInput("");
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "7px 11px",
                      borderRadius: "6px",
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (stagedTaskInput.trim()) {
                        setStagedTasks((prev) => [
                          ...prev,
                          {
                            title: stagedTaskInput.trim(),
                            sub_goal: stagedSubGoalInput.trim() || "Core Objectives",
                            priority: "medium",
                          },
                        ]);
                        setStagedTaskInput("");
                      }
                    }}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "6px",
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoal || !newGoalDesc.trim()}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    background: "var(--accent)",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: isSubmittingGoal || !newGoalDesc.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmittingGoal ? "Creating..." : "Save Objective"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "40px 32px", color: "var(--text-tertiary)", fontSize: "14px" }}>
          Loading Objectives Hub...
        </div>
      }
    >
      <GoalsPageContent />
    </Suspense>
  );
}
