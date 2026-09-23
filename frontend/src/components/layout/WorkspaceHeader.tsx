"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";

export default function WorkspaceHeader() {
  const pathname = usePathname();
  const isChat = pathname === "/chat" || pathname?.startsWith("/chat/");

  const openSpotlight = useMyndStore((state) => state.openSpotlight);
  const openAskAi = useMyndStore((state) => state.openAskAi);
  const openSettings = useMyndStore((state) => state.openSettings);
  const isFocusMode = useMyndStore((state) => state.isFocusMode);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const isContextPanelCollapsed = useMyndStore((state) => state.isContextPanelCollapsed);
  const toggleContextPanel = useMyndStore((state) => state.toggleContextPanel);
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
          onClick={() => openAskAi()}
          style={{ cursor: "pointer" }}
        >
          <span className="workspace-search-icon" style={{ color: "#a855f7" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </span>
          <span className="workspace-search-placeholder" style={{ color: "var(--text-secondary)" }}>
            Ask Omni-AI Copilot or search workspace...
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

        {/* Toggle Right Sidebar Button */}
        {!isChat && (
          <button
            className="workspace-notification-btn"
            title={isContextPanelCollapsed ? "Open Right Sidebar (Copilot / Essentials)" : "Collapse Right Sidebar"}
            onClick={toggleContextPanel}
            style={{
              background: !isContextPanelCollapsed ? "var(--surface)" : undefined,
              borderColor: !isContextPanelCollapsed ? "var(--border-strong)" : undefined,
              color: !isContextPanelCollapsed ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M15 3v18" />
              <path d="m10 9-3 3 3 3" />
            </svg>
          </button>
        )}

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
