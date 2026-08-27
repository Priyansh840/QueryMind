"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { MemoryItem } from "@/types/api";
import { Brain, Sparkles, AlertCircle } from "lucide-react";

interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onMemoryCreated: (memory: MemoryItem) => void;
}

export const CreateMemoryModal: React.FC<CreateMemoryModalProps> = ({
  isOpen,
  onClose,
  spaceId,
  onMemoryCreated,
}) => {
  const [content, setContent] = useState("");
  const [memoryType, setMemoryType] = useState("fact");
  const [importance, setImportance] = useState("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const created = await apiClient<MemoryItem>("/api/v1/memories", {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          content: content.trim(),
          memory_type: memoryType,
          importance: importance,
        }),
      });
      onMemoryCreated(created);
      setContent("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record memory.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Record Space Memory">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 bg-[var(--error-surface)] border border-[var(--error-border)] rounded-[var(--radius-xs)] text-xs text-[var(--error-text)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Memory Content
          </label>
          <textarea
            required
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. Project requires strict adherence to ISO-27001 data residency..."
            className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-[var(--radius-sm)] p-2.5 text-xs text-[var(--text-primary)] outline-none resize-none transition-mynd"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Type
            </label>
            <select
              value={memoryType}
              onChange={(e) => setMemoryType(e.target.value)}
              className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-2 text-xs text-[var(--text-primary)] outline-none"
            >
              <option value="fact">Fact</option>
              <option value="decision">Decision</option>
              <option value="preference">Preference</option>
              <option value="relationship">Relationship</option>
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

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
            Save Memory
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
