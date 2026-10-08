"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Boxes,
  Target,
  Lightbulb,
  Brain,
  Settings,
  ChevronDown,
  Plus,
  LogOut,
  Folder,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { supabase } from "@/lib/supabase";
import { authApi } from "@/lib/api";

const PRIMARY_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat & Reasoning", icon: MessageSquare },
  { href: "/vault", label: "Documents", icon: FileText },
  { href: "/spaces", label: "Spaces", icon: Boxes },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/intelligence", label: "Intelligence", icon: Lightbulb },
  { href: "/memory", label: "Memory", icon: Brain },
];

export default function CleanSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const userProfile = useMyndStore((state) => state.userProfile);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    useMyndStore.getState().clearAllData();
    try {
      await supabase.auth.signOut();
    } catch {}
    authApi.logout();
    router.push("/login");
  };

  return (
    <aside
      style={{
        width: "250px",
        height: "100vh",
        background: "var(--surface-primary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        userSelect: "none",
        zIndex: 40,
      }}
    >
      {/* Top Header / Brand */}
      <div style={{ padding: "18px 20px 12px 20px" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "var(--text-primary)",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "15px",
              color: "#FFFFFF",
              boxShadow: "0 2px 10px rgba(99, 102, 241, 0.35)",
            }}
          >
            Q
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "15px", letterSpacing: "-0.01em" }}>QueryMind</div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "-1px" }}>Workspace v2</div>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 10px" }}>
          Workspace
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: active ? 600 : 500,
                  textDecoration: "none",
                  color: active ? "#818cf8" : "var(--text-secondary)",
                  background: active ? "rgba(99, 102, 241, 0.12)" : "transparent",
                  border: active ? "1px solid rgba(99, 102, 241, 0.28)" : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
                className={!active ? "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" : ""}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spaces Section */}
        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Spaces
            </span>
            <Link
              href="/spaces"
              style={{
                fontSize: "11px",
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View All ({spaces.length})
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
            {spaces.slice(0, 4).map((s) => {
              const isSelected = activeSpaceId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSpace(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    textAlign: "left",
                    color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                    background: isSelected ? "var(--accent-soft)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                    transition: "all 0.15s ease",
                  }}
                  className={!isSelected ? "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" : ""}
                >
                  <Folder size={14} style={{ color: s.color || "var(--accent)" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Profile & Settings */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--border-subtle)",
          position: "relative",
        }}
      >
        <div
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            borderRadius: "8px",
            cursor: "pointer",
            background: isUserMenuOpen ? "var(--surface-hover)" : "transparent",
          }}
          className="hover:bg-[var(--surface-hover)]"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#6366f1",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {userProfile?.name ? userProfile.name.slice(0, 1).toUpperCase() : "U"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                {userProfile?.name || "Workspace User"}
              </div>
            </div>
          </div>
          <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
        </div>

        {/* User Menu Dropdown */}
        {isUserMenuOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "70px",
              left: "14px",
              right: "14px",
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-strong)",
              borderRadius: "10px",
              padding: "6px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              zIndex: 50,
            }}
          >
            <Link
              href="/settings"
              onClick={() => setIsUserMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--text-primary)",
                textDecoration: "none",
              }}
              className="hover:bg-[var(--surface-hover)]"
            >
              <Settings size={14} />
              <span>Settings</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#EF4444",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
              className="hover:bg-[rgba(239,68,68,0.1)]"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
