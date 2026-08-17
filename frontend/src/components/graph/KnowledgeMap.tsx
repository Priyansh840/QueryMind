"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useMyndStore, KnowledgeObject } from "@/lib/mynd-store";
import { Sparkles, Plus, FileText, Upload, Maximize2, ZoomIn, ZoomOut } from "lucide-react";

interface NodePosition {
  id: string;
  label: string;
  spaceId: string;
  x: number;
  y: number;
  color: string;
  type: string;
  rawObj?: KnowledgeObject;
}

export default function KnowledgeMap() {
  const selectSpace = useMyndStore((state) => state.selectSpace);
  const addCapturedItem = useMyndStore((state) => state.addCapturedItem);
  const openObjectModal = useMyndStore((state) => state.openObjectModal);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const recentObjects = useMyndStore((state) => state.recentObjects);
  const spaces = useMyndStore((state) => state.spaces);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [captureText, setCaptureText] = useState("");

  const [hubPos, setHubPos] = useState({ x: 300, y: 180 });
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const draggingNodeRef = useRef<string | null>(null);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Generate dynamic nodes based on user's real uploaded items & spaces
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = (rect.width || 600) / 2;
    const cy = (rect.height || 360) / 2;

    setHubPos({ x: cx, y: cy });

    // Collect all real objects from spaces and recent uploads
    const activeObjects = recentObjects.slice(0, 8);
    const colorPalette = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4"];

    if (activeObjects.length > 0) {
      // Position nodes radially around the central hub
      const dynamicNodes: NodePosition[] = activeObjects.map((obj, idx) => {
        const total = activeObjects.length;
        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
        const radius = 140 + (idx % 2) * 30;
        return {
          id: obj.id,
          label: obj.title.length > 22 ? obj.title.substring(0, 20) + "…" : obj.title,
          spaceId: obj.spaceId || "general",
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          color: colorPalette[idx % colorPalette.length],
          type: obj.type,
          rawObj: obj,
        };
      });
      setNodes(dynamicNodes);
    } else {
      // If no documents uploaded yet, show active spaces as branches
      const spaceNodes: NodePosition[] = spaces.map((s, idx) => {
        const total = spaces.length;
        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
        const radius = 130;
        return {
          id: s.id,
          label: s.name,
          spaceId: s.id,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          color: s.color || "#8B5CF6",
          type: "Space",
        };
      });
      setNodes(spaceNodes);
    }
  }, [recentObjects, spaces]);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    draggingNodeRef.current = id;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (id === "hub") {
      dragStartOffset.current = { x: clientX - hubPos.x, y: clientY - hubPos.y };
    } else {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        dragStartOffset.current = { x: clientX - node.x, y: clientY - node.y };
      }
    }
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingNodeRef.current) return;
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (draggingNodeRef.current === "hub") {
        setHubPos({
          x: clientX - dragStartOffset.current.x,
          y: clientY - dragStartOffset.current.y,
        });
      } else {
        const nodeId = draggingNodeRef.current;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  x: clientX - dragStartOffset.current.x,
                  y: clientY - dragStartOffset.current.y,
                }
              : n
          )
        );
      }
    },
    []
  );

  const handlePointerUp = () => {
    draggingNodeRef.current = null;
  };

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim()) return;
    addCapturedItem(captureText);
    setCaptureText("");
  };

  // Helper to compute SVG bezier curve
  const renderPath = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 15;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  };

  return (
    <div
      ref={containerRef}
      className="map-canvas-viewport"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "relative",
        height: "380px",
        background: "var(--canvas-bg)",
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        userSelect: "none",
        cursor: draggingNodeRef.current ? "grabbing" : "default",
      }}
    >
      {/* Dynamic SVG Connection Lines */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <defs>
          <linearGradient id="grad-pulse" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {nodes.map((node) => (
          <path
            key={`edge-${node.id}`}
            d={renderPath(hubPos.x, hubPos.y, node.x, node.y)}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            strokeDasharray={node.type === "Space" ? "4,4" : "none"}
            fill="none"
            opacity="0.8"
          />
        ))}
      </svg>

      {/* Central Knowledge Hub */}
      <div
        onPointerDown={(e) => handlePointerDown("hub", e)}
        style={{
          position: "absolute",
          left: `${hubPos.x}px`,
          top: `${hubPos.y}px`,
          transform: `translate(-50%, -50%) scale(${zoom})`,
          zIndex: 10,
          background: "var(--surface)",
          border: "2px solid var(--accent)",
          boxShadow: "var(--shadow-md), 0 0 20px rgba(139, 92, 246, 0.15)",
          borderRadius: "30px",
          padding: "8px 18px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "grab",
          transition: "transform 100ms ease",
        }}
      >
        <span className="alive-dot" />
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
          QueryMind Core
        </span>
        <span className="kbd" style={{ fontSize: "10px", background: "var(--accent-soft)", color: "var(--accent)", border: "none" }}>
          {recentObjects.length} Nodes
        </span>
      </div>

      {/* Branch Knowledge Nodes */}
      {nodes.map((node) => (
        <div
          key={node.id}
          onPointerDown={(e) => handlePointerDown(node.id, e)}
          onClick={(e) => {
            e.stopPropagation();
            if (node.rawObj) {
              openObjectModal(node.rawObj);
            } else {
              selectSpace(node.spaceId);
            }
          }}
          style={{
            position: "absolute",
            left: `${node.x}px`,
            top: `${node.y}px`,
            transform: `translate(-50%, -50%) scale(${zoom})`,
            zIndex: 5,
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            boxShadow: "var(--shadow-sm)",
            borderRadius: "20px",
            padding: "6px 14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            transition: "all 120ms ease",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: node.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
            {node.label}
          </span>
        </div>
      ))}

      {/* Empty State Banner when 0 nodes */}
      {recentObjects.length === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface)",
            padding: "6px 14px",
            borderRadius: "20px",
            border: "1px solid var(--border)",
            fontSize: "11px",
            color: "var(--text-secondary)",
            zIndex: 2,
            boxShadow: "var(--shadow-xs)",
          }}
        >
          ✨ Ingest documents in Vault or capture thoughts below to grow your live graph
        </div>
      )}

      {/* Controls Overlay */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          display: "flex",
          gap: "6px",
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 1.4))}
          className="kbd"
          style={{ padding: "4px 8px", cursor: "pointer", background: "var(--surface)" }}
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.7))}
          className="kbd"
          style={{ padding: "4px 8px", cursor: "pointer", background: "var(--surface)" }}
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={toggleFocusMode}
          className="kbd"
          style={{ padding: "4px 8px", cursor: "pointer", background: "var(--surface)" }}
          title="Toggle Focus Mode"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline Quick Capture Bar */}
      <form
        onSubmit={handleQuickCapture}
        style={{
          position: "absolute",
          bottom: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "30px",
          padding: "4px 6px 4px 16px",
          boxShadow: "var(--shadow-md)",
          width: "90%",
          maxWidth: "420px",
        }}
      >
        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
        <input
          type="text"
          placeholder="Capture thought or idea to node…"
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: "12px",
            color: "var(--text-primary)",
            flex: 1,
          }}
        />
        <button
          type="submit"
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            background: "var(--accent)",
            color: "#FFF",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
