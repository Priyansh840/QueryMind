"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import { Search as SearchIcon, FileText, Upload, Sparkles } from "lucide-react";

interface VectorSearchResult {
  score?: number;
  payload?: {
    content?: string;
    document_title?: string;
    page_number?: number;
    chunk_index?: number;
  };
}

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [vectorResults, setVectorResults] = useState<KnowledgeObject[]>([]);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const recentObjects = useMyndStore((state) => state.recentObjects);

  // Debounced search to Qdrant backend
  useEffect(() => {
    if (!searchQuery.trim()) {
      setVectorResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/test/search?query=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const mapped: KnowledgeObject[] = data.results.map((r: VectorSearchResult, idx: number) => ({
              id: `vec-${idx}`,
              title: r.payload?.document_title || `Vector Match ${idx + 1}`,
              type: "Qdrant Chunk",
              badge: `${Math.round((r.score || 0.85) * 100)}% match`,
              meta: `Page ${r.payload?.page_number || 1} • Chunk ${r.payload?.chunk_index || 0}`,
              summary: r.payload?.content || "",
              content: r.payload?.content || "",
            }));
            setVectorResults(mapped);
          } else {
            setVectorResults([]);
          }
        }
      } catch {
        // Fallback gracefully
        setVectorResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Combine real uploaded documents with Qdrant vector matches
  const localMatching = recentObjects.filter(
    (r) =>
      !searchQuery.trim() ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.summary && r.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayedResults = vectorResults.length > 0 ? vectorResults : localMatching;

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
            placeholder="Search knowledge or ask Qdrant…"
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
            {vectorResults.length > 0
              ? `Qdrant Vector Matches (${vectorResults.length})`
              : searchQuery.trim()
              ? `Search Results (${displayedResults.length})`
              : `Indexed Workspace Items (${displayedResults.length})`}
          </h2>
          {isSearching && (
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
              Searching vector store…
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
              {searchQuery.trim() ? "No matching results found" : "No indexed documents yet"}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", marginBottom: "16px" }}>
              {searchQuery.trim()
                ? "Try searching for different keywords or upload relevant documents."
                : "Upload PDF or text documents to start searching your knowledge base."}
            </p>
            <Link
              href="/vault"
              className="kbd"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "var(--accent)",
                color: "#FFF",
                border: "none",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Go to Knowledge Vault</span>
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
