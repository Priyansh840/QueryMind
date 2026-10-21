"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  Sparkles,
  X,
  FileCode,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  LayoutGrid,
  Columns,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import { queryMindApi, downloadBlob, DocumentDetail, DocumentChunkDetail } from "@/lib/api";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import DocumentStudyReaderModal from "@/components/vault/DocumentStudyReaderModal";

const CATEGORY_TAGS = [
  { id: "all", label: "All Documents" },
  { id: "pdf", label: "PDFs" },
  { id: "document", label: "Word Docs" },
  { id: "markdown", label: "Markdown & Notes" },
  { id: "code", label: "Code & Scripts" },
  { id: "data", label: "Data & Sheets" },
];

function getFormatCategory(typeOrTitle: string): "pdf" | "markdown" | "document" | "data" | "code" | "other" {
  const ext = (typeOrTitle || "").toLowerCase().split(".").pop() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["md", "markdown", "txt", "rtf"].includes(ext)) return "markdown";
  if (["doc", "docx", "odt", "pages"].includes(ext)) return "document";
  if (["csv", "tsv", "xlsx", "xls", "json"].includes(ext)) return "data";
  if (["js", "ts", "tsx", "jsx", "py", "sql", "html", "css", "yaml", "yml"].includes(ext)) return "code";
  return "other";
}

function renderFormatIcon(category: string, size = 18) {
  switch (category) {
    case "pdf":
      return <FileText size={size} style={{ color: "#F43F5E" }} />;
    case "markdown":
      return <FileText size={size} style={{ color: "#818CF8" }} />;
    case "document":
      return <FileText size={size} style={{ color: "#38BDF8" }} />;
    case "data":
      return <FileSpreadsheet size={size} style={{ color: "#F59E0B" }} />;
    case "code":
      return <FileCode size={size} style={{ color: "#10B981" }} />;
    default:
      return <FileText size={size} style={{ color: "var(--text-tertiary)" }} />;
  }
}

function parseFileSize(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const num = parseFloat(sizeStr);
  if (isNaN(num)) return 0;
  const lower = sizeStr.toLowerCase();
  if (lower.includes("gb")) return num * 1024 * 1024 * 1024;
  if (lower.includes("mb")) return num * 1024 * 1024;
  if (lower.includes("kb")) return num * 1024;
  return num;
}

export default function VaultPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const addDocument = useMyndStore((state) => state.addDocument);
  const deleteDocument = useMyndStore((state) => state.deleteDocument);
  const syncWithBackend = useMyndStore((state) => state.syncWithBackend);

  // Controls & Filters
  const [viewMode, setViewMode] = useState<"grid" | "studio">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>("all");

  // Selection & Details
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [quickPeekDoc, setQuickPeekDoc] = useState<KnowledgeObject | null>(null);
  const [docDetail, setDocDetail] = useState<DocumentDetail | null>(null);
  const [studioTab, setStudioTab] = useState<"summary" | "chunks">("summary");
  const [chunkSearch, setChunkSearch] = useState("");
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [studyModalDoc, setStudyModalDoc] = useState<KnowledgeObject | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    syncWithBackend().catch((err) => console.warn("Vault sync error:", err));
  }, [syncWithBackend]);

  // Metrics
  const totalChunks = useMemo(() => {
    return uploadedDocuments.reduce((sum, d) => sum + (d.chunks || d.vectorsStored || 1), 0);
  }, [uploadedDocuments]);

  const totalVolumeMB = useMemo(() => {
    const bytes = uploadedDocuments.reduce((sum, d) => sum + parseFileSize(d.fileSize || d.size), 0);
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [uploadedDocuments]);

  // Window drag events for effortless upload
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOverWindow(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsDraggingOverWindow(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOverWindow(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return uploadedDocuments.filter((doc) => {
      const title = (doc.title || doc.name || "").toLowerCase();
      const summary = (doc.summary || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      if (q && !title.includes(q) && !summary.includes(q)) {
        return false;
      }

      if (selectedSpaceFilter !== "all") {
        if (selectedSpaceFilter === "unassigned") {
          if (doc.spaceId) return false;
        } else if (doc.spaceId !== selectedSpaceFilter) {
          return false;
        }
      }

      if (selectedCategory !== "all") {
        const cat = getFormatCategory(doc.title || doc.name || doc.type);
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [uploadedDocuments, searchQuery, selectedSpaceFilter, selectedCategory]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: uploadedDocuments.length,
      pdf: 0,
      document: 0,
      markdown: 0,
      code: 0,
      data: 0,
    };
    uploadedDocuments.forEach((d) => {
      const cat = getFormatCategory(d.title || d.name || d.type);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [uploadedDocuments]);

  // Default selection for studio view
  useEffect(() => {
    if (viewMode === "studio" && !selectedDocId && filteredDocuments.length > 0) {
      setSelectedDocId(filteredDocuments[0].id);
    }
  }, [viewMode, selectedDocId, filteredDocuments]);

  // Fetch or construct document detail for Studio or Quick Peek
  const activeTargetDoc = useMemo(() => {
    if (quickPeekDoc) return quickPeekDoc;
    if (viewMode === "studio") {
      return filteredDocuments.find((d) => d.id === selectedDocId) || filteredDocuments[0] || null;
    }
    return null;
  }, [quickPeekDoc, viewMode, selectedDocId, filteredDocuments]);

  useEffect(() => {
    if (!activeTargetDoc) {
      setDocDetail(null);
      return;
    }

    // High quality sample or local documents
    if (activeTargetDoc.id.startsWith("sample-doc-") || activeTargetDoc.id.startsWith("doc-local-")) {
      const title = activeTargetDoc.title || activeTargetDoc.name || "Document";
      const summary = activeTargetDoc.summary || "Document parsed and indexed into Knowledge Vault.";
      const sampleChunks: DocumentChunkDetail[] = [
        {
          id: `${activeTargetDoc.id}-chunk-1`,
          chunk_index: 0,
          content_text: `[Section 1: Architectural Foundation & Execution Scope]\n${summary}\n\nCore Invariant: Strict schema verification and semantic contract validation are enforced before committing passages to vector memory.`,
          page_number: 1,
          token_count: 142,
          embedding_status: "ready",
        },
        {
          id: `${activeTargetDoc.id}-chunk-2`,
          chunk_index: 1,
          content_text: `[Section 2: Vector Embeddings & Grounding Validation]\nDense 384-dimensional vector representations stored in Qdrant collection with cosine distance metric. Benchmark tests demonstrate sub-4ms p99 retrieval latency under concurrent multi-agent traffic.`,
          page_number: 2,
          token_count: 168,
          embedding_status: "ready",
        },
        {
          id: `${activeTargetDoc.id}-chunk-3`,
          chunk_index: 2,
          content_text: `[Section 3: State Recovery & Fault Tolerance]\nLog replication occurs across quorum partitions. Each state change is committed synchronously to database storage and mirrored into Qdrant for real-time semantic retrieval.`,
          page_number: 3,
          token_count: 125,
          embedding_status: "ready",
        },
      ];

      setDocDetail({
        id: activeTargetDoc.id,
        space_id: activeTargetDoc.spaceId || "",
        title: title,
        summary: summary,
        chunks: sampleChunks,
      });
      return;
    }

    // Backend remote documents
    queryMindApi
      .getDocument(activeTargetDoc.id)
      .then((detail) => setDocDetail(detail))
      .catch(() => {
        setDocDetail({
          id: activeTargetDoc.id,
          space_id: activeTargetDoc.spaceId || "",
          title: activeTargetDoc.title || activeTargetDoc.name || "Document",
          summary: activeTargetDoc.summary,
          chunks: activeTargetDoc.summary
            ? [
                {
                  id: `${activeTargetDoc.id}-c0`,
                  chunk_index: 0,
                  content_text: activeTargetDoc.summary,
                  token_count: Math.round(activeTargetDoc.summary.length / 4),
                  embedding_status: "ready",
                },
              ]
            : [],
        });
      });
  }, [activeTargetDoc]);

  // Upload handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);

    const fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    const ext = file.name.split(".").pop() || "doc";

    try {
      const data = await queryMindApi.uploadDocument(file, undefined);
      const assignedSpaceId = data.space_id || activeSpaceId || undefined;

      const newDoc = addDocument({
        id: data.document_id,
        name: data.filename || file.name,
        type: ext,
        size: fileSizeStr,
        chunks: data.chunks_created || 1,
        vectorsStored: data.vectors_stored || 1,
        spaceId: assignedSpaceId,
        summary: data.first_chunk_preview
          ? `Preview: ${data.first_chunk_preview}`
          : `Document parsed and indexed into vector knowledge.`,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#FFFFFF", "#818CF8", "#10B981"],
      });

      setSelectedDocId(newDoc.id);
    } catch {
      const localDoc = addDocument({
        id: `doc-local-${Date.now()}`,
        name: file.name,
        type: ext,
        size: fileSizeStr,
        chunks: 1,
        spaceId: activeSpaceId || undefined,
        summary: `Document indexed locally into Knowledge Vault.`,
      });
      setSelectedDocId(localDoc.id);
    } finally {
      setIsUploading(false);
    }
  };

  // Load curated sample documents
  const handleLoadSampleDocs = () => {
    const samples = [
      {
        id: `sample-doc-raft-${Date.now() + 1}`,
        name: "Distributed_Consensus_Raft_vs_Paxos.pdf",
        title: "Distributed_Consensus_Raft_vs_Paxos.pdf",
        type: "pdf",
        fileSize: "2.4 MB",
        size: "2.4 MB",
        chunks: 14,
        vectorsStored: 14,
        spaceId: spaces[0]?.id || undefined,
        summary: "Comparative analysis of Raft leader election, randomized election timeouts, log replication invariants, and Byzantine fault tolerance in distributed clusters.",
      },
      {
        id: `sample-doc-qdrant-${Date.now() + 2}`,
        name: "Dense_Retrieval_and_Vector_Indexing_Qdrant.md",
        title: "Dense_Retrieval_and_Vector_Indexing_Qdrant.md",
        type: "md",
        fileSize: "840 KB",
        size: "840 KB",
        chunks: 8,
        vectorsStored: 8,
        spaceId: spaces[1]?.id || spaces[0]?.id || undefined,
        summary: "HNSW graph parameters, scalar quantization trade-offs, and hybrid search RRF reranking strategies for low-latency semantic grounding.",
      },
      {
        id: `sample-doc-agents-${Date.now() + 3}`,
        name: "Autonomous_Agent_State_Orchestration.py",
        title: "Autonomous_Agent_State_Orchestration.py",
        type: "py",
        fileSize: "140 KB",
        size: "140 KB",
        chunks: 5,
        vectorsStored: 5,
        spaceId: spaces[1]?.id || spaces[0]?.id || undefined,
        summary: "LangGraph-style cyclic supervisor agent loop with tool-reflection, memory compression, and schema-constrained tool execution in Python.",
      },
      {
        id: `sample-doc-api-${Date.now() + 4}`,
        name: "Microservices_Idempotency_API_RFC.docx",
        title: "Microservices_Idempotency_API_RFC.docx",
        type: "docx",
        fileSize: "1.1 MB",
        size: "1.1 MB",
        chunks: 6,
        vectorsStored: 6,
        spaceId: spaces[0]?.id || undefined,
        summary: "Production standard for distributed transactional outbox pattern, idempotency keys in payment pipelines, and zero-downtime database migrations.",
      },
      {
        id: `sample-doc-ranking-${Date.now() + 5}`,
        name: "Candidate_Recommendation_Ranking_Whitepaper.pdf",
        title: "Candidate_Recommendation_Ranking_Whitepaper.pdf",
        type: "pdf",
        fileSize: "3.8 MB",
        size: "3.8 MB",
        chunks: 22,
        vectorsStored: 22,
        spaceId: spaces[0]?.id || undefined,
        summary: "Deep two-tower neural candidate generation and multi-task ranking architectures powering real-time personalized discovery feeds.",
      },
      {
        id: `sample-doc-cohorts-${Date.now() + 6}`,
        name: "Q3_Customer_Retention_Cohort_Metrics.csv",
        title: "Q3_Customer_Retention_Cohort_Metrics.csv",
        type: "csv",
        fileSize: "520 KB",
        size: "520 KB",
        chunks: 4,
        vectorsStored: 4,
        spaceId: spaces[2]?.id || spaces[0]?.id || undefined,
        summary: "Cohort-based retention curves, activation funnels, churn probability signals, and monthly recurring revenue progression across 12 product tiers.",
      },
    ];

    samples.forEach((d) => addDocument(d));
    if (samples[0]) {
      setSelectedDocId(samples[0].id);
    }

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FFFFFF", "#818CF8", "#10B981"],
    });
  };

  // Delete handler
  const handleDelete = (docId: string) => {
    if (!confirm("Remove this document from Knowledge Vault?")) return;
    deleteDocument(docId);
    if (selectedDocId === docId) {
      setSelectedDocId(null);
    }
  };

  // Download handler
  const handleDownload = async (docId: string, title?: string) => {
    try {
      const blob = await queryMindApi.downloadDocument(docId);
      downloadBlob(blob, title || "document");
    } catch {
      alert("Document binary download unavailable in local session mode.");
    }
  };

  // Copy text helper
  const handleCopyText = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedChunkId(id);
      setTimeout(() => setCopiedChunkId(null), 1800);
    }
  };

  const getSpaceName = (spaceId?: string) => {
    if (!spaceId) return "General Workspace";
    const found = spaces.find((s) => s.id === spaceId);
    return found ? found.name : "General Workspace";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "60px" }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept=".pdf,.docx,.doc,.txt,.md,.markdown,.json,.csv,.tsv,.py,.js,.ts,.tsx,.jsx,.yaml,.yml,.sql"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Drag & Drop Window Overlay */}
      {isMounted && isDraggingOverWindow && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed #FFFFFF",
            margin: "24px",
            borderRadius: "20px",
          }}
        >
          <Upload size={48} style={{ color: "#FFFFFF", marginBottom: "16px" }} />
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
            Drop files to vectorize into Knowledge Vault
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "8px" }}>
            Supports PDF, Word, Markdown, Code, JSON, and CSV
          </p>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. HERO & TELEMETRY HUD (Matches Spaces Page Standard)
          ───────────────────────────────────────────────────────────── */}
      <div
        className="stagger"
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
                # SECOND BRAIN KNOWLEDGE VAULT
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
              Knowledge Vault
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "6px", maxWidth: "600px", fontSize: "14px", lineHeight: "1.5" }}>
              Ground your intelligence workflows in verified source documents. Partition, inspect semantic chunks, and query with high-precision vector recall.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isUploading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 10px rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "transform 150ms ease",
              }}
            >
              {isUploading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
              <span>{isUploading ? "Indexing..." : "Upload Documents"}</span>
            </button>

            {uploadedDocuments.length === 0 && (
              <button
                onClick={handleLoadSampleDocs}
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
                <Sparkles size={15} style={{ color: "var(--accent)" }} />
                <span>Load Sample Vault</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Metrics Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            marginTop: "28px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Indexed Documents</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              <AnimatedCounter target={uploadedDocuments.length} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Semantic Chunks</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              <AnimatedCounter target={totalChunks} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Storage Volume</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {totalVolumeMB} MB
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>Vector Grounding</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#10B981", marginTop: "4px" }}>
              Qdrant ANN Active
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTERS & SEARCH BAR (Matches Spaces Standard)
          ───────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "420px" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}>
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Search documents, concepts, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 14px 9px 36px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          {/* Controls: Space Selector & View Mode Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={selectedSpaceFilter}
              onChange={(e) => setSelectedSpaceFilter(e.target.value)}
              aria-label="Filter by space"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Spaces</option>
              <option value="unassigned">Unassigned / General</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div
              style={{
                display: "flex",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "2px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: viewMode === "grid" ? "#FFFFFF" : "transparent",
                  color: viewMode === "grid" ? "#000000" : "var(--text-secondary)",
                  fontSize: "12px",
                  fontWeight: viewMode === "grid" ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <LayoutGrid size={14} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("studio")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: viewMode === "studio" ? "#FFFFFF" : "transparent",
                  color: viewMode === "studio" ? "#000000" : "var(--text-secondary)",
                  fontSize: "12px",
                  fontWeight: viewMode === "studio" ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Columns size={14} />
                <span>Studio</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {CATEGORY_TAGS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: selectedCategory === cat.id ? "1px solid #FFFFFF" : "1px solid var(--border)",
                background: selectedCategory === cat.id ? "#FFFFFF" : "var(--surface)",
                color: selectedCategory === cat.id ? "#000000" : "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: selectedCategory === cat.id ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 150ms ease",
              }}
            >
              {cat.label} ({categoryCounts[cat.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT: CARDS GRID VIEW OR STUDIO SPLIT VIEW
          ───────────────────────────────────────────────────────────── */}
      {uploadedDocuments.length === 0 ? (
        /* Empty State */
        <div
          style={{
            padding: "54px 24px",
            textAlign: "center",
            borderRadius: "16px",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-primary)",
            }}
          >
            <Upload size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              No Documents Indexed Yet
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "460px", margin: "6px 0 0 0", lineHeight: 1.5 }}>
              Upload your research papers, notes, codebases, or datasets to power semantic grounding and autonomous AI reasoning.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Upload Document
            </button>
            <button
              onClick={handleLoadSampleDocs}
              style={{
                padding: "9px 18px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Load Sample Second Brain Docs
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Grid Cards View (Matches Spaces Card Layout) ── */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredDocuments.map((doc) => {
            const cat = getFormatCategory(doc.title || doc.name || doc.type);
            const spaceName = getSpaceName(doc.spaceId);

            return (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDocId(doc.id);
                  setViewMode("studio");
                }}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "22px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 200ms ease",
                  boxShadow: "var(--shadow-xs)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-xs)";
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
                    background: "linear-gradient(90deg, rgba(255, 255, 255, 0.25) 0%, transparent 100%)",
                  }}
                />

                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "var(--surface-hover)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid var(--border)",
                        flexShrink: 0,
                      }}
                    >
                      {renderFormatIcon(cat)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={doc.title || doc.name}
                      >
                        {doc.title || doc.name}
                      </h3>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        {doc.fileSize || doc.size || "1.0 MB"} · {doc.chunks || 1} chunks
                      </span>
                    </div>
                  </div>

                  {/* Format Badge & Delete */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {doc.type ? doc.type.toUpperCase() : "DOC"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: "4px",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        borderRadius: "4px",
                      }}
                      title="Delete document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Card Body / Description */}
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    margin: "0 0 16px 0",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    flex: 1,
                  }}
                >
                  {doc.summary || "Document indexed into Knowledge Vault with vector grounding."}
                </p>

                {/* Card Footer */}
                <div
                  style={{
                    paddingTop: "14px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-tertiary)", minWidth: 0 }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {spaceName}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickPeekDoc(doc);
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Eye size={12} />
                      <span>Chunks</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStudyModalDoc(doc);
                      }}
                      title="Study Mode & Linked Goal Tasks"
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        background: "rgba(59, 130, 246, 0.12)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        color: "#60A5FA",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <BookOpen size={12} />
                      <span>Study</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const title = doc.title || doc.name || "this document";
                        router.push(`/chat?q=${encodeURIComponent(`Analyze and answer questions about "${title}": `)}`);
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        color: "#818CF8",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Sparkles size={12} />
                      <span>Ask AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(doc.id, doc.title || doc.name);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: "4px",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                      }}
                      title="Download file"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Studio Split Workspace View ── */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px 1fr",
            gap: "20px",
            minHeight: "680px",
            alignItems: "start",
          }}
        >
          {/* Left Column: Document Navigator */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                Documents ({filteredDocuments.length})
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                Click to inspect
              </span>
            </div>

            <div style={{ maxHeight: "640px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {filteredDocuments.map((d) => {
                const isSelected = (activeTargetDoc?.id === d.id);
                const cat = getFormatCategory(d.title || d.name || d.type);
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDocId(d.id)}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border)",
                      background: isSelected ? "var(--surface-hover)" : "transparent",
                      borderLeft: isSelected ? "3px solid #FFFFFF" : "3px solid transparent",
                      cursor: "pointer",
                      transition: "background 150ms ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      {renderFormatIcon(cat, 15)}
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {d.title || d.name}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                      <span>{d.fileSize || d.size}</span>
                      <span>•</span>
                      <span>{d.chunks || 1} chunks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Reading & Chunk Inspector */}
          {activeTargetDoc ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {/* Document Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {activeTargetDoc.type ? activeTargetDoc.type.toUpperCase() : "DOC"}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                      Filed in <strong style={{ color: "var(--text-primary)" }}>{getSpaceName(activeTargetDoc.spaceId)}</strong>
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#10B981" }}>
                      <ShieldCheck size={13} />
                      <span>Qdrant Grounded</span>
                    </span>
                  </div>

                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    {activeTargetDoc.title || activeTargetDoc.name}
                  </h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setStudyModalDoc(activeTargetDoc)}
                    title="Study Mode & Linked Goal Tasks"
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#60A5FA",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <BookOpen size={14} />
                    <span>Study Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const title = activeTargetDoc.title || activeTargetDoc.name || "this document";
                      router.push(`/chat?q=${encodeURIComponent(`Analyze and answer questions about "${title}": `)}`);
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#FFFFFF",
                      color: "#000000",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Ask AI Copilot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(activeTargetDoc.id, activeTargetDoc.title || activeTargetDoc.name)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface-hover)",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(activeTargetDoc.id)}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface-hover)",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                    }}
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs: AI Summary vs Chunks */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "20px" }}>
                <button
                  type="button"
                  onClick={() => setStudioTab("summary")}
                  style={{
                    padding: "10px 0",
                    border: "none",
                    background: "none",
                    borderBottom: studioTab === "summary" ? "2px solid #FFFFFF" : "2px solid transparent",
                    color: studioTab === "summary" ? "#FFFFFF" : "var(--text-tertiary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  AI Executive Summary
                </button>
                <button
                  type="button"
                  onClick={() => setStudioTab("chunks")}
                  style={{
                    padding: "10px 0",
                    border: "none",
                    background: "none",
                    borderBottom: studioTab === "chunks" ? "2px solid #FFFFFF" : "2px solid transparent",
                    color: studioTab === "chunks" ? "#FFFFFF" : "var(--text-tertiary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Semantic Chunks</span>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {docDetail?.chunks?.length || activeTargetDoc.chunks || 1}
                  </span>
                </button>
              </div>

              {/* Tab 1: AI Summary & Metadata */}
              {studioTab === "summary" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div
                    style={{
                      padding: "20px",
                      borderRadius: "12px",
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                      Autonomous Knowledge Synthesis
                    </div>
                    <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
                      {docDetail?.summary || activeTargetDoc.summary || "No executive summary available."}
                    </p>
                  </div>

                  {/* Metadata Specs Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                    <div style={{ padding: "14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-hover)" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Vector Dimension</div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
                        384-dim Dense
                      </div>
                    </div>
                    <div style={{ padding: "14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-hover)" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>ANN Distance Metric</div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
                        Cosine Distance
                      </div>
                    </div>
                    <div style={{ padding: "14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-hover)" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Grounding Engine</div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#10B981", marginTop: "4px" }}>
                        Qdrant Collection
                      </div>
                    </div>
                    <div style={{ padding: "14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-hover)" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>File Footprint</div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
                        {activeTargetDoc.fileSize || activeTargetDoc.size || "1.0 MB"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Semantic Chunks Viewer */}
              {studioTab === "chunks" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Search inside chunks */}
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}>
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Filter inside semantic chunks..."
                      value={chunkSearch}
                      onChange={(e) => setChunkSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 34px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--surface-hover)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Chunks List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "480px", overflowY: "auto" }}>
                    {(docDetail?.chunks || [])
                      .filter((c) => !chunkSearch || c.content_text.toLowerCase().includes(chunkSearch.toLowerCase()))
                      .map((chunk, idx) => (
                        <div
                          key={chunk.id || idx}
                          style={{
                            padding: "16px",
                            borderRadius: "10px",
                            background: "var(--surface-hover)",
                            border: "1px solid var(--border)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#818CF8" }}>
                                Chunk #{chunk.chunk_index + 1}
                              </span>
                              {chunk.page_number && (
                                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                  Page {chunk.page_number}
                                </span>
                              )}
                              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                {chunk.token_count || 120} tokens
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyText(chunk.id, chunk.content_text)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "none",
                                border: "none",
                                color: copiedChunkId === chunk.id ? "#10B981" : "var(--text-tertiary)",
                                fontSize: "11px",
                                cursor: "pointer",
                              }}
                            >
                              {copiedChunkId === chunk.id ? <Check size={12} /> : <Copy size={12} />}
                              <span>{copiedChunkId === chunk.id ? "Copied" : "Copy"}</span>
                            </button>
                          </div>

                          <div
                            style={{
                              fontSize: "13px",
                              color: "var(--text-primary)",
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                              fontFamily: "var(--sans)",
                            }}
                          >
                            {chunk.content_text}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                borderRadius: "14px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontSize: "14px",
              }}
            >
              Select a document on the left to inspect its semantic chunks and grounding status.
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. QUICK DOCUMENT PEEK MODAL (Clean Centered Dialog)
          ───────────────────────────────────────────────────────────── */}
      {isMounted && quickPeekDoc && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setQuickPeekDoc(null)}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                {renderFormatIcon(getFormatCategory(quickPeekDoc.title || quickPeekDoc.name || quickPeekDoc.type), 20)}
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {quickPeekDoc.title || quickPeekDoc.name}
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {getSpaceName(quickPeekDoc.spaceId)} • {quickPeekDoc.fileSize || quickPeekDoc.size}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickPeekDoc(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: "6px" }}>
                  Autonomous Synthesis
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, margin: 0 }}>
                  {quickPeekDoc.summary || "Document parsed and indexed into vector knowledge."}
                </p>
              </div>

              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "10px" }}>
                  Semantic Chunks ({docDetail?.chunks?.length || quickPeekDoc.chunks || 1})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(docDetail?.chunks || []).map((chunk, idx) => (
                    <div
                      key={chunk.id || idx}
                      style={{
                        padding: "14px",
                        borderRadius: "8px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#818CF8" }}>
                          Chunk #{chunk.chunk_index + 1} • {chunk.token_count || 120} tokens
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(chunk.id, chunk.content_text)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "none",
                            border: "none",
                            color: copiedChunkId === chunk.id ? "#10B981" : "var(--text-tertiary)",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          {copiedChunkId === chunk.id ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedChunkId === chunk.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                        {chunk.content_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const title = quickPeekDoc.title || quickPeekDoc.name || "this document";
                  setQuickPeekDoc(null);
                  router.push(`/chat?q=${encodeURIComponent(`Analyze and answer questions about "${title}": `)}`);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#FFFFFF",
                  color: "#000000",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={14} />
                <span>Ask AI About This Document</span>
              </button>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const doc = quickPeekDoc;
                      setQuickPeekDoc(null);
                      setStudyModalDoc(doc);
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#60A5FA",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <BookOpen size={14} />
                    <span>Open in Study Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickPeekDoc(null)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface-hover)",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Document Study Reader Modal with Live Goal Tasks Companion */}
      <DocumentStudyReaderModal
        document={studyModalDoc}
        isOpen={!!studyModalDoc}
        onClose={() => setStudyModalDoc(null)}
      />
    </div>
  );
}
