"use client";

import React from "react";
import { FileText, ArrowUpRight } from "lucide-react";
import { Citation } from "@/types/api";

interface CitationPillProps {
  citation: string | Citation;
  onClick?: () => void;
}

export const CitationPill: React.FC<CitationPillProps> = ({ citation, onClick }) => {
  const isObj = typeof citation === "object" && citation !== null;
  const title = isObj ? citation.document_title : citation;
  const pageNumber = isObj ? citation.page_number : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] rounded-[var(--radius-xs)] text-xs text-[var(--text-primary)] transition-mynd cursor-pointer select-none group"
    >
      <FileText className="w-3 h-3 text-[var(--info-text)] shrink-0" />
      <span className="truncate max-w-[200px] font-medium">{title}</span>
      {pageNumber && (
        <span className="text-[10px] text-[var(--text-muted)] font-mono">
          p. {pageNumber}
        </span>
      )}
      <ArrowUpRight className="w-2.5 h-2.5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] shrink-0" />
    </button>
  );
};
