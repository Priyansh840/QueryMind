"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { Folder, Palette } from "lucide-react";

interface CreateSpaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (spaceId: string) => void;
}

const COLOR_OPTIONS = [
  { label: "Pine", value: "#0f766e" },
  { label: "Ocean", value: "#0284c7" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Amber", value: "#d97706" },
  { label: "Rose", value: "#e11d48" },
  { label: "Emerald", value: "#059669" },
  { label: "Slate", value: "#475569" },
];

export const CreateSpaceDialog: React.FC<CreateSpaceDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createSpace } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const newSpace = await createSpace({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
      });

      setName("");
      setDescription("");
      setSelectedColor(COLOR_OPTIONS[0].value);
      onClose();
      if (onSuccess) {
        onSuccess(newSpace.id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create space. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Space"
      description="Spaces organize your documents, projects, and autonomous actions into an isolated context."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Space Name</label>
          <Input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Startup, College Project, Research"
            leftIcon={<Folder className="w-4 h-4 text-[var(--accent-text)]" />}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Description <span className="text-[var(--text-muted)]">(optional)</span>
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context or objectives for this workspace..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Workspace Color</span>
          </label>
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setSelectedColor(c.value)}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  selectedColor === c.value
                    ? "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--surface-primary)] scale-110"
                    : "opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-[var(--radius-xs)] bg-[var(--error-surface)] text-[var(--error-text)] border border-[var(--error-border)]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Create Space
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
