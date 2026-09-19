"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, Maximize2, Minimize2 } from "lucide-react";

export interface ConstellationNode {
  id: string;
  title: string;
  type: "document" | "memory" | "project" | "proposal" | "knowledge" | "core";
  subtitle?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
}

export interface ConstellationLink {
  source: string;
  target: string;
  strength: number;
}

interface ConstellationRadarProps {
  documents?: Array<{ id: string; title: string; chunks_count?: number }>;
  memories?: Array<{ id: string; title: string; confidence?: string }>;
  knowledgeItems?: Array<{ id: string; title?: string | null; content: string; knowledge_type: string; confidence?: number; document_title?: string | null }>;
  projects?: Array<{ id: string; name: string; status?: string }>;
  proposals?: Array<{ id: string; title: string }>;
  isStreaming?: boolean;
  onSelectNode?: (node: ConstellationNode) => void;
}

export function ConstellationRadar({
  documents = [],
  memories = [],
  knowledgeItems = [],
  projects = [],
  proposals = [],
  isStreaming = false,
  onSelectNode,
}: ConstellationRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<ConstellationNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "document" | "knowledge" | "memory" | "project">("all");

  const nodesRef = useRef<ConstellationNode[]>([]);
  const linksRef = useRef<ConstellationLink[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const pulsePhaseRef = useRef<number>(0);

  // Initialize graph nodes from incoming data
  useEffect(() => {
    const canvas = canvasRef.current;
    const width = canvas ? canvas.clientWidth : 800;
    const height = canvas ? canvas.clientHeight : 180;
    const centerX = width / 2;
    const centerY = height / 2;

    const newNodes: ConstellationNode[] = [];
    const newLinks: ConstellationLink[] = [];

    // Core Workspace Hub Node
    const coreNode: ConstellationNode = {
      id: "core-mynd",
      title: "MYND Neural Core",
      type: "core",
      subtitle: "Active Grounding Field",
      x: centerX,
      y: centerY,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      radius: 7,
      color: "#ffffff",
      glowColor: "rgba(255, 255, 255, 0.4)",
    };
    newNodes.push(coreNode);

    // Add Documents (Electric Cyan)
    documents.slice(0, 6).forEach((doc, idx) => {
      const angle = (idx / Math.max(documents.length, 1)) * Math.PI * 2 + 0.3;
      const dist = 70 + Math.random() * 50;
      const node: ConstellationNode = {
        id: doc.id,
        title: doc.title,
        type: "document",
        subtitle: `${doc.chunks_count || 4} chunks grounded`,
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 5,
        color: "#38bdf8",
        glowColor: "rgba(56, 189, 248, 0.5)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: doc.id, strength: 0.8 });
    });

    // Add Invariant Memories (Neural Violet)
    memories.slice(0, 6).forEach((mem, idx) => {
      const angle = (idx / Math.max(memories.length, 1)) * Math.PI * 2 + 1.2;
      const dist = 85 + Math.random() * 45;
      const node: ConstellationNode = {
        id: mem.id,
        title: mem.title,
        type: "memory",
        subtitle: "Retained Invariant Memory",
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 4.5,
        color: "#818cf8",
        glowColor: "rgba(129, 140, 248, 0.5)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: mem.id, strength: 0.6 });

      // Cross link to nearest document for semantic clustering
      if (newNodes.length > 2) {
        const docNode = newNodes.find((n) => n.type === "document");
        if (docNode) {
          newLinks.push({ source: mem.id, target: docNode.id, strength: 0.3 });
        }
      }
    });

    // Add Projects/Initiatives (Emerald)
    projects.slice(0, 4).forEach((proj, idx) => {
      const angle = (idx / Math.max(projects.length, 1)) * Math.PI * 2 + 2.4;
      const dist = 95 + Math.random() * 40;
      const node: ConstellationNode = {
        id: proj.id,
        title: proj.name,
        type: "project",
        subtitle: proj.status || "Active Initiative",
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 5,
        color: "#34d399",
        glowColor: "rgba(52, 211, 153, 0.5)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: proj.id, strength: 0.7 });
    });

    // Add Knowledge Items / Concepts (Violet #a78bfa)
    knowledgeItems.slice(0, 8).forEach((k, idx) => {
      const angle = (idx / Math.max(knowledgeItems.length, 1)) * Math.PI * 2 + 0.8;
      const dist = 80 + Math.random() * 45;
      const title = k.title || (k.content.length > 25 ? `${k.content.slice(0, 25)}...` : k.content);
      const node: ConstellationNode = {
        id: k.id,
        title: title,
        type: "knowledge",
        subtitle: `Qdrant ${k.knowledge_type} · ${Math.round((k.confidence || 1) * 100)}% conf`,
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 4.5,
        color: "#a78bfa",
        glowColor: "rgba(167, 139, 250, 0.5)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: k.id, strength: 0.7 });

      if (k.document_title) {
        const docNode = newNodes.find((n) => n.type === "document" && n.title === k.document_title);
        if (docNode) {
          newLinks.push({ source: k.id, target: docNode.id, strength: 0.85 });
        }
      }
    });

    // Add Pending Action Proposals (Amber)
    proposals.slice(0, 3).forEach((prop, idx) => {
      const angle = idx * 1.5 - 0.8;
      const dist = 60 + Math.random() * 30;
      const node: ConstellationNode = {
        id: prop.id,
        title: prop.title,
        type: "proposal",
        subtitle: "Awaiting Executive Sign-off",
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 6,
        color: "#fbbf24",
        glowColor: "rgba(251, 191, 36, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: prop.id, strength: 0.9 });
    });

    nodesRef.current = newNodes;
    linksRef.current = newLinks;
  }, [documents, memories, knowledgeItems, projects, proposals]);

  // Main Canvas Rendering & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = isExpanded ? 320 : 160);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = isExpanded ? 320 : 160;
    };

    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Ambient canvas background gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        20,
        width / 2,
        height / 2,
        width / 2
      );
      bgGrad.addColorStop(0, "rgba(99, 102, 241, 0.05)");
      bgGrad.addColorStop(1, "rgba(8, 8, 12, 0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      pulsePhaseRef.current += isStreaming ? 0.06 : 0.015;

      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Update positions with subtle floating physics
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce gently off canvas bounds
        const padding = 24;
        if (node.x < padding) {
          node.x = padding;
          node.vx *= -1;
        } else if (node.x > width - padding) {
          node.x = width - padding;
          node.vx *= -1;
        }

        if (node.y < padding) {
          node.y = padding;
          node.vy *= -1;
        } else if (node.y > height - padding) {
          node.y = height - padding;
          node.vy *= -1;
        }
      });

      // Draw Links (Neural Synaptic Lines)
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (!source || !target) return;

        // Filter check
        if (
          filter !== "all" &&
          source.type !== filter &&
          target.type !== filter &&
          source.type !== "core" &&
          target.type !== "core"
        ) {
          return;
        }

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        const alpha = Math.max(0.04, Math.min(0.25, 1 - dist / 300));
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Draw animated energy pulses along the links
        if (isStreaming || link.strength > 0.7) {
          const pulseOffset = (pulsePhaseRef.current * (link.strength * 1.5)) % 1;
          const px = source.x + dx * pulseOffset;
          const py = source.y + dy * pulseOffset;

          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = source.color;
          ctx.shadowColor = source.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      });

      // Draw Nodes
      nodes.forEach((node) => {
        if (filter !== "all" && node.type !== filter && node.type !== "core") {
          return;
        }

        const isHovered = hoveredNode?.id === node.id;
        const radius = isHovered ? node.radius + 2 : node.radius;

        // Glow ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = node.glowColor;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isHovered ? 12 : 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw node title if hovered or core
        if (isHovered || node.type === "proposal" || node.type === "core") {
          ctx.font = "10px Inter, -apple-system, sans-serif";
          ctx.fillStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.6)";
          ctx.textAlign = "center";
          ctx.fillText(
            node.title.length > 22 ? `${node.title.slice(0, 20)}...` : node.title,
            node.x,
            node.y + radius + 14
          );
        }
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isExpanded, isStreaming, hoveredNode, filter]);

  // Handle Mouse Interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const hit = nodesRef.current.find((node) => {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        return Math.sqrt(dx * dx + dy * dy) <= node.radius + 8;
      });

      if (hit) {
        setHoveredNode(hit);
        setTooltipPos({ x: e.clientX, y: e.clientY });
        canvas.style.cursor = "pointer";
      } else {
        setHoveredNode(null);
        setTooltipPos(null);
        canvas.style.cursor = "default";
      }
    },
    []
  );

  const handleClick = useCallback(() => {
    if (hoveredNode && onSelectNode) {
      onSelectNode(hoveredNode);
    }
  }, [hoveredNode, onSelectNode]);

  return (
    <div className="relative w-full border-b border-white/[0.06] bg-[#07070a] overflow-hidden select-none transition-all duration-300">
      {/* Top Utility Ribbon */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-white/[0.04] text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <Sparkles className="w-3 h-3 text-[#38bdf8]" />
            <span>Living Knowledge Constellation</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
              <span>{documents.length} Grounded</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
              <span>{knowledgeItems.length} Concepts</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
              <span>{memories.length} Memories</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
              <span>{projects.length} Initiatives</span>
            </span>
            {proposals.length > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>{proposals.length} Approvals</span>
              </span>
            )}
          </div>
        </div>

        {/* Filter and Expand Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded p-0.5">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                filter === "all" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("document")}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                filter === "document" ? "bg-[#38bdf8]/20 text-[#38bdf8] font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Docs
            </button>
            <button
              onClick={() => setFilter("knowledge")}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                filter === "knowledge" ? "bg-[#a78bfa]/20 text-[#a78bfa] font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Concepts
            </button>
            <button
              onClick={() => setFilter("memory")}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                filter === "memory" ? "bg-[#818cf8]/20 text-[#818cf8] font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Memories
            </button>
            <button
              onClick={() => setFilter("project")}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                filter === "project" ? "bg-[#34d399]/20 text-[#34d399] font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Work
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? "Minimize radar" : "Expand radar"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="w-full block"
        style={{ height: isExpanded ? "320px" : "150px" }}
      />

      {/* Floating Hover Tooltip */}
      {hoveredNode && tooltipPos && (
        <div
          className="fixed pointer-events-none z-50 px-2.5 py-1.5 bg-[#0e0e14]/95 border border-white/10 rounded shadow-xl backdrop-blur-md text-[11px]"
          style={{
            left: `${tooltipPos.x + 12}px`,
            top: `${tooltipPos.y + 12}px`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: hoveredNode.color }}
            />
            <span className="font-semibold text-white">{hoveredNode.title}</span>
          </div>
          {hoveredNode.subtitle && (
            <div className="text-[10px] text-slate-400 mt-0.5">{hoveredNode.subtitle}</div>
          )}
          <div className="text-[9px] text-[#818cf8] mt-1 font-mono uppercase tracking-wider">
            Click to inspect in Studio
          </div>
        </div>
      )}
    </div>
  );
}
