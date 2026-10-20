"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Download,
  RefreshCw,
  GitCompare,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  Network,
  ShieldCheck,
  Search,
  FileCode,
  FileSpreadsheet,
  ArrowRight,
  Maximize2,
  Minimize2,
  Target,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import { queryMindApi, downloadBlob } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import DecisionTopologyMap from "@/components/graph/DecisionTopologyMap";

function getFormatCategory(typeOrTitle: string): "pdf" | "markdown" | "document" | "data" | "code" | "other" {
  const ext = (typeOrTitle || "").toLowerCase().split(".").pop() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["md", "markdown", "txt", "rtf"].includes(ext)) return "markdown";
  if (["doc", "docx", "odt", "pages"].includes(ext)) return "document";
  if (["csv", "tsv", "xlsx", "xls", "json"].includes(ext)) return "data";
  if (["js", "ts", "tsx", "jsx", "py", "sql", "html", "css", "yaml", "yml"].includes(ext)) return "code";
  return "other";
}

function renderFormatIcon(category: string, size = 16) {
  switch (category) {
    case "pdf":
      return <FileText size={size} color="#F87171" />;
    case "markdown":
      return <FileText size={size} color="#60A5FA" />;
    case "document":
      return <FileText size={size} color="#818CF8" />;
    case "code":
      return <FileCode size={size} color="#34D399" />;
    case "data":
      return <FileSpreadsheet size={size} color="#FBBF24" />;
    default:
      return <FileText size={size} color="#9CA3AF" />;
  }
}

const PRESET_QUERIES = [
  {
    label: "Contradiction & Risk Audit",
    icon: "⚡",
    query: "Identify all conflicting statements, opposing security requirements, and incompatible architectural assumptions across these documents.",
    focus: ["contradictions", "patterns"],
  },
  {
    label: "Evolutionary Trajectory",
    icon: "📈",
    query: "Trace how concepts, technical frameworks, and design decisions evolved or drifted across these documents over time.",
    focus: ["trends", "patterns"],
  },
  {
    label: "Architecture & Trade-Offs Matrix",
    icon: "🏛️",
    query: "Synthesize core architectural decisions, performance trade-offs, and methodology differences across these documents.",
    focus: ["patterns", "recommendations"],
  },
  {
    label: "Strategic Implementation Plan",
    icon: "💡",
    query: "Generate a prioritized, actionable implementation roadmap with milestones and risk reconciliations based on these sources.",
    focus: ["recommendations", "patterns"],
  },
];

function IntelligencePageContent() {
  const searchParams = useSearchParams();
  const [synthesisMode, setSynthesisMode] = useState<"multi" | "compare">("multi");

  // Prominently featured Decision Topology state
  const [isTopologyExpanded, setIsTopologyExpanded] = useState<boolean>(true);

  // Store state
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const addDocument = useMyndStore((state) => state.addDocument);

  // Analysis state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>(["patterns", "trends", "contradictions", "recommendations"]);
  const [userQuery, setUserQuery] = useState("");
  const [docFilterSpace, setDocFilterSpace] = useState<string>("all");
  const [docSearchQuery, setDocSearchQuery] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ step: string; message: string; progress: number } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Pairwise comparison state
  const [compareDocA, setCompareDocA] = useState<string>("");
  const [compareDocB, setCompareDocB] = useState<string>("");
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);

  const hasInitializedRef = useRef(false);

  // Deduplicate display documents by ID and title
  const displayDocs = useMemo(() => {
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    return uploadedDocuments.filter((doc) => {
      if (!doc || !doc.id || seenIds.has(doc.id)) return false;
      seenIds.add(doc.id);
      const title = (doc.title || doc.name || doc.filename || "").trim().toLowerCase();
      if (title && seenTitles.has(title)) return false;
      if (title) seenTitles.add(title);
      return true;
    });
  }, [uploadedDocuments]);

  // Filtered documents for the selection matrix
  const filteredDocs = useMemo(() => {
    return displayDocs.filter((doc) => {
      if (docFilterSpace !== "all" && doc.spaceId !== docFilterSpace) {
        return false;
      }
      if (docSearchQuery.trim()) {
        const q = docSearchQuery.toLowerCase();
        const title = (doc.title || doc.name || "").toLowerCase();
        const summary = (doc.summary || "").toLowerCase();
        if (!title.includes(q) && !summary.includes(q)) return false;
      }
      return true;
    });
  }, [displayDocs, docFilterSpace, docSearchQuery]);

  // Auto-fetch documents from backend on mount and whenever active space changes
  useEffect(() => {
    let isMounted = true;
    const fetchDocs = async () => {
      try {
        const docs = await queryMindApi.listDocuments(activeSpaceId || undefined);
        if (isMounted && Array.isArray(docs) && docs.length > 0) {
          const currentUploaded = useMyndStore.getState().uploadedDocuments;
          const seenTitles = new Set(
            currentUploaded.map((u) => (u.title || u.name || "").trim().toLowerCase())
          );
          const seenIds = new Set(currentUploaded.map((u) => u.id));
          docs.forEach((d: { id: string; title: string; file_type?: string; file_size?: number; space_id?: string }) => {
            const title = (d.title || "").trim().toLowerCase();
            if (!seenIds.has(d.id) && (!title || !seenTitles.has(title))) {
              seenIds.add(d.id);
              if (title) seenTitles.add(title);
              addDocument({
                id: d.id,
                name: d.title,
                type: d.file_type || "pdf",
                size: d.file_size ? `${Math.round(d.file_size / 1024)} KB` : "1.2 MB",
                chunks: 1,
                spaceId: d.space_id || activeSpaceId || undefined,
                summary: `Ingested document in Workspace.`,
              });
            }
          });
        }
      } catch (err) {
        console.warn("Failed to fetch documents for intelligence page:", err);
      }
    };
    fetchDocs();
    return () => {
      isMounted = false;
    };
  }, [activeSpaceId, addDocument]);

  // Auto-populate from URL search params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "compare") {
      setSynthesisMode("compare");
    }

    const docsParam = searchParams.get("analyzeDocs");
    if (docsParam) {
      const ids = docsParam.split(",").filter(Boolean);
      if (ids.length > 0) {
        setSelectedDocIds(ids);
        hasInitializedRef.current = true;
        setSynthesisMode("multi");
      }
    }
  }, [searchParams]);

  // Ensure documents are pre-selected on initial load
  useEffect(() => {
    if (!hasInitializedRef.current && displayDocs.length > 0) {
      hasInitializedRef.current = true;
      if (selectedDocIds.length === 0) {
        if (displayDocs.length >= 2) {
          setSelectedDocIds([displayDocs[0].id, displayDocs[1].id]);
        } else if (displayDocs.length === 1) {
          setSelectedDocIds([displayDocs[0].id]);
        }
      }
      if (!compareDocA && displayDocs.length > 0) {
        setCompareDocA(displayDocs[0].id);
      }
      if (!compareDocB && displayDocs.length > 1) {
        setCompareDocB(displayDocs[1].id);
      }
    }
  }, [displayDocs, compareDocA, compareDocB]);

  // Toggle document selection
  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleFocusArea = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const applyPresetQuery = (preset: typeof PRESET_QUERIES[0]) => {
    setUserQuery(preset.query);
    setFocusAreas(preset.focus);
  };

  // Run multi-document analysis
  const handleRunAnalysis = async () => {
    if (selectedDocIds.length < 2) {
      alert("Please select at least 2 documents to perform cross-document pattern analysis.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisProgress({
      step: "initiating",
      message: "Gathering vector passages and dense semantic embeddings...",
      progress: 20,
    });

    try {
      const timer1 = setTimeout(() => {
        setAnalysisProgress({
          step: "clustering",
          message: "Clustering cross-document themes and temporal trajectory drift...",
          progress: 55,
        });
      }, 1800);

      const timer2 = setTimeout(() => {
        setAnalysisProgress({
          step: "auditing",
          message: "Auditing conflicting claims, opposing stances, and divergence risks...",
          progress: 85,
        });
      }, 4200);

      const res = await queryMindApi.analyzeDocuments({
        document_ids: selectedDocIds,
        space_id: activeSpaceId || undefined,
        focus_areas: focusAreas,
        user_query: userQuery.trim() || undefined,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      setAnalysisResult(res);
      setAnalysisProgress(null);
    } catch (err: any) {
      alert(`Analysis failed: ${err.message || err}`);
      setAnalysisProgress(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run pairwise comparison
  const handleRunComparison = async () => {
    if (!compareDocA || !compareDocB || compareDocA === compareDocB) {
      alert("Please select two distinct documents to compare.");
      return;
    }

    setIsComparing(true);
    setComparisonResult(null);
    try {
      const res = await queryMindApi.compareDocuments(compareDocA, compareDocB);
      setComparisonResult(res);
    } catch (err: any) {
      alert(`Comparison failed: ${err.message || err}`);
    } finally {
      setIsComparing(false);
    }
  };

  // Export report
  const handleExportReport = async (fmt: "markdown" | "pdf" | "json") => {
    if (!analysisResult) return;
    setIsExporting(true);
    try {
      const blob = await queryMindApi.exportAnalysisReport(
        analysisResult,
        fmt,
        "QueryMind_Cross_Document_Analysis"
      );
      const ext = fmt === "markdown" ? "md" : fmt;
      downloadBlob(blob, `Cross_Document_Analysis_${Date.now()}.${ext}`);
    } catch (err: any) {
      alert(`Export failed: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getSpaceName = (spaceId?: string) => {
    if (!spaceId) return "Workspace General";
    const sp = spaces.find((s) => s.id === spaceId);
    return sp ? sp.name : "Active Space";
  };

  const currentActiveSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  return (
    <div className="w-full space-y-8 stagger" style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* ─────────────────────────────────────────────────────────────
          1. HERO & TELEMETRY HUD (Matches Spaces & Vault Design System)
          ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 50%, var(--surface) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "32px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10B981" }}>
                # SECOND BRAIN COGNITIVE REASONING &amp; DECISION COMMAND
              </span>
            </div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              Intelligence &amp; Synthesis Engine
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "6px", maxWidth: "700px", fontSize: "14px", lineHeight: "1.5" }}>
              Spatial decision topologies, multi-agent cross-document pattern correlation, contradiction auditing, and strategic roadmaps grounded in verified knowledge.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                if (selectedDocIds.length >= 2) {
                  handleRunAnalysis();
                } else {
                  alert("Please select at least 2 documents in the matrix below to run cross-synthesis.");
                }
              }}
              disabled={isAnalyzing}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isAnalyzing ? "not-allowed" : "pointer",
                boxShadow: "0 2px 10px rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "transform 150ms ease",
              }}
            >
              {isAnalyzing ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
              <span>{isAnalyzing ? "Synthesizing..." : "Run Multi-Doc Synthesis"}</span>
            </button>

            <button
              onClick={() => setIsTopologyExpanded((prev) => !prev)}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Network size={15} color="#8B5CF6" />
              <span>{isTopologyExpanded ? "Minimize Topology" : "Expand Topology"}</span>
            </button>
          </div>
        </div>

        {/* 4 Telemetry KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "28px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Knowledge Vault Sources
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {displayDocs.length} Documents
            </div>
            <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px" }}>
              {selectedDocIds.length} currently targeted
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Decision Graph Nodes
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              4 Active Nodes
            </div>
            <div style={{ fontSize: "11px", color: "#8B5CF6", marginTop: "2px" }}>
              Tier 1 Priority • Critic Risk
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Contradiction Radar
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: (analysisResult?.contradictions?.length || 0) > 0 ? "#EF4444" : "#10B981",
                marginTop: "4px",
              }}
            >
              {analysisResult ? `${analysisResult.contradictions?.length || 0} Flagged` : "0 Divergences"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
              Opposing claims &amp; risks
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Cognitive Engine
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              Qdrant + Gemini
            </div>
            <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
              <span>Multi-Agent ANN Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FEATURED: SPATIAL CAUSAL & DECISION TOPOLOGY COMMAND DECK
             (Elevated directly onto the main page - No longer hidden!)
          ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: "16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, #8B5CF6 0%, #10B981 50%, #6366F1 100%)",
          }}
        />

        {/* Command Deck Header Bar */}
        <div
          style={{
            padding: "20px 28px",
            borderBottom: isTopologyExpanded ? "1px solid var(--border)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(139, 92, 246, 0.12)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#A78BFA",
              }}
            >
              <Network size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A78BFA" }}>
                  SPATIAL DECISION TOPOLOGY
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "1px 7px",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#10B981",
                    fontSize: "10.5px",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10B981" }} />
                  Live Causal Graph
                </span>
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", margin: "2px 0 0 0" }}>
                Causal Graph &amp; Strategic Risk Map
              </h3>
            </div>
          </div>

          {/* Controls: Space Selector & Expand/Collapse */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Space Domain Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Space:</span>
              <select
                value={activeSpaceId || ""}
                onChange={(e) => selectSpace(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Expand / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsTopologyExpanded((prev) => !prev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#FFFFFF";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {isTopologyExpanded ? (
                <>
                  <Minimize2 size={13} />
                  <span>Compact Radar</span>
                </>
              ) : (
                <>
                  <Maximize2 size={13} />
                  <span>Full Interactive Graph</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Topology Body */}
        {isTopologyExpanded ? (
          <div style={{ padding: "16px 20px 24px 20px" }}>
            <DecisionTopologyMap />
          </div>
        ) : (
          /* Compact Radar Strip when collapsed */
          <div
            style={{
              padding: "16px 28px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
              background: "rgba(255, 255, 255, 0.01)",
            }}
          >
            {/* Priority Node */}
            <div
              onClick={() => setIsTopologyExpanded(true)}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--surface-hover)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Target size={15} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#10B981", textTransform: "uppercase" }}>
                  Tier 1 Priority
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  6 unaligned resources
                </div>
              </div>
            </div>

            {/* Decision Node */}
            <div
              onClick={() => setIsTopologyExpanded(true)}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--surface-hover)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(139, 92, 246, 0.15)", color: "#A78BFA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Layers size={15} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#A78BFA", textTransform: "uppercase" }}>
                  Tier 2 Decision
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Architecture &amp; framework eval
                </div>
              </div>
            </div>

            {/* Risk Node */}
            <div
              onClick={() => setIsTopologyExpanded(true)}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--surface-hover)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldAlert size={15} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#F59E0B", textTransform: "uppercase" }}>
                  Agent Critic Risk
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Grounding mismatch (6 docs)
                </div>
              </div>
            </div>

            {/* Next Action Node */}
            <div
              onClick={() => setIsTopologyExpanded(true)}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--surface-hover)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.15)", color: "#818CF8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ArrowRight size={15} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#818CF8", textTransform: "uppercase" }}>
                  Next Best Action
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Formulate objective from docs
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. DOCUMENT SYNTHESIS & INQUIRY CONTROLLER
          ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "4px",
            borderRadius: "12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setSynthesisMode("multi")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 18px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: synthesisMode === "multi" ? 600 : 500,
              cursor: "pointer",
              border: "none",
              background: synthesisMode === "multi" ? "#FFFFFF" : "transparent",
              color: synthesisMode === "multi" ? "#000000" : "var(--text-secondary)",
              transition: "all 150ms ease",
            }}
          >
            <Layers size={14} />
            <span>Cross-Document Synthesis Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setSynthesisMode("compare")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 18px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: synthesisMode === "compare" ? 600 : 500,
              cursor: "pointer",
              border: "none",
              background: synthesisMode === "compare" ? "#FFFFFF" : "transparent",
              color: synthesisMode === "compare" ? "#000000" : "var(--text-secondary)",
              transition: "all 150ms ease",
            }}
          >
            <GitCompare size={14} />
            <span>Pairwise Contrast</span>
          </button>
        </div>

        {synthesisMode === "multi" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-tertiary)" }}>
            <span>Target Selection:</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: "12px",
                background: selectedDocIds.length >= 2 ? "rgba(16, 185, 129, 0.15)" : "var(--surface)",
                border: `1px solid ${selectedDocIds.length >= 2 ? "rgba(16, 185, 129, 0.4)" : "var(--border)"}`,
                color: selectedDocIds.length >= 2 ? "#10B981" : "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              {selectedDocIds.length} Documents Selected
            </span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. SYNTHESIS MODE 1: MULTI-DOC CROSS-SYNTHESIS
          ───────────────────────────────────────────────────────────── */}
      {synthesisMode === "multi" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Target Document Selection Matrix */}
          <div
            style={{
              padding: "24px 28px",
              borderRadius: "16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Target Documents Matrix
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", margin: 0 }}>
                  Select at least 2 documents to correlate shared patterns, evolutionary drift, and conflicting claims.
                </p>
              </div>

              {/* Matrix Toolbar */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {/* Space Filter Dropdown */}
                <select
                  value={docFilterSpace}
                  onChange={(e) => setDocFilterSpace(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Spaces</option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {/* Search in docs */}
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
                  <input
                    type="text"
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    placeholder="Search docs..."
                    style={{
                      padding: "6px 12px 6px 28px",
                      borderRadius: "8px",
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      outline: "none",
                      width: "140px",
                    }}
                  />
                </div>

                {/* Quick actions */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDocIds.length === filteredDocs.length) {
                      setSelectedDocIds([]);
                    } else {
                      setSelectedDocIds(filteredDocs.map((d) => d.id));
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0 ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            {/* Document Selection Cards */}
            {filteredDocs.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  borderRadius: "12px",
                  background: "var(--surface-subtle)",
                  border: "1px dashed var(--border)",
                  color: "var(--text-tertiary)",
                  fontSize: "13px",
                }}
              >
                No documents match the current filter. Ingest documents in the Knowledge Vault first.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "12px",
                }}
              >
                {filteredDocs.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  const cat = getFormatCategory(doc.title || doc.name || doc.type);
                  const spaceName = getSpaceName(doc.spaceId);

                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "12px",
                        background: isSelected ? "rgba(255, 255, 255, 0.05)" : "var(--surface-hover)",
                        border: isSelected ? "1px solid #FFFFFF" : "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                      }}
                    >
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "6px",
                          border: isSelected ? "none" : "1px solid var(--border-strong)",
                          background: isSelected ? "#10B981" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFFFFF",
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>

                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "var(--surface)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid var(--border)",
                          flexShrink: 0,
                        }}
                      >
                        {renderFormatIcon(cat, 15)}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? "#FFFFFF" : "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc.title || doc.name || doc.filename || "Untitled Document"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                          <span>{spaceName}</span>
                          <span>•</span>
                          <span>{doc.chunks || 1} chunks</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cognitive Inquiry & Focus Areas */}
            <div
              style={{
                marginTop: "10px",
                paddingTop: "24px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Sparkles size={14} color="#10B981" />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Targeted Cognitive Inquiry (Optional)
                  </span>
                </div>
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="e.g. Audit conflicting requirements, opposing security claims, or evaluate architectural trade-offs across these documents..."
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "13.5px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Preset Clickable Prompts */}
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "8px" }}>
                  Intelligence Presets:
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {PRESET_QUERIES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPresetQuery(preset)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                        e.currentTarget.style.color = "#FFFFFF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Areas Pills & Run Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  paddingTop: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Focus Areas:</span>
                  {[
                    { id: "patterns", label: "Shared Patterns" },
                    { id: "trends", label: "Temporal Trajectories" },
                    { id: "contradictions", label: "Contradictions & Risks" },
                    { id: "recommendations", label: "Strategic Roadmaps" },
                  ].map((item) => {
                    const isActive = focusAreas.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleFocusArea(item.id)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "11.5px",
                          fontWeight: isActive ? 600 : 500,
                          cursor: "pointer",
                          background: isActive ? "#FFFFFF" : "var(--surface-hover)",
                          color: isActive ? "#000000" : "var(--text-secondary)",
                          border: `1px solid ${isActive ? "#FFFFFF" : "var(--border)"}`,
                          transition: "all 150ms ease",
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing || selectedDocIds.length < 2}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    borderRadius: "10px",
                    background: selectedDocIds.length >= 2 ? "#FFFFFF" : "var(--surface-hover)",
                    color: selectedDocIds.length >= 2 ? "#000000" : "var(--text-tertiary)",
                    fontWeight: 600,
                    fontSize: "13px",
                    border: "none",
                    cursor: selectedDocIds.length >= 2 && !isAnalyzing ? "pointer" : "not-allowed",
                    boxShadow: selectedDocIds.length >= 2 ? "0 4px 16px rgba(255, 255, 255, 0.15)" : "none",
                    transition: "all 150ms ease",
                  }}
                >
                  {isAnalyzing ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  <span>{isAnalyzing ? "Synthesizing Patterns..." : "Run Multi-Agent Synthesis"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Synthesis Progress Indicator */}
          {isAnalyzing && analysisProgress && (
            <div
              style={{
                padding: "24px",
                borderRadius: "14px",
                background: "var(--surface)",
                border: "1px solid #10B981",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 8px 32px rgba(16, 185, 129, 0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <RefreshCw size={16} className="animate-spin text-[#10B981]" />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Multi-Agent Synthesis Pipeline Running
                  </span>
                </div>
                <span style={{ fontSize: "13px", color: "#10B981", fontWeight: 700 }}>
                  {analysisProgress.progress}%
                </span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${analysisProgress.progress}%`,
                    height: "100%",
                    background: "#10B981",
                    transition: "width 400ms ease",
                  }}
                />
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                {analysisProgress.message}
              </p>
            </div>
          )}

          {/* Synthesis Findings Briefing Canvas */}
          {analysisResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Executive Summary Card with Export Toolbar */}
              <div
                style={{
                  padding: "28px",
                  borderRadius: "16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: "linear-gradient(90deg, #10B981 0%, transparent 100%)",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", paddingBottom: "18px", borderBottom: "1px solid var(--border)", marginBottom: "18px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      SYNTHESIS FINDINGS • {analysisResult.documents_analyzed_count} SOURCES CORRELATED
                    </span>
                    <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 0 0" }}>
                      Executive Intelligence Briefing
                    </h2>
                  </div>

                  {/* Export Toolbar */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleExportReport("markdown")}
                      disabled={isExporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        borderRadius: "8px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <Download size={13} />
                      <span>Export MD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportReport("pdf")}
                      disabled={isExporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        borderRadius: "8px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <Download size={13} />
                      <span>Export PDF</span>
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "var(--text-secondary)", whiteSpace: "pre-line", margin: 0 }}>
                  {analysisResult.executive_summary}
                </p>

                {analysisResult.document_titles && analysisResult.document_titles.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}>
                      Correlated Sources:
                    </span>
                    {analysisResult.document_titles.map((title: string, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          background: "var(--surface-hover)",
                          border: "1px solid var(--border)",
                          fontSize: "11.5px",
                          color: "var(--text-primary)",
                        }}
                      >
                        <FileText size={12} color="#10B981" />
                        <span>{title}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid: Patterns (left) & Trends (right) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Patterns */}
                <div
                  style={{
                    padding: "24px",
                    borderRadius: "14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Layers size={16} color="#818CF8" />
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                        Identified Patterns &amp; Themes
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                      {analysisResult.patterns?.length || 0} Themes
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {analysisResult.patterns && analysisResult.patterns.length > 0 ? (
                      analysisResult.patterns.map((p: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: "16px",
                            borderRadius: "10px",
                            background: "var(--surface-hover)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                              {p.title}
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#10B981",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                background: "rgba(16, 185, 129, 0.12)",
                              }}
                            >
                              {Math.round((p.confidence || 1.0) * 100)}% match
                            </span>
                          </div>
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                            {p.description}
                          </p>
                          {p.source_documents && p.source_documents.length > 0 && (
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                              {p.source_documents.map((src: string, sIdx: number) => (
                                <span key={sIdx} style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                  • {src}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: "13px", color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>
                        No recurring themes identified.
                      </div>
                    )}
                  </div>
                </div>

                {/* Trends */}
                <div
                  style={{
                    padding: "24px",
                    borderRadius: "14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <TrendingUp size={16} color="#10B981" />
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                        Temporal Trends &amp; Trajectories
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                      {analysisResult.trends?.length || 0} Vectors
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {analysisResult.trends && analysisResult.trends.length > 0 ? (
                      analysisResult.trends.map((t: any, idx: number) => {
                        const isUp = t.direction === "up";
                        const isDown = t.direction === "down";
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: "16px",
                              borderRadius: "10px",
                              background: "var(--surface-hover)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                                {t.topic}
                              </span>
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: isUp ? "#10B981" : isDown ? "#EF4444" : "var(--text-secondary)",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  background: isUp
                                    ? "rgba(16, 185, 129, 0.12)"
                                    : isDown
                                    ? "rgba(239, 68, 68, 0.12)"
                                    : "rgba(255, 255, 255, 0.05)",
                                }}
                              >
                                {isUp && <TrendingUp size={12} />}
                                {isDown && <TrendingDown size={12} />}
                                {!isUp && !isDown && <Minus size={12} />}
                                <span style={{ textTransform: "capitalize" }}>{t.direction}</span>
                              </span>
                            </div>
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                              {t.description}
                            </p>
                            {t.time_period && (
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "8px" }}>
                                Timeline Scope: {t.time_period}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: "13px", color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>
                        No evolutionary trajectories detected.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contradictions & Divergences */}
              {analysisResult.contradictions && analysisResult.contradictions.length > 0 && (
                <div
                  style={{
                    padding: "24px 28px",
                    borderRadius: "16px",
                    background: "rgba(239, 68, 68, 0.04)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#EF4444",
                      }}
                    >
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#EF4444", margin: 0 }}>
                        Detected Divergences &amp; Opposing Claims ({analysisResult.contradictions.length})
                      </h3>
                      <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                        The multi-agent critic identified conflicting technical stances, policy collisions, or methodology differences.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {analysisResult.contradictions.map((c: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
                          ⚡ {c.issue}
                        </h4>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 10px 0" }}>
                          {c.description}
                        </p>
                        {c.suggested_resolution && (
                          <div
                            style={{
                              padding: "10px 14px",
                              borderRadius: "8px",
                              background: "rgba(16, 185, 129, 0.08)",
                              borderLeft: "3px solid #10B981",
                              fontSize: "12.5px",
                              color: "var(--text-primary)",
                              lineHeight: "1.45",
                            }}
                          >
                            <strong style={{ color: "#10B981" }}>Suggested Reconciliation:</strong> {c.suggested_resolution}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                <div
                  style={{
                    padding: "24px 28px",
                    borderRadius: "16px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
                    💡 Strategic Synthesis Recommendations
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {analysisResult.recommendations.map((rec: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          background: "var(--surface-hover)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <span
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#FFFFFF",
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                          {rec}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. SYNTHESIS MODE 2: PAIRWISE CONTRAST
          ───────────────────────────────────────────────────────────── */}
      {synthesisMode === "compare" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Document Comparison Selector Card */}
          <div
            style={{
              padding: "24px 28px",
              borderRadius: "16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Side-by-Side Pairwise Contrast
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", margin: 0 }}>
                Select two specific documents to inspect unique focus areas, genuine conceptual overlap, and structural divergences.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                  Document A
                </label>
                <select
                  value={compareDocA}
                  onChange={(e) => setCompareDocA(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "10px",
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "13.5px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select Document A...</option>
                  {displayDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || d.name || d.filename || "Untitled Document"} ({getSpaceName(d.spaceId)})
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  marginTop: "24px",
                }}
              >
                VS
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                  Document B
                </label>
                <select
                  value={compareDocB}
                  onChange={(e) => setCompareDocB(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "10px",
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "13.5px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select Document B...</option>
                  {displayDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || d.name || d.filename || "Untitled Document"} ({getSpaceName(d.spaceId)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunComparison}
              disabled={isComparing || !compareDocA || !compareDocB || compareDocA === compareDocB}
              style={{
                alignSelf: "flex-end",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                borderRadius: "10px",
                background: compareDocA && compareDocB && compareDocA !== compareDocB ? "#FFFFFF" : "var(--surface-hover)",
                color: compareDocA && compareDocB && compareDocA !== compareDocB ? "#000000" : "var(--text-tertiary)",
                fontWeight: 600,
                fontSize: "13px",
                border: "none",
                cursor: compareDocA && compareDocB && compareDocA !== compareDocB && !isComparing ? "pointer" : "not-allowed",
              }}
            >
              {isComparing ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <GitCompare size={15} />
              )}
              <span>{isComparing ? "Contrasting Documents..." : "Generate Deep Contrast"}</span>
            </button>
          </div>

          {/* Comparison Findings */}
          {comparisonResult && (
            <div
              style={{
                padding: "28px",
                borderRadius: "16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    HEAD-TO-HEAD CONTRAST
                  </span>
                  {comparisonResult.relationship_nature && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 10px",
                        borderRadius: "12px",
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "#10B981",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      {comparisonResult.relationship_nature}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  "{comparisonResult.document_a_title}" vs "{comparisonResult.document_b_title}"
                </h3>

                {/* Domain Badges */}
                {(comparisonResult.document_a_domain || comparisonResult.document_b_domain) && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      marginTop: "16px",
                    }}
                  >
                    <div style={{ padding: "10px 14px", borderRadius: "8px", background: "var(--surface-hover)", border: "1px solid var(--border)", fontSize: "12.5px" }}>
                      <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>Subject A Domain: </span>
                      <strong style={{ color: "var(--text-primary)" }}>{comparisonResult.document_a_domain || "Computer Science"}</strong>
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: "8px", background: "var(--surface-hover)", border: "1px solid var(--border)", fontSize: "12.5px" }}>
                      <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>Subject B Domain: </span>
                      <strong style={{ color: "var(--text-primary)" }}>{comparisonResult.document_b_domain || "Computer Science"}</strong>
                    </div>
                  </div>
                )}
              </div>

              {comparisonResult.verdict_or_summary && (
                <div
                  style={{
                    padding: "16px 20px",
                    borderRadius: "12px",
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    fontSize: "13.5px",
                    lineHeight: "1.6",
                    color: "var(--text-secondary)",
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>Macro Synthesis: </strong>
                  {comparisonResult.verdict_or_summary}
                </div>
              )}

              {/* Exclusive Focus / Core Topics */}
              {((comparisonResult.unique_to_a && comparisonResult.unique_to_a.length > 0) || (comparisonResult.unique_to_b && comparisonResult.unique_to_b.length > 0)) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {comparisonResult.unique_to_a && comparisonResult.unique_to_a.length > 0 && (
                    <div style={{ padding: "18px", borderRadius: "12px", background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px 0" }}>
                        Unique to {comparisonResult.document_a_title}
                      </h4>
                      <ul style={{ listStyle: "disc", paddingLeft: "18px", fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: "1.6", margin: 0 }}>
                        {comparisonResult.unique_to_a.map((item: string, uIdx: number) => (
                          <li key={uIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {comparisonResult.unique_to_b && comparisonResult.unique_to_b.length > 0 && (
                    <div style={{ padding: "18px", borderRadius: "12px", background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px 0" }}>
                        Unique to {comparisonResult.document_b_title}
                      </h4>
                      <ul style={{ listStyle: "disc", paddingLeft: "18px", fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: "1.6", margin: 0 }}>
                        {comparisonResult.unique_to_b.map((item: string, uIdx: number) => (
                          <li key={uIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Shared Themes / Genuine Overlap */}
              {comparisonResult.shared_themes && comparisonResult.shared_themes.length > 0 && (
                <div style={{ padding: "16px 18px", borderRadius: "12px", background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
                    Genuine Conceptual Intersections &amp; Overlap
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {comparisonResult.shared_themes.map((theme: string, sIdx: number) => (
                      <span
                        key={sIdx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          fontSize: "12px",
                          color: "var(--text-primary)",
                        }}
                      >
                        ⚡ {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Structural Divergences */}
              {comparisonResult.key_differences && comparisonResult.key_differences.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
                    Core Structural &amp; Methodological Divergences
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {comparisonResult.key_differences.map((diff: any, idx: number) => (
                      <div key={idx} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface-hover)" }}>
                        <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#60A5FA", marginBottom: "10px" }}>
                          Dimension: {diff.aspect}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "12.5px", lineHeight: "1.5" }}>
                          <div style={{ padding: "12px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                              {comparisonResult.document_a_title}:
                            </strong>
                            <span style={{ color: "var(--text-secondary)" }}>{diff.document_a_view}</span>
                          </div>
                          <div style={{ padding: "12px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                              {comparisonResult.document_b_title}:
                            </strong>
                            <span style={{ color: "var(--text-secondary)" }}>{diff.document_b_view}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", color: "var(--text-tertiary)" }}>Loading Intelligence...</div>}>
      <IntelligencePageContent />
    </Suspense>
  );
}
