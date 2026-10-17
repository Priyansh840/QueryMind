"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  Sparkles,
  X,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  FolderPlus,
  FolderOpen,
  CheckSquare,
  Square,
  FileCode,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Layers,
  HardDrive,
  Database,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import { queryMindApi, downloadBlob } from "@/lib/api";

type ViewMode = "table" | "grid";
type SortOption = "newest" | "oldest" | "name" | "size";

function getFormatCategory(typeOrTitle: string): "pdf" | "markdown" | "document" | "data" | "code" | "other" {
  const ext = (typeOrTitle || "").toLowerCase().split(".").pop() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["md", "markdown", "txt", "rtf"].includes(ext)) return "markdown";
  if (["doc", "docx", "odt", "pages"].includes(ext)) return "document";
  if (["csv", "tsv", "xlsx", "xls", "json"].includes(ext)) return "data";
  if (["js", "ts", "tsx", "jsx", "py", "sql", "html", "css", "yaml", "yml"].includes(ext)) return "code";
  return "other";
}

function getFormatBadgeColor(category: string) {
  switch (category) {
    case "pdf":
      return { bg: "rgba(244, 63, 94, 0.12)", text: "#F43F5E", border: "rgba(244, 63, 94, 0.25)" };
    case "markdown":
      return { bg: "rgba(99, 102, 241, 0.12)", text: "#818CF8", border: "rgba(99, 102, 241, 0.25)" };
    case "document":
      return { bg: "rgba(56, 189, 248, 0.12)", text: "#38BDF8", border: "rgba(56, 189, 248, 0.25)" };
    case "data":
      return { bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.25)" };
    case "code":
      return { bg: "rgba(16, 185, 129, 0.12)", text: "#10B981", border: "rgba(16, 185, 129, 0.25)" };
    default:
      return { bg: "rgba(161, 161, 170, 0.12)", text: "#A1A1AA", border: "rgba(161, 161, 170, 0.25)" };
  }
}

function renderFormatIcon(category: string, className = "w-4 h-4") {
  switch (category) {
    case "pdf":
      return <FileText className={`${className} text-rose-400`} />;
    case "markdown":
      return <FileText className={`${className} text-indigo-400`} />;
    case "document":
      return <FileText className={`${className} text-sky-400`} />;
    case "data":
      return <FileSpreadsheet className={`${className} text-amber-400`} />;
    case "code":
      return <FileCode className={`${className} text-emerald-400`} />;
    default:
      return <FileText className={`${className} text-zinc-400`} />;
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

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Selection & Inspector
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeInspectedDoc, setActiveInspectedDoc] = useState<KnowledgeObject | null>(null);

  // Drag & Drop
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const dragCounter = useRef(0);

  // Upload & Operations
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // Space Suggestion Modal / Card
  const [proposedSpaceSuggestion, setProposedSpaceSuggestion] = useState<{
    documentId: string;
    documentName: string;
    proposedName: string;
    proposedDescription: string;
    proposedIcon?: string;
  } | null>(null);
  const [isApprovingSpace, setIsApprovingSpace] = useState(false);

  // Move Space Modal
  const [isMoveSpaceOpen, setIsMoveSpaceOpen] = useState(false);
  const [movingSpaceDocId, setMovingSpaceDocId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zustand Store
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const addDocument = useMyndStore((state) => state.addDocument);
  const deleteDocument = useMyndStore((state) => state.deleteDocument);
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  // Synchronize documents with backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchBackendDocs = async () => {
      try {
        const docs = await queryMindApi.listDocuments();
        if (isMounted && Array.isArray(docs) && docs.length > 0) {
          const currentUploaded = useMyndStore.getState().uploadedDocuments;
          docs.forEach(
            (d: {
              id: string;
              title: string;
              type?: string;
              file_type?: string;
              file_size?: number;
              space_id?: string;
              summary?: string;
            }) => {
              const exists = currentUploaded.some((u) => u.id === d.id || u.title === d.title);
              if (!exists) {
                const ext = d.title.includes(".") ? d.title.split(".").pop() || "pdf" : d.type || "pdf";
                addDocument({
                  id: d.id,
                  name: d.title,
                  type: ext,
                  size: d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(2)} MB` : "1.2 MB",
                  chunks: 1,
                  spaceId: d.space_id || activeSpaceId || undefined,
                  summary: d.summary || `Indexed document ready for AI reasoning.`,
                });
              }
            }
          );
        }
      } catch {
        // Fallback to local store
      }
    };
    fetchBackendDocs();
    return () => {
      isMounted = false;
    };
  }, [addDocument, activeSpaceId]);

  // Ambient Full-Window Drag & Drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsWindowDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsWindowDragging(false);
      dragCounter.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDropEvent = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsWindowDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDropEvent);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDropEvent);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDropEvent]);

  // Keyboard shortcut listener (Esc to close inspector, Command+K to search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveInspectedDoc(null);
        setIsExportMenuOpen(false);
        setIsMoveSpaceOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Upload handler
  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    const fileSizeStr = `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;
    const ext = selectedFile.name.split(".").pop() || "doc";

    try {
      const data = await queryMindApi.uploadDocument(selectedFile, undefined);
      const assignedSpaceId = data.space_id || activeSpaceId || undefined;
      const assignedSpaceName = data.space_name ? ` (Filed in ${data.space_name})` : "";

      const newDoc = addDocument({
        id: data.document_id,
        name: data.filename || selectedFile.name,
        type: ext,
        size: fileSizeStr,
        chunks: data.chunks_created || 1,
        vectorsStored: data.vectors_stored || 1,
        spaceId: assignedSpaceId,
        summary: data.first_chunk_preview
          ? `Preview: ${data.first_chunk_preview}`
          : `Ready for search and AI reasoning.`,
      });

      setUploadStatus({
        type: "success",
        message: `Indexed "${data.filename || selectedFile.name}"${assignedSpaceName} into vector knowledge.`,
      });

      setActiveInspectedDoc(newDoc);

      if (data.suggested_new_space && data.suggested_new_space.name) {
        setProposedSpaceSuggestion({
          documentId: data.document_id,
          documentName: data.filename || selectedFile.name,
          proposedName: data.suggested_new_space.name,
          proposedDescription: data.suggested_new_space.description || "Dedicated domain workspace",
          proposedIcon: data.suggested_new_space.icon || "📁",
        });
      }
    } catch (err: unknown) {
      const localDoc = addDocument({
        id: `doc-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: selectedFile.name,
        type: ext,
        size: fileSizeStr,
        chunks: 1,
        spaceId: activeSpaceId || undefined,
        summary: `Document added to your library.`,
      });

      setActiveInspectedDoc(localDoc);

      setUploadStatus({
        type: "error",
        message: `Saved locally. Backend sync unavailable: ${
          err instanceof Error ? err.message : "Connection error"
        }`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveNewSpace = async () => {
    if (!proposedSpaceSuggestion) return;
    setIsApprovingSpace(true);
    try {
      const res = await queryMindApi.moveDocument(proposedSpaceSuggestion.documentId, "new", {
        createSpaceIfMissing: true,
        newSpaceName: proposedSpaceSuggestion.proposedName,
        newSpaceDescription: proposedSpaceSuggestion.proposedDescription,
      });

      deleteDocument(proposedSpaceSuggestion.documentId);
      const newDoc = addDocument({
        id: res.document_id,
        name: res.filename,
        type: "PDF",
        size: "Document",
        chunks: 1,
        spaceId: res.new_space_id,
        summary: `Organized into space "${res.new_space_name}".`,
      });

      setActiveInspectedDoc(newDoc);

      const allSpaces = await queryMindApi.getSpaces();
      useMyndStore.setState({
        spaces: allSpaces.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug || s.name.toLowerCase().replace(/\s+/g, "-"),
          desc: s.description || "Workspace",
          count: 1,
          status: "synced" as const,
          color: s.color || "#6366f1",
          icon: s.icon || "folder",
          pinned: false,
          updated: "Just now",
        })),
      });

      setUploadStatus({
        type: "success",
        message: `Created space "${res.new_space_name}" and organized document into it.`,
      });
      setProposedSpaceSuggestion(null);
    } catch (err: any) {
      alert("Could not create space: " + (err.message || err));
    } finally {
      setIsApprovingSpace(false);
    }
  };

  const handleDelete = async (docId?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!docId) return;
    if (!confirm("Are you sure you want to remove this document from your Knowledge Vault?")) return;
    try {
      await queryMindApi.deleteDocument(docId);
    } catch {
      // Continue locally
    }
    deleteDocument(docId);
    setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
    if (activeInspectedDoc?.id === docId) {
      setActiveInspectedDoc(null);
    }
  };

  const handleDownloadSingle = async (docId?: string, docTitle?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!docId) return;
    setDownloadingDocId(docId);
    try {
      const blob = await queryMindApi.downloadDocument(docId);
      downloadBlob(blob, docTitle || "document");
    } catch (err: any) {
      alert(`Download failed: ${err.message || err}`);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocIds.length === 0) return;
    setIsBulkDownloading(true);
    try {
      const blob = await queryMindApi.bulkDownloadDocuments(selectedDocIds);
      downloadBlob(blob, `querymind_documents_${Date.now()}.zip`);
    } catch (err: any) {
      alert(`Bulk download failed: ${err.message || err}`);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleExportKnowledge = async (fmt: "csv" | "json" | "markdown") => {
    setIsExportMenuOpen(false);
    try {
      const blob = await queryMindApi.exportKnowledge(activeSpaceId || undefined, fmt);
      const ext = fmt === "markdown" ? "md" : fmt;
      downloadBlob(blob, `knowledge_vault_${fmt}_${Date.now()}.${ext}`);
    } catch (err: any) {
      alert(`Knowledge export failed: ${err.message || err}`);
    }
  };

  const toggleSelectDoc = (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map((f) => f.id));
    }
  };

  const handleMoveSpace = async (targetSpaceId: string) => {
    if (!movingSpaceDocId) return;
    try {
      await queryMindApi.moveDocument(movingSpaceDocId, targetSpaceId);
      const currentDoc = uploadedDocuments.find((d) => d.id === movingSpaceDocId);
      if (currentDoc) {
        addDocument({
          ...currentDoc,
          name: currentDoc.title || currentDoc.name || "Document",
          size: currentDoc.fileSize || currentDoc.size || "1.0 MB",
          chunks: currentDoc.chunks ?? 1,
          spaceId: targetSpaceId,
        });
        if (activeInspectedDoc?.id === movingSpaceDocId) {
          setActiveInspectedDoc({
            ...activeInspectedDoc,
            spaceId: targetSpaceId,
          });
        }
      }
      setIsMoveSpaceOpen(false);
      setMovingSpaceDocId(null);
    } catch (err: any) {
      alert("Failed to move space: " + (err.message || err));
    }
  };

  // Metrics computation
  const totalVolumeBytes = useMemo(() => {
    return uploadedDocuments.reduce((acc, doc) => acc + parseFileSize(doc.fileSize || doc.size), 0);
  }, [uploadedDocuments]);

  const formattedTotalVolume = useMemo(() => {
    if (totalVolumeBytes > 1024 * 1024 * 1024) return `${(totalVolumeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (totalVolumeBytes > 1024 * 1024) return `${(totalVolumeBytes / (1024 * 1024)).toFixed(1)} MB`;
    if (totalVolumeBytes > 1024) return `${(totalVolumeBytes / 1024).toFixed(0)} KB`;
    return `${totalVolumeBytes} B`;
  }, [totalVolumeBytes]);

  const distinctSpacesCount = useMemo(() => {
    const spaceSet = new Set(uploadedDocuments.map((d) => d.spaceId).filter(Boolean));
    return spaceSet.size;
  }, [uploadedDocuments]);

  // Filter & Sort Pipeline
  const filteredDocuments = useMemo(() => {
    const seen = new Set<string>();
    let list = uploadedDocuments.filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);

      const titleMatch = (doc.title || doc.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const summaryMatch = (doc.summary || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (searchQuery && !titleMatch && !summaryMatch) return false;

      if (selectedFormat !== "all") {
        const cat = getFormatCategory(doc.title || doc.name || doc.type);
        if (cat !== selectedFormat) return false;
      }

      if (selectedSpaceFilter !== "all") {
        if (selectedSpaceFilter === "unassigned") {
          if (doc.spaceId) return false;
        } else if (doc.spaceId !== selectedSpaceFilter) {
          return false;
        }
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "name") {
        return (a.title || a.name || "").localeCompare(b.title || b.name || "");
      }
      if (sortBy === "size") {
        return parseFileSize(b.fileSize || b.size) - parseFileSize(a.fileSize || a.size);
      }
      if (sortBy === "oldest") {
        return (a.id || "").localeCompare(b.id || "");
      }
      return (b.id || "").localeCompare(a.id || "");
    });

    return list;
  }, [uploadedDocuments, searchQuery, selectedFormat, selectedSpaceFilter, sortBy]);

  // Format count badges
  const formatCounts = useMemo(() => {
    const counts = { all: uploadedDocuments.length, pdf: 0, markdown: 0, document: 0, data: 0, code: 0 };
    uploadedDocuments.forEach((doc) => {
      const cat = getFormatCategory(doc.title || doc.name || doc.type);
      if (cat in counts) {
        counts[cat as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [uploadedDocuments]);

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col relative pb-28 text-white select-none">
      {/* ── Ambient Full-Window Drag & Drop Overlay ── */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-black/70 backdrop-blur-md flex items-center justify-center p-8 transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-2xl border-2 border-dashed border-indigo-500/80 rounded-2xl bg-zinc-950/80 p-12 text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Drop files anywhere to index into Knowledge Vault
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Supports PDF, Word, Markdown, Code, JSON, and CSV documents with instant RAG embedding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.doc,.txt,.md,.markdown,.json,.csv,.tsv,.xml,.html,.py,.js,.ts,.tsx,.jsx,.yaml,.yml,.log,.rst,.sql"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* ── Top Header & Pulse Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Knowledge Vault</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-zinc-300 border border-white/10">
              {uploadedDocuments.length} Indexed
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Grounding evidence and document intelligence for your autonomous AI workspaces.
          </p>
        </div>

        {/* Primary Actions Group */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isUploading ? "Ingesting..." : "Upload Document"}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4 text-zinc-400" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-zinc-900 border border-white/10 shadow-xl p-1 z-40">
                <button
                  type="button"
                  onClick={() => handleExportKnowledge("csv")}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Export as CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportKnowledge("json")}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Export as JSON (.json)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportKnowledge("markdown")}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Export as Markdown (.md)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Knowledge Metric Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">Documents</div>
            <div className="text-base font-bold text-white mt-0.5">{uploadedDocuments.length}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-300">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">Ingested Size</div>
            <div className="text-base font-bold text-white mt-0.5 font-mono">{formattedTotalVolume}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-300">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">Spaces Linked</div>
            <div className="text-base font-bold text-white mt-0.5">{distinctSpacesCount}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">Grounding Index</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">Vector Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Toast ── */}
      {uploadStatus && (
        <div
          className={`mb-6 p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
            uploadStatus.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {uploadStatus.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadStatus(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Space Suggestion Card ── */}
      {proposedSpaceSuggestion && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">
              {proposedSpaceSuggestion.proposedIcon || "📁"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  Create space for &quot;{proposedSpaceSuggestion.documentName}&quot;?
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {proposedSpaceSuggestion.proposedName}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {proposedSpaceSuggestion.proposedDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setProposedSpaceSuggestion(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-white/10"
            >
              Keep in General
            </button>
            <button
              type="button"
              onClick={handleApproveNewSpace}
              disabled={isApprovingSpace}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            >
              {isApprovingSpace ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5" />
              )}
              <span>Approve & Create</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Command & Filter Bar ── */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search files, concepts, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Space Filter & Sort Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSpaceFilter}
              onChange={(e) => setSelectedSpaceFilter(e.target.value)}
              aria-label="Filter by space"
              className="px-3 py-2 rounded-lg bg-zinc-900/80 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-white/30"
            >
              <option value="all">All Spaces</option>
              <option value="unassigned">Unassigned / General</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-white/10">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort documents"
                className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-zinc-900">Newest</option>
                <option value="oldest" className="bg-zinc-900">Oldest</option>
                <option value="name" className="bg-zinc-900">Name (A-Z)</option>
                <option value="size" className="bg-zinc-900">File Size</option>
              </select>
            </div>

            <div className="flex items-center rounded-lg bg-zinc-900/80 border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View (Recommended)"
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === "table" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid Tiles View"
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === "grid" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Format Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedFormat("all")}
            className={`px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
              selectedFormat === "all"
                ? "bg-white text-black font-semibold"
                : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            All ({formatCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat("pdf")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
              selectedFormat === "pdf"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>PDFs ({formatCounts.pdf})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat("markdown")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
              selectedFormat === "markdown"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>Markdown & Notes ({formatCounts.markdown})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat("document")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
              selectedFormat === "document"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Word Docs ({formatCounts.document})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat("data")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
              selectedFormat === "data"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Data & Sheets ({formatCounts.data})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat("code")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
              selectedFormat === "code"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Code & Scripts ({formatCounts.code})</span>
          </button>
        </div>
      </div>

      {/* ── Main Documents Presentation ── */}
      {filteredDocuments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 rounded-2xl bg-zinc-900/40 border border-white/10 text-center my-6">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No documents found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1">
            {searchQuery
              ? `No documents matched "${searchQuery}". Try clearing filters or search terms.`
              : "Drop documents anywhere onto this page or click 'Upload Document' to begin indexing."}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedFormat("all");
                setSelectedSpaceFilter("all");
              }}
              className="mt-4 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-950/60 text-zinc-400 font-medium select-none">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      aria-label="Select all documents"
                      className="text-zinc-400 hover:text-white"
                    >
                      {selectedDocIds.length === filteredDocuments.length &&
                      filteredDocuments.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Document Name</th>
                  <th className="py-3 px-3">Space / Domain</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3 font-mono">Size</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  const isInspected = activeInspectedDoc?.id === doc.id;
                  const isDownloading = downloadingDocId === doc.id;
                  const category = getFormatCategory(doc.title || doc.name || doc.type);
                  const spaceObj = spaces.find((s) => s.id === doc.spaceId);

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setActiveInspectedDoc(doc)}
                      className={`group cursor-pointer transition-colors ${
                        isInspected
                          ? "bg-indigo-950/30"
                          : isSelected
                          ? "bg-white/[0.04]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => toggleSelectDoc(doc.id, e)}
                      >
                        <button
                          type="button"
                          aria-label={`Select document ${doc.title || doc.name || "Untitled"}`}
                          className="text-zinc-500 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-white/5 flex items-center justify-center shrink-0">
                            {renderFormatIcon(category, "w-3.5 h-3.5")}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate block">
                              {doc.title || doc.name || "Untitled Document"}
                            </span>
                            {doc.summary && (
                              <p className="text-[11px] text-zinc-500 truncate max-w-md hidden sm:block">
                                {doc.summary.replace(/^Preview:\s*/, "")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {spaceObj ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{
                              backgroundColor: `${spaceObj.color || "#6366f1"}15`,
                              color: spaceObj.color || "#818cf8",
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: spaceObj.color || "#818cf8" }}
                            />
                            {spaceObj.name}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">General</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                          style={{
                            backgroundColor: getFormatBadgeColor(category).bg,
                            color: getFormatBadgeColor(category).text,
                            border: `1px solid ${getFormatBadgeColor(category).border}`,
                          }}
                        >
                          {doc.type ? doc.type.toUpperCase() : "DOC"}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-zinc-400 text-[11px]">
                        {doc.fileSize || doc.size || "1.2 MB"}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[11px] font-medium text-emerald-400">
                            Ready
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInspectedDoc(doc);
                            }}
                            title="Inspect Document"
                            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadSingle(doc.id, doc.title || doc.name, e)}
                            disabled={isDownloading}
                            title="Download Source"
                            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                          >
                            {isDownloading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(doc.id, e)}
                            title="Delete Document"
                            className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDocuments.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isInspected = activeInspectedDoc?.id === doc.id;
            const category = getFormatCategory(doc.title || doc.name || doc.type);
            const spaceObj = spaces.find((s) => s.id === doc.spaceId);

            return (
              <div
                key={doc.id}
                onClick={() => setActiveInspectedDoc(doc)}
                className={`p-4 rounded-xl border bg-zinc-900/60 cursor-pointer transition-all flex flex-col justify-between gap-3 group ${
                  isInspected
                    ? "border-indigo-500/60 bg-indigo-950/20"
                    : isSelected
                    ? "border-white/30 bg-white/[0.04]"
                    : "border-white/10 hover:border-white/20 hover:bg-zinc-900"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0">
                        {renderFormatIcon(category, "w-4 h-4")}
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                        style={{
                          backgroundColor: getFormatBadgeColor(category).bg,
                          color: getFormatBadgeColor(category).text,
                          border: `1px solid ${getFormatBadgeColor(category).border}`,
                        }}
                      >
                        {doc.type ? doc.type.toUpperCase() : "DOC"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectDoc(doc.id, e)}
                        aria-label={`Select document ${doc.title || doc.name || "Untitled"}`}
                        className="p-1 text-zinc-500 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-white text-sm mt-3 group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {doc.title || doc.name || "Untitled Document"}
                  </h3>
                  {doc.summary && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                      {doc.summary.replace(/^Preview:\s*/, "")}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]">{doc.fileSize || doc.size || "1.2 MB"}</span>
                    {spaceObj && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${spaceObj.color || "#6366f1"}15`,
                          color: spaceObj.color || "#818cf8",
                        }}
                      >
                        {spaceObj.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadSingle(doc.id, doc.title || doc.name, e)}
                      title="Download"
                      className="p-1 hover:text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(doc.id, e)}
                      title="Delete"
                      className="p-1 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-Over Master-Detail Document Inspector Drawer ── */}
      {activeInspectedDoc && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-zinc-950 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                {renderFormatIcon(getFormatCategory(activeInspectedDoc.title || activeInspectedDoc.name || activeInspectedDoc.type))}
              </div>
              <span className="font-semibold text-white text-sm truncate">
                Document Inspector
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveInspectedDoc(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                  style={{
                    backgroundColor: getFormatBadgeColor(getFormatCategory(activeInspectedDoc.title || activeInspectedDoc.name || activeInspectedDoc.type)).bg,
                    color: getFormatBadgeColor(getFormatCategory(activeInspectedDoc.title || activeInspectedDoc.name || activeInspectedDoc.type)).text,
                    border: `1px solid ${getFormatBadgeColor(getFormatCategory(activeInspectedDoc.title || activeInspectedDoc.name || activeInspectedDoc.type)).border}`,
                  }}
                >
                  {activeInspectedDoc.type ? activeInspectedDoc.type.toUpperCase() : "DOC"}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {activeInspectedDoc.fileSize || activeInspectedDoc.size || "1.2 MB"}
                </span>
                <span className="text-xs text-emerald-400 font-medium ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Vector Ready
                </span>
              </div>
              <h2 className="text-base font-bold text-white break-words">
                {activeInspectedDoc.title || activeInspectedDoc.name}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                const title = activeInspectedDoc.title || activeInspectedDoc.name || "this document";
                router.push(`/chat?q=${encodeURIComponent(`Analyze and answer questions about "${title}": `)}`);
              }}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Ask AI About This Document</span>
            </button>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Autonomous AI Summary</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeInspectedDoc.summary ||
                  "This document has been ingested and partitioned into semantic chunks. It is actively grounded for AI queries and cross-document reasoning."}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Assigned Space:</span>
                <button
                  type="button"
                  onClick={() => {
                    setMovingSpaceDocId(activeInspectedDoc.id);
                    setIsMoveSpaceOpen(true);
                  }}
                  className="text-indigo-400 hover:underline text-xs"
                >
                  Change Space
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-500" />
                <span className="text-xs font-semibold text-white">
                  {spaces.find((s) => s.id === activeInspectedDoc.spaceId)?.name || "General (Unassigned)"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/10 space-y-2.5 text-xs">
              <div className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">
                Grounding Details
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Semantic Chunks</span>
                <span className="font-mono text-white">{activeInspectedDoc.chunks || 1} chunks</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Vector Embeddings</span>
                <span className="font-mono text-white">384-dim (BGE-Small)</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Vector Store</span>
                <span className="font-mono text-emerald-400">Qdrant Live</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 bg-zinc-900/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                handleDownloadSingle(
                  activeInspectedDoc.id,
                  activeInspectedDoc.title || activeInspectedDoc.name
                )
              }
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>

            <button
              type="button"
              onClick={() => handleDelete(activeInspectedDoc.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Move Space Modal ── */}
      {isMoveSpaceOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-zinc-900 border border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Move to Space</h3>
              <button
                type="button"
                onClick={() => setIsMoveSpaceOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleMoveSpace("")}
                className="w-full text-left p-2.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span>General (Unassigned)</span>
                {!activeInspectedDoc?.spaceId && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
              {spaces.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleMoveSpace(s.id)}
                  className="w-full text-left p-2.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: s.color || "#818cf8" }}
                    />
                    <span>{s.name}</span>
                  </span>
                  {activeInspectedDoc?.spaceId === s.id && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Bulk Actions HUD Capsule ── */}
      {selectedDocIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 border border-white/20 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom duration-150">
          <span className="text-xs font-semibold text-white whitespace-nowrap">
            {selectedDocIds.length} selected
          </span>
          <div className="w-px h-4 bg-white/20" />

          <button
            type="button"
            onClick={() =>
              router.push(`/intelligence?analyzeDocs=${selectedDocIds.join(",")}`)
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analyze Trends</span>
          </button>

          <button
            type="button"
            onClick={handleBulkDownload}
            disabled={isBulkDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            {isBulkDownloading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download ZIP</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDocIds([])}
            className="p-1 text-zinc-400 hover:text-white"
            title="Deselect All"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
