"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Check,
  Copy,
  Layers,
  Sliders,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Eye,
  RefreshCw,
  Palette,
  Terminal,
  Activity,
  Cpu,
  Feather,
  Compass,
} from "lucide-react";

export interface ColorTheme {
  id: string;
  name: string;
  family: "developer" | "intelligence" | "neural" | "luxury" | "organic" | "cosmic";
  vibe: string;
  dfii: number; // Design Feasibility & Impact Index
  bgApp: string;
  surface: string;
  surfaceHover: string;
  accent: string;
  accentGlow: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  tag: string;
}

export const THEMES_30: ColorTheme[] = [
  // ─── 0. BESPOKE USER SYNTHESIS (17 + 15 + 20) ──────────────────────────────
  {
    id: "obsidian-cashmere-prism",
    name: "Obsidian Cashmere & Prism Frost (17+15+20 Hybrid)",
    family: "luxury",
    vibe: "Bespoke blend of Bauhaus Charcoal (#17), Holographic Prism Ice (#15), and Warm Cashmere Slate (#20). Deep smoked basalt with luminous frost cyan and cashmere pearl.",
    dfii: 15,
    bgApp: "#0D0E12",
    surface: "#15171E",
    surfaceHover: "#1D202A",
    accent: "#38BDF8",
    accentGlow: "#E2D9D2",
    border: "rgba(148, 163, 184, 0.14)",
    textPrimary: "#FAF8F5",
    textSecondary: "#A3A7B2",
    tag: "Bespoke Top Choice",
  },

  // ─── 1. DEVELOPER & MODERN TECH ───────────────────────────────────────────
  {
    id: "linear-slate",
    name: "Linear Slate & Electric Iris",
    family: "developer",
    vibe: "The gold standard of high-craft developer software. Midnight slate with electric indigo luminescence.",
    dfii: 14,
    bgApp: "#08090E",
    surface: "#0F111A",
    surfaceHover: "#181B26",
    accent: "#6366F1",
    accentGlow: "#38BDF8",
    border: "rgba(148, 163, 184, 0.12)",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    tag: "Top Pick (S-Tier)",
  },
  {
    id: "raycast-coral",
    name: "Raycast Obsidian & Neon Coral",
    family: "developer",
    vibe: "Command palette precision. Deep void with fiery high-agency vermilion accents.",
    dfii: 13,
    bgApp: "#07080B",
    surface: "#111218",
    surfaceHover: "#1B1D26",
    accent: "#FF6363",
    accentGlow: "#FBBF24",
    border: "rgba(255, 99, 99, 0.16)",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    tag: "High Energy",
  },
  {
    id: "supabase-mint",
    name: "Supabase Phosphor Mint",
    family: "developer",
    vibe: "Database-grade clarity. Deep charcoal with electric emerald phosphor sparks.",
    dfii: 13,
    bgApp: "#0C0D0E",
    surface: "#151718",
    surfaceHover: "#1E2022",
    accent: "#3ECF8E",
    accentGlow: "#10B981",
    border: "rgba(62, 207, 142, 0.15)",
    textPrimary: "#F4F4F5",
    textSecondary: "#9CA3AF",
    tag: "Developer Favorite",
  },
  {
    id: "cursor-cobalt",
    name: "Cursor Midnight Cobalt",
    family: "developer",
    vibe: "Code intelligence terminal. Electric deep blue sparks on an atmospheric dark canvas.",
    dfii: 13,
    bgApp: "#080B14",
    surface: "#101424",
    surfaceHover: "#171D33",
    accent: "#3B82F6",
    accentGlow: "#60A5FA",
    border: "rgba(59, 130, 246, 0.16)",
    textPrimary: "#F0F9FF",
    textSecondary: "#94A3B8",
    tag: "Technical Precision",
  },
  {
    id: "vercel-carbon",
    name: "Vercel Carbon Titanium",
    family: "developer",
    vibe: "Ultra-restrained, pure monochromatic architecture with laser-sharp edge highlights.",
    dfii: 12,
    bgApp: "#000000",
    surface: "#111111",
    surfaceHover: "#1A1A1A",
    accent: "#EDEDED",
    accentGlow: "#38BDF8",
    border: "rgba(255, 255, 255, 0.12)",
    textPrimary: "#FFFFFF",
    textSecondary: "#A3A3A3",
    tag: "Monochrome Strict",
  },

  // ─── 2. EXECUTIVE INTELLIGENCE & QUANT ────────────────────────────────────
  {
    id: "palantir-tactical",
    name: "Palantir Tactical Foundry",
    family: "intelligence",
    vibe: "Defense-grade operational intelligence. Deep army slate with radar green telemetry.",
    dfii: 14,
    bgApp: "#070A08",
    surface: "#0E1410",
    surfaceHover: "#16201A",
    accent: "#22C55E",
    accentGlow: "#EAB308",
    border: "rgba(34, 197, 94, 0.16)",
    textPrimary: "#F0FDF4",
    textSecondary: "#9CA3AF",
    tag: "Top Pick (S-Tier)",
  },
  {
    id: "bloomberg-amber",
    name: "Bloomberg Carbon & Signal Amber",
    family: "intelligence",
    vibe: "High-frequency quant terminal. Obsidian matte with urgent amber tickers and risk cues.",
    dfii: 13,
    bgApp: "#09090B",
    surface: "#131316",
    surfaceHover: "#1E1E24",
    accent: "#F59E0B",
    accentGlow: "#EF4444",
    border: "rgba(245, 158, 11, 0.16)",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    tag: "Wall Street Quant",
  },
  {
    id: "mi6-cipher",
    name: "MI6 Cipher Teal",
    family: "intelligence",
    vibe: "Stealth cryptanalysis. Deep abyssal teal with luminous cyan signal trails.",
    dfii: 12,
    bgApp: "#050B0D",
    surface: "#0A151A",
    surfaceHover: "#112229",
    accent: "#14B8A6",
    accentGlow: "#67E8F9",
    border: "rgba(20, 184, 166, 0.15)",
    textPrimary: "#F0FDFA",
    textSecondary: "#94A3B8",
    tag: "Stealth RAG",
  },
  {
    id: "quant-ultramarine",
    name: "Quant Ultramarine Sovereign",
    family: "intelligence",
    vibe: "Deep institutional banking. Rich navy with royal sapphire clarity.",
    dfii: 12,
    bgApp: "#060A12",
    surface: "#0C1322",
    surfaceHover: "#141D33",
    accent: "#2563EB",
    accentGlow: "#38BDF8",
    border: "rgba(37, 99, 235, 0.18)",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    tag: "Institutional",
  },
  {
    id: "aegis-crimson",
    name: "Aegis Threat Protocol",
    family: "intelligence",
    vibe: "Critical incident response. Dark gunmetal with tactical ruby and rose accents.",
    dfii: 11,
    bgApp: "#090A0B",
    surface: "#131417",
    surfaceHover: "#1F2026",
    accent: "#E11D48",
    accentGlow: "#F43F5E",
    border: "rgba(225, 29, 72, 0.18)",
    textPrimary: "#FFF1F2",
    textSecondary: "#9CA3AF",
    tag: "Threat Response",
  },

  // ─── 3. DEEP NEURAL & SYNTHETIC AI ───────────────────────────────────────
  {
    id: "perplexity-amethyst",
    name: "Perplexity Royal Amethyst",
    family: "neural",
    vibe: "GenAI reasoning engine. Deep midnight violet with luminous jewel-toned amethyst.",
    dfii: 13,
    bgApp: "#090714",
    surface: "#120E22",
    surfaceHover: "#1B1633",
    accent: "#8B5CF6",
    accentGlow: "#C084FC",
    border: "rgba(139, 92, 246, 0.18)",
    textPrimary: "#FAF5FF",
    textSecondary: "#C4B5FD",
    tag: "Top Pick (S-Tier)",
  },
  {
    id: "bioluminescent-cyan",
    name: "Bioluminescent Deep",
    family: "neural",
    vibe: "Deep ocean neural pathways. Midnight trench with glowing aqua synapses.",
    dfii: 13,
    bgApp: "#040D14",
    surface: "#081824",
    surfaceHover: "#0E2436",
    accent: "#06B6D4",
    accentGlow: "#22D3EE",
    border: "rgba(6, 182, 212, 0.18)",
    textPrimary: "#ECFEFF",
    textSecondary: "#A5F3FC",
    tag: "High Contrast",
  },
  {
    id: "quantum-iris",
    name: "Quantum Iris & Magenta Glow",
    family: "neural",
    vibe: "Quantum multi-agent orchestration. Atmospheric dusk with soft lilac and hot pink sparks.",
    dfii: 12,
    bgApp: "#0A0915",
    surface: "#131126",
    surfaceHover: "#1C1936",
    accent: "#818CF8",
    accentGlow: "#EC4899",
    border: "rgba(129, 140, 248, 0.18)",
    textPrimary: "#F5F3FF",
    textSecondary: "#C7D2FE",
    tag: "Agentic Swarm",
  },
  {
    id: "synapse-fuchsia",
    name: "Synapse Electric Fuchsia",
    family: "neural",
    vibe: "High-voltage brain-computer interface. Deep obsidian with striking neon orchid bursts.",
    dfii: 11,
    bgApp: "#0D0712",
    surface: "#1A0F24",
    surfaceHover: "#261633",
    accent: "#D946EF",
    accentGlow: "#A855F7",
    border: "rgba(217, 70, 239, 0.18)",
    textPrimary: "#FDF4FF",
    textSecondary: "#E879F9",
    tag: "Vibrant AI",
  },
  {
    id: "holographic-prism",
    name: "Holographic Prism Ice",
    family: "neural",
    vibe: "Augmented reality knowledge graphs. Crisp ice cyan blending into prism violet highlights.",
    dfii: 12,
    bgApp: "#0B0C10",
    surface: "#151821",
    surfaceHover: "#1F2430",
    accent: "#67E8F9",
    accentGlow: "#A78BFA",
    border: "rgba(103, 232, 249, 0.16)",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    tag: "Prismatic",
  },

  // ─── 4. LUXURY ARCHITECTURAL & MINIMALISM ─────────────────────────────────
  {
    id: "katsura-gold",
    name: "Basalt & Imperial Gold Leaf",
    family: "luxury",
    vibe: "Kyoto architectural prestige. Matte basalt stone with champagne and 24k gold leaf cues.",
    dfii: 14,
    bgApp: "#0B0B0C",
    surface: "#141416",
    surfaceHover: "#1E1E22",
    accent: "#D4AF37",
    accentGlow: "#FDE047",
    border: "rgba(212, 175, 55, 0.2)",
    textPrimary: "#FEF9C3",
    textSecondary: "#A8A29E",
    tag: "Top Pick (S-Tier)",
  },
  {
    id: "brutalist-charcoal",
    name: "Bauhaus Brutalist Charcoal",
    family: "luxury",
    vibe: "Functional Swiss minimalism. Unflinching dark concrete with stark white hierarchy.",
    dfii: 12,
    bgApp: "#0C0C0C",
    surface: "#161616",
    surfaceHover: "#222222",
    accent: "#FAFAFA",
    accentGlow: "#71717A",
    border: "rgba(255, 255, 255, 0.1)",
    textPrimary: "#FFFFFF",
    textSecondary: "#737373",
    tag: "Architectural",
  },
  {
    id: "nordic-smoked-oak",
    name: "Nordic Smoked Oak & Caramel",
    family: "luxury",
    vibe: "Warm Scandinavian study. Smoked deep wood tones with warm caramel brass accents.",
    dfii: 13,
    bgApp: "#0F0E0D",
    surface: "#1A1816",
    surfaceHover: "#262320",
    accent: "#D97706",
    accentGlow: "#FBBF24",
    border: "rgba(217, 119, 6, 0.18)",
    textPrimary: "#FEF3C7",
    textSecondary: "#A8A29E",
    tag: "Warm Luxury",
  },
  {
    id: "swiss-international",
    name: "Swiss International Red",
    family: "luxury",
    vibe: "Classic Vignelli & Brockmann typography. Dark graphite with pure iconic crimson punctum.",
    dfii: 12,
    bgApp: "#0A0A0A",
    surface: "#141414",
    surfaceHover: "#1F1F1F",
    accent: "#EF4444",
    accentGlow: "#F87171",
    border: "rgba(239, 68, 68, 0.16)",
    textPrimary: "#FFFFFF",
    textSecondary: "#A3A3A3",
    tag: "Swiss Poster",
  },
  {
    id: "cashmere-pearl",
    name: "Warm Cashmere & Slate",
    family: "luxury",
    vibe: "Soft executive lounge. Gentle dark greige with warm cashmere pearl highlights.",
    dfii: 12,
    bgApp: "#111012",
    surface: "#1C1A1E",
    surfaceHover: "#28252C",
    accent: "#E2D9D2",
    accentGlow: "#D6D3D1",
    border: "rgba(226, 217, 210, 0.14)",
    textPrimary: "#FAF7F5",
    textSecondary: "#A8A29E",
    tag: "Subtle Elegance",
  },

  // ─── 5. EARTHY & ORGANIC DEPTH ────────────────────────────────────────────
  {
    id: "kyoto-moss",
    name: "Kyoto Bamboo & Forest Moss",
    family: "organic",
    vibe: "Natural zen garden. Deep evergreen slate with living bamboo shoots.",
    dfii: 13,
    bgApp: "#080C09",
    surface: "#0F1712",
    surfaceHover: "#17231C",
    accent: "#4ADE80",
    accentGlow: "#86EFAC",
    border: "rgba(74, 222, 128, 0.16)",
    textPrimary: "#F0FDF4",
    textSecondary: "#A7F3D0",
    tag: "Zen Natural",
  },
  {
    id: "sahara-terracotta",
    name: "Sahara Terracotta & Dune",
    family: "organic",
    vibe: "Earthy warmth. Dark basalt clay with rich sun-baked terracotta clay glows.",
    dfii: 13,
    bgApp: "#0F0C0A",
    surface: "#1B1512",
    surfaceHover: "#261E1A",
    accent: "#F97316",
    accentGlow: "#FB923C",
    border: "rgba(249, 115, 22, 0.18)",
    textPrimary: "#FFF7ED",
    textSecondary: "#FDBA74",
    tag: "Warm Earth",
  },
  {
    id: "nordic-fjords",
    name: "Nordic Fjord Glacier Blue",
    family: "organic",
    vibe: "Crisp sub-zero clarity. Deep glacial water with pure ice-blue light refractions.",
    dfii: 13,
    bgApp: "#060A10",
    surface: "#0B131F",
    surfaceHover: "#121D2F",
    accent: "#38BDF8",
    accentGlow: "#7DD3FC",
    border: "rgba(56, 189, 248, 0.16)",
    textPrimary: "#F0F9FF",
    textSecondary: "#BAE6FD",
    tag: "Sub-Zero Clean",
  },
  {
    id: "volcanic-ember",
    name: "Volcanic Obsidian & Ember",
    family: "organic",
    vibe: "Geological energy. Molten lava core glowing beneath cracked basalt crusts.",
    dfii: 12,
    bgApp: "#0A0808",
    surface: "#161111",
    surfaceHover: "#221919",
    accent: "#FF4500",
    accentGlow: "#FB923C",
    border: "rgba(255, 69, 0, 0.2)",
    textPrimary: "#FFF5F5",
    textSecondary: "#FEB2B2",
    tag: "Molten Core",
  },
  {
    id: "matcha-ceremony",
    name: "Ceremonial Matcha Green",
    family: "organic",
    vibe: "Wabi-sabi contemplative focus. Deep herbal shadows with fresh stone-ground matcha.",
    dfii: 12,
    bgApp: "#0A0D09",
    surface: "#131A12",
    surfaceHover: "#1C261A",
    accent: "#84CC16",
    accentGlow: "#A3E635",
    border: "rgba(132, 204, 22, 0.16)",
    textPrimary: "#F7FEE7",
    textSecondary: "#BEF264",
    tag: "Tranquil Focus",
  },

  // ─── 6. COSMIC & ATMOSPHERIC SCI-FI ───────────────────────────────────────
  {
    id: "cyber-tokyo",
    name: "Cyber Tokyo 2077 Acid Volt",
    family: "cosmic",
    vibe: "High-spec cyberdeck. Pure graphite with hyper-lucid acid volt lime accents.",
    dfii: 13,
    bgApp: "#08090A",
    surface: "#111317",
    surfaceHover: "#1A1D23",
    accent: "#E2FD52",
    accentGlow: "#A3E635",
    border: "rgba(226, 253, 82, 0.2)",
    textPrimary: "#FEFCE8",
    textSecondary: "#A1A1AA",
    tag: "High Agency",
  },
  {
    id: "event-horizon",
    name: "Event Horizon Deep Space",
    family: "cosmic",
    vibe: "Gravitational singularity. True space void with ultraviolet accretion disk rings.",
    dfii: 12,
    bgApp: "#05050A",
    surface: "#0B0B14",
    surfaceHover: "#141424",
    accent: "#7C3AED",
    accentGlow: "#9333EA",
    border: "rgba(124, 58, 237, 0.18)",
    textPrimary: "#F5F3FF",
    textSecondary: "#DDD6FE",
    tag: "Deep Cosmos",
  },
  {
    id: "solar-flare",
    name: "Solar Flare & Coronal Gold",
    family: "cosmic",
    vibe: "Heliosphere telemetry. Eclipse black with blinding solar flare arcs.",
    dfii: 13,
    bgApp: "#080706",
    surface: "#14110E",
    surfaceHover: "#201B16",
    accent: "#F59E0B",
    accentGlow: "#FBBF24",
    border: "rgba(245, 158, 11, 0.18)",
    textPrimary: "#FFFBEB",
    textSecondary: "#FDE68A",
    tag: "Solar Radiance",
  },
  {
    id: "andromeda-nebula",
    name: "Andromeda Nebula Orchid",
    family: "cosmic",
    vibe: "Interstellar nursery. Velvet cosmos infused with glowing orchid nebula dust.",
    dfii: 12,
    bgApp: "#080511",
    surface: "#120B24",
    surfaceHover: "#1C1138",
    accent: "#C026D3",
    accentGlow: "#E879F9",
    border: "rgba(192, 38, 211, 0.18)",
    textPrimary: "#FDF4FF",
    textSecondary: "#F0ABFC",
    tag: "Cosmic Orchid",
  },
  {
    id: "oceanic-abyss",
    name: "Oceanic Abyssal Trench",
    family: "cosmic",
    vibe: "Mariana trench exploration. Infinite pressure black with electric hydrothermal blue.",
    dfii: 13,
    bgApp: "#030710",
    surface: "#071021",
    surfaceHover: "#0D1B36",
    accent: "#0EA5E9",
    accentGlow: "#38BDF8",
    border: "rgba(14, 165, 233, 0.18)",
    textPrimary: "#F0F9FF",
    textSecondary: "#7DD3FC",
    tag: "Abyssal Power",
  },
];

export default function ThemePreviewPage() {
  const [selectedThemeId, setSelectedThemeId] = useState<string>("obsidian-cashmere-prism");
  const [activeFamily, setActiveFamily] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [appliedGlobally, setAppliedGlobally] = useState<string | null>(null);

  const selectedTheme = useMemo(
    () => THEMES_30.find((t) => t.id === selectedThemeId) || THEMES_30[0],
    [selectedThemeId]
  );

  const filteredThemes = useMemo(() => {
    return THEMES_30.filter((t) => {
      if (activeFamily !== "all" && t.family !== activeFamily) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.vibe.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeFamily, searchQuery]);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setIsCopied(label);
      setTimeout(() => setIsCopied(null), 2000);
    }
  };

  const applyThemeGlobally = (theme: ColorTheme) => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--bg", theme.bgApp);
      root.style.setProperty("--bg-app", theme.bgApp);
      root.style.setProperty("--surface", theme.surface);
      root.style.setProperty("--surface-primary", theme.surface);
      root.style.setProperty("--surface-subtle", theme.surfaceHover);
      root.style.setProperty("--surface-hover", theme.surfaceHover);
      root.style.setProperty("--accent", theme.accent);
      root.style.setProperty("--border", theme.border);
      root.style.setProperty("--border-subtle", theme.border);
      root.style.setProperty("--text-primary", theme.textPrimary);
      root.style.setProperty("--text-secondary", theme.textSecondary);
      setAppliedGlobally(theme.id);
      setTimeout(() => setAppliedGlobally(null), 3000);
    }
  };

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 12px", borderRadius: "20px", background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.3)", color: "#818CF8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
            <Palette size={13} />
            <span>30 Curated Color Combos Master Plan</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            QueryMind Color Architecture Showcase
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "6px", maxWidth: "780px", lineHeight: "1.6" }}>
            Explore 30 professionally calibrated color systems evaluated via the <strong>Design Feasibility &amp; Impact Index (DFII)</strong>. Click any theme to view live rendered components and test it globally across QueryMind.
          </p>
        </div>

        {appliedGlobally && (
          <div style={{ padding: "10px 18px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", color: "#10B981", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
            <Check size={16} />
            <span>Applied live to your active browser session!</span>
          </div>
        )}
      </div>

      {/* Main Split Layout: Left Themes Grid, Right Live Render Cockpit */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "28px", alignItems: "start" }}>
        
        {/* LEFT COLUMN: 30 Themes Filter & List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Family Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              { id: "all", label: `All 30 Themes (${THEMES_30.length})` },
              { id: "developer", label: "Dev & Modern Tech (5)" },
              { id: "intelligence", label: "Quant & Defense (5)" },
              { id: "neural", label: "Neural AI (5)" },
              { id: "luxury", label: "Architectural Luxury (5)" },
              { id: "organic", label: "Earthy & Depth (5)" },
              { id: "cosmic", label: "Cosmic & Sci-Fi (5)" },
            ].map((fam) => (
              <button
                key={fam.id}
                type="button"
                onClick={() => setActiveFamily(fam.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: activeFamily === fam.id ? 700 : 500,
                  background: activeFamily === fam.id ? "#FFFFFF" : "var(--surface)",
                  color: activeFamily === fam.id ? "#000000" : "var(--text-secondary)",
                  border: `1px solid ${activeFamily === fam.id ? "#FFFFFF" : "var(--border)"}`,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {fam.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by theme name, feel, or tag..."
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none",
            }}
          />

          {/* Theme Grid Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "880px", overflowY: "auto", paddingRight: "6px" }}>
            {filteredThemes.map((theme) => {
              const isSelected = theme.id === selectedThemeId;
              return (
                <div
                  key={theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                  style={{
                    padding: "16px 20px",
                    borderRadius: "14px",
                    background: isSelected ? theme.surface : "var(--surface)",
                    border: `1.5px solid ${isSelected ? theme.accent : "var(--border)"}`,
                    boxShadow: isSelected ? `0 8px 30px ${theme.border}` : "none",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    transition: "all 180ms ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: isSelected ? theme.textPrimary : "var(--text-primary)" }}>
                        {theme.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: `${theme.accent}20`,
                          color: theme.accent,
                          border: `1px solid ${theme.accent}40`,
                        }}
                      >
                        {theme.tag}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 600 }}>DFII:</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: theme.dfii >= 14 ? "#10B981" : "#60A5FA" }}>
                        +{theme.dfii}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: "12.5px", color: isSelected ? theme.textSecondary : "var(--text-secondary)", margin: 0, lineHeight: "1.45" }}>
                    {theme.vibe}
                  </p>

                  {/* 5-Color Swatch Strip */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                    {[
                      { col: theme.bgApp, name: "Canvas" },
                      { col: theme.surface, name: "Surface" },
                      { col: theme.surfaceHover, name: "Hover" },
                      { col: theme.accent, name: "Accent" },
                      { col: theme.accentGlow, name: "Glow" },
                    ].map((sw, i) => (
                      <div
                        key={i}
                        title={`${sw.name}: ${sw.col}`}
                        style={{
                          flex: 1,
                          height: "18px",
                          borderRadius: "4px",
                          background: sw.col,
                          border: "1px solid rgba(255,255,255,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Component Cockpit (Rendered in Active Theme) */}
        <div style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Header of Preview */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: selectedTheme.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                LIVE THEME MOCKUP • {selectedTheme.name}
              </span>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: "2px 0 0 0" }}>
                Interactive Component Sandbox
              </h2>
            </div>

            <button
              type="button"
              onClick={() => applyThemeGlobally(selectedTheme)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: selectedTheme.accent,
                color: selectedTheme.family === "luxury" && selectedTheme.id === "katsura-gold" ? "#000000" : "#FFFFFF",
                fontWeight: 700,
                fontSize: "12.5px",
                border: "none",
                cursor: "pointer",
                boxShadow: `0 4px 16px ${selectedTheme.accent}40`,
                transition: "all 150ms ease",
              }}
            >
              <Zap size={14} />
              <span>Apply to App Live</span>
            </button>
          </div>

          {/* SIMULATED WORKSPACE CANVAS (RENDERED IN EXACT SELECTED THEME TOKENS) */}
          <div
            style={{
              padding: "24px",
              borderRadius: "18px",
              background: selectedTheme.bgApp,
              border: `1.5px solid ${selectedTheme.border}`,
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              boxShadow: `0 20px 50px rgba(0,0,0,0.6)`,
              transition: "all 250ms ease",
            }}
          >
            {/* 1. Executive Intelligence Briefing Card */}
            <div
              style={{
                padding: "20px",
                borderRadius: "14px",
                background: selectedTheme.surface,
                border: `1px solid ${selectedTheme.border}`,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: `linear-gradient(90deg, ${selectedTheme.accent} 0%, transparent 100%)`,
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: selectedTheme.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  CROSS-SYNTHESIS BRIEFING
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: "10px",
                    background: `${selectedTheme.accent}20`,
                    color: selectedTheme.accent,
                    border: `1px solid ${selectedTheme.accent}40`,
                  }}
                >
                  3 Sources Correlated
                </span>
              </div>

              <h3 style={{ fontSize: "16px", fontWeight: 700, color: selectedTheme.textPrimary, margin: 0 }}>
                Autonomous Reasoning &amp; Architecture Divergence
              </h3>

              <p style={{ fontSize: "12.5px", color: selectedTheme.textSecondary, lineHeight: "1.55", margin: 0 }}>
                Synthesized distributed consensus across multi-agent microservices. Document A dictates monotonic ordering, whereas Document B favors eventual replication.
              </p>

              {/* Live Metric Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
                <div style={{ padding: "10px 12px", borderRadius: "8px", background: selectedTheme.surfaceHover, border: `1px solid ${selectedTheme.border}` }}>
                  <div style={{ fontSize: "11px", color: selectedTheme.textSecondary }}>Confidence Index</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: selectedTheme.accentGlow }}>98.4% Concordance</div>
                </div>
                <div style={{ padding: "10px 12px", borderRadius: "8px", background: selectedTheme.surfaceHover, border: `1px solid ${selectedTheme.border}` }}>
                  <div style={{ fontSize: "11px", color: selectedTheme.textSecondary }}>Divergence Risk</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: selectedTheme.accent }}>Low (1 Resolved)</div>
                </div>
              </div>
            </div>

            {/* 2. Simulated Decision Topology Node Strip */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: "14px",
                background: selectedTheme.surface,
                border: `1px solid ${selectedTheme.border}`,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: selectedTheme.textSecondary, textTransform: "uppercase" }}>
                  DECISION TOPOLOGY STAGES
                </span>
                <span style={{ fontSize: "11px", color: selectedTheme.accent, fontWeight: 600 }}>Active Causal Chain</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {[
                  { icon: "⚡", label: "Align" },
                  { icon: "🏛️", label: "Synthesize" },
                  { icon: "⚡", label: "Audit Risk" },
                  { icon: "💡", label: "Roadmap" },
                ].map((st, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "8px",
                      background: selectedTheme.surfaceHover,
                      border: `1px solid ${i === 1 ? selectedTheme.accent : selectedTheme.border}`,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "3px",
                      boxShadow: i === 1 ? `0 0 10px ${selectedTheme.accent}30` : "none",
                    }}
                  >
                    <span style={{ fontSize: "12px" }}>{st.icon}</span>
                    <span style={{ fontSize: "10.5px", fontWeight: i === 1 ? 700 : 500, color: i === 1 ? selectedTheme.accent : selectedTheme.textPrimary }}>
                      {st.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Action Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  background: selectedTheme.accent,
                  color: selectedTheme.family === "luxury" && selectedTheme.id === "katsura-gold" ? "#000000" : "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "12px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Execute in Copilot &rarr;
              </button>
              <button
                type="button"
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: selectedTheme.surfaceHover,
                  color: selectedTheme.textPrimary,
                  border: `1px solid ${selectedTheme.border}`,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Copy Briefing
              </button>
            </div>
          </div>

          {/* Color Token Spec Table with 1-Click Copy */}
          <div style={{ padding: "18px 20px", borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
              Exact CSS Tokens for "{selectedTheme.name}"
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}>
              {[
                { name: "--bg-app", val: selectedTheme.bgApp },
                { name: "--surface", val: selectedTheme.surface },
                { name: "--surface-hover", val: selectedTheme.surfaceHover },
                { name: "--accent", val: selectedTheme.accent },
                { name: "--accent-glow", val: selectedTheme.accentGlow },
                { name: "--border", val: selectedTheme.border },
              ].map((token) => (
                <div
                  key={token.name}
                  onClick={() => copyToClipboard(token.val, token.name)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  title="Click to copy"
                >
                  <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{token.name}</span>
                  <span style={{ fontWeight: 700, color: isCopied === token.name ? "#10B981" : "var(--text-primary)", fontFamily: "monospace" }}>
                    {isCopied === token.name ? "Copied!" : token.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
