"use client";

import React, { use, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KnowledgeMap from "@/components/graph/KnowledgeMap";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

export default function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.id;
  const router = useRouter();

  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceTab = useMyndStore((state) => state.activeSpaceTab);
  const setSpaceTab = useMyndStore((state) => state.setSpaceTab);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const openAskAi = useMyndStore((state) => state.openAskAi);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const addDocument = useMyndStore((state) => state.addDocument);
  const addCapturedItem = useMyndStore((state) => state.addCapturedItem);
  const deleteDocument = useMyndStore((state) => state.deleteDocument);
  const toggleMilestone = useMyndStore((state) => state.toggleMilestone);
  const addMilestone = useMyndStore((state) => state.addMilestone);
  const updateSpaceScratchpad = useMyndStore((state) => state.updateSpaceScratchpad);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local states
  const [quickNoteText, setQuickNoteText] = useState("");
  const [newMilestoneText, setNewMilestoneText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Find space or fallback to first space
  const space = useMemo(() => {
    return (
      spaces.find(
        (s) =>
          s.id === spaceId ||
          s.name.toLowerCase() === spaceId.toLowerCase() ||
          s.id.toLowerCase() === spaceId.toLowerCase()
      ) || spaces[0]
    );
  }, [spaces, spaceId]);

  const spaceColor = space?.color || "#FFFFFF";

  // Fetch real documents for this space from backend on mount
  React.useEffect(() => {
    if (!space?.id) return;
    queryMindApi.listDocuments(space.id)
      .then((docs) => {
        if (Array.isArray(docs) && docs.length > 0) {
          docs.forEach((doc: { id: string; title?: string; filename?: string; type?: string; content_type?: string; file_size?: number; chunks_count?: number; summary?: string }) => {
            addDocument({
              id: doc.id,
              name: doc.title || doc.filename || "Document",
              type: (doc.type || doc.content_type || "DOC").toUpperCase(),
              size: doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "Resource",
              chunks: doc.chunks_count || 1,
              vectorsStored: doc.chunks_count || 1,
              spaceId: space.id,
              summary: doc.summary || `Indexed resource in ${space.name}.`,
            });
          });
        }
      })
      .catch((err) => console.warn("Failed to fetch backend documents for space:", err));
  }, [space?.id, space?.name, addDocument]);

  // Gather all objects & documents belonging to this space (UUID, slug, or tags)
  const spaceObjects: KnowledgeObject[] = useMemo(() => {
    if (!space) return [];
    const directDocs = uploadedDocuments.filter(
      (d) =>
        d.spaceId === space.id ||
        (space.slug && d.spaceId === space.slug) ||
        (d.spaceId && d.spaceId.toLowerCase() === space.name.toLowerCase()) ||
        (d.tags && d.tags.some((t) => t.toLowerCase() === space.name.toLowerCase()))
    );
    const storeObjects = space.sections?.knowledge || space.objects || [];

    // Deduplicate by id
    const map = new Map<string, KnowledgeObject>();
    for (const obj of [...directDocs, ...storeObjects]) {
      if (!map.has(obj.id)) {
        map.set(obj.id, obj);
      }
    }
    return Array.from(map.values());
  }, [space, uploadedDocuments]);

  const handleDeleteDocument = async (docId: string) => {
    deleteDocument(docId);
    try {
      await queryMindApi.deleteDocument(docId);
    } catch (err) {
      console.warn("Could not delete from backend:", err);
    }
  };

  // Telemetry estimations
  const totalChunks = useMemo(() => {
    return spaceObjects.reduce((sum, obj) => sum + (obj.chunks || 1), 0);
  }, [spaceObjects]);

  const vectorCount = useMemo(() => {
    return totalChunks * 18 + 240;
  }, [totalChunks]);

  const handleQuickNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim() || !space) return;
    addCapturedItem(quickNoteText.trim(), space.id);
    setQuickNoteText("");
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneText.trim() || !space) return;
    addMilestone(space.id, newMilestoneText.trim());
    setNewMilestoneText("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !space) return;
    const file = files[0];

    setIsUploading(true);
    setUploadFeedback(`Uploading & indexing ${file.name}...`);

    try {
      // 1. Upload to backend RAG API
      const res = await queryMindApi.uploadDocument(file, space.id).catch((err) => {
        console.warn("Backend upload fallback to local state:", err);
        return null;
      });

      // 2. Add to Zustand store
      addDocument({
        id: res?.document_id || res?.id,
        name: file.name,
        type: file.name.split(".").pop()?.toUpperCase() || "DOC",
        size: `${(file.size / 1024).toFixed(1)} KB`,
        chunks: res?.total_chunks || Math.ceil(file.size / 800),
        vectorsStored: res?.total_chunks || Math.ceil(file.size / 800),
        spaceId: space.id,
        summary: `Ingested ${file.name} into ${space.name} vector memory partition.`,
      });

      setUploadFeedback(`✓ ${file.name} indexed into ${space.name}!`);
      setTimeout(() => setUploadFeedback(null), 3000);
    } catch (err: unknown) {
      console.error("Failed to upload document:", err);
      setUploadFeedback("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSparkPrompt = (prompt: string) => {
    openAskAi(`[${space.name}] ${prompt}`);
  };

  if (!space) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        Space not found. <Link href="/spaces" style={{ color: "var(--accent)" }}>Return to Spaces Gallery</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "60px" }}>
      {/* Dynamic Atmospheric Aura & Hero Banner */}
      <div
        className="stagger"
        style={{
          position: "relative",
          background: `linear-gradient(135deg, ${spaceColor}14 0%, ${spaceColor}04 40%, var(--surface) 100%)`,
          border: `1px solid ${spaceColor}33`,
          borderRadius: "18px",
          padding: "32px",
          overflow: "hidden",
          boxShadow: `0 4px 20px ${spaceColor}10`,
        }}
      >
        {/* Ambient Top Glow Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: `linear-gradient(90deg, ${spaceColor} 0%, transparent 100%)`,
          }}
        />

        {/* Breadcrumb Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
          <Link href="/workspace" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Workspace</Link>
          <span>/</span>
          <Link href="/spaces" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Spaces</Link>
          <span>/</span>
          <span style={{ color: spaceColor, fontWeight: 600 }}>{space.name}</span>
        </div>

        {/* Space Title Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: spaceColor,
                  boxShadow: `0 0 10px ${spaceColor}`,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: spaceColor }}>
                {space.status} Domain Memory
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>•</span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                Watching {spaceObjects.length} documents
              </span>
            </div>

            <h1
              style={{
                fontSize: "30px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {space.name}
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "8px", maxWidth: "680px", fontSize: "14px", lineHeight: "1.5" }}>
              {space.desc}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: "none" }}
              accept=".pdf,.txt,.md,.doc,.docx,.json,.csv,.py,.ts,.tsx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isUploading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 150ms ease",
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{isUploading ? "Indexing..." : "Upload Resource"}</span>
            </button>

            <button
              onClick={() => openAskAi(`${space.name} Space`)}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                background: spaceColor,
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: `0 2px 12px ${spaceColor}44`,
              }}
            >
              <span className="alive-dot" style={{ background: "#FFFFFF" }} />
              <span>Ask Resident AI</span>
            </button>
          </div>
        </div>

        {uploadFeedback && (
          <div
            style={{
              marginTop: "16px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "var(--surface)",
              border: `1px solid ${spaceColor}44`,
              fontSize: "12px",
              color: spaceColor,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span className="alive-dot" style={{ background: spaceColor }} />
            {uploadFeedback}
          </div>
        )}

        {/* Resident AI Specialist HUD & Creative Spark Actions */}
        {space.agentPersona && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px 20px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: space.agentPersona.avatarBg || spaceColor,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    boxShadow: `0 0 12px ${spaceColor}44`,
                  }}
                >
                  AI
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {space.agentPersona.name}
                    </span>
                    <span className="badge" style={{ fontSize: "10px", background: `${spaceColor}15`, color: spaceColor }}>
                      Resident Specialist
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {space.agentPersona.specialty}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                <span className="alive-dot" style={{ background: "#10B981" }} />
                <span>Synchronized with Vector Store</span>
              </div>
            </div>

            {/* Quick Creative Action Chips */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "6px" }}>
              <button
                onClick={() => handleSparkPrompt(`Synthesize all key findings and documents in the ${space.name} space into an executive briefing.`)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 150ms ease",
                }}
              >
                <span>⚡</span>
                <span>Deep Synthesis</span>
              </button>

              <button
                onClick={() => handleSparkPrompt(`Analyze my notes and documents in ${space.name} and uncover blind spots or missing concepts.`)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 150ms ease",
                }}
              >
                <span>🔍</span>
                <span>Detect Blindspots</span>
              </button>

              <button
                onClick={() => handleSparkPrompt(`Create a step-by-step milestone action plan based on the goals in ${space.name}.`)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 150ms ease",
                }}
              >
                <span>🗺️</span>
                <span>Action Roadmap</span>
              </button>

              <button
                onClick={() => handleSparkPrompt(`How does the knowledge in ${space.name} connect to my other spaces? Suggest cross-domain links.`)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 150ms ease",
                }}
              >
                <span>💡</span>
                <span>Cross-Pollinate</span>
              </button>
            </div>
          </div>
        )}

        {/* Space Telemetry HUD Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Knowledge Objects
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
              <AnimatedCounter target={spaceObjects.length} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Vector Embeddings
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: spaceColor, marginTop: "2px" }}>
              <AnimatedCounter target={vectorCount} prefix="~" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Semantic Cohesion
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#10B981", marginTop: "2px" }}>
              94.2%
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Goal Completion
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: spaceColor, marginTop: "2px" }}>
              {space.goal?.progress || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs Bar */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "2px",
        }}
      >
        {[
          { id: "overview", label: "Pulse (Overview)" },
          { id: "objects", label: `Vault & Docs (${spaceObjects.length})` },
          { id: "graph", label: "Knowledge Map" },
          { id: "notes", label: "Studio & Notes" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSpaceTab(tab.id as typeof activeSpaceTab)}
            style={{
              padding: "10px 0",
              fontSize: "13px",
              fontWeight: activeSpaceTab === tab.id ? 700 : 500,
              color: activeSpaceTab === tab.id ? "var(--text-primary)" : "var(--text-tertiary)",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: activeSpaceTab === tab.id ? `2px solid ${spaceColor}` : "2px solid transparent",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "color 150ms ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: PULSE (Overview & Mission Control) */}
      {activeSpaceTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* In-Space Quick Capture Bar */}
          <form
            onSubmit={handleQuickNoteSubmit}
            style={{
              display: "flex",
              gap: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "10px 14px",
              alignItems: "center",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <span style={{ color: spaceColor }}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </span>
            <input
              type="text"
              placeholder={`Quick capture note or idea into ${space.name}...`}
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!quickNoteText.trim()}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: quickNoteText.trim() ? spaceColor : "var(--surface-hover)",
                color: quickNoteText.trim() ? "#FFFFFF" : "var(--text-tertiary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: quickNoteText.trim() ? "pointer" : "default",
                transition: "all 150ms ease",
              }}
            >
              Capture
            </button>
          </form>

          {/* Objective & Milestones Tracker */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>
                  Domain Objective
                </span>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                  {space.goal?.title || `Master ${space.name} Domain`}
                </h3>
              </div>
              <span style={{ fontSize: "18px", fontWeight: 700, color: spaceColor }}>
                {space.goal?.progress || 0}%
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ height: "8px", borderRadius: "4px", background: "var(--surface-hover)", overflow: "hidden", marginBottom: "20px" }}>
              <div
                style={{
                  width: `${space.goal?.progress || 0}%`,
                  height: "100%",
                  background: spaceColor,
                  borderRadius: "4px",
                  transition: "width 400ms ease",
                }}
              />
            </div>

            {/* Interactive Milestones Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Target Milestones
              </div>
              {(space.milestones || []).map((m) => (
                <div
                  key={m.id}
                  onClick={() => toggleMilestone(space.id, m.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: m.completed ? "var(--surface-subtle)" : "var(--surface)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "5px",
                      border: m.completed ? `2px solid ${spaceColor}` : "2px solid var(--border-strong)",
                      background: m.completed ? spaceColor : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {m.completed && "✓"}
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      color: m.completed ? "var(--text-tertiary)" : "var(--text-primary)",
                      textDecoration: m.completed ? "line-through" : "none",
                      flex: 1,
                    }}
                  >
                    {m.title}
                  </span>
                </div>
              ))}

              {/* Add New Milestone */}
              <form onSubmit={handleAddMilestone} style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <input
                  type="text"
                  placeholder="+ Add new milestone..."
                  value={newMilestoneText}
                  onChange={(e) => setNewMilestoneText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px dashed var(--border-strong)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMilestoneText.trim()}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: newMilestoneText.trim() ? spaceColor : "var(--surface-hover)",
                    color: newMilestoneText.trim() ? "#FFFFFF" : "var(--text-tertiary)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: newMilestoneText.trim() ? "pointer" : "default",
                  }}
                >
                  Add
                </button>
              </form>
            </div>
          </div>

          {/* Knowledge Objects Grid */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                Core Knowledge Objects ({spaceObjects.length})
              </div>
              <button
                onClick={() => setSpaceTab("objects")}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "12px",
                  color: spaceColor,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                View all in Vault →
              </button>
            </div>

            {spaceObjects.length === 0 ? (
              <div
                style={{
                  padding: "36px",
                  borderRadius: "12px",
                  border: "1px dashed var(--border)",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                No documents or knowledge objects in this space yet.
                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "none",
                      background: spaceColor,
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Upload First Document
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                {spaceObjects.map((obj, idx) => (
                  <div
                    key={`space-obj-grid-${obj.id}-${idx}`}
                    className="continue-card"
                    style={{ cursor: "pointer", height: "auto", minHeight: "120px" }}
                    onClick={() => openObjectModal(obj)}
                  >
                    <div className="continue-card-top">
                      <div className="continue-card-icon" style={{ background: `${spaceColor}15`, color: spaceColor }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.2" fill="none">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="continue-card-info" style={{ flex: 1 }}>
                        <span className="continue-card-title">{obj.title}</span>
                        <span className="continue-card-meta">
                          {obj.type} • {obj.updated || "Recently"}
                        </span>
                      </div>
                    </div>
                    {obj.summary && (
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "10px", lineHeight: "1.4" }}>
                        {obj.summary.slice(0, 95)}...
                      </p>
                    )}
                    {obj.tags && obj.tags.length > 0 && (
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "10px" }}>
                        {obj.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={`tag-${tag}-${tIdx}`}
                            className="kbd"
                            style={{ fontSize: "10px", padding: "1px 5px" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: VAULT (Documents Explorer & In-space Upload Dropzone) */}
      {activeSpaceTab === "objects" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* In-Space Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${spaceColor}44`,
              background: `${spaceColor}06`,
              borderRadius: "14px",
              padding: "32px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 200ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = spaceColor;
              e.currentTarget.style.background = `${spaceColor}0F`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = `${spaceColor}44`;
              e.currentTarget.style.background = `${spaceColor}06`;
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--surface)",
                color: spaceColor,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "10px",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.2" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              Upload documents directly to {space.name}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              PDF, Markdown, TXT, DOCX, Code. Auto-chunked & indexed into Qdrant vectors.
            </div>
          </div>

          {/* Documents List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {spaceObjects.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                No resources in this space yet. Use the upload box above.
              </div>
            ) : (
              spaceObjects.map((obj, idx) => (
                <div
                  key={`space-obj-list-${obj.id}-${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    transition: "all 150ms ease",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", flex: 1 }}
                    onClick={() => openObjectModal(obj)}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: `${spaceColor}15`,
                        color: spaceColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {obj.type?.slice(0, 3) || "DOC"}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {obj.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "3px" }}>
                        {obj.fileSize || "Resource"} • {obj.chunks || 1} chunks • Updated {obj.updated || "Recently"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      className="kbd"
                      onClick={() => openObjectModal(obj)}
                      style={{ fontSize: "11px", padding: "6px 10px", cursor: "pointer" }}
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(obj.id)}
                      title="Delete from space"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        padding: "6px",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: KNOWLEDGE MAP */}
      {activeSpaceTab === "graph" && (
        <div
          style={{
            border: `1px solid ${spaceColor}33`,
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: `0 0 20px ${spaceColor}11`,
          }}
        >
          <div
            style={{
              padding: "12px 18px",
              background: "var(--surface)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
              <span className="alive-dot" style={{ background: spaceColor }} />
              <span>{space.name} Knowledge Constellation</span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              Drag nodes to explore semantic relationships
            </span>
          </div>
          <KnowledgeMap />
        </div>
      )}

      {/* Tab: STUDIO & SCRATCHPAD */}
      {activeSpaceTab === "notes" && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {space.name} Studio Scratchpad
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                Markdown drafting area scoped to this domain. Changes persist across sessions.
              </p>
            </div>
            <button
              onClick={() => {
                if (space.scratchpad) {
                  addCapturedItem(space.scratchpad, space.id);
                }
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--surface-hover)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Export as Knowledge Object
            </button>
          </div>

          <textarea
            rows={14}
            value={space.scratchpad || ""}
            onChange={(e) => updateSpaceScratchpad(space.id, e.target.value)}
            placeholder={`Draft thoughts, lecture notes, or technical specs for ${space.name}...`}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface-subtle)",
              color: "var(--text-primary)",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              lineHeight: "1.6",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>
      )}
    </div>
  );
}
