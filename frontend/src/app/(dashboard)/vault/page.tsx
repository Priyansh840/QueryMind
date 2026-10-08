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
  Sparkles,
  ChevronDown,
  FolderPlus,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi, downloadBlob } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function VaultPage() {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [proposedSpaceSuggestion, setProposedSpaceSuggestion] = useState<{
    documentId: string;
    documentName: string;
    proposedName: string;
    proposedDescription: string;
    proposedIcon?: string;
  } | null>(null);
  const [isApprovingSpace, setIsApprovingSpace] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  // Bulk and single export state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const addDocument = useMyndStore((state) => state.addDocument);
  const deleteDocument = useMyndStore((state) => state.deleteDocument);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const selectSpace = useMyndStore((state) => state.selectSpace);

  // Sync all documents with backend on load
  useEffect(() => {
    let isMounted = true;
    const fetchBackendDocs = async () => {
      try {
        // Fetch ALL documents across all user spaces
        const docs = await queryMindApi.listDocuments();
        if (isMounted && Array.isArray(docs) && docs.length > 0) {
          const currentUploaded = useMyndStore.getState().uploadedDocuments;
          docs.forEach((d: { id: string; title: string; type?: string; file_type?: string; file_size?: number; space_id?: string }) => {
            const exists = currentUploaded.some((u) => u.id === d.id || u.title === d.title);
            if (!exists) {
              addDocument({
                id: d.id,
                name: d.title,
                type: d.type || d.file_type || "pdf",
                size: d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(2)} MB` : "1.2 MB",
                chunks: 1,
                spaceId: d.space_id || activeSpaceId || undefined,
                summary: `Ingested document in Workspace.`,
              });
            }
          });
        }
      } catch {
        // Fallback to local store state
      }
    };
    fetchBackendDocs();
    return () => {
      isMounted = false;
    };
  }, [addDocument, activeSpaceId]);

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    const fileSizeStr = `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;
    const ext = selectedFile.name.split(".").pop() || "doc";

    try {
      // In the general Vault, upload with auto routing so the backend classifies the document
      const data = await queryMindApi.uploadDocument(
        selectedFile,
        undefined
      );

      const assignedSpaceId = data.space_id || activeSpaceId || undefined;
      const assignedSpaceName = data.space_name ? ` (Filed in ${data.space_name})` : "";

      // Add to store with real backend vector results & assigned space
      addDocument({
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
        message: `Successfully processed "${data.filename || selectedFile.name}"${assignedSpaceName}.`,
      });

      // If backend suggested a new space for this document, prompt the user for approval
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
      // If backend is offline, still save the real uploaded file locally in store with notification
      addDocument({
        id: `doc-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: selectedFile.name,
        type: ext,
        size: fileSizeStr,
        chunks: 1,
        spaceId: activeSpaceId || undefined,
        summary: `Document added to your library.`,
      });

      setUploadStatus({
        type: "error",
        message: `Saved locally. Cloud sync temporarily unavailable: ${
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
      const res = await queryMindApi.moveDocument(
        proposedSpaceSuggestion.documentId,
        "new",
        {
          createSpaceIfMissing: true,
          newSpaceName: proposedSpaceSuggestion.proposedName,
          newSpaceDescription: proposedSpaceSuggestion.proposedDescription,
        }
      );

      // Refresh local store
      useMyndStore.getState().deleteDocument(proposedSpaceSuggestion.documentId);
      addDocument({
        id: res.document_id,
        name: res.filename,
        type: "PDF",
        size: "Document",
        chunks: 1,
        spaceId: res.new_space_id,
        summary: `Organized into newly created space '${res.new_space_name}'.`,
      });

      // Reload spaces in store
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
        message: `Created new space "${res.new_space_name}" and moved "${res.filename}" into it!`,
      });
      setProposedSpaceSuggestion(null);
    } catch (err: any) {
      console.error("Failed to approve new space:", err);
      alert("Could not create space: " + (err.message || err));
    } finally {
      setIsApprovingSpace(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await queryMindApi.deleteDocument(docId);
    } catch {
      // Continue and remove locally
    }
    deleteDocument(docId);
    setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
  };

  const handleDownloadSingle = async (docId: string, docTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const toggleSelectDoc = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredFiles.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredFiles.map((f) => f.id));
    }
  };

  const handleCrossDocumentAnalysis = () => {
    if (selectedDocIds.length === 0) return;
    router.push(`/intelligence?analyzeDocs=${selectedDocIds.join(",")}`);
  };

  const filteredFiles = useMemo(() => {
    const seen = new Set<string>();
    return uploadedDocuments.filter((f) => {
      const matches = f.title.toLowerCase().includes(filterQuery.toLowerCase());
      if (!matches) return false;
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  }, [uploadedDocuments, filterQuery]);

  return (
    <div className="w-full space-y-8 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: "var(--t-display)", fontWeight: "var(--w-bold)", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Knowledge Vault
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
            Your centralized document library. Upload resources to make them instantly searchable and accessible to your AI assistants.
          </p>
        </div>

        {/* Knowledge Export Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "8px 14px",
              borderRadius: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 120ms ease",
            }}
          >
            <Download style={{ width: "14px", height: "14px" }} />
            <span>Export Vault</span>
            <ChevronDown style={{ width: "12px", height: "12px" }} />
          </button>

          {isExportMenuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: "6px",
                background: "#121318",
                border: "1px solid var(--border-strong)",
                borderRadius: "12px",
                boxShadow: "var(--shadow-lg)",
                padding: "6px",
                zIndex: 50,
                minWidth: "180px",
              }}
            >
              <button
                type="button"
                onClick={() => handleExportKnowledge("csv")}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                className="hover:bg-[var(--surface-hover)]"
              >
                Export as CSV (.csv)
              </button>
              <button
                type="button"
                onClick={() => handleExportKnowledge("json")}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
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
                onClick={() => handleExportKnowledge("markdown")}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                className="hover:bg-[var(--surface-hover)]"
              >
                Export as Markdown (.md)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: "16px",
          padding: "48px 24px",
          textAlign: "center",
          background: isDragging ? "var(--accent-soft)" : "var(--surface)",
          cursor: "pointer",
          transition: "all var(--duration-normal) var(--ease-out)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
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

        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
          }}
        >
          {isUploading ? (
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent)]" />
          ) : (
            <Upload className="w-6 h-6 text-[var(--accent)]" />
          )}
        </div>

        <h3 style={{ fontSize: "16px", fontWeight: "var(--w-semibold)", color: "var(--text-primary)" }}>
          {isUploading ? "Processing document..." : "Click or drag files to upload"}
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "6px" }}>
          Supports PDF, Word, Markdown, and text files. Automatically filed and indexed for AI reasoning.
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
            background: uploadStatus.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
            color: uploadStatus.type === "success" ? "#10B981" : "#EF4444",
            border: `1px solid ${uploadStatus.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          }}
        >
          {uploadStatus.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span style={{ flex: 1 }}>{uploadStatus.message}</span>
        </div>
      )}

      {/* Suggested New Space Approval Card */}
      {proposedSpaceSuggestion && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            boxShadow: "0 6px 20px rgba(99, 102, 241, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", maxWidth: "680px" }}>
            <span style={{ fontSize: "24px", lineHeight: "1" }}>{proposedSpaceSuggestion.proposedIcon || "📁"}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", fontWeight: "var(--w-semibold)", color: "var(--text-primary)" }}>
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
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setProposedSpaceSuggestion(null)}
              disabled={isApprovingSpace}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "var(--w-medium)",
                color: "var(--text-tertiary)",
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              className="hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            >
              Keep in General
            </button>
            <button
              type="button"
              onClick={handleApproveNewSpace}
              disabled={isApprovingSpace}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "var(--w-semibold)",
                color: "#FFFFFF",
                background: "var(--accent)",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: isApprovingSpace ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)",
              }}
              className="hover:brightness-110 active:scale-[0.98]"
            >
              {isApprovingSpace ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Space...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Approve & Create Space</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Selection Floating Bar */}
      {selectedDocIds.length > 0 && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "12px",
            background: "#161821",
            border: "1px solid var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-primary)" }}>
            <span style={{ fontWeight: 600, color: "var(--accent)" }}>{selectedDocIds.length}</span> documents selected
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleBulkDownload}
              disabled={isBulkDownloading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              {isBulkDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download ZIP ({selectedDocIds.length})</span>
            </button>

            <button
              type="button"
              onClick={handleCrossDocumentAnalysis}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "var(--surface-subtle)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Analyze Trends</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDocIds([])}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                background: "transparent",
                color: "var(--text-tertiary)",
                border: "none",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vault Files Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {filteredFiles.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              title={selectedDocIds.length === filteredFiles.length ? "Deselect All" : "Select All"}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
              }}
            >
              {selectedDocIds.length === filteredFiles.length && filteredFiles.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
              ) : (
                <Square className="w-4 h-4 text-[var(--text-tertiary)]" />
              )}
              <span>Select All</span>
            </button>
          )}

          <div>
            <h2 style={{ fontSize: "var(--t-title)", fontWeight: "var(--w-bold)", color: "var(--text-primary)" }}>
              Stored Documents ({filteredFiles.length})
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Real-time documents indexed in your personal knowledge base.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter files..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", background: "var(--surface)" }}>
            <button
              onClick={() => setView("grid")}
              style={{
                padding: "6px 12px",
                background: view === "grid" ? "#262626" : "transparent",
                border: "none",
                cursor: "pointer",
                color: view === "grid" ? "#FFFFFF" : "var(--text-secondary)",
                transition: "all 150ms ease",
              }}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              style={{
                padding: "6px 12px",
                background: view === "list" ? "#262626" : "transparent",
                border: "none",
                cursor: "pointer",
                color: view === "list" ? "#FFFFFF" : "var(--text-secondary)",
                transition: "all 150ms ease",
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List View */}
      {filteredFiles.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            borderRadius: "12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <FolderOpen className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
            No documents found
          </h3>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            Drop or select a file above to add it to your knowledge vault.
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredFiles.map((doc, idx) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isDownloading = downloadingDocId === doc.id;
            return (
              <div
                key={`vault-grid-${doc.id}-${idx}`}
                onClick={() => openObjectModal(doc)}
                className="card-interactive"
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "var(--surface)",
                  border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 120ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelectDoc(doc.id, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                        color: isSelected ? "var(--accent)" : "var(--text-tertiary)",
                      }}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {doc.title}
                      </h4>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        {doc.fileSize || "PDF Document"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {/* Download single doc */}
                    <button
                      type="button"
                      onClick={(e) => handleDownloadSingle(doc.id, doc.title, e)}
                      disabled={isDownloading}
                      title="Download Document"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
                        padding: "4px",
                      }}
                    >
                      {isDownloading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                      ) : (
                        <Download className="w-4 h-4 hover:text-[var(--text-primary)] transition-colors" />
                      )}
                    </button>

                    {/* Delete doc */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(doc.id, e)}
                      title="Delete Document"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
                        padding: "4px",
                      }}
                    >
                      <Trash2 className="w-4 h-4 hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>

                {doc.summary && (
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }} className="line-clamp-2">
                    {doc.summary}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "auto" }}>
                  <span className="kbd" style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                    {doc.fileSize || "File"}
                  </span>
                  <span className="kbd" style={{ fontSize: "10px", color: "#10B981", background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
                    ✓ Indexed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          {filteredFiles.map((doc, idx) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isDownloading = downloadingDocId === doc.id;
            return (
              <div
                key={`vault-list-${doc.id}-${idx}`}
                onClick={() => openObjectModal(doc)}
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  background: isSelected ? "var(--surface-hover)" : "transparent",
                }}
                className="hover:bg-[var(--surface-subtle)] transition-colors"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={(e) => toggleSelectDoc(doc.id, e)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      color: isSelected ? "var(--accent)" : "var(--text-tertiary)",
                    }}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>

                  <FileText className="w-5 h-5 text-[var(--accent)]" />
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {doc.title}
                    </h4>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      {doc.fileSize || "File"} • {doc.type ? doc.type.toUpperCase() : "Document"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={(e) => handleDownloadSingle(doc.id, doc.title, e)}
                    disabled={isDownloading}
                    title="Download Document"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      padding: "4px",
                    }}
                  >
                    {isDownloading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    ) : (
                      <Download className="w-4 h-4 hover:text-[var(--text-primary)] transition-colors" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(doc.id, e)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      padding: "4px",
                    }}
                  >
                    <Trash2 className="w-4 h-4 hover:text-red-500 transition-colors" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
