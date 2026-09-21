"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";
import {
  MessageSquare,
  FileText,
  Target,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ArrowUpRight,
  PanelRightClose,
  PanelRightOpen,
  Upload,
  Copy,
  Check,
  Search,
  Sparkles,
  RefreshCw,
  AlertCircle,
  X,
  ChevronLeft,
  Code2,
  CheckSquare,
} from "lucide-react";

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function ContextPanel() {
  const router = useRouter();
  const selectedObject = useMyndStore((state) => state.selectedObject);
  const setSelectedObject = useMyndStore((state) => state.setSelectedObject);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const addDocument = useMyndStore((state) => state.addDocument);
  const removeDocument = useMyndStore((state) => state.removeDocument);

  // Default collapsed per user preference
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<"chats" | "docs" | "goals">("chats");

  // Real data states
  const [conversations, setConversations] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [docsList, setDocsList] = useState<any[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);

  // Search & inputs
  const [chatSearch, setChatSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [newGoalInput, setNewGoalInput] = useState("");
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("querymind_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    }
  }, []);

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem("querymind_sidebar_collapsed", String(collapsed));
    }
  };

  // Fetch real conversations
  const fetchConversations = useCallback(async () => {
    setIsLoadingChats(true);
    try {
      const data = await queryMindApi.getConversations(activeSpaceId || undefined);
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (err) {
      console.warn("ContextPanel: error loading conversations", err);
    } finally {
      setIsLoadingChats(false);
    }
  }, [activeSpaceId]);

  // Fetch real documents for current space
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const data = await queryMindApi.listDocuments(activeSpaceId || undefined);
      if (Array.isArray(data)) {
        setDocsList(data);
      }
    } catch (err) {
      console.warn("ContextPanel: error loading documents", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [activeSpaceId]);

  // Fetch real goals
  const fetchGoals = useCallback(async () => {
    setIsLoadingGoals(true);
    try {
      const data = await queryMindApi.getGoals();
      if (Array.isArray(data)) {
        setGoals(data);
      }
    } catch (err) {
      console.warn("ContextPanel: error loading goals", err);
    } finally {
      setIsLoadingGoals(false);
    }
  }, []);

  // Fetch data when active space changes
  useEffect(() => {
    fetchConversations();
    fetchDocuments();
    fetchGoals();
  }, [fetchConversations, fetchDocuments, fetchGoals]);

  // Handle Quick Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const res = await queryMindApi.uploadDocument(file, activeSpaceId);
        addDocument({
          name: res.filename || file.name,
          type: file.name.split(".").pop() || "txt",
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          chunks: res.chunks_created || 1,
          vectorsStored: res.vectors_stored || 1,
          summary: "Uploaded via Workspace Panel",
          spaceId: activeSpaceId,
        });
        await fetchDocuments();
      } catch (err: any) {
        console.warn("Failed to upload file:", err);
        setUploadError(err.message || "Upload failed");
      }
    }
    setIsUploading(false);
  };

  // Handle Goal Toggle
  const handleToggleGoal = async (goalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "in_progress" : "completed";
    // Optimistic update
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, status: nextStatus } : g))
    );
    try {
      await queryMindApi.updateGoal(goalId, { status: nextStatus });
    } catch (err) {
      console.warn("Failed to update goal:", err);
      // Revert on error
      fetchGoals();
    }
  };

  // Handle Add Goal
  const handleAddGoal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newGoalInput.trim() || isAddingGoal) return;
    setIsAddingGoal(true);
    try {
      const created = await queryMindApi.createGoal({
        description: newGoalInput.trim(),
      });
      setGoals((prev) => [created, ...prev]);
      setNewGoalInput("");
    } catch (err: any) {
      console.warn("Failed to create goal:", err);
      alert("Failed to create goal: " + (err.message || err));
    } finally {
      setIsAddingGoal(false);
    }
  };

  // Handle Delete Conversation
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await queryMindApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.warn("Failed to delete conversation:", err);
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    try {
      await queryMindApi.deleteDocument(docId);
      setDocsList((prev) => prev.filter((d) => d.id !== docId));
      removeDocument(docId);
    } catch (err) {
      console.warn("Failed to delete document:", err);
    }
  };

  // Handle Copy text
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered lists
  const filteredConversations = useMemo(() => {
    if (!chatSearch.trim()) return conversations;
    const q = chatSearch.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, chatSearch]);

  const filteredDocs = useMemo(() => {
    if (!docSearch.trim()) return docsList;
    const q = docSearch.toLowerCase();
    return docsList.filter((d) => (d.filename || "").toLowerCase().includes(q));
  }, [docsList, docSearch]);

  // Goal progress calculation
  const completedGoalsCount = useMemo(() => {
    return goals.filter((g) => g.status === "completed").length;
  }, [goals]);

  const goalProgressPercent = useMemo(() => {
    if (goals.length === 0) return 0;
    return Math.round((completedGoalsCount / goals.length) * 100);
  }, [goals.length, completedGoalsCount]);

  /* ─────────────────────────────────────────────────────────── */
  /* 1. COLLAPSED VIEW (Minimalist Dock)                         */
  /* ─────────────────────────────────────────────────────────── */
  if (isCollapsed) {
    return (
      <aside
        style={{
          width: "52px",
          height: "100vh",
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          gap: "14px",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => handleToggleCollapse(false)}
          title="Expand Workspace Essentials"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <PanelRightOpen style={{ width: "16px", height: "16px" }} />
        </button>

        <div style={{ width: "24px", height: "1px", background: "var(--border)" }} />

        {/* Chats icon & badge */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("chats");
            handleToggleCollapse(false);
          }}
          title={`Recent Chats (${conversations.length})`}
          style={{
            position: "relative",
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.background = "var(--surface)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <MessageSquare style={{ width: "16px", height: "16px" }} />
          {conversations.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "3px",
                right: "3px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--accent)",
              }}
            />
          )}
        </button>

        {/* Docs icon & badge */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("docs");
            handleToggleCollapse(false);
          }}
          title={`Documents in ${spaceName} (${docsList.length})`}
          style={{
            position: "relative",
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.background = "var(--surface)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <FileText style={{ width: "16px", height: "16px" }} />
          {docsList.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "3px",
                right: "3px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10B981",
              }}
            />
          )}
        </button>

        {/* Goals icon & badge */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("goals");
            handleToggleCollapse(false);
          }}
          title={`Goals & Tasks (${goals.length})`}
          style={{
            position: "relative",
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.background = "var(--surface)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Target style={{ width: "16px", height: "16px" }} />
          {goals.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "3px",
                right: "3px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#F59E0B",
              }}
            />
          )}
        </button>
      </aside>
    );
  }

  /* ─────────────────────────────────────────────────────────── */
  /* 2. EXPANDED VIEW: DOCUMENT INSPECTOR MODE (if item selected)*/
  /* ─────────────────────────────────────────────────────────── */
  if (selectedObject) {
    const rawContent = selectedObject.content || selectedObject.summary || "";
    const isCode =
      (selectedObject.type || "").toLowerCase().includes("code") ||
      rawContent.trim().startsWith("//") ||
      rawContent.includes("import ") ||
      rawContent.includes("function ");

    return (
      <aside
        className="app-context-panel"
        style={{
          width: "var(--context-w, 360px)",
          height: "100vh",
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          zIndex: 10,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setSelectedObject(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Back to Workspace Essentials"
            >
              <ChevronLeft style={{ width: "16px", height: "16px" }} />
            </button>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {selectedObject.title}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setSelectedObject(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                padding: "4px",
              }}
              title="Close Inspection"
            >
              <X style={{ width: "15px", height: "15px" }} />
            </button>
            <button
              type="button"
              onClick={() => handleToggleCollapse(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                padding: "4px",
              }}
              title="Collapse Panel"
            >
              <PanelRightClose style={{ width: "15px", height: "15px" }} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
          }}
        >
          {/* Metadata pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isCode ? <Code2 style={{ width: "14px", height: "14px", color: "var(--accent)" }} /> : <FileText style={{ width: "14px", height: "14px", color: "var(--accent)" }} />}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {selectedObject.type?.toUpperCase() || "DOCUMENT"}
              </span>
            </div>
            <span style={{ color: "var(--text-tertiary)" }}>
              {selectedObject.size || "Indexed"}
            </span>
          </div>

          {/* Action: Chat with this item */}
          <button
            type="button"
            onClick={() => {
              setSelectedObject(null);
              router.push(
                `/chat?q=${encodeURIComponent(`Analyze and summarize "${selectedObject.title}":\n${rawContent.slice(0, 300)}`)}`
              );
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "8px",
              background: "var(--accent)",
              color: "#FFFFFF",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Sparkles style={{ width: "14px", height: "14px" }} />
            <span>Chat With This Document</span>
          </button>

          {/* Source Snippet or Summary */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span>Content Extract</span>
              <button
                type="button"
                onClick={() => handleCopy(rawContent)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: copied ? "#10B981" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                }}
              >
                {copied ? (
                  <>
                    <Check style={{ width: "12px", height: "12px" }} />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy style={{ width: "12px", height: "12px" }} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div
              style={{
                padding: "14px",
                fontSize: "12.5px",
                lineHeight: "1.6",
                color: "var(--text-primary)",
                maxHeight: "360px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: isCode ? "var(--mono)" : "inherit",
              }}
            >
              {rawContent || "No plain text content available."}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  /* ─────────────────────────────────────────────────────────── */
  /* 3. EXPANDED VIEW: WORKSPACE ESSENTIALS                      */
  /* ─────────────────────────────────────────────────────────── */
  return (
    <aside
      className="app-context-panel"
      style={{
        width: "var(--context-w, 360px)",
        height: "100vh",
        background: "var(--bg)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
              fontSize: "12px",
              color: "var(--text-primary)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📁</span>
            <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {spaceName}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleToggleCollapse(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            borderRadius: "4px",
          }}
          title="Collapse Panel"
        >
          <PanelRightClose style={{ width: "16px", height: "16px" }} />
        </button>
      </div>

      {/* 2. Clean Navigation Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {[
          { id: "chats", label: "Chats", icon: MessageSquare, count: conversations.length },
          { id: "docs", label: "Docs", icon: FileText, count: docsList.length },
          { id: "goals", label: "Goals", icon: Target, count: goals.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: "10px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                background: "transparent",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              <Icon style={{ width: "13px", height: "13px" }} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 5px",
                    borderRadius: "8px",
                    background: isActive ? "var(--surface-hover)" : "transparent",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Panel Content Area */}
      <div
        style={{
          flex: 1,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          overflowY: "auto",
        }}
      >
        {/* ========================================================= */}
        {/* TAB 1: RECENT CHATS                                       */}
        {/* ========================================================= */}
        {activeTab === "chats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
            {/* Action: New Chat button */}
            <button
              type="button"
              onClick={() => router.push("/chat")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--surface)";
              }}
            >
              <Plus style={{ width: "14px", height: "14px" }} />
              <span>New Chat</span>
            </button>

            {/* Search Filter */}
            {conversations.length > 3 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <Search style={{ width: "12px", height: "12px", color: "var(--text-tertiary)" }} />
                <input
                  type="text"
                  placeholder="Filter chats..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    width: "100%",
                  }}
                />
              </div>
            )}

            {/* Chats List */}
            {isLoadingChats ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px", color: "var(--text-tertiary)" }}>
                <RefreshCw className="animate-spin" style={{ width: "16px", height: "16px" }} />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-tertiary)", fontSize: "12.5px" }}>
                <MessageSquare style={{ width: "24px", height: "24px", margin: "0 auto 8px", opacity: 0.4 }} />
                <div>No chats found in this space</div>
                <button
                  type="button"
                  onClick={() => router.push("/chat")}
                  style={{
                    marginTop: "10px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "11.5px",
                    cursor: "pointer",
                  }}
                >
                  Start First Conversation
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {filteredConversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/chat/${c.id}`)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      transition: "all 150ms ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                      e.currentTarget.style.background = "var(--surface-hover)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.title || "Chat Session"}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                        {formatRelativeTime(c.created_at)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      title="Delete chat"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-tertiary)",
                        padding: "4px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        opacity: 0.6,
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.color = "#EF4444";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = "0.6";
                        e.currentTarget.style.color = "var(--text-tertiary)";
                      }}
                    >
                      <Trash2 style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SPACE DOCUMENTS & UPLOAD                          */}
        {/* ========================================================= */}
        {activeTab === "docs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
            {/* Quick Upload Dropzone / Button */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                handleFileUpload(e.target.files);
                e.target.value = "";
              }}
              multiple
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "16px",
                borderRadius: "8px",
                border: "1px dashed var(--border-strong)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                cursor: isUploading ? "not-allowed" : "pointer",
                transition: "all 150ms ease",
              }}
              onMouseOver={(e) => {
                if (!isUploading) {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              {isUploading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                  <RefreshCw className="animate-spin" style={{ width: "14px", height: "14px", color: "var(--accent)" }} />
                  <span>Indexing document into Qdrant...</span>
                </div>
              ) : (
                <>
                  <Upload style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Upload to {spaceName}
                  </span>
                  <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>
                    PDF, TXT, MD, DOCX, Code files
                  </span>
                </>
              )}
            </button>

            {uploadError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#EF4444",
                  fontSize: "11.5px",
                }}
              >
                <AlertCircle style={{ width: "13px", height: "13px", flexShrink: 0 }} />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Search Filter */}
            {docsList.length > 3 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <Search style={{ width: "12px", height: "12px", color: "var(--text-tertiary)" }} />
                <input
                  type="text"
                  placeholder="Filter documents..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    width: "100%",
                  }}
                />
              </div>
            )}

            {/* Documents List */}
            {isLoadingDocs ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px", color: "var(--text-tertiary)" }}>
                <RefreshCw className="animate-spin" style={{ width: "16px", height: "16px" }} />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-tertiary)", fontSize: "12.5px" }}>
                <FileText style={{ width: "24px", height: "24px", margin: "0 auto 8px", opacity: 0.4 }} />
                <div>No documents in this space yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedObject({
                        id: doc.id,
                        title: doc.filename,
                        type: doc.filename?.split(".").pop() || "doc",
                        size: doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : "Document",
                        summary: doc.summary || "Indexed and vectorized for workspace search.",
                        spaceId: doc.space_id,
                      });
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      transition: "all 150ms ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                      e.currentTarget.style.background = "var(--surface-hover)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                      <FileText style={{ width: "14px", height: "14px", color: "var(--accent)", flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.filename}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                          {doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : "Ready"} • {formatRelativeTime(doc.created_at)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteDocument(e, doc.id)}
                      title="Delete document"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-tertiary)",
                        padding: "4px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        opacity: 0.6,
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.color = "#EF4444";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = "0.6";
                        e.currentTarget.style.color = "var(--text-tertiary)";
                      }}
                    >
                      <Trash2 style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GOALS & ACTIONABLE TASKS                           */}
        {/* ========================================================= */}
        {activeTab === "goals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
            {/* Progress Header */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                  Goal Completion
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {goalProgressPercent}%
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "5px",
                  borderRadius: "4px",
                  background: "var(--surface-hover)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${goalProgressPercent}%`,
                    height: "100%",
                    background: "var(--accent)",
                    transition: "width 300ms ease",
                  }}
                />
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px" }}>
                {completedGoalsCount} of {goals.length} goals achieved
              </div>
            </div>

            {/* Quick Add Goal Input */}
            <form onSubmit={handleAddGoal} style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                placeholder="Add new goal or task..."
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                disabled={isAddingGoal}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!newGoalInput.trim() || isAddingGoal}
                style={{
                  padding: "7px 12px",
                  borderRadius: "6px",
                  background: newGoalInput.trim() ? "var(--accent)" : "var(--surface-hover)",
                  color: newGoalInput.trim() ? "#FFFFFF" : "var(--text-tertiary)",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: newGoalInput.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Plus style={{ width: "13px", height: "13px" }} />
                <span>Add</span>
              </button>
            </form>

            {/* Goals List */}
            {isLoadingGoals ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px", color: "var(--text-tertiary)" }}>
                <RefreshCw className="animate-spin" style={{ width: "16px", height: "16px" }} />
              </div>
            ) : goals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-tertiary)", fontSize: "12.5px" }}>
                <Target style={{ width: "24px", height: "24px", margin: "0 auto 8px", opacity: 0.4 }} />
                <div>No active goals yet</div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>Add a task above to track your progress</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {goals.map((goal) => {
                  const isDone = goal.status === "completed";
                  return (
                    <div
                      key={goal.id}
                      onClick={() => handleToggleGoal(goal.id, goal.status)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: isDone ? "var(--surface-subtle)" : "var(--surface)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        transition: "all 150ms ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          color: isDone ? "#10B981" : "var(--text-tertiary)",
                          display: "flex",
                          alignItems: "center",
                          marginTop: "2px",
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 style={{ width: "15px", height: "15px" }} />
                        ) : (
                          <Circle style={{ width: "15px", height: "15px" }} />
                        )}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 500,
                            color: isDone ? "var(--text-tertiary)" : "var(--text-primary)",
                            textDecoration: isDone ? "line-through" : "none",
                            lineHeight: "1.4",
                            wordBreak: "break-word",
                          }}
                        >
                          {goal.description}
                        </div>
                        {goal.created_at && (
                          <div style={{ fontSize: "10px", color: "var(--text-ghost)", marginTop: "4px" }}>
                            Added {formatRelativeTime(goal.created_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
