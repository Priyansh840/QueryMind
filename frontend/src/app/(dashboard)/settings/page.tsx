"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";
import {
  Palette,
  Sliders,
  Cpu,
  Sparkles,
  Volume2,
  VolumeX,
  Database,
  Keyboard,
  Shield,
  Download,
  Upload,
  Trash2,
  Check,
  ExternalLink,
  Zap,
  Globe,
  Terminal,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  User,
  Bell,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

type TabId =
  | "appearance"
  | "general"
  | "ai"
  | "personalization"
  | "notifications"
  | "storage"
  | "shortcuts";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read initial tab from URL ?tab=... or default to "appearance"
  const tabParam = searchParams?.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const validTabs: TabId[] = [
      "appearance",
      "general",
      "ai",
      "personalization",
      "notifications",
      "storage",
      "shortcuts",
    ];
    if (tabParam && validTabs.includes(tabParam)) return tabParam;
    return "appearance";
  });

  // Sync state if URL changes externally
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: TabId) => {
    setActiveTab(newTab);
    router.replace(`/settings?tab=${newTab}`, { scroll: false });
  };

  // Store state & actions
  const userProfile = useMyndStore((state) => state.userProfile);
  const setUserProfile = useMyndStore((state) => state.setUserProfile);
  const spaces = useMyndStore((state) => state.spaces);
  const setSpaces = useMyndStore((state) => state.setSpaces);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const recentObjects = useMyndStore((state) => state.recentObjects);
  const clearAllData = useMyndStore((state) => state.clearAllData);

  // Theme & Visual tokens
  const theme = useMyndStore((state) => state.theme);
  const setTheme = useMyndStore((state) => state.setTheme);
  const accentColor = useMyndStore((state) => state.accentColor);
  const setAccentColor = useMyndStore((state) => state.setAccentColor);
  const uiDensity = useMyndStore((state) => state.uiDensity);
  const setUiDensity = useMyndStore((state) => state.setUiDensity);
  const reduceMotion = useMyndStore((state) => state.reduceMotion);
  const setReduceMotion = useMyndStore((state) => state.setReduceMotion);

  // System & AI configurations
  const soundEffects = useMyndStore((state) => state.soundEffects);
  const setSoundEffects = useMyndStore((state) => state.setSoundEffects);
  const aiModel = useMyndStore((state) => state.aiModel);
  const setAiModel = useMyndStore((state) => state.setAiModel);
  const webSearchEnabled = useMyndStore((state) => state.webSearchEnabled);
  const setWebSearchEnabled = useMyndStore((state) => state.setWebSearchEnabled);
  const codeExecution = useMyndStore((state) => state.codeExecution);
  const setCodeExecution = useMyndStore((state) => state.setCodeExecution);
  const defaultSpaceId = useMyndStore((state) => state.defaultSpaceId);
  const setDefaultSpaceId = useMyndStore((state) => state.setDefaultSpaceId);
  const language = useMyndStore((state) => state.language);
  const setLanguage = useMyndStore((state) => state.setLanguage);

  // Cognitive personalization
  const personalization = useMyndStore((state) => state.personalization);
  const updatePersonalization = useMyndStore((state) => state.updatePersonalization);

  // Form states
  const [nameInput, setNameInput] = useState(userProfile.name || "Explorer");
  const [roleInput, setRoleInput] = useState(userProfile.role || "Knowledge Architect");
  const [bioInput, setBioInput] = useState(userProfile.bio || "");
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isPlayingChime, setIsPlayingChime] = useState(false);

  // Keep local name in sync if profile updates
  useEffect(() => {
    if (userProfile.name) setNameInput(userProfile.name);
    if (userProfile.role) setRoleInput(userProfile.role);
    if (userProfile.bio) setBioInput(userProfile.bio);
  }, [userProfile.name, userProfile.role, userProfile.bio]);

  // Audio Chime Synthesizer via Web Audio API
  const playTestChime = () => {
    try {
      setIsPlayingChime(true);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Harmonic pleasant chord (D5 to A5)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
      setTimeout(() => setIsPlayingChime(false), 500);
    } catch (e) {
      console.warn("Audio chime unsupported", e);
      setIsPlayingChime(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile({
      name: nameInput.trim() || "Explorer",
      role: roleInput.trim(),
      bio: bioInput.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2400);
  };

  const handleExportWorkspace = () => {
    const data = {
      version: "3.2-enterprise",
      exportedAt: new Date().toISOString(),
      userProfile,
      spaces,
      uploadedDocuments,
      recentObjects,
      theme,
      accentColor,
      personalization,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `querymind-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.spaces && Array.isArray(json.spaces)) {
          setSpaces(json.spaces);
          if (json.userProfile) setUserProfile(json.userProfile);
          if (json.theme) setTheme(json.theme);
          if (json.accentColor) setAccentColor(json.accentColor);
          if (json.personalization) updatePersonalization(json.personalization);
          setImportStatus("Workspace restored successfully! ✓");
          setTimeout(() => setImportStatus(null), 3500);
        } else {
          setImportStatus("Invalid backup format: missing spaces manifest.");
        }
      } catch {
        setImportStatus("Error parsing JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  // Nav Tabs Definition
  const tabsList = [
    { id: "appearance", label: "Appearance & Themes", icon: Palette, badge: "Design" },
    { id: "general", label: "General & Profile", icon: Sliders, badge: "Account" },
    { id: "ai", label: "AI Engine & Models", icon: Cpu, badge: "Intelligence" },
    { id: "personalization", label: "Cognitive Style", icon: Sparkles, badge: "Persona" },
    { id: "notifications", label: "Sound & Audio", icon: Volume2, badge: "Audio" },
    { id: "storage", label: "Data & Backup", icon: Database, badge: "Vault" },
    { id: "shortcuts", label: "Manual & Shortcuts", icon: Keyboard, badge: "Guide" },
  ] as const;

  // Theme Presets with accurate swatches
  const themePresets = [
    {
      id: "dark" as const,
      name: "Midnight Slate",
      tagline: "Classic dark obsidian with crisp white accents",
      bg: "#000000",
      surface: "#141414",
      border: "rgba(255, 255, 255, 0.14)",
      accent: "#FFFFFF",
      text: "#FFFFFF",
    },
    {
      id: "zen" as const,
      name: "OLED Obsidian",
      tagline: "100% pitch black with high dynamic contrast",
      bg: "#000000",
      surface: "#080808",
      border: "rgba(255, 255, 255, 0.08)",
      accent: "#ECECEC",
      text: "#ECECEC",
    },
    {
      id: "cyberpunk" as const,
      name: "Cyber Neon",
      tagline: "Deep indigo canvas with electric cyan pulse",
      bg: "#070B14",
      surface: "#0E1626",
      border: "rgba(0, 240, 255, 0.28)",
      accent: "#00F0FF",
      text: "#E0F7FA",
    },
    {
      id: "light" as const,
      name: "Nordic Frost",
      tagline: "Clean, radiant, high-legibility daylight canvas",
      bg: "#FFFFFF",
      surface: "#F9FAFB",
      border: "#E5E7EB",
      accent: "#111827",
      text: "#111827",
    },
    {
      id: "sepia" as const,
      name: "Warm Coffee",
      tagline: "Earthy amber tones designed for nocturnal reading",
      bg: "#1C1917",
      surface: "#292524",
      border: "rgba(245, 158, 11, 0.25)",
      accent: "#F59E0B",
      text: "#FEF3C7",
    },
    {
      id: "arctic" as const,
      name: "Arctic Deep",
      tagline: "Sub-zero oceanic midnight with mint highlights",
      bg: "#0B132B",
      surface: "#1C2541",
      border: "rgba(91, 192, 190, 0.25)",
      accent: "#5BC0BE",
      text: "#FFFFFF",
    },
  ];

  // Accent Color Presets
  const accentPresets = [
    { name: "Signature Monochrome", color: "#FFFFFF", desc: "Minimalist executive contrast" },
    { name: "Emerald Mint", color: "#10B981", desc: "Sharp terminal vitality" },
    { name: "Electric Violet", color: "#8B5CF6", desc: "Creative cognition glow" },
    { name: "Deep Indigo", color: "#4F46E5", desc: "Enterprise deep reasoning" },
    { name: "Cobalt Blue", color: "#60A5FA", desc: "Calm architectural focus" },
    { name: "Warm Amber", color: "#F59E0B", desc: "Energetic highlights" },
    { name: "Crimson Rose", color: "#F43F5E", desc: "High-priority accent" },
  ];

  // User Initials
  const initials = (() => {
    const name = nameInput.trim() || userProfile.name || "Explorer";
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <div
      style={{
        maxWidth: "1140px",
        margin: "0 auto",
        padding: "32px 24px 80px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}
    >
      {/* 1. Header Hero Card */}
      <div
        style={{
          position: "relative",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 50%, var(--surface) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "28px 32px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#10B981",
                    boxShadow: "0 0 8px #10B981",
                  }}
                />
                # SYSTEM CONFIGURATION & PREFERENCES
              </span>
            </div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              Workspace Settings
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                marginTop: "6px",
                maxWidth: "650px",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              Manage your visual aesthetics, reasoning models, cognitive personalization styles,
              and data backups across your neural workspaces.
            </p>
          </div>

          {/* Quick Telemetry Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              <Cpu className="w-3.5 h-3.5 text-accent" />
              <span>{aiModel === "gemini-3.7-flash" ? "Gemini 3.7 Flash" : "Gemini 1.5 Pro"}</span>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span style={{ textTransform: "capitalize" }}>{theme} Theme</span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/chat")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.15s ease",
              }}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Open Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tab Rail */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "12px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {tabsList.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as TabId)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                background: isActive ? "rgba(255, 255, 255, 0.12)" : "transparent",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                border: isActive ? "1px solid rgba(255, 255, 255, 0.24)" : "1px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 2px 10px rgba(0, 0, 0, 0.5)" : "none",
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: isActive ? "#FFFFFF" : "var(--text-tertiary)" }}
              />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT PANELS */}

      {/* ======================================================== */}
      {/* TAB 1: APPEARANCE & THEMES                               */}
      {/* ======================================================== */}
      {activeTab === "appearance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Theme Gallery */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Palette className="w-4 h-4 text-accent" />
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  Theme Gallery
                </h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Choose an ultra-high-contrast palette calibrated for eye comfort during long focus sessions.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              {themePresets.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: isSelected ? "2px solid #FFFFFF" : "1px solid var(--border)",
                      background: t.bg,
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      position: "relative",
                      boxShadow: isSelected
                        ? "0 0 24px rgba(255, 255, 255, 0.16)"
                        : "0 2px 6px rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* Visual Mockup Header Bar */}
                    <div
                      style={{
                        padding: "6px 8px",
                        background: t.surface,
                        borderRadius: "6px",
                        border: `1px solid ${t.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "4px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }} />
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F59E0B" }} />
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
                      </div>
                      <span
                        style={{
                          width: "36px",
                          height: "6px",
                          borderRadius: "3px",
                          background: t.accent,
                          opacity: 0.8,
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: t.text }}>
                        {t.name}
                      </div>
                      {isSelected && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "#10B981",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-tertiary)",
                        marginTop: "4px",
                        lineHeight: "1.4",
                      }}
                    >
                      {t.tagline}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accent Color Picker */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)" }}>
                Signature Accent Highlight
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                Controls active buttons, focus states, and badges across the entire interface.
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {accentPresets.map((a) => {
                const isSelected = accentColor.toLowerCase() === a.color.toLowerCase();
                return (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => setAccentColor(a.color)}
                    title={`${a.name} — ${a.desc}`}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: a.color,
                      border: isSelected ? "2px solid #FFFFFF" : "1px solid rgba(255, 255, 255, 0.2)",
                      boxShadow: isSelected ? `0 0 14px ${a.color}` : "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: a.color === "#FFFFFF" ? "#000000" : "#FFFFFF",
                      fontSize: "13px",
                      fontWeight: 800,
                      transition: "transform 0.15s ease",
                      transform: isSelected ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    {isSelected && "✓"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interface Density */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)" }}>
                Interface Density
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                Adjust line heights, card margins, and list item spacing to suit your viewport.
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "4px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                gap: "4px",
              }}
            >
              {(["compact", "comfortable", "spacious"] as const).map((d) => {
                const isSelected = uiDensity === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setUiDensity(d)}
                    style={{
                      padding: "6px 16px",
                      fontSize: "12px",
                      borderRadius: "8px",
                      border: "none",
                      background: isSelected ? "#FFFFFF" : "transparent",
                      color: isSelected ? "#000000" : "var(--text-secondary)",
                      cursor: "pointer",
                      textTransform: "capitalize",
                      fontWeight: isSelected ? 600 : 500,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fluid Motion & Reduced Animations */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)" }}>
                Fluid Motion Dynamics
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                Smooth card transitions and ambient animations. Toggle off for instant snappy cut-ins.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReduceMotion(!reduceMotion)}
              style={{
                padding: "8px 18px",
                fontSize: "12px",
                borderRadius: "8px",
                border: !reduceMotion ? "1px solid #10B981" : "1px solid var(--border)",
                background: !reduceMotion ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: !reduceMotion ? "#10B981" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {!reduceMotion ? (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Full Fluid Motion
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Reduced Motion
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GENERAL & PROFILE                                 */}
      {/* ======================================================== */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* User Profile Overview Card */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, rgba(59, 130, 246, 0.28), rgba(147, 51, 234, 0.35))",
                  border: "2px solid rgba(139, 92, 246, 0.4)",
                  boxShadow: "0 0 16px rgba(139, 92, 246, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                {initials}
              </div>

              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>
                  {nameInput || "Explorer"}
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  {userProfile.email || "local-session@querymind.ai"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10B981",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Enterprise Workspace
              </span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                Active
              </span>
            </div>
          </div>

          {/* Form Fields Card */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Display Name */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>
                  Full Name / Call Sign
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                  Displayed on your greeting, chat transcripts, and knowledge author metadata.
                </div>
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  width: "280px",
                  padding: "8px 14px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  outline: "none",
                }}
                placeholder="Enter your name"
              />
            </div>

            <div style={{ borderTop: "1px solid var(--border)" }} />

            {/* Role & Title */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>
                  Professional Role / Discipline
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                  Helps AI agents tailor technical depth and domain vocabulary.
                </div>
              </div>
              <input
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                style={{
                  width: "280px",
                  padding: "8px 14px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  outline: "none",
                }}
                placeholder="e.g. Senior Systems Engineer"
              />
            </div>

            <div style={{ borderTop: "1px solid var(--border)" }} />

            {/* Default Space */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>
                  Default Startup Knowledge Space
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                  Space to activate automatically upon launching the QueryMind application.
                </div>
              </div>
              <select
                value={defaultSpaceId}
                onChange={(e) => setDefaultSpaceId(e.target.value)}
                style={{
                  width: "280px",
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">Last Active Space (Automatic)</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.count || 0} items)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ borderTop: "1px solid var(--border)" }} />

            {/* Language */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>
                  Primary Language
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                  System UI language and default synthesis dialect.
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: "280px",
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="en">English (US / International)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px" }}>
            {isSaved && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#10B981",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <Check className="w-4 h-4" />
                Profile changes saved!
              </span>
            )}

            <button
              type="submit"
              style={{
                background: "#FFFFFF",
                color: "#000000",
                border: "none",
                padding: "10px 24px",
                cursor: "pointer",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13px",
                boxShadow: "0 2px 10px rgba(255, 255, 255, 0.2)",
                transition: "opacity 0.15s ease",
              }}
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AI ENGINE & MODEL SETTINGS                        */}
      {/* ======================================================== */}
      {activeTab === "ai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Reasoning Engine Models */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Cpu className="w-4 h-4 text-accent" />
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  Reasoning Engine
                </h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Select the Google Gemini multimodal model powering your synthesis, agent loops, and vault search.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "14px",
              }}
            >
              {/* Gemini 3.7 Flash Card */}
              <div
                onClick={() => setAiModel("gemini-3.7-flash")}
                style={{
                  padding: "18px",
                  borderRadius: "12px",
                  border:
                    aiModel === "gemini-3.7-flash"
                      ? "2px solid #FFFFFF"
                      : "1px solid var(--border)",
                  background:
                    aiModel === "gemini-3.7-flash"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.25)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>
                    Gemini 3.7 Flash
                  </div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10B981",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    Recommended
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: "1.4" }}>
                  Ultra-fast response velocity with advanced reasoning capabilities. Ideal for interactive multi-turn
                  chat and instant cross-document querying.
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                  <span>⚡ 100ms TTFT</span>
                  <span>•</span>
                  <span>🧠 Adaptive Thinking</span>
                  <span>•</span>
                  <span>📚 1M Token Window</span>
                </div>
              </div>

              {/* Gemini 1.5 Pro Card */}
              <div
                onClick={() => setAiModel("gemini-1.5-pro")}
                style={{
                  padding: "18px",
                  borderRadius: "12px",
                  border:
                    aiModel === "gemini-1.5-pro"
                      ? "2px solid #FFFFFF"
                      : "1px solid var(--border)",
                  background:
                    aiModel === "gemini-1.5-pro"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.25)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>
                    Gemini 1.5 Pro
                  </div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: "rgba(139, 92, 246, 0.15)",
                      color: "#A78BFA",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    Deep Reasoning
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: "1.4" }}>
                  Massive context engine specialized for complex multi-thesis synthesis, exhaustive code review,
                  and cross-space vector reconciliation.
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                  <span>🔬 Deep Verification</span>
                  <span>•</span>
                  <span>📖 2M Token Ceiling</span>
                  <span>•</span>
                  <span>⚙️ High Precision</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Web Search Toggle */}
          <div
            style={{
              padding: "22px 24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#FFFFFF" }}>
                Real-Time Live Web Grounding
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                Permits the AI to consult real-time Google Search data when local vault documents are insufficient.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              style={{
                padding: "8px 18px",
                fontSize: "12px",
                borderRadius: "8px",
                border: webSearchEnabled ? "1px solid #10B981" : "1px solid var(--border)",
                background: webSearchEnabled ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: webSearchEnabled ? "#10B981" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Globe className="w-3.5 h-3.5" />
              {webSearchEnabled ? "Web Grounding Active" : "Local Only"}
            </button>
          </div>

          {/* Code Execution Sandbox Toggle */}
          <div
            style={{
              padding: "22px 24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#FFFFFF" }}>
                Code Sandbox & Interactive Execution
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                Enables live python/javascript syntax execution previews, copy buttons, and diff blocks in chat.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCodeExecution(!codeExecution)}
              style={{
                padding: "8px 18px",
                fontSize: "12px",
                borderRadius: "8px",
                border: codeExecution ? "1px solid #10B981" : "1px solid var(--border)",
                background: codeExecution ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: codeExecution ? "#10B981" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Code2 className="w-3.5 h-3.5" />
              {codeExecution ? "Execution Sandbox On" : "Static Highlighting"}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: COGNITIVE PERSONALIZATION & DIRECTIVES            */}
      {/* ======================================================== */}
      {activeTab === "personalization" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Reasoning Persona Cards */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles className="w-4 h-4 text-accent" />
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  Reasoning & Synthesis Persona
                </h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Calibrate how the resident AI frames arguments, evaluates solutions, and structures answers.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "12px",
              }}
            >
              {[
                {
                  id: "first_principles" as const,
                  name: "First Principles",
                  desc: "Deconstructs complex domains to core physics and axioms without assumptions.",
                  badge: "Fundamental",
                },
                {
                  id: "executive" as const,
                  name: "Executive Synthesis",
                  desc: "Delivers crisp high-level summaries, bulleted ROI, and decisive action items.",
                  badge: "Decisive",
                },
                {
                  id: "socratic" as const,
                  name: "Socratic Inquiry",
                  desc: "Interrogates concepts with sharp counter-questions to uncover edge cases.",
                  badge: "Incisive",
                },
                {
                  id: "speed" as const,
                  name: "Rapid Velocity",
                  desc: "Minimizes theoretical preamble; immediately writes battle-tested production code.",
                  badge: "Action-Oriented",
                },
              ].map((style) => {
                const isSelected = personalization.cognitiveStyle === style.id;
                return (
                  <div
                    key={style.id}
                    onClick={() => updatePersonalization({ cognitiveStyle: style.id })}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: isSelected ? "2px solid #FFFFFF" : "1px solid var(--border)",
                      background: isSelected ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.25)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                        {style.name}
                      </span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-accent" />
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                          {style.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: "1.4" }}>
                      {style.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verbosity & Strict Grounding */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Verbosity */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>
                  Response Verbosity
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                  Target length and depth of AI generated answers.
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(0, 0, 0, 0.4)",
                  padding: "4px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  gap: "4px",
                }}
              >
                {[
                  { id: "concise", label: "Concise (Fast)" },
                  { id: "balanced", label: "Balanced (Standard)" },
                  { id: "deep_dive", label: "Deep Dive (Exhaustive)" },
                ].map((v) => {
                  const isSelected = personalization.verbosity === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => updatePersonalization({ verbosity: v.id as any })}
                      style={{
                        padding: "6px 14px",
                        fontSize: "12px",
                        borderRadius: "8px",
                        border: "none",
                        background: isSelected ? "#FFFFFF" : "transparent",
                        color: isSelected ? "#000000" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: isSelected ? 600 : 500,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)" }} />

            {/* Strict Vault Grounding */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>
                  Strict Vault Grounding
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                  Instructs the agent to answer strictly from documents in your vault, refusing ungrounded conjecture.
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updatePersonalization({ strictGrounding: !personalization.strictGrounding })
                }
                style={{
                  padding: "8px 18px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: personalization.strictGrounding ? "1px solid #10B981" : "1px solid var(--border)",
                  background: personalization.strictGrounding ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  color: personalization.strictGrounding ? "#10B981" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Shield className="w-3.5 h-3.5" />
                {personalization.strictGrounding ? "Strict Mode Active" : "Flexible Grounding"}
              </button>
            </div>
          </div>

          {/* Custom System Directives */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>
              Custom System Directives
            </div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px", marginBottom: "12px" }}>
              Direct rules appended to every agent conversation (e.g. &ldquo;Always use TypeScript, prefer functional programming, show trade-off matrices&rdquo;).
            </div>

            <textarea
              value={personalization.customDirectives || ""}
              onChange={(e) => updatePersonalization({ customDirectives: e.target.value })}
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border-strong)",
                borderRadius: "8px",
                color: "#FFFFFF",
                fontSize: "13px",
                fontFamily: "var(--mono)",
                lineHeight: "1.5",
                outline: "none",
                resize: "vertical",
              }}
              placeholder="Inject custom persistent system instructions here..."
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: AUDIO, HAPTICS & NOTIFICATIONS                    */}
      {/* ======================================================== */}
      {activeTab === "notifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Sound Effects Card */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#FFFFFF" }}>
                Auditory Completion Feedback
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                Plays a calm harmonic chime when AI reasoning completes or document vectorization finishes.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={playTestChime}
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: isPlayingChime ? "rgba(255, 255, 255, 0.15)" : "transparent",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.15s ease",
                }}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Chime</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEffects(!soundEffects)}
                style={{
                  padding: "8px 18px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: soundEffects ? "1px solid #10B981" : "1px solid var(--border)",
                  background: soundEffects ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  color: soundEffects ? "#10B981" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {soundEffects ? "Audio Chimes On" : "Muted"}
              </button>
            </div>
          </div>

          {/* Autonomous Agent Alerts */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#FFFFFF" }}>
                Autonomous Agent Alerts
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                Notify when background agent workers discover semantic connections between disjoint spaces.
              </div>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10B981",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <Bell className="w-3.5 h-3.5" />
              Active in Background
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: DATA & BACKUP                                     */}
      {/* ======================================================== */}
      {activeTab === "storage" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Storage Telemetry Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#FFFFFF" }}>
                {spaces.length}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Active Spaces
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#FFFFFF" }}>
                {uploadedDocuments.length}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Vault Documents
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#FFFFFF" }}>
                {recentObjects.length}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Knowledge Artifacts
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#10B981" }}>
                Healthy
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Qdrant Vector State
              </div>
            </div>
          </div>

          {/* Export & Restore Card */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Export */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px", color: "#FFFFFF" }}>
                  Export Full Workspace Backup
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                  Download all spaces, documents, goals, notes, and preferences as an offline JSON archive.
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportWorkspace}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  background: "#FFFFFF",
                  color: "#000000",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Backup</span>
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--border)" }} />

            {/* Restore */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px", color: "#FFFFFF" }}>
                  Restore Workspace from Backup
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                  Import a previously exported QueryMind JSON file into your local instance.
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json"
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid var(--border-strong)",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Upload className="w-4 h-4" />
                  <span>Select JSON File</span>
                </button>
              </div>
            </div>

            {importStatus && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#10B981",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {importStatus}
              </div>
            )}
          </div>

          {/* Danger Zone: Clear Data */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "rgba(239, 68, 68, 0.04)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#EF4444" }}>
                Danger Zone: Wipe Local Workspace Data
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                Permanently deletes local workspace documents, notes, chat transcripts, and resets to defaults.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to completely wipe all local workspace data? This cannot be undone."
                  )
                ) {
                  clearAllData();
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#EF4444",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset All Data</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: USER MANUAL & KEYBOARD SHORTCUTS                  */}
      {/* ======================================================== */}
      {activeTab === "shortcuts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Executive Architecture Guide */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <BookOpen className="w-4 h-4 text-accent" />
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                QueryMind Platform Manual
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px",
              }}
            >
              {[
                {
                  title: "1. Cognitive Spaces",
                  desc: "Each space partitions your vector context into distinct domains (e.g. Systems Engineering, Product Strategy, Research). Spaces retain their own resident AI specialist and document memory.",
                },
                {
                  title: "2. Vector Vault & Chunks",
                  desc: "Upload PDFs, Markdown, and text notes. QueryMind chunks and embeds them via BGE embeddings into Qdrant for semantic hybrid search during chat generation.",
                },
                {
                  title: "3. Multi-Agent Reasoning",
                  desc: "LangGraph-powered agents execute iterative research cycles, cross-document thesis validation, and multi-step synthesis grounded in your files.",
                },
                {
                  title: "4. Universal Spotlight",
                  desc: "Press ⌘K or Ctrl+K anywhere to summon the universal palette to jump across spaces, inspect knowledge objects, or run system actions.",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      marginTop: "6px",
                      lineHeight: "1.5",
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts Matrix */}
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Keyboard className="w-4 h-4 text-accent" />
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  Keyboard Shortcuts Reference
                </h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                High-efficiency keystrokes for rapid navigation across the workspace.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "10px",
              }}
            >
              {[
                { label: "Universal Spotlight Command Palette", kbd: "⌘K  /  Ctrl+K" },
                { label: "Omni-AI Floating Copilot", kbd: "Alt + K" },
                { label: "Zen Focus Mode (Fullscreen)", kbd: "⌘+Shift+Z" },
                { label: "Dismiss Open Modals & Drawers", kbd: "Escape" },
                { label: "Send Message in Chat", kbd: "Enter" },
                { label: "Insert Newline in Chat Input", kbd: "Shift + Enter" },
                { label: "Jump to Spaces Directory", kbd: "G then S" },
                { label: "Jump to Knowledge Vault", kbd: "G then V" },
              ].map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{s.label}</span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid var(--border-strong)",
                      color: "#FFFFFF",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {s.kbd}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: "1140px",
            margin: "0 auto",
            padding: "40px 24px",
            color: "var(--text-tertiary)",
            fontSize: "14px",
          }}
        >
          Loading workspace settings...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
