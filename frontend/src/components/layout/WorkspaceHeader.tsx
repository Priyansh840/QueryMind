"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";

export default function WorkspaceHeader() {
  const pathname = usePathname();
  const isChat = pathname === "/chat" || pathname?.startsWith("/chat/");

  const openSpotlight = useMyndStore((state) => state.openSpotlight);
  const openSettings = useMyndStore((state) => state.openSettings);
  const toggleTheme = useMyndStore((state) => state.toggleTheme);
  const isFocusMode = useMyndStore((state) => state.isFocusMode);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const userProfile = useMyndStore((state) => state.userProfile);

  return (
    <header className="workspace-header-bar">
      <div /> {/* Spacer */}

      {/* Center Bar */}
      {isChat ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
            QueryMind Intelligence
          </span>
          <span className="alive-dot" />
          <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
            LangGraph Multi-Agent
          </span>
        </div>
      ) : (
        <div
          className="workspace-search-capsule"
          onClick={openSpotlight}
          style={{ cursor: "pointer" }}
        >
          <span className="workspace-search-icon">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <span className="workspace-search-placeholder" style={{ color: "var(--text-tertiary)" }}>
            Ask or search anything...
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="kbd">⌘K</span>
          </div>
        </div>
      )}


      {/* Header Right Actions */}
      <div className="workspace-header-actions">
        <button
          className="workspace-notification-btn"
          onClick={toggleFocusMode}
          title={isFocusMode ? "Exit Focus Mode (Esc or ⌘⇧F)" : "Enter Focus Mode (⌘⇧F)"}
          style={{
            background: isFocusMode ? "#FFFFFF" : undefined,
            color: isFocusMode ? "#000000" : "var(--text-primary)",
            borderColor: isFocusMode ? "#FFFFFF" : undefined,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: isFocusMode ? "0 10px" : undefined,
            width: isFocusMode ? "auto" : undefined,
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {isFocusMode ? (
            <>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#000000" }} />
              <span>Focus On</span>
            </>
          ) : (
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.2" fill="none">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>

        <button
          className="workspace-notification-btn"
          title="Notifications"
          onClick={() => openSettings("general")}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <button
          className="workspace-notification-btn"
          onClick={toggleTheme}
          title="Toggle Theme"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </button>

        <div
          className="text-avatar"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "9999px",
            background: "#262626",
            color: "#FFFFFF",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
          onClick={() => openSettings("general")}
        >
          {userProfile.name.charAt(0)}
        </div>
      </div>
    </header>
  );
}
