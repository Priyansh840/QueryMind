"use client";

import React, { useState } from "react";
import { X, Sparkles, Check, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Space } from "@/types/api";
import { SPACE_ARCHETYPES, SpaceArchetypeId } from "@/lib/spaces/spaceArchetypes";

interface CreateSpaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (space: Space) => void;
  initialArchetype?: SpaceArchetypeId;
}

const SPACE_COLORS = [
  "#f59e0b", // Amber (Study)
  "#10b981", // Emerald (Tasks)
  "#06b6d4", // Cyan (Research)
  "#8b5cf6", // Violet (Executive)
  "#6366f1", // Indigo (Sovereign)
  "#f43f5e", // Rose
];

export function CreateSpaceDialog({
  isOpen,
  onClose,
  onCreated,
  initialArchetype = "study",
}: CreateSpaceDialogProps) {
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<SpaceArchetypeId>(initialArchetype);
  const archetype = SPACE_ARCHETYPES[selectedArchetypeId];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(archetype.color);
  const [seedStarterAxioms, setSeedStarterAxioms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectArchetype = (typeId: SpaceArchetypeId) => {
    setSelectedArchetypeId(typeId);
    const target = SPACE_ARCHETYPES[typeId];
    setSelectedColor(target.color);
    if (!description || description === archetype.description) {
      setDescription(target.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create Space with archetype icon & color
      const created = await apiClient<Space>("/api/v1/spaces", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: (description.trim() || archetype.description),
          color: selectedColor,
          icon: archetype.icon,
        }),
      });

      // 2. Optional: Seed starter axioms for this archetype
      if (seedStarterAxioms && archetype.starterAxioms.length > 0) {
        await Promise.all(
          archetype.starterAxioms.map((content) =>
            apiClient("/api/v1/memories", {
              method: "POST",
              body: JSON.stringify({
                space_id: created.id,
                content,
                memory_type: "invariant",
                confidence: 0.95,
              }),
            }).catch(() => null)
          )
        );
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0c0d14] border border-white/[0.09] rounded-2xl p-6 shadow-2xl space-y-5 select-none font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{archetype.icon}</span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Create Domain Space
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure an isolated operating environment tailored for your task
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4.5">
          {/* Archetype Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Select Purpose / Task Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["study", "tasks", "research", "executive"] as SpaceArchetypeId[]).map((typeId) => {
                const item = SPACE_ARCHETYPES[typeId];
                const isSelected = selectedArchetypeId === typeId;

                return (
                  <button
                    key={typeId}
                    type="button"
                    onClick={() => handleSelectArchetype(typeId)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between space-y-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white/[0.08] border-white/30 shadow-xs"
                        : "bg-[#12131c] border-white/[0.06] hover:border-white/[0.14]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{item.icon}</span>
                      {isSelected && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        {item.name.split(" ")[0]}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {item.id}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Space Name</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Suggested: {archetype.placeholderName}
              </span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={archetype.placeholderName}
              required
              autoFocus
              className="w-full bg-[#12131c] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-white/30 transition-colors"
            />
          </div>

          {/* Description input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Objective or Context
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={archetype.description}
              className="w-full bg-[#12131c] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-white/30 transition-colors"
            />
          </div>

          {/* Color & Seed Axioms Options */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Color:</span>
              <div className="flex items-center gap-1.5">
                {SPACE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      selectedColor === c ? "scale-125 border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={seedStarterAxioms}
                onChange={(e) => setSeedStarterAxioms(e.target.checked)}
                className="rounded-sm border-white/20 bg-[#12131c] text-indigo-500 focus:ring-0"
              />
              <span>Pre-seed domain axioms</span>
            </label>
          </div>

          {/* Footer CTAs */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 shadow-sm hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <span>{isSubmitting ? "Launching..." : "Launch Space"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
