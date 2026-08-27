"use client";

import React from "react";
import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DecisionEvidence } from "@/types/api";
import { FileText, ArrowRight, ExternalLink } from "lucide-react";

interface EvidenceListProps {
  evidence: DecisionEvidence[];
  spaceId: string;
}

export const EvidenceList: React.FC<EvidenceListProps> = ({ evidence, spaceId }) => {
  if (!evidence || evidence.length === 0) {
    return (
      <Surface variant="primary" className="p-6 text-center border border-dashed border-[var(--border-subtle)]">
        <p className="text-xs text-[var(--text-secondary)]">
          No explicit document citations were attached to this decision.
        </p>
      </Surface>
    );
  }

  return (
    <div className="space-y-3">
      {evidence.map((item, idx) => (
        <Surface
          key={idx}
          variant="primary"
          className="p-3.5 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-mynd"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--text-muted)] shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-[var(--accent-text)]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {item.document_title}
                  </span>
                  {item.page_number && (
                    <Badge variant="outline" size="sm">
                      p. {item.page_number}
                    </Badge>
                  )}
                  {item.source_type && (
                    <Badge variant="default" size="sm">
                      {item.source_type}
                    </Badge>
                  )}
                </div>

                {item.snippet && (
                  <blockquote className="mt-2 p-2.5 bg-[var(--surface-secondary)]/60 rounded-[var(--radius-xs)] border-l-2 border-l-[var(--accent-primary)] text-xs text-[var(--text-secondary)] font-mono leading-relaxed break-words whitespace-pre-wrap">
                    "{item.snippet}"
                  </blockquote>
                )}
              </div>
            </div>

            <Link href={`/spaces/${spaceId}/documents`}>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-xs text-[var(--accent-text)]"
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Inspect
              </Button>
            </Link>
          </div>
        </Surface>
      ))}
    </div>
  );
};
