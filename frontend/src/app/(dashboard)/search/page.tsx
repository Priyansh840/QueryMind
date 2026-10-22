"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";
import { Search as SearchIcon, FileText, Upload, Sparkles } from "lucide-react";

interface BackendSearchResultItem {
  id: string;
  type: string;
  title: string;
  snippet?: string;
  score?: number;
  space_id: string;
  created_at?: string;
  metadata?: Record<string, any>;
  href: string;
}

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeObject[]>([]);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const recentObjects = useMyndStore((state) => state.recentObjects);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  // Debounced search to unified backend
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let typeParam: string | undefined = undefined;
        if (activeTab === "documents") typeParam = "document,knowledge";
        if (activeTab === "notes") typeParam = "memory,conversation";

        const data = await queryMindApi.search(
          searchQuery,
          activeSpaceId && activeSpaceId !== "all" ? activeSpaceId : undefined,
          typeParam
        );

        if (data?.results && data.results.length > 0) {
          const mapped: KnowledgeObject[] = data.results.map((r: BackendSearchResultItem) => {
            const friendlyType =
              r.type === "knowledge"
                ? "Document Section"
                : r.type === "document"
                ? "Document"
                : r.type === "conversation"
                ? "Chat Note"
                : r.type === "memory"
                ? "Saved Note"
                : r.type === "decision"
                ? "Action Item"
                : r.type;

            const percentage = r.score ? Math.min(100, Math.round(r.score * 100)) : 85;

            return {
              id: r.id,
              title: r.title,
              type: friendlyType,
              badge: `${percentage}% match`,
              meta: r.type === "knowledge" ? "Relevant section from your document" : `Type: ${friendlyType}`,
              summary: r.snippet || "",
              content: r.snippet || "",
            };
          });
          setSearchResults(mapped);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn("Search fetch error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, activeSpaceId]);

  // Fallback to local store when search query is empty
  const localMatching = recentObjects.filter(
    (r) =>
      !searchQuery.trim() ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.summary && r.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayedResults = searchQuery.trim() ? searchResults : localMatching;

  return (
    <div className="search-view-container stagger" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Search Input Filter Bar */}
      <div className="search-filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div className="search-tabs" style={{ display: "flex", gap: "8px" }}>
          {["all", "documents", "notes", "spaces"].map((tab) => (
            <button
              key={tab}
              className={`search-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "20px",
                border: "1px solid var(--border)",
                background: activeTab === tab ? "var(--accent-soft)" : "var(--surface)",
                color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <SearchIcon className="w-4 h-4 text-gray-400" style={{ position: "absolute", left: "12px" }} />
          <input
            type="text"
            placeholder="Search across your documents and notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="kbd"
            style={{
              width: "320px",
              padding: "8px 14px 8px 36px",
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              fontSize: "13px",
            }}
          />
        </div>
      </div>

      {/* Top Results */}
      <div className="search-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 className="search-section-title" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            {searchResults.length > 0
              ? `Top Matches (${searchResults.length})`
              : searchQuery.trim()
              ? `Search Results (${displayedResults.length})`
              : `Saved Documents (${displayedResults.length})`}
          </h2>
          {isSearching && (
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
              Searching your files…
            </span>
          )}
        </div>

        {displayedResults.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              background: "var(--surface)",
              borderRadius: "12px",
              border: "1px dashed var(--border-strong)",
            }}
          >
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
              {searchQuery.trim() ? "No matching results found" : "No documents yet"}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", marginBottom: "16px" }}>
              {searchQuery.trim()
                ? "Try searching for different keywords or upload relevant files."
                : "Upload PDF or text documents to start searching your files."}
            </p>
            <Link
              href="/vault"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#FFFFFF",
                color: "#000000",
                border: "none",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Go to Documents</span>
            </Link>
          </div>
        ) : (
          <div className="search-results-box" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {displayedResults.map((item, i) => (
              <div
                key={item.id}
                className="search-result-item"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  padding: "16px 20px",
                  borderBottom: i < displayedResults.length - 1 ? "1px solid var(--divider)" : "none",
                  cursor: "pointer",
                  transition: "background 100ms ease",
                }}
                onClick={() => openObjectModal(item)}
              >
                <div
                  className="sr-icon"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: "var(--surface-subtle)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText className="w-4 h-4" />
                </div>

                <div className="sr-main" style={{ flex: 1 }}>
                  <div className="sr-title-row" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="sr-title" style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                      {item.title}
                    </span>
                    <span className="kbd" style={{ fontSize: "10px", background: "var(--accent-soft)", color: "var(--accent)", border: "none" }}>
                      {item.badge || item.type}
                    </span>
                  </div>
                  <div className="sr-meta" style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                    {item.meta || `${item.type} • ${item.updated || "Indexed"}`}
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px", lineHeight: "1.45" }}>
                    {item.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
