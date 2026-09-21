"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";
import { supabase } from "@/lib/supabase";
import { authApi } from "@/lib/api";
import {
  Clock,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  BookOpen,
} from "lucide-react";

export default function AppSidebar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);
  const recentSpaceIds = useMyndStore((state) => state.recentSpaceIds);
  const setRoute = useMyndStore((state) => state.setRoute);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openSpotlight = useMyndStore((state) => state.openSpotlight);
  const openSettings = useMyndStore((state) => state.openSettings);
  const openEditProfile = useMyndStore((state) => state.openEditProfile);
  const openCreateSpace = useMyndStore((state) => state.openCreateSpace);
  const userProfile = useMyndStore((state) => state.userProfile);
  const theme = useMyndStore((state) => state.theme);
  const toggleTheme = useMyndStore((state) => state.toggleTheme);

  const pathname = usePathname();

  const initials = (() => {
    const name = userProfile.name || "User";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    useMyndStore.getState().clearAllData();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    authApi.logout();
  };

  // Helper to check active route from the actual URL
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  // Only display the 2 most recently used spaces in the left sidebar
  const sidebarSpaces = useMemo(() => {
    if (!spaces || spaces.length === 0) return [];

    const recentIds = recentSpaceIds || [];
    const ordered: typeof spaces = [];

    // 1. Add spaces found in recentIds (most recently used first)
    for (const rId of recentIds) {
      const found = spaces.find((s) => s.id === rId || s.slug === rId);
      if (found && !ordered.some((s) => s.id === found.id)) {
        ordered.push(found);
      }
      if (ordered.length >= 2) break;
    }

    // 2. If fewer than 2 recent spaces recorded, fill with remaining spaces
    if (ordered.length < 2) {
      for (const s of spaces) {
        if (!ordered.some((x) => x.id === s.id)) {
          ordered.push(s);
        }
        if (ordered.length >= 2) break;
      }
    }

    // Strictly limit to maximum of 2 spaces
    return ordered.slice(0, 2);
  }, [spaces, recentSpaceIds]);

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

          <Link
            href="/vault"
            className={`nav-item ${isActive("/vault") ? "active" : ""}`}
            onClick={() => setRoute("vault")}
          >
            <div className="nav-item-left">
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              <span>Documents</span>
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
            <Link
              href="/spaces"
              className="nav-group-label"
              style={{ textDecoration: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              title="View All Spaces"
            >
              <span>Spaces</span>
              <span style={{ fontSize: "10px", opacity: 0.6 }}>({spaces.length})</span>
            </Link>
            <span
              className="nav-group-add"
              onClick={openCreateSpace}
              title="Create New Space"
              style={{ cursor: "pointer" }}
            >
              +
            </span>
          </div>

          {sidebarSpaces.length === 0 ? (
            <div
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                color: "var(--text-tertiary)",
                fontStyle: "italic",
              }}
            >
              No spaces yet
            </div>
          ) : (
            sidebarSpaces.map((space, idx) => {
              const isSpaceActive = pathname === `/spaces/${space.id}`;
              return (
                <Link
                  key={`sidebar-space-${space.id}-${idx}`}
                  href={`/spaces/${space.id}`}
                  className={`nav-item nav-space ${isSpaceActive ? "active" : ""}`}
                  onClick={() => selectSpace(space.id)}
                  style={{ textDecoration: "none" }}
                >
                  <div className="nav-item-left">
                    <span className="nav-item-icon">
                      <span
                        className="space-dot"
                        style={{
                          background: isSpaceActive ? "#FFFFFF" : "#737373",
                          boxShadow: "none",
                        }}
                      />
                    </span>
                    <span>{space.name}</span>
                  </div>
                  <span className="nav-item-badge">{space.count}</span>
                </Link>
              );
            })
          )}

          {spaces.length > 2 && (
            <Link
              href="/spaces"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 12px",
                fontSize: "11px",
                color: "var(--text-tertiary)",
                textDecoration: "none",
                borderRadius: "6px",
                marginTop: "2px",
                opacity: 0.8,
              }}
              title="View all spaces in Gallery"
            >
              <span>+{spaces.length - 2} more in Spaces</span>
              <span style={{ fontSize: "11px" }}>&rarr;</span>
            </Link>
          )}

          <a
            className="nav-item nav-add-space"
            onClick={openCreateSpace}
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
              <span style={{ fontWeight: 600 }}>Create new space</span>
            </div>
          </a>
        </div>
      </nav>

      {/* Sidebar Footer with ChatGPT-style Popover Menu & Utility Actions */}
      <div
        className="sidebar-footer"
        ref={popoverRef}
      >
        {/* Floating Popover Menu */}
        {isMenuOpen && (
          <div className="chatgpt-popover">
            {/* Header User Item */}
            <div
              className="chatgpt-popover-item"
              onClick={() => {
                setIsMenuOpen(false);
                openEditProfile();
              }}
              style={{ justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#D97706",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                    {userProfile.name}
                  </span>
                  <span style={{ fontSize: "11px", color: "#8E8E93" }}>
                    {userProfile.username ? `@${userProfile.username}` : "Free"}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: "#8E8E93" }} />
            </div>

            <div className="chatgpt-popover-divider" />

            {/* Personalization */}
            <div
              className="chatgpt-popover-item"
              onClick={() => {
                setIsMenuOpen(false);
                router.push("/personalization");
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                <Sparkles size={16} style={{ color: "#D1D5DB" }} />
                <span>Personalization</span>
              </div>
            </div>

            {/* Profile */}
            <div
              className="chatgpt-popover-item"
              onClick={() => {
                setIsMenuOpen(false);
                openEditProfile();
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                <User size={16} style={{ color: "#D1D5DB" }} />
                <span>Profile</span>
              </div>
            </div>

            {/* Settings */}
            <div
              className="chatgpt-popover-item"
              onClick={() => {
                setIsMenuOpen(false);
                openSettings("general");
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                <Settings size={16} style={{ color: "#D1D5DB" }} />
                <span>Settings</span>
              </div>
            </div>

            <div className="chatgpt-popover-divider" />

            {/* Help & User Manual */}
            <div
              className="chatgpt-popover-item"
              onClick={() => {
                setIsMenuOpen(false);
                openSettings("shortcuts");
              }}
              style={{ justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <HelpCircle size={16} style={{ color: "#D1D5DB" }} />
                <span>Help & User Manual</span>
              </div>
              <ChevronRight size={14} style={{ color: "#8E8E93" }} />
            </div>

            {/* Log out */}
            <div
              className="chatgpt-popover-item"
              onClick={handleLogout}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                <LogOut size={16} style={{ color: "#D1D5DB" }} />
                <span>Log out</span>
              </div>
            </div>
          </div>
        )}

        {/* User Bar Trigger */}
        <div
          className="user-profile-bar"
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "background 150ms ease",
            background: isMenuOpen ? "rgba(255, 255, 255, 0.08)" : "transparent",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#D97706",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                flexShrink: 0,
                letterSpacing: "0.5px",
                overflow: "hidden",
              }}
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#FFFFFF",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userProfile.name}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#8E8E93",
                  lineHeight: "1.2",
                }}
              >
                Free
              </span>
            </div>
          </div>

          <span className="user-chevron" style={{ color: "#8E8E93", display: "flex", alignItems: "center" }}>
            <ChevronRight size={16} />
          </span>
        </div>

        {/* Sidebar Utility Bar (Settings, User Manual, Theme) */}
        <div className="sidebar-utility-bar">
          <button
            type="button"
            className="sidebar-utility-btn"
            onClick={() => openSettings("general")}
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={14} />
          </button>
          <button
            type="button"
            className="sidebar-utility-btn"
            onClick={() => openSettings("shortcuts")}
            title="User Manual & Shortcuts"
            aria-label="User Manual & Shortcuts"
          >
            <BookOpen size={14} />
          </button>
          <button
            type="button"
            className="sidebar-utility-btn"
            onClick={toggleTheme}
            title={`Toggle Theme (${theme})`}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
