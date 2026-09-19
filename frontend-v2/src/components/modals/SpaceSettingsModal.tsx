"use client";

import React, { useState } from "react";
import { X, Settings, Trash2 } from "lucide-react";
import { Space } from "@/types/api";
import { apiClient } from "@/lib/api/client";

interface SpaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space | null;
  onDeleted?: () => void;
}

export const SpaceSettingsModal: React.FC<SpaceSettingsModalProps> = ({
  isOpen,
  onClose,
  space,
  onDeleted,
}) => {
  const [name, setName] = useState(space?.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !space) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await apiClient(`/api/v1/spaces/${space.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      onClose();
    } catch (err) {
      console.error("Failed to update space:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${space.name}"?`)) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/spaces/${space.id}`, {
        method: "DELETE",
      });
      if (onDeleted) onDeleted();
      onClose();
    } catch (err) {
      console.error("Failed to delete space:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-[#0f0f14] border border-white/10 shadow-2xl p-6 space-y-5 z-50 text-white animate-in zoom-in-95 duration-150 select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Space Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#15151c] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#818cf8]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-[#f87171] hover:text-red-400 transition-colors p-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Space</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer disabled:opacity-40 shadow-sm"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
