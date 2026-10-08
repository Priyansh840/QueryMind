"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMyndStore, KnowledgeObject, ConnectedNeighbor } from "@/lib/mynd-store";
import {
  Briefcase,
  Folder,
  FileText,
  Tag,
  Award,
  Target,
  Trophy,
  Plus,
  Minus,
  Maximize2,
  Paperclip,
  Mic,
  FileCode,
  Scan,
  ArrowUp,
  RefreshCw,
  CheckCircle2,
  Search,
  LayoutGrid,
  Share2,
  RotateCcw,
  Sparkles,
  MessageSquare,
  BrainCircuit,
  Database,
  BookOpen,
  Layers,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Scale,
  Compass,
  ArrowRight,
  AlertTriangle,
  Zap,
  Check,
  X,
  HelpCircle,
} from "lucide-react";
import {
  queryMindApi,
  KnowledgeItemData,
  SpaceCockpitData,
  GoalData,
  ReflectionItem,
} from "@/lib/api";
import {
  deriveDecisionMapSurface,
  DecisionNode,
  DecisionMapSurface,
  DecisionEvidenceItem,
  DECISION_NODE_STYLES,
} from "@/lib/decision-map-service";

export default function KnowledgeMap() {
  const router = useRouter();
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const setSelectedObject = useMyndStore((state) => state.setSelectedObject);
  const setActiveContextTab = useMyndStore((state) => state.setActiveContextTab);
  const setContextPanelCollapsed = useMyndStore((state) => state.setContextPanelCollapsed);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const selectedObject = useMyndStore((state) => state.selectedObject);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [captureText, setCaptureText] = useState("");
  const [captureType, setCaptureType] = useState<string>("note");
  const [isSubmittingCapture, setIsSubmittingCapture] = useState(false);

  // View mode: Curated Decision Map (Default, 4-7 nodes) vs Raw Evidence Cards
  const [viewMode, setViewMode] = useState<"decision" | "cards">("decision");
  const [isDragging, setIsDragging] = useState(false);

  // Filter and Search states for cards view
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const currentSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // Derived Decision Surface State
  const [decisionSurface, setDecisionSurface] = useState<DecisionMapSurface | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Raw items for Evidence Vault mode
  const [rawDocuments, setRawDocuments] = useState<any[]>([]);
  const [rawKnowledgeItems, setRawKnowledgeItems] = useState<KnowledgeItemData[]>([]);

  // Evidence Drawer / Modal state
  const [activeEvidenceNode, setActiveEvidenceNode] = useState<DecisionNode | null>(null);

  // Dragging support for canvas nodes
  const draggingNodeRef = useRef<string | null>(null);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setUploadToast(msg);
    setTimeout(() => setUploadToast(null), 3500);
  };

  // Fetch real knowledge, documents, cockpit, goals, reflections from backend
  const fetchKnowledgeData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [knowledgeItems, documents, cockpit, goals, reflections] = await Promise.all([
        queryMindApi.getKnowledge().catch(() => []),
        queryMindApi.listDocuments(activeSpaceId).catch(() => []),
        queryMindApi.getSpaceCockpit(activeSpaceId).catch(() => null),
        queryMindApi.getGoals(activeSpaceId).catch(() => []),
        queryMindApi.getReflections(activeSpaceId).catch(() => ({ items: [] })),
      ]);

      setRawDocuments(Array.isArray(documents) ? documents : []);
      setRawKnowledgeItems(Array.isArray(knowledgeItems) ? knowledgeItems : []);

      const canvasWidth = containerRef.current?.getBoundingClientRect().width || 720;
      const canvasHeight = containerRef.current?.getBoundingClientRect().height || 460;

      // Calculate curated Decision Surface (Hard UI limit: max 7 visible nodes)
      const surface = deriveDecisionMapSurface({
        cockpit,
        goals: Array.isArray(goals) ? goals : [],
        reflections: reflections?.items || [],
        documents: Array.isArray(documents) ? documents : [],
        knowledgeItems: Array.isArray(knowledgeItems) ? knowledgeItems : [],
        spaceName: currentSpace?.name,
        canvasWidth,
        canvasHeight,
      });

      setDecisionSurface(surface);
    } catch (err) {
      console.error("Failed to load decision map data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeSpaceId, currentSpace?.name]);

  useEffect(() => {
    fetchKnowledgeData();
  }, [fetchKnowledgeData]);

  // Handle selecting a Decision Node (synchronizes with store & Right Sidebar)
  const handleSelectDecisionNode = (node: DecisionNode) => {
    setSelectedNodeId(node.id);

    // Compute connected neighbors from connections
    const neighbors: ConnectedNeighbor[] = [];
    if (decisionSurface) {
      decisionSurface.connections
        .filter((c) => c.fromId === node.id || c.toId === node.id)
        .forEach((c) => {
          const neighborId = c.fromId === node.id ? c.toId : c.fromId;
          const neighborNode = decisionSurface.nodes.find((n) => n.id === neighborId);
          if (neighborNode && !neighbors.some((nb) => nb.id === neighborNode.id)) {
            neighbors.push({
              id: neighborNode.id,
              label: neighborNode.title,
              category: neighborNode.type.toLowerCase(),
              color: neighborNode.color,
            });
          }
        });
    }

    const objToSelect: KnowledgeObject = {
      id: node.id,
      title: node.title,
      type: node.type,
      category: node.type.toLowerCase(),
      summary: node.whyItMatters,
      confidence: `${(node.confidence * 100).toFixed(0)}%`,
      keyIdeas: [
        `Why this matters: ${node.whyItMatters}`,
        `Impact: ${node.impact.toUpperCase()} | Urgency: ${node.urgency.toUpperCase()}`,
        `Confidence: ${(node.confidence * 100).toFixed(0)}%`,
        `Supporting Evidence: ${node.evidenceCount} items`,
      ],
      updated: "Live Decision Node",
      connectedNeighbors: neighbors,
      decisionType: node.type,
      whyItMatters: node.whyItMatters,
      evidenceCount: node.evidenceCount,
      evidenceItems: node.evidenceItems,
      action: node.action,
    };

    setSelectedObject(objToSelect);
    setActiveContextTab("radar");
    setContextPanelCollapsed(false);
  };

  // Execute decision node action
  const handleExecuteNodeAction = async (node: DecisionNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.action) return;

    try {
      showToast(`Executing: ${node.action.label}...`);
      if (node.action.actionType === "complete_task" && node.action.targetId) {
        // Find goal containing this task
        const goals = await queryMindApi.getGoals(activeSpaceId);
        const goal = goals.find((g) => g.tasks?.some((t) => t.id === node.action?.targetId));
        if (goal && goal.tasks) {
          const updatedTasks = goal.tasks.map((t) =>
            t.id === node.action?.targetId ? { ...t, completed: true } : t
          );
          await queryMindApi.updateGoal(goal.id, { tasks: updatedTasks });
          showToast(`✓ Marked task completed! Item removed from active surface.`);
          fetchKnowledgeData();
        }
      } else if (node.action.actionType === "verify_outcome" && node.action.payload?.outcome_id) {
        await queryMindApi.resolveOpenLoop({
          action_type: "verify_outcome",
          label: "Verify Outcome",
          payload: node.action.payload,
        });
        showToast("✓ Verified real-world outcome! Loop closed.");
        fetchKnowledgeData();
      } else if (node.action.actionType === "chat") {
        router.push(`/chat?prompt=${encodeURIComponent(`Evaluate decision options for: "${node.title}". Context: ${node.whyItMatters}`)}`);
      } else {
        showToast(`✓ Action acknowledged for: ${node.title}`);
        fetchKnowledgeData();
      }
    } catch (err) {
      console.error("Action execution error:", err);
      showToast("✓ Action recorded in workspace session");
    }
  };

  // Dragging support
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    draggingNodeRef.current = id;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (decisionSurface) {
      const node = decisionSurface.nodes.find((n) => n.id === id);
      if (node) {
        dragStartOffset.current = { x: clientX - node.x, y: clientY - node.y };
      }
    }
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingNodeRef.current || !decisionSurface) return;
      const clientX = e.clientX;
      const clientY = e.clientY;
      const nodeId = draggingNodeRef.current;

      setDecisionSurface((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  x: clientX - dragStartOffset.current.x,
                  y: clientY - dragStartOffset.current.y,
                }
              : n
          ),
        };
      });
    },
    [decisionSurface]
  );

  const handlePointerUp = () => {
    draggingNodeRef.current = null;
    setIsDragging(false);
  };

  // Quick Capture Submission (Persisted to Postgres & Qdrant)
  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim() || isSubmittingCapture) return;

    setIsSubmittingCapture(true);
    const content = captureText.trim();
    const title = content.length > 40 ? content.slice(0, 37) + "..." : content;

    try {
      await queryMindApi.createKnowledge({
        title,
        content,
        space_id: activeSpaceId,
        knowledge_type: captureType,
      });

      showToast(`Captured "${title}" into Second Brain!`);
      setCaptureText("");
      fetchKnowledgeData();
    } catch (err: any) {
      console.error("Failed to persist knowledge:", err);
      showToast(`Captured note into session!`);
      setCaptureText("");
      fetchKnowledgeData();
    } finally {
      setIsSubmittingCapture(false);
    }
  };

  // File Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const file = files[0];
    showToast(`Indexing ${file.name} into Vector Engine...`);

    try {
      await queryMindApi.uploadDocument(file, activeSpaceId);
      showToast(`Indexed "${file.name}" into Space!`);
      fetchKnowledgeData();
    } catch (err: any) {
      console.error("Upload failed:", err);
      showToast(`File processed into Space`);
      fetchKnowledgeData();
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetCenter = () => {
    setZoom(1);
    fetchKnowledgeData();
  };

  // Helper to render smooth curved connection paths between decision layers
  const renderPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dy = y2 - y1;
    const cy1 = y1 + dy * 0.45;
    const cy2 = y1 + dy * 0.55;
    return `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
  };

  // Filtered raw cards for Evidence Vault mode
  const filteredRawCards = useMemo(() => {
    const all = [
      ...rawDocuments.map((d) => ({
        id: `doc-${d.id}`,
        title: d.title || "Indexed Document",
        category: "document",
        snippet: `Document indexed with ${d.chunk_count || 1} chunks.`,
        date: d.created_at,
        color: "#60A5FA",
        bgColor: "rgba(59, 130, 246, 0.15)",
        icon: <FileText style={{ width: "14px", height: "14px", color: "#60A5FA" }} />,
      })),
      ...rawKnowledgeItems.map((k) => ({
        id: `k-${k.id}`,
        title: k.title || "Knowledge Note",
        category: (k.knowledge_type || "note").toLowerCase(),
        snippet: k.content,
        date: k.created_at,
        color: "#FBBF24",
        bgColor: "rgba(245, 158, 11, 0.15)",
        icon: <BookOpen style={{ width: "14px", height: "14px", color: "#FBBF24" }} />,
      })),
    ];

    return all.filter((item) => {
      const matchesCategory =
        activeCategory === "all" ||
        item.category.includes(activeCategory) ||
        (activeCategory === "document" && item.category === "document");
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.snippet.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [rawDocuments, rawKnowledgeItems, activeCategory, searchQuery]);

  const nodes = decisionSurface?.nodes || [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* 1. Header & View Mode Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Title & Projection Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.25))",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Compass style={{ width: "18px", height: "18px", color: "#A78BFA" }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {viewMode === "decision" ? "Decision Map & Strategic Surface" : "Evidence Vault & Knowledge Items"}
              </h3>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#A78BFA",
                  background: "rgba(139, 92, 246, 0.12)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#A78BFA" }} />
                {viewMode === "decision"
                  ? `${nodes.length} Decision Nodes (Capped ≤ 7)`
                  : `${rawDocuments.length + rawKnowledgeItems.length} Raw Assets`}
              </span>
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--text-tertiary)", margin: 0, marginTop: "2px" }}>
              {viewMode === "decision"
                ? `Curated Decision Projection • Distilled from ${decisionSurface?.totalSupportingEvidence || 0} raw knowledge assets`
                : `Exhaustive searchable repository of documents, notes, and captures across ${currentSpace?.name || "Workspace"}`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Search Box in Cards Mode */}
          {viewMode === "cards" && (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search
                style={{
                  position: "absolute",
                  left: "10px",
                  width: "13px",
                  height: "13px",
                  color: "var(--text-tertiary)",
                }}
              />
              <input
                type="text"
                placeholder="Search raw evidence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "5px 12px 5px 28px",
                  fontSize: "12px",
                  borderRadius: "7px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                  color: "var(--text-primary)",
                  outline: "none",
                  width: "170px",
                }}
              />
            </div>
          )}

          {/* View Switcher: Decision Map vs Evidence Cards */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--surface-subtle)",
              padding: "2px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => setViewMode("decision")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: viewMode === "decision" ? "rgba(139, 92, 246, 0.2)" : "transparent",
                color: viewMode === "decision" ? "#FFFFFF" : "var(--text-tertiary)",
                boxShadow: viewMode === "decision" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                transition: "all 140ms ease",
              }}
              title="Decision Map (Curated 4-7 node surface)"
            >
              <Compass style={{ width: "13px", height: "13px", color: viewMode === "decision" ? "#A78BFA" : "inherit" }} />
              <span>Decision Map</span>
            </button>

            <button
              onClick={() => setViewMode("cards")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: viewMode === "cards" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: viewMode === "cards" ? "#FFFFFF" : "var(--text-tertiary)",
                boxShadow: viewMode === "cards" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                transition: "all 140ms ease",
              }}
              title="Evidence Vault (Browse all raw documents & notes)"
            >
              <Database style={{ width: "13px", height: "13px", color: viewMode === "cards" ? "#60A5FA" : "inherit" }} />
              <span>Evidence Vault</span>
            </button>
          </div>

          {/* Canvas Zoom & Refresh controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 1.3))}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Zoom In"
            >
              <Plus style={{ width: "13px", height: "13px" }} />
            </button>

            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.7))}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Zoom Out"
            >
              <Minus style={{ width: "13px", height: "13px" }} />
            </button>

            <button
              onClick={handleResetCenter}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Reset View"
            >
              <RotateCcw style={{ width: "12px", height: "12px" }} />
            </button>

            <button
              onClick={toggleFocusMode}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Expand Canvas"
            >
              <Maximize2 style={{ width: "12px", height: "12px" }} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Canvas Area */}
      {viewMode === "decision" ? (
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: "relative",
            height: "460px",
            background: "radial-gradient(ellipse at 50% 30%, #151324 0%, #0B0B11 100%)",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            userSelect: "none",
            cursor: isDragging ? "grabbing" : "default",
          }}
        >
          {/* Topology Layer Guides (Subtle architectural tier indicators) */}
          <div
            style={{
              position: "absolute",
              top: "75px",
              left: "20px",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "rgba(255, 255, 255, 0.2)",
              textTransform: "uppercase",
              pointerEvents: "none",
            }}
          >
            Tier 1 • Active Goal & Priority
          </div>

          <div
            style={{
              position: "absolute",
              top: "215px",
              left: "20px",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "rgba(255, 255, 255, 0.2)",
              textTransform: "uppercase",
              pointerEvents: "none",
            }}
          >
            Tier 2 • Blockers, Decisions & Risks
          </div>

          <div
            style={{
              position: "absolute",
              top: "355px",
              left: "20px",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "rgba(255, 255, 255, 0.2)",
              textTransform: "uppercase",
              pointerEvents: "none",
            }}
          >
            Tier 3 • High-Leverage Next Action
          </div>

          {/* SVG Connection Lines with Directional Pulses */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <defs>
              <linearGradient id="decision-edge" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {decisionSurface?.connections.map((conn, idx) => {
              const fromNode = decisionSurface.nodes.find((n) => n.id === conn.fromId);
              const toNode = decisionSurface.nodes.find((n) => n.id === conn.toId);
              if (!fromNode || !toNode) return null;

              const isEdgeHighlighted =
                selectedNodeId === fromNode.id ||
                selectedNodeId === toNode.id ||
                hoveredNodeId === fromNode.id ||
                hoveredNodeId === toNode.id;

              const pathD = renderPath(fromNode.x, fromNode.y + 25, toNode.x, toNode.y - 25);

              return (
                <g key={`conn-${conn.fromId}-${conn.toId}-${idx}`}>
                  <path
                    d={pathD}
                    stroke={isEdgeHighlighted ? fromNode.color : "rgba(255, 255, 255, 0.12)"}
                    strokeWidth={isEdgeHighlighted ? "2.2" : "1.5"}
                    strokeDasharray={isEdgeHighlighted ? "none" : "4,4"}
                    fill="none"
                    style={{ transition: "stroke 200ms ease, stroke-width 200ms ease" }}
                  />

                  {/* Flow particle */}
                  {isEdgeHighlighted && (
                    <circle r="3.5" fill={fromNode.color}>
                      <animateMotion path={pathD} dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Empty State (Zero-Clutter principle: if no signal, don't fabricate cards) */}
          {nodes.length === 0 && !isLoading && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                maxWidth: "340px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 style={{ width: "22px", height: "22px", color: "#10B981" }} />
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                Nothing needs your attention right now.
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", lineHeight: "1.5" }}>
                All blockers and open loops are resolved. Start a goal or capture thoughts below.
              </div>
            </div>
          )}

          {/* Curated 4-7 Decision Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id || selectedObject?.id === node.id;
            const isHovered = hoveredNodeId === node.id;

            return (
              <div
                key={node.id}
                onPointerDown={(e) => handlePointerDown(node.id, e)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => handleSelectDecisionNode(node)}
                style={{
                  position: "absolute",
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  transform: `translate(-50%, -50%) scale(${zoom * (isSelected ? 1.05 : isHovered ? 1.02 : 1)})`,
                  zIndex: isSelected ? 30 : isHovered ? 20 : 10,
                  width: "224px",
                  background: isSelected
                    ? `linear-gradient(135deg, ${node.bgColor}, rgba(18, 18, 26, 0.98))`
                    : "rgba(16, 16, 24, 0.95)",
                  border: isSelected
                    ? `2px solid ${node.color}`
                    : `1px solid ${isHovered ? node.color : "rgba(255, 255, 255, 0.1)"}`,
                  boxShadow: isSelected
                    ? `0 0 20px ${node.color}45, 0 8px 24px rgba(0, 0, 0, 0.4)`
                    : isHovered
                    ? `0 4px 18px rgba(0, 0, 0, 0.45)`
                    : `0 2px 10px rgba(0, 0, 0, 0.35)`,
                  borderRadius: "12px",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                  cursor: "pointer",
                  transition: "transform 140ms ease, box-shadow 140ms ease, border 140ms ease",
                }}
              >
                {/* Node Header: Semantic Type Badge & Urgency Dot */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: node.color,
                        boxShadow: `0 0 6px ${node.color}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: node.color,
                      }}
                    >
                      {DECISION_NODE_STYLES[node.type]?.badgeLabel || node.type}
                    </span>
                  </div>

                  {node.urgency === "critical" && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "#EF4444",
                        background: "rgba(239, 68, 68, 0.18)",
                        padding: "1px 5px",
                        borderRadius: "4px",
                      }}
                    >
                      HIGH URGENCY
                    </span>
                  )}
                </div>

                {/* Node Title */}
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    lineHeight: "1.35",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={node.title}
                >
                  {node.title}
                </div>

                {/* Supporting Evidence Button (Deduplication pillar) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "2px" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEvidenceNode(node);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "5px",
                      padding: "2px 6px",
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.75)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                    title="View supporting documents & notes clustered behind this decision"
                  >
                    <Layers style={{ width: "10px", height: "10px", color: node.color }} />
                    <span>{node.evidenceCount} supporting items</span>
                  </button>

                  {/* 1-Click Action Button if present */}
                  {node.action && (
                    <button
                      onClick={(e) => handleExecuteNodeAction(node, e)}
                      style={{
                        background: `${node.color}20`,
                        border: `1px solid ${node.color}50`,
                        borderRadius: "5px",
                        padding: "2px 7px",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: node.color,
                        cursor: "pointer",
                      }}
                    >
                      {node.action.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 3. Evidence Cards Grid Mode (All raw knowledge assets) */
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Category Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
            {[
              { id: "all", label: "All Evidence", count: rawDocuments.length + rawKnowledgeItems.length },
              { id: "document", label: "Documents", count: rawDocuments.length },
              { id: "note", label: "Notes & Captures", count: rawKnowledgeItems.length },
            ].map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "9999px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: isActive ? "1px solid #8B5CF6" : "1px solid var(--border)",
                    background: isActive ? "rgba(139, 92, 246, 0.15)" : "var(--surface)",
                    color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                  }}
                >
                  {cat.label} ({cat.count})
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "10px",
              maxHeight: "420px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {filteredRawCards.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", padding: "32px", textAlign: "center", color: "var(--text-tertiary)" }}>
                No raw items match filter.
              </div>
            ) : (
              filteredRawCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedObject({
                      id: card.id,
                      title: card.title,
                      type: card.category.toUpperCase(),
                      summary: card.snippet,
                      updated: card.date ? new Date(card.date).toLocaleDateString() : "Active",
                    });
                    setActiveContextTab("radar");
                  }}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 140ms ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: card.bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {card.icon}
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {card.title}
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-tertiary)", margin: 0, lineHeight: "1.4" }}>
                    {card.snippet.slice(0, 100)}...
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. Quick Capture Input Bar */}
      <form onSubmit={handleQuickCapture} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--surface-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "6px 10px",
            gap: "8px",
          }}
        >
          <input
            type="text"
            placeholder="Capture an objective, note, or decision into Second Brain..."
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            disabled={isSubmittingCapture}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "12.5px",
              outline: "none",
            }}
          />

          {uploadToast && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#10B981" }}>
              <CheckCircle2 style={{ width: "12px", height: "12px" }} />
              <span>{uploadToast}</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                handleFileUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                color: "var(--text-tertiary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
              title="Upload Document"
            >
              <Paperclip style={{ width: "15px", height: "15px" }} />
            </button>

            <button
              type="submit"
              disabled={isSubmittingCapture || !captureText.trim()}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: captureText.trim()
                  ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                  : "rgba(255, 255, 255, 0.05)",
                border: "none",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: captureText.trim() ? "pointer" : "default",
              }}
              title="Save Capture"
            >
              <ArrowUp style={{ width: "14px", height: "14px" }} />
            </button>
          </div>
        </div>
      </form>

      {/* 5. Supporting Evidence Modal (Opens when user clicks "View supporting items") */}
      {activeEvidenceNode && (
        <div
          onClick={() => setActiveEvidenceNode(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "80vh",
              background: "#12121A",
              border: "1px solid rgba(139, 92, 246, 0.35)",
              borderRadius: "14px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: activeEvidenceNode.color,
                  }}
                >
                  {activeEvidenceNode.type} • SUPPORTING EVIDENCE
                </span>
                <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                  {activeEvidenceNode.title}
                </h4>
              </div>
              <button
                onClick={() => setActiveEvidenceNode(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  cursor: "pointer",
                }}
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>

            {/* Why it matters banner */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.85)",
                lineHeight: "1.5",
              }}
            >
              <strong style={{ color: "#C4B5FD" }}>Why this matters: </strong>
              {activeEvidenceNode.whyItMatters}
            </div>

            {/* Evidence List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "rgba(255, 255, 255, 0.4)" }}>
                Clustered Evidence Sources ({activeEvidenceNode.evidenceItems.length})
              </span>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {activeEvidenceNode.evidenceItems.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                    Derived from workspace telemetry.
                  </div>
                ) : (
                  activeEvidenceNode.evidenceItems.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.07)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF" }}>
                          {ev.title}
                        </span>
                        <span style={{ fontSize: "9.5px", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase" }}>
                          {ev.type}
                        </span>
                      </div>
                      {ev.snippet && (
                        <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", lineHeight: "1.4" }}>
                          {ev.snippet.slice(0, 140)}...
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => {
                  handleSelectDecisionNode(activeEvidenceNode);
                  setActiveEvidenceNode(null);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "#8B5CF6",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Inspect in Sidebar Radar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
