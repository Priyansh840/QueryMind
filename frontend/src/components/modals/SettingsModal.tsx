"use client";

import React, { useState, useRef } from "react";
import { useMyndStore, Space } from "@/lib/mynd-store";
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

export default function SettingsModal() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSettingsOpen = useMyndStore((state) => state.isSettingsOpen);
  const closeSettings = useMyndStore((state) => state.closeSettings);
  const activeSettingsTab = useMyndStore((state) => state.activeSettingsTab);
  const openSettings = useMyndStore((state) => state.openSettings);

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

  // Personalization
  const personalization = useMyndStore((state) => state.personalization);
  const updatePersonalization = useMyndStore((state) => state.updatePersonalization);

  const [nameInput, setNameInput] = useState(userProfile.name);
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isSettingsOpen) return null;

  const tabs: Array<{ id: typeof activeSettingsTab; label: string }> = [
    { id: "appearance", label: "Appearance" },
    { id: "general", label: "General" },
    { id: "personalization", label: "AI Style" },
    { id: "ai", label: "AI & Model" },
    { id: "notifications", label: "Sound & Alerts" },
    { id: "storage", label: "Data & Backup" },
    { id: "shortcuts", label: "User Manual & Shortcuts" },
  ];

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
      personalization,
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
          if (json.personalization) updatePersonalization(json.personalization);
          setImportStatus("Workspace restored successfully! ✓");
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus("Invalid backup format.");
        }
      } catch (err) {
        setImportStatus("Error parsing JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="settings-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSettings();
      }}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        className="settings-box"
        style={{
          maxWidth: "680px",
          width: "92%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div className="settings-header" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 700, fontSize: "15px" }}>Settings</span>
          </div>
          <button className="close-btn" onClick={closeSettings} style={{ fontSize: "16px" }}>
            ✕
          </button>
        </div>

        {/* Modal Tabs Bar */}
        <div className="settings-tabs" style={{ padding: "0 16px", overflowX: "auto" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`settings-tab ${activeSettingsTab === t.id ? "active" : ""}`}
              onClick={() => openSettings(t.id)}
              style={{ fontSize: "12px", whiteSpace: "nowrap" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Content Scroll Area */}
        <div
          className="settings-content"
          style={{
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            overflowY: "auto",
          }}
        >
          {/* TAB 1: APPEARANCE & THEMES */}
          {activeSettingsTab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Theme Gallery */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", display: "block", marginBottom: "4px" }}>
                  Color Theme
                </label>
                <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "12px" }}>
                  Choose a visual theme tailored for comfort, focus, and aesthetics.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  {themePresets.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        style={{
                          padding: "12px",
                          borderRadius: "10px",
                          border: isSelected ? "2px solid #FFFFFF" : "1px solid var(--border)",
                          background: t.bg,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          position: "relative",
                          boxShadow: isSelected ? "0 0 16px rgba(255, 255, 255, 0.15)" : "none",
                        }}
                      >
                        {/* Mini Color Palette Bar */}
                        <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: t.surface, border: "1px solid " + t.border }} />
                          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: t.accent }} />
                          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: t.text }} />
                          {isSelected && (
                            <span style={{ marginLeft: "auto", color: t.accent, fontSize: "11px", fontWeight: 700 }}>
                              ✓ Active
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: t.text }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px", lineHeight: "1.3" }}>
                          {t.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Picker */}
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Accent Highlight</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Used for active tabs, badges, and focus rings</div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {accentPresets.map((a) => {
                    const isSelected = accentColor === a.color;
                    return (
                      <button
                        key={a.name}
                        type="button"
                        onClick={() => setAccentColor(a.color)}
                        title={a.name}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          background: a.color,
                          border: isSelected ? "2px solid #FFFFFF" : "1px solid rgba(255, 255, 255, 0.2)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: a.color === "#FFFFFF" ? "#000000" : "#FFFFFF",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UI Density */}
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Interface Density</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Adjust padding and list spacing</div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {(["compact", "comfortable", "spacious"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setUiDensity(d)}
                      style={{
                        padding: "5px 10px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        border: uiDensity === d ? "1px solid #FFFFFF" : "1px solid var(--border)",
                        background: uiDensity === d ? "#FFFFFF" : "var(--surface)",
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

              {/* Reduce Motion */}
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Smooth Animations</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Disable motion for faster transitions or battery saving</div>
                </div>
                <button
                  type="button"
                  onClick={() => setReduceMotion(!reduceMotion)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "11px",
                    borderRadius: "6px",
                    border: !reduceMotion ? "1px solid #10B981" : "1px solid var(--border)",
                    background: !reduceMotion ? "rgba(16, 185, 129, 0.15)" : "var(--surface)",
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

          {/* TAB 2: GENERAL & ACCOUNT */}
          {activeSettingsTab === "general" && (
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Your Name</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Used for greetings, greetings bar, and chat history</div>
                </div>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{
                    width: "200px",
                    padding: "6px 12px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "6px",
                    color: "#FFFFFF",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Email Account</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{userProfile.email}</div>
                </div>
                <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                  Active
                </span>
              </div>

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Default Startup Space</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Space to automatically open on app launch</div>
                </div>
                <select
                  value={defaultSpaceId}
                  onChange={(e) => setDefaultSpaceId(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    background: "var(--surface)",
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

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Interface Language</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Primary language for menus and navigation</div>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    background: "var(--surface)",
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

              <button
                type="submit"
                style={{
                  alignSelf: "flex-end",
                  background: "#FFFFFF",
                  color: "#000000",
                  border: "none",
                  padding: "8px 18px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "12px",
                  marginTop: "8px",
                }}
              >
                {isSaved ? "Saved ✓" : "Save Changes"}
              </button>
            </form>
          )}

          {/* TAB 3: AI PERSONALIZATION */}
          {activeSettingsTab === "personalization" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles className="w-4 h-4" style={{ color: "#FFFFFF" }} />
                    AI Thinking Style
                  </div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "2px" }}>
                    Choose how the AI talks and thinks when answering you
                  </div>
                </div>
                <button
                  onClick={() => {
                    closeSettings();
                    router.push("/personalization");
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text-primary)",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span>Open Full Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { id: "first_principles", label: "Step-by-Step", desc: "Finds root causes" },
                  { id: "executive", label: "Quick Summary", desc: "Fast & to the point" },
                  { id: "socratic", label: "Challenger", desc: "Asks questions, tests ideas" },
                  { id: "speed", label: "Fast Coder", desc: "Direct code, no fluff" },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => updatePersonalization({ cognitiveStyle: item.id as any })}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: personalization.cognitiveStyle === item.id ? "1.5px solid #FFFFFF" : "1px solid var(--border)",
                      background: personalization.cognitiveStyle === item.id ? "rgba(255, 255, 255, 0.08)" : "var(--surface)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 600, color: personalization.cognitiveStyle === item.id ? "#FFFFFF" : "var(--text-primary)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Answer Length</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>How short or detailed answers should be</div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[
                    { id: "concise", label: "Short" },
                    { id: "balanced", label: "Normal" },
                    { id: "deep_dive", label: "Detailed" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => updatePersonalization({ verbosity: v.id as any })}
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        borderRadius: "4px",
                        border: personalization.verbosity === v.id ? "1px solid #FFFFFF" : "1px solid var(--border)",
                        background: personalization.verbosity === v.id ? "#FFFFFF" : "var(--surface)",
                        color: personalization.verbosity === v.id ? "#000000" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: personalization.verbosity === v.id ? 600 : 400,
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Only Use My Files</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Only answer using files in your vault (no guessing)</div>
                </div>
                <button
                  type="button"
                  onClick={() => updatePersonalization({ strictGrounding: !personalization.strictGrounding })}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    borderRadius: "4px",
                    border: personalization.strictGrounding ? "1px solid #10B981" : "1px solid var(--border)",
                    background: personalization.strictGrounding ? "rgba(16, 185, 129, 0.15)" : "var(--surface)",
                    color: personalization.strictGrounding ? "#10B981" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {personalization.strictGrounding ? "On" : "Off"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: AI & MODEL SETTINGS */}
          {activeSettingsTab === "ai" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Reasoning Engine</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Model powering your workspace and agents</div>
                </div>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value as any)}
                  style={{
                    padding: "6px 10px",
                    background: "var(--surface)",
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

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Real-Time Web Search</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Allow AI to check the live internet for up-to-date facts</div>
                </div>
                <button
                  type="button"
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "11px",
                    borderRadius: "6px",
                    border: webSearchEnabled ? "1px solid #10B981" : "1px solid var(--border)",
                    background: webSearchEnabled ? "rgba(16, 185, 129, 0.15)" : "var(--surface)",
                    color: webSearchEnabled ? "#10B981" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {webSearchEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Code Execution Preview</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Display quick copy and preview actions for code snippets</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCodeExecution(!codeExecution)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "11px",
                    borderRadius: "6px",
                    border: codeExecution ? "1px solid #10B981" : "1px solid var(--border)",
                    background: codeExecution ? "rgba(16, 185, 129, 0.15)" : "var(--surface)",
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

          {/* TAB 5: SOUND & NOTIFICATIONS */}
          {activeSettingsTab === "notifications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Audio Feedback (Chimes)</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Plays a gentle sound when AI finishes answering or uploads complete</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEffects(!soundEffects)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "11px",
                    borderRadius: "6px",
                    border: soundEffects ? "1px solid #10B981" : "1px solid var(--border)",
                    background: soundEffects ? "rgba(16, 185, 129, 0.15)" : "var(--surface)",
                    color: soundEffects ? "#10B981" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {soundEffects ? "Sound On" : "Muted"}
                </button>
              </div>

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Autonomous Agent Alerts</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Notify when agents discover new connections across your spaces</div>
                </div>
                <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>
                  Active
                </span>
              </div>
            </div>
          )}

          {/* TAB 6: DATA & BACKUP */}
          {activeSettingsTab === "storage" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Stats Box */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>{spaces.length}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Active Spaces</div>
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>{uploadedDocuments.length}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Vault Documents</div>
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>{recentObjects.length}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Knowledge Items</div>
                </div>
              </div>

              {/* Export Workspace */}
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Export Workspace Backup</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Download spaces, notes, and settings as a JSON file</div>
                </div>
                <button
                  type="button"
                  onClick={handleExportWorkspace}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "var(--surface)",
                    border: "1px solid var(--border-strong)",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
              </div>

              {/* Import Workspace */}
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px" }}>Restore From Backup</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Upload a previously exported QueryMind backup</div>
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
                      gap: "5px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: "var(--surface)",
                      border: "1px solid var(--border-strong)",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Restore Backup
                  </button>
                </div>
              </div>

              {importStatus && (
                <div style={{ fontSize: "12px", color: "#10B981", fontWeight: 600 }}>
                  {importStatus}
                </div>
              )}

              {/* Clear Workspace */}
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "13px", color: "#EF4444" }}>Clear Workspace Data</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Wipes local notes, spaces, and resets to clean slate</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to clear your local workspace data? This cannot be undone.")) {
                      clearAllData();
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    color: "#EF4444",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                  Clear Data
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: USER MANUAL & KEYBOARD SHORTCUTS */}
          {activeSettingsTab === "shortcuts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* User Manual Section */}
              <div
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Terminal className="w-4 h-4 text-accent" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>
                    QueryMind User Manual
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  <div>
                    <strong style={{ color: "#FFFFFF" }}>1. Spaces (Neural Domains):</strong> Each space acts as an isolated cognitive domain (e.g. Engineering, Research, Career). Spaces maintain their own documents, milestones, notes, and resident AI agent persona.
                  </div>
                  <div>
                    <strong style={{ color: "#FFFFFF" }}>2. Knowledge Base & Vault:</strong> Upload PDFs, markdown, and text notes. QueryMind chunks and embeds them via BGE embeddings into Qdrant vector storage for real-time RAG context during chats.
                  </div>
                  <div>
                    <strong style={{ color: "#FFFFFF" }}>3. Contextual Multi-Agent Chat:</strong> Chat directly with your workspace brain. The AI synthesizes answers grounded in your uploaded documents, active space notes, and persistent memory.
                  </div>
                  <div>
                    <strong style={{ color: "#FFFFFF" }}>4. Personalization & AI Style:</strong> Customize how the AI talks to you, your technical background, and thinking preferences in the Personalization hub.
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts Section */}
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginBottom: "8px" }}>
                  Keyboard Shortcuts
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{shortcut.action}</span>
                      <span className="kbd" style={{ fontFamily: "var(--mono)", fontSize: "11px" }}>{shortcut.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
