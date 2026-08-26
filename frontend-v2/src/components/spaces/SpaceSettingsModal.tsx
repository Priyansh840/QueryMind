"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { Space } from "@/types/api";
import { Folder, Palette, Trash2, AlertTriangle } from "lucide-react";

interface SpaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space | null;
  onDeleted?: () => void;
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

export const SpaceSettingsModal: React.FC<SpaceSettingsModalProps> = ({
  isOpen,
  onClose,
  space,
  onDeleted,
}) => {
  const { updateSpace, deleteSpace } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (space) {
      setName(space.name || "");
      setDescription(space.description || "");
      setSelectedColor(space.color || COLOR_OPTIONS[0].value);
      setShowDeleteConfirm(false);
      setError(null);
    }
  }, [space]);

  if (!space) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await updateSpace(space.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update space.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteSpace(space.id);
      onClose();
      if (onDeleted) {
        onDeleted();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete space.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Space Settings — ${space.name}`}
      description="Configure workspace name, context description, or manage lifecycle."
    >
      <div className="space-y-6">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Space Name</label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace Name"
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
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isLoading || isDeleting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </form>

        {/* Danger Zone: Delete Space */}
        <div className="pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[var(--error-text)] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Delete Workspace</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Permanently delete this space, its documents, and purge associated Qdrant vectors.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Space
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  isLoading={isDeleting}
                  onClick={handleDelete}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Confirm Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
