"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMyndStore } from "@/lib/mynd-store";
import { Trash2, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";

export default function SettingsModal() {
  const isSettingsOpen = useMyndStore((state) => state.isSettingsOpen);
  const closeSettings = useMyndStore((state) => state.closeSettings);
  const activeSettingsTab = useMyndStore((state) => state.activeSettingsTab);
  const openSettings = useMyndStore((state) => state.openSettings);
  const userProfile = useMyndStore((state) => state.userProfile);
  const setUserProfile = useMyndStore((state) => state.setUserProfile);
  const clearAllData = useMyndStore((state) => state.clearAllData);
  const loadSampleData = useMyndStore((state) => state.loadSampleData);
  const theme = useMyndStore((state) => state.theme);
  const toggleTheme = useMyndStore((state) => state.toggleTheme);
  const isZenMode = useMyndStore((state) => state.isZenMode);
  const toggleZenMode = useMyndStore((state) => state.toggleZenMode);

  const [nameInput, setNameInput] = useState(userProfile.name);
  const [isSaved, setIsSaved] = useState(false);

  if (!isSettingsOpen) return null;

  const tabs: Array<{ id: "general" | "appearance" | "autonomy" | "storage" | "integrations"; label: string }> = [
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
    { id: "autonomy", label: "Autonomy" },
    { id: "storage", label: "Storage" },
    { id: "integrations", label: "Integrations" },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile({ name: nameInput });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div
      className="settings-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSettings();
      }}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="settings-box" style={{ maxWidth: "560px", width: "90%" }}>
        <div className="settings-header">
          <span style={{ fontWeight: 600 }}>System Settings</span>
          <button className="close-btn" onClick={closeSettings}>
            ✕
          </button>
        </div>

        <div className="settings-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`settings-tab ${activeSettingsTab === t.id ? "active" : ""}`}
              onClick={() => openSettings(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-content" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {activeSettingsTab === "general" && (
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>User Name</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Displayed on your greeting & workspace</div>
                </div>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="kbd"
                  style={{ width: "180px", padding: "6px 12px", background: "var(--surface)", border: "1px solid var(--border-strong)" }}
                />
              </div>

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>Email</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>{userProfile.email}</div>
                </div>
                <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>Local</span>
              </div>

              <button
                type="submit"
                className="kbd"
                style={{
                  alignSelf: "flex-end",
                  background: "var(--accent)",
                  color: "#FFF",
                  border: "none",
                  padding: "8px 16px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                {isSaved ? "Saved ✓" : "Save Changes"}
              </button>
            </form>
          )}

          {activeSettingsTab === "appearance" && (
            <>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>Theme</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Currently: {theme.toUpperCase()}</div>
                </div>
                <button
                  className="kbd"
                  onClick={toggleTheme}
                  style={{ padding: "6px 14px", cursor: "pointer", background: "var(--surface)", border: "1px solid var(--border-strong)" }}
                >
                  Toggle Theme
                </button>
              </div>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>Zen Mode</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Pure black distraction-free mode ({isZenMode ? "Active" : "Off"})</div>
                </div>
                <button
                  className="kbd"
                  onClick={toggleZenMode}
                  style={{ padding: "6px 14px", cursor: "pointer", background: "var(--surface)", border: "1px solid var(--border-strong)" }}
                >
                  {isZenMode ? "Disable Zen" : "Enable Zen"}
                </button>
              </div>
            </>
          )}

          {activeSettingsTab === "storage" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>Clear Workspace Data</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Wipes local documents and resets to clean slate</div>
                </div>
                <button
                  className="kbd"
                  onClick={() => {
                    if (confirm("Are you sure you want to clear your local workspace data?")) {
                      clearAllData();
                    }
                  }}
                  style={{ padding: "6px 12px", cursor: "pointer", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA" }}
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                  Clear Data
                </button>
              </div>

              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>Load Demo Sample Data</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Populates sample architecture notes for preview</div>
                </div>
                <button
                  className="kbd"
                  onClick={loadSampleData}
                  style={{ padding: "6px 12px", cursor: "pointer", background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                  Load Sample
                </button>
              </div>
            </div>
          )}

          {activeSettingsTab === "integrations" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>Google Gemini 3.7 Flash</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Autonomous reasoning & chat synthesis</div>
                </div>
                <span className="badge" style={{ background: "#ECFDF5", color: "#065F46", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>Connected</span>
              </div>
              <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>Qdrant Vector Database</div>
                  <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Port 6333 • BGE Small Embeddings</div>
                </div>
                <span className="badge" style={{ background: "#ECFDF5", color: "#065F46", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>Ready</span>
              </div>
            </div>
          )}

          {activeSettingsTab === "autonomy" && (
            <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="settings-row-label" style={{ fontWeight: 600, fontSize: "14px" }}>Zero-Prompt Indexing</div>
                <div className="settings-row-sub" style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>Automatically parse documents and construct spatial graph on upload</div>
              </div>
              <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "4px 8px", borderRadius: "4px", fontSize: "11px" }}>Enabled</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
