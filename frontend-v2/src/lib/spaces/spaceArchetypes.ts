import { Space } from "@/types/api";

export type SpaceArchetypeId = "study" | "tasks" | "research" | "executive" | "custom";

export interface SpaceArchetype {
  id: SpaceArchetypeId;
  name: string;
  badge: string;
  icon: string;
  color: string;
  description: string;
  placeholderName: string;
  starterAxioms: string[];
  samplePrompts: string[];
  features: string[];
}

export const SPACE_ARCHETYPES: Record<SpaceArchetypeId, SpaceArchetype> = {
  study: {
    id: "study",
    name: "Study & Academics",
    badge: "STUDY & ACADEMICS",
    icon: "📚",
    color: "#f59e0b", // Amber
    description: "Lecture notes, textbook ingestion, syllabus tracking, and exam preparation.",
    placeholderName: "e.g. Advanced Distributed Systems",
    starterAxioms: [
      "Definitions, formulas, and theorems from syllabus documents must be strictly grounded.",
      "Synthesize lecture notes and readings with citations to specific sections.",
    ],
    samplePrompts: [
      "Quiz me on the core concepts from my ingested notes",
      "Synthesize lecture readings into a structured revision guide",
      "Explain the fundamental theorem with step-by-step examples",
    ],
    features: ["Textbook chunking", "Flashcard synthesis", "Exam practice"],
  },
  tasks: {
    id: "tasks",
    name: "Tasks & Execution",
    badge: "TASK & SPRINT EXECUTION",
    icon: "⚡",
    color: "#10b981", // Emerald
    description: "Engineering sprints, actionable project deliverables, bug trackers, and milestones.",
    placeholderName: "e.g. Core Engine & API Sprint 42",
    starterAxioms: [
      "Deliverables require verifiable success criteria and measurable milestones.",
      "Identify and surface blocking dependencies before starting execution.",
    ],
    samplePrompts: [
      "Break down this deliverable into 5 actionable milestones",
      "Audit open initiatives and identify critical path blockers",
      "Draft an engineering execution spec with verification steps",
    ],
    features: ["Milestone tracking", "Actionable proposals", "Velocity analytics"],
  },
  research: {
    id: "research",
    name: "Deep Research",
    badge: "DEEP RESEARCH & ANALYSIS",
    icon: "🔬",
    color: "#06b6d4", // Cyan
    description: "Academic literature reviews, technical papers, thesis investigation, and cross-source analysis.",
    placeholderName: "e.g. Autonomous Agent Architectures Review",
    starterAxioms: [
      "Factual claims require corroboration across multiple source papers.",
      "Highlight conflicting methodologies and benchmark discrepancies.",
    ],
    samplePrompts: [
      "Synthesize key findings across all ingested papers",
      "Compare methodologies and benchmark trade-offs",
      "Map conceptual linkages in the neural graph",
    ],
    features: ["Multi-paper synthesis", "Contradiction detection", "Concept mapping"],
  },
  executive: {
    id: "executive",
    name: "Executive Strategy",
    badge: "EXECUTIVE STRATEGY",
    icon: "💼",
    color: "#8b5cf6", // Violet
    description: "Product roadmaps, OKR tracking, strategic decisions, and governance audit trails.",
    placeholderName: "e.g. 2026 Company Strategy & OKRs",
    starterAxioms: [
      "Decisions require explicit trade-off rationale and expected outcome metrics.",
      "Ensure all tactical projects align with quarterly strategic objectives.",
    ],
    samplePrompts: [
      "Draft a quarterly executive summary from recent milestones",
      "Audit authorized decisions against strategic roadmaps",
      "Prepare an operational briefing on team velocity",
    ],
    features: ["Decision governance", "Roadmap tracking", "Audit trails"],
  },
  custom: {
    id: "custom",
    name: "Sovereign Workspace",
    badge: "SOVEREIGN WORKSPACE",
    icon: "🧠",
    color: "#6366f1", // Indigo
    description: "General-purpose cognitive workspace for autonomous reasoning and knowledge management.",
    placeholderName: "e.g. Sovereign Intelligence Layer",
    starterAxioms: [
      "All actions must be provably grounded in ingested evidence.",
    ],
    samplePrompts: [
      "Investigate recent workspace updates and propose next steps",
      "Explore neural graph connections across topics",
    ],
    features: ["Custom workflows", "Flexible grounding", "Autonomous reasoning"],
  },
};

export function getSpaceArchetype(space: Space | null | undefined): SpaceArchetype {
  if (!space) return SPACE_ARCHETYPES.custom;

  // 1. Direct match on icon
  if (space.icon) {
    if (space.icon.includes("📚") || space.icon === "study" || space.icon === "book") return SPACE_ARCHETYPES.study;
    if (space.icon.includes("⚡") || space.icon === "tasks" || space.icon === "task" || space.icon === "zap") return SPACE_ARCHETYPES.tasks;
    if (space.icon.includes("🔬") || space.icon === "research" || space.icon === "flask") return SPACE_ARCHETYPES.research;
    if (space.icon.includes("💼") || space.icon === "executive" || space.icon === "strategy" || space.icon === "briefcase") return SPACE_ARCHETYPES.executive;
  }

  // 2. Fallback heuristic on name and description
  const text = `${space.name} ${space.description || ""}`.toLowerCase();
  if (text.includes("study") || text.includes("course") || text.includes("exam") || text.includes("lecture") || text.includes("academic") || text.includes("student")) {
    return SPACE_ARCHETYPES.study;
  }
  if (text.includes("task") || text.includes("sprint") || text.includes("todo") || text.includes("dev") || text.includes("project") || text.includes("bug")) {
    return SPACE_ARCHETYPES.tasks;
  }
  if (text.includes("research") || text.includes("paper") || text.includes("thesis") || text.includes("literature") || text.includes("science")) {
    return SPACE_ARCHETYPES.research;
  }
  if (text.includes("strategy") || text.includes("exec") || text.includes("roadmap") || text.includes("okr") || text.includes("business") || text.includes("company")) {
    return SPACE_ARCHETYPES.executive;
  }

  return SPACE_ARCHETYPES.custom;
}

export function resolveSpaceIcon(icon?: string | null, fallback?: string): string {
  if (!icon) return fallback || "🧠";
  const trimmed = icon.trim().toLowerCase();
  if (trimmed === "folder" || trimmed === "default") return "📁";
  if (trimmed === "study" || trimmed === "book") return "📚";
  if (trimmed === "tasks" || trimmed === "task" || trimmed === "zap") return "⚡";
  if (trimmed === "research" || trimmed === "flask") return "🔬";
  if (trimmed === "executive" || trimmed === "strategy" || trimmed === "briefcase") return "💼";
  return icon;
}

