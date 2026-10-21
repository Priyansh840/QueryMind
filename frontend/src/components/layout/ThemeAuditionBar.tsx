"use client";

import React, { useState, useEffect } from "react";
import { Palette, Check, ChevronUp, ChevronDown, Sparkles } from "lucide-react";

export interface AuditionTheme {
  id: string;
  num: string;
  name: string;
  family: string;
  desc: string;
  bg: string;
  surface: string;
  surfaceHover: string;
  accent: string;
  accentSoft: string;
  accentSecondary: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  sidebarBg: string;
  badgeColor: string;
}

export const TOP_5_THEMES: AuditionTheme[] = [
  {
    id: "noir-titanium",
    num: "1",
    name: "Architectural Noir & Titanium",
    family: "Classic Black & White",
    desc: "Swiss Bauhaus & Vercel restraint. Zinc-noir basalt with crisp titanium white hierarchy.",
    bg: "#09090B",
    surface: "#121215",
    surfaceHover: "#1A1A1F",
    accent: "#FAFAFA",
    accentSoft: "rgba(250, 250, 250, 0.12)",
    accentSecondary: "#A1A1AA",
    border: "rgba(255, 255, 255, 0.10)",
    borderStrong: "rgba(255, 255, 255, 0.22)",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    textTertiary: "#71717A",
    sidebarBg: "#09090B",
    badgeColor: "#FAFAFA",
  },
  {
    id: "slate-electric-iris",
    num: "2",
    name: "Obsidian Slate & Electric Iris",
    family: "Linear Blue-Purple",
    desc: "Modern engineering flagship. Midnight slate with electric indigo and ice cyan sparks.",
    bg: "#08090E",
    surface: "#0F111A",
    surfaceHover: "#171B26",
    accent: "#6366F1",
    accentSoft: "rgba(99, 102, 241, 0.15)",
    accentSecondary: "#38BDF8",
    border: "rgba(99, 102, 241, 0.18)",
    borderStrong: "rgba(99, 102, 241, 0.35)",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    textTertiary: "#64748B",
    sidebarBg: "#07080C",
    badgeColor: "#818CF8",
  },
  {
    id: "midnight-amethyst",
    num: "3",
    name: "Midnight Velvet & Royal Amethyst",
    family: "Deep Neural Purple",
    desc: "AI reasoning copilot. Midnight violet abyss with luminous royal amethyst jewel tones.",
    bg: "#090714",
    surface: "#130F24",
    surfaceHover: "#1D1736",
    accent: "#8B5CF6",
    accentSoft: "rgba(139, 92, 246, 0.15)",
    accentSecondary: "#C084FC",
    border: "rgba(139, 92, 246, 0.18)",
    borderStrong: "rgba(139, 92, 246, 0.36)",
    textPrimary: "#FAF5FF",
    textSecondary: "#C4B5FD",
    textTertiary: "#7C709E",
    sidebarBg: "#070510",
    badgeColor: "#C084FC",
  },
  {
    id: "prism-frost-cobalt",
    num: "4",
    name: "Prism Frost & Deep Cobalt",
    family: "Cyan-Blue Refraction",
    desc: "Optical glass precision. Deep marine abyss with frost cyan and periwinkle violet links.",
    bg: "#060913",
    surface: "#0D1322",
    surfaceHover: "#141C30",
    accent: "#38BDF8",
    accentSoft: "rgba(56, 189, 248, 0.15)",
    accentSecondary: "#818CF8",
    border: "rgba(56, 189, 248, 0.16)",
    borderStrong: "rgba(56, 189, 248, 0.32)",
    textPrimary: "#F0F9FF",
    textSecondary: "#94A3B8",
    textTertiary: "#64748B",
    sidebarBg: "#05070F",
    badgeColor: "#38BDF8",
  },
  {
    id: "cashmere-prism-hybrid",
    num: "5",
    name: "Obsidian Cashmere & Prism Frost",
    family: "17 + 15 + 20 Bespoke Hybrid",
    desc: "Bespoke synthesis of Bauhaus Charcoal (17), Prism Ice (15), and Cashmere Pearl (20).",
    bg: "#0D0E12",
    surface: "#15171E",
    surfaceHover: "#1E212B",
    accent: "#38BDF8",
    accentSoft: "rgba(56, 189, 248, 0.14)",
    accentSecondary: "#E2D9D2",
    border: "rgba(148, 163, 184, 0.14)",
    borderStrong: "rgba(148, 163, 184, 0.28)",
    textPrimary: "#FAF8F5",
    textSecondary: "#A3A7B2",
    textTertiary: "#6B7080",
    sidebarBg: "#0A0B0E",
    badgeColor: "#E2D9D2",
  },
];

export function applyAuditionTheme(theme: AuditionTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--bg-app", theme.bg);
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--surface-primary", theme.surface);
  root.style.setProperty("--surface-subtle", theme.surfaceHover);
  root.style.setProperty("--surface-hover", theme.surfaceHover);
  root.style.setProperty("--sidebar-bg", theme.sidebarBg);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-purple", theme.accentSecondary);
  root.style.setProperty("--accent-soft", theme.accentSoft);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--border-subtle", theme.border);
  root.style.setProperty("--border-strong", theme.borderStrong);
  root.style.setProperty("--text-primary", theme.textPrimary);
  root.style.setProperty("--text-secondary", theme.textSecondary);
  root.style.setProperty("--text-tertiary", theme.textTertiary);
  try {
    localStorage.setItem("qm-audition-theme", theme.id);
  } catch {}
}

export default function ThemeAuditionBar() {
  const [activeThemeId, setActiveThemeId] = useState<string>("slate-electric-iris");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Restore saved audition theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qm-audition-theme");
      if (saved) {
        const found = TOP_5_THEMES.find((t) => t.id === saved);
        if (found) {
          setActiveThemeId(found.id);
          applyAuditionTheme(found);
          return;
        }
      }
      // Default to Option 2 (Linear Slate) or Option 5
      const defaultTheme = TOP_5_THEMES[1];
      applyAuditionTheme(defaultTheme);
    } catch {}
  }, []);

  const handleSelect = (theme: AuditionTheme) => {
    setActiveThemeId(theme.id);
    applyAuditionTheme(theme);
  };

  const currentTheme = TOP_5_THEMES.find((t) => t.id === activeThemeId) || TOP_5_THEMES[1];

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 10px",
          borderRadius: "9999px",
          background: "rgba(15, 17, 26, 0.92)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.75), 0 0 20px rgba(99, 102, 241, 0.15)",
        }}
      >
        {/* Toggle Expand / Collapse */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            color: "#FFFFFF",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "9999px",
          }}
          title="Toggle Theme Audition Bar"
        >
          <Palette size={14} color={currentTheme.accent} />
          <span style={{ letterSpacing: "0.02em" }}>Theme Audition:</span>
          <span style={{ color: currentTheme.accent, fontWeight: 700 }}>{currentTheme.name.split(" ")[0]}</span>
          {isExpanded ? <ChevronDown size={14} opacity={0.7} /> : <ChevronUp size={14} opacity={0.7} />}
        </button>

        {/* The 5 Quick Pills */}
        {isExpanded && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {TOP_5_THEMES.map((theme) => {
              const isSelected = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelect(theme)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 11px",
                    borderRadius: "9999px",
                    background: isSelected ? theme.accent : "rgba(255, 255, 255, 0.06)",
                    color: isSelected
                      ? theme.id === "noir-titanium"
                        ? "#000000"
                        : "#FFFFFF"
                      : "rgba(255, 255, 255, 0.75)",
                    border: `1px solid ${isSelected ? theme.accent : "rgba(255, 255, 255, 0.08)"}`,
                    fontSize: "11.5px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    boxShadow: isSelected ? `0 2px 10px ${theme.accent}40` : "none",
                    whiteSpace: "nowrap",
                  }}
                  title={theme.desc}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: theme.accent,
                      border: "1px solid rgba(0,0,0,0.3)",
                    }}
                  />
                  <span>
                    {theme.num}. {theme.name.split("&")[0].trim()}
                  </span>
                  {isSelected && <Check size={11} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Micro Info Caption when expanded */}
      {isExpanded && (
        <div
          style={{
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.65)",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            padding: "2px 12px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          Active: <strong style={{ color: currentTheme.accent }}>Option {currentTheme.num}: {currentTheme.name}</strong> • <em>{currentTheme.desc}</em>
        </div>
      )}
    </div>
  );
}
