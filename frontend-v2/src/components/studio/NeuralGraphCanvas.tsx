"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  FileText,
  Brain,
  FolderGit2,
  Zap,
  Play,
  Pause,
  Layers,
  Info,
  ExternalLink,
  X,
} from "lucide-react";

export interface GraphNode {
  id: string;
  title: string;
  type: "document" | "memory" | "concept" | "project" | "proposal" | "core";
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
  phase: number;
  isDragging?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
  distance: number;
  speed: number;
  pulsePhase: number;
}

interface SynapticPulse {
  x: number;
  y: number;
  color: string;
  radius: number;
  alpha: number;
}

interface AmbientDust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
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
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);

  // Simulation Data
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const ambientDustRef = useRef<AmbientDust[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Initialize Ambient Dust Particles
  useEffect(() => {
    const dust: AmbientDust[] = [];
    for (let i = 0; i < 45; i++) {
      dust.push({
        x: Math.random() * 2000 - 500,
        y: Math.random() * 2000 - 500,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.25 + 0.05,
      });
    }
    ambientDustRef.current = dust;
  }, []);

  // Build Natural Organic Graph (Clusters, Hubs, Cross-Links)
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 1000;
    const height = containerRef.current?.clientHeight || 700;
    const centerX = width / 2;
    const centerY = height / 2;

    const newNodes: GraphNode[] = [];
    const newLinks: GraphLink[] = [];

    // Helper for seeded pseudo-random deterministic offset
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    // 1. Primary Hubs: Documents
    const docNodes: GraphNode[] = [];
    const totalDocs = Math.max(documents.length, 1);
    documents.forEach((doc, idx) => {
      // Natural scattered cluster positions around center with spacious organic spread
      const angle = (idx / totalDocs) * Math.PI * 2 + (pseudoRandom(idx + 1) - 0.5) * 0.5;
      const radiusDist = 210 + pseudoRandom(idx + 7) * 110;
      const x = centerX + Math.cos(angle) * radiusDist;
      const y = centerY + Math.sin(angle) * radiusDist;

      const node: GraphNode = {
        id: doc.id,
        title: doc.title,
        type: "document",
        subtitle: `${doc.chunks_count || 4} vector chunks indexed`,
        content: `Document item: "${doc.title}". Grounded and queryable by workspace agents.`,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 14,
        color: "#ffffff", // Primary white
        secondaryColor: "#d4d4d8",
        glowColor: "rgba(255, 255, 255, 0.2)",
        phase: idx * 1.3,
      };
      newNodes.push(node);
      docNodes.push(node);
    });

    // Cross-link documents together if multiple exist (synaptic document backbone)
    if (docNodes.length > 1) {
      for (let i = 0; i < docNodes.length; i++) {
        const next = (i + 1) % docNodes.length;
        newLinks.push({
          source: docNodes[i].id,
          target: docNodes[next].id,
          strength: 0.45,
          distance: 240,
          speed: 0.35,
          pulsePhase: pseudoRandom(i) * Math.PI * 2,
        });
      }
    }

    // 2. Strategic Initiatives (Projects)
    projects.forEach((proj, idx) => {
      const parentDoc = docNodes.length > 0 ? docNodes[idx % docNodes.length] : null;
      const baseAngle = parentDoc
        ? Math.atan2(parentDoc.y - centerY, parentDoc.x - centerX) + 0.7
        : (idx / Math.max(projects.length, 1)) * Math.PI * 2;
      const dist = parentDoc ? 150 + pseudoRandom(idx + 31) * 60 : 220;

      const x = parentDoc ? parentDoc.x + Math.cos(baseAngle) * dist : centerX + Math.cos(baseAngle) * dist;
      const y = parentDoc ? parentDoc.y + Math.sin(baseAngle) * dist : centerY + Math.sin(baseAngle) * dist;

      const node: GraphNode = {
        id: proj.id,
        title: proj.name,
        type: "project",
        subtitle: `Project • Status: ${proj.status || "active"}`,
        content: `Project: ${proj.name}. Tracked and governed in the Work Hub.`,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 12,
        color: "#e4e4e7", // Off-white zinc
        secondaryColor: "#a1a1aa",
        glowColor: "rgba(228, 228, 231, 0.2)",
        phase: (idx + 10) * 1.5,
      };
      newNodes.push(node);

      if (parentDoc) {
        newLinks.push({
          source: node.id,
          target: parentDoc.id,
          strength: 0.75,
          distance: 180,
          speed: 0.4,
          pulsePhase: pseudoRandom(idx + 50) * Math.PI * 2,
        });
      }
    });

    // 3. Extracted Concepts / Knowledge Chunks (Clustered around source documents)
    knowledgeItems.slice(0, 18).forEach((k, idx) => {
      const title = k.title || (k.content.length > 28 ? `${k.content.slice(0, 28)}...` : k.content);

      let parentDoc = docNodes.find(
        (d) => k.document_title && d.title.toLowerCase().includes(k.document_title.toLowerCase())
      );
      if (!parentDoc && docNodes.length > 0) {
        parentDoc = docNodes[idx % docNodes.length];
      }

      const angle = (idx * 1.1) + pseudoRandom(idx + 12);
      const dist = 100 + pseudoRandom(idx + 88) * 60;
      const x = parentDoc ? parentDoc.x + Math.cos(angle) * dist : centerX + Math.cos(angle) * (180 + dist);
      const y = parentDoc ? parentDoc.y + Math.sin(angle) * dist : centerY + Math.sin(angle) * (180 + dist);

      const node: GraphNode = {
        id: k.id,
        title,
        type: "concept",
        subtitle: `${k.knowledge_type} • ${Math.round((k.confidence || 1) * 100)}% Match`,
        content: k.content,
        confidence: k.confidence || 1,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 8,
        color: "#a1a1aa", // Neutral zinc-400
        secondaryColor: "#52525b",
        glowColor: "rgba(161, 161, 170, 0.15)",
        phase: idx * 0.9,
      };
      newNodes.push(node);

      if (parentDoc) {
        newLinks.push({
          source: node.id,
          target: parentDoc.id,
          strength: 0.85,
          distance: 120,
          speed: 0.5,
          pulsePhase: pseudoRandom(idx + 100) * Math.PI * 2,
        });
      }

      if (idx > 0 && idx % 3 === 0) {
        const prevConcept = newNodes[newNodes.length - 2];
        if (prevConcept && prevConcept.type === "concept") {
          newLinks.push({
            source: node.id,
            target: prevConcept.id,
            strength: 0.35,
            distance: 90,
            speed: 0.3,
            pulsePhase: pseudoRandom(idx + 200) * Math.PI * 2,
          });
        }
      }
    });

    // 4. Invariant Memories / Axioms
    memories.forEach((mem, idx) => {
      const title = mem.content.length > 32 ? `${mem.content.slice(0, 32)}...` : mem.content;
      const anchorNode = docNodes.length > 0 ? docNodes[idx % docNodes.length] : null;
      const angle = (idx * 1.6) + 2.0;
      const dist = 120 + pseudoRandom(idx + 44) * 55;
      const x = anchorNode ? anchorNode.x + Math.cos(angle) * dist : centerX + Math.cos(angle) * 200;
      const y = anchorNode ? anchorNode.y + Math.sin(angle) * dist : centerY + Math.sin(angle) * 200;

      const node: GraphNode = {
        id: mem.id,
        title,
        type: "memory",
        subtitle: `${mem.memory_type || "Rule"}`,
        content: mem.content,
        confidence: mem.confidence || 0.95,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 9,
        color: "#d4d4d8", // Light zinc
        secondaryColor: "#71717a",
        glowColor: "rgba(212, 212, 216, 0.18)",
        phase: (idx + 5) * 1.1,
      };
      newNodes.push(node);

      if (anchorNode) {
        newLinks.push({
          source: node.id,
          target: anchorNode.id,
          strength: 0.65,
          distance: 140,
          speed: 0.42,
          pulsePhase: pseudoRandom(idx + 300) * Math.PI * 2,
        });
      }
    });

    // 5. Action Proposals (Pending Impulses)
    proposals.slice(0, 4).forEach((prop, idx) => {
      const anchorNode = docNodes[idx % Math.max(docNodes.length, 1)] || null;
      const angle = idx * 1.8 + 0.8;
      const dist = 110 + idx * 30;
      const x = anchorNode ? anchorNode.x + Math.cos(angle) * dist : centerX + Math.cos(angle) * 180;
      const y = anchorNode ? anchorNode.y + Math.sin(angle) * dist : centerY + Math.sin(angle) * 180;

      const node: GraphNode = {
        id: prop.id,
        title: prop.action_type ? prop.action_type.replace(/_/g, " ") : "Action Proposal",
        type: "proposal",
        subtitle: "Pending Decision",
        content: prop.reason || "Action proposal awaiting executive review.",
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 9,
        color: "#e4e4e7",
        secondaryColor: "#71717a",
        glowColor: "rgba(228, 228, 231, 0.2)",
        phase: (idx + 15) * 1.4,
      };
      newNodes.push(node);

      if (anchorNode) {
        newLinks.push({
          source: node.id,
          target: anchorNode.id,
          strength: 0.7,
          distance: 130,
          speed: 0.55,
          pulsePhase: pseudoRandom(idx + 400) * Math.PI * 2,
        });
      }
    });

    // Fallback if empty space: create a delicate starter network
    if (newNodes.length === 0) {
      const sampleNodes = [
        { id: "s-core", title: "Workspace Neural Cortex", type: "document" as const, x: centerX, y: centerY, radius: 13, color: "#38bdf8", secondaryColor: "#0284c7", glowColor: "rgba(56, 189, 248, 0.45)" },
        { id: "s-1", title: "Grounded Knowledge", type: "concept" as const, x: centerX - 100, y: centerY - 60, radius: 8, color: "#818cf8", secondaryColor: "#4f46e5", glowColor: "rgba(129, 140, 248, 0.4)" },
        { id: "s-2", title: "Autonomous Planning", type: "project" as const, x: centerX + 110, y: centerY - 40, radius: 11, color: "#34d399", secondaryColor: "#059669", glowColor: "rgba(52, 211, 153, 0.45)" },
        { id: "s-3", title: "Invariant Memory", type: "memory" as const, x: centerX - 40, y: centerY + 110, radius: 8.5, color: "#c084fc", secondaryColor: "#9333ea", glowColor: "rgba(192, 132, 252, 0.45)" },
      ];
      sampleNodes.forEach((s, idx) => {
        newNodes.push({
          ...s,
          subtitle: "Workspace Substrate",
          content: "Living synaptic network representing connected workspace intelligence.",
          vx: 0,
          vy: 0,
          phase: idx * 1.2,
        });
      });
      newLinks.push(
        { source: "s-core", target: "s-1", strength: 0.8, distance: 110, speed: 0.4, pulsePhase: 0 },
        { source: "s-core", target: "s-2", strength: 0.75, distance: 130, speed: 0.4, pulsePhase: 1 },
        { source: "s-core", target: "s-3", strength: 0.7, distance: 110, speed: 0.4, pulsePhase: 2 },
        { source: "s-1", target: "s-3", strength: 0.4, distance: 100, speed: 0.3, pulsePhase: 3 }
      );
    }

    nodesRef.current = newNodes;
    linksRef.current = newLinks;
  }, [documents, memories, knowledgeItems, projects, proposals]);

  // Main Canvas Rendering Loop with Organic Synaptic Physics & Bioluminescent Aesthetics
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
      const dust = ambientDustRef.current;
      const width = canvas.parentElement?.clientWidth || 1000;
      const height = canvas.parentElement?.clientHeight || 700;
      const centerX = width / 2;
      const centerY = height / 2;

      timeRef.current += 0.016;
      const t = timeRef.current;

      // ---- 1. ORGANIC SYNAPTIC PHYSICS ----
      if (isPhysicsRunning && nodes.length > 0) {
        // A. Soft Repulsion (Electrostatic & Collision Avoidance)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const na = nodes[i];
            const nb = nodes[j];
            const dx = nb.x - na.x;
            const dy = nb.y - na.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            const idealMinDist = na.radius + nb.radius + 35;
            if (dist < 320) {
              const strength = dist < idealMinDist ? 360 : 90;
              const force = strength / (distSq + 50);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (!na.isDragging) {
                na.vx -= fx;
                na.vy -= fy;
              }
              if (!nb.isDragging) {
                nb.vx += fx;
                nb.vy += fy;
              }
            }
          }
        }

        // B. Synaptic Spring Attraction (Hooke's Elastic Links)
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));
        for (const link of links) {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);
          if (!source || !target) continue;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const delta = dist - link.distance;
          const force = delta * 0.0028 * link.strength;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!source.isDragging) {
            source.vx += fx;
            source.vy += fy;
          }
          if (!target.isDragging) {
            target.vx -= fx;
            target.vy -= fy;
          }
        }

        // C. Soft Center Gravitational Well + Living Harmonic Oscillation (Breathing)
        for (const node of nodes) {
          if (node.isDragging) continue;

          // Gentle pull toward center
          const cdx = centerX - node.x;
          const cdy = centerY - node.y;
          node.vx += cdx * 0.00045;
          node.vy += cdy * 0.00045;

          // Biological harmonic breathing (micro-drift so network feels organically alive)
          const breathX = Math.sin(t * 0.9 + node.phase) * 0.08;
          const breathY = Math.cos(t * 0.8 + node.phase * 1.3) * 0.08;
          node.vx += breathX;
          node.vy += breathY;

          // Velocity Damping
          node.vx *= 0.90;
          node.vy *= 0.90;

          // Position Update
          node.x += node.vx;
          node.y += node.vy;
        }
      }

      // Update Ambient Dust
      for (const d of dust) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -300) d.x = width + 300;
        if (d.x > width + 300) d.x = -300;
        if (d.y < -300) d.y = height + 300;
        if (d.y > height + 300) d.y = -300;
      }

      // ---- 2. RENDER PASS ----
      const dpr = window.devicePixelRatio || 1;
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;

      ctx.clearRect(0, 0, viewW, viewH);

      // Deep Neural Matrix Atmosphere
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        100,
        centerX,
        centerY,
        Math.max(viewW, viewH) * 0.85
      );
      bgGrad.addColorStop(0, "#080a14");
      bgGrad.addColorStop(0.6, "#05060b");
      bgGrad.addColorStop(1, "#030305");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      const { x: panX, y: panY, scale } = transformRef.current;
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      // Ambient Floating Synaptic Dust
      for (const d of dust) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 180, 252, ${d.alpha})`;
        ctx.fill();
      }

      // Determine active / focused node for synaptic activation cascade
      const activeHoverId = hoveredNodeRef.current?.id || null;
      const activeFocusId = selectedNodeId || activeHoverId;

      // Find all 1-hop connected neighbors of active node
      const connectedNodeIds = new Set<string>();
      if (activeFocusId) {
        connectedNodeIds.add(activeFocusId);
        for (const link of links) {
          if (link.source === activeFocusId) connectedNodeIds.add(link.target);
          if (link.target === activeFocusId) connectedNodeIds.add(link.source);
        }
      }

      const q = searchQuery.toLowerCase().trim();
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // ---- 3. DRAW SYNAPTIC AXONS (LINKS) ----
      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) continue;

        const isConnectedToFocus =
          activeFocusId &&
          (source.id === activeFocusId || target.id === activeFocusId);
        const isHovered =
          activeHoverId &&
          (source.id === activeHoverId || target.id === activeHoverId);

        // Alpha & Line width
        let linkAlpha = 0.16;
        let lineWidth = 1.0;

        if (isConnectedToFocus || isHovered) {
          linkAlpha = 0.85;
          lineWidth = 2.0;
        } else if (activeFocusId) {
          linkAlpha = 0.05; // Dim unconnected links
        }

        // Synaptic line with soft gradient
        const lineGrad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        lineGrad.addColorStop(0, source.color);
        lineGrad.addColorStop(1, target.color);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        ctx.save();
        ctx.globalAlpha = linkAlpha;
        ctx.strokeStyle = isConnectedToFocus ? lineGrad : "rgba(148, 163, 184, 0.2)";
        ctx.lineWidth = lineWidth;
        if (isConnectedToFocus) {
          ctx.shadowColor = source.color;
          ctx.shadowBlur = 8;
        }
        ctx.stroke();
        ctx.restore();

        // Action Potential Signal Pulse (Flowing electric impulse across synapse)
        const progress = ((t * link.speed + link.pulsePhase) % 1);
        const px = source.x + (target.x - source.x) * progress;
        const py = source.y + (target.y - source.y) * progress;

        const pulseAlpha = isConnectedToFocus ? 0.95 : activeFocusId ? 0.1 : 0.6;

        ctx.save();
        ctx.globalAlpha = pulseAlpha;
        ctx.beginPath();
        ctx.arc(px, py, isConnectedToFocus ? 2.5 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = source.color;
        ctx.shadowColor = source.color;
        ctx.shadowBlur = isConnectedToFocus ? 8 : 4;
        ctx.fill();
        ctx.restore();
      }

      // ---- 4. DRAW NEURONS (NODES) ----
      for (const node of nodes) {
        const isSelected = selectedNodeId === node.id;
        const isHovered = activeHoverId === node.id;
        const isNeighbor = connectedNodeIds.has(node.id);

        const matchesQuery =
          !q ||
          node.title.toLowerCase().includes(q) ||
          (node.subtitle && node.subtitle.toLowerCase().includes(q));
        const matchesFilter =
          activeFilter === "all" || node.type === activeFilter;

        // Cascade dimming
        let nodeAlpha = 1.0;
        if (!matchesQuery || !matchesFilter) {
          nodeAlpha = 0.12;
        } else if (activeFocusId && !isNeighbor) {
          nodeAlpha = 0.2;
        }

        ctx.save();
        ctx.globalAlpha = nodeAlpha;

        // A. Bioluminescent Outer Aura (Soft Neural Halo)
        const haloRadius = node.radius + (isSelected ? 22 : isHovered ? 16 : 9);
        const haloGrad = ctx.createRadialGradient(
          node.x,
          node.y,
          node.radius * 0.3,
          node.x,
          node.y,
          haloRadius
        );
        haloGrad.addColorStop(0, node.glowColor);
        haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();

        // B. Living Organic Pulse Ring (Gentle breathing ring around node)
        const pulseWave = (Math.sin(t * 1.5 + node.phase) + 1) * 0.5;
        if (node.type === "document" || isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 3 + pulseWave * 3, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? "#ffffff" : node.color;
          ctx.lineWidth = isSelected ? 1.5 : 1;
          ctx.globalAlpha = nodeAlpha * (isSelected ? 0.8 : 0.35 + pulseWave * 0.25);
          ctx.stroke();
          ctx.globalAlpha = nodeAlpha;
        }

        // C. Neuron Soma (Core Body)
        const somaGrad = ctx.createRadialGradient(
          node.x - node.radius * 0.25,
          node.y - node.radius * 0.25,
          node.radius * 0.1,
          node.x,
          node.y,
          node.radius
        );
        somaGrad.addColorStop(0, "#ffffff");
        somaGrad.addColorStop(0.35, node.color);
        somaGrad.addColorStop(1, node.secondaryColor);

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = somaGrad;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected ? 16 : isHovered ? 12 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // D. Bright Nucleus Dot
        ctx.beginPath();
        ctx.arc(node.x - node.radius * 0.2, node.y - node.radius * 0.2, node.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();

        // E. Elegant Floating Typography Labels
        const shouldShowLabel =
          node.type === "document" ||
          node.type === "project" ||
          isSelected ||
          isHovered ||
          isNeighbor ||
          scale > 1.25;

        if (shouldShowLabel && nodeAlpha > 0.3) {
          const rawText = node.title;
          const labelText =
            isSelected || isHovered
              ? rawText
              : rawText.length > 20
              ? `${rawText.slice(0, 20)}…`
              : rawText;

          ctx.font =
            isSelected || isHovered
              ? "600 11px system-ui, -apple-system, sans-serif"
              : "500 10px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textWidth = ctx.measureText(labelText).width;
          const badgeW = textWidth + 14;
          const badgeH = 18;
          const badgeX = node.x - badgeW / 2;
          const badgeY = node.y + node.radius + 6;

          // Frosted Glass Label Underlay
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
          ctx.fillStyle = isSelected
            ? "rgba(15, 23, 42, 0.95)"
            : isHovered
            ? "rgba(15, 23, 42, 0.9)"
            : "rgba(8, 10, 18, 0.75)";
          ctx.fill();

          ctx.strokeStyle = isSelected
            ? "rgba(255, 255, 255, 0.4)"
            : isHovered
            ? node.color
            : "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Text with Crisp Contrast
          ctx.fillStyle = isSelected
            ? "#ffffff"
            : isHovered
            ? "#f8fafc"
            : "rgba(226, 232, 240, 0.85)";
          ctx.fillText(labelText, node.x, badgeY + badgeH / 2);
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
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 10) {
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
      setActiveNode(hit);
      if (onSelectNode) onSelectNode(hit);
    } else if (isPanningRef.current) {
      isPanningRef.current = false;
    } else {
      const { x, y } = getGraphCoords(e.clientX, e.clientY);
      const hit = getNodeAt(x, y);
      setActiveNode(hit);
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
      const newScale = Math.max(0.35, Math.min(3.5, prev.scale * zoomFactor));
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
      scale: Math.max(0.35, prev.scale * 0.8),
    }));
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#030305] select-none overflow-hidden">
      {/* Interactive Top Glass HUD Overlay */}
      <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between gap-4 pointer-events-none">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0a0a0a] border border-white/[0.08] shadow-xl pointer-events-auto">
          {[
            { id: "all", label: "All", count: nodesRef.current.length },
            { id: "document", label: "Documents", count: documents.length, color: "#ffffff" },
            { id: "memory", label: "Rules", count: memories.length, color: "#d4d4d8" },
            { id: "concept", label: "Concepts", count: knowledgeItems.length, color: "#a1a1aa" },
            { id: "project", label: "Projects", count: projects.length, color: "#e4e4e7" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-white/10 text-white font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {tab.color && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: tab.color }}
                />
              )}
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono text-zinc-500">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Right: Search & Viewport Tools */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search map..."
              className="w-44 pl-8 pr-3 py-1.5 rounded-xl bg-[#0a0a0a] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-[#0a0a0a] border border-white/[0.08] text-zinc-400">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Recenter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-white/10 mx-1" />
            <button
              onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isPhysicsRunning ? "text-zinc-300 hover:bg-white/[0.06]" : "text-zinc-500 hover:bg-white/[0.06]"
              }`}
              title={isPhysicsRunning ? "Pause Physics" : "Resume Physics"}
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

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-5 left-6 z-20 flex items-center gap-3 text-[11px] font-mono text-zinc-400 bg-[#0a0a0a] px-3 py-1.5 rounded-xl border border-white/[0.08]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>Documents</span>
        </span>
        <span className="text-zinc-600">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
          <span>Rules</span>
        </span>
        <span className="text-zinc-600">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          <span>Projects</span>
        </span>
        <span className="text-zinc-600">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          <span>Concepts</span>
        </span>
      </div>

      {/* Floating Node Inspection Card */}
      {activeNode && (
        <div className="absolute bottom-5 right-6 z-20 w-80 p-4 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: activeNode.color }}
              />
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                {activeNode.type}
              </span>
            </div>
            <button
              onClick={() => setActiveNode(null)}
              className="text-slate-500 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h3 className="text-xs font-semibold text-white leading-snug">
            {activeNode.title}
          </h3>

          {activeNode.subtitle && (
            <p className="text-[10px] font-mono text-slate-400">
              {activeNode.subtitle}
            </p>
          )}

          {activeNode.content && (
            <p className="text-[11px] text-slate-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
              {activeNode.content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
