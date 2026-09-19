"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Sparkles, Maximize2, Minimize2, ExternalLink, Orbit, Cpu } from "lucide-react";
import { ConstellationNode, ConstellationLink } from "@/components/studio/ConstellationRadar";

interface NeuralNexusEngineProps {
  documents?: Array<{ id: string; title: string; chunks_count?: number }>;
  knowledgeItems?: Array<{ id: string; title?: string | null; content: string; knowledge_type: string; confidence?: number; document_title?: string | null }>;
  memories?: Array<{ id: string; title?: string; content?: string; confidence?: string | number }>;
  projects?: Array<{ id: string; name: string; status?: string }>;
  proposals?: Array<{ id: string; title?: string; reason?: string; action_type?: string }>;
  spaceId: string;
  onSelectNode?: (node: ConstellationNode) => void;
}

export function NeuralNexusEngine({
  documents = [],
  knowledgeItems = [],
  memories = [],
  projects = [],
  proposals = [],
  spaceId,
  onSelectNode,
}: NeuralNexusEngineProps) {
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
    const width = canvas ? canvas.clientWidth : 900;
    const height = canvas ? canvas.clientHeight : 220;
    const centerX = width / 2;
    const centerY = height / 2;

    const newNodes: ConstellationNode[] = [];
    const newLinks: ConstellationLink[] = [];

    // Core Workspace Hub
    const coreNode: ConstellationNode = {
      id: "core-mynd",
      title: "Sovereign Neural Core",
      type: "core",
      subtitle: "Qdrant Active Vector Space",
      x: centerX,
      y: centerY,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      radius: 8,
      color: "#ffffff",
      glowColor: "rgba(255, 255, 255, 0.4)",
    };
    newNodes.push(coreNode);

    // Grounded Documents (Electric Cyan)
    documents.slice(0, 6).forEach((doc, idx) => {
      const angle = (idx / Math.max(documents.length, 1)) * Math.PI * 2 + 0.3;
      const dist = 75 + Math.random() * 45;
      const node: ConstellationNode = {
        id: doc.id,
        title: doc.title,
        type: "document",
        subtitle: `${doc.chunks_count || 4} chunks indexed`,
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 5.5,
        color: "#38bdf8",
        glowColor: "rgba(56, 189, 248, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: doc.id, strength: 0.85 });
    });

    // Extracted Knowledge Concepts (Violet #a78bfa)
    knowledgeItems.slice(0, 8).forEach((k, idx) => {
      const angle = (idx / Math.max(knowledgeItems.length, 1)) * Math.PI * 2 + 1.1;
      const dist = 90 + Math.random() * 50;
      const nodeTitle = k.title || (k.content.length > 25 ? `${k.content.slice(0, 25)}...` : k.content);
      const node: ConstellationNode = {
        id: k.id,
        title: nodeTitle,
        type: "knowledge",
        subtitle: `Qdrant Concept (${k.knowledge_type})`,
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 4.5,
        color: "#a78bfa",
        glowColor: "rgba(167, 139, 250, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: k.id, strength: 0.7 });

      if (k.document_title) {
        const docNode = newNodes.find((n) => n.type === "document" && n.title === k.document_title);
        if (docNode) {
          newLinks.push({ source: k.id, target: docNode.id, strength: 0.9 });
        }
      }
    });

    // Retained Invariant Memories (Neural Indigo #818cf8)
    memories.slice(0, 6).forEach((mem, idx) => {
      const angle = (idx / Math.max(memories.length, 1)) * Math.PI * 2 + 2.0;
      const dist = 95 + Math.random() * 45;
      const nodeTitle = mem.title || (mem.content ? (mem.content.length > 25 ? `${mem.content.slice(0, 25)}...` : mem.content) : "Invariant");
      const node: ConstellationNode = {
        id: mem.id,
        title: nodeTitle,
        type: "memory",
        subtitle: "Retained Invariant Memory",
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 5,
        color: "#818cf8",
        glowColor: "rgba(129, 140, 248, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: mem.id, strength: 0.75 });
    });

    // Active Initiatives (Emerald #10b981)
    projects.slice(0, 4).forEach((proj, idx) => {
      const angle = (idx / Math.max(projects.length, 1)) * Math.PI * 2 + 2.8;
      const dist = 105 + Math.random() * 40;
      const node: ConstellationNode = {
        id: proj.id,
        title: proj.name,
        type: "project",
        subtitle: proj.status || "Active Initiative",
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 5.5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: proj.id, strength: 0.8 });
    });

    // Pending Action Proposals (Amber #f59e0b)
    proposals.slice(0, 3).forEach((prop, idx) => {
      const angle = idx * 1.5 - 0.8;
      const dist = 65 + Math.random() * 25;
      const node: ConstellationNode = {
        id: prop.id,
        title: prop.reason || prop.title || prop.action_type || "Proposal",
        type: "proposal",
        subtitle: "Awaiting Executive Sign-off",
        x: Math.max(30, Math.min(width - 30, centerX + Math.cos(angle) * dist)),
        y: Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * dist)),
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 6.5,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.7)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-mynd", target: prop.id, strength: 0.95 });
    });

    nodesRef.current = newNodes;
    linksRef.current = newLinks;
  }, [documents, knowledgeItems, memories, projects, proposals]);

  // Main Canvas Physics & Particle Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = isExpanded ? 360 : 220);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = isExpanded ? 360 : 220;
    };

    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Ambient radial lighting
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        width / 2
      );
      bgGrad.addColorStop(0, "rgba(99, 102, 241, 0.07)");
      bgGrad.addColorStop(1, "rgba(7, 7, 11, 0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      pulsePhaseRef.current += 0.02;

      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Update positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        const pad = 24;
        if (node.x < pad) {
          node.x = pad;
          node.vx *= -1;
        } else if (node.x > width - pad) {
          node.x = width - pad;
          node.vx *= -1;
        }

        if (node.y < pad) {
          node.y = pad;
          node.vy *= -1;
        } else if (node.y > height - pad) {
          node.y = height - pad;
          node.vy *= -1;
        }
      });

      // Draw Links
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (!source || !target) return;

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

        const alpha = Math.max(0.04, Math.min(0.28, 1 - dist / 320));
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Glowing pulse energy balls
        const pulseOffset = (pulsePhaseRef.current * (link.strength * 1.6)) % 1;
        const px = source.x + dx * pulseOffset;
        const py = source.y + dy * pulseOffset;

        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = source.color;
        ctx.shadowColor = source.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Nodes
      nodes.forEach((node) => {
        if (filter !== "all" && node.type !== filter && node.type !== "core") {
          return;
        }

        const isHovered = hoveredNode?.id === node.id;
        const radius = isHovered ? node.radius + 3 : node.radius;

        // Glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = node.glowColor;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isHovered ? 14 : 7;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        if (isHovered || node.type === "proposal" || node.type === "core") {
          ctx.font = "10px Inter, monospace";
          ctx.fillStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.7)";
          ctx.textAlign = "center";
          ctx.fillText(
            node.title.length > 20 ? `${node.title.slice(0, 18)}...` : node.title,
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
  }, [isExpanded, hoveredNode, filter]);

  // Mouse Interaction
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
  }, []);

  const handleClick = useCallback(() => {
    if (hoveredNode && onSelectNode) {
      onSelectNode(hoveredNode);
    }
  }, [hoveredNode, onSelectNode]);

  return (
    <div className="w-full rounded-2xl bg-[#07070b] border border-white/[0.08] shadow-2xl overflow-hidden relative select-none">
      {/* Top Controls Bar */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-[#0c0d13] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
            <Orbit className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "20s" }} />
          </div>
          <div>
            <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
              <span>LIVING NEURAL NEXUS</span>
              <span className="text-[10px] text-slate-500 font-mono">Qdrant Graph Active</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Interactive topological vector space of grounded knowledge & active strategic paths
            </div>
          </div>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 text-[10px]">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === "all" ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("document")}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === "document" ? "bg-[#38bdf8]/20 text-[#38bdf8] font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Docs
            </button>
            <button
              onClick={() => setFilter("knowledge")}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === "knowledge" ? "bg-[#a78bfa]/20 text-[#a78bfa] font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Concepts
            </button>
            <button
              onClick={() => setFilter("memory")}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === "memory" ? "bg-[#818cf8]/20 text-[#818cf8] font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Memories
            </button>
            <button
              onClick={() => setFilter("project")}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === "project" ? "bg-emerald-500/20 text-emerald-400 font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Work
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
              title={isExpanded ? "Collapse graph height" : "Expand graph height"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <Link
              href={`/spaces/${spaceId}/map`}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-[10px] font-medium transition-colors flex items-center gap-1"
            >
              <span>Full Canvas</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="w-full block"
        style={{ height: isExpanded ? "360px" : "220px" }}
      />

      {/* Floating Hover Hologram */}
      {hoveredNode && tooltipPos && (
        <div
          className="fixed pointer-events-none z-50 px-3 py-2 bg-[#0e0f17]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md text-[11px]"
          style={{
            left: `${tooltipPos.x + 14}px`,
            top: `${tooltipPos.y + 14}px`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: hoveredNode.color }}
            />
            <span className="font-semibold text-white">{hoveredNode.title}</span>
          </div>
          {hoveredNode.subtitle && (
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{hoveredNode.subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}
