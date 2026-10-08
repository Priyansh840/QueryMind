"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  FileText,
  Grid3X3,
  List,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Download,
  CheckSquare,
  Square,
  ChevronDown,
  FolderPlus,
  Search,
  FileCode,
  FileSpreadsheet,
  FileArchive,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi, downloadBlob } from "@/lib/api";

type ViewMode = "list" | "grid";
type SortOption = "newest" | "oldest" | "name";

export default function VaultPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Selection & bulk operations
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Upload & Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Space Suggestion Approval Modal/Banner
  const [proposedSpaceSuggestion, setProposedSpaceSuggestion] = useState<{
    documentId: string;
    documentName: string;
    proposedName: string;
    proposedDescription: string;
    proposedIcon?: string;
  } | null>(null);
  const [isApprovingSpace, setIsApprovingSpace] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zustand Store
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const addDocument = useMyndStore((state) => state.addDocument);
  const deleteDocument = useMyndStore((state) => state.deleteDocument);
  const spaces = useMyndStore((state) => state.spaces);

  // Sync documents from backend on initial mount
  const syncWithBackend = async () => {
    setIsSyncing(true);
    try {
      const backendDocs = await queryMindApi.listDocuments();
      if (Array.isArray(backendDocs) && backendDocs.length > 0) {
        backendDocs.forEach((d: any) => {
          const docTitle = d.title || "Untitled Document";
          const ext = docTitle.includes(".") ? docTitle.split(".").pop() : "doc";
          addDocument({
            id: d.id,
            name: docTitle,
            type: d.type || ext || "pdf",
            size: d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(2)} MB` : "Document",
            chunks: d.chunk_count || 1,
            spaceId: d.space_id,
            summary: d.status === "ready" ? "Indexed & ready for reasoning." : `Status: ${d.status || "Indexed"}`,
          });
        });
      }
    } catch (err) {
      console.error("Failed to sync documents with backend:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncWithBackend();
  }, []);

  // Upload handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus(null);
    setProposedSpaceSuggestion(null);

    const fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    const ext = file.name.split(".").pop() || "doc";

    try {
      // Global upload: pass undefined spaceId to allow backend smart auto-routing
      const data = await queryMindApi.uploadDocument(file, undefined);

      const assignedSpaceId = data.space_id || undefined;
      const assignedSpaceName = data.space_name ? ` (Routed to ${data.space_name})` : "";

      addDocument({
        id: data.document_id,
        name: data.filename || file.name,
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
        message: `Indexed "${data.filename || file.name}"${assignedSpaceName}.`,
      });

      // User Approval for new space suggestion
      if (data.suggested_new_space && data.suggested_new_space.name) {
        setProposedSpaceSuggestion({
          documentId: data.document_id,
          documentName: data.filename || file.name,
          proposedName: data.suggested_new_space.name,
          proposedDescription: data.suggested_new_space.description || "Dedicated domain workspace",
          proposedIcon: data.suggested_new_space.icon || "📁",
        });
      }
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: `Upload error: ${err.message || "Failed to process document"}`,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Approve Space Suggestion
  const handleApproveNewSpace = async () => {
    if (!proposedSpaceSuggestion) return;
    setIsApprovingSpace(true);
    try {
      const res = await queryMindApi.moveDocument(
        proposedSpaceSuggestion.documentId,
        "new",
        {
          createSpaceIfMissing: true,
          newSpaceName: proposedSpaceSuggestion.proposedName,
          newSpaceDescription: proposedSpaceSuggestion.proposedDescription,
        }
      );

      deleteDocument(proposedSpaceSuggestion.documentId);
      addDocument({
        id: res.document_id,
        name: res.filename,
        type: "PDF",
        size: "Document",
        chunks: 1,
        spaceId: res.new_space_id,
        summary: `Filed into newly created space '${res.new_space_name}'.`,
      });

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
        message: `Created space "${res.new_space_name}" and assigned "${res.filename}".`,
      });
      setProposedSpaceSuggestion(null);
    } catch (err: any) {
      alert("Could not create space: " + (err.message || err));
    } finally {
      setIsApprovingSpace(false);
    }
  };

  // Delete handler
  const handleDelete = async (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await queryMindApi.deleteDocument(docId);
    } catch (err) {
      console.warn("Server delete fallback:", err);
    }
    deleteDocument(docId);
    setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
  };

  // Single file download
  const handleDownloadSingle = async (docId: string, docName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingDocId(docId);
    try {
      const blob = await queryMindApi.downloadDocument(docId);
      downloadBlob(blob, docName || "document");
    } catch (err: any) {
      alert(`Download failed: ${err.message || "File unavailable"}`);
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Bulk download
  const handleBulkDownload = async () => {
    if (selectedDocIds.length === 0) return;
    setIsBulkDownloading(true);
    try {
      const blob = await queryMindApi.bulkDownloadDocuments(selectedDocIds);
      downloadBlob(blob, `querymind_documents_${Date.now()}.zip`);
    } catch (err: any) {
      alert(`Bulk download failed: ${err.message || "Error packaging ZIP"}`);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  // Knowledge Export
  const handleExportKnowledge = async (fmt: "csv" | "json" | "markdown") => {
    setIsExportMenuOpen(false);
    try {
      const blob = await queryMindApi.exportKnowledge(
        selectedSpaceFilter !== "all" ? selectedSpaceFilter : undefined,
        fmt
      );
      const ext = fmt === "markdown" ? "md" : fmt;
      downloadBlob(blob, `vault_knowledge_${fmt}_${Date.now()}.${ext}`);
    } catch (err: any) {
      alert(`Export failed: ${err.message || "Service error"}`);
    }
  };

  // Selection toggle
  const toggleSelectDoc = (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map((d) => d.id));
    }
  };

  // File extension badge & icon helper
  const getDocTypeIcon = (type?: string) => {
    const ext = (type || "doc").toLowerCase();
    if (["pdf"].includes(ext)) return <FileText size={18} className="text-rose-400" />;
    if (["csv", "tsv", "xlsx", "xls"].includes(ext)) return <FileSpreadsheet size={18} className="text-emerald-400" />;
    if (["ts", "tsx", "js", "jsx", "py", "sql", "json"].includes(ext)) return <FileCode size={18} className="text-cyan-400" />;
    if (["zip", "tar", "gz"].includes(ext)) return <FileArchive size={18} className="text-amber-400" />;
    return <FileText size={18} className="text-indigo-400" />;
  };

  // Unique formats available
  const availableFormats = useMemo(() => {
    const set = new Set<string>();
    uploadedDocuments.forEach((d) => {
      if (d.type) set.add(d.type.toLowerCase());
    });
    return Array.from(set);
  }, [uploadedDocuments]);

  // Filtered & Sorted Documents
  const filteredDocuments = useMemo(() => {
    return uploadedDocuments
      .filter((doc) => {
        const docName = doc.name || doc.title || "Document";
        // Search query filter
        const matchesQuery =
          docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (doc.summary && doc.summary.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesQuery) return false;

        // Format filter
        if (selectedFormat !== "all" && (doc.type || "").toLowerCase() !== selectedFormat.toLowerCase()) {
          return false;
        }

        // Space filter
        if (selectedSpaceFilter !== "all" && doc.spaceId !== selectedSpaceFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const nameA = a.name || a.title || "";
        const nameB = b.name || b.title || "";
        if (sortBy === "name") return nameA.localeCompare(nameB);
        if (sortBy === "oldest") return a.id.localeCompare(b.id);
        return b.id.localeCompare(a.id); // Default newest
      });
  }, [uploadedDocuments, searchQuery, selectedFormat, selectedSpaceFilter, sortBy]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Knowledge Vault
            </h1>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(99, 102, 241, 0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              Global Grounding
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "6px" }}>
            Central repository for technical specifications, research, PDFs, and data. Accessible globally across all reasoning sessions.
          </p>
        </div>

        {/* Global Vault Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={syncWithBackend}
            disabled={isSyncing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            title="Refresh documents from server"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>

          {/* Export Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--surface-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={14} />
            </button>

            {isExportMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  width: "180px",
                  background: "var(--surface-elevated, #13141d)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                  padding: "6px",
                  zIndex: 40,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleExportKnowledge("markdown")}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  className="hover:bg-[var(--surface-hover)]"
                >
                  Export as Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportKnowledge("json")}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  className="hover:bg-[var(--surface-hover)]"
                >
                  Export as JSON (.json)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportKnowledge("csv")}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  className="hover:bg-[var(--surface-hover)]"
                >
                  Export as CSV (.csv)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#6366f1",
              border: "1px solid #4f46e5",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
            }}
            className="hover:bg-[#4f46e5] active:scale-95"
          >
            <Upload size={14} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? "2px dashed var(--accent)" : "1.5px dashed var(--border-strong)",
          borderRadius: "14px",
          padding: "36px 24px",
          textAlign: "center",
          background: isDragging ? "rgba(99, 102, 241, 0.05)" : "var(--surface-primary)",
          cursor: "pointer",
          marginBottom: "24px",
          transition: "all 0.15s ease",
        }}
        className="hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.md,.markdown,.json,.csv,.tsv,.xml,.html,.py,.js,.ts,.tsx,.sql"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px auto",
          }}
        >
          {isUploading ? <RefreshCw size={20} className="animate-spin" /> : <Upload size={20} />}
        </div>

        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
          {isUploading ? "Extracting, chunking and embedding document..." : "Click or drag documents to ingest into Vault"}
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
          PDF, Word, Markdown, Code, or CSV. Indexed with vector embeddings for real-time citations.
        </p>
      </div>

      {/* Upload Status Banner */}
      {uploadStatus && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            marginBottom: "20px",
            background: uploadStatus.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
            color: uploadStatus.type === "success" ? "#10B981" : "#EF4444",
            border: `1px solid ${uploadStatus.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          }}
        >
          {uploadStatus.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{uploadStatus.message}</span>
          <button
            type="button"
            onClick={() => setUploadStatus(null)}
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: "12px" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Proposed Space Suggestion Banner (User Approval Guard) */}
      {proposedSpaceSuggestion && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            boxShadow: "0 6px 20px rgba(99, 102, 241, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                Create dedicated space for &quot;{proposedSpaceSuggestion.documentName}&quot;?
              </span>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "var(--accent)",
                }}
              >
                Suggested: {proposedSpaceSuggestion.proposedName}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              {proposedSpaceSuggestion.proposedDescription}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setProposedSpaceSuggestion(null)}
              disabled={isApprovingSpace}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--text-tertiary)",
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
              }}
            >
              Keep in General Space
            </button>
            <button
              type="button"
              onClick={handleApproveNewSpace}
              disabled={isApprovingSpace}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#FFFFFF",
                background: "#6366f1",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: isApprovingSpace ? "not-allowed" : "pointer",
              }}
            >
              {isApprovingSpace ? <RefreshCw size={14} className="animate-spin" /> : <FolderPlus size={14} />}
              <span>Approve & Create Space</span>
            </button>
          </div>
        </div>
      )}

      {/* Control Bar: Search, Filters, View Modes & Bulk Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
          padding: "12px 16px",
          background: "var(--surface-primary)",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Left: Search input & Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
          {/* Search box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "6px 12px",
              minWidth: "220px",
            }}
          >
            <Search size={14} style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="Search documents or excerpts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: "var(--text-primary)",
                width: "100%",
              }}
            />
          </div>

          {/* Format Filter */}
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Formats</option>
            {availableFormats.map((fmt) => (
              <option key={fmt} value={fmt}>
                .{fmt.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Space Filter */}
          <select
            value={selectedSpaceFilter}
            onChange={(e) => setSelectedSpaceFilter(e.target.value)}
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Spaces</option>
            {spaces.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>

        {/* Right: Bulk Selection & View Mode Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {selectedDocIds.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {selectedDocIds.length} selected
              </span>
              <button
                type="button"
                onClick={handleBulkDownload}
                disabled={isBulkDownloading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "var(--accent-soft)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "var(--accent)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isBulkDownloading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                <span>Download ZIP</span>
              </button>
            </div>
          )}

          {/* Select all checkbox button */}
          <button
            type="button"
            onClick={toggleSelectAll}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
            title="Toggle select all"
          >
            {selectedDocIds.length > 0 && selectedDocIds.length === filteredDocuments.length ? (
              <CheckSquare size={14} className="text-indigo-400" />
            ) : (
              <Square size={14} />
            )}
            <span>Select All</span>
          </button>

          {/* View toggle buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--surface-secondary)",
              borderRadius: "8px",
              padding: "2px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "list" ? "var(--surface-primary)" : "transparent",
                color: viewMode === "list" ? "var(--text-primary)" : "var(--text-tertiary)",
                cursor: "pointer",
              }}
              title="List view"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "grid" ? "var(--surface-primary)" : "transparent",
                color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-tertiary)",
                cursor: "pointer",
              }}
              title="Grid view"
            >
              <Grid3X3 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Document Library Body */}
      {filteredDocuments.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--surface-primary)",
            borderRadius: "14px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "var(--surface-secondary)",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
            }}
          >
            <FolderOpen size={20} />
          </div>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
            {searchQuery || selectedFormat !== "all" || selectedSpaceFilter !== "all"
              ? "No matching documents found"
              : "No documents uploaded yet"}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            {searchQuery
              ? "Try adjusting your search terms or filters."
              : "Upload documents above to enable AI reasoning and semantic citations."}
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredDocuments.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const matchedSpace = spaces.find((s) => s.id === doc.spaceId);
            const docName = doc.name || doc.title || "Document";

            return (
              <div
                key={doc.id}
                onClick={() => toggleSelectDoc(doc.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: isSelected ? "rgba(99, 102, 241, 0.05)" : "var(--surface-primary)",
                  border: isSelected ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                className="hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]"
              >
                {/* Left: Checkbox + Icon + Metadata */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => toggleSelectDoc(doc.id, e)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px" }}
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-indigo-400" />
                    ) : (
                      <Square size={16} className="text-neutral-500" />
                    )}
                  </button>

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
                    {getDocTypeIcon(doc.type)}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {docName}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: "var(--surface-secondary)",
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                        }}
                      >
                        {doc.type || "DOC"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "3px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                      <span>{doc.size || doc.fileSize || "Document"}</span>
                      <span>•</span>
                      <span>{doc.chunks || 1} chunks indexed</span>
                      {matchedSpace && (
                        <>
                          <span>•</span>
                          <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                            {matchedSpace.name}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span style={{ color: "#10B981" }}>Ready for Reasoning</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "14px" }}>
                  <button
                    type="button"
                    onClick={(e) => handleDownloadSingle(doc.id, docName, e)}
                    disabled={downloadingDocId === doc.id}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      padding: "6px",
                      borderRadius: "6px",
                    }}
                    className="hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                    title="Download document"
                  >
                    {downloadingDocId === doc.id ? (
                      <RefreshCw size={15} className="animate-spin text-indigo-400" />
                    ) : (
                      <Download size={15} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(doc.id, e)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      padding: "6px",
                      borderRadius: "6px",
                    }}
                    className="hover:text-rose-400 hover:bg-[var(--surface-secondary)]"
                    title="Delete document"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
          {filteredDocuments.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const matchedSpace = spaces.find((s) => s.id === doc.spaceId);
            const docName = doc.name || doc.title || "Document";

            return (
              <div
                key={doc.id}
                onClick={() => toggleSelectDoc(doc.id)}
                style={{
                  background: isSelected ? "rgba(99, 102, 241, 0.05)" : "var(--surface-primary)",
                  border: isSelected ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                className="hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]"
              >
                <div>
                  {/* Top Bar: Icon + Checkbox */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        background: "var(--surface-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {getDocTypeIcon(doc.type)}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleSelectDoc(doc.id, e)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px" }}
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-indigo-400" />
                      ) : (
                        <Square size={16} className="text-neutral-500" />
                      )}
                    </button>
                  </div>

                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "6px",
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {docName}
                  </h3>

                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-tertiary)",
                      marginBottom: "14px",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {doc.summary || "Indexed and ready for RAG citations."}
                  </p>
                </div>

                {/* Footer Info & Actions */}
                <div
                  style={{
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    {matchedSpace ? matchedSpace.name : "Global Space"} • {doc.size || doc.fileSize || "Document"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={(e) => handleDownloadSingle(doc.id, docName, e)}
                      disabled={downloadingDocId === doc.id}
                      style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
                      className="hover:text-[var(--text-primary)]"
                      title="Download"
                    >
                      {downloadingDocId === doc.id ? (
                        <RefreshCw size={14} className="animate-spin text-indigo-400" />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(doc.id, e)}
                      style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: "4px" }}
                      className="hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
