"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  Folder,
  MessageSquare,
  FileText,
  Zap,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
  Brain,
  ShieldAlert,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { SearchResponse, SearchResultItem } from "@/types/api";
import { QuickCaptureModal } from "./QuickCaptureModal";

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
  const router = useRouter();
  const { currentSpace, spaces } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  const activeSpace = currentSpace || spaces[0];
  const spaceId = activeSpace?.id;

  // Debounced search query against backend
  useEffect(() => {
    if (!query.trim() || !spaceId || !isOpen) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiClient<SearchResponse>(
          `/api/v1/search?query=${encodeURIComponent(query.trim())}&space_id=${spaceId}&limit=12`
        );
        setSearchResults(data.results || []);
      } catch (err) {
        console.error("Global search failed:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, spaceId, isOpen]);

  // Default Quick Commands
  const defaultActions = [
    {
      id: "action-capture",
      category: "Quick Actions",
      title: "Quick Capture",
      subtitle: "Record a rule, constraint, or quick fact",
      icon: <Plus className="w-4 h-4 text-[var(--accent-text)]" />,
      onSelect: () => {
        setIsQuickCaptureOpen(true);
      },
    },
    {
      id: "nav-overview",
      category: "Navigation",
      title: "Workspace Overview",
      subtitle: `Jump to ${activeSpace?.name || "Space"} Overview`,
      icon: <Folder className="w-4 h-4 text-[var(--accent-text)]" />,
      onSelect: () => {
        if (spaceId) router.push(`/spaces/${spaceId}`);
        onClose();
      },
    },
    {
      id: "nav-memory",
      category: "Navigation",
      title: "Space Memory & Insights",
      subtitle: "Review synthesized facts and connection graph",
      icon: <Brain className="w-4 h-4 text-purple-400" />,
      onSelect: () => {
        if (spaceId) router.push(`/spaces/${spaceId}/memory`);
        onClose();
      },
    },
    {
      id: "nav-docs",
      category: "Navigation",
      title: "Document Knowledge",
      subtitle: "Browse and upload workspace documents",
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      onSelect: () => {
        if (spaceId) router.push(`/spaces/${spaceId}/documents`);
        onClose();
      },
    },
    {
      id: "nav-chat",
      category: "Navigation",
      title: "New Conversation",
      subtitle: "Start multi-agent collaborative chat",
      icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
      onSelect: () => {
        if (spaceId) router.push(`/spaces/${spaceId}/conversations`);
        onClose();
      },
    },
  ];

  const renderIcon = (type: string) => {
    switch (type) {
      case "document":
      case "knowledge":
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "conversation":
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case "decision":
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case "memory":
        return <Brain className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[var(--accent-text)]" />;
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    router.push(item.href);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
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
  }, [query, searchResults]);

  if (!isOpen) return null;

  return (
    <>
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
              placeholder="Search documents, conversations, decisions, memories..."
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            />
            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-text)] shrink-0" />}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-xs)] select-none">
              ESC
            </kbd>
          </div>

          {/* List Area */}
          <div className="max-h-96 overflow-y-auto p-2">
            {/* Ask MYND Option */}
            {query.trim().length > 0 && (
              <div
                onClick={() => {
                  if (spaceId) {
                    router.push(`/spaces/${spaceId}/conversations`);
                    onClose();
                  }
                }}
                className="flex items-center justify-between p-2.5 mb-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)] cursor-pointer hover:bg-[var(--accent-surface)]/80 transition-mynd"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                  <div>
                    <div className="text-xs font-semibold">Ask MYND: &ldquo;{query}&rdquo;</div>
                    <div className="text-[11px] opacity-80">Start multi-agent reasoning session</div>
                  </div>
                </div>
                <CornerDownLeft className="w-3.5 h-3.5 opacity-70" />
              </div>
            )}

            {/* Dynamic Search Results */}
            {query.trim().length > 0 ? (
              searchResults.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Workspace Matches ({searchResults.length})
                  </div>
                  {searchResults.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item)}
                      className={cn(
                        "flex items-start justify-between p-2.5 rounded-[var(--radius-sm)] cursor-pointer transition-mynd text-xs gap-3",
                        idx === selectedIndex
                          ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      )}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5 shrink-0">{renderIcon(item.type)}</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--text-primary)] truncate">
                            {item.title}
                          </div>
                          {item.snippet && (
                            <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                              {item.snippet}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider shrink-0 mt-0.5">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : !isSearching ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No matching records found in this Space for &ldquo;{query}&rdquo;.
                </div>
              ) : null
            ) : (
              /* Default Quick Navigation & Actions */
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Quick Navigation & Actions
                </div>
                {defaultActions.map((item, idx) => (
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
            )}
          </div>

          {/* Footer Info */}
          <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none">
            <span>Scoped to active Space: <strong className="text-[var(--text-primary)]">{activeSpace?.name || "General"}</strong></span>
            <span>Press <kbd className="px-1 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">ESC</kbd> to exit</span>
          </div>
        </div>
      </div>

      {spaceId && (
        <QuickCaptureModal
          isOpen={isQuickCaptureOpen}
          onClose={() => setIsQuickCaptureOpen(false)}
          spaceId={spaceId}
        />
      )}
    </>
  );
};
