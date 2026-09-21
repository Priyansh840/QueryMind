"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMyndStore } from "@/lib/mynd-store";

export default function SpotlightModal() {
  const router = useRouter();
  const isSpotlightOpen = useMyndStore((state) => state.isSpotlightOpen);
  const closeSpotlight = useMyndStore((state) => state.closeSpotlight);
  const spaces = useMyndStore((state) => state.spaces);
  const recentObjects = useMyndStore((state) => state.recentObjects);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const setRoute = useMyndStore((state) => state.setRoute);
  const toggleTheme = useMyndStore((state) => state.toggleTheme);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSpotlightOpen) {
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isSpotlightOpen]);

  if (!isSpotlightOpen) return null;

  // Build items list based on query
  const q = query.toLowerCase().trim();

  const commands = [
    { id: "cmd-home", title: "Go to Home", type: "Navigation", action: () => { setRoute("home"); router.push("/dashboard"); } },
    { id: "cmd-goals", title: "Go to Strategic Goals & Objectives", type: "Navigation", action: () => { setRoute("goals"); router.push("/goals"); } },
    { id: "cmd-workspace", title: "View Workspace (All Spaces)", type: "Navigation", action: () => { setRoute("workspace"); router.push("/workspace"); } },
    { id: "cmd-vault", title: "View Documents & Vault", type: "Navigation", action: () => { setRoute("vault"); router.push("/vault"); } },
    { id: "cmd-chat", title: "Open AI Intelligence Chat", type: "Navigation", action: () => { setRoute("chat"); router.push("/chat"); } },
    { id: "cmd-intelligence", title: "View Intelligence & Activity", type: "Navigation", action: () => { setRoute("intelligence"); router.push("/activity"); } },
    { id: "cmd-search", title: "Semantic Search", type: "Search", action: () => setRoute("search") },
    { id: "cmd-theme", title: "Toggle Theme (Light / Dark / Zen)", type: "Action", action: () => toggleTheme() },
    { id: "cmd-focus", title: "Toggle Focus Mode", type: "Action", action: () => toggleFocusMode() },
  ];

  const matchedSpaces = spaces
    .filter((s) => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    .map((s, idx) => ({
      id: `space-${s.id}-${idx}`,
      title: s.name,
      badge: `${s.count} objects`,
      type: "Space",
      color: s.color || "#FFFFFF",
      action: () => {
        selectSpace(s.id);
        closeSpotlight();
      },
    }));

  const matchedObjects = recentObjects
    .filter((obj) => obj.title.toLowerCase().includes(q) || (obj.summary && obj.summary.toLowerCase().includes(q)))
    .map((obj, idx) => ({
      id: `obj-${obj.id}-${idx}`,
      title: obj.title,
      badge: obj.type,
      type: "Object",
      color: "#D4D4D4",
      action: () => {
        openObjectModal(obj);
        closeSpotlight();
      },
    }));

  const matchedCommands = commands
    .filter((c) => c.title.toLowerCase().includes(q))
    .map((c, idx) => ({
      id: `cmd-${c.id}-${idx}`,
      title: c.title,
      badge: c.type,
      type: "Command",
      color: "#FFFFFF",
      action: () => {
        c.action();
        closeSpotlight();
      },
    }));

  const allResults = [...matchedSpaces, ...matchedObjects, ...matchedCommands];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closeSpotlight();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((idx) => (allResults.length > 0 ? (idx + 1) % allResults.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((idx) => (allResults.length > 0 ? (idx - 1 + allResults.length) % allResults.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        allResults[selectedIndex].action();
      }
    }
  };

  return (
    <div
      className="spotlight-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSpotlight();
      }}
      style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }}
    >
      <div className="spotlight-box" style={{ maxWidth: "600px", width: "90%" }}>
        <div className="spotlight-header">
          <span className="spotlight-prompt">›</span>
          <input
            ref={inputRef}
            type="text"
            className="spotlight-input"
            placeholder="Search objects, spaces, or type a command…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="kbd" onClick={closeSpotlight} style={{ cursor: "pointer" }}>
            ESC
          </span>
        </div>

        <div className="spotlight-results" style={{ maxHeight: "360px", overflowY: "auto", padding: "8px" }}>
          {allResults.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
              No matching objects or commands found.
            </div>
          ) : (
            allResults.map((item, idx) => (
              <div
                key={`spotlight-res-${item.id}-${idx}`}
                className={`spotlight-item ${idx === selectedIndex ? "highlighted" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: idx === selectedIndex ? "var(--surface-hover)" : "transparent",
                  transition: "background 100ms ease",
                }}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="space-dot" style={{ background: "#FFFFFF", width: "8px", height: "8px" }} />
                  <span style={{ fontSize: "13px", fontWeight: idx === selectedIndex ? "600" : "500", color: "var(--text-primary)" }}>
                    {item.title}
                  </span>
                </div>
                <span className="kbd" style={{ fontSize: "11px" }}>
                  {item.badge}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="spotlight-footer">
          <span>
            Navigate <span className="kbd">↑</span>
            <span className="kbd">↓</span>
          </span>
          <span>
            Open <span className="kbd">↵</span>
          </span>
          <span>
            Close <span className="kbd">ESC</span>
          </span>
        </div>
      </div>
    </div>
  );
}
