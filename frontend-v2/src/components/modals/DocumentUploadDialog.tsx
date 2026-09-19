"use client";

import React, { useState, useRef } from "react";
import { X, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface DocumentUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onSuccess: () => void;
}

export const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  isOpen,
  onClose,
  spaceId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("space_id", spaceId);

      await apiClient(`/api/v1/documents/?space_id=${spaceId}`, {
        method: "POST",
        body: formData,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setError("Failed to ingest document. Please check the file and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-[#0f0f14] border border-white/10 shadow-2xl p-6 space-y-5 z-50 text-white animate-in zoom-in-95 duration-150 select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#818cf8]" />
            <h3 className="text-sm font-bold text-white">Ingest Grounding Document</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-8 rounded-xl border border-dashed border-white/15 hover:border-[#818cf8]/50 hover:bg-white/[0.02] transition-colors flex flex-col items-center justify-center gap-2.5 cursor-pointer text-center"
        >
          {file ? (
            <div className="space-y-1">
              <FileText className="w-8 h-8 text-[#818cf8] mx-auto" />
              <div className="text-xs font-semibold text-white">{file.name}</div>
              <div className="text-[11px] text-slate-400">
                {(file.size / 1024).toFixed(1)} KB • Ready to ingest
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Upload className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-xs font-semibold text-slate-200">
                Click or drag to select document
              </div>
              <div className="text-[11px] text-slate-500">
                Supports PDF, DOCX, TXT, and Markdown files
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-xs text-[#f87171] flex items-center gap-1.5 p-2 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isUploading ? "Ingesting..." : "Ingest Document"}
          </button>
        </div>
      </div>
    </div>
  );
};
