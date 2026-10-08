import {
  SpaceCockpitData,
  GoalData,
  ReflectionItem,
  KnowledgeItemData,
} from "./api";

export type DecisionNodeType =
  | "GOAL"
  | "PRIORITY"
  | "BLOCKER"
  | "DECISION"
  | "RISK"
  | "KNOWLEDGE_GAP"
  | "NEXT_ACTION"
  | "DEPENDENCY";

export interface DecisionEvidenceItem {
  id: string;
  title: string;
  type: string; // document, note, task, reflection, memory
  snippet?: string;
  createdAt?: string;
}

export interface DecisionNode {
  id: string;
  type: DecisionNodeType;
  layer: 1 | 2 | 3; // Layer 1: Goal/Priority, Layer 2: Blocker/Decision/Risk/Gap, Layer 3: Next Action/Dependency
  title: string;
  subtitle?: string;
  whyItMatters: string;
  urgency: "critical" | "high" | "medium";
  impact: "high" | "medium" | "low";
  confidence: number;
  evidenceCount: number;
  evidenceItems: DecisionEvidenceItem[];
  action?: {
    label: string;
    actionType: string;
    targetId?: string;
    payload?: any;
  };
  x: number;
  y: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface DecisionConnection {
  fromId: string;
  toId: string;
  label?: string;
  style?: "solid" | "dashed";
}

export interface DecisionMapSurface {
  nodes: DecisionNode[];
  connections: DecisionConnection[];
  hasSignal: boolean;
  totalSupportingEvidence: number;
}

export const DECISION_NODE_STYLES: Record<
  DecisionNodeType,
  { color: string; borderColor: string; bgColor: string; badgeLabel: string }
> = {
  GOAL: {
    color: "#EC4899",
    borderColor: "#DB2777",
    bgColor: "rgba(236, 72, 153, 0.12)",
    badgeLabel: "ACTIVE GOAL",
  },
  PRIORITY: {
    color: "#10B981",
    borderColor: "#059669",
    bgColor: "rgba(16, 185, 129, 0.12)",
    badgeLabel: "CORE PRIORITY",
  },
  BLOCKER: {
    color: "#EF4444",
    borderColor: "#DC2626",
    bgColor: "rgba(239, 68, 68, 0.14)",
    badgeLabel: "CRITICAL BLOCKER",
  },
  DECISION: {
    color: "#8B5CF6",
    borderColor: "#7C3AED",
    bgColor: "rgba(139, 92, 246, 0.14)",
    badgeLabel: "PENDING DECISION",
  },
  RISK: {
    color: "#F59E0B",
    borderColor: "#D97706",
    bgColor: "rgba(245, 158, 11, 0.14)",
    badgeLabel: "AGENT-DETECTED RISK",
  },
  KNOWLEDGE_GAP: {
    color: "#38BDF8",
    borderColor: "#0284C7",
    bgColor: "rgba(56, 189, 248, 0.12)",
    badgeLabel: "KNOWLEDGE GAP",
  },
  NEXT_ACTION: {
    color: "#6366F1",
    borderColor: "#4F46E5",
    bgColor: "rgba(99, 102, 241, 0.14)",
    badgeLabel: "NEXT BEST MOVE",
  },
  DEPENDENCY: {
    color: "#E2E8F0",
    borderColor: "#94A3B8",
    bgColor: "rgba(148, 163, 184, 0.12)",
    badgeLabel: "KEY DEPENDENCY",
  },
};

/**
 * Derives a curated Decision Map surface from raw Space intelligence.
 * Capped strictly at MAX_VISIBLE_NODES = 7 (preferred 4-6 nodes).
 * Organizes nodes in a 3-layer briefing topology:
 *
 *               [ LAYER 1: CURRENT GOAL / PRIORITY ]
 *                               │
 *          ┌────────────────────┼────────────────────┐
 *          ▼                    ▼                    ▼
 *     [ BLOCKER ]          [ DECISION ]         [ RISK / GAP ]
 *          └────────────────────┬────────────────────┘
 *                               ▼
 *                    [ LAYER 3: NEXT ACTION ]
 */
export function deriveDecisionMapSurface(params: {
  cockpit?: SpaceCockpitData | null;
  goals?: GoalData[];
  decisions?: Array<{ id: string; content?: string; created_at?: string }>;
  reflections?: ReflectionItem[];
  documents?: any[];
  knowledgeItems?: KnowledgeItemData[];
  spaceName?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}): DecisionMapSurface {
  const {
    cockpit,
    goals = [],
    decisions = [],
    reflections = [],
    documents = [],
    knowledgeItems = [],
    spaceName = "Workspace",
    canvasWidth = 720,
    canvasHeight = 460,
  } = params;

  const totalRawCount = documents.length + knowledgeItems.length;

  // Build raw evidence bank
  const evidencePool: DecisionEvidenceItem[] = [];
  documents.forEach((d) => {
    evidencePool.push({
      id: d.id || `doc-${Math.random()}`,
      title: d.title || "Indexed Document",
      type: "document",
      snippet: `Indexed document (${d.chunk_count || 1} chunks).`,
      createdAt: d.created_at,
    });
  });
  knowledgeItems.forEach((k) => {
    evidencePool.push({
      id: k.id || `k-${Math.random()}`,
      title: k.title || (k.content ? k.content.slice(0, 32) + "..." : "Knowledge Note"),
      type: "note",
      snippet: k.content,
      createdAt: k.created_at,
    });
  });

  const layer1Nodes: DecisionNode[] = [];
  const layer2Nodes: DecisionNode[] = [];
  const layer3Nodes: DecisionNode[] = [];

  // =========================================================================
  // LAYER 1: CURRENT GOAL OR PRIORITY (Top Anchor)
  // =========================================================================
  const activeGoals = goals.filter((g) => g.status !== "completed");
  const primaryGoal = activeGoals[0];

  if (cockpit?.right_now) {
    const rn = cockpit.right_now;
    const rnEvidence = (rn.evidence || []).map((e, idx) => ({
      id: e.id || `rn-e-${idx}`,
      title: e.title,
      type: e.type,
      snippet: e.snippet,
    }));
    // Merge general evidence count
    const matchedEvidence = [...rnEvidence, ...evidencePool.slice(0, Math.min(6, evidencePool.length))];

    layer1Nodes.push({
      id: "node-l1-priority",
      type: "PRIORITY",
      layer: 1,
      title: rn.headline || "Active Domain Focus",
      subtitle: rn.source_context || "System Focus",
      whyItMatters: rn.why_it_matters || "Identified as the highest-leverage priority for workspace progression.",
      urgency: (rn.urgency as string) === "high" ? "high" : "medium",
      impact: "high",
      confidence: 0.95,
      evidenceCount: Math.max(rnEvidence.length, Math.min(totalRawCount, 12)),
      evidenceItems: matchedEvidence,
      action: rn.recommended_action
        ? {
            label: rn.recommended_action.label || "Execute Focus Move",
            actionType: rn.recommended_action.action_type,
            targetId: rn.recommended_action.target_id,
            payload: rn.recommended_action.payload,
          }
        : undefined,
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.PRIORITY,
    });
  } else if (primaryGoal) {
    const uncompletedTasks = (primaryGoal.tasks || []).filter((t) => !t.completed);
    layer1Nodes.push({
      id: "node-l1-goal",
      type: "GOAL",
      layer: 1,
      title: primaryGoal.description,
      subtitle: `${uncompletedTasks.length} active tasks remaining`,
      whyItMatters: `Primary focus for ${spaceName}. Progress directly drives active workspace objectives.`,
      urgency: primaryGoal.priority === "high" ? "high" : "medium",
      impact: "high",
      confidence: 0.92,
      evidenceCount: Math.max(uncompletedTasks.length, Math.min(totalRawCount, 8)),
      evidenceItems: evidencePool.slice(0, 5),
      action: {
        label: "Manage Goal Execution",
        actionType: "navigate",
        targetId: primaryGoal.id,
      },
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.GOAL,
    });
  } else if (totalRawCount > 0) {
    layer1Nodes.push({
      id: "node-l1-fallback",
      type: "PRIORITY",
      layer: 1,
      title: `${spaceName} Intelligence Synthesis`,
      subtitle: `${totalRawCount} knowledge assets active`,
      whyItMatters: `Synthesized intelligence ready for decision execution across ${spaceName}.`,
      urgency: "medium",
      impact: "medium",
      confidence: 0.88,
      evidenceCount: totalRawCount,
      evidenceItems: evidencePool.slice(0, 6),
      action: {
        label: "Synthesize Space Plan",
        actionType: "chat",
      },
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.PRIORITY,
    });
  }

  // =========================================================================
  // LAYER 2: BLOCKERS, DECISIONS, RISKS & GAPS (Middle Layer - Max 3 nodes)
  // =========================================================================

  // Candidate A: BLOCKER (from open loops or uncompleted high-priority task)
  const openLoops = cockpit?.open_loops || [];
  const primaryLoop = openLoops[0];
  if (primaryLoop) {
    layer2Nodes.push({
      id: "node-l2-blocker",
      type: "BLOCKER",
      layer: 2,
      title: primaryLoop.title,
      subtitle: primaryLoop.context || "Unresolved workspace loop",
      whyItMatters: `Direct blocker delaying goal completion. Requires human resolution or verification.`,
      urgency: "critical",
      impact: "high",
      confidence: 0.94,
      evidenceCount: Math.max(1, Math.min(evidencePool.length, 4)),
      evidenceItems: evidencePool.slice(0, 3),
      action: {
        label: primaryLoop.action?.label || "Resolve Blocker",
        actionType: primaryLoop.action?.action_type || "complete_task",
        targetId: primaryLoop.action?.target_id || primaryLoop.id,
        payload: primaryLoop.action?.payload,
      },
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.BLOCKER,
    });
  } else {
    // Check if goal has incomplete high-priority task
    const highTask = primaryGoal?.tasks?.find((t) => !t.completed && t.priority === "high");
    if (highTask) {
      layer2Nodes.push({
        id: "node-l2-blocker",
        type: "BLOCKER",
        layer: 2,
        title: highTask.title,
        subtitle: "Pending milestone",
        whyItMatters: `Identified as a dependency for completing "${primaryGoal?.description}".`,
        urgency: "high",
        impact: "high",
        confidence: 0.9,
        evidenceCount: Math.min(evidencePool.length, 3),
        evidenceItems: evidencePool.slice(0, 2),
        action: {
          label: "Mark Milestone Done",
          actionType: "complete_task",
          targetId: highTask.id,
        },
        x: 0,
        y: 0,
        ...DECISION_NODE_STYLES.BLOCKER,
      });
    }
  }

  // Candidate B: DECISION (from recorded decisions or architectural choices)
  if (decisions.length > 0) {
    const topDecision = decisions[0];
    layer2Nodes.push({
      id: "node-l2-decision",
      type: "DECISION",
      layer: 2,
      title: topDecision.content ? topDecision.content.slice(0, 48) + "..." : "Active Architectural Decision",
      subtitle: "Recorded Decision",
      whyItMatters: "Governs current implementation path and constraints across codebase and documentation.",
      urgency: "medium",
      impact: "high",
      confidence: 0.92,
      evidenceCount: Math.min(evidencePool.length, 5),
      evidenceItems: evidencePool.slice(0, 3),
      action: {
        label: "Review Decision Trade-offs",
        actionType: "navigate",
        targetId: topDecision.id,
      },
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.DECISION,
    });
  } else if (evidencePool.length > 8) {
    // Clustered Concept Decision
    layer2Nodes.push({
      id: "node-l2-decision",
      type: "DECISION",
      layer: 2,
      title: "Architecture & Implementation Strategy",
      subtitle: `${evidencePool.length} supporting sources`,
      whyItMatters: "Multiple knowledge assets converge on core workspace implementation requirements.",
      urgency: "medium",
      impact: "high",
      confidence: 0.89,
      evidenceCount: evidencePool.length,
      evidenceItems: evidencePool.slice(0, 4),
      action: {
        label: "Evaluate Options",
        actionType: "chat",
      },
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.DECISION,
    });
  }

  // Candidate C: RISK or KNOWLEDGE GAP
  const gaps = cockpit?.knowledge_gaps || [];
  const patterns = cockpit?.mynd_noticed || [];
  const activeReflections = reflections.filter((r) => r.reflection_type === "lesson" || r.reflection_type === "failure_analysis");

  if (patterns.length > 0) {
    const p = patterns[0];
    layer2Nodes.push({
      id: "node-l2-risk",
      type: "RISK",
      layer: 2,
      title: p.title,
      subtitle: p.observation ? p.observation.slice(0, 40) + "..." : "Agent Detected Pattern",
      whyItMatters: p.why_it_matters || "Agent detected potential friction or conflict across workspace premises.",
      urgency: "high",
      impact: "high",
      confidence: p.confidence || 0.88,
      evidenceCount: p.sources_count || 3,
      evidenceItems: (p.evidence || []).map((e, i) => ({
        id: e.id || `pe-${i}`,
        title: e.title,
        type: e.type,
        snippet: e.snippet,
      })),
      action: p.action
        ? {
            label: p.action.label,
            actionType: p.action.action_type,
            targetId: p.action.target_id,
            payload: p.action.payload,
          }
        : undefined,
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.RISK,
    });
  } else if (activeReflections.length > 0) {
    const ref = activeReflections[0];
    layer2Nodes.push({
      id: "node-l2-risk",
      type: "RISK",
      layer: 2,
      title: ref.title,
      subtitle: "Critic Audit Finding",
      whyItMatters: ref.lesson_learned || "Adversarial audit highlighted risk to active execution assumptions.",
      urgency: "high",
      impact: "medium",
      confidence: ref.confidence || 0.9,
      evidenceCount: 2,
      evidenceItems: evidencePool.slice(0, 2),
      action: {
        label: "Inspect Guidance",
        actionType: "chat",
      },
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.RISK,
    });
  } else if (gaps.length > 0) {
    const g = gaps[0];
    layer2Nodes.push({
      id: "node-l2-gap",
      type: "KNOWLEDGE_GAP",
      layer: 2,
      title: `Missing: ${g.known_concept}`,
      subtitle: g.missing_relationship,
      whyItMatters: `Workspace lacks documented relationships for "${g.known_concept}". Hinders autonomous execution.`,
      urgency: "medium",
      impact: "medium",
      confidence: 0.85,
      evidenceCount: g.related_sources?.length || 1,
      evidenceItems: (g.related_sources || []).map((s, idx) => ({
        id: `gap-src-${idx}`,
        title: s,
        type: "source",
      })),
      action: g.suggested_action
        ? {
            label: g.suggested_action.label,
            actionType: g.suggested_action.action_type,
            targetId: g.suggested_action.target_id,
          }
        : undefined,
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.KNOWLEDGE_GAP,
    });
  }

  // =========================================================================
  // LAYER 3: NEXT ACTION OR DEPENDENCY (Bottom Layer - Max 2 nodes)
  // =========================================================================
  if (cockpit?.next_best_move) {
    const nbm = cockpit.next_best_move;
    layer3Nodes.push({
      id: "node-l3-nextaction",
      type: "NEXT_ACTION",
      layer: 3,
      title: nbm.headline,
      subtitle: nbm.expected_impact ? `Impact: ${nbm.expected_impact}` : "Recommended Step",
      whyItMatters: nbm.why_mynd_recommends || "Highest-leverage immediate action calculated by the Second Brain.",
      urgency: "high",
      impact: "high",
      confidence: 0.96,
      evidenceCount: Math.min(evidencePool.length, 4),
      evidenceItems: evidencePool.slice(0, 3),
      action: {
        label: nbm.action?.label || "Execute Next Move",
        actionType: nbm.action?.action_type || "execute",
        targetId: nbm.action?.target_id,
        payload: nbm.action?.payload,
      },
      x: 0,
      y: 0,
      ...DECISION_NODE_STYLES.NEXT_ACTION,
    });
  } else if (primaryGoal?.tasks && primaryGoal.tasks.some((t) => !t.completed)) {
    const nextTask = primaryGoal.tasks.find((t) => !t.completed);
    if (nextTask) {
      layer3Nodes.push({
        id: "node-l3-nextaction",
        type: "NEXT_ACTION",
        layer: 3,
        title: nextTask.title,
        subtitle: `For Goal: ${primaryGoal.description.slice(0, 24)}...`,
        whyItMatters: "Direct operational task ready for execution.",
        urgency: "medium",
        impact: "high",
        confidence: 0.91,
        evidenceCount: Math.min(evidencePool.length, 3),
        evidenceItems: evidencePool.slice(0, 2),
        action: {
          label: "Mark Done",
          actionType: "complete_task",
          targetId: nextTask.id,
        },
        x: 0,
        y: 0,
        ...DECISION_NODE_STYLES.NEXT_ACTION,
      });
    }
  }

  // Hard UI Budget check: MAX 7 visible nodes (preferred 4-6)
  const cappedLayer2 = layer2Nodes.slice(0, 3);
  const cappedLayer3 = layer3Nodes.slice(0, 2);
  const allNodes = [...layer1Nodes, ...cappedLayer2, ...cappedLayer3];

  const hasSignal = allNodes.length > 0;

  // =========================================================================
  // TOPOLOGY POSITIONING (Clean 3-Layer Flow, Generous Negative Space)
  // =========================================================================
  const cx = Math.round(canvasWidth / 2);

  // Layer 1 Coordinates
  const l1Y = 75;
  layer1Nodes.forEach((node) => {
    node.x = cx;
    node.y = l1Y;
  });

  // Layer 2 Coordinates
  const l2Y = 215;
  const l2Count = cappedLayer2.length;
  if (l2Count === 1) {
    cappedLayer2[0].x = cx;
    cappedLayer2[0].y = l2Y;
  } else if (l2Count === 2) {
    cappedLayer2[0].x = cx - 180;
    cappedLayer2[0].y = l2Y;
    cappedLayer2[1].x = cx + 180;
    cappedLayer2[1].y = l2Y;
  } else if (l2Count === 3) {
    cappedLayer2[0].x = cx - 250;
    cappedLayer2[0].y = l2Y;
    cappedLayer2[1].x = cx;
    cappedLayer2[1].y = l2Y;
    cappedLayer2[2].x = cx + 250;
    cappedLayer2[2].y = l2Y;
  }

  // Layer 3 Coordinates
  const l3Y = 355;
  const l3Count = cappedLayer3.length;
  if (l3Count === 1) {
    cappedLayer3[0].x = cx;
    cappedLayer3[0].y = l3Y;
  } else if (l3Count === 2) {
    cappedLayer3[0].x = cx - 140;
    cappedLayer3[0].y = l3Y;
    cappedLayer3[1].x = cx + 140;
    cappedLayer3[1].y = l3Y;
  }

  // =========================================================================
  // CONNECTIONS (Directional Briefing Flow)
  // Layer 1 -> Layer 2 nodes
  // Layer 2 nodes -> Layer 3 nodes
  // =========================================================================
  const connections: DecisionConnection[] = [];
  const anchorNode = layer1Nodes[0];

  if (anchorNode) {
    cappedLayer2.forEach((l2) => {
      connections.push({
        fromId: anchorNode.id,
        toId: l2.id,
        label: l2.type === "BLOCKER" ? "blocked by" : l2.type === "DECISION" ? "requires" : "monitors",
      });
    });
  }

  cappedLayer3.forEach((l3) => {
    if (cappedLayer2.length > 0) {
      // Connect to the most relevant layer 2 node or center node
      const centerOrFirstL2 = cappedLayer2.find((n) => n.type === "DECISION" || n.type === "BLOCKER") || cappedLayer2[0];
      connections.push({
        fromId: centerOrFirstL2.id,
        toId: l3.id,
        label: "resolves via",
      });
    } else if (anchorNode) {
      connections.push({
        fromId: anchorNode.id,
        toId: l3.id,
        label: "next move",
      });
    }
  });

  return {
    nodes: allNodes,
    connections,
    hasSignal,
    totalSupportingEvidence: totalRawCount,
  };
}
