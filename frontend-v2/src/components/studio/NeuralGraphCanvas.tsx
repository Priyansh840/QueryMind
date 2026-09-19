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
  Compass,
  Layers,
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
  secondaryColor: string;
  glowColor: string;
  isDragging?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  opacity: number;
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
  const ripplesRef = useRef<Ripple[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Build Graph Nodes & Links
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 1000;
    const height = containerRef.current?.clientHeight || 700;
    const centerX = width / 2;
    const centerY = height / 2;

    const newNodes: GraphNode[] = [];
    const newLinks: GraphLink[] = [];

    // 1. Central Core Hub (Celestial White & Indigo)
    const coreNode: GraphNode = {
      id: "core-hub",
      title: "Workspace Sovereign Core",
      type: "core",
      subtitle: "Grounded Vector Matrix",
      content: "Central vector coordination hub connecting grounded documents, invariant principles, and active execution outcomes.",
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 16,
      color: "#ffffff",
      secondaryColor: "#6366f1",
      glowColor: "rgba(99, 102, 241, 0.7)",
    };
    newNodes.push(coreNode);

    // 2. Documents (Electric Cyan #38bdf8 & Neon Azure)
    documents.forEach((doc, idx) => {
      const angle = (idx / Math.max(documents.length, 1)) * Math.PI * 2 + 0.2;
      const dist = 150 + (idx % 2) * 45;
      const node: GraphNode = {
        id: doc.id,
        title: doc.title,
        type: "document",
        subtitle: `${doc.chunks_count || 4} vector chunks indexed`,
        content: `Document evidence item: "${doc.title}". Grounded and queryable by autonomous agents during reasoning sessions.`,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 10,
        color: "#38bdf8",
        secondaryColor: "#0284c7",
        glowColor: "rgba(56, 189, 248, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-hub", target: doc.id, strength: 0.85 });
    });

    // 3. Invariant Memories (Neural Violet #a78bfa & Electric Purple)
    memories.forEach((mem, idx) => {
      const angle = (idx / Math.max(memories.length, 1)) * Math.PI * 2 + 1.2;
      const dist = 220 + (idx % 3) * 40;
      const node: GraphNode = {
        id: mem.id,
        title: mem.content.length > 34 ? `${mem.content.slice(0, 34)}...` : mem.content,
        type: "memory",
        subtitle: `${mem.memory_type || "Invariant"} · ${Math.round((Number(mem.confidence) || 0.95) * 100)}% Conf`,
        content: mem.content,
        confidence: mem.confidence || 0.95,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 9,
        color: "#c084fc",
        secondaryColor: "#9333ea",
        glowColor: "rgba(192, 132, 252, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-hub", target: mem.id, strength: 0.6 });

      // Link to nearest document
      if (documents.length > 0) {
        const targetDoc = documents[idx % documents.length];
        newLinks.push({ source: mem.id, target: targetDoc.id, strength: 0.45 });
      }
    });

    // 4. Projects & Initiatives (Emerald Aurora #34d399)
    projects.forEach((proj, idx) => {
      const angle = (idx / Math.max(projects.length, 1)) * Math.PI * 2 + 2.6;
      const dist = 280 + (idx % 2) * 50;
      const node: GraphNode = {
        id: proj.id,
        title: proj.name,
        type: "project",
        subtitle: `Initiative • Status: ${proj.status || "active"}`,
        content: `Active initiative: ${proj.name}. Tracked and governed in the Work Hub.`,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 11,
        color: "#34d399",
        secondaryColor: "#059669",
        glowColor: "rgba(52, 211, 153, 0.6)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-hub", target: proj.id, strength: 0.7 });
    });

    // 5. Concepts / Knowledge Items (Indigo #818cf8)
    knowledgeItems.slice(0, 16).forEach((k, idx) => {
      const angle = (idx / Math.max(knowledgeItems.length, 1)) * Math.PI * 2 + 0.5;
      const dist = 190 + (idx % 3) * 45;
      const title = k.title || (k.content.length > 28 ? `${k.content.slice(0, 28)}...` : k.content);
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
        radius: 7.5,
        color: "#818cf8",
        secondaryColor: "#4f46e5",
        glowColor: "rgba(129, 140, 248, 0.55)",
      };
      newNodes.push(node);

      if (k.document_title) {
        const parentDoc = newNodes.find((n) => n.type === "document" && n.title === k.document_title);
        if (parentDoc) {
          newLinks.push({ source: k.id, target: parentDoc.id, strength: 0.85 });
        } else {
          newLinks.push({ source: "core-hub", target: k.id, strength: 0.5 });
        }
      } else {
        newLinks.push({ source: "core-hub", target: k.id, strength: 0.5 });
      }
    });

    // 6. Action Proposals (Warm Amber #fbbf24)
    proposals.slice(0, 3).forEach((prop, idx) => {
      const angle = idx * 1.9 - 0.6;
      const dist = 120 + idx * 35;
      const node: GraphNode = {
        id: prop.id,
        title: prop.action_type ? prop.action_type.replace(/_/g, " ") : "Action Proposal",
        type: "proposal",
        subtitle: "Pending Executive Decision",
        content: prop.reason || "Autonomous action proposal awaiting executive approval.",
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 9.5,
        color: "#fbbf24",
        secondaryColor: "#d97706",
        glowColor: "rgba(251, 191, 36, 0.65)",
      };
      newNodes.push(node);
      newLinks.push({ source: "core-hub", target: prop.id, strength: 0.9 });
    });

    nodesRef.current = newNodes;
    linksRef.current = newLinks;
  }, [documents, memories, knowledgeItems, projects, proposals]);

  // Main Canvas Rendering Loop with Force Physics & Cosmic Aesthetics
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

      timeRef.current += 0.018;

      if (isPhysicsRunning) {
        // 1. Coulomb Repulsion
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const na = nodes[i];
            const nb = nodes[j];
            const dx = nb.x - na.x;
            const dy = nb.y - na.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = (na.radius + nb.radius) * 3.8;

            if (dist < 340) {
              const force = (dist < minDist ? 240 : 75) / (dist * dist);
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

        // 2. Hooke Spring Attraction
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));
        for (const link of links) {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);
          if (!source || !target) continue;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 130 / link.strength;
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

        // 3. Center Gravity & Inertia
        for (const node of nodes) {
          if (node.type === "core") {
            node.x = centerX;
            node.y = centerY;
            node.vx = 0;
            node.vy = 0;
            continue;
          }

          if (node.isDragging) continue;

          const cdx = centerX - node.x;
          const cdy = centerY - node.y;
          node.vx += cdx * 0.0005;
          node.vy += cdy * 0.0005;

          node.vx *= 0.88;
          node.vy *= 0.88;

          node.x += node.vx;
          node.y += node.vy;
        }
      }

      // Update Shockwave Ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 3.5;
        r.opacity *= 0.94;
        if (r.opacity < 0.02 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      // ---- RENDER PASS ----
      const dpr = window.devicePixelRatio || 1;
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;

      ctx.clearRect(0, 0, viewW, viewH);

      // 1. Cosmic Atmosphere Background Gradient
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        50,
        centerX,
        centerY,
        Math.max(viewW, viewH) * 0.8
      );
      bgGrad.addColorStop(0, "rgba(22, 16, 38, 0.45)");
      bgGrad.addColorStop(0.5, "rgba(11, 12, 20, 0.9)");
      bgGrad.addColorStop(1, "rgba(5, 5, 8, 1)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      // Apply pan & zoom
      const { x: panX, y: panY, scale } = transformRef.current;
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      // 2. Delicate Celestial Grid with Coordinate Crosses
      const gridSize = 50;
      const startX = -panX / scale - 200;
      const startY = -panY / scale - 200;
      const endX = startX + viewW / scale + 400;
      const endY = startY + viewH / scale + 400;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
      ctx.lineWidth = 1;

      for (let gx = Math.floor(startX / gridSize) * gridSize; gx < endX; gx += gridSize) {
        for (let gy = Math.floor(startY / gridSize) * gridSize; gy < endY; gy += gridSize) {
          // Delicate crosshair cross at grid intersections
          ctx.beginPath();
          ctx.moveTo(gx - 3, gy);
          ctx.lineTo(gx + 3, gy);
          ctx.moveTo(gx, gy - 3);
          ctx.lineTo(gx, gy + 3);
          ctx.stroke();
        }
      }

      // 3. Animated Gravitational Waves radiating from Core
      const coreNode = nodes.find((n) => n.type === "core");
      if (coreNode) {
        for (let ring = 1; ring <= 3; ring++) {
          const waveRadius = ((timeRef.current * 25 + ring * 110) % 360) + 30;
          const waveAlpha = Math.max(0, 0.15 * (1 - waveRadius / 360));
          ctx.beginPath();
          ctx.arc(coreNode.x, coreNode.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99, 102, 241, ${waveAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // 4. Draw Shockwave Ripples
      for (const r of ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color.replace(")", `, ${r.opacity})`).replace("rgb", "rgba");
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const q = searchQuery.toLowerCase().trim();
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // 5. Draw Multi-Stop Gradient Links with Flowing Comets
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

        const lineGrad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        lineGrad.addColorStop(0, source.color);
        lineGrad.addColorStop(1, target.color);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isSelected) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = source.color;
          ctx.shadowBlur = 12;
        } else if (isHovered) {
          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = 2;
          ctx.shadowColor = target.color;
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Flowing Photon Comet with Trail
        const particleT = (timeRef.current * 0.45 * link.strength) % 1;
        const px = source.x + (target.x - source.x) * particleT;
        const py = source.y + (target.y - source.y) * particleT;

        // Comet Head
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = source.color;
        ctx.shadowColor = source.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 6. Draw Nodes as Tactile Glossy Orbs with Glassmorphic Badges
      for (const node of nodes) {
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeRef.current?.id === node.id;
        const matchesQuery =
          !q ||
          node.title.toLowerCase().includes(q) ||
          (node.subtitle && node.subtitle.toLowerCase().includes(q));
        const matchesFilter =
          activeFilter === "all" || node.type === activeFilter || node.type === "core";

        const isDimmed = (!matchesQuery || !matchesFilter) && !isSelected;

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.12;
        }

        // Layer A: Outer Diffuse Bloom
        const bloomRadius = node.radius + (isSelected ? 16 : isHovered ? 12 : 8);
        const bloomGrad = ctx.createRadialGradient(
          node.x,
          node.y,
          node.radius * 0.4,
          node.x,
          node.y,
          bloomRadius
        );
        bloomGrad.addColorStop(0, node.glowColor);
        bloomGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.beginPath();
        ctx.arc(node.x, node.y, bloomRadius, 0, Math.PI * 2);
        ctx.fillStyle = bloomGrad;
        ctx.fill();

        // Layer B: Glass Orb Body with 3D Specular Shading
        const sphereGrad = ctx.createRadialGradient(
          node.x - node.radius * 0.35,
          node.y - node.radius * 0.35,
          node.radius * 0.1,
          node.x,
          node.y,
          node.radius
        );
        sphereGrad.addColorStop(0, "#ffffff");
        sphereGrad.addColorStop(0.35, node.color);
        sphereGrad.addColorStop(1, node.secondaryColor);

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected ? 18 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Layer C: Specular Glass Rim Light Highlight
        ctx.beginPath();
        ctx.arc(
          node.x - node.radius * 0.25,
          node.y - node.radius * 0.25,
          node.radius * 0.35,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        ctx.fill();

        // Layer D: Outer Selection Ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Layer E: Frosted Glass Label Badge Pill
        if (!isDimmed || isSelected || isHovered) {
          const labelText =
            node.title.length > 22 ? `${node.title.slice(0, 22)}...` : node.title;

          ctx.font = isSelected || isHovered
            ? "600 11px system-ui, -apple-system, sans-serif"
            : "500 10px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textMetrics = ctx.measureText(labelText);
          const badgeW = textMetrics.width + 18;
          const badgeH = 20;
          const badgeX = node.x - badgeW / 2;
          const badgeY = node.y + node.radius + 8;

          // Glass Badge Pill Background
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
          ctx.fillStyle = isSelected
            ? "rgba(20, 22, 36, 0.95)"
            : isHovered
            ? "rgba(16, 18, 28, 0.9)"
            : "rgba(10, 11, 18, 0.75)";
          ctx.fill();

          ctx.strokeStyle = isSelected
            ? "rgba(255, 255, 255, 0.35)"
            : isHovered
            ? node.color
            : "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Type Dot inside badge
          ctx.beginPath();
          ctx.arc(badgeX + 8, badgeY + badgeH / 2, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();

          // Label Text
          ctx.fillStyle = isSelected ? "#ffffff" : isHovered ? "#38bdf8" : "rgba(226, 232, 240, 0.9)";
          ctx.fillText(labelText, node.x + 3, badgeY + badgeH / 2);
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

  // Coordinate projection
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

  const getNodeAt = useCallback((gx: number, gy: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - gx;
      const dy = n.y - gy;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 8) {
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

      // Trigger Shockwave ripple on click
      ripplesRef.current.push({
        x: hit.x,
        y: hit.y,
        radius: hit.radius,
        maxRadius: 180,
        color: hit.color,
        opacity: 0.8,
      });
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
      if (onSelectNode) onSelectNode(hit);
    } else if (isPanningRef.current) {
      isPanningRef.current = false;
    } else {
      const { x, y } = getGraphCoords(e.clientX, e.clientY);
      const hit = getNodeAt(x, y);
      if (onSelectNode) onSelectNode(hit);
    }
  };

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
    <div ref={containerRef} className="relative w-full h-full bg-[#050508] select-none overflow-hidden">
      {/* Interactive Top Glass HUD Overlay */}
      <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between gap-4 pointer-events-none">
        {/* Left: Frosted Filter Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0c0d16]/80 backdrop-blur-2xl border border-white/[0.1] shadow-2xl pointer-events-auto">
          {[
            { id: "all", label: "All Nodes", count: nodesRef.current.length },
            { id: "document", label: "Documents", count: documents.length, color: "#38bdf8" },
            { id: "memory", label: "Memories", count: memories.length, color: "#c084fc" },
            { id: "concept", label: "Concepts", count: knowledgeItems.length, color: "#818cf8" },
            { id: "project", label: "Initiatives", count: projects.length, color: "#34d399" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-white/15 text-white font-semibold shadow-sm border border-white/15"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {tab.color && (
                <span
                  className="w-2 h-2 rounded-full shadow-sm"
                  style={{ backgroundColor: tab.color }}
                />
              )}
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono text-slate-500">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Right: Search & Viewport Tools */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph..."
              className="w-48 pl-9 pr-3.5 py-2 rounded-2xl bg-[#0c0d16]/80 backdrop-blur-2xl border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 shadow-2xl transition-all"
            />
          </div>

          <div className="flex items-center p-1 rounded-2xl bg-[#0c0d16]/80 backdrop-blur-2xl border border-white/[0.1] shadow-2xl text-slate-400">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-xl hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-xl hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 rounded-xl hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Recenter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
              onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isPhysicsRunning ? "text-emerald-400 hover:bg-white/[0.06]" : "text-amber-400 hover:bg-white/[0.06]"
              }`}
              title={isPhysicsRunning ? "Freeze Physics" : "Resume Physics"}
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

      {/* Bottom Floating Navigation Legend */}
      <div className="absolute bottom-5 left-6 z-20 flex items-center gap-3 text-[11px] font-mono text-slate-400 bg-[#0c0d16]/80 backdrop-blur-2xl px-3.5 py-2 rounded-2xl border border-white/[0.08] shadow-2xl">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span>Documents</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <span>Axioms</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Initiatives</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>Concepts</span>
        </span>
      </div>
    </div>
  );
}
