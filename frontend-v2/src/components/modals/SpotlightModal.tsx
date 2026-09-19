"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutGrid,
  MessageSquare,
  Network,
  BookOpen,
  Brain,
  Sparkles,
  CheckCircle2,
  Zap,
  Settings,
  ArrowRight,
  Command,
  FileText,
  Clock,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface SpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onOpenCreateSpace?: () => void;
}

interface SearchResultItem {
  id: string;
  title: string;
  type: string;
  href?: string;
  icon?: any;
  badge?: string;
  description?: string;
  action?: () => void;
}

export function SpotlightModal({
  isOpen,
  onClose,
  spaceId,
  onOpenCreateSpace,
}: SpotlightModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [remoteResults, setRemoteResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setRemoteResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global shortcut handler (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced API search when typing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setRemoteResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient<any>(
          `/api/v1/search?space_id=${spaceId}&query=${encodeURIComponent(trimmed)}&limit=6`
        );
        const items: SearchResultItem[] = [];

        if (Array.isArray(res?.results)) {
          res.results.forEach((r: any, idx: number) => {
            const isDoc = r.type === "document" || r.entity_type === "document";
            const isMem = r.type === "memory" || r.entity_type === "memory";
            items.push({
              id: `remote-${r.id || idx}`,
              title: r.title || r.content?.slice(0, 45) || "Knowledge Item",
              description: r.snippet || r.content?.slice(0, 70),
              type: isDoc ? "Document" : isMem ? "Memory" : "Concept",
              icon: isDoc ? FileText : isMem ? Brain : Sparkles,
              href: isDoc
                ? `/spaces/${spaceId}/knowledge/documents/${r.id}`
                : isMem
                ? `/spaces/${spaceId}/memory`
                : `/spaces/${spaceId}/knowledge`,
            });
          });
        }
        setRemoteResults(items);
      } catch (err) {
        console.warn("Spotlight search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, spaceId]);

  if (!isOpen) return null;

  // Static Navigation Destinations
  const navCommands: SearchResultItem[] = [
    {
      id: "nav-overview",
      title: "Executive Overview",
      description: "Space cockpit, metrics, active initiatives and quick capture",
      type: "Command",
      icon: LayoutGrid,
      href: `/spaces/${spaceId}`,
    },
    {
      id: "nav-conversations",
      title: "Reasoning Sessions",
      description: "Chat with AI model, citations, live thoughts & multi-turn dialog",
      type: "Command",
      icon: MessageSquare,
      href: `/spaces/${spaceId}/conversations`,
    },
    {
      id: "nav-map",
      title: "Neural Knowledge Map",
      description: "Interactive constellation graph of concepts, docs, and memories",
      type: "Intelligence",
      icon: Network,
      href: `/spaces/${spaceId}/map`,
    },
    {
      id: "nav-knowledge",
      title: "Documents Vault",
      description: "Structured files, uploaded PDFs, notes and semantic vector embeddings",
      type: "Intelligence",
      icon: BookOpen,
      href: `/spaces/${spaceId}/knowledge`,
    },
    {
      id: "nav-memory",
      title: "Invariant Memory & Axioms",
      description: "Core axioms, confidence scores, 1-click reinforce and principle rules",
      type: "Intelligence",
      icon: Brain,
      href: `/spaces/${spaceId}/memory`,
    },
    {
      id: "nav-reflection",
      title: "Cognitive Insights & Reflection",
      description: "Weekly telemetry, learning patterns, growth statistics & focus recommendations",
      type: "Intelligence",
      icon: Sparkles,
      href: `/spaces/${spaceId}/reflection`,
    },
    {
      id: "nav-work",
      title: "Initiatives & Projects",
      description: "Strategic initiatives, milestones, tasks, and progress tracking",
      type: "Execution",
      icon: CheckCircle2,
      href: `/spaces/${spaceId}/work`,
    },
    {
      id: "nav-tasks",
      title: "Actions & Audit Ledger",
      description: "Review pending autonomous agent actions, approve/reject & audit log",
      type: "Execution",
      icon: Zap,
      href: `/spaces/${spaceId}/tasks`,
    },
    {
      id: "nav-settings",
      title: "Workspace Settings",
      description: "Manage space metadata, members, and autonomous system policies",
      type: "Governance",
      icon: Settings,
      href: `/spaces/${spaceId}/settings`,
    },
  ];

  // Quick Action Commands
  const actionCommands: SearchResultItem[] = [
    {
      id: "action-new-space",
      title: "Create New Workspace",
      description: "Spawn an isolated workspace with distinct memory and docs",
      type: "Action",
      icon: Plus,
      action: () => {
        onClose();
        if (onOpenCreateSpace) onOpenCreateSpace();
      },
    },
  ];

  // Filter items matching query
  const q = query.toLowerCase().trim();
  const matchedNav = navCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
  );

  const matchedActions = actionCommands.filter(
    (a) => a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
  );

  const allItems = [...matchedActions, ...remoteResults, ...matchedNav];

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev + 1) % allItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev - 1 + allItems.length) % allItems.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#0d0e14] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-[#12131c]/60">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search documents, memories, or jump to screen..."
            className="w-full bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-0"
          />
          {isSearching && (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0 mr-2" />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon || ArrowRight;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-white/[0.08] text-white shadow-xs"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-[#6366f1]/20 border-[#6366f1]/40 text-[#a5b4fc]"
                          : "bg-white/5 border-white/5 text-slate-400"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.type && (
                          <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                            {item.type}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-3.5 h-3.5 text-slate-500 shrink-0 ml-2 transition-transform ${
                      isSelected ? "translate-x-0.5 text-white" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-[#090a0f] flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono text-[10px]">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono text-[10px]">
                ↵
              </kbd>{" "}
              Select
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Command className="w-3 h-3 text-slate-400" />
            <span>Spotlight Command</span>
          </div>
        </div>
      </div>
    </div>
  );
}
