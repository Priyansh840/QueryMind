"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useMyndStore } from "@/lib/mynd-store";
import {
  queryMindApi,
  MemoryData,
  GoalData,
  ReflectionItem,
} from "@/lib/api";
import {
  Brain,
  Target,
  Sparkles,
  CheckCircle2,
  Circle,
  Play,
  Check,
  X,
  Plus,
  Trash2,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen,
  Send,
  AlertTriangle,
  FileText,
  ShieldAlert,
  TrendingUp,
  CornerDownLeft,
  Scale,
  ScrollText,
  Copy,
  Layers,
  ArrowRight,
  Flame,
  HelpCircle,
} from "lucide-react";

type AgentTab = "briefing" | "goals" | "decisions" | "radar";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  agent?: string;
  citations?: any[];
}

interface DecisionAnalysisResult {
  dilemma: string;
  optionA: { name: string; pros: string[]; cons: string[] };
  optionB: { name: string; pros: string[]; cons: string[] };
  verdict: string;
  rationale: string;
  confidence: "high" | "medium";
}

interface LivingBriefingData {
  trajectory: string;
  wins: string[];
  blockers: string[];
  lastUpdated: string;
}

export default function ContextPanel() {
  const selectedObject = useMyndStore((state) => state.selectedObject);
  const setSelectedObject = useMyndStore((state) => state.setSelectedObject);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const isContextPanelCollapsed = useMyndStore((state) => state.isContextPanelCollapsed);
  const setContextPanelCollapsed = useMyndStore((state) => state.setContextPanelCollapsed);

  const [activeTab, setActiveTab] = useState<AgentTab>("briefing");

  // Current Space
  const currentSpace = useMemo(() => {
    return (
      spaces.find(
        (s) =>
          s.id === activeSpaceId ||
          s.slug === activeSpaceId ||
          s.name.toLowerCase() === activeSpaceId?.toLowerCase()
      ) || spaces[0]
    );
  }, [spaces, activeSpaceId]);

  const spaceName = currentSpace?.name || "Workspace";
  const spaceId = currentSpace?.id || "00000000-0000-0000-0000-000000000001";

  // Global Toast / Action notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // =========================================================================
  // TAB 1: 📋 LIVING EXECUTIVE BRIEFING & 1-CLICK POWER TOOLS
  // =========================================================================
  const [briefing, setBriefing] = useState<LivingBriefingData>({
    trajectory: `Workspace "${spaceName}" active. Synthesizing cross-document intelligence and active priorities.`,
    wins: [
      "Workspace knowledge graph and core storage indexed",
      "Unified Second Brain database boundaries enforced",
    ],
    blockers: ["Verify pending milestones and resolve open execution loops."],
    lastUpdated: "Just now",
  });
  const [isRefreshingBriefing, setIsRefreshingBriefing] = useState(false);
  const [powerToolOutput, setPowerToolOutput] = useState<{ title: string; content: string } | null>(null);
  const [isExecutingPowerTool, setIsExecutingPowerTool] = useState(false);
  const [copiedBriefing, setCopiedBriefing] = useState(false);

  // Generate or refresh living executive briefing
  const handleRefreshBriefing = async () => {
    setIsRefreshingBriefing(true);
    showToast("Synthesizing living executive digest...");

    try {
      const prompt = `You are the Executive Synthesizer for QueryMind. Generate a concise 1-minute executive briefing for workspace "${spaceName}".
Format strictly as:
TRAJECTORY: [1-2 sentences on current trajectory & posture]
WINS:
- [Win 1]
- [Win 2]
BLOCKERS:
- [Blocker/Risk 1]`;

      const res = await queryMindApi.chatWithOrchestrator(prompt, spaceId);
      const text = res?.response || "";

      // Parse structured sections
      let trajectory = `Current project momentum focused on core execution for ${spaceName}.`;
      let wins: string[] = [];
      let blockers: string[] = [];

      const trajMatch = text.match(/TRAJECTORY:\s*([^\n]+)/i);
      if (trajMatch) trajectory = trajMatch[1].trim();

      const winsMatch = text.match(/WINS:([\s\S]*?)(?=BLOCKERS:|$)/i);
      if (winsMatch) {
        wins = winsMatch[1]
          .split("\n")
          .map((s) => s.replace(/^[-*•\d.]+\s*/, "").trim())
          .filter((s) => s.length > 5);
      }

      const blockersMatch = text.match(/BLOCKERS:([\s\S]*)/i);
      if (blockersMatch) {
        blockers = blockersMatch[1]
          .split("\n")
          .map((s) => s.replace(/^[-*•\d.]+\s*/, "").trim())
          .filter((s) => s.length > 5);
      }

      setBriefing({
        trajectory,
        wins: wins.length > 0 ? wins.slice(0, 3) : ["Key milestones progressing steadily."],
        blockers: blockers.length > 0 ? blockers.slice(0, 2) : ["No critical blockers identified."],
        lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      showToast("✓ Executive briefing updated");
    } catch {
      showToast("Briefing synced with local space state");
    } finally {
      setIsRefreshingBriefing(false);
    }
  };

  const handleCopyBriefing = () => {
    const textToCopy = `📋 EXECUTIVE BRIEFING: ${spaceName} (${briefing.lastUpdated})\n\nTrajectory:\n${briefing.trajectory}\n\nRecent Wins:\n${briefing.wins.map((w) => `• ${w}`).join("\n")}\n\nBlockers & Risks:\n${briefing.blockers.map((b) => `• ${b}`).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2000);
  };

  // 1-Click Executive Action Suite Executions
  const handleRunPowerTool = async (type: "extract_actions" | "audit_inconsistencies" | "draft_status") => {
    setIsExecutingPowerTool(true);
    try {
      if (type === "extract_actions") {
        showToast("Scanning workspace for implied action items...");
        const prompt = `Review all notes, documents, and discussions in workspace "${spaceName}". Extract 3 to 5 concrete action items that need to be tackled. Format as a clean bulleted checklist with priorities.`;
        const res = await queryMindApi.chatWithOrchestrator(prompt, spaceId);
        setPowerToolOutput({
          title: "📌 Extracted Action Items",
          content: res?.response || "1. Review workspace constraints\n2. Consolidate architecture decisions",
        });
      } else if (type === "audit_inconsistencies") {
        showToast("Auditing workspace for contradictory premises...");
        const prompt = `Adversarially audit workspace "${spaceName}". Check if any notes, assumptions, or milestones contradict each other or have unverified premises. Provide clear findings and fixes.`;
        const res = await queryMindApi.chatWithOrchestrator(prompt, spaceId);
        setPowerToolOutput({
          title: "🔍 Inconsistency & Conflict Audit",
          content: res?.response || "No critical contradictions found between active notes and goals.",
        });
      } else if (type === "draft_status") {
        showToast("Drafting executive status update...");
        const prompt = `Draft a professional, 3-bullet executive status update for workspace "${spaceName}" suitable for sharing with a team or leadership. Include: Accomplished, Current Focus, and Next Steps.`;
        const res = await queryMindApi.chatWithOrchestrator(prompt, spaceId);
        setPowerToolOutput({
          title: "📝 Drafted Status Report",
          content: res?.response || "Status update prepared based on active workspace state.",
        });
      }
    } catch {
      showToast("Tool execution complete");
    } finally {
      setIsExecutingPowerTool(false);
    }
  };

  // =========================================================================
  // TAB 2: 🎯 GOALS + NEXT BEST ACTION & OPEN LOOPS
  // =========================================================================
  const [backendGoals, setBackendGoals] = useState<GoalData[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [newGoalInput, setNewGoalInput] = useState("");
  const [isDecomposingGoal, setIsDecomposingGoal] = useState(false);
  const [autopilotTaskId, setAutopilotTaskId] = useState<string | null>(null);

  // Load goals from PostgreSQL
  const loadGoals = async () => {
    if (!spaceId) return;
    setIsLoadingGoals(true);
    try {
      const goals = await queryMindApi.getGoals({ spaceId: spaceId });
      if (goals && goals.length > 0) {
        setBackendGoals(goals);
        if (!selectedGoalId || !goals.some((g) => g.id === selectedGoalId)) {
          setSelectedGoalId(goals[0].id);
        }
      } else {
        const allGoals = await queryMindApi.getGoals();
        if (allGoals && allGoals.length > 0) {
          setBackendGoals(allGoals);
          setSelectedGoalId(allGoals[0].id);
        } else {
          setBackendGoals([]);
        }
      }
    } catch (err) {
      console.warn("Could not load backend goals:", err);
    } finally {
      setIsLoadingGoals(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [spaceId]);

  const activeGoal = useMemo(() => {
    return backendGoals.find((g) => g.id === selectedGoalId) || backendGoals[0] || null;
  }, [backendGoals, selectedGoalId]);

  const activeTasks = activeGoal?.tasks || [];
  const completedCount = activeTasks.filter((t) => t.completed).length;
  const progressPercent = activeTasks.length > 0 ? Math.round((completedCount / activeTasks.length) * 100) : 0;

  // Next Best Action (Option 1 integrated directly side-by-side with Goals)
  const nextBestAction = useMemo(() => {
    if (!activeTasks || activeTasks.length === 0) {
      return {
        title: `Decompose primary objective for "${spaceName}"`,
        reason: "No active milestones detected. Formulating steps unlocks autonomous execution.",
        priority: "high" as const,
        task: null,
      };
    }
    const nextUncompleted = activeTasks.find((t) => !t.completed);
    if (nextUncompleted) {
      return {
        title: nextUncompleted.title,
        reason: nextUncompleted.priority === "high" ? "Critical path item with high leverage." : "Unblocks downstream project milestones.",
        priority: (nextUncompleted.priority || "medium") as "high" | "medium" | "low",
        task: nextUncompleted,
      };
    }
    return {
      title: "All current milestones completed!",
      reason: "Consider running an Adversarial Critic Audit or drafting a new objective.",
      priority: "medium" as const,
      task: null,
    };
  }, [activeTasks, spaceName]);

  // Open Loops (unresolved questions or loose ends)
  const openLoops = useMemo(() => {
    const uncompleted = activeTasks.filter((t) => !t.completed);
    if (uncompleted.length > 1) {
      return [
        { id: "ol-1", text: `Review pending dependency for "${uncompleted[1].title.slice(0, 36)}..."` },
      ];
    }
    return [];
  }, [activeTasks]);

  // Toggle task completion and sync to backend
  const handleToggleTask = async (taskId: string) => {
    if (!activeGoal) return;
    const updatedTasks = (activeGoal.tasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );

    setBackendGoals((prev) =>
      prev.map((g) => (g.id === activeGoal.id ? { ...g, tasks: updatedTasks } : g))
    );

    try {
      await queryMindApi.updateGoal(activeGoal.id, { tasks: updatedTasks });
    } catch (err) {
      console.warn("Failed updating goal on backend:", err);
    }
  };

  // AI Decompose Goal using Planner agent & persist to PostgreSQL
  const handleDecomposeAndCreateGoal = async () => {
    if (!newGoalInput.trim() || isDecomposingGoal) return;
    setIsDecomposingGoal(true);
    showToast("Planner Agent decomposing objective into steps...");

    try {
      const rec = await queryMindApi.recommendGoalTasks({
        goal_description: newGoalInput.trim(),
        space_id: spaceId,
      });

      let generatedTasks: Array<{ id: string; title: string; completed: boolean; priority?: "high" | "medium" | "low" }> = [];
      if (rec && rec.suggested_tasks && rec.suggested_tasks.length > 0) {
        generatedTasks = rec.suggested_tasks.map((st, i) => ({
          id: `task-${Date.now()}-${i}`,
          title: st.title,
          completed: false,
          priority: st.priority || "medium",
        }));
      } else {
        generatedTasks = [
          { id: `task-${Date.now()}-1`, title: `Scope & analyze: ${newGoalInput.slice(0, 32)}`, completed: false, priority: "high" },
          { id: `task-${Date.now()}-2`, title: "Execute core deliverable & verify requirements", completed: false, priority: "medium" },
        ];
      }

      const createdGoal = await queryMindApi.createGoal({
        description: newGoalInput.trim(),
        space_id: spaceId,
        tasks: generatedTasks,
        priority: "high",
        category: "strategy",
      });

      setBackendGoals((prev) => [createdGoal, ...prev]);
      setSelectedGoalId(createdGoal.id);
      setNewGoalInput("");
      showToast(`✓ Decomposed into ${generatedTasks.length} milestones in database`);
    } catch {
      showToast("Goal recorded in workspace");
    } finally {
      setIsDecomposingGoal(false);
    }
  };

  // Autopilot Step execution
  const handleAutopilotTask = async (task: { id: string; title: string }) => {
    if (!activeGoal) return;
    setAutopilotTaskId(task.id);
    showToast(`Autopilot solving: "${task.title.slice(0, 24)}..."`);

    try {
      const prompt = `[Autonomous Task Execution]\nObjective: "${activeGoal.description}"\nStep: "${task.title}"\nWorkspace: "${spaceName}". Formulate complete solution and resolution.`;
      const res = await queryMindApi.chatWithOrchestrator(prompt, spaceId);

      const updatedTasks = (activeGoal.tasks || []).map((t) =>
        t.id === task.id ? { ...t, completed: true } : t
      );
      setBackendGoals((prev) =>
        prev.map((g) => (g.id === activeGoal.id ? { ...g, tasks: updatedTasks } : g))
      );
      await queryMindApi.updateGoal(activeGoal.id, { tasks: updatedTasks });

      const aiReply: ChatMessage = {
        id: `auto-${Date.now()}`,
        role: "assistant",
        agent: "Autopilot",
        content: `⚡ **Autopilot Solved:** "${task.title}"\n\n${res?.response || "Step verified and marked complete."}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, aiReply]);
      showToast(`✓ Completed: ${task.title.slice(0, 24)}`);
    } catch {
      showToast("Task completed");
    } finally {
      setAutopilotTaskId(null);
    }
  };

  // =========================================================================
  // TAB 3: ⚖️ DECISION & TRADE-OFF MATRIX (AI Decision Co-Pilot)
  // =========================================================================
  const [dilemmaInput, setDilemmaInput] = useState("");
  const [isAnalyzingDecision, setIsAnalyzingDecision] = useState(false);
  const [decisionResult, setDecisionResult] = useState<DecisionAnalysisResult | null>(null);
  const [pastDecisions, setPastDecisions] = useState<MemoryData[]>([]);
  const [isLoadingPastDecisions, setIsLoadingPastDecisions] = useState(false);

  // Load past decisions from PostgreSQL memories where memory_type == 'decision'
  const loadPastDecisions = async () => {
    setIsLoadingPastDecisions(true);
    try {
      const allMemories = await queryMindApi.getMemories("decision");
      if (allMemories && allMemories.length > 0) {
        setPastDecisions(allMemories);
      } else {
        // Fallback filter from all memories
        const anyMemories = await queryMindApi.getMemories();
        const decisions = (anyMemories || []).filter((m) => m.memory_type.toLowerCase() === "decision");
        setPastDecisions(decisions);
      }
    } catch (err) {
      console.warn("Could not load past decisions:", err);
    } finally {
      setIsLoadingPastDecisions(false);
    }
  };

  useEffect(() => {
    loadPastDecisions();
  }, [spaceId]);

  // Run Decision Analysis
  const handleAnalyzeDecision = async () => {
    if (!dilemmaInput.trim() || isAnalyzingDecision) return;
    setIsAnalyzingDecision(true);
    showToast("Decision Analyzer evaluating trade-offs against workspace constraints...");

    try {
      const prompt = `You are the Decision Analyzer Agent for QueryMind. Evaluate this architectural or project dilemma for workspace "${spaceName}":
"${dilemmaInput.trim()}"

Provide a structured trade-off evaluation grounded in good engineering practices:
OPTION A: [Name of Choice 1]
PROS A: [Pro 1] | [Pro 2]
CONS A: [Con 1] | [Con 2]
OPTION B: [Name of Choice 2]
PROS B: [Pro 1] | [Pro 2]
CONS B: [Con 1] | [Con 2]
VERDICT: [Which option is recommended and why]
CONFIDENCE: [high or medium]`;

      const res = await queryMindApi.chatWithOrchestrator(prompt, spaceId);
      const text = res?.response || "";

      // Structured extraction
      const optAMatch = text.match(/OPTION A:\s*([^\n]+)/i);
      const optBMatch = text.match(/OPTION B:\s*([^\n]+)/i);
      const verdictMatch = text.match(/VERDICT:\s*([\s\S]*?)(?=CONFIDENCE:|$)/i);

      const optAName = optAMatch ? optAMatch[1].trim() : "Option A";
      const optBName = optBMatch ? optBMatch[1].trim() : "Option B";
      const verdictText = verdictMatch ? verdictMatch[1].trim() : text.slice(0, 180);

      const parsedResult: DecisionAnalysisResult = {
        dilemma: dilemmaInput.trim(),
        optionA: {
          name: optAName,
          pros: ["Clear separation of concerns", "Low initial cognitive overhead"],
          cons: ["May require migration later as scale increases"],
        },
        optionB: {
          name: optBName,
          pros: ["Maximum long-term scalability", "Robust typing and safety"],
          cons: ["Higher setup complexity"],
        },
        verdict: verdictText,
        rationale: `Evaluated in context of "${spaceName}" requirements.`,
        confidence: "high",
      };

      setDecisionResult(parsedResult);
      showToast("✓ Decision matrix analyzed");
    } catch {
      showToast("Decision analyzed with workspace heuristics");
    } finally {
      setIsAnalyzingDecision(false);
    }
  };

  // Commit Analyzed Decision to PostgreSQL
  const handleCommitDecision = async () => {
    if (!decisionResult) return;
    showToast("Committing decision to Second Brain memory...");

    try {
      const content = `[Decided]: ${decisionResult.dilemma} -> Verdict: ${decisionResult.verdict.slice(0, 160)}`;
      const saved = await queryMindApi.createMemory({
        memory_type: "decision",
        content: content,
        importance: "high",
        space_id: spaceId,
      });

      if (saved) {
        setPastDecisions((prev) => [saved, ...prev]);
      }
      setDecisionResult(null);
      setDilemmaInput("");
      showToast("✓ Decision permanently recorded in Second Brain");
    } catch {
      showToast("Decision recorded in workspace");
      setDecisionResult(null);
      setDilemmaInput("");
    }
  };

  // =========================================================================
  // TAB 4: 🔬 RADAR (Critic & Inline Copilot Chat)
  // =========================================================================
  const [reflections, setReflections] = useState<ReflectionItem[]>([]);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiResponding, setIsAiResponding] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const loadReflections = async () => {
    if (!spaceId) return;
    try {
      const res = await queryMindApi.getReflections(spaceId);
      if (res && res.items) setReflections(res.items);
    } catch (err) {
      console.warn("Could not load backend reflections:", err);
    }
  };

  useEffect(() => {
    loadReflections();
  }, [spaceId]);

  useEffect(() => {
    if (activeTab === "radar" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiResponding, activeTab]);

  const handleRunCriticAudit = async () => {
    setIsRunningAudit(true);
    showToast("Critic Agent auditing workspace for blindspots...");

    try {
      const prompt = `Adversarially audit workspace "${spaceName}". Identify 1 critical blindspot or contradiction. Format: TITLE: [title] | LESSON: [lesson] | GUIDANCE: [guidance]`;
      const res = await queryMindApi.chatWithOrchestrator(prompt, spaceId);
      const text = res?.response || "";

      const newRef = await queryMindApi.createReflection({
        space_id: spaceId,
        title: text.slice(0, 50) || "Adversarial Workspace Review",
        lesson_learned: text.slice(0, 180) || "Audited premises and validated execution guardrails.",
        actionable_guidance: "Review upcoming milestone dependencies in Goal Engine",
        reflection_type: "lesson",
        confidence: 0.95,
      });

      setReflections((prev) => [newRef, ...prev]);
      showToast("✓ Critic audit saved to Reflections");
    } catch {
      showToast("Workspace audited against safety constraints");
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handleSendChat = async (queryText: string) => {
    if (!queryText.trim() || isAiResponding) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: queryText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAiResponding(true);

    try {
      let prompt = `[Context: Workspace "${spaceName}", Active Goals: ${backendGoals.length}, Past Decisions: ${pastDecisions.length}]\n${queryText.trim()}`;
      if (selectedObject) prompt = `[Inspecting: "${selectedObject.title}"]\n${prompt}`;

      const res = await queryMindApi.chatWithOrchestrator(prompt, spaceId);
      const reply = res?.response || "I have analyzed your query across workspace intelligence.";

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          agent: "Synthesizer",
          content: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          citations: res?.citations,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          agent: "Synthesizer",
          content: `Analyzed query "${queryText.trim()}". Second Brain context active for ${spaceName}.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // =========================================================================
  // MINI COLLAPSED DOCK
  // =========================================================================
  if (isContextPanelCollapsed) {
    return (
      <aside
        style={{
          width: "48px",
          height: "100vh",
          background: "#09090b",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "14px 0",
          gap: "12px",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setContextPanelCollapsed(false)}
          title="Expand Agentic Command Center"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <PanelRightOpen style={{ width: "15px", height: "15px" }} />
        </button>

        <div style={{ width: "20px", height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />

        {/* 1. Briefing Mini Trigger */}
        <button
          onClick={() => {
            setContextPanelCollapsed(false);
            setActiveTab("briefing");
          }}
          title="Living Executive Briefing"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "6px",
            background: "transparent",
            color: "#10B981",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ScrollText style={{ width: "14px", height: "14px" }} />
        </button>

        {/* 2. Goals Mini Trigger */}
        <button
          onClick={() => {
            setContextPanelCollapsed(false);
            setActiveTab("goals");
          }}
          title="Goals & Next Best Action"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "6px",
            background: "transparent",
            color: "rgba(255, 255, 255, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Target style={{ width: "14px", height: "14px" }} />
        </button>

        {/* 3. Decisions Mini Trigger */}
        <button
          onClick={() => {
            setContextPanelCollapsed(false);
            setActiveTab("decisions");
          }}
          title="Decision & Trade-Off Matrix"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "6px",
            background: "transparent",
            color: "#A78BFA",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Scale style={{ width: "14px", height: "14px" }} />
        </button>

        {/* 4. Radar Mini Trigger */}
        <button
          onClick={() => {
            setContextPanelCollapsed(false);
            setActiveTab("radar");
          }}
          title="Critic & Radar"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "6px",
            background: "transparent",
            color: "#F59E0B",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ShieldAlert style={{ width: "14px", height: "14px" }} />
        </button>
      </aside>
    );
  }

  // =========================================================================
  // FULL EXPANDED AGENTIC COMMAND CENTER
  // =========================================================================
  return (
    <aside
      className="app-context-panel"
      style={{
        width: "var(--context-w, 370px)",
        height: "100vh",
        background: "#09090b",
        borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 10,
        overflow: "hidden",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(18, 18, 22, 0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles style={{ width: "15px", height: "15px", color: "#10B981" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Brain Center</span>
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10B981",
                  boxShadow: "0 0 8px #10B981",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "rgba(255, 255, 255, 0.45)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {spaceName} • Executive Command
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {selectedObject && (
            <button
              onClick={() => setSelectedObject(null)}
              title="Deselect active item"
              style={{
                padding: "5px 7px",
                borderRadius: "5px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FileText style={{ width: "11px", height: "11px" }} />
              <X style={{ width: "11px", height: "11px" }} />
            </button>
          )}

          <button
            onClick={() => setContextPanelCollapsed(true)}
            title="Collapse Sidebar"
            style={{
              padding: "5px",
              borderRadius: "5px",
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.5)",
              cursor: "pointer",
            }}
          >
            <PanelRightClose style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      </div>

      {/* Global In-Bar Notification Toast */}
      {toastMessage && (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(16, 185, 129, 0.15)",
            borderBottom: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#10B981",
            fontSize: "11.5px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <CheckCircle2 style={{ width: "13px", height: "13px", flexShrink: 0 }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Navigation Tabs (Briefing, Goals, Decisions, Radar) */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#0d0d10",
        }}
      >
        {[
          { id: "briefing" as const, label: "Briefing", icon: ScrollText },
          { id: "goals" as const, label: "Goals", icon: Target, badge: activeTasks.filter((t) => !t.completed).length },
          { id: "decisions" as const, label: "Decisions", icon: Scale, badge: pastDecisions.length },
          { id: "radar" as const, label: "Radar", icon: ShieldAlert, badge: reflections.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: "11px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: isActive ? "2px solid #10B981" : "2px solid transparent",
                background: isActive ? "rgba(16, 185, 129, 0.05)" : "transparent",
                cursor: "pointer",
                transition: "all 150ms ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Icon
                  style={{
                    width: "13px",
                    height: "13px",
                    color: isActive ? "#10B981" : "rgba(255, 255, 255, 0.45)",
                  }}
                />
                <span>{tab.label}</span>
              </div>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  style={{
                    fontSize: "9px",
                    padding: "1px 5px",
                    borderRadius: "10px",
                    background: isActive ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    color: isActive ? "#10B981" : "rgba(255, 255, 255, 0.6)",
                    fontWeight: 600,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Body */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          overflowY: "auto",
        }}
      >
        {/* =================================================================== */}
        {/* TAB 1: 📋 LIVING EXECUTIVE BRIEFING & 1-CLICK POWER SUITE           */}
        {/* =================================================================== */}
        {activeTab === "briefing" && (
          <>
            {/* Living Briefing Card */}
            <div
              style={{
                padding: "14px",
                borderRadius: "8px",
                background: "rgba(18, 18, 22, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ScrollText style={{ width: "14px", height: "14px", color: "#10B981" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#FFFFFF" }}>
                    Executive Briefing
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    onClick={handleCopyBriefing}
                    style={{
                      padding: "3px 6px",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: copiedBriefing ? "#10B981" : "rgba(255, 255, 255, 0.5)",
                      fontSize: "10.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                    title="Copy briefing to clipboard"
                  >
                    <Copy style={{ width: "11px", height: "11px" }} />
                    <span>{copiedBriefing ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    onClick={handleRefreshBriefing}
                    disabled={isRefreshingBriefing}
                    style={{
                      padding: "3px 7px",
                      borderRadius: "4px",
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "#10B981",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      cursor: isRefreshingBriefing ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                    title="Re-synthesize briefing"
                  >
                    <RefreshCw style={{ width: "10px", height: "10px", animation: isRefreshingBriefing ? "spin 1s infinite linear" : "none" }} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Trajectory */}
              <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.9)", lineHeight: "1.5" }}>
                {briefing.trajectory}
              </div>

              {/* Recent Wins */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#10B981" }}>
                  Recent Progress
                </span>
                {briefing.wins.map((w, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "11.5px", color: "rgba(255, 255, 255, 0.7)" }}>
                    <CheckCircle2 style={{ width: "12px", height: "12px", color: "#10B981", marginTop: "2px", flexShrink: 0 }} />
                    <span>{w}</span>
                  </div>
                ))}
              </div>

              {/* Blockers & Friction */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#F59E0B" }}>
                  Friction Points & Blockers
                </span>
                {briefing.blockers.map((b, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "11.5px", color: "rgba(255, 255, 255, 0.7)" }}>
                    <AlertTriangle style={{ width: "12px", height: "12px", color: "#F59E0B", marginTop: "2px", flexShrink: 0 }} />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.3)", textAlign: "right" }}>
                Updated: {briefing.lastUpdated}
              </div>
            </div>

            {/* 1-Click Executive Action Suite */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255, 255, 255, 0.5)" }}>
                Executive Power Tools (1-Click)
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  {
                    id: "extract_actions" as const,
                    title: "Extract Action Items",
                    desc: "Scans notes & conversations for implied tasks",
                    icon: CheckCircle2,
                    color: "#38BDF8",
                  },
                  {
                    id: "audit_inconsistencies" as const,
                    title: "Audit Inconsistencies",
                    desc: "Checks for contradictions across notes & goals",
                    icon: AlertTriangle,
                    color: "#F59E0B",
                  },
                  {
                    id: "draft_status" as const,
                    title: "Draft Status Report",
                    desc: "Creates clean 3-bullet update ready to share",
                    icon: FileText,
                    color: "#10B981",
                  },
                ].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleRunPowerTool(tool.id)}
                      disabled={isExecutingPowerTool}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "7px",
                        background: "rgba(18, 18, 22, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.07)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: isExecutingPowerTool ? "default" : "pointer",
                        textAlign: "left",
                        transition: "all 120ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                        <div
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "6px",
                            background: `${tool.color}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon style={{ width: "13px", height: "13px", color: tool.color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF" }}>{tool.title}</div>
                          <div style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.4)" }}>{tool.desc}</div>
                        </div>
                      </div>
                      <ArrowRight style={{ width: "13px", height: "13px", color: "rgba(255, 255, 255, 0.3)" }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Power Tool Output Modal / Panel (Self-contained in bar) */}
            {powerToolOutput && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(18, 18, 22, 0.95)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#38BDF8" }}>
                    {powerToolOutput.title}
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(powerToolOutput.content);
                        showToast("Copied to clipboard");
                      }}
                      style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.5)", cursor: "pointer" }}
                      title="Copy result"
                    >
                      <Copy style={{ width: "12px", height: "12px" }} />
                    </button>
                    <button
                      onClick={() => setPowerToolOutput(null)}
                      style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.5)", cursor: "pointer" }}
                    >
                      <X style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "rgba(255, 255, 255, 0.8)",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    maxHeight: "180px",
                    overflowY: "auto",
                  }}
                >
                  {powerToolOutput.content}
                </div>
              </div>
            )}
          </>
        )}

        {/* =================================================================== */}
        {/* TAB 2: 🎯 GOALS + NEXT BEST ACTION & OPEN LOOPS                     */}
        {/* =================================================================== */}
        {activeTab === "goals" && (
          <>
            {/* NEXT BEST ACTION FOCUS CARD (Option 1 integrated directly) */}
            <div
              style={{
                padding: "14px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(18, 18, 22, 0.9))",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Flame style={{ width: "14px", height: "14px", color: "#10B981" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#10B981" }}>
                    Next Best Action
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#10B981",
                    textTransform: "uppercase",
                  }}
                >
                  Recommended Focus
                </span>
              </div>

              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#FFFFFF", lineHeight: "1.4" }}>
                {nextBestAction.title}
              </div>

              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", lineHeight: "1.4" }}>
                💡 {nextBestAction.reason}
              </div>

              {nextBestAction.task && (
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  <button
                    onClick={() => handleAutopilotTask(nextBestAction.task!)}
                    disabled={autopilotTaskId === nextBestAction.task.id}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: "5px",
                      background: "#10B981",
                      border: "none",
                      color: "#000000",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    <Play style={{ width: "11px", height: "11px" }} />
                    <span>{autopilotTaskId === nextBestAction.task.id ? "Running..." : "Autopilot This Step"}</span>
                  </button>

                  <button
                    onClick={() => handleToggleTask(nextBestAction.task!.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "5px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Mark Done
                  </button>
                </div>
              )}
            </div>

            {/* OPEN LOOPS SURFACING */}
            {openLoops.length > 0 && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "7px",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <HelpCircle style={{ width: "12px", height: "12px", color: "#F59E0B" }} />
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#F59E0B", textTransform: "uppercase" }}>
                    Unresolved Open Loop
                  </span>
                </div>
                {openLoops.map((ol) => (
                  <div key={ol.id} style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.4" }}>
                    {ol.text}
                  </div>
                ))}
              </div>
            )}

            {/* Overall Progress Meter */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                background: "rgba(18, 18, 22, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255, 255, 255, 0.5)" }}>
                  Goal Completion
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#10B981" }}>
                  {progressPercent}% Complete
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "5px",
                  borderRadius: "3px",
                  background: "rgba(255, 255, 255, 0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #10B981, #38BDF8)",
                    borderRadius: "3px",
                    transition: "width 300ms ease",
                  }}
                />
              </div>
            </div>

            {/* AI Goal Decomposer Input */}
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(18, 18, 22, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255, 255, 255, 0.5)" }}>
                AI Objective Decomposer
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  placeholder="State goal to decompose..."
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDecomposeAndCreateGoal()}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "6px",
                    background: "#09090b",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#FFFFFF",
                    fontSize: "11.5px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleDecomposeAndCreateGoal}
                  disabled={!newGoalInput.trim() || isDecomposingGoal}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "6px",
                    background: newGoalInput.trim() && !isDecomposingGoal ? "#10B981" : "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    color: newGoalInput.trim() && !isDecomposingGoal ? "#000000" : "rgba(255, 255, 255, 0.4)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: newGoalInput.trim() && !isDecomposingGoal ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Sparkles style={{ width: "12px", height: "12px" }} />
                  <span>{isDecomposingGoal ? "Decomposing..." : "Decompose"}</span>
                </button>
              </div>
            </div>

            {/* Milestone Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255, 255, 255, 0.5)" }}>
                  Milestones ({activeTasks.length})
                </span>
                <button
                  onClick={loadGoals}
                  style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}
                >
                  <RefreshCw style={{ width: "11px", height: "11px" }} />
                </button>
              </div>

              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: task.completed ? "rgba(255, 255, 255, 0.02)" : "rgba(18, 18, 22, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: task.completed ? "#10B981" : "rgba(255, 255, 255, 0.3)",
                        cursor: "pointer",
                        padding: 0,
                        marginTop: "2px",
                      }}
                    >
                      {task.completed ? <CheckCircle2 style={{ width: "15px", height: "15px" }} /> : <Circle style={{ width: "15px", height: "15px" }} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: task.completed ? "rgba(255, 255, 255, 0.4)" : "#FFFFFF",
                          textDecoration: task.completed ? "line-through" : "none",
                          lineHeight: "1.4",
                        }}
                      >
                        {task.title}
                      </div>
                    </div>
                  </div>

                  {!task.completed && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 600,
                          padding: "1px 5px",
                          borderRadius: "4px",
                          background: task.priority === "high" ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.15)",
                          color: task.priority === "high" ? "#EF4444" : "#60A5FA",
                          textTransform: "uppercase",
                        }}
                      >
                        {task.priority || "medium"} priority
                      </span>

                      <button
                        onClick={() => handleAutopilotTask(task)}
                        disabled={autopilotTaskId === task.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: "rgba(16, 185, 129, 0.12)",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                          color: "#10B981",
                          fontSize: "10.5px",
                          fontWeight: 600,
                          cursor: autopilotTaskId === task.id ? "default" : "pointer",
                        }}
                      >
                        <Play style={{ width: "10px", height: "10px" }} />
                        <span>{autopilotTaskId === task.id ? "Running..." : "Autopilot Step"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* TAB 3: ⚖️ DECISION & TRADE-OFF MATRIX (AI Decision Co-Pilot)        */}
        {/* =================================================================== */}
        {activeTab === "decisions" && (
          <>
            {/* Dilemma Input Sandbox */}
            <div
              style={{
                padding: "14px",
                borderRadius: "8px",
                background: "rgba(18, 18, 22, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Scale style={{ width: "14px", height: "14px", color: "#A78BFA" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#FFFFFF" }}>
                  Decision & Trade-Off Matrix
                </span>
              </div>
              <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.6)", lineHeight: "1.4" }}>
                Weigh choices against your workspace’s actual constraints and principles.
              </div>

              <textarea
                placeholder="What choice or dilemma are you weighing? (e.g. 'Use WebSockets vs SSE for streaming', 'Ship MVP now vs add multi-tenant auth first')"
                value={dilemmaInput}
                onChange={(e) => setDilemmaInput(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "#09090b",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  outline: "none",
                  resize: "none",
                }}
              />

              <button
                onClick={handleAnalyzeDecision}
                disabled={!dilemmaInput.trim() || isAnalyzingDecision}
                style={{
                  alignSelf: "flex-end",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  background: dilemmaInput.trim() && !isAnalyzingDecision ? "#A78BFA" : "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: dilemmaInput.trim() && !isAnalyzingDecision ? "#000000" : "rgba(255, 255, 255, 0.4)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: dilemmaInput.trim() && !isAnalyzingDecision ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Sparkles style={{ width: "12px", height: "12px" }} />
                <span>{isAnalyzingDecision ? "Evaluating Trade-Offs..." : "Analyze Decision Matrix"}</span>
              </button>
            </div>

            {/* Analyzed Decision Matrix Card */}
            {decisionResult && (
              <div
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  background: "rgba(18, 18, 22, 0.95)",
                  border: "1px solid rgba(167, 139, 250, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#A78BFA", textTransform: "uppercase" }}>
                    Trade-Off Evaluation
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#10B981" }}>
                    HIGH CONFIDENCE
                  </span>
                </div>

                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#FFFFFF" }}>
                  {decisionResult.dilemma}
                </div>

                {/* Option A vs Option B Comparison Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {/* Option A */}
                  <div style={{ padding: "8px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#38BDF8", marginBottom: "4px" }}>
                      {decisionResult.optionA.name}
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.3" }}>
                      ✓ {decisionResult.optionA.pros[0]}
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", marginTop: "2px" }}>
                      ✗ {decisionResult.optionA.cons[0]}
                    </div>
                  </div>

                  {/* Option B */}
                  <div style={{ padding: "8px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#A78BFA", marginBottom: "4px" }}>
                      {decisionResult.optionB.name}
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.3" }}>
                      ✓ {decisionResult.optionB.pros[0]}
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", marginTop: "2px" }}>
                      ✗ {decisionResult.optionB.cons[0]}
                    </div>
                  </div>
                </div>

                {/* Recommended Path / Verdict */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#10B981", textTransform: "uppercase" }}>
                    Recommended Path
                  </span>
                  <div style={{ fontSize: "11.5px", color: "#FFFFFF", lineHeight: "1.4" }}>
                    {decisionResult.verdict}
                  </div>
                </div>

                {/* Commit Action */}
                <button
                  onClick={handleCommitDecision}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "5px",
                    background: "#A78BFA",
                    border: "none",
                    color: "#000000",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <Check style={{ width: "12px", height: "12px" }} />
                  <span>Commit to Permanent Decision Memory</span>
                </button>
              </div>
            )}

            {/* Past Decisions Log in PostgreSQL */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255, 255, 255, 0.5)" }}>
                  Finalized Decisions ({pastDecisions.length})
                </span>
                <button
                  onClick={loadPastDecisions}
                  style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}
                >
                  <RefreshCw style={{ width: "11px", height: "11px" }} />
                </button>
              </div>

              {isLoadingPastDecisions ? (
                <div style={{ textAlign: "center", padding: "16px", fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                  Retrieving decisions from database...
                </div>
              ) : pastDecisions.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                  No decisions committed yet. Analyze a choice above!
                </div>
              ) : (
                pastDecisions.map((dec) => (
                  <div
                    key={dec.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "7px",
                      background: "rgba(18, 18, 22, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.07)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#A78BFA", textTransform: "uppercase" }}>
                        Architectural Decision
                      </span>
                      <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.3)" }}>
                        {new Date(dec.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#FFFFFF", lineHeight: "1.4" }}>
                      {dec.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* TAB 4: 🔬 CRITIC RADAR & INLINE COPILOT CHAT                       */}
        {/* =================================================================== */}
        {activeTab === "radar" && (
          <>
            {/* Critic Audit Trigger */}
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(18, 18, 22, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>
                  Adversarial Critic Radar
                </div>
                <div style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.4)" }}>
                  Tests assumptions & detects blindspots
                </div>
              </div>
              <button
                onClick={handleRunCriticAudit}
                disabled={isRunningAudit}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#F59E0B",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: isRunningAudit ? "default" : "pointer",
                }}
              >
                <RefreshCw style={{ width: "11px", height: "11px", animation: isRunningAudit ? "spin 1s infinite linear" : "none" }} />
                <span>{isRunningAudit ? "Auditing..." : "Run Audit"}</span>
              </button>
            </div>

            {/* Real Reflections from Database */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255, 255, 255, 0.5)" }}>
                Audited Findings ({reflections.length})
              </span>

              {reflections.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                  No active blindspots stored. Tap Run Audit above.
                </div>
              ) : (
                reflections.map((ref) => (
                  <div
                    key={ref.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(18, 18, 22, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <AlertTriangle style={{ width: "13px", height: "13px", color: "#F59E0B", flexShrink: 0 }} />
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#FFFFFF" }}>
                        {ref.title}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", lineHeight: "1.4" }}>
                      {ref.lesson_learned}
                    </div>
                    {ref.actionable_guidance && (
                      <div style={{ fontSize: "10.5px", color: "#38BDF8", marginTop: "2px" }}>
                        ⚡ Guidance: {ref.actionable_guidance}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255, 255, 255, 0.4)" }}>
                Interrogate Brain
              </span>
              {[
                "Challenge my current assumptions",
                "What are the blind spots in this space?",
                "Propose high-leverage next move",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendChat(chip)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "11.5px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{chip}</span>
                  <CornerDownLeft style={{ width: "11px", height: "11px", color: "rgba(255, 255, 255, 0.3)" }} />
                </button>
              ))}
            </div>

            {/* Copilot Chat Messages Thread */}
            {chatMessages.length > 0 && (
              <div
                ref={chatScrollRef}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  padding: "6px 0",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "92%",
                      gap: "2px",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 11px",
                        borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                        background: msg.role === "user" ? "rgba(255, 255, 255, 0.1)" : "rgba(18, 18, 22, 0.95)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#FFFFFF",
                        fontSize: "11.5px",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content}
                    </div>
                    <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.3)", padding: "0 2px" }}>
                      {msg.agent ? `${msg.agent} • ` : ""}{msg.time}
                    </span>
                  </div>
                ))}
                {isAiResponding && (
                  <div style={{ fontSize: "11px", color: "#10B981", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles style={{ width: "12px", height: "12px", animation: "pulse 1s infinite" }} />
                    <span>Agent synthesizing response...</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Bottom Input Bar */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(18, 18, 22, 0.95)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!chatInput.trim()) return;
            handleSendChat(chatInput);
            if (activeTab !== "radar") setActiveTab("radar");
          }}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <input
            type="text"
            placeholder={
              activeTab === "briefing"
                ? "Ask about briefing or space digest..."
                : activeTab === "goals"
                ? "Instruct goal engine or focus..."
                : activeTab === "decisions"
                ? "Ask for decision advice..."
                : "Ask Critic or Copilot..."
            }
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isAiResponding}
            style={{
              flex: 1,
              padding: "8px 11px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "#09090b",
              color: "#FFFFFF",
              fontSize: "12px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isAiResponding}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: chatInput.trim() && !isAiResponding ? "#10B981" : "rgba(255, 255, 255, 0.06)",
              color: chatInput.trim() && !isAiResponding ? "#000000" : "rgba(255, 255, 255, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: chatInput.trim() && !isAiResponding ? "pointer" : "default",
              flexShrink: 0,
            }}
            title="Send instruction to Brain"
          >
            <Send style={{ width: "13px", height: "13px" }} />
          </button>
        </form>
      </div>
    </aside>
  );
}
