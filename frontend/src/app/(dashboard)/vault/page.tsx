"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Image,
  FileType,
  Grid3X3,
  List,
  Filter,
  Star,
  MoreVertical,
} from "lucide-react";
import { useState, useCallback } from "react";

export default function VaultPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // TODO: Handle file upload
    const files = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", files);
  }, []);

  return (
    <>
      <Navbar title="Knowledge Vault" subtitle="Your document library" />

      <div className="p-6 space-y-6">
        {/* Upload zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-slate-700/50 hover:border-indigo-500/30 bg-slate-800/20"
          }`}
        >
          <div className="flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                isDragging
                  ? "bg-indigo-500/20 scale-110"
                  : "bg-slate-800/50"
              }`}
            >
              <Upload
                className={`w-8 h-8 ${
                  isDragging ? "text-indigo-400" : "text-slate-400"
                }`}
              />
            </div>
            <p className="text-lg font-medium text-white">
              {isDragging ? "Drop files here!" : "Drag & drop files to upload"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Supports PDF, DOCX, TXT, MD, and Images
            </p>
            <button className="mt-4 px-6 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-all">
              Browse Files
            </button>
          </div>
        </motion.div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Documents</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400">
              0 files
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-all">
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg border transition-all ${
                view === "grid"
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg border transition-all ${
                view === "list"
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Empty state */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-slate-800/30 flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 text-slate-600" />
          </div>
          <p className="text-lg font-medium text-slate-400">
            Your vault is empty
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Upload your first document to start building your AI-powered
            knowledge base.
          </p>
        </motion.div>
      </div>
    </>
  );
}
