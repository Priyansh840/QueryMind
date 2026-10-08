"use client";

import React, { use, useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Folder,
  FileText,
  Upload,
  RefreshCw,
  Send,
  Trash2,
  CheckCircle,
  AlertCircle,
  Bot,
  MessageSquare,
  ClipboardList,
  Target,
  Plus,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Download,
  CheckSquare,
  Square,
  ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi, downloadBlob, GoalData } from "@/lib/api";

type SpaceTab = "overview" | "documents" | "copilot" | "briefing" | "scratchpad";

function SpaceDetailContent({ spaceId }: { spaceId: string }) {
  const router = useRouter();

  const spaces = useMyndStore((state) => state.spaces);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const addDocument = useMyndStore((state) => state.addDocument);
  const deleteDocument = useMyndStore((state) => state.deleteDocument);
  const deleteSpace = useMyndStore((state) => state.deleteSpace);
  const updateSpaceScratchpad = useMyndStore((state) => state.updateSpaceScratchpad);

  // Active Tab
  const [activeTab, setActiveTab] = useState<SpaceTab>("overview");

  // Real Space Goals State
  const [spaceGoals, setSpaceGoals] = useState<GoalData[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Scratchpad & Upload State
  const [scratchpadText, setScratchpadText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDeletingSpace, setIsDeletingSpace] = useState(false);

  // Briefing state
  const [briefing, setBriefing] = useState<{
    space_id: string;
    space_name: string;
    executive_summary: string;
    key_takeaways: string[];
    active_priorities: string[];
    knowledge_gaps: string[];
    recommended_actions: string[];
  } | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);

  // Space-isolated Copilot state
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string; citations?: string[]; timestamp?: string }>
  >([
    {
      id: "initial",
      role: "assistant",
      content:
        "Welcome to your Space Reasoning Copilot. I am strictly grounded in this space's uploaded documents, notes, and goals. Ask me any domain question.",
      timestamp: "Just now",
    },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [isCopilotStreaming, setIsCopilotStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Match current space
  const space = useMemo(() => {
    return (
      spaces.find(
        (s) =>
          s.id === spaceId ||
          s.id.toLowerCase() === spaceId.toLowerCase() ||
          s.slug === spaceId
      ) || spaces[0]
    );
  }, [spaces, spaceId]);

  // Sync active space in store & scratchpad text
  useEffect(() => {
    if (space?.id) {
      selectSpace(space.id);
      setScratchpadText(space.scratchpad || "");
    }
  }, [space?.id, selectSpace]);

  // Fetch real goals for this space from PostgreSQL
  const fetchSpaceGoals = async () => {
    if (!space?.id) return;
    setIsLoadingGoals(true);
    try {
      const data = await queryMindApi.getGoals({ spaceId: space.id });
      if (Array.isArray(data)) {
        setSpaceGoals(data);
      }
    } catch (err) {
      console.warn("Failed to fetch space goals:", err);
    } finally {
      setIsLoadingGoals(false);
    }
  };

  useEffect(() => {
    fetchSpaceGoals();
  }, [space?.id]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotMessages, isCopilotStreaming]);

  // Fetch real documents for this space from backend on mount
  useEffect(() => {
    if (!space?.id) return;
    queryMindApi
      .listDocuments(space.id)
      .then((docs) => {
        if (Array.isArray(docs)) {
          docs.forEach((d: any) => {
            const docName = d.title || d.name || "Document";
            const ext = docName.includes(".") ? docName.split(".").pop() : "doc";
            addDocument({
              id: d.id,
              name: docName,
              type: d.type || ext || "pdf",
              size: d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(2)} MB` : "Document",
              chunks: d.chunk_count || 1,
              spaceId: space.id,
              summary: d.status === "ready" ? "Indexed & ready for reasoning." : `Status: ${d.status || "Indexed"}`,
            });
          });
        }
      })
      .catch((err) => console.warn("Backend documents fetch:", err));
  }, [space?.id, addDocument]);

  // Fetch briefing on tab select
  const fetchBriefing = async () => {
    if (!space?.id) return;
    setIsLoadingBriefing(true);
    try {
      const res = await queryMindApi.getSpaceBriefing(space.id);
      setBriefing(res);
    } catch (err) {
      console.error("Failed to generate space briefing:", err);
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  useEffect(() => {
    if (activeTab === "briefing" && !briefing) {
      fetchBriefing();
    }
  }, [activeTab]);

  // Documents belonging to this space
  const spaceDocuments = useMemo(() => {
    if (!space) return [];
    return uploadedDocuments.filter((d) => d.spaceId === space.id);
  }, [uploadedDocuments, space]);

  // File Upload within Space
  const handleFileUpload = async (file: File) => {
    if (!file || !space) return;
    setIsUploading(true);
    setUploadStatus(null);

    const fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    const ext = file.name.split(".").pop() || "doc";

    try {
      const res = await queryMindApi.uploadDocument(file, space.id);
      addDocument({
        id: res.document_id || res.id,
        name: res.filename || file.name,
        type: ext,
        size: fileSizeStr,
        chunks: res.chunks_created || 1,
        spaceId: space.id,
        summary: `Indexed directly into space "${space.name}".`,
      });
      setUploadStatus({
        type: "success",
        message: `Indexed "${file.name}" into ${space.name}.`,
      });
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: err.message || "Failed to upload document",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Copilot Message Send
  const handleSendCopilotMessage = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || copilotInput.trim();
    if (!query || isCopilotStreaming || !space) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotInput("");
    setIsCopilotStreaming(true);

    try {
      const res = await queryMindApi.chatWithOrchestrator(query, space.id);
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: "assistant" as const,
        content: res.response || "Analysis complete.",
        citations: res.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setCopilotMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setCopilotMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant" as const,
          content: `Unable to complete reasoning request: ${err.message || "Connection error"}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsCopilotStreaming(false);
    }
  };

  // Create real goal in this space
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalDesc.trim() || !space || isCreatingGoal) return;
    setIsCreatingGoal(true);
    try {
      const created = await queryMindApi.createGoal({
        description: newGoalDesc.trim(),
        space_id: space.id,
        category: "general",
        priority: "medium",
        tasks: [],
      });
      setSpaceGoals((prev) => [created, ...prev]);
      setNewGoalDesc("");
    } catch (err: any) {
      alert("Failed to create goal: " + (err.message || err));
    } finally {
      setIsCreatingGoal(false);
    }
  };

  // Toggle goal status between active and completed
  const handleToggleGoalStatus = async (goal: GoalData) => {
    const nextStatus = goal.status === "completed" ? "in_progress" : "completed";
    try {
      const updated = await queryMindApi.updateGoal(goal.id, {
        status: nextStatus,
      });
      setSpaceGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (err: any) {
      console.error("Failed to update goal status:", err);
    }
  };

  // Add a sub-task to a space goal
  const handleAddTaskToGoal = async (goalId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const targetGoal = spaceGoals.find((g) => g.id === goalId);
    if (!targetGoal) return;

    const existingTasks = targetGoal.tasks || [];
    const updatedTasks = [
      ...existingTasks,
      {
        id: `task-${Date.now()}`,
        title: newTaskTitle.trim(),
        completed: false,
        priority: "medium" as const,
      },
    ];

    try {
      const updated = await queryMindApi.updateGoal(goalId, {
        tasks: updatedTasks,
      });
      setSpaceGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
      setNewTaskTitle("");
    } catch (err: any) {
      alert("Failed to add task: " + (err.message || err));
    }
  };

  // Toggle sub-task completion in a goal
  const handleToggleTask = async (goalId: string, taskId: string) => {
    const targetGoal = spaceGoals.find((g) => g.id === goalId);
    if (!targetGoal) return;

    const existingTasks = targetGoal.tasks || [];
    const updatedTasks = existingTasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );

    const allCompleted = updatedTasks.length > 0 && updatedTasks.every((t) => t.completed);
    const nextStatus = allCompleted ? "completed" : targetGoal.status;

    try {
      const updated = await queryMindApi.updateGoal(goalId, {
        tasks: updatedTasks,
        status: nextStatus,
      });
      setSpaceGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
    } catch (err: any) {
      console.error("Failed to toggle task:", err);
    }
  };

  // Delete goal
  const handleDeleteGoal = async (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this goal?")) return;
    try {
      await queryMindApi.deleteGoal(goalId);
      setSpaceGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (err: any) {
      alert("Failed to delete goal: " + (err.message || err));
    }
  };

  // Save Scratchpad
  const handleSaveScratchpad = () => {
    if (!space) return;
    updateSpaceScratchpad(space.id, scratchpadText);
  };

  // Delete Space
  const handleDeleteSpace = async () => {
    if (!space) return;
    if (
      !confirm(
        `Are you sure you want to delete space "${space.name}"? This action cannot be undone.`
      )
    )
      return;

    setIsDeletingSpace(true);
    try {
      await queryMindApi.deleteSpace(space.id);
      deleteSpace(space.id);
      router.push("/spaces");
    } catch (err: any) {
      alert("Failed to delete space: " + (err.message || err));
      setIsDeletingSpace(false);
    }
  };

  // Document download
  const handleDownloadSingle = async (docId: string, docName: string) => {
    try {
      const blob = await queryMindApi.downloadDocument(docId);
      downloadBlob(blob, docName || "document");
    } catch (err: any) {
      alert("Download failed: " + (err.message || err));
    }
  };

  // Aggregate completion progress for all goals in space
  const overallProgress = useMemo(() => {
    if (spaceGoals.length === 0) return 0;
    const completedCount = spaceGoals.filter((g) => g.status === "completed").length;
    return Math.round((completedCount / spaceGoals.length) * 100);
  }, [spaceGoals]);

  if (!space) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
        <h2>Space Not Found</h2>
        <p style={{ marginTop: "8px", fontSize: "14px" }}>The requested space does not exist.</p>
        <Link
          href="/spaces"
          style={{
            display: "inline-block",
            marginTop: "16px",
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Return to Spaces Hub
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px", width: "100%" }}>
      {/* Breadcrumb Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "20px" }}>
        <Link href="/spaces" style={{ color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={13} />
          <span>Spaces</span>
        </Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{space.name}</span>
      </div>

      {/* Hero Banner */}
      <div
        style={{
          background: "var(--surface-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "28px 32px",
          marginBottom: "24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: `${space.color || "#6366f1"}1A`,
                  color: space.color || "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${space.color || "#6366f1"}33`,
                }}
              >
                <Folder size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {space.name}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                  <span>{spaceDocuments.length} Documents</span>
                  <span>•</span>
                  <span>{spaceGoals.length} {spaceGoals.length === 1 ? "Goal" : "Goals"}</span>
                  <span>•</span>
                  <span style={{ color: "#10B981" }}>Active Domain</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "10px", maxWidth: "680px", lineHeight: 1.5 }}>
              {space.desc || "Dedicated cognitive workspace."}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "#6366f1",
                border: "1px solid #4f46e5",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isUploading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
              }}
              className="hover:bg-[#4f46e5]"
            >
              {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>Upload Document</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteSpace}
              disabled={isDeletingSpace}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#EF4444",
                fontSize: "13px",
                fontWeight: 500,
                cursor: isDeletingSpace ? "not-allowed" : "pointer",
              }}
              className="hover:bg-[rgba(239,68,68,0.15)]"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Upload feedback banner */}
        {uploadStatus && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              background: uploadStatus.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: uploadStatus.type === "success" ? "#10B981" : "#EF4444",
              border: `1px solid ${uploadStatus.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            }}
          >
            {uploadStatus.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            <span>{uploadStatus.message}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "12px",
          marginBottom: "24px",
          overflowX: "auto",
        }}
      >
        {[
          { id: "overview" as SpaceTab, label: `Goals & Overview (${spaceGoals.length})` },
          { id: "documents" as SpaceTab, label: `Documents (${spaceDocuments.length})` },
          { id: "copilot" as SpaceTab, label: "Space Reasoning" },
          { id: "briefing" as SpaceTab, label: "Intelligence Briefing" },
          { id: "scratchpad" as SpaceTab, label: "Scratchpad" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#818cf8" : "var(--text-secondary)",
                background: isActive ? "rgba(99, 102, 241, 0.12)" : "transparent",
                border: isActive ? "1px solid rgba(99, 102, 241, 0.28)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              className={!isActive ? "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" : ""}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Real Goals */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          {/* Space Goals Card */}
          <div
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Target size={18} className="text-indigo-400" />
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Space Goals ({spaceGoals.length})
                </h3>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                {overallProgress}% Completed
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div style={{ height: "6px", borderRadius: "9999px", background: "var(--surface-secondary)", overflow: "hidden", marginBottom: "18px" }}>
              <div
                style={{
                  height: "100%",
                  width: `${overallProgress}%`,
                  background: "#6366f1",
                  borderRadius: "9999px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            {/* List of Multiple Goals for this Space */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {isLoadingGoals ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
                  <RefreshCw size={14} className="animate-spin inline-block mr-2" />
                  Loading space goals...
                </div>
              ) : spaceGoals.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
                  No goals assigned to this space yet. Add your first goal below.
                </div>
              ) : (
                spaceGoals.map((goal) => {
                  const isCompleted = goal.status === "completed";
                  const isExpanded = expandedGoalId === goal.id;
                  const tasks = goal.tasks || [];
                  const completedTasksCount = tasks.filter((t) => t.completed).length;
                  const taskPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : isCompleted ? 100 : 0;

                  return (
                    <div
                      key={goal.id}
                      style={{
                        borderRadius: "10px",
                        background: isCompleted ? "rgba(16, 185, 129, 0.04)" : "var(--surface-secondary)",
                        border: isCompleted ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--border-subtle)",
                        padding: "12px 14px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Goal Main Row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flex: 1, minWidth: 0 }}
                          onClick={() => handleToggleGoalStatus(goal)}
                        >
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "4px",
                              border: isCompleted ? "2px solid #10B981" : "2px solid var(--border-strong)",
                              background: isCompleted ? "#10B981" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#FFFFFF",
                              fontSize: "11px",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {isCompleted && "✓"}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Link
                              href={`/goals?goal_id=${goal.id}`}
                              style={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: isCompleted ? "var(--text-tertiary)" : "var(--text-primary)",
                                textDecoration: isCompleted ? "line-through" : "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                              className="hover:text-[var(--accent)] hover:underline"
                              title="Open goal in Goals workspace"
                            >
                              <span>{goal.description}</span>
                              <ExternalLink size={11} style={{ opacity: 0.6 }} />
                            </Link>
                            {tasks.length > 0 && (
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                                {completedTasksCount}/{tasks.length} tasks • {taskPercent}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expand & Delete controls */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Link
                            href={`/goals?goal_id=${goal.id}`}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "rgba(99, 102, 241, 0.12)",
                              border: "1px solid rgba(99, 102, 241, 0.25)",
                              color: "var(--accent)",
                              fontSize: "11px",
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Focus in Goals view"
                          >
                            <Target size={12} />
                            <span>Focus</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "transparent",
                              border: "none",
                              color: "var(--text-secondary)",
                              fontSize: "11px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                            title="Expand sub-tasks"
                          >
                            <span>Tasks ({tasks.length})</span>
                            <ChevronDown size={12} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteGoal(goal.id, e)}
                            style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: "4px" }}
                            className="hover:text-rose-400"
                            title="Delete goal"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Sub-Tasks Section */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: "12px",
                            paddingTop: "10px",
                            borderTop: "1px solid var(--border-subtle)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => handleToggleTask(goal.id, task.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "6px 8px",
                                borderRadius: "6px",
                                background: "var(--surface-primary)",
                                border: "1px solid var(--border-subtle)",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              <div
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "3px",
                                  border: task.completed ? "2px solid #10B981" : "2px solid var(--border-strong)",
                                  background: task.completed ? "#10B981" : "transparent",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#FFFFFF",
                                  fontSize: "9px",
                                  fontWeight: 700,
                                }}
                              >
                                {task.completed && "✓"}
                              </div>
                              <span
                                style={{
                                  color: task.completed ? "var(--text-tertiary)" : "var(--text-secondary)",
                                  textDecoration: task.completed ? "line-through" : "none",
                                }}
                              >
                                {task.title}
                              </span>
                            </div>
                          ))}

                          {/* Add Sub-task Input */}
                          <form onSubmit={(e) => handleAddTaskToGoal(goal.id, e)} style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                            <input
                              type="text"
                              placeholder="+ Add sub-task..."
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "6px 10px",
                                borderRadius: "6px",
                                background: "var(--surface-primary)",
                                border: "1px dashed var(--border-strong)",
                                color: "var(--text-primary)",
                                fontSize: "12px",
                                outline: "none",
                              }}
                            />
                            <button
                              type="submit"
                              disabled={!newTaskTitle.trim()}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                background: "#6366f1",
                                border: "none",
                                color: "#FFFFFF",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: newTaskTitle.trim() ? "pointer" : "default",
                              }}
                            >
                              Add
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add New Goal Form */}
            <form onSubmit={handleCreateGoal} style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="+ Add new goal to this space..."
                value={newGoalDesc}
                onChange={(e) => setNewGoalDesc(e.target.value)}
                disabled={isCreatingGoal}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: "8px",
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!newGoalDesc.trim() || isCreatingGoal}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  background: "#6366f1",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: newGoalDesc.trim() && !isCreatingGoal ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isCreatingGoal ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={14} />}
                <span>Add Goal</span>
              </button>
            </form>
          </div>

          {/* Recent Ingested Documents Card */}
          <div
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} className="text-cyan-400" />
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Domain Documents ({spaceDocuments.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                View All →
              </button>
            </div>

            {spaceDocuments.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                No documents uploaded to this space yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {spaceDocuments.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <FileText size={16} className="text-indigo-400 flex-shrink-0" />
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {doc.name || doc.title}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)", flexShrink: 0, marginLeft: "10px" }}>
                      {doc.size || "Doc"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Space Documents */}
      {activeTab === "documents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {spaceDocuments.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "var(--surface-primary)",
                borderRadius: "14px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <FileText size={24} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                No Documents in {space.name}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Upload specifications, technical PDFs, or guides using the button above.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {spaceDocuments.map((doc) => {
                const docName = doc.name || doc.title || "Document";
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderRadius: "10px",
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          background: "var(--surface-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={18} className="text-indigo-400" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {docName}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                          {doc.size || "Document"} • {doc.chunks || 1} chunks • Ready for AI Reasoning
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "14px" }}>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(doc.id, docName)}
                        style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "6px" }}
                        className="hover:text-[var(--text-primary)]"
                        title="Download"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          deleteDocument(doc.id);
                          try {
                            await queryMindApi.deleteDocument(doc.id);
                          } catch {}
                        }}
                        style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: "6px" }}
                        className="hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Space Copilot Reasoning */}
      {activeTab === "copilot" && (
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            display: "flex",
            flexDirection: "column",
            height: "640px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface-secondary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Bot size={18} className="text-indigo-400" />
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {space.name} Reasoning Agent
                </h3>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Isolated strictly to {spaceDocuments.length} documents & {spaceGoals.length} goals
                </span>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {copilotMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: "12px",
                    background: msg.role === "user" ? "#6366f1" : "var(--surface-secondary)",
                    color: msg.role === "user" ? "#FFFFFF" : "var(--text-primary)",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    border: msg.role === "user" ? "none" : "1px solid var(--border-subtle)",
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                    {msg.citations.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "var(--surface-secondary)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        📄 {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isCopilotStreaming && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                <RefreshCw size={13} className="animate-spin text-indigo-400" />
                <span>Querying space vector memory...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSendCopilotMessage}
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--surface-primary)",
              display: "flex",
              gap: "10px",
            }}
          >
            <input
              type="text"
              placeholder={`Ask anything grounded in ${space.name}...`}
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              disabled={isCopilotStreaming}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!copilotInput.trim() || isCopilotStreaming}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                background: "#6366f1",
                border: "none",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                cursor: copilotInput.trim() && !isCopilotStreaming ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Intelligence Briefing */}
      {activeTab === "briefing" && (
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            padding: "28px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ClipboardList size={20} className="text-indigo-400" />
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                Domain Synthesis & Executive Briefing
              </h3>
            </div>
            <button
              type="button"
              onClick={fetchBriefing}
              disabled={isLoadingBriefing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={12} className={isLoadingBriefing ? "animate-spin" : ""} />
              <span>Regenerate Briefing</span>
            </button>
          </div>

          {isLoadingBriefing ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
              <RefreshCw size={20} className="animate-spin text-indigo-400" style={{ margin: "0 auto 10px auto" }} />
              <div>Synthesizing cross-document insights and detecting blindspots...</div>
            </div>
          ) : briefing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  Executive Summary
                </h4>
                <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6 }}>
                  {briefing.executive_summary}
                </p>
              </div>

              {briefing.key_takeaways?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    Key Takeaways
                  </h4>
                  <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {briefing.key_takeaways.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {briefing.knowledge_gaps?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    Knowledge Gaps & Blindspots
                  </h4>
                  <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {briefing.knowledge_gaps.map((gap, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {briefing.recommended_actions?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    Recommended Next Steps
                  </h4>
                  <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {briefing.recommended_actions.map((act, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>
                        {act}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
              Click &quot;Regenerate Briefing&quot; above to synthesize this space&apos;s knowledge base.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Studio & Scratchpad */}
      {activeTab === "scratchpad" && (
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                Domain Scratchpad
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                Working notes, ideas, and drafts persisted to this space.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveScratchpad}
              style={{
                padding: "7px 16px",
                borderRadius: "6px",
                background: "#6366f1",
                border: "none",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save Notes
            </button>
          </div>

          <textarea
            value={scratchpadText}
            onChange={(e) => setScratchpadText(e.target.value)}
            rows={14}
            placeholder="Type notes, architecture decisions, or formulas here..."
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontSize: "13px",
              lineHeight: 1.6,
              fontFamily: "monospace",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>
      )}
    </div>
  );
}

function SpaceDetailWrapper({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  return <SpaceDetailContent spaceId={resolved.id} />;
}

export default function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div style={{ padding: "40px", color: "var(--text-tertiary)", textAlign: "center" }}>
          Loading space workspace...
        </div>
      }
    >
      <SpaceDetailWrapper params={params} />
    </React.Suspense>
  );
}
