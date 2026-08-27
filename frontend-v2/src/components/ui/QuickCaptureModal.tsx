"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import {
  FileText,
  Brain,
  MessageSquare,
  Sparkles,
  Plus,
  AlertCircle,
} from "lucide-react";

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onCaptured?: () => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  spaceId,
  onCaptured,
}) => {
  const [activeTab, setActiveTab] = useState<"memory" | "note">("memory");
  const [content, setContent] = useState("");
  const [type, setType] = useState("fact");
  const [importance, setImportance] = useState("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === "memory") {
        await apiClient("/api/v1/memories", {
          method: "POST",
          body: JSON.stringify({
            space_id: spaceId,
            content: content.trim(),
            memory_type: type,
            importance: importance,
          }),
        });
      } else {
        // Quick note saved as memory preference / note
        await apiClient("/api/v1/memories", {
          method: "POST",
          body: JSON.stringify({
            space_id: spaceId,
            content: content.trim(),
            memory_type: "note",
            importance: "medium",
          }),
        });
      }

      setContent("");
      if (onCaptured) onCaptured();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to capture item.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Quick Capture">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("memory")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-semibold transition-mynd ${
              activeTab === "memory"
                ? "bg-[var(--surface-secondary)] text-[var(--accent-text)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Workspace Memory</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("note")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-semibold transition-mynd ${
              activeTab === "note"
                ? "bg-[var(--surface-secondary)] text-[var(--accent-text)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quick Fact / Note</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 bg-[var(--error-surface)] border border-[var(--error-border)] rounded-[var(--radius-xs)] text-xs text-[var(--error-text)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              {activeTab === "memory" ? "Rule, constraint, or fact" : "Note content"}
            </label>
            <textarea
              required
              autoFocus
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                activeTab === "memory"
                  ? "e.g. Always prioritize ISO-27001 compliant vendors..."
                  : "e.g. Discussed new API rate limit with team on Tuesday..."
              }
              className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-[var(--radius-sm)] p-2.5 text-xs text-[var(--text-primary)] outline-none resize-none transition-mynd"
            />
          </div>

          {activeTab === "memory" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Category
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-2 text-xs text-[var(--text-primary)] outline-none"
                >
                  <option value="fact">Fact</option>
                  <option value="decision">Decision</option>
                  <option value="preference">Preference</option>
                  <option value="pattern">Pattern</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Priority
                </label>
                <select
                  value={importance}
                  onChange={(e) => setImportance(e.target.value)}
                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-2 text-xs text-[var(--text-primary)] outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
              Capture
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};
