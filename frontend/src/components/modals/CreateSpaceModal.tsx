"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMyndStore, AgentPersona } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";

const COLOR_PRESETS = [
  { name: "White", color: "#FFFFFF", bg: "rgba(255, 255, 255, 0.15)" },
  { name: "Silver", color: "#E5E5E5", bg: "rgba(229, 229, 229, 0.15)" },
  { name: "Zinc", color: "#D4D4D4", bg: "rgba(212, 212, 212, 0.15)" },
  { name: "Neutral", color: "#A3A3A3", bg: "rgba(163, 163, 163, 0.15)" },
  { name: "Stone", color: "#737373", bg: "rgba(115, 115, 115, 0.15)" },
  { name: "Dark", color: "#525252", bg: "rgba(82, 82, 82, 0.15)" },
  { name: "Carbon", color: "#404040", bg: "rgba(64, 64, 64, 0.15)" },
];

const ICONS = [
  { id: "briefcase", label: "Career" },
  { id: "atom", label: "Science" },
  { id: "rocket", label: "Startup" },
  { id: "graduation", label: "College" },
  { id: "sparkles", label: "Ideas" },
  { id: "terminal", label: "Code" },
  { id: "folder", label: "General" },
];

const AGENT_TEMPLATES: Record<string, AgentPersona> = {
  briefcase: {
    name: "Apex Strategist",
    title: "Senior Career & Systems Architect",
    specialty: "Resume tuning, architectural interviews & career roadmapping",
    status: "active",
    avatarBg: "#262626",
  },
  atom: {
    name: "Synthesis Fellow",
    title: "Lead AI & Literature Researcher",
    specialty: "Literature review, citation mapping & technical proofs",
    status: "active",
    avatarBg: "#262626",
  },
  rocket: {
    name: "Venture Architect",
    title: "Product Technologist & GTM Strategist",
    specialty: "Product specs, investor narratives & execution roadmaps",
    status: "active",
    avatarBg: "#262626",
  },
  graduation: {
    name: "Academic Scholar",
    title: "Coursework & Concept Distiller",
    specialty: "Lecture synthesis, practice problem generation & revision",
    status: "active",
    avatarBg: "#262626",
  },
  sparkles: {
    name: "Creative Catalyst",
    title: "Lateral Brain Dump Co-pilot",
    specialty: "Idea collisions, rapid prototyping & divergent thinking",
    status: "active",
    avatarBg: "#262626",
  },
  terminal: {
    name: "Kernel Auditor",
    title: "Full-Stack & Systems Co-pilot",
    specialty: "Code analysis, refactoring patterns & benchmark review",
    status: "active",
    avatarBg: "#262626",
  },
  folder: {
    name: "Knowledge Curator",
    title: "Domain Intelligence Assistant",
    specialty: "Document indexing, memory retrieval & synthesis",
    status: "active",
    avatarBg: "#262626",
  },
};

export default function CreateSpaceModal() {
  const router = useRouter();
  const isCreateSpaceOpen = useMyndStore((state) => state.isCreateSpaceOpen);
  const closeCreateSpace = useMyndStore((state) => state.closeCreateSpace);
  const addSpace = useMyndStore((state) => state.addSpace);
  const selectSpace = useMyndStore((state) => state.selectSpace);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].color);
  const [selectedIcon, setSelectedIcon] = useState("briefcase");
  const [goalTitle, setGoalTitle] = useState("");
  const [agentName, setAgentName] = useState("Apex Strategist");
  const [agentSpecialty, setAgentSpecialty] = useState("Distributed systems & technical mastery");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateSpaceOpen) return null;

  const handleIconSelect = (iconId: string) => {
    setSelectedIcon(iconId);
    const template = AGENT_TEMPLATES[iconId];
    if (template) {
      setAgentName(template.name);
      setAgentSpecialty(template.specialty);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const spaceSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      // 1. Attempt to create in backend DB
      const res = await queryMindApi.createSpace({
        name: name.trim(),
        description: desc.trim() || undefined,
        color: selectedColor,
        icon: selectedIcon,
        slug: spaceSlug,
      }).catch((err) => {
        console.warn("Backend space creation fallback to local:", err);
        return null;
      });

      const spaceId = res?.id || spaceSlug;

      // 2. Add to Zustand store
      addSpace({
        id: spaceId,
        name: name.trim(),
        desc: desc.trim() || `Domain intelligence space for ${name.trim()}`,
        color: selectedColor,
        icon: selectedIcon,
        goal: goalTitle.trim() ? { title: goalTitle.trim(), progress: 0 } : undefined,
        milestones: goalTitle.trim()
          ? [
              { id: `m-${Date.now()}-1`, title: `Seed initial documents for ${name.trim()}`, completed: false },
              { id: `m-${Date.now()}-2`, title: goalTitle.trim(), completed: false },
            ]
          : undefined,
        agentPersona: {
          name: agentName.trim() || `${name.trim()} Specialist`,
          title: `Autonomous Co-pilot for ${name.trim()}`,
          specialty: agentSpecialty.trim() || "Domain synthesis & continuous analysis",
          status: "active",
          avatarBg: selectedColor,
        },
      });

      selectSpace(spaceId);
      closeCreateSpace();
      setName("");
      setDesc("");
      setGoalTitle("");
      router.push(`/spaces/${spaceId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="settings-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCreateSpace();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="settings-box"
        style={{
          maxWidth: "600px",
          width: "92%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Modal Header with Space Color Preview */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            background: `linear-gradient(135deg, ${selectedColor}18 0%, var(--surface) 100%)`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: selectedColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: selectedColor === "#FFFFFF" || selectedColor === "#E5E5E5" || selectedColor === "#D4D4D4" ? "#000000" : "#FFFFFF",
                boxShadow: `0 0 16px ${selectedColor}44`,
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Create Knowledge Space
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                Dedicated memory partition with an autonomous resident AI specialist
              </p>
            </div>
          </div>
          <button
            onClick={closeCreateSpace}
            className="close-btn"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Space Name */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
              Space Name <span style={{ color: selectedColor }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Systems, Thesis Research, Seed Pitch..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
              Mission / Description
            </label>
            <textarea
              rows={2}
              placeholder="What core knowledge, goals, or workflows belong in this space?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                resize: "none",
                outline: "none",
              }}
            />
          </div>

          {/* Color & Energy Palette */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Domain Aura / Color
            </label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setSelectedColor(p.color)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: selectedColor === p.color ? `2px solid ${p.color}` : "1px solid var(--border)",
                    background: selectedColor === p.color ? p.bg : "var(--surface)",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                >
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color }} />
                  <span style={{ fontSize: "12px", fontWeight: selectedColor === p.color ? 600 : 500, color: "var(--text-primary)" }}>
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Category Archetype
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {ICONS.map((ico) => (
                <button
                  key={ico.id}
                  type="button"
                  onClick={() => handleIconSelect(ico.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: selectedIcon === ico.id ? `1.5px solid ${selectedColor}` : "1px solid var(--border)",
                    background: selectedIcon === ico.id ? `${selectedColor}15` : "var(--surface)",
                    color: selectedIcon === ico.id ? selectedColor : "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {ico.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Goal */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
              Target Objective / Goal (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Master High-Throughput Stream Processing"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          {/* Resident AI Specialist */}
          <div
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span className="alive-dot" style={{ background: selectedColor }} />
              <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-primary)" }}>
                Resident AI Specialist
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                  Specialist Codename
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                  Focus Specialty
                </label>
                <input
                  type="text"
                  value={agentSpecialty}
                  onChange={(e) => setAgentSpecialty(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={closeCreateSpace}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background: selectedColor,
                color: selectedColor === "#FFFFFF" || selectedColor === "#E5E5E5" || selectedColor === "#D4D4D4" ? "#000000" : "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isSubmitting || !name.trim() ? "not-allowed" : "pointer",
                opacity: isSubmitting || !name.trim() ? 0.6 : 1,
                boxShadow: `0 2px 10px ${selectedColor}33`,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isSubmitting ? "Initializing..." : "Launch Space"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
