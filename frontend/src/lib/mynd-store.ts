import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface KnowledgeObject {
  id: string;
  title: string;
  type: string;
  updated?: string;
  time?: string;
  connections?: number;
  confidence?: string | number;
  version?: string;
  badge?: string;
  meta?: string;
  tags?: string[];
  summary?: string;
  content?: string;
  keyIdeas?: string[];
  recommendations?: string;
  timeline?: Array<{ event: string; time: string }>;
  versions?: Array<{ version: string; date: string; author: string; summary: string }>;
  canvasPos?: { x: number; y: number };
  iconColor?: string;
  iconBg?: string;
  iconType?: string;
  progress?: number;
  spaceId?: string;
  fileSize?: string;
  chunks?: number;
  vectorsStored?: number;
}

export interface SpaceMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface AgentPersona {
  name: string;
  title: string;
  specialty: string;
  status: "idle" | "indexing" | "synthesizing" | "active";
  avatarBg: string;
}

export interface SpaceGoal {
  title: string;
  progress: number;
}

export interface SpaceSections {
  knowledge?: KnowledgeObject[];
  projects?: KnowledgeObject[];
  meetings?: KnowledgeObject[];
  people?: KnowledgeObject[];
  goals?: KnowledgeObject[];
  activity?: KnowledgeObject[];
  notes?: KnowledgeObject[];
  journals?: KnowledgeObject[];
  habits?: KnowledgeObject[];
}

export interface Space {
  id: string;
  name: string;
  status: string;
  count: number;
  updated: string;
  pinned: boolean;
  desc: string;
  color?: string;
  icon?: string;
  slug?: string;
  goal?: SpaceGoal;
  milestones?: SpaceMilestone[];
  agentPersona?: AgentPersona;
  scratchpad?: string;
  liveUpdate?: { text: string; time: string };
  sections?: SpaceSections;
  objects?: KnowledgeObject[];
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  timezone: string;
  focusDomain: string;
  stats: {
    knowledgeObjects: number;
    connections: number;
    daemonsRunning: number;
    learningHours: string;
  };
}

export interface ActivityItem {
  id: string;
  title: string;
  text: string;
  time: string;
  space: string;
  iconType: string;
  color: string;
  bg: string;
}

export interface MyndState {
  theme: "light" | "dark" | "zen";
  activeRoute: "home" | "workspace" | "space" | "search" | "intelligence" | "vault" | "chat";
  activeSpaceId: string;
  activeSpaceTab: "overview" | "objects" | "graph" | "insights" | "notes" | "journals" | "habits" | "goals" | "timeline";
  activeSpaceSection: string;
  selectedObject: KnowledgeObject | null;
  isObjectModalOpen: boolean;

  isFocusMode: boolean;
  isZenMode: boolean;
  isSpotlightOpen: boolean;
  isAskAiOpen: boolean;
  askAiTarget: string | null;
  isSettingsOpen: boolean;
  activeSettingsTab: "general" | "appearance" | "autonomy" | "storage" | "integrations";

  userProfile: UserProfile;
  spaces: Space[];
  activityFeed: ActivityItem[];
  recentObjects: KnowledgeObject[];
  uploadedDocuments: KnowledgeObject[];
  captureQueue: string[];

  // Actions
  setRoute: (route: MyndState["activeRoute"]) => void;
  selectSpace: (spaceId: string, tab?: MyndState["activeSpaceTab"]) => void;
  setSpaceTab: (tab: MyndState["activeSpaceTab"]) => void;
  setSpaceSection: (section: string) => void;
  setSelectedObject: (obj: KnowledgeObject | null) => void;
  openObjectModal: (obj: KnowledgeObject) => void;
  closeObjectModal: () => void;

  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark" | "zen") => void;
  toggleFocusMode: () => void;
  toggleZenMode: () => void;

  openSpotlight: () => void;
  closeSpotlight: () => void;
  openAskAi: (target?: string) => void;
  closeAskAi: () => void;
  openSettings: (tab?: MyndState["activeSettingsTab"]) => void;
  closeSettings: () => void;

  isCreateSpaceOpen: boolean;
  openCreateSpace: () => void;
  closeCreateSpace: () => void;

  toggleMilestone: (spaceId: string, milestoneId: string) => void;
  addMilestone: (spaceId: string, title: string) => void;
  updateSpaceScratchpad: (spaceId: string, text: string) => void;
  updateSpaceGoal: (spaceId: string, title: string, progress: number) => void;

  setUserProfile: (profile: Partial<UserProfile>) => void;
  addDocument: (doc: {
    id?: string;
    name: string;
    type: string;
    size: string;
    chunks: number;
    vectorsStored?: number;
    spaceId?: string;
    summary?: string;
    content?: string;
  }) => KnowledgeObject;
  addCapturedItem: (text: string, spaceId?: string) => void;
  deleteDocument: (id: string) => void;
  addSpace: (space: {
    name: string;
    desc?: string;
    color?: string;
    id?: string;
    icon?: string;
    goal?: SpaceGoal;
    milestones?: SpaceMilestone[];
    agentPersona?: AgentPersona;
    scratchpad?: string;
  }) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  provisionSpacesFromInterests: (interestIds: string[]) => void;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpaceId: (spaceId: string) => void;
  clearSpaces: () => void;
  clearAllData: () => void;
  loadSampleData: () => void;
}

export interface UserInterestDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  spacesToCreate: Array<{
    id: string;
    name: string;
    desc: string;
    color: string;
    icon: string;
    goalTitle: string;
    agentName: string;
    agentRole: string;
    agentSpecialty: string;
    milestoneTitles: string[];
    scratchpad: string;
  }>;
}

export const PRESET_INTERESTS: UserInterestDefinition[] = [
  {
    id: "engineering",
    title: "Software & Architecture",
    category: "Technical",
    description: "System design, distributed databases, code patterns, and engineering RFCs.",
    icon: "code",
    spacesToCreate: [
      {
        id: "engineering-brain",
        name: "Engineering Brain",
        desc: "Code architectures, technical RFCs, API patterns, and design decisions",
        color: "#FFFFFF",
        icon: "code",
        goalTitle: "Build production-grade distributed architectures",
        agentName: "Systems Architect",
        agentRole: "Staff Engineering Co-pilot",
        agentSpecialty: "Scalable backend systems, API contracts, and concurrency patterns",
        milestoneTitles: [
          "Document core API design standards and rate limiting specs",
          "Synthesize database schema migrations and indexing patterns",
          "Map out distributed microservices topology"
        ],
        scratchpad: "# Engineering Brain\n\n- Focus: High-performance, maintainable distributed systems.\n- Key stack: Next.js, FastAPI, PostgreSQL, Qdrant, Docker.\n- Invariants: Idempotency, zero-downtime migrations, structured logging."
      },
      {
        id: "system-design",
        name: "System Design",
        desc: "High-scale distributed systems, fault tolerance, caching & database schemas",
        color: "#FFFFFF",
        icon: "server",
        goalTitle: "Master Large-Scale Distributed System Patterns",
        agentName: "Cluster Strategist",
        agentRole: "Infrastructure & Scaling Analyst",
        agentSpecialty: "Consensus protocols, caching strategies, and event sourcing",
        milestoneTitles: [
          "Compare Raft vs Paxos trade-offs for distributed consensus",
          "Design multi-region read-replica failover strategy",
          "Benchmark vector retrieval latency under 10k QPS load"
        ],
        scratchpad: "# System Design Knowledge\n\n- Always design for partial failure.\n- Decouple write paths with async event streaming.\n- Optimize Qdrant HNSW parameters for recall vs latency."
      }
    ]
  },
  {
    id: "ai_research",
    title: "AI & Neural Research",
    category: "AI & ML",
    description: "LLMs, vector search, RAG pipelines, autonomous agents, and ML papers.",
    icon: "brain",
    spacesToCreate: [
      {
        id: "ai-research-lab",
        name: "AI Research Lab",
        desc: "Model benchmarks, embedding strategies, attention mechanisms, and research papers",
        color: "#FFFFFF",
        icon: "atom",
        goalTitle: "Track State-of-the-Art Generative & Agentic AI",
        agentName: "Synthesis Fellow",
        agentRole: "AI Research Scientist",
        agentSpecialty: "Dense retrieval, re-ranking benchmarks, and agent reasoning traces",
        milestoneTitles: [
          "Benchmark BGE vs Text-Embedding-3-Small retrieval accuracy",
          "Synthesize paper on speculative decoding speedups",
          "Document agentic tool reflection and self-correction loops"
        ],
        scratchpad: "# AI Research Lab\n\n- Dense embeddings provide semantic clustering, BM25 handles exact symbols.\n- Hybrid search with Reciprocal Rank Fusion (RRF) yields highest overall MRR."
      },
      {
        id: "agentic-workflows",
        name: "Agentic Workflows",
        desc: "Multi-agent orchestration, LangGraph state machines, memory compression & tool use",
        color: "#FFFFFF",
        icon: "sparkles",
        goalTitle: "Deploy Autonomous Multi-Agent Systems",
        agentName: "Orchestrator Agent",
        agentRole: "Workflow Automation Specialist",
        agentSpecialty: "State graph execution, memory distillation, and tool calling",
        milestoneTitles: [
          "Implement cyclic supervisor routing for subagent handoffs",
          "Build episodic memory compressor for long-running agent threads",
          "Setup safety guardrails on automated database mutations"
        ],
        scratchpad: "# Agentic Workflows\n\n- Maintain short-term context in state graphs.\n- Persist long-term episodic memories in Qdrant collections."
      }
    ]
  },
  {
    id: "product_startup",
    title: "Product & Startups",
    category: "Business",
    description: "Product strategy, user feedback, roadmap prioritization, and pitch decks.",
    icon: "rocket",
    spacesToCreate: [
      {
        id: "product-strategy",
        name: "Product Strategy",
        desc: "PRDs, customer interviews, feature roadmaps, and competitive intelligence",
        color: "#FFFFFF",
        icon: "compass",
        goalTitle: "Deliver High-Impact Products with Product-Market Fit",
        agentName: "Product Lead",
        agentRole: "Strategic Product Partner",
        agentSpecialty: "Feature prioritization, user journey synthesis, and PRD drafting",
        milestoneTitles: [
          "Complete user research interviews for onboarding friction",
          "Draft Q3 product requirements document (PRD)",
          "Analyze churn drivers from user telemetry feedback"
        ],
        scratchpad: "# Product Strategy\n\n- Focus on user clarity: 1 primary action per screen.\n- Optimize first 60 seconds of user activation."
      },
      {
        id: "startup-ops",
        name: "Startup Ops",
        desc: "Investor updates, unit economics, fundraising memos, and growth experiments",
        color: "#FFFFFF",
        icon: "trending-up",
        goalTitle: "Scale Seed to Series A Operational Velocity",
        agentName: "Venture Partner",
        agentRole: "Startup Growth Advisor",
        agentSpecialty: "Unit economics, investor storytelling, and growth loops",
        milestoneTitles: [
          "Refine seed pitch deck executive narrative",
          "Calculate CAC, LTV, and net dollar retention cohorts",
          "Set up weekly operating metrics dashboard"
        ],
        scratchpad: "# Startup Operations\n\n- Key metrics: Monthly recurring revenue, activation rate, server unit cost.\n- Target: 15% monthly user retention improvement."
      }
    ]
  },
  {
    id: "second_brain",
    title: "Personal Knowledge",
    category: "Productivity",
    description: "Book notes, mental models, journaling, reflections, and life systems.",
    icon: "book-open",
    spacesToCreate: [
      {
        id: "personal-vault",
        name: "Personal Vault",
        desc: "Reading notes, philosophical frameworks, mental models, and essays",
        color: "#FFFFFF",
        icon: "book-open",
        goalTitle: "Synthesize 100 Transformative Mental Models",
        agentName: "Thought Partner",
        agentRole: "Epistemic Guide",
        agentSpecialty: "Cross-disciplinary concept synthesis and reflective inquiry",
        milestoneTitles: [
          "Extract 5 core principles from latest deep reading book",
          "Connect decision-making frameworks with personal journals",
          "Write synthesis essay on compounding knowledge"
        ],
        scratchpad: "# Personal Vault\n\n- Knowledge compounds exponentially when connected across domains.\n- Treat notes as evergreen thinking assets."
      },
      {
        id: "daily-systems",
        name: "Daily Systems",
        desc: "Weekly reviews, habit trackers, health protocols, and goal tracking",
        color: "#FFFFFF",
        icon: "calendar",
        goalTitle: "Establish Consistent High-Performance Routines",
        agentName: "Performance Coach",
        agentRole: "Habits & Routine Optimizer",
        agentSpecialty: "Time blocking, weekly reflection, and operational rhythm",
        milestoneTitles: [
          "Complete quarterly priority alignment review",
          "Track 30-day deep work consistency routine",
          "Review energy management and sleep optimization protocols"
        ],
        scratchpad: "# Daily Systems\n\n- Systems > Goals. Design environments that make execution effortless.\n- Weekly Sunday review to clear open loops."
      }
    ]
  },
  {
    id: "academics",
    title: "Academics & Study",
    category: "Education",
    description: "University coursework, lecture notes, exam synthesis, and lab write-ups.",
    icon: "graduation-cap",
    spacesToCreate: [
      {
        id: "coursework-labs",
        name: "Coursework & Labs",
        desc: "Lecture notes, problem sets, experimental results, and lab write-ups",
        color: "#FFFFFF",
        icon: "graduation-cap",
        goalTitle: "Master Semester Coursework & Lab Milestones",
        agentName: "Academic Tutor",
        agentRole: "Specialized Course TA",
        agentSpecialty: "Problem solving, concept breakdowns, and literature citations",
        milestoneTitles: [
          "Summarize weekly lecture recordings into atomic concepts",
          "Complete Lab assignment code and technical report",
          "Cross-reference textbook problems with class slides"
        ],
        scratchpad: "# Coursework & Labs\n\n- Break down complex proofs into first principles.\n- Keep clean citations for all lab write-ups."
      },
      {
        id: "exam-synthesis",
        name: "Exam Synthesis",
        desc: "High-yield study guides, formula sheets, mock tests, and flash concepts",
        color: "#FFFFFF",
        icon: "check-circle",
        goalTitle: "Achieve Top-Tier Exam Mastery",
        agentName: "Exam Strategist",
        agentRole: "Active Recall Coach",
        agentSpecialty: "Spaced repetition prompts and high-yield topic prioritization",
        milestoneTitles: [
          "Generate practice quiz from last 4 lecture chunks",
          "Build formula sheet and edge-case cheatsheet",
          "Complete timed practice exam under realistic constraints"
        ],
        scratchpad: "# Exam Preparation\n\n- Test with active recall rather than passive re-reading.\n- Focus on weak areas identified in mock diagnostics."
      }
    ]
  },
  {
    id: "finance_wealth",
    title: "Finance & Wealth",
    category: "Finance",
    description: "Portfolio management, investment theses, macro trends, and market models.",
    icon: "line-chart",
    spacesToCreate: [
      {
        id: "wealth-portfolio",
        name: "Wealth & Portfolio",
        desc: "Asset allocation, investment theses, venture deals, and financial models",
        color: "#FFFFFF",
        icon: "wallet",
        goalTitle: "Build Resilient Long-Term Wealth Architecture",
        agentName: "Portfolio Analyst",
        agentRole: "Investment Strategist",
        agentSpecialty: "Risk-adjusted returns, asset allocation, and valuation models",
        milestoneTitles: [
          "Document investment thesis for core technology allocations",
          "Audit quarterly asset distribution and rebalancing targets",
          "Build discounted cash flow (DCF) model for target asset"
        ],
        scratchpad: "# Wealth & Portfolio\n\n- Focus on asymmetry: protect downside, allow upside to run.\n- Regular rebalancing preserves risk parity."
      }
    ]
  }
];

// Initial Clean Default State (starts with your real workspace)
const initialSpaces: Space[] = [
  {
    id: "career",
    name: "Career",
    status: "Active",
    count: 8,
    updated: "Just now",
    pinned: true,
    color: "#FFFFFF",
    icon: "briefcase",
    desc: "Career progression, resume, system design interviews, and engineering leadership",
    goal: { title: "Senior Systems Architect Mastery & Career Growth", progress: 85 },
    agentPersona: {
      name: "Apex Strategist",
      title: "Staff Systems Career Architect",
      specialty: "Distributed systems, technical leadership & interview synthesis",
      status: "active",
      avatarBg: "#212121",
    },
    milestones: [
      { id: "m-1", title: "Resume 2026 tuned for Backend & Distributed Systems roles", completed: true },
      { id: "m-2", title: "Google Interview Prep — System Design & Graphs completed", completed: true },
      { id: "m-3", title: "Kalyra Streaming Engine v2 architecture benchmark", completed: false },
      { id: "m-4", title: "Finalize 3 mock system design architecture sessions", completed: false },
    ],
    scratchpad: `# Career Vision 2026\n\n- Focus on large-scale distributed systems and real-time streaming architectures.\n- Target role: Staff / Lead Engineer with autonomous agents focus.\n- Strengths: C++, Python, Next.js, Qdrant vector retrieval.`,
    liveUpdate: { text: "Resume 2026 optimized for backend roles", time: "2h ago" },
    sections: { knowledge: [], projects: [], notes: [] },
    objects: [],
  },
  {
    id: "research",
    name: "Research",
    status: "Active",
    count: 12,
    updated: "Today",
    pinned: true,
    color: "#FFFFFF",
    icon: "atom",
    desc: "AI research papers, vector search benchmarks, and distributed consensus studies",
    goal: { title: "Explore Distributed AI & Dense Hybrid Retrieval", progress: 70 },
    agentPersona: {
      name: "Synthesis Fellow",
      title: "Senior AI & Literature Researcher",
      specialty: "Distributed computing papers, vector retrieval, architecture proofs",
      status: "active",
      avatarBg: "#212121",
    },
    milestones: [
      { id: "r-1", title: "Survey Raft vs Paxos consensus implementations", completed: true },
      { id: "r-2", title: "Benchmark HNSW vs Flat indexing performance in Qdrant", completed: true },
      { id: "r-3", title: "Draft research briefing on Hybrid BM25 + Dense Retrieval", completed: false },
      { id: "r-4", title: "Synthesize findings into Second Brain autonomous agent report", completed: false },
    ],
    scratchpad: `# Research Notes\n\n- Dense embeddings provide semantic clustering, but keyword BM25 handles precise terminology.\n- Re-ranking with cross-encoders improves MRR@10 by 18% on technical documents.`,
    sections: { knowledge: [], notes: [] },
    objects: [],
  },
  {
    id: "startup",
    name: "Startup",
    status: "Active",
    count: 6,
    updated: "Today",
    pinned: false,
    color: "#FFFFFF",
    icon: "rocket",
    desc: "Product roadmap, pitch decks, technical specifications, and beta tester feedback",
    goal: { title: "Launch QueryMind MVP Beta to 100 Power Users", progress: 60 },
    agentPersona: {
      name: "Venture Architect",
      title: "Product Strategist & Systems Technologist",
      specialty: "GTM execution, tech specs, product roadmaps & investor decks",
      status: "active",
      avatarBg: "#212121",
    },
    milestones: [
      { id: "s-1", title: "Product MVP Core Feature Matrix defined", completed: true },
      { id: "s-2", title: "Streaming SSE Chat with agent telemetry verified", completed: true },
      { id: "s-3", title: "Complete Seed Pitch Deck narrative and slide flow", completed: false },
      { id: "s-4", title: "Deploy Beta testing environment with metrics instrumentation", completed: false },
    ],
    scratchpad: `# QueryMind Beta Milestones\n\n1. Frictionless document drag-and-drop\n2. Real-time token streaming with citation highlighting\n3. Creative spaces for context-isolated agent reasoning`,
    sections: { knowledge: [], projects: [] },
    objects: [],
  },
  {
    id: "college",
    name: "College",
    status: "Active",
    count: 4,
    updated: "Yesterday",
    pinned: false,
    color: "#FFFFFF",
    icon: "graduation",
    desc: "Academic coursework, semester projects, exam revisions, and group milestones",
    goal: { title: "Final Semester Capstone Project & Honors Distinction", progress: 75 },
    agentPersona: {
      name: "Academic Scholar",
      title: "Curriculum & Exam Synthesizer",
      specialty: "Coursework distillation, problem set breakdowns & revision notes",
      status: "active",
      avatarBg: "#212121",
    },
    milestones: [
      { id: "c-1", title: "Operating Systems assignment 3 complete", completed: true },
      { id: "c-2", title: "Review Distributed Systems lecture notes", completed: true },
      { id: "c-3", title: "Prepare Distributed Consensus presentation slides", completed: false },
    ],
    scratchpad: `# Semester Capstone\n\n- Team: 3 members\n- Deliverable: Second Brain autonomous assistant with vector embeddings and multi-space isolation.`,
    sections: { knowledge: [], notes: [] },
    objects: [],
  },
  {
    id: "personal",
    name: "Personal",
    status: "Active",
    count: 7,
    updated: "2 days ago",
    pinned: false,
    color: "#FFFFFF",
    icon: "user",
    desc: "Personal journals, book summaries, fitness logs, and long-term reflection",
    goal: { title: "Read 12 Deep Technical Books & Maintain Habit Tracker", progress: 50 },
    agentPersona: {
      name: "Reflective Mind",
      title: "Life Strategy & Habits Co-pilot",
      specialty: "Habit loops, long-term reading synthesis, life logs",
      status: "idle",
      avatarBg: "#212121",
    },
    milestones: [
      { id: "p-1", title: "Designing Data-Intensive Applications (Kleppmann) finished", completed: true },
      { id: "p-2", title: "Database Internals (Petrov) chapter 1-5", completed: false },
    ],
    scratchpad: `# Notes to Self\n\n"The art of knowledge work is turning passive information consumption into active synthesis and creation."`,
    sections: { knowledge: [], notes: [] },
    objects: [],
  },
  {
    id: "ideas",
    name: "Ideas",
    status: "Active",
    count: 3,
    updated: "3 days ago",
    pinned: false,
    color: "#FFFFFF",
    icon: "sparkles",
    desc: "Raw brain dumps, high-variance creative concepts, and rapid prototyping notes",
    goal: { title: "Prototype 5 Autonomous Agent Experiments", progress: 40 },
    agentPersona: {
      name: "Creative Catalyst",
      title: "Lateral Brain Dump Co-pilot",
      specialty: "High-variance idea collisions, rapid prototyping & brainstorm mapping",
      status: "active",
      avatarBg: "#212121",
    },
    milestones: [
      { id: "i-1", title: "Agentic tool-calling memory architecture sketch", completed: true },
      { id: "i-2", title: "Multi-agent consensus protocol prototype", completed: false },
      { id: "i-3", title: "Voice-driven ambient capture experiment", completed: false },
    ],
    scratchpad: `# Crazy Ideas\n\n- What if agents autonomously cross-referenced research papers and opened PRs with suggested refactors?\n- Interactive 3D constellation map of knowledge nodes.`,
    sections: { knowledge: [], notes: [] },
    objects: [],
  },
];

const initialProfile: UserProfile = {
  name: "Aryan Kulkarni",
  email: "aryan@querymind.os",
  role: "Systems Architect & Full Stack",
  timezone: "UTC+05:30 (India Standard Time)",
  focusDomain: "Career & Systems Architecture",
  stats: {
    knowledgeObjects: 40,
    connections: 128,
    daemonsRunning: 2,
    learningHours: "14.5 hrs",
  },
};

const sampleObjects: KnowledgeObject[] = [
  {
    id: "resume-2026",
    title: "Resume 2026",
    type: "PDF",
    badge: "PDF",
    updated: "2h ago",
    time: "2h ago",
    spaceId: "career",
    progress: 95,
    iconBg: "#1F1F1F",
    iconColor: "#FFFFFF",
    summary: "Your resume is optimized for software engineering roles with a strong focus on system design, backend development and problem solving.",
    keyIdeas: [
      "3 Major Projects",
      "Backend Development",
      "System Design",
      "Problem Solving",
    ],
    tags: ["Resume", "Software Engineering", "Career"],
    meta: "PDF Document • Updated 2h ago",
  },
  {
    id: "google-prep",
    title: "Google Interview Prep",
    type: "Notes",
    badge: "Notes",
    updated: "5h ago",
    time: "5h ago",
    spaceId: "career",
    progress: 80,
    iconBg: "#1F1F1F",
    iconColor: "#FFFFFF",
    summary: "Comprehensive notes covering Distributed Systems, System Design, Graph Algorithms, and Dynamic Programming.",
    tags: ["Interview", "System Design", "Algorithms"],
    meta: "Notes • Updated 5h ago",
  },
  {
    id: "kalyra-engine",
    title: "Kalyra Streaming Engine",
    type: "Code",
    badge: "Code",
    updated: "Yesterday",
    time: "Yesterday",
    spaceId: "career",
    progress: 72,
    iconBg: "#1F1F1F",
    iconColor: "#FFFFFF",
    summary: "Low-latency streaming architecture built with C++ and WebSockets.",
    tags: ["Code", "Streaming", "Architecture"],
    meta: "Code • Updated yesterday",
  },
];

const sampleActivityFeed: ActivityItem[] = [
  {
    id: "act-1",
    title: "Resume 2026 updated",
    text: "Updated system design highlights & project metrics",
    time: "2h ago",
    space: "Career",
    iconType: "document",
    color: "#FFFFFF",
    bg: "#1F1F1F",
  },
  {
    id: "act-2",
    title: "New connection created Resume ↔ Projects",
    text: "Linked 3 repository nodes to resume experience",
    time: "3h ago",
    space: "Career",
    iconType: "sparkles",
    color: "#A3A3A3",
    bg: "#1F1F1F",
  },
  {
    id: "act-3",
    title: "Google Interview Prep Notes updated",
    text: "Added 4 distributed system design patterns",
    time: "5h ago",
    space: "Career",
    iconType: "document",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
  },
  {
    id: "act-4",
    title: "Kalyra Engine commit pushed",
    text: "7 commits synchronized to repository index",
    time: "Yesterday",
    space: "Career",
    iconType: "code",
    color: "#FFFFFF",
    bg: "#1F1F1F",
  },
];

export const useMyndStore = create<MyndState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      activeRoute: "home",
      activeSpaceId: "career",
      activeSpaceTab: "overview",
      activeSpaceSection: "all",
      selectedObject: sampleObjects[0],
      isObjectModalOpen: false,

      isFocusMode: false,
      isZenMode: false,
      isSpotlightOpen: false,
      isAskAiOpen: false,
      askAiTarget: null,
      isSettingsOpen: false,
      activeSettingsTab: "general",

      userProfile: initialProfile,
      spaces: initialSpaces,
      activityFeed: sampleActivityFeed,
      recentObjects: sampleObjects,
      uploadedDocuments: sampleObjects,
      captureQueue: [],

      setRoute: (route) => set({ activeRoute: route }),
      selectSpace: (spaceId, tab) => {
        const spaces = get().spaces;
        const exists = spaces.find((s) => s.id === spaceId);
        set({
          activeSpaceId: exists ? spaceId : spaces[0]?.id || "general",
          activeSpaceTab: tab || "overview",
          activeRoute: "space",
        });
      },
      setSpaceTab: (tab) => set({ activeSpaceTab: tab }),
      setSpaceSection: (section) => set({ activeSpaceSection: section }),
      setSelectedObject: (obj) => set({ selectedObject: obj }),
      openObjectModal: (obj) => set({ selectedObject: obj, isObjectModalOpen: true }),
      closeObjectModal: () => set({ isObjectModalOpen: false }),

      toggleTheme: () => {
        const cur = get().theme;
        const next = cur === "dark" ? "light" : cur === "light" ? "zen" : "dark";
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", next);
        }
        set({ theme: next });
      },
      setTheme: (theme) => {
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", theme);
        }
        set({ theme });
      },
      toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
      toggleZenMode: () => set((s) => ({ isZenMode: !s.isZenMode })),

      openSpotlight: () => set({ isSpotlightOpen: true }),
      closeSpotlight: () => set({ isSpotlightOpen: false }),
      openAskAi: (target) => set({ isAskAiOpen: true, askAiTarget: target || null }),
      closeAskAi: () => set({ isAskAiOpen: false, askAiTarget: null }),
      openSettings: (tab) => set({ isSettingsOpen: true, activeSettingsTab: tab || "general" }),
      closeSettings: () => set({ isSettingsOpen: false }),

      isCreateSpaceOpen: false,
      openCreateSpace: () => set({ isCreateSpaceOpen: true }),
      closeCreateSpace: () => set({ isCreateSpaceOpen: false }),

      toggleMilestone: (spaceId, milestoneId) => {
        set((state) => ({
          spaces: state.spaces.map((s) => {
            if (s.id !== spaceId) return s;
            const updated = (s.milestones || []).map((m) =>
              m.id === milestoneId ? { ...m, completed: !m.completed } : m
            );
            const completedCount = updated.filter((m) => m.completed).length;
            const progress = updated.length > 0 ? Math.round((completedCount / updated.length) * 100) : s.goal?.progress || 0;
            return {
              ...s,
              milestones: updated,
              goal: s.goal ? { ...s.goal, progress } : undefined,
            };
          }),
        }));
      },

      addMilestone: (spaceId, title) => {
        if (!title.trim()) return;
        set((state) => ({
          spaces: state.spaces.map((s) => {
            if (s.id !== spaceId) return s;
            const newMilestone: SpaceMilestone = {
              id: `m-${Date.now()}`,
              title: title.trim(),
              completed: false,
            };
            const updated = [...(s.milestones || []), newMilestone];
            const completedCount = updated.filter((m) => m.completed).length;
            const progress = Math.round((completedCount / updated.length) * 100);
            return {
              ...s,
              milestones: updated,
              goal: s.goal ? { ...s.goal, progress } : { title: title.trim(), progress },
            };
          }),
        }));
      },

      updateSpaceScratchpad: (spaceId, text) => {
        set((state) => ({
          spaces: state.spaces.map((s) => (s.id === spaceId ? { ...s, scratchpad: text } : s)),
        }));
      },

      updateSpaceGoal: (spaceId, title, progress) => {
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId ? { ...s, goal: { title, progress } } : s
          ),
        }));
      },

      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),

      addDocument: (doc) => {
        const targetSpaceId = doc.spaceId || get().activeSpaceId || "general";
        const docId = doc.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newObj: KnowledgeObject = {
          id: docId,
          title: doc.name,
          type: doc.type.toUpperCase(),
          badge: doc.type.toUpperCase(),
          updated: "Just now",
          time: "Just now",
          fileSize: doc.size,
          chunks: doc.chunks || 1,
          vectorsStored: doc.vectorsStored || doc.chunks || 1,
          connections: 1,
          confidence: "100%",
          version: "v1.0",
          progress: 100,
          spaceId: targetSpaceId,
          tags: [doc.type.toUpperCase(), "Uploaded"],
          summary:
            doc.summary ||
            `Document with ${doc.chunks || 1} semantic chunks ingested and indexed into Qdrant.`,
          content: doc.content || `Uploaded file: ${doc.name}\nSize: ${doc.size}\nChunks: ${doc.chunks}`,
          meta: `${doc.size} • ${doc.chunks || 1} chunks`,
        };

        const newActivity: ActivityItem = {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: `Uploaded ${doc.name}`,
          text: `${doc.chunks || 1} chunks indexed in Qdrant Vector Store`,
          time: "Just now",
          space: targetSpaceId.charAt(0).toUpperCase() + targetSpaceId.slice(1),
          iconType: "document",
          color: "#10B981",
          bg: "#ECFDF5",
        };

        set((state) => {
          const updatedSpaces = state.spaces.map((s) => {
            if (s.id === targetSpaceId) {
              const currentKnowledge = s.sections?.knowledge || [];
              const updatedKnowledge = [newObj, ...currentKnowledge];
              return {
                ...s,
                count: s.count + 1,
                updated: "Just now",
                liveUpdate: { text: `New document "${doc.name}" added`, time: "Just now" },
                sections: { ...s.sections, knowledge: updatedKnowledge },
                objects: [newObj, ...(s.objects || [])],
              };
            }
            return s;
          });

          const totalDocs = (state.userProfile.stats.knowledgeObjects || 0) + 1;

          return {
            spaces: updatedSpaces,
            uploadedDocuments: [newObj, ...state.uploadedDocuments.filter((d) => d.id !== newObj.id)],
            recentObjects: [newObj, ...state.recentObjects.filter((d) => d.id !== newObj.id)],
            activityFeed: [newActivity, ...state.activityFeed],
            userProfile: {
              ...state.userProfile,
              stats: {
                ...state.userProfile.stats,
                knowledgeObjects: totalDocs,
                connections: totalDocs * 3,
              },
            },
          };
        });

        return newObj;
      },

      addCapturedItem: (text, spaceId) => {
        if (!text.trim()) return;
        const targetSpace = spaceId || get().activeSpaceId || "general";
        const title = text.length > 40 ? text.substring(0, 37) + "…" : text;

        const newNote: KnowledgeObject = {
          id: `note-${Date.now()}`,
          title,
          type: "Note",
          badge: "Note",
          updated: "Just now",
          time: "Just now",
          connections: 1,
          confidence: "100%",
          version: "v1.0",
          spaceId: targetSpace,
          tags: ["Captured Note"],
          summary: text,
          content: text,
          meta: "Captured Note • Just now",
        };

        const newActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          title: `Captured new note`,
          text: title,
          time: "Just now",
          space: targetSpace.charAt(0).toUpperCase() + targetSpace.slice(1),
          iconType: "sparkles",
          color: "#FFFFFF",
          bg: "#1F1F1F",
        };

        set((state) => {
          const updatedSpaces = state.spaces.map((s) => {
            if (s.id === targetSpace) {
              const currentNotes = s.sections?.notes || [];
              return {
                ...s,
                count: s.count + 1,
                updated: "Just now",
                sections: { ...s.sections, notes: [newNote, ...currentNotes] },
                objects: [newNote, ...(s.objects || [])],
              };
            }
            return s;
          });

          return {
            spaces: updatedSpaces,
            recentObjects: [newNote, ...state.recentObjects.filter((d) => d.id !== newNote.id)],
            activityFeed: [newActivity, ...state.activityFeed],
            captureQueue: [text, ...state.captureQueue],
          };
        });
      },

      deleteDocument: (id) => {
        set((state) => {
          const updatedDocs = state.uploadedDocuments.filter((d) => d.id !== id);
          const updatedRecent = state.recentObjects.filter((d) => d.id !== id);
          const updatedSpaces = state.spaces.map((s) => ({
            ...s,
            objects: (s.objects || []).filter((o) => o.id !== id),
            sections: {
              ...s.sections,
              knowledge: (s.sections?.knowledge || []).filter((o) => o.id !== id),
              notes: (s.sections?.notes || []).filter((o) => o.id !== id),
            },
          }));
          return {
            uploadedDocuments: updatedDocs,
            recentObjects: updatedRecent,
            spaces: updatedSpaces,
          };
        });
      },

      addSpace: (space) => {
        const id = space.id || space.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const newSpace: Space = {
          id,
          name: space.name,
          status: "Active",
          count: 0,
          updated: "Just now",
          pinned: false,
          desc: space.desc || "Custom knowledge space",
          color: space.color || "#FFFFFF",
          icon: space.icon || "sparkles",
          goal: space.goal || { title: `Master ${space.name} Domain`, progress: 0 },
          milestones: space.milestones || [
            { id: `m-${Date.now()}-1`, title: `Upload initial knowledge documents to ${space.name}`, completed: false },
            { id: `m-${Date.now()}-2`, title: `Synthesize first space insights briefing`, completed: false },
          ],
          agentPersona: space.agentPersona || {
            name: `${space.name} Specialist`,
            title: `Dedicated ${space.name} Co-pilot`,
            specialty: `Autonomous synthesis and domain analysis for ${space.name}`,
            status: "active",
            avatarBg: space.color || "#262626",
          },
          scratchpad: space.scratchpad || `# ${space.name} Notes\n\n- Space created on ${new Date().toLocaleDateString()}.\n- Ready for knowledge ingestion and autonomous agent synthesis.`,
          sections: { knowledge: [], notes: [], projects: [] },
          objects: [],
        };
        set((state) => ({
          spaces: [...state.spaces, newSpace],
        }));
      },

      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (completed: boolean) => set({ hasCompletedOnboarding: completed }),

      provisionSpacesFromInterests: (interestIds: string[]) => {
        const selected = PRESET_INTERESTS.filter((p) => interestIds.includes(p.id));
        const newSpaces: Space[] = [];

        selected.forEach((interest) => {
          interest.spacesToCreate.forEach((def) => {
            const newSpace: Space = {
              id: def.id,
              name: def.name,
              status: "Active",
              count: 0,
              updated: "Just now",
              pinned: true,
              desc: def.desc,
              color: def.color,
              icon: def.icon,
              goal: { title: def.goalTitle, progress: 0 },
              milestones: def.milestoneTitles.map((title, idx) => ({
                id: `m-${def.id}-${idx + 1}`,
                title,
                completed: false,
              })),
              agentPersona: {
                name: def.agentName,
                title: def.agentRole,
                specialty: def.agentSpecialty,
                status: "active",
                avatarBg: def.color,
              },
              scratchpad: def.scratchpad,
              sections: { knowledge: [], notes: [], projects: [] },
              objects: [],
            };
            newSpaces.push(newSpace);
          });
        });

        if (newSpaces.length > 0) {
          set((state) => {
            const existingIds = new Set(newSpaces.map((s) => s.id));
            const retained = state.spaces.filter((s) => !existingIds.has(s.id));
            return {
              spaces: [...newSpaces, ...retained],
              activeSpaceId: newSpaces[0].id,
              hasCompletedOnboarding: true,
            };
          });
        } else {
          set({ hasCompletedOnboarding: true });
        }
      },

      setSpaces: (spaces: Space[]) => {
        const seen = new Set<string>();
        const unique = spaces.filter((s) => {
          if (!s.id || seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        set({ spaces: unique });
      },

      setActiveSpaceId: (spaceId: string) => {
        set({ activeSpaceId: spaceId });
      },

      clearSpaces: () => {
        set({ spaces: [], activeSpaceId: "" });
      },

      clearAllData: () => {
        set({
          spaces: [],
          activeSpaceId: "",
          uploadedDocuments: [],
          recentObjects: [],
          activityFeed: [],
          userProfile: initialProfile,
          selectedObject: null,
        });
      },

      loadSampleData: () => {
        // Optional demo dataset for users who want to preview a fully populated graph
        const sampleDoc1: KnowledgeObject = {
          id: "sample-1",
          title: "System Architecture & Consensus Protocols.pdf",
          type: "PDF",
          badge: "PDF",
          updated: "2h ago",
          connections: 8,
          confidence: "98%",
          summary: "Distributed event streaming, Raft consensus invariants, and sub-12ms response streaming.",
          meta: "2.4 MB • 14 chunks",
          tags: ["Architecture", "Distributed Systems"],
        };
        const sampleDoc2: KnowledgeObject = {
          id: "sample-2",
          title: "Streaming Engine Transcoding Specs.md",
          type: "MARKDOWN",
          badge: "MD",
          updated: "Yesterday",
          connections: 5,
          confidence: "95%",
          summary: "HLS segmentation and Redis queue workers for real-time video feeds.",
          meta: "34 KB • 8 chunks",
          tags: ["Video", "Streaming"],
        };

        set((state) => ({
          uploadedDocuments: [sampleDoc1, sampleDoc2],
          recentObjects: [sampleDoc1, sampleDoc2],
          spaces: [
            {
              ...state.spaces[0],
              count: 2,
              sections: { knowledge: [sampleDoc1, sampleDoc2] },
              objects: [sampleDoc1, sampleDoc2],
            },
            ...state.spaces.slice(1),
          ],
        }));
      },
    }),
    {
      name: "querymind_storage_v2",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Default theme must be dark
        if (!state.theme || state.theme === "light") {
          state.theme = "dark";
        }
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", state.theme || "dark");
        }
        const dedupe = <T extends { id?: string }>(arr: T[] | undefined): T[] => {
          if (!Array.isArray(arr)) return [];
          const seen = new Set<string>();
          return arr.filter((item) => {
            if (!item || !item.id || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        };
        state.spaces = dedupe(state.spaces).map((s) => ({
          ...s,
          color: "#FFFFFF",
          agentPersona: s.agentPersona ? { ...s.agentPersona, avatarBg: "#262626" } : undefined,
        }));
        state.recentObjects = dedupe(state.recentObjects);
        state.uploadedDocuments = dedupe(state.uploadedDocuments);
      },
    }
  )
);
