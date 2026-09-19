"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  Search,
  FileText,
  Brain,
  FolderGit2,
  Zap,
  Bookmark,
} from "lucide-react";

export interface GraphNode {
  id: string;
  title: string;
  type: "core" | "document" | "memory" | "concept" | "project" | "proposal";
  subtitle?: string;
  content?: string;
  confidence?: number | string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  isDragging?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

interface NeuralGraphCanvasProps {
  documents?: Array<{ id: string; title: string; chunks_count?: number }>;
  memories?: Array<{ id: string; content: string; memory_type?: string; confidence?: number | string }>;
  knowledgeItems?: Array<{ id: string; title?: string | null; content: string; knowledge_type: string; confidence?: number; document_title?: string | null }>;
  projects?: Array<{ id: string; name: string; status?: string }>;
  proposals?: Array<{ id: string; reason?: string; action_type?: string; confidence?: string }>;
  onSelectNode?: (node: GraphNode | null) => void;
  selectedNodeId?: string | null;
}

export function NeuralGraphCanvas({
  documents = [],
  memories = [],
  knowledgeItems = [],
  projects = [],
  proposals = [],
  onSelectNode,
  selectedNodeId,
}: NeuralGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport Transform (Pan & Zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  transformRef.current = transform;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "document" | "memory" | "concept" | "project">("all");
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true);

  // Interaction Refs
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Simulation Data
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const particlePhaseRef = useRef<number>(0);

  // Build Graph Nodes & Links
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 1000;
    const height = containerRef.current?.clientHeight || 700;
    const centerX = width / 2;
    const centerY = height / 2;

    const newNodes: GraphNode[] = [];
    const newLinks: GraphLink[] = [];

    // 1. Central Core Hub
    const coreNode: GraphNode = {
      id: "core-hub",
      title: "Workspace Neural Core",
      type: "core",
      subtitle: "Sovereign Grounding Nexus",
      content: "Central vector coordination hub connecting grounded documents, invariant principles, and active execution outcomes.",
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 12,
      color: "#ffffff",
      glowColor: "rgba(255, 255, 255, 0.6)",
    };
    newNodes.push(coreNode);

    // 2. Documents (Electric Sky #38bdf8)
    documents.forEach((doc, idx) => {
      const angle = (idx / Math.max(documents.length, 1)) * Math.PI * 2;
      const dist = 140 + (idx % 2) * 40;
      const node: GraphNode = {
        id: doc.id,
        title: doc.title,
        type: "document",
        subtitle: `${doc.chunks_count || 4} vector excerpts indexed`,
        content: `Document evidence item: "${doc.title}". Grounded and queryable by autonomous agents during reasoning sessions.`,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 8,
        color: "#38bdf8",
        glowColor: "rgba(56, 189, 248, 0.5)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-hub", target: doc.id, strength: 0.85 });
    });

    // 3. Invariant Memories (Neural Violet #a78bfa)
    memories.forEach((mem, idx) => {
      const angle = (idx / Math.max(memories.length, 1)) * Math.PI * 2 + 1.1;
      const dist = 210 + (idx % 3) * 35;
      const node: GraphNode = {
        id: mem.id,
        title: mem.content.length > 36 ? `${mem.content.slice(0, 36)}...` : mem.content,
        type: "memory",
        subtitle: `${mem.memory_type || "Invariant"} · ${Math.round((Number(mem.confidence) || 0.95) * 100)}% conf`,
        content: mem.content,
        confidence: mem.confidence || 0.95,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 7,
        color: "#a78bfa",
        glowColor: "rgba(167, 139, 250, 0.5)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-hub", target: mem.id, strength: 0.6 });

      // Link to nearest document
      if (documents.length > 0) {
        const targetDoc = documents[idx % documents.length];
        newLinks.push({ source: mem.id, target: targetDoc.id, strength: 0.4 });
      }
    });

    // 4. Projects & Initiatives (Emerald #34d399)
    projects.forEach((proj, idx) => {
      const angle = (idx / Math.max(projects.length, 1)) * Math.PI * 2 + 2.5;
      const dist = 260 + (idx % 2) * 50;
      const node: GraphNode = {
        id: proj.id,
        title: proj.name,
        type: "project",
        subtitle: `Initiative • Status: ${proj.status || "active"}`,
        content: `Active initiative: ${proj.name}. Outcome tracked in the Work Hub.`,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 8.5,
        color: "#34d399",
        glowColor: "rgba(52, 211, 153, 0.5)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-hub", target: proj.id, strength: 0.7 });
    });

    // 5. Concepts / Knowledge Items (Indigo #818cf8)
    knowledgeItems.slice(0, 14).forEach((k, idx) => {
      const angle = (idx / Math.max(knowledgeItems.length, 1)) * Math.PI * 2 + 0.4;
      const dist = 180 + (idx % 3) * 45;
      const title = k.title || (k.content.length > 30 ? `${k.content.slice(0, 30)}...` : k.content);
      const node: GraphNode = {
        id: k.id,
        title,
        type: "concept",
        subtitle: `${k.knowledge_type} • ${Math.round((k.confidence || 1) * 100)}% Match`,
        content: k.content,
        confidence: k.confidence || 1,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 6,
        color: "#818cf8",
        glowColor: "rgba(129, 140, 248, 0.5)",
      };
      newNodes.push(node);

      // Connect to parent document if available
      if (k.document_title) {
        const parentDoc = newNodes.find((n) => n.type === "document" && n.title === k.document_title);
        if (parentDoc) {
          newLinks.push({ source: k.id, target: parentDoc.id, strength: 0.8 });
        } else {
          newLinks.push({ source: "core-hub", target: k.id, strength: 0.5 });
        }
      } else {
        newLinks.push({ source: "core-hub", target: k.id, strength: 0.5 });
      }
    });

    // 6. Action Proposals (Amber #fbbf24)
    proposals.slice(0, 3).forEach((prop, idx) => {
      const angle = idx * 1.8 - 0.7;
      const dist = 110 + idx * 30;
      const node: GraphNode = {
        id: prop.id,
        title: prop.action_type ? prop.action_type.replace(/_/g, " ") : "Action Proposal",
        type: "proposal",
        subtitle: "Pending Executive Approval",
        content: prop.reason || "Autonomous action proposal awaiting executive approval.",
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 7.5,
        color: "#fbbf24",
        glowColor: "rgba(251, 191, 36, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-hub", target: prop.id, strength: 0.9 });
    });

    nodesRef.current = newNodes;
    linksRef.current = newLinks;
  }, [documents, memories, knowledgeItems, projects, proposals]);

  // Main Canvas Rendering Loop with Force Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      if (!canvas || !canvas.parentElement) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const stepSimulation = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const width = canvas.parentElement?.clientWidth || 1000;
      const height = canvas.parentElement?.clientHeight || 700;
      const centerX = width / 2;
      const centerY = height / 2;

      if (isPhysicsRunning) {
        // 1. Coulomb Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const na = nodes[i];
            const nb = nodes[j];
            const dx = nb.x - na.x;
            const dy = nb.y - na.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = (na.radius + nb.radius) * 3.5;

            if (dist < 320) {
              const force = (dist < minDist ? 220 : 70) / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (!na.isDragging && na.type !== "core") {
                na.vx -= fx;
                na.vy -= fy;
              }
              if (!nb.isDragging && nb.type !== "core") {
                nb.vx += fx;
                nb.vy += fy;
              }
            }
          }
        }

        // 2. Hooke Spring Attraction along links
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));
        for (const link of links) {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);
          if (!source || !target) continue;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 120 / link.strength;
          const diff = dist - targetDist;
          const force = diff * 0.0035 * link.strength;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!source.isDragging && source.type !== "core") {
            source.vx += fx;
            source.vy += fy;
          }
          if (!target.isDragging && target.type !== "core") {
            target.vx -= fx;
            target.vy -= fy;
          }
        }

        // 3. Center Gravity & Integration with Damping
        for (const node of nodes) {
          if (node.type === "core") {
            node.x = centerX;
            node.y = centerY;
            node.vx = 0;
            node.vy = 0;
            continue;
          }

          if (node.isDragging) continue;

          // Gentle pull toward center
          const cdx = centerX - node.x;
          const cdy = centerY - node.y;
          node.vx += cdx * 0.0006;
          node.vy += cdy * 0.0006;

          // Damping friction
          node.vx *= 0.88;
          node.vy *= 0.88;

          node.x += node.vx;
          node.y += node.vy;
        }
      }

      particlePhaseRef.current += 0.02;

      // ---- RENDER PASS ----
      const dpr = window.devicePixelRatio || 1;
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;

      ctx.clearRect(0, 0, viewW, viewH);

      ctx.save();
      // Apply pan & zoom
      const { x: panX, y: panY, scale } = transformRef.current;
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      // Draw subtle starry grid background
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      const gridSize = 40;
      const startX = -panX / scale - 100;
      const startY = -panY / scale - 100;
      const endX = startX + viewW / scale + 200;
      const endY = startY + viewH / scale + 200;

      for (let gx = Math.floor(startX / gridSize) * gridSize; gx < endX; gx += gridSize) {
        for (let gy = Math.floor(startY / gridSize) * gridSize; gy < endY; gy += gridSize) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const q = searchQuery.toLowerCase().trim();
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // 1. Draw Links
      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) continue;

        const isHovered =
          hoveredNodeRef.current &&
          (hoveredNodeRef.current.id === source.id || hoveredNodeRef.current.id === target.id);
        const isSelected =
          selectedNodeId &&
          (selectedNodeId === source.id || selectedNodeId === target.id);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isSelected) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 2;
        } else if (isHovered) {
          ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
          ctx.lineWidth = 1;
        }
        ctx.stroke();

        // Animated photon particle along connection
        const particleT = (particlePhaseRef.current * link.strength * 0.5) % 1;
        const px = source.x + (target.x - source.x) * particleT;
        const py = source.y + (target.y - source.y) * particleT;

        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = source.color;
        ctx.shadowColor = source.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 2. Draw Nodes
      for (const node of nodes) {
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeRef.current?.id === node.id;
        const matchesQuery = !q || node.title.toLowerCase().includes(q) || (node.subtitle && node.subtitle.toLowerCase().includes(q));
        const matchesFilter = activeFilter === "all" || node.type === activeFilter || node.type === "core";

        const isDimmed = (!matchesQuery || !matchesFilter) && !isSelected;

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.15;
        }

        // Outer Glow halo
        if (isSelected || isHovered || node.type === "core") {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + (isSelected ? 8 : 5), 0, Math.PI * 2);
          ctx.fillStyle = node.glowColor;
          ctx.fill();
        }

        // Main Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Node Inner Core Dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#0c0d14";
        ctx.fill();

        // Node Label
        if (!isDimmed || isSelected || isHovered) {
          ctx.font = isSelected || isHovered ? "600 11px system-ui, sans-serif" : "500 10px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const labelText = node.title.length > 24 ? `${node.title.slice(0, 24)}...` : node.title;

          // Text halo for readability
          ctx.strokeStyle = "rgba(10, 10, 15, 0.9)";
          ctx.lineWidth = 3;
          ctx.strokeText(labelText, node.x, node.y + node.radius + 11);

          ctx.fillStyle = isSelected ? "#ffffff" : isHovered ? "#38bdf8" : "rgba(226, 232, 240, 0.85)";
          ctx.fillText(labelText, node.x, node.y + node.radius + 11);
        }

        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(stepSimulation);
    };

    animId = requestAnimationFrame(stepSimulation);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isPhysicsRunning, searchQuery, activeFilter, selectedNodeId]);

  // Screen to Graph coordinate projection
  const getGraphCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const { x: panX, y: panY, scale } = transformRef.current;

    return {
      x: (mouseX - panX) / scale,
      y: (mouseY - panY) / scale,
    };
  }, []);

  // Find node at coordinate
  const getNodeAt = useCallback((gx: number, gy: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - gx;
      const dy = n.y - gy;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 6) {
        return n;
      }
    }
    return null;
  }, []);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGraphCoords(e.clientX, e.clientY);
    const hit = getNodeAt(x, y);

    if (hit) {
      draggedNodeRef.current = hit;
      hit.isDragging = true;
      hit.vx = 0;
      hit.vy = 0;
    } else {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const { x, y } = getGraphCoords(e.clientX, e.clientY);
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    if (isPanningRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      }));
      return;
    }

    // Hover detection
    const { x, y } = getGraphCoords(e.clientX, e.clientY);
    const hit = getNodeAt(x, y);
    hoveredNodeRef.current = hit;
    setHoveredNode(hit);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const hit = draggedNodeRef.current;
      hit.isDragging = false;
      draggedNodeRef.current = null;
      if (onSelectNode) {
        onSelectNode(hit);
      }
    } else if (isPanningRef.current) {
      isPanningRef.current = false;
    } else {
      // Click on canvas background deselects
      const { x, y } = getGraphCoords(e.clientX, e.clientY);
      const hit = getNodeAt(x, y);
      if (onSelectNode) {
        onSelectNode(hit);
      }
    }
  };

  // Zoom with Wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setTransform((prev) => {
      const newScale = Math.max(0.3, Math.min(3.5, prev.scale * zoomFactor));
      const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
      const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  };

  // Zoom Controls
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(3.5, prev.scale * 1.25),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.3, prev.scale * 0.8),
    }));
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#07070b] select-none overflow-hidden">
      {/* Interactive Top HUD Overlay */}
      <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between gap-4 pointer-events-none">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0e0f17]/90 backdrop-blur-md border border-white/[0.08] shadow-xl pointer-events-auto">
          {[
            { id: "all", label: "All Nodes", count: nodesRef.current.length },
            { id: "document", label: "Documents", count: documents.length, color: "#38bdf8" },
            { id: "memory", label: "Memories", count: memories.length, color: "#a78bfa" },
            { id: "concept", label: "Concepts", count: knowledgeItems.length, color: "#818cf8" },
            { id: "project", label: "Initiatives", count: projects.length, color: "#34d399" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-white/10 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {tab.color && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tab.color }} />
              )}
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono text-slate-500">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Right: Search Input & Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter graph nodes..."
              className="w-48 pl-8 pr-3 py-1.5 rounded-xl bg-[#0e0f17]/90 backdrop-blur-md border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 shadow-xl"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-[#0e0f17]/90 backdrop-blur-md border border-white/[0.08] shadow-xl text-slate-400">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Recenter Graph"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-white/10 mx-1" />
            <button
              onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
              className={`p-1.5 rounded-lg transition-colors ${
                isPhysicsRunning ? "text-emerald-400 hover:bg-white/[0.06]" : "text-amber-400 hover:bg-white/[0.06]"
              }`}
              title={isPhysicsRunning ? "Pause Physics Simulation" : "Resume Physics Simulation"}
            >
              {isPhysicsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main HTML5 Physics Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Subtle Bottom Legend Bar */}
      <div className="absolute bottom-4 left-6 z-20 flex items-center gap-4 text-[11px] font-mono text-slate-500 bg-[#0c0d14]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/[0.06]">
        <span>Drag node to anchor • Wheel to zoom • Click node to inspect</span>
      </div>
    </div>
  );
}
