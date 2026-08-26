"use client";

import React from "react";
import { MessageItem, Citation, ActionProposal } from "@/types/api";
import { Avatar } from "@/components/ui/Avatar";
import { CitationPill } from "@/components/chat/CitationPill";
import { ActionProposalCard } from "@/components/chat/ActionProposalCard";
import { Sparkles, User as UserIcon } from "lucide-react";

interface MessageBubbleProps {
  message: MessageItem;
  onCitationClick?: (citation: string | Citation) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCitationClick,
}) => {
  const isUser = message.role === "user";
  const citations = message.citations || [];
  const proposals = message.metadata_json?.action_proposals || [];

  return (
    <div
      className={`flex items-start gap-3.5 my-4 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-[var(--radius-xs)] flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
            : "bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)]"
        }`}
      >
        {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
      </div>

      {/* Message Content Canvas */}
      <div
        className={`max-w-2xl rounded-[var(--radius-md)] p-4 space-y-3 ${
          isUser
            ? "bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
            : "bg-[var(--surface-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
        }`}
      >
        {/* Message Header */}
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] border-b border-[var(--border-subtle)]/60 pb-1.5 mb-1">
          <span className="font-semibold uppercase tracking-wider">
            {isUser ? "You" : "MYND Assistant"}
          </span>
          <span>
            {message.created_at
              ? new Date(message.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now"}
          </span>
        </div>

        {/* Message Body */}
        <div className="text-xs leading-relaxed whitespace-pre-wrap font-normal text-[var(--text-primary)]">
          {message.content}
        </div>

        {/* Citations Section */}
        {citations && citations.length > 0 && (
          <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Grounded Sources ({citations.length})
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {citations.map((cit, idx) => (
                <CitationPill
                  key={idx}
                  citation={cit}
                  onClick={() => onCitationClick?.(cit)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Proposals Section */}
        {proposals && proposals.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
              Proposed Actions ({proposals.length})
            </div>
            <div className="space-y-2">
              {proposals.map((prop) => (
                <ActionProposalCard key={prop.id || prop.proposal_id} proposal={prop} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
