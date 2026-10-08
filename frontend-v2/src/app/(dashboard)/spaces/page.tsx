"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Plus,
  Folder,
  ArrowRight,
  Search,
  RefreshCw,
  FolderPlus,
  FileText,
  Target,
  CheckCircle,
  AlertCircle,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
];

export default function SpacesPage() {
  const router = useRouter();
  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceDesc, setNewSpaceDesc] = useState("");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRefreshSpaces = async () => {
    setIsRefreshing(true);
    try {
      const liveSpaces = await queryMindApi.getSpaces();
      if (Array.isArray(liveSpaces)) {
        useMyndStore.setState({
          spaces: liveSpaces.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug || s.name.toLowerCase().replace(/\s+/g, "-"),
            desc: s.description || "Workspace",
            count: 0,
            status: "synced" as const,
            color: s.color || "#6366f1",
            icon: s.icon || "folder",
            pinned: s.is_default || false,
            updated: "Just now",
          })),
        });
      }
    } catch (err: any) {
      console.warn("Failed to refresh spaces:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await queryMindApi.createSpace({
        name: newSpaceName.trim(),
        description: newSpaceDesc.trim() || undefined,
        color: selectedColor,
      });

      useMyndStore.getState().addSpace({
        id: created.id,
        name: created.name,
        desc: created.description || "Dedicated workspace",
        color: created.color || selectedColor,
        icon: created.icon || "folder",
      });

      setNewSpaceName("");
      setNewSpaceDesc("");
      setIsCreating(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create space");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered spaces by search
  const filteredSpaces = useMemo(() => {
    return spaces.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.desc && s.desc.toLowerCase().includes(q))
      );
    });
  }, [spaces, searchQuery]);

  // Aggregate telemetry
  const totalDocuments = uploadedDocuments.length;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px", width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Spaces Hub
            </h1>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(99, 102, 241, 0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              {spaces.length} Partitions
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "6px" }}>
            Isolated cognitive workspaces tailored for specific domains, technical projects, and career initiatives.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleRefreshSpaces}
            disabled={isRefreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            title="Sync spaces from database"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#6366f1",
              border: "1px solid #4f46e5",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
            }}
            className="hover:bg-[#4f46e5] active:scale-95"
          >
            <Plus size={15} />
            <span>New Space</span>
          </button>
        </div>
      </div>

      {/* Inline Create Space Drawer / Card */}
      {isCreating && (
        <form
          onSubmit={handleCreateSpace}
          style={{
            background: "var(--surface-primary)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "28px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <FolderPlus size={18} className="text-indigo-400" />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              Create Dedicated Domain Space
            </h3>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#EF4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Space Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Systems, Machine Learning, Product Strategy"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Description / Scope (Optional)
              </label>
              <input
                type="text"
                placeholder="Describe what documents and goals belong in this partition..."
                value={newSpaceDesc}
                onChange={(e) => setNewSpaceDesc(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            {/* Accent Color Picker */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "8px" }}>
                Accent Tag
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: col,
                      border: selectedColor === col ? "2px solid #FFFFFF" : "2px solid transparent",
                      cursor: "pointer",
                      transform: selectedColor === col ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.15s ease",
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                disabled={isSubmitting}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "#6366f1",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Create Space</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Control Bar: Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "8px 14px",
            minWidth: "260px",
            flex: 1,
            maxWidth: "400px",
          }}
        >
          <Search size={14} style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search spaces by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "13px",
              color: "var(--text-primary)",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Spaces Grid */}
      {filteredSpaces.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--surface-primary)",
            borderRadius: "14px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "var(--surface-secondary)",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
            }}
          >
            <Boxes size={20} />
          </div>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
            {searchQuery ? "No matching spaces found" : "No spaces configured"}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            {searchQuery ? "Try refining your search keyword." : "Create your first dedicated space above."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "18px",
          }}
        >
          {filteredSpaces.map((space) => {
            const spaceDocs = uploadedDocuments.filter((d) => d.spaceId === space.id);
            const docCount = spaceDocs.length;
            const isSelected = activeSpaceId === space.id;

            return (
              <div
                key={space.id}
                onClick={() => {
                  selectSpace(space.id);
                  router.push(`/spaces/${space.id}`);
                }}
                style={{
                  background: "var(--surface-primary)",
                  border: isSelected ? "1px solid rgba(99, 102, 241, 0.45)" : "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                  padding: "22px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: isSelected ? "0 4px 20px rgba(99, 102, 241, 0.1)" : "none",
                }}
                className="hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]"
              >
                <div>
                  {/* Space Card Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "10px",
                          background: `${space.color || "#6366f1"}1A`,
                          color: space.color || "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `1px solid ${space.color || "#6366f1"}33`,
                        }}
                      >
                        <Folder size={18} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {space.name}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                          <span>{docCount} {docCount === 1 ? "document" : "documents"}</span>
                          <span>•</span>
                          <span style={{ color: "#10B981" }}>Active</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: "rgba(99, 102, 241, 0.15)",
                          color: "var(--accent)",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                        }}
                      >
                        Active Space
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: "16px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {space.desc || "Dedicated domain workspace."}
                  </p>
                </div>

                {/* Footer action */}
                <div
                  style={{
                    paddingTop: "14px",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Enter Space
                  </span>
                  <ChevronRight size={15} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
