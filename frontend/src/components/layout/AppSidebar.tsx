"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";

export default function AppSidebar() {
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const setRoute = useMyndStore((state) => state.setRoute);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openSpotlight = useMyndStore((state) => state.openSpotlight);
  const openSettings = useMyndStore((state) => state.openSettings);
  const toggleTheme = useMyndStore((state) => state.toggleTheme);
  const userProfile = useMyndStore((state) => state.userProfile);

  const pathname = usePathname();

  // Helper to check active route from the actual URL
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <aside className="app-sidebar">
      {/* Sidebar Logo */}
      <Link
        href="/dashboard"
        className="sidebar-header"
        onClick={() => setRoute("home")}
        title="QueryMind Home"
        style={{ cursor: "pointer", textDecoration: "none" }}
      >
        <div className="sidebar-logo-circle">Q</div>
        <span className="sidebar-logo-text">QueryMind</span>
      </Link>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Core Nav Group */}
        <div className="nav-group">
          <Link
            href="/dashboard"
            className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}
            onClick={() => setRoute("home")}
          >
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span>Home</span>
            </div>
          </Link>

          <Link
            href="/workspace"
            className={`nav-item ${isActive("/workspace") ? "active" : ""}`}
            onClick={() => setRoute("workspace")}
          >
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </span>
              <span>Workspace</span>
            </div>
          </Link>

          <a
            className={`nav-item ${isActive("/search") ? "active" : ""}`}
            onClick={() => {
              setRoute("search");
              openSpotlight();
            }}
          >
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <span>Search</span>
            </div>
            <span className="kbd">⌘K</span>
          </a>

          <Link
            href="/activity"
            className={`nav-item ${isActive("/activity") ? "active" : ""}`}
            onClick={() => setRoute("intelligence")}
          >
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </span>
              <span>Activity</span>
            </div>
          </Link>

          <Link
            href="/chat"
            className={`nav-item ${isActive("/chat") ? "active" : ""}`}
            onClick={() => setRoute("chat")}
          >
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>Chat</span>
            </div>
          </Link>
        </div>


        {/* Spaces Group */}
        <div className="nav-group" style={{ marginTop: "24px" }}>
          <div className="nav-group-header">
            <span className="nav-group-label">Spaces</span>
            <span
              className="nav-group-add"
              onClick={() => openSettings("integrations")}
              title="Add Space"
            >
              +
            </span>
          </div>

          {spaces.map((space) => (
            <a
              key={space.id}
              className={`nav-item nav-space ${activeSpaceId === space.id ? "active" : ""}`}
              onClick={() => selectSpace(space.id)}
            >
              <div className="nav-item-left">
                <span className="nav-item-icon">
                  <span className="space-dot" style={{ background: space.color || "var(--accent-purple)" }} />
                </span>
                <span>{space.name}</span>
              </div>
              <span className="nav-item-badge">{space.count}</span>
            </a>
          ))}

          <a
            className="nav-item nav-add-space"
            onClick={() => openSettings("integrations")}
            style={{
              marginTop: "8px",
              border: "1px dashed var(--border-strong)",
              opacity: 0.75,
              justifyContent: "center",
              fontSize: "12px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <div className="nav-item-left" style={{ gap: "6px", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span style={{ fontWeight: 600 }}>Add new space</span>
            </div>
          </a>
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="user-profile-bar" onClick={() => openSettings("general")}>
          <div className="user-avatar-wrapper">
            <div
              className="text-avatar"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                background: "var(--surface-subtle)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {userProfile.name.charAt(0)}
            </div>
            <span className="user-name-text">{userProfile.name}</span>
          </div>
          <span className="user-chevron">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        <div className="sidebar-utility-bar">
          <button className="sidebar-utility-btn" onClick={() => openSettings("general")} title="Settings">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="sidebar-utility-btn" onClick={() => openSettings("autonomy")} title="Help & Autonomy">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <button className="sidebar-utility-btn" onClick={toggleTheme} title="Toggle Theme">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
