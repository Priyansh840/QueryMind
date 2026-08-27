"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { WorkflowDetail } from "@/types/api";
import { Zap, Sparkles, AlertCircle } from "lucide-react";

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onWorkflowCreated: (workflow: WorkflowDetail) => void;
}

export const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({
  isOpen,
  onClose,
  spaceId,
  onWorkflowCreated,
}) => {
  const [goal, setGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<WorkflowDetail>("/api/v1/workflows", {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          goal: goal.trim(),
        }),
      });
      onWorkflowCreated(data);
      setGoal("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to plan workflow.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Launch Autonomous Workflow">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 bg-[var(--error-surface)] border border-[var(--error-border)] rounded-[var(--radius-xs)] text-xs text-[var(--error-text)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Objective / Task Description
          </label>
          <textarea
            required
            autoFocus
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Audit all uploaded customer research documents, synthesize friction points, and propose an onboarding optimization workflow..."
            className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-[var(--radius-sm)] p-2.5 text-xs text-[var(--text-primary)] outline-none resize-none transition-mynd"
          />
        </div>

        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-secondary)]/60 text-xs text-[var(--text-secondary)] space-y-1">
          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            <span>Multi-Agent Orchestration</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            MYND will autonomously gather space context, formulate research sub-tasks, analyze knowledge chunks, and propose structured actions. Mutating actions strictly require your approval before execution.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading} leftIcon={<Zap className="w-3.5 h-3.5" />}>
            Plan & Execute
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
