"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { DocumentItem, DocumentChunk, Space } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  FileText,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";

interface DocumentDetailPageProps {
  params: Promise<{ spaceId: string; documentId: string }>;
}

export default function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const documentId = resolvedParams.documentId;
  const router = useRouter();

  const { currentSpace, spaces } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [docRes, spaceRes] = await Promise.all([
          apiClient<DocumentItem>(`/api/v1/documents/${documentId}`),
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).catch(() => null),
        ]);
        setDocument(docRes);
        if (spaceRes) setSpace(spaceRes);
      } catch (err: any) {
        console.error("Failed to load document:", err);
        setError(err.message || "Document not found or inaccessible.");
      } finally {
        setIsLoading(false);
      }
    };
    loadDocument();
  }, [documentId, spaceId]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document and its vector embeddings?")) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/documents/${documentId}`, {
        method: "DELETE",
      });
      router.push(`/spaces/${spaceId}/knowledge`);
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="text-xs font-mono text-slate-400 animate-pulse">
          LOADING EVIDENCE DOCUMENT...
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#0c0d12] border border-white/[0.08] text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[#f87171] mx-auto" />
          <h2 className="text-sm font-semibold text-white">Document Not Found</h2>
          <p className="text-xs text-slate-400">{error || "Unable to locate document."}</p>
          <button
            type="button"
            onClick={() => router.push(`/spaces/${spaceId}/knowledge`)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors"
          >
            Return to Knowledge Hub
          </button>
        </div>
      </div>
    );
  }

  const ext = document.title.split(".").pop()?.toUpperCase() || document.type?.toUpperCase() || "DOC";
  const chunks = document.chunks || [];

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/spaces/${spaceId}/knowledge`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-white truncate">
                {document.title}
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                {ext} • {chunks.length} Chunks Ingested
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Deleting..." : "Delete Document"}</span>
          </button>
        </header>

        {/* Document Body */}
        <div className="flex-1 p-8 pb-16 max-w-5xl mx-auto w-full space-y-6 min-w-0">
          {/* Metadata Overview Card */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-xs font-semibold text-white">
                  Grounding Evidence Status
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Indexed in Qdrant Vector Store
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              This document has been parsed and partitioned into {chunks.length} distinct semantic chunks. When reasoning or formulating proposals, MYND queries these chunks for factual evidence citations.
            </p>
          </div>

          {/* Extracted Chunks List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Extracted Semantic Chunks</span>
              <span className="text-slate-500 font-mono">{chunks.length} total partitions</span>
            </div>

            <div className="space-y-3">
              {chunks.map((chunk, idx) => (
                <div
                  key={chunk.id}
                  className="rounded-xl border border-white/[0.06] bg-[#0c0d12] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#818cf8] font-bold">
                        Chunk #{idx + 1}
                      </span>
                      {chunk.page_number && (
                        <span>• Page {chunk.page_number}</span>
                      )}
                    </div>
                    {chunk.token_count && (
                      <span>{chunk.token_count} tokens</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                    {chunk.content_text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
