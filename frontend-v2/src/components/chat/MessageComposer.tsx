"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowUp, Sparkles, CornerDownLeft } from "lucide-react";

interface MessageComposerProps {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  disabled = false,
  placeholder = "Ask MYND about this space...",
}) => {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!content.trim() || disabled) return;
    const textToSend = content.trim();
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    onSend(textToSend);
  };

  return (
    <div className="relative border border-[var(--border-default)] rounded-[var(--radius-md)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-sm)] focus-within:border-[var(--accent-primary)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] transition-mynd">
      <textarea
        ref={textareaRef}
        rows={1}
        value={content}
        disabled={disabled}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none px-2 py-1 max-h-[180px] disabled:opacity-50"
      />

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] px-2">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
          <span>Enter to send, Shift+Enter for new line</span>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!content.trim() || disabled}
          onClick={handleSubmit}
          className="!p-1.5 !h-7 !w-7 rounded-full flex items-center justify-center"
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
