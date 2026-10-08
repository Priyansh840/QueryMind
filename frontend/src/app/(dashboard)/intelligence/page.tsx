"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
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
  Activity,
  Check,
  ChevronDown,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi, downloadBlob } from "@/lib/api";
import { useSearchParams } from "next/navigation";

function IntelligencePageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"analysis" | "compare" | "activity">("analysis");

  // Store state
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const addDocument = useMyndStore((state) => state.addDocument);
  const activityFeed = useMyndStore((state) => state.activityFeed);

  // Analysis state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>(["patterns", "trends", "contradictions"]);
  const [userQuery, setUserQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ step: string; message: string; progress: number } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"markdown" | "pdf" | "json">("markdown");

  // Pairwise comparison state
  const [compareDocA, setCompareDocA] = useState<string>("");
  const [compareDocB, setCompareDocB] = useState<string>("");
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);

  // Activity filter state
  const [activityFilter, setActivityFilter] = useState("all");

  // Auto-fetch documents from backend on mount and whenever active space changes
  useEffect(() => {
    let isMounted = true;
    const fetchDocs = async () => {
      try {
        const docs = await queryMindApi.listDocuments(activeSpaceId || undefined);
        if (isMounted && Array.isArray(docs) && docs.length > 0) {
          const currentUploaded = useMyndStore.getState().uploadedDocuments;
          docs.forEach((d: { id: string; title: string; file_type?: string; file_size?: number }) => {
            const exists = currentUploaded.some((u) => u.id === d.id || u.title === d.title);
            if (!exists) {
              addDocument({
                id: d.id,
                name: d.title,
                type: d.file_type || "pdf",
                size: d.file_size ? `${Math.round(d.file_size / 1024)} KB` : "1.2 MB",
                chunks: 1,
                spaceId: activeSpaceId || undefined,
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

  // Auto-populate from URL search params if redirected from Vault (e.g. ?analyzeDocs=id1,id2)
  useEffect(() => {
    const docsParam = searchParams.get("analyzeDocs");
    if (docsParam) {
      const ids = docsParam.split(",").filter(Boolean);
      if (ids.length > 0) {
        setSelectedDocIds(ids);
        setActiveTab("analysis");
      }
    }
  }, [searchParams]);

  // Ensure documents are pre-selected once loaded
  useEffect(() => {
    if (uploadedDocuments.length > 0) {
      if (selectedDocIds.length === 0) {
        if (uploadedDocuments.length >= 2) {
          setSelectedDocIds([uploadedDocuments[0].id, uploadedDocuments[1].id]);
        } else if (uploadedDocuments.length === 1) {
          setSelectedDocIds([uploadedDocuments[0].id]);
        }
      }
      if (!compareDocA && uploadedDocuments.length > 0) {
        setCompareDocA(uploadedDocuments[0].id);
      }
      if (!compareDocB && uploadedDocuments.length > 1) {
        setCompareDocB(uploadedDocuments[1].id);
      }
    }
  }, [uploadedDocuments, selectedDocIds.length, compareDocA, compareDocB]);

  // Toggle document selection for multi-doc analysis
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
      message: "Initializing multi-agent cross-document reasoning...",
      progress: 15,
    });

    try {
      // Progress simulation for responsive feedback while LLM analyzes
      const timer1 = setTimeout(() => {
        setAnalysisProgress({
          step: "extracting",
          message: "Extracting semantic themes and recurring patterns...",
          progress: 45,
        });
      }, 1500);

      const timer2 = setTimeout(() => {
        setAnalysisProgress({
          step: "detecting",
          message: "Tracing evolutionary trends and detecting contradictions...",
          progress: 75,
        });
      }, 4000);

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

  const filteredActivities = useMemo(() => {
    return activityFeed.filter(
      (a) => activityFilter === "all" || (a.space && a.space.toLowerCase() === activityFilter.toLowerCase())
    );
  }, [activityFeed, activityFilter]);

  return (
    <div className="w-full space-y-8 stagger">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: "var(--t-display)", fontWeight: "var(--w-bold)", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Intelligence & Analysis
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
            Autonomous pattern discovery, evolutionary trends, divergence detection, and knowledge activity across your documents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            padding: "4px",
            borderRadius: "12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("analysis")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              background: activeTab === "analysis" ? "var(--surface-hover)" : "transparent",
              color: activeTab === "analysis" ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "all 120ms ease",
            }}
          >
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Cross-Document Analysis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("compare")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              background: activeTab === "compare" ? "var(--surface-hover)" : "transparent",
              color: activeTab === "compare" ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "all 120ms ease",
            }}
          >
            <GitCompare className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Pairwise Comparison</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              background: activeTab === "activity" ? "var(--surface-hover)" : "transparent",
              color: activeTab === "activity" ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "all 120ms ease",
            }}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity Stream</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CROSS-DOCUMENT ANALYSIS ─────────────────────── */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          {/* Document Selection Card */}
          <div
            style={{
              padding: "20px 24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Select Target Documents ({selectedDocIds.length} selected)
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Choose at least 2 documents to correlate patterns, trends, and conflicting claims.
                </p>
              </div>

              {uploadedDocuments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDocIds.length === uploadedDocuments.length) {
                      setSelectedDocIds([]);
                    } else {
                      setSelectedDocIds(uploadedDocuments.map((d) => d.id));
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--accent)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {selectedDocIds.length === uploadedDocuments.length ? "Deselect All" : "Select All Available"}
                </button>
              )}
            </div>

            {uploadedDocuments.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
                No documents found in vault. Please upload documents in the Knowledge Vault first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {uploadedDocuments.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: isSelected ? "var(--surface-subtle)" : "transparent",
                        border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "4px",
                          border: isSelected ? "none" : "1px solid var(--border-strong)",
                          background: isSelected ? "var(--accent)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFFFFF",
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.title || doc.name || doc.filename || "Untitled Document"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-ghost)" }}>
                          {doc.type?.toUpperCase()} • {doc.chunks || 1} chunks
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Focus Areas & Query Input */}
            <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Focus Areas:</span>
                {[
                  { id: "patterns", label: "Shared Patterns" },
                  { id: "trends", label: "Temporal Trends" },
                  { id: "contradictions", label: "Contradictions" },
                  { id: "recommendations", label: "Recommendations" },
                ].map((item) => {
                  const isActive = focusAreas.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleFocusArea(item.id)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "16px",
                        fontSize: "11px",
                        fontWeight: 500,
                        cursor: "pointer",
                        background: isActive ? "var(--accent-soft)" : "transparent",
                        color: isActive ? "var(--accent)" : "var(--text-secondary)",
                        border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                        transition: "all 120ms ease",
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
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 18px",
                  borderRadius: "10px",
                  background: selectedDocIds.length >= 2 ? "var(--accent)" : "var(--surface-subtle)",
                  color: selectedDocIds.length >= 2 ? "#FFFFFF" : "var(--text-ghost)",
                  fontWeight: 600,
                  fontSize: "13px",
                  border: "none",
                  cursor: selectedDocIds.length >= 2 && !isAnalyzing ? "pointer" : "not-allowed",
                  transition: "all 150ms ease",
                  boxShadow: selectedDocIds.length >= 2 ? "0 4px 14px rgba(0,0,0,0.2)" : "none",
                }}
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isAnalyzing ? "Analyzing Patterns..." : "Run Cross-Document Synthesis"}</span>
              </button>
            </div>
          </div>

          {/* Analysis Progress Stepper */}
          {isAnalyzing && analysisProgress && (
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "#12131A",
                border: "1px solid var(--accent)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Multi-Agent Document Synthesis in Progress
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
                  {analysisProgress.progress}%
                </span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${analysisProgress.progress}%`,
                    height: "100%",
                    background: "var(--accent)",
                    transition: "width 400ms ease",
                  }}
                />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                {analysisProgress.message}
              </p>
            </div>
          )}

          {/* ─── ANALYSIS RESULT DASHBOARD ───────────────────────── */}
          {analysisResult && (
            <div className="space-y-6">
              {/* Executive Summary Card with Export Toolbar */}
              <div
                style={{
                  padding: "24px",
                  borderRadius: "14px",
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--border)]">
                  <div>
                    <span className="kbd" style={{ fontSize: "10px", color: "var(--accent)", textTransform: "uppercase" }}>
                      SYNTHESIS FINDINGS ({analysisResult.documents_analyzed_count} Documents Correlated)
                    </span>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                      Executive Summary
                    </h2>
                  </div>

                  {/* Export Report Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleExportReport("markdown")}
                      disabled={isExporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "var(--surface-subtle)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export MD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportReport("pdf")}
                      disabled={isExporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "var(--surface-subtle)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
                  {analysisResult.executive_summary}
                </p>

                {analysisResult.document_titles && analysisResult.document_titles.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "16px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}>
                      Correlated Sources:
                    </span>
                    {analysisResult.document_titles.map((title: string, idx: number) => (
                      <span key={idx} className="kbd" style={{ fontSize: "11px" }}>
                        📄 {title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid: Patterns (left) & Trends (right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patterns */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers className="w-4 h-4 text-[var(--accent)]" />
                    <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Identified Patterns & Themes ({analysisResult.patterns?.length || 0})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {analysisResult.patterns && analysisResult.patterns.length > 0 ? (
                      analysisResult.patterns.map((p: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "10px",
                            background: "var(--surface-subtle)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                              {p.title}
                            </span>
                            <span className="kbd" style={{ fontSize: "10px", color: "var(--accent)" }}>
                              {Math.round((p.confidence || 1.0) * 100)}% match
                            </span>
                          </div>
                          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
                            {p.description}
                          </p>
                          {p.source_documents && p.source_documents.length > 0 && (
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
                              {p.source_documents.map((src: string, sIdx: number) => (
                                <span key={sIdx} style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                                  • {src}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textAlign: "center", padding: "16px" }}>
                        No recurring patterns detected.
                      </div>
                    )}
                  </div>
                </div>

                {/* Trends */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Temporal Trends & Trajectories ({analysisResult.trends?.length || 0})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {analysisResult.trends && analysisResult.trends.length > 0 ? (
                      analysisResult.trends.map((t: any, idx: number) => {
                        const isUp = t.direction === "up";
                        const isDown = t.direction === "down";
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: "12px 14px",
                              borderRadius: "10px",
                              background: "var(--surface-subtle)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                                {t.topic}
                              </span>
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: isUp ? "#10B981" : isDown ? "#EF4444" : "var(--text-secondary)",
                                }}
                              >
                                {isUp && <TrendingUp className="w-3.5 h-3.5" />}
                                {isDown && <TrendingDown className="w-3.5 h-3.5" />}
                                {!isUp && !isDown && <Minus className="w-3.5 h-3.5" />}
                                <span style={{ textTransform: "capitalize" }}>{t.direction}</span>
                              </span>
                            </div>
                            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
                              {t.description}
                            </p>
                            {t.time_period && (
                              <div style={{ fontSize: "10.5px", color: "var(--text-ghost)", marginTop: "6px" }}>
                                Timeline: {t.time_period}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textAlign: "center", padding: "16px" }}>
                        No temporal trends identified.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contradictions & Divergences */}
              {analysisResult.contradictions && analysisResult.contradictions.length > 0 && (
                <div
                  style={{
                    padding: "20px 24px",
                    borderRadius: "14px",
                    background: "rgba(239, 68, 68, 0.05)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#EF4444" }}>
                      Detected Divergences & Contradictions ({analysisResult.contradictions.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {analysisResult.contradictions.map((c: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: "14px",
                          borderRadius: "10px",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <h4 style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                          ⚡ {c.issue}
                        </h4>
                        <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.4, margin: "4px 0" }}>
                          {c.description}
                        </p>
                        {c.suggested_resolution && (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "8px 12px",
                              borderRadius: "6px",
                              background: "var(--surface-subtle)",
                              borderLeft: "3px solid var(--accent)",
                              fontSize: "12px",
                              color: "var(--text-primary)",
                            }}
                          >
                            <strong>Suggested Reconciliation:</strong> {c.suggested_resolution}
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
                    padding: "20px 24px",
                    borderRadius: "14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
                    💡 Strategic Recommendations
                  </h3>
                  <div className="space-y-2">
                    {analysisResult.recommendations.map((rec: string, idx: number) => (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px" }}>
                        <span style={{ color: "var(--accent)", fontWeight: 700 }}>{idx + 1}.</span>
                        <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: PAIRWISE COMPARISON ─────────────────────────── */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                Side-by-Side Document Comparison
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                Select two specific documents to inspect points of consensus, core divergences, and differing methodologies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-tertiary)", display: "block", marginBottom: "6px" }}>
                  Document A
                </label>
                <select
                  value={compareDocA}
                  onChange={(e) => setCompareDocA(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="">Select Document A...</option>
                  {uploadedDocuments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || d.name || d.filename || "Untitled Document"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-tertiary)", display: "block", marginBottom: "6px" }}>
                  Document B
                </label>
                <select
                  value={compareDocB}
                  onChange={(e) => setCompareDocB(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="">Select Document B...</option>
                  {uploadedDocuments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || d.name || d.filename || "Untitled Document"}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "10px",
                background: compareDocA && compareDocB && compareDocA !== compareDocB ? "var(--accent)" : "var(--surface-subtle)",
                color: compareDocA && compareDocB && compareDocA !== compareDocB ? "#FFFFFF" : "var(--text-ghost)",
                fontWeight: 600,
                fontSize: "13px",
                border: "none",
                cursor: compareDocA && compareDocB && compareDocA !== compareDocB && !isComparing ? "pointer" : "not-allowed",
              }}
            >
              {isComparing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <GitCompare className="w-4 h-4" />
              )}
              <span>{isComparing ? "Generating Contrast..." : "Compare Selected Documents"}</span>
            </button>
          </div>

          {comparisonResult && (
            <div
              style={{
                padding: "24px",
                borderRadius: "14px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                  <span className="kbd" style={{ fontSize: "10px", color: "var(--accent)", textTransform: "uppercase" }}>
                    PAIRWISE COMPARISON
                  </span>
                  {comparisonResult.relationship_nature && (
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px", background: "var(--accent-soft)", color: "var(--accent)" }}>
                      {comparisonResult.relationship_nature}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                  "{comparisonResult.document_a_title}" vs "{comparisonResult.document_b_title}"
                </h3>

                {/* Domain Badges */}
                {(comparisonResult.document_a_domain || comparisonResult.document_b_domain) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--surface-subtle)", border: "1px solid var(--border)", fontSize: "12px" }}>
                      <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>Subject A Domain: </span>
                      <strong style={{ color: "var(--text-primary)" }}>{comparisonResult.document_a_domain || "Computer Science"}</strong>
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--surface-subtle)", border: "1px solid var(--border)", fontSize: "12px" }}>
                      <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>Subject B Domain: </span>
                      <strong style={{ color: "var(--text-primary)" }}>{comparisonResult.document_b_domain || "Computer Science"}</strong>
                    </div>
                  </div>
                )}
              </div>

              {comparisonResult.verdict_or_summary && (
                <div style={{ padding: "14px 16px", borderRadius: "10px", background: "var(--surface-subtle)", border: "1px solid var(--border)", fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Macro Synthesis:</strong> {comparisonResult.verdict_or_summary}
                </div>
              )}

              {/* Exclusive Focus / Core Topics */}
              {((comparisonResult.unique_to_a && comparisonResult.unique_to_a.length > 0) || (comparisonResult.unique_to_b && comparisonResult.unique_to_b.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {comparisonResult.unique_to_a && comparisonResult.unique_to_a.length > 0 && (
                    <div style={{ padding: "14px", borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                        Unique to {comparisonResult.document_a_title}
                      </h4>
                      <ul style={{ listStyle: "disc", paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                        {comparisonResult.unique_to_a.map((item: string, uIdx: number) => (
                          <li key={uIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {comparisonResult.unique_to_b && comparisonResult.unique_to_b.length > 0 && (
                    <div style={{ padding: "14px", borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                        Unique to {comparisonResult.document_b_title}
                      </h4>
                      <ul style={{ listStyle: "disc", paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
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
                <div style={{ padding: "12px 14px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px" }}>
                    Genuine Conceptual Intersections & Overlap
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {comparisonResult.shared_themes.map((theme: string, sIdx: number) => (
                      <span key={sIdx} className="kbd" style={{ fontSize: "11px" }}>
                        ⚡ {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Structural Divergences */}
              {comparisonResult.key_differences && comparisonResult.key_differences.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px" }}>
                    Core Structural & Theoretical Divergences
                  </h4>
                  <div className="space-y-3">
                    {comparisonResult.key_differences.map((diff: any, idx: number) => (
                      <div key={idx} style={{ padding: "14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface)" }}>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--accent)", marginBottom: "8px" }}>
                          Dimension: {diff.aspect}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs" style={{ lineHeight: "1.5" }}>
                          <div style={{ padding: "10px", borderRadius: "6px", background: "var(--surface-subtle)" }}>
                            <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                              {comparisonResult.document_a_title}:
                            </strong>
                            <span style={{ color: "var(--text-secondary)" }}>{diff.document_a_view}</span>
                          </div>
                          <div style={{ padding: "10px", borderRadius: "6px", background: "var(--surface-subtle)" }}>
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

      {/* ─── TAB 3: ACTIVITY FEED ───────────────────────────────── */}
      {activeTab === "activity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {spaces.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["all", ...spaces.map((s) => s.name)].map((f) => (
                <button
                  key={f}
                  onClick={() => setActivityFilter(f)}
                  className="kbd"
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1px solid var(--border)",
                    background: activityFilter.toLowerCase() === f.toLowerCase() ? "var(--accent-soft)" : "var(--surface)",
                    color: activityFilter.toLowerCase() === f.toLowerCase() ? "var(--accent)" : "var(--text-secondary)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredActivities.length > 0 ? (
              filteredActivities.map((item, idx) => (
                <div
                  key={item.id || `act-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 120ms ease",
                    boxShadow: "var(--shadow-xs)",
                  }}
                  onClick={() => {
                    const matchedSpace = spaces.find(
                      (s) => s.id === item.space || s.name.toLowerCase() === (item.space || "").toLowerCase()
                    );
                    if (matchedSpace) {
                      selectSpace(matchedSpace.id);
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: item.bg || "var(--surface-hover)",
                        color: item.color || "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span className="space-dot" style={{ background: item.color || "#FFFFFF" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {item.text || "Knowledge synchronization event"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {item.space && (
                      <span className="kbd" style={{ fontSize: "11px" }}>
                        {item.space}
                      </span>
                    )}
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{item.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  borderRadius: "12px",
                  background: "var(--surface)",
                  border: "1px dashed var(--border-strong)",
                  color: "var(--text-tertiary)",
                }}
              >
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  No intelligence events yet
                </p>
                <p style={{ fontSize: "12px", margin: "6px 0 0 0" }}>
                  Events, memory updates, and autonomous connections will appear here as you interact with your spaces.
                </p>
              </div>
            )}
          </div>
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
