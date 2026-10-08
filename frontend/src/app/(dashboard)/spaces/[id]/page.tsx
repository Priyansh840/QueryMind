"use client";

import React, { use, useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";
import {
  queryMindApi,
  SpaceCockpitData,
  CockpitAction,
  OpenLoopItem,
} from "@/lib/api";
import {
  Brain,
  Sparkles,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Layers,
  Link2,
  UploadCloud,
  Check,
  RefreshCw,
  Trash2,
  FolderOpen,
  TrendingUp,
  X,
  Compass,
  Zap,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function SpaceCockpitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.id;
  const router = useRouter();

  const spaces = useMyndStore((state) => state.spaces);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const deleteSpace = useMyndStore((state) => state.deleteSpace);
  const openAskAi = useMyndStore((state) => state.openAskAi);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cockpit state
  const [cockpit, setCockpit] = useState<SpaceCockpitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Vault drawer state
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<any[]>([]);

  // Space Intelligence Briefing State
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

  // Space Copilot Chat State
  const [copilotMessages, setCopilotMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; citations?: string[] }>>([
    {
      id: "initial-copilot",
      role: "assistant",
      content: "Welcome to your Space Copilot. I am strictly grounded in this workspace's documents, milestones, and active knowledge. Ask me anything or explore key topics.",
    },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [isCopilotStreaming, setIsCopilotStreaming] = useState(false);
  const copilotEndRef = useRef<HTMLDivElement | null>(null);

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

  const handleSendCopilotMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || copilotInput;
    if (!promptToSend.trim() || isCopilotStreaming || !space?.id) return;

    const userMsgId = `user-${Date.now()}`;
    const newMsgs = [...copilotMessages, { id: userMsgId, role: "user" as const, content: promptToSend.trim() }];
    setCopilotMessages(newMsgs);
    setCopilotInput("");
    setIsCopilotStreaming(true);

    const assistantMsgId = `assistant-${Date.now()}`;
    try {
      // Direct call to orchestrator chat with hard space_id bound
      const res = await (await import("@/lib/api")).default.post("/chat", {
        query: promptToSend.trim(),
        space_id: space.id,
      });

      setCopilotMessages([
        ...newMsgs,
        {
          id: assistantMsgId,
          role: "assistant",
          content: res.data?.answer || "No response received.",
          citations: res.data?.citations || [],
        },
      ]);
    } catch (err: any) {
      console.error("Space copilot chat failed:", err);
      setCopilotMessages([
        ...newMsgs,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "Sorry, I encountered an issue retrieving workspace knowledge. Please try again.",
        },
      ]);
    } finally {
      setIsCopilotStreaming(false);
      setTimeout(() => {
        copilotEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Find space or fallback to first space
  const space = useMemo(() => {
    return (
      spaces.find(
        (s) =>
          s.id === spaceId ||
          s.slug === spaceId ||
          s.name.toLowerCase() === spaceId.toLowerCase()
      ) || spaces[0]
    );
  }, [spaces, spaceId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Mark space as active
  useEffect(() => {
    if (space?.id) {
      selectSpace(space.id);
    }
  }, [space?.id, selectSpace]);

  // Load Cockpit Intelligence Data from Backend
  const loadCockpit = useCallback(
    async (showLoadingSpinner = true) => {
      const targetId = space?.id || spaceId;
      if (!targetId) return;

      if (showLoadingSpinner) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const data = await queryMindApi.getSpaceCockpit(targetId);
        setCockpit(data);
      } catch (err) {
        console.warn("Could not load space cockpit:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [space?.id, spaceId]
  );

  // Load Vault Docs
  const loadVaultDocs = useCallback(async () => {
    const targetId = space?.id || spaceId;
    if (!targetId) return;
    try {
      const docs = await queryMindApi.listDocuments(targetId);
      if (Array.isArray(docs)) setVaultDocs(docs);
    } catch (err) {
      console.warn("Could not load vault documents:", err);
    }
  }, [space?.id, spaceId]);

  useEffect(() => {
    loadCockpit(true);
    loadVaultDocs();
  }, [loadCockpit, loadVaultDocs]);

  // Execute or Resolve Open Loop / Recommended Move
  const handleExecuteAction = async (action: CockpitAction, loopId?: string) => {
    const actionKey = loopId || action.action_type;
    setActionInProgress(actionKey);

    try {
      if (action.action_type === "approve_proposal" && action.target_id) {
        await queryMindApi.approveAction(action.target_id);
        showToast("✓ Proposal approved and executed successfully.");
      } else if (action.action_type === "complete_task" && action.payload?.goal_id && action.payload?.task_id) {
        await queryMindApi.resolveOpenLoop(action);
        showToast("✓ Task marked as completed.");
      } else if (action.action_type === "verify_outcome" && action.payload?.outcome_id) {
        await queryMindApi.resolveOpenLoop(action);
        showToast("✓ Real-world outcome validated.");
      } else if (action.action_type === "upload_document") {
        fileInputRef.current?.click();
        setActionInProgress(null);
        return;
      } else if (action.action_type === "create_goal") {
        router.push(`/goals?space_id=${space?.id || spaceId}`);
        setActionInProgress(null);
        return;
      } else if (action.action_type === "link_knowledge") {
        openAskAi(`How does ${action.target_id || "this document"} link to our active goals?`);
        setActionInProgress(null);
        return;
      } else if (action.action_type === "generate_tasks" && action.target_id) {
        router.push(`/goals?goal_id=${action.target_id}`);
        setActionInProgress(null);
        return;
      }

      // Optimistically update local open loops if an open loop was resolved
      if (loopId && cockpit) {
        setCockpit((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            open_loops: prev.open_loops.filter((item) => item.id !== loopId),
          };
        });
      }

      // Refresh full cockpit in background
      loadCockpit(false);
    } catch (err) {
      console.error("Action execution failed:", err);
      showToast("⚠️ Failed to execute action. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Upload Document Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !space) return;

    setIsUploading(true);
    showToast(`Indexing ${files[0].name} into Qdrant vectors...`);

    try {
      await queryMindApi.uploadDocument(files[0], space.id);
      showToast(`✓ "${files[0].name}" indexed. Analyzing cross-document connections...`);
      await loadVaultDocs();
      await loadCockpit(false);
    } catch (err) {
      console.error("Upload failed:", err);
      showToast("⚠️ Document upload failed. Please verify server connectivity.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete Document
  const handleDeleteDoc = async (docId: string) => {
    try {
      await queryMindApi.deleteDocument(docId);
      setVaultDocs((prev) => prev.filter((d) => d.id !== docId));
      showToast("Document removed from workspace.");
      loadCockpit(false);
    } catch (err) {
      console.warn("Delete document error:", err);
    }
  };

  // Empty or invalid space fallback
  if (!space) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "20px", color: "var(--text-primary)" }}>Space Not Found</h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
          The requested domain workspace does not exist or was deleted.
        </p>
        <Link
          href="/spaces"
          style={{
            display: "inline-block",
            marginTop: "16px",
            padding: "8px 18px",
            borderRadius: "8px",
            background: "#FFFFFF",
            color: "#000000",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Return to Spaces Gallery
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        paddingBottom: "80px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "10px",
            background: "#18181b",
            color: "#FFFFFF",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span className="alive-dot" style={{ background: "#10B981" }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: "none" }}
        accept=".pdf,.txt,.md,.doc,.docx,.json,.csv,.py,.ts,.tsx"
      />

      {/* ===================================================================== */}
      {/* 🚀 COCKPIT HEADER: Domain Intelligence & Synchronized Telemetry        */}
      {/* ===================================================================== */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.005) 50%, var(--surface) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px 28px",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Subtle Ambient Light Strip */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, #10B981 0%, #38BDF8 50%, transparent 100%)",
          }}
        />

        {/* Breadcrumb Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "12px" }}>
          <Link href="/dashboard" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/spaces" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Spaces</Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{space.name}</span>
        </div>

        {/* Space Title & Cockpit HUD */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10B981",
                  boxShadow: "0 0 8px #10B981",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10B981" }}>
                Active Intelligence Cockpit
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>•</span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                {cockpit?.open_loops.length || 0} Open Loops
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>•</span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                {cockpit?.connections.length || 0} Semantic Connections
              </span>
            </div>

            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {space.name}
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "6px", maxWidth: "720px", fontSize: "13.5px", lineHeight: "1.5" }}>
              {space.desc || "Active cognitive workspace synthesizing domain memory, goals, and multi-agent execution."}
            </p>
          </div>

          {/* Cockpit Header Actions */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => loadCockpit(false)}
              disabled={isRefreshing}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: isRefreshing ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              title="Re-synchronize intelligence state"
            >
              <RefreshCw style={{ width: "13px", height: "13px", animation: isRefreshing ? "spin 1s infinite linear" : "none" }} />
              <span>{isRefreshing ? "Syncing..." : "Sync"}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: isUploading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <UploadCloud style={{ width: "14px", height: "14px", color: "#38BDF8" }} />
              <span>{isUploading ? "Indexing..." : "Upload Resource"}</span>
            </button>

            <button
              onClick={() => setIsVaultOpen(true)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FolderOpen style={{ width: "14px", height: "14px", color: "var(--text-secondary)" }} />
              <span>Vault ({vaultDocs.length})</span>
            </button>

            <button
              onClick={() => openAskAi(`${space.name} Space`)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 10px rgba(255, 255, 255, 0.15)",
              }}
            >
              <Sparkles style={{ width: "13px", height: "13px" }} />
              <span>Ask MYND</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to delete space "${space.name}"? This action cannot be undone.`)) {
                  deleteSpace(space.id);
                  queryMindApi.deleteSpace(space.id).catch((err) => console.warn("Delete space warning:", err));
                  router.push("/spaces");
                }
              }}
              title="Delete Space"
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                background: "rgba(239, 68, 68, 0.05)",
                color: "#F87171",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Trash2 style={{ width: "13px", height: "13px" }} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>
          <RefreshCw style={{ width: "24px", height: "24px", animation: "spin 1s infinite linear", margin: "0 auto 12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Synthesizing Active Intelligence Cockpit...</div>
          <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            Correlating goals, uncompleted loops, reflections, and document connections.
          </div>
        </div>
      ) : (
        <>
          {/* ================================================================= */}
          {/* LAYER 1: RIGHT NOW (The Single Most Important Development)        */}
          {/* ================================================================= */}
          {cockpit?.right_now && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(24, 24, 27, 0.95) 40%, var(--surface) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderRadius: "14px",
                padding: "24px",
                boxShadow: "0 4px 20px rgba(16, 185, 129, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      padding: "4px 9px",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.2)",
                      color: "#10B981",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Zap style={{ width: "12px", height: "12px" }} />
                    <span>RIGHT NOW • {cockpit.right_now.urgency.toUpperCase()} PRIORITY</span>
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                    Source: {cockpit.right_now.source_context}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                <span className="alive-dot" style={{ background: "#10B981" }} />
              <div>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {cockpit.right_now.headline}
                </h2>
                <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "14px", lineHeight: "1.55" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Why this matters: </strong>
                  {cockpit.right_now.why_it_matters}
                </p>
              </div>

              {/* Supporting Evidence Chips */}
              {cockpit.right_now.evidence && cockpit.right_now.evidence.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-tertiary)" }}>
                    Supporting Evidence:
                  </span>
                  {cockpit.right_now.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        fontSize: "12px",
                        color: "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FileText style={{ width: "12px", height: "12px", color: "#38BDF8" }} />
                      <span>{ev.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <div style={{ paddingTop: "6px" }}>
                <button
                  onClick={() => handleExecuteAction(cockpit.right_now!.recommended_action, "right-now")}
                  disabled={actionInProgress === "right-now"}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#FFFFFF",
                    color: "#000000",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: actionInProgress === "right-now" ? "default" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 2px 8px rgba(255, 255, 255, 0.2)",
                  }}
                >
                  {actionInProgress === "right-now" ? (
                    <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 1s infinite linear" }} />
                  ) : (
                    <ArrowRight style={{ width: "14px", height: "14px" }} />
                  )}
                  <span>{cockpit.right_now.recommended_action.label}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TWO-COLUMN INTELLIGENCE SECTION: NEXT BEST MOVE + OPEN LOOPS      */}
          {/* ================================================================= */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            {/* LAYER 4: NEXT BEST MOVE */}
            {cockpit?.next_best_move && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Compass style={{ width: "14px", height: "14px", color: "#38BDF8" }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#38BDF8" }}>
                      NEXT BEST MOVE
                    </span>
                  </div>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    {cockpit.next_best_move.headline}
                  </h3>
                  <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "13px", lineHeight: "1.5" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Why MYND recommends this: </strong>
                    {cockpit.next_best_move.why_mynd_recommends}
                  </p>
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#10B981", fontWeight: 500 }}>
                    ⚡ Expected Impact: {cockpit.next_best_move.expected_impact}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleExecuteAction(cockpit.next_best_move!.action, "nbm")}
                    disabled={actionInProgress === "nbm"}
                    style={{
                      width: "100%",
                      padding: "9px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "rgba(255, 255, 255, 0.06)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: actionInProgress === "nbm" ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {actionInProgress === "nbm" ? (
                      <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 1s infinite linear" }} />
                    ) : (
                      <Check style={{ width: "14px", height: "14px", color: "#10B981" }} />
                    )}
                    <span>{cockpit.next_best_move.action.label}</span>
                  </button>
                </div>
              </div>
            )}

            {/* LAYER 3: OPEN LOOPS */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock style={{ width: "14px", height: "14px", color: "#F59E0B" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
                    OPEN LOOPS ({cockpit?.open_loops.length || 0})
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Unfinished tasks & decisions
                </span>
              </div>

              {(!cockpit?.open_loops || cockpit.open_loops.length === 0) ? (
                <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                  ✓ All loops closed! No unfinished tasks, unapproved proposals, or unverified outcomes.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                  {cockpit.open_loops.slice(0, 6).map((loop) => (
                    <div
                      key={loop.id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              background: loop.importance === "high" ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.06)",
                              color: loop.importance === "high" ? "#F87171" : "var(--text-secondary)",
                            }}
                          >
                            {loop.importance}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{loop.age_formatted}</span>
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            marginTop: "3px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {loop.title}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {loop.context}
                        </div>
                      </div>

                      <button
                        onClick={() => handleExecuteAction(loop.action, loop.id)}
                        disabled={actionInProgress === loop.id}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          background: "var(--surface-hover)",
                          color: "var(--text-primary)",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          cursor: actionInProgress === loop.id ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        {actionInProgress === loop.id ? (
                          <RefreshCw style={{ width: "11px", height: "11px", animation: "spin 1s infinite linear" }} />
                        ) : (
                          <Check style={{ width: "11px", height: "11px" }} />
                        )}
                        <span>{loop.action.label}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* LAYER 2: MYND NOTICED (Patterns, Contradictions, Shifts)          */}
          {/* ================================================================= */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Brain style={{ width: "16px", height: "16px", color: "#38BDF8" }} />
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  MYND Noticed
                </h3>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                Patterns, tensions, and shifts detected across documents & sessions
              </span>
            </div>

            {(!cockpit?.mynd_noticed || cockpit.mynd_noticed.length === 0) ? (
              <div
                style={{
                  padding: "32px",
                  borderRadius: "12px",
                  border: "1px dashed var(--border)",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                }}
              >
                No recurring patterns or contradictions detected yet. As you interact and upload resources, MYND surfaces findings here.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                {cockpit.mynd_noticed.map((notice) => (
                  <div
                    key={notice.id}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background:
                              notice.type === "contradiction"
                                ? "rgba(239, 68, 68, 0.15)"
                                : notice.type === "repeated_topic"
                                ? "rgba(56, 189, 248, 0.15)"
                                : "rgba(16, 185, 129, 0.15)",
                            color:
                              notice.type === "contradiction"
                                ? "#F87171"
                                : notice.type === "repeated_topic"
                                ? "#38BDF8"
                                : "#10B981",
                          }}
                        >
                          {notice.type.replace("_", " ")}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                          {Math.round(notice.confidence * 100)}% Confidence
                        </span>
                      </div>

                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", lineHeight: "1.35" }}>
                        {notice.title}
                      </div>

                      <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: "1.45" }}>
                        {notice.observation}
                      </p>

                      <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", marginTop: "6px" }}>
                        <strong style={{ color: "var(--text-secondary)" }}>Why it matters: </strong>
                        {notice.why_it_matters}
                      </div>
                    </div>

                    {notice.evidence && notice.evidence.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                        {notice.evidence.map((ev, eIdx) => (
                          <span key={eIdx} style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                            📎 {ev.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* LAYER 5 & 6: KNOWLEDGE GAPS & DISCOVERED CONNECTIONS             */}
          {/* ================================================================= */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            {/* LAYER 5: KNOWLEDGE GAPS */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldAlert style={{ width: "15px", height: "15px", color: "#F59E0B", flexShrink: 0 }} />
                  <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Knowledge Gaps & Blind Spots
                  </h3>
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Incomplete domain context
                </span>
              </div>

              {(!cockpit?.knowledge_gaps || cockpit.knowledge_gaps.length === 0) ? (
                <div style={{ padding: "26px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12.5px" }}>
                  ✓ No isolated resources or blank goal dependencies detected.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {cockpit.knowledge_gaps.map((gap) => (
                    <div
                      key={gap.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {gap.known_concept}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          ➔ {gap.missing_relationship}
                        </div>
                      </div>

                      <button
                        onClick={() => handleExecuteAction(gap.suggested_action, gap.id)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          background: "var(--surface-hover)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {gap.suggested_action.label}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LAYER 6: CONNECTIONS (Meaningful Relationships) */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Link2 style={{ width: "15px", height: "15px", color: "#10B981", flexShrink: 0 }} />
                  <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Discovered Connections
                  </h3>
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Semantic links & reasoning
                </span>
              </div>

              {(!cockpit?.connections || cockpit.connections.length === 0) ? (
                <div style={{ padding: "26px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12.5px" }}>
                  No connections recorded yet. Upload related documents or chat with MYND to trigger relationship mapping.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
                  {cockpit.connections.slice(0, 5).map((conn) => (
                    <div
                      key={conn.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{conn.source_title}</span>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#10B981",
                            fontSize: "10.5px",
                            fontWeight: 700,
                          }}
                        >
                          {conn.relation}
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{conn.target_title}</span>
                      </div>

                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                        <strong style={{ color: "var(--text-primary)" }}>Why this matters: </strong>
                        {conn.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* LAYER 7: INTELLIGENCE TIMELINE                                    */}
          {/* ================================================================= */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingUp style={{ width: "16px", height: "16px", color: "var(--text-secondary)" }} />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Intelligence Timeline
                </h3>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                Meaningful state changes & cognitive discoveries
              </span>
            </div>

            {(!cockpit?.timeline || cockpit.timeline.length === 0) ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12.5px" }}>
                No events recorded yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {cockpit.timeline.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.015)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: "4px",
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "#FFFFFF",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      {event.badge_label}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {event.detail}
                      </div>
                    </div>

                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", flexShrink: 0 }}>
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* VAULT & DOCUMENTS DRAWER / MODAL (Accessible on-demand)              */}
      {/* ===================================================================== */}
      {isVaultOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={() => setIsVaultOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              height: "100%",
              background: "#121216",
              borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                  Space Document Vault
                </h3>
                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", margin: "4px 0 0 0" }}>
                  Empirical resources indexed into Qdrant vectors for {space.name}.
                </p>
              </div>
              <button
                onClick={() => setIsVaultOpen(false)}
                style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.6)", cursor: "pointer" }}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            {/* Quick Upload Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                padding: "24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              <UploadCloud style={{ width: "28px", height: "28px", color: "#38BDF8", margin: "0 auto 8px" }} />
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                Upload New Document
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginTop: "2px" }}>
                PDF, Markdown, TXT, DOCX, Code. Auto-chunked & vectorized.
              </div>
            </div>

            {/* Documents List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
              {vaultDocs.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "rgba(255, 255, 255, 0.4)", fontSize: "13px" }}>
                  No documents in this space vault yet.
                </div>
              ) : (
                vaultDocs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <FileText style={{ width: "16px", height: "16px", color: "#38BDF8", flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#FFFFFF",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginTop: "2px" }}>
                          {doc.type} • {doc.chunks_count || 1} chunks • {doc.status}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      title="Delete document"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(239, 68, 68, 0.7)",
                        cursor: "pointer",
                        padding: "6px",
                      }}
                    >
                      <Trash2 style={{ width: "13px", height: "13px" }} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: KNOWLEDGE MAP */}
      {activeSpaceTab === "map" && (
        <div style={{ height: "650px", borderRadius: "14px", overflow: "hidden" }}>
          <KnowledgeMap />
        </div>
      )}

      {/* Tab: SPACE COPILOT (In-Situ Chat Scoped to Space) */}
      {activeSpaceTab === "copilot" && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            display: "flex",
            flexDirection: "column",
            height: "650px",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Copilot Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#10B981",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
                }}
              />
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {space.name} Resident Copilot
                </h3>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  Grounded strictly in {spaceObjects.length} documents & milestones
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCopilotMessages([
                  {
                    id: "reset",
                    role: "assistant",
                    content: `Reset complete. How can I assist you with **${space.name}**?`,
                  }
                ])}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Clear History
              </button>
            </div>
          </div>

          {/* Copilot Messages Scroll Container */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
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
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: msg.role === "user" ? "#FFFFFF" : "var(--surface-hover)",
                    color: msg.role === "user" ? "#000000" : "var(--text-primary)",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    border: msg.role === "user" ? "none" : "1px solid var(--border)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {msg.citations.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "var(--text-tertiary)",
                          border: "1px solid var(--border)",
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
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "var(--surface-hover)",
                  fontSize: "12px",
                  color: "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span className="alive-dot" style={{ background: "#FFFFFF" }} />
                <span>Searching {space.name} vector memory...</span>
              </div>
            )}
            <div ref={copilotEndRef} />
          </div>

          {/* Quick Starter Pills */}
          <div
            style={{
              padding: "8px 16px",
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              borderTop: "1px solid var(--border)",
              background: "rgba(0,0,0,0.1)",
            }}
          >
            {[
              `Summarize key concepts in ${space.name}`,
              "What milestones should I tackle next?",
              "Generate a quick quiz on these documents",
            ].map((pill, i) => (
              <button
                key={i}
                onClick={() => handleSendCopilotMessage(undefined, pill)}
                disabled={isCopilotStreaming}
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-secondary)",
                  fontSize: "11px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                💡 {pill}
              </button>
            ))}
          </div>

          {/* Copilot Input Box */}
          <form
            onSubmit={handleSendCopilotMessage}
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "10px",
              background: "var(--surface)",
            }}
          >
            <input
              type="text"
              placeholder={`Ask anything about ${space.name}...`}
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              disabled={isCopilotStreaming}
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
            <button
              type="submit"
              disabled={!copilotInput.trim() || isCopilotStreaming}
              style={{
                padding: "0 18px",
                borderRadius: "8px",
                border: "none",
                background: copilotInput.trim() && !isCopilotStreaming ? "#FFFFFF" : "var(--surface-hover)",
                color: copilotInput.trim() && !isCopilotStreaming ? "#000000" : "var(--text-tertiary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: copilotInput.trim() && !isCopilotStreaming ? "pointer" : "default",
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Tab: INTELLIGENCE BRIEFING (Option 3 Synthesis) */}
      {activeSpaceTab === "briefing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Briefing Trigger Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, var(--surface) 100%)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {space.name} Intelligence Synthesis
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "6px 0 0 0", maxWidth: "600px" }}>
                Generates a multi-angle executive digest synthesizing all {spaceObjects.length} documents, active milestones, and past conversations in this workspace.
              </p>
            </div>
            <button
              onClick={fetchBriefing}
              disabled={isLoadingBriefing}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isLoadingBriefing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {isLoadingBriefing ? (
                <>
                  <span className="alive-dot" style={{ background: "#000000" }} />
                  <span>Synthesizing Domain...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>{briefing ? "Regenerate Briefing" : "Generate Briefing"}</span>
                </>
              )}
            </button>
          </div>

          {/* Briefing Output Cards */}
          {briefing && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Executive Summary Card */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10B981", marginBottom: "8px" }}>
                  Executive Summary
                </div>
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-primary)", margin: 0 }}>
                  {briefing.executive_summary}
                </p>
              </div>

              {/* 2-Column Grid: Key Takeaways & Active Priorities */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    💡 Core Themes & Takeaways
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {briefing.key_takeaways.map((item, idx) => (
                      <li key={idx} style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    🎯 Active Priorities
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {briefing.active_priorities.map((item, idx) => (
                      <li key={idx} style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 2-Column Grid: Knowledge Gaps & Recommended Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#EF4444", marginBottom: "12px" }}>
                    ⚠️ Knowledge Gaps & Blind Spots
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {briefing.knowledge_gaps.map((item, idx) => (
                      <li key={idx} style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3B82F6", marginBottom: "12px" }}>
                    🚀 Recommended Actions
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {briefing.recommended_actions.map((item, idx) => (
                      <li key={idx} style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: STUDIO & SCRATCHPAD */}
      {activeSpaceTab === "notes" && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {space.name} Studio Scratchpad
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                Markdown drafting area scoped to this domain. Changes persist across sessions.
              </p>
            </div>
            <button
              onClick={() => {
                if (space.scratchpad) {
                  addCapturedItem(space.scratchpad, space.id);
                }
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--surface-hover)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Export as Knowledge Object
            </button>
          </div>

          <textarea
            rows={14}
            value={space.scratchpad || ""}
            onChange={(e) => updateSpaceScratchpad(space.id, e.target.value)}
            placeholder={`Draft thoughts, lecture notes, or technical specs for ${space.name}...`}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface-subtle)",
              color: "var(--text-primary)",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              lineHeight: "1.6",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>
      )}
    </div>
  );
}
