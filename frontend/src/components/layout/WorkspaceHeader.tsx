"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelRight } from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";

export default function WorkspaceHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const isChat = pathname === "/chat" || pathname?.startsWith("/chat/");

  const openSpotlight = useMyndStore((state) => state.openSpotlight);
  const userProfile = useMyndStore((state) => state.userProfile);
  const toggleContextPanel = useMyndStore((state) => state.toggleContextPanel);
  const isContextPanelCollapsed = useMyndStore((state) => state.isContextPanelCollapsed);
  const selectedObject = useMyndStore((state) => state.selectedObject);

  const initials = (() => {
    const name = userProfile?.name?.trim() || "User";
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

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
          onClick={() => openSpotlight()}
          style={{ cursor: "pointer" }}
        >
          <span className="workspace-search-icon" style={{ color: "var(--text-tertiary)" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <span className="workspace-search-placeholder" style={{ color: "var(--text-secondary)" }}>
            Search workspace, spaces, or jump to...
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="kbd">⌘K</span>
          </div>
        </div>
      )}

      {/* Header Right Actions */}
      <div className="workspace-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Toggle Context Inspector Button */}
        <button
          type="button"
          onClick={toggleContextPanel}
          title={!isContextPanelCollapsed || selectedObject ? "Close Context Inspector (Alt+I)" : "Open Context Inspector (Alt+I)"}
          style={{
            position: "relative",
            width: "32px",
            height: "32px",
            borderRadius: "7px",
            border: (!isContextPanelCollapsed || selectedObject) ? "1px solid #FFFFFF" : "1px solid var(--border)",
            background: (!isContextPanelCollapsed || selectedObject) ? "#FFFFFF" : "var(--surface)",
            color: (!isContextPanelCollapsed || selectedObject) ? "#000000" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <PanelRight style={{ width: "15px", height: "15px" }} />
          {selectedObject && (
            <span
              style={{
                position: "absolute",
                top: "5px",
                right: "5px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 6px #10B981",
              }}
            />
          )}
        </button>

        {/* User DP / Profile Avatar */}
        <div
          className="text-avatar"
          title="View Profile"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "9999px",
            background: "var(--surface-hover)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            overflow: "hidden",
            flexShrink: 0,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onClick={() => router.push("/profile")}
        >
          {userProfile?.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
}
