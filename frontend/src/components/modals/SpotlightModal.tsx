"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMyndStore } from "@/lib/mynd-store";

export default function SpotlightModal() {
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
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSpotlightOpen]);

  if (!isSpotlightOpen) return null;

  // Build items list based on query
  const q = query.toLowerCase().trim();

  const commands = [
    { id: "cmd-home", title: "Go to Home", type: "Navigation", action: () => setRoute("home") },
    { id: "cmd-workspace", title: "View Workspace (All Spaces)", type: "Navigation", action: () => setRoute("workspace") },
    { id: "cmd-intelligence", title: "View Intelligence & Activity", type: "Navigation", action: () => setRoute("intelligence") },
    { id: "cmd-search", title: "Semantic Search", type: "Search", action: () => setRoute("search") },
    { id: "cmd-theme", title: "Toggle Theme (Light / Dark / Zen)", type: "Action", action: () => toggleTheme() },
    { id: "cmd-focus", title: "Toggle Focus Mode", type: "Action", action: () => toggleFocusMode() },
  ];

  const matchedSpaces = spaces
    .filter((s) => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    .map((s) => ({
      id: `space-${s.id}`,
      title: s.name,
      badge: `${s.count} objects`,
      type: "Space",
      color: s.color || "#8B5CF6",
      action: () => {
        selectSpace(s.id);
        closeSpotlight();
      },
    }));

  const matchedObjects = recentObjects
    .filter((obj) => obj.title.toLowerCase().includes(q) || (obj.summary && obj.summary.toLowerCase().includes(q)))
    .map((obj) => ({
      id: obj.id,
      title: obj.title,
      badge: obj.type,
      type: "Object",
      color: "#3B82F6",
      action: () => {
        openObjectModal(obj);
        closeSpotlight();
      },
    }));

  const matchedCommands = commands
    .filter((c) => c.title.toLowerCase().includes(q))
    .map((c) => ({
      id: c.id,
      title: c.title,
      badge: c.type,
      type: "Command",
      color: "#10B981",
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
                key={item.id}
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
                  <span className="space-dot" style={{ background: item.color }} />
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
