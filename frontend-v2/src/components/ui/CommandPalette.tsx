"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Search, Folder, MessageSquare, FileText, Zap, ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";

export interface CommandItem {
  id: string;
  category: "Spaces" | "Conversations" | "Documents" | "Actions" | "Navigation";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAskMynd?: (query: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onAskMynd,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reusable static / contextual commands foundation
  const defaultItems: CommandItem[] = [
    {
      id: "nav-spaces",
      category: "Navigation",
      title: "View All Spaces",
      subtitle: "Jump to workspace directory",
      icon: <Folder className="w-4 h-4 text-[var(--accent-text)]" />,
      onSelect: () => {
        window.location.href = "/spaces";
        onClose();
      },
    },
    {
      id: "nav-knowledge",
      category: "Navigation",
      title: "Explore Knowledge Graph",
      subtitle: "Search synced documents and memory graph",
      icon: <FileText className="w-4 h-4 text-[var(--info-text)]" />,
      onSelect: () => {
        window.location.href = "/knowledge";
        onClose();
      },
    },
    {
      id: "nav-activity",
      category: "Navigation",
      title: "Recent Intelligence Activity",
      subtitle: "Review workflow runs & audit events",
      icon: <Zap className="w-4 h-4 text-[var(--warning-text)]" />,
      onSelect: () => {
        window.location.href = "/activity";
        onClose();
      },
    },
  ];

  const filteredItems = defaultItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Command Box */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-subtle)] gap-3 bg-[var(--surface-primary)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search workspace, or ask MYND..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-xs)] select-none">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim().length > 0 && onAskMynd && (
            <div
              onClick={() => {
                onAskMynd(query);
                onClose();
              }}
              className="flex items-center justify-between p-2.5 mb-1 rounded-[var(--radius-sm)] bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)] cursor-pointer hover:bg-[var(--accent-surface)]/80 transition-mynd"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                <div>
                  <div className="text-xs font-semibold">Ask MYND: &ldquo;{query}&rdquo;</div>
                  <div className="text-[11px] opacity-80">Orchestrate multi-agent context retrieval</div>
                </div>
              </div>
              <CornerDownLeft className="w-3.5 h-3.5 opacity-70" />
            </div>
          )}

          {filteredItems.length > 0 ? (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Quick Navigation
              </div>
              {filteredItems.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] cursor-pointer transition-mynd text-xs",
                    idx === selectedIndex
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{item.title}</div>
                      {item.subtitle && <div className="text-[11px] text-[var(--text-muted)]">{item.subtitle}</div>}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No matching commands or workspace records found for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none">
          <span>Navigate with <kbd className="px-1 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">↓</kbd></span>
          <span>Select with <kbd className="px-1 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">↵</kbd></span>
        </div>
      </div>
    </div>
  );
};
