"use client";

import React, { useState, useRef } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { UploadCloud, File, AlertCircle, CheckCircle2, X } from "lucide-react";

interface DocumentUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onSuccess: () => void;
}

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".docx", ".doc"];
const MAX_FILE_SIZE_MB = 50;

export const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  isOpen,
  onClose,
  spaceId,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format '${ext}'. Please upload PDF, TXT, MD, or DOCX.`;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setError(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setError(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !spaceId) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("space_id", spaceId);

      await apiClient("/api/v1/documents/upload", {
        method: "POST",
        body: formData,
      });

      setSelectedFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message || "Failed to upload and ingest document.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Knowledge Document"
      description="Uploaded documents are parsed, chunked, and embedded into Qdrant for active Space retrieval."
    >
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[var(--radius-md)] p-8 text-center cursor-pointer transition-mynd flex flex-col items-center justify-center gap-2.5 ${
            isDragOver
              ? "border-[var(--accent-primary)] bg-[var(--accent-surface)]"
              : "border-[var(--border-default)] hover:border-[var(--accent-primary)] bg-[var(--surface-primary)]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx,.doc"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="p-3 rounded-full bg-[var(--surface-secondary)] text-[var(--accent-text)]">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Click to browse or drag & drop file
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Supports PDF, Markdown, Plain Text, and DOCX (Max {MAX_FILE_SIZE_MB}MB)
            </p>
          </div>
        </div>

        {selectedFile && (
          <div className="p-3 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <File className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {selectedFile.name}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 text-xs rounded-[var(--radius-xs)] bg-[var(--error-surface)] text-[var(--error-text)] border border-[var(--error-border)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isUploading}
            disabled={!selectedFile || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? "Extracting & Ingesting..." : "Upload & Process"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
