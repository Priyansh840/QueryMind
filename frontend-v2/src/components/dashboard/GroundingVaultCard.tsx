"use client";

import React from "react";
import Link from "next/link";
import { DocumentItem } from "@/types/api";
import { FileText, ArrowRight, Plus } from "lucide-react";

interface GroundingVaultCardProps {
  spaceId: string;
  documents: DocumentItem[];
  onUploadClick: () => void;
  className?: string;
}

export const GroundingVaultCard: React.FC<GroundingVaultCardProps> = ({
  spaceId,
  documents,
  onUploadClick,
  className,
}) => {
  const displayDocs = documents.slice(0, 4);

  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-5 space-y-3 select-none ${
        className || ""
      }`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
        <div className="text-xs font-semibold text-white">
          Recent Documents
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onUploadClick}
            className="text-xs text-[#818cf8] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add Document</span>
          </button>
          <Link
            href={`/spaces/${spaceId}/knowledge`}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="space-y-1.5">
        {displayDocs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No documents uploaded yet.
          </div>
        ) : (
          displayDocs.map((doc) => {
            const ext = doc.title.split(".").pop()?.toUpperCase() || "DOC";

            return (
              <Link
                key={doc.id}
                href={`/spaces/${spaceId}/knowledge/documents/${doc.id}`}
                className="p-2.5 rounded-xl hover:bg-white/[0.03] flex items-center justify-between transition-colors text-decoration-none group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    {doc.title}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 shrink-0 font-mono">
                  {ext}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};
