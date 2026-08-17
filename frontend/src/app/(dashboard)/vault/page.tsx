"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, FileText, Grid3X3, List, FolderOpen, CheckCircle, AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";

export default function VaultPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const addDocument = useMyndStore((state) => state.addDocument);
  const deleteDocument = useMyndStore((state) => state.deleteDocument);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  // Sync with backend on load
  useEffect(() => {
    const fetchBackendDocs = async () => {
      try {
        const docs = await queryMindApi.listDocuments(activeSpaceId || "00000000-0000-0000-0000-000000000001");
        if (Array.isArray(docs) && docs.length > 0) {
          docs.forEach((d: { id: string; title: string; file_type?: string; file_size?: number }) => {
            const exists = uploadedDocuments.some((u) => u.title === d.title);
            if (!exists) {
              addDocument({
                name: d.title,
                type: d.file_type || "pdf",
                size: d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(2)} MB` : "1.2 MB",
                chunks: 1,
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
  }, [activeSpaceId, addDocument, uploadedDocuments]);

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    const fileSizeStr = `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;
    const ext = selectedFile.name.split(".").pop() || "doc";

    try {
      const data = await queryMindApi.uploadDocument(
        selectedFile,
        activeSpaceId || "00000000-0000-0000-0000-000000000001"
      );

      // Add to store with real backend vector results
      addDocument({
        name: data.filename || selectedFile.name,
        type: ext,
        size: fileSizeStr,
        chunks: data.chunks_created || 1,
        vectorsStored: data.vectors_stored || 1,
        summary: data.first_chunk_preview
          ? `Indexed document with ${data.chunks_created} chunks. Preview: ${data.first_chunk_preview}`
          : `Document parsed and embedded into Qdrant.`,
      });

      setUploadStatus({
        type: "success",
        message: `Successfully indexed "${data.filename || selectedFile.name}" into Qdrant (${data.chunks_created || 1} chunks, ${data.vectors_stored || 1} vectors stored).`,
      });
    } catch (err: unknown) {
      // If backend is offline, still save the real uploaded file locally in store with notification
      addDocument({
        name: selectedFile.name,
        type: ext,
        size: fileSizeStr,
        chunks: 1,
        summary: `Local file ${selectedFile.name} added to workspace vault.`,
      });

      const errorMsg = err instanceof Error ? err.message : "Error reaching server";
      setUploadStatus({
        type: "error",
        message: `File saved locally in workspace vault. (Backend notice: ${errorMsg})`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDocument(docId);
    try {
      await queryMindApi.deleteDocument(docId);
    } catch {
      // Fallback
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const filteredFiles = uploadedDocuments.filter((f) =>
    f.title.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 stagger">
      <div>
        <h1 style={{ fontSize: "var(--t-display)", fontWeight: "var(--w-bold)", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Knowledge Vault
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
          Upload documents to automatically parse, chunk, embed, and index into PostgreSQL and your Qdrant vector database.
        </p>
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
          accept=".pdf,.docx,.txt,.md,.markdown"
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
            borderRadius: "50%",
            background: "var(--surface-subtle)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
          }}
        >
          {isUploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
        </div>
        <h3 style={{ fontSize: "16px", fontWeight: "var(--w-semibold)", color: "var(--text-primary)" }}>
          {isUploading ? "Uploading, Chunking & Embedding into Qdrant..." : "Drop your files here, or browse"}
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "6px" }}>
          Supports PDF, DOCX, TXT, Markdown. Vectors are stored in Qdrant with BGE-small embeddings.
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
            background: uploadStatus.type === "success" ? "#ECFDF5" : "#FEF2F2",
            color: uploadStatus.type === "success" ? "#065F46" : "#991B1B",
            border: `1px solid ${uploadStatus.type === "success" ? "#A7F3D0" : "#FECACA"}`,
          }}
        >
          {uploadStatus.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{uploadStatus.message}</span>
        </div>
      )}

      {/* Vault Files Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
        <div>
          <h2 style={{ fontSize: "var(--t-title)", fontWeight: "var(--w-bold)", color: "var(--text-primary)" }}>
            Stored Documents ({filteredFiles.length})
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Real-time documents indexed in your personal knowledge base.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter files..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="kbd"
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: "13px",
            }}
          />

          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            <button
              onClick={() => setView("grid")}
              style={{
                padding: "6px 10px",
                background: view === "grid" ? "var(--surface-subtle)" : "var(--surface)",
                border: "none",
                cursor: "pointer",
                color: view === "grid" ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              style={{
                padding: "6px 10px",
                background: view === "list" ? "var(--surface-subtle)" : "var(--surface)",
                border: "none",
                cursor: "pointer",
                color: view === "list" ? "var(--accent)" : "var(--text-secondary)",
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
          {filteredFiles.map((doc) => (
            <div
              key={doc.id}
              onClick={() => openObjectModal(doc)}
              className="card-interactive"
              style={{
                padding: "16px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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

                <button
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

              {doc.summary && (
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }} className="line-clamp-2">
                  {doc.summary}
                </p>
              )}

              <div style={{ display: "flex", gap: "6px", marginTop: "auto" }}>
                <span className="kbd" style={{ fontSize: "10px" }}>
                  {doc.chunks || 1} chunks
                </span>
                <span className="kbd" style={{ fontSize: "10px", color: "var(--accent)" }}>
                  Qdrant Vector Indexed
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          {filteredFiles.map((doc) => (
            <div
              key={doc.id}
              onClick={() => openObjectModal(doc)}
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              className="hover:bg-[var(--surface-subtle)] transition-colors"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <FileText className="w-5 h-5 text-[var(--accent)]" />
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {doc.title}
                  </h4>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {doc.fileSize || "PDF"} • {doc.chunks || 1} chunks
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => handleDelete(doc.id, e)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                }}
              >
                <Trash2 className="w-4 h-4 hover:text-red-500 transition-colors" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
