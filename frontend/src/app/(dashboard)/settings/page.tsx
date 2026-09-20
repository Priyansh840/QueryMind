"use client";

import React, { useState, useRef } from "react";
import { useMyndStore } from "@/lib/mynd-store";
import { useRouter } from "next/navigation";
import {
  Palette,
  Sparkles,
  Sliders,
  Shield,
  Volume2,
  VolumeX,
  Keyboard,
  Database,
  Trash2,
  RotateCcw,
  ExternalLink,
  Download,
  Upload,
  Check,
  Globe,
  Cpu,
  Zap,
  Layers,
  Moon,
  Sun,
  Coffee,
  Terminal,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfile = useMyndStore((state) => state.userProfile);
  const setUserProfile = useMyndStore((state) => state.setUserProfile);
  const spaces = useMyndStore((state) => state.spaces);
  const setSpaces = useMyndStore((state) => state.setSpaces);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const recentObjects = useMyndStore((state) => state.recentObjects);
  const clearAllData = useMyndStore((state) => state.clearAllData);

  // Theme & Appearance
  const theme = useMyndStore((state) => state.theme);
  const setTheme = useMyndStore((state) => state.setTheme);
  const accentColor = useMyndStore((state) => state.accentColor);
  const setAccentColor = useMyndStore((state) => state.setAccentColor);
  const uiDensity = useMyndStore((state) => state.uiDensity);
  const setUiDensity = useMyndStore((state) => state.setUiDensity);
  const reduceMotion = useMyndStore((state) => state.reduceMotion);
  const setReduceMotion = useMyndStore((state) => state.setReduceMotion);

  // System & AI
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

  const [activeTab, setActiveTab] = useState<"appearance" | "general" | "ai" | "notifications" | "storage" | "shortcuts">("appearance");
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const themePresets: Array<{
    id: typeof theme;
    name: string;
    desc: string;
    bg: string;
    surface: string;
    border: string;
    accent: string;
    text: string;
  }> = [
    {
      id: "dark",
      name: "Midnight Slate",
      desc: "Classic dark mode with crisp white accents",
      bg: "#000000",
      surface: "#141414",
      border: "rgba(255, 255, 255, 0.14)",
      accent: "#FFFFFF",
      text: "#FFFFFF",
    },
    {
      id: "light",
      name: "Nordic Frost",
      desc: "Clean, bright, and airy daylight reading",
      bg: "#FFFFFF",
      surface: "#F9FAFB",
      border: "#E5E7EB",
      accent: "#111827",
      text: "#111827",
    },
    {
      id: "zen",
      name: "OLED Obsidian",
      desc: "Pure 100% black, zero distraction, battery saver",
      bg: "#000000",
      surface: "#080808",
      border: "#1F1F1F",
      accent: "#ECECEC",
      text: "#ECECEC",
    },
    {
      id: "cyberpunk",
      name: "Cyber Neon",
      desc: "Midnight indigo with electric cyan & violet glow",
      bg: "#070B14",
      surface: "#0E1626",
      border: "rgba(0, 240, 255, 0.25)",
      accent: "#00F0FF",
      text: "#E0F7FA",
    },
    {
      id: "sepia",
      name: "Warm Coffee",
      desc: "Soft dark paper and warm amber, easy on eyes",
      bg: "#1C1917",
      surface: "#292524",
      border: "rgba(245, 158, 11, 0.25)",
      accent: "#F59E0B",
      text: "#FEF3C7",
    },
    {
      id: "arctic",
      name: "Arctic Deep",
      desc: "Deep navy ocean with cool mint accents",
      bg: "#0B132B",
      surface: "#1C2541",
      border: "rgba(91, 192, 190, 0.25)",
      accent: "#5BC0BE",
      text: "#FFFFFF",
    },
  ];

  const accentPresets = [
    { name: "White", color: "#FFFFFF" },
    { name: "Emerald", color: "#10B981" },
    { name: "Blue", color: "#3B82F6" },
    { name: "Purple", color: "#A855F7" },
    { name: "Amber", color: "#F59E0B" },
    { name: "Rose", color: "#F43F5E" },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile({ name: nameInput });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportWorkspace = () => {
    const data = {
      version: "3.0",
      exportedAt: new Date().toISOString(),
      userProfile,
      spaces,
      uploadedDocuments,
      theme,
      accentColor,
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
          setImportStatus("Workspace restored successfully! ✓");
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus("Invalid backup format.");
        }
      } catch {
        setImportStatus("Error parsing JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "32px 24px 80px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
            Workspace Settings
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Personalize themes, display density, reasoning models, backups, and audio alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/personalization")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid var(--border-strong)",
            color: "#FFFFFF",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Personality Studio
          <ExternalLink className="w-3 h-3 ml-1" />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px", overflowX: "auto" }}>
        {[
          { id: "appearance", label: "Appearance & Themes", icon: Palette },
          { id: "general", label: "General & Profile", icon: Sliders },
          { id: "ai", label: "AI & Reasoning", icon: Cpu },
          { id: "notifications", label: "Sound & Alerts", icon: Volume2 },
          { id: "storage", label: "Data & Backup", icon: Database },
          { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
        ].map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                background: isActive ? "rgba(255, 255, 255, 0.1)" : "transparent",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                border: isActive ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: APPEARANCE */}
      {activeTab === "appearance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF", marginBottom: "4px" }}>Theme Gallery</h2>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "14px" }}>
              Select a color palette designed for high contrast and visual comfort.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
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
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 0 20px rgba(255, 255, 255, 0.12)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
                      <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: t.surface, border: "1px solid " + t.border }} />
                      <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: t.accent }} />
                      <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: t.text }} />
                      {isSelected && (
                        <span style={{ marginLeft: "auto", color: t.accent, fontSize: "11px", fontWeight: 700 }}>
                          ✓ Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: t.text }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "3px", lineHeight: "1.3" }}>
                      {t.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accent Color */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Accent Highlight Color</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Controls active buttons, focus rings, and badge highlights
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {accentPresets.map((a) => {
                const isSelected = accentColor === a.color;
                return (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => setAccentColor(a.color)}
                    title={a.name}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: a.color,
                      border: isSelected ? "2px solid #FFFFFF" : "1px solid rgba(255, 255, 255, 0.2)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: a.color === "#FFFFFF" ? "#000000" : "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 700,
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
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Interface Density</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Adjust padding and row height across the app
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["compact", "comfortable", "spacious"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setUiDensity(d)}
                  style={{
                    padding: "6px 14px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: uiDensity === d ? "1px solid #FFFFFF" : "1px solid var(--border)",
                    background: uiDensity === d ? "#FFFFFF" : "transparent",
                    color: uiDensity === d ? "#000000" : "var(--text-secondary)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontWeight: uiDensity === d ? 600 : 400,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Smooth Animations */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Smooth Animations</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Disable animations for instant transitions or lower battery usage
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReduceMotion(!reduceMotion)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                borderRadius: "6px",
                border: !reduceMotion ? "1px solid #10B981" : "1px solid var(--border)",
                background: !reduceMotion ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: !reduceMotion ? "#10B981" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {!reduceMotion ? "Enabled" : "Reduced"}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: GENERAL & PROFILE */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Your Name</div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Displayed on your greeting and workspace</div>
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  width: "220px",
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "6px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Email Account</div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>{userProfile.email}</div>
              </div>
              <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                Connected
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Default Startup Space</div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Space to automatically open when launching QueryMind</div>
              </div>
              <select
                value={defaultSpaceId}
                onChange={(e) => setDefaultSpaceId(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "6px",
                  color: "#FFFFFF",
                  fontSize: "12px",
                }}
              >
                <option value="">Last Active Space</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Language</div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Primary interface language</div>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "6px",
                  color: "#FFFFFF",
                  fontSize: "12px",
                }}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            style={{
              alignSelf: "flex-end",
              background: "#FFFFFF",
              color: "#000000",
              border: "none",
              padding: "10px 20px",
              cursor: "pointer",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            {isSaved ? "Saved ✓" : "Save Changes"}
          </button>
        </form>
      )}

      {/* TAB CONTENT: AI & REASONING */}
      {activeTab === "ai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Reasoning Engine</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Select the Google Gemini model for chat synthesis and analysis
              </div>
            </div>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value as any)}
              style={{
                padding: "8px 12px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border-strong)",
                borderRadius: "6px",
                color: "#FFFFFF",
                fontSize: "12px",
              }}
            >
              <option value="gemini-3.7-flash">Gemini 3.7 Flash (Fast & Smart)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep 1M Context)</option>
            </select>
          </div>

          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Real-Time Web Search</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Allow AI to check current internet data for up-to-date facts
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                borderRadius: "6px",
                border: webSearchEnabled ? "1px solid #10B981" : "1px solid var(--border)",
                background: webSearchEnabled ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: webSearchEnabled ? "#10B981" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {webSearchEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Code Execution Preview</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Display copy actions and syntax highlighting for code blocks
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCodeExecution(!codeExecution)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                borderRadius: "6px",
                border: codeExecution ? "1px solid #10B981" : "1px solid var(--border)",
                background: codeExecution ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: codeExecution ? "#10B981" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {codeExecution ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SOUND & ALERTS */}
      {activeTab === "notifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Audio Feedback (Chimes)</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Plays a gentle sound when AI finishes answering or uploads complete
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSoundEffects(!soundEffects)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                borderRadius: "6px",
                border: soundEffects ? "1px solid #10B981" : "1px solid var(--border)",
                background: soundEffects ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: soundEffects ? "#10B981" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {soundEffects ? "Sound On" : "Muted"}
            </button>
          </div>

          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Autonomous Agent Alerts</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Notify when agents discover new connections across your spaces
              </div>
            </div>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
              Active
            </span>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DATA & BACKUP */}
      {activeTab === "storage" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Stats Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              padding: "16px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>{spaces.length}</div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Active Spaces</div>
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>{uploadedDocuments.length}</div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Vault Documents</div>
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>{recentObjects.length}</div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Knowledge Items</div>
            </div>
          </div>

          {/* Export */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Export Workspace Backup</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Download your spaces, notes, and settings as a JSON backup file
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportWorkspace}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "6px",
                background: "#FFFFFF",
                color: "#000000",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
              }}
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>

          {/* Import */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF" }}>Restore From Backup</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Restore spaces and settings from a previously saved JSON backup
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
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid var(--border-strong)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Upload className="w-4 h-4" />
                Restore Backup
              </button>
            </div>
          </div>

          {importStatus && (
            <div style={{ fontSize: "13px", color: "#10B981", fontWeight: 600, padding: "8px 12px" }}>
              {importStatus}
            </div>
          )}

          {/* Clear */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#EF4444" }}>Clear Workspace Data</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                Wipes all local spaces, notes, and resets to a clean slate
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Are you sure you want to clear your local workspace data? This cannot be undone.")) {
                  clearAllData();
                }
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                color: "#EF4444",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
              Clear Data
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SHORTCUTS */}
      {activeTab === "shortcuts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "6px" }}>
            Speed up your navigation and workflow with these keyboard shortcuts:
          </p>

          {[
            { key: "⌘K / Ctrl+K", action: "Open Spotlight Universal Search" },
            { key: "⌘J / Ctrl+J", action: "Jump straight to Chat" },
            { key: "⌘/ / Ctrl+/", action: "Ask Quick AI Assistant" },
            { key: "Esc", action: "Close any modal, popup, or preview" },
            { key: "Enter", action: "Send message in chat" },
            { key: "Shift + Enter", action: "New line in chat input" },
          ].map((shortcut, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{shortcut.action}</span>
              <span className="kbd" style={{ fontFamily: "var(--mono)", fontSize: "12px", padding: "4px 10px" }}>
                {shortcut.key}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
