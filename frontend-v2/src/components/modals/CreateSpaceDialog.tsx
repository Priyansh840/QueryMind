"use client";

import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Space } from "@/types/api";

interface CreateSpaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (space: Space) => void;
}

const SPACE_COLORS = [
  "#6366f1", // Indigo
  "#38bdf8", // Cyan
  "#10b981", // Emerald
  "#a78bfa", // Violet
  "#f59e0b", // Amber
  "#f43f5e", // Rose
];

export function CreateSpaceDialog({
  isOpen,
  onClose,
  onCreated,
}: CreateSpaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(SPACE_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await apiClient<Space>("/api/v1/spaces", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          color: selectedColor,
        }),
      });

      onCreated(created);
      onClose();
    } catch (err: any) {
      console.error("Failed to create space:", err);
      setError(err?.message || "Failed to create space");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0c0d14] border border-white/[0.08] rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-white text-sm">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedColor }}
            />
            <span>Create New Space</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Space Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Growth Strategy"
              required
              className="w-full bg-[#14141d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#6366f1]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Strategic mission and vector scope..."
              className="w-full bg-[#14141d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#6366f1]/50 resize-none h-16"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Theme Color</label>
            <div className="flex items-center gap-3 pt-1">
              {SPACE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    selectedColor === c ? "scale-125 ring-2 ring-white" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-40"
            >
              {isSubmitting ? "Creating..." : "Create Space"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
