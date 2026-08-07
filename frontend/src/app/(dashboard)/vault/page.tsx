"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  Grid3X3,
  List,
  Search,
  FolderOpen,
  MoreVertical,
  Clock,
} from "lucide-react";
import { useState } from "react";

const mockFiles = [
  { name: "machine_learning_notes.pdf", type: "pdf", size: "2.4 MB", date: "2 hours ago", chunks: 47 },
  { name: "deep_learning_ch5.pdf", type: "pdf", size: "5.1 MB", date: "5 hours ago", chunks: 112 },
  { name: "project_ideas.txt", type: "text", size: "12 KB", date: "1 day ago", chunks: 8 },
  { name: "architecture_diagram.png", type: "image", size: "890 KB", date: "2 days ago", chunks: 3 },
  { name: "react_patterns.md", type: "text", size: "34 KB", date: "3 days ago", chunks: 22 },
  { name: "resume_2026.pdf", type: "pdf", size: "180 KB", date: "1 week ago", chunks: 6 },
];

const typeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  text: File,
  image: ImageIcon,
};

export default function VaultPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isDragging, setIsDragging] = useState(false);

  return (
    <>
      <Navbar title="Knowledge Vault" />
      <div className="p-10 max-w-6xl mx-auto space-y-8">
        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${
            isDragging
              ? "border-gray-900 bg-gray-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white"
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Upload className={`w-6 h-6 ${isDragging ? "text-gray-900" : "text-gray-500"}`} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            {isDragging ? "Drop files to upload" : "Click or drag to upload files"}
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            Supports PDF, DOCX, TXT, MD, and images up to 50MB
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {mockFiles.length} documents
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white shadow-sm focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vault..."
                className="bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 w-48"
              />
            </div>
            <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-sm transition-colors ${view === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded-sm transition-colors ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Files Grid/List */}
        <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-3"}>
          {mockFiles.map((file, i) => {
            const Icon = typeIcons[file.type] || File;

            return view === "grid" ? (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex items-center gap-4 group hover:shadow-sm transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-sm font-medium text-gray-900 truncate mb-1" title={file.name}>
                  {file.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <span>{file.size}</span>
                  <span>·</span>
                  <span>{file.chunks} chunks</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white border border-gray-200 rounded-lg shadow-sm px-5 py-3 flex items-center gap-4 group hover:shadow-sm transition-shadow cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </h4>
                </div>
                <span className="text-sm text-gray-500 w-24 text-right hidden sm:block">{file.size}</span>
                <span className="text-sm text-gray-500 w-32 text-right hidden md:block">{file.chunks} chunks</span>
                <span className="text-sm text-gray-500 w-32 text-right hidden lg:flex items-center justify-end gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {file.date}
                </span>
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors ml-4">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
