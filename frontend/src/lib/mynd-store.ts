import { create } from "zustand";
import { persist } from "zustand/middleware";
import { queryMindApi, authApi } from "./api";

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
  size?: string;
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
  username?: string;
  avatarUrl?: string;
  email: string;
  role: string;
  timezone: string;
  focusDomain: string;
  skills?: string[];
  interests?: string[];
  goals?: string[];
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

export interface PersonalizationSettings {
  cognitiveStyle: "first_principles" | "executive" | "socratic" | "speed";
  verbosity: "concise" | "balanced" | "deep_dive";
  codeStandard: "staff_engineer" | "rapid_prototype" | "academic";
  formattingPreference: "structured_markdown" | "analytical_prose" | "bullet_points";
  autonomousMemory: boolean;
  crossSpaceSynthesis: boolean;
  strictGrounding: boolean;
  userContext: string;
  customDirectives: string;
}

export const defaultPersonalizationSettings: PersonalizationSettings = {
  cognitiveStyle: "first_principles",
  verbosity: "balanced",
  codeStandard: "staff_engineer",
  formattingPreference: "structured_markdown",
  autonomousMemory: true,
  crossSpaceSynthesis: true,
  strictGrounding: false,
  userContext: "",
  customDirectives: "",
};

export interface MyndState {
  theme: "dark" | "light" | "zen" | "cyberpunk" | "sepia" | "arctic";
  accentColor: string;
  uiDensity: "compact" | "comfortable" | "spacious";
  reduceMotion: boolean;
  soundEffects: boolean;
  aiModel: "gemini-3.7-flash" | "gemini-1.5-pro";
  webSearchEnabled: boolean;
  codeExecution: boolean;
  defaultSpaceId: string;
  language: string;

  activeRoute: "home" | "workspace" | "space" | "search" | "intelligence" | "vault" | "chat" | "goals";
  activeSpaceId: string;
  activeSpaceTab: "overview" | "objects" | "graph" | "insights" | "notes" | "journals" | "habits" | "goals" | "timeline";
  activeSpaceSection: string;
  selectedObject: KnowledgeObject | null;
  isObjectModalOpen: boolean;
  activeGoal: any | null;
  setActiveGoal: (goal: any | null) => void;
  isContextPanelCollapsed: boolean;
  toggleContextPanel: () => void;
  setContextPanelCollapsed: (collapsed: boolean) => void;

  isFocusMode: boolean;
  isZenMode: boolean;
  isSpotlightOpen: boolean;
  isAskAiOpen: boolean;
  askAiTarget: string | null;
  isSettingsOpen: boolean;
  activeSettingsTab: "general" | "appearance" | "ai" | "privacy" | "notifications" | "shortcuts" | "personalization" | "storage" | "autonomy";

  personalization: PersonalizationSettings;
  updatePersonalization: (updates: Partial<PersonalizationSettings>) => void;
  resetPersonalization: () => void;

  userProfile: UserProfile;
  spaces: Space[];
  recentSpaceIds: string[];
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
  setTheme: (theme: MyndState["theme"]) => void;
  setAccentColor: (color: string) => void;
  setUiDensity: (density: MyndState["uiDensity"]) => void;
  setReduceMotion: (reduce: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  setAiModel: (model: MyndState["aiModel"]) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setCodeExecution: (enabled: boolean) => void;
  setDefaultSpaceId: (id: string) => void;
  setLanguage: (lang: string) => void;

  toggleFocusMode: () => void;
  toggleZenMode: () => void;

  openSpotlight: () => void;
  closeSpotlight: () => void;
  openAskAi: (target?: string) => void;
  closeAskAi: () => void;
  openSettings: (tab?: MyndState["activeSettingsTab"]) => void;
  closeSettings: () => void;

  isEditProfileOpen: boolean;
  openEditProfile: () => void;
  closeEditProfile: () => void;

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
  removeDocument: (id: string) => void;
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
  deleteSpace: (spaceId: string) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  provisionSpacesFromInterests: (interestIds: string[]) => void;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpaceId: (spaceId: string) => void;
  clearSpaces: () => void;
  clearAllData: () => void;
  loadSampleData: () => void;
  syncWithBackend: () => Promise<void>;
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

const initialProfile: UserProfile = {
  name: "",
  username: "",
  avatarUrl: "",
  email: "",
  role: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  focusDomain: "",
  skills: [],
  interests: [],
  goals: [],
  stats: {
    knowledgeObjects: 0,
    connections: 0,
    daemonsRunning: 0,
    learningHours: "0 hrs",
  },
};

export const useMyndStore = create<MyndState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      accentColor: "#FFFFFF",
      uiDensity: "comfortable",
      reduceMotion: false,
      soundEffects: true,
      aiModel: "gemini-3.7-flash",
      webSearchEnabled: true,
      codeExecution: true,
      defaultSpaceId: "",
      language: "en",

      activeRoute: "home",
      activeSpaceId: "",
      activeSpaceTab: "overview",
      activeSpaceSection: "all",
      selectedObject: null,
      isObjectModalOpen: false,
      activeGoal: null,
      setActiveGoal: (goal) => set({ activeGoal: goal }),
      isContextPanelCollapsed: false,
      toggleContextPanel: () => set((state) => ({ isContextPanelCollapsed: !state.isContextPanelCollapsed })),
      setContextPanelCollapsed: (collapsed) => set({ isContextPanelCollapsed: collapsed }),

      isFocusMode: false,
      isZenMode: false,
      isSpotlightOpen: false,
      isAskAiOpen: false,
      askAiTarget: null,
      isSettingsOpen: false,
      activeSettingsTab: "general",

      personalization: defaultPersonalizationSettings,
      updatePersonalization: (updates) =>
        set((state) => ({
          personalization: { ...state.personalization, ...updates },
        })),
      resetPersonalization: () => set({ personalization: defaultPersonalizationSettings }),

      userProfile: initialProfile,
      spaces: [],
      recentSpaceIds: [],
      activityFeed: [],
      recentObjects: [],
      uploadedDocuments: [],
      captureQueue: [],

      setRoute: (route) => set({ activeRoute: route }),
      selectSpace: (spaceId, tab) => {
        const spaces = get().spaces;
        const exists = spaces.find((s) => s.id === spaceId || s.slug === spaceId);
        const targetId = exists ? exists.id : spaces[0]?.id || "general";
        const currentRecent = get().recentSpaceIds || [];
        const nextRecent = [targetId, ...currentRecent.filter((id) => id !== targetId)].slice(0, 10);
        set({
          activeSpaceId: targetId,
          activeSpaceTab: tab || "overview",
          activeRoute: "space",
          recentSpaceIds: nextRecent,
        });
      },
      setSpaceTab: (tab) => set({ activeSpaceTab: tab }),
      setSpaceSection: (section) => set({ activeSpaceSection: section }),
      setSelectedObject: (obj) => set({ selectedObject: obj }),
      openObjectModal: (obj) => set({ selectedObject: obj, isObjectModalOpen: true }),
      closeObjectModal: () => set({ isObjectModalOpen: false }),

      toggleTheme: () => {
        const themes: MyndState["theme"][] = ["dark", "light", "zen", "cyberpunk", "sepia", "arctic"];
        const cur = get().theme;
        const nextIdx = (themes.indexOf(cur) + 1) % themes.length;
        const next = themes[nextIdx];
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
      setAccentColor: (color) => {
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--accent", color);
          document.documentElement.style.setProperty("--accent-soft", color + "26");
        }
        set({ accentColor: color });
      },
      setUiDensity: (density) => {
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-density", density);
        }
        set({ uiDensity: density });
      },
      setReduceMotion: (reduce) => set({ reduceMotion: reduce }),
      setSoundEffects: (enabled) => set({ soundEffects: enabled }),
      setAiModel: (model) => set({ aiModel: model }),
      setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
      setCodeExecution: (enabled) => set({ codeExecution: enabled }),
      setDefaultSpaceId: (id) => set({ defaultSpaceId: id }),
      setLanguage: (lang) => set({ language: lang }),
      toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
      toggleZenMode: () => set((s) => ({ isZenMode: !s.isZenMode })),

      openSpotlight: () => set({ isSpotlightOpen: true }),
      closeSpotlight: () => set({ isSpotlightOpen: false }),
      openAskAi: (target) => set({ isAskAiOpen: true, askAiTarget: target || null }),
      closeAskAi: () => set({ isAskAiOpen: false, askAiTarget: null }),
      openSettings: (tab) => set({ isSettingsOpen: true, activeSettingsTab: tab || "general" }),
      closeSettings: () => set({ isSettingsOpen: false }),

      isEditProfileOpen: false,
      openEditProfile: () => set({ isEditProfileOpen: true }),
      closeEditProfile: () => set({ isEditProfileOpen: false }),

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

      removeDocument: (id) => {
        get().deleteDocument(id);
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
          recentSpaceIds: [newSpace.id, ...(state.recentSpaceIds || []).filter((id) => id !== newSpace.id)].slice(0, 10),
        }));
      },

      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (completed: boolean) => set({ hasCompletedOnboarding: completed }),

      deleteSpace: (spaceId: string) => {
        set((state) => {
          const remainingSpaces = state.spaces.filter((s) => s.id !== spaceId);
          const nextActiveId =
            state.activeSpaceId === spaceId
              ? remainingSpaces[0]?.id || ""
              : state.activeSpaceId;

          const remainingDocs = state.uploadedDocuments.filter((d) => d.spaceId !== spaceId);
          const remainingRecent = state.recentObjects.filter((d) => d.spaceId !== spaceId);

          return {
            spaces: remainingSpaces,
            activeSpaceId: nextActiveId,
            recentSpaceIds: (state.recentSpaceIds || []).filter((id) => id !== spaceId),
            uploadedDocuments: remainingDocs,
            recentObjects: remainingRecent,
          };
        });
      },

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

        // Set ONLY the selected spaces! No retaining unselected/default spaces.
        set({
          spaces: newSpaces,
          activeSpaceId: newSpaces[0]?.id || "",
          recentSpaceIds: newSpaces.slice(0, 2).map((s) => s.id),
          hasCompletedOnboarding: true,
        });

        // Asynchronously sync newly provisioned spaces with backend DB
        newSpaces.forEach((s) => {
          queryMindApi.createSpace({
            name: s.name,
            description: s.desc,
            color: s.color,
            icon: s.icon,
            slug: s.id,
          }).catch((err) => console.warn("Backend space creation notice:", err));
        });
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
        // No-op: strict real-time user data mode enabled.
      },

      syncWithBackend: async () => {
        try {
          const [meData, spacesData, knowledgeData] = await Promise.allSettled([
            authApi.getMe(),
            queryMindApi.getSpaces(),
            queryMindApi.getKnowledge(),
          ]);

          const updates: Partial<MyndState> = {};

          if (meData.status === "fulfilled" && meData.value) {
            const me = meData.value;
            updates.userProfile = {
              name: me.display_name || me.email.split("@")[0],
              email: me.email,
              username: me.email.split("@")[0],
              avatarUrl: me.avatar_url || "",
              role: "Knowledge Architect",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
              focusDomain: "Personal Knowledge",
              stats: {
                knowledgeObjects: me.stats?.knowledge_objects || 0,
                connections: me.stats?.connections || 0,
                daemonsRunning: 1,
                learningHours: "12 hrs",
              },
            };
          }

          if (spacesData.status === "fulfilled" && Array.isArray(spacesData.value) && spacesData.value.length > 0) {
            const currentSpaces = get().spaces;
            const seenNames = new Set<string>();
            const seenIds = new Set<string>();
            const uniqueApiSpaces = spacesData.value.filter((s) => {
              const lower = (s.name || "").trim().toLowerCase();
              if (!lower || seenNames.has(lower) || seenIds.has(s.id)) return false;
              seenNames.add(lower);
              seenIds.add(s.id);
              return true;
            });

            const apiSpaces: Space[] = uniqueApiSpaces.map((s) => {
              const existing = currentSpaces.find((x) => x.id === s.id || x.name.toLowerCase() === s.name.toLowerCase());
              return {
                id: s.id,
                name: s.name,
                status: "Active",
                count: existing?.count || 0,
                updated: "Recently",
                pinned: s.is_default || existing?.pinned || false,
                desc: s.description || existing?.desc || "Workspace",
                color: s.color || existing?.color || "#FFFFFF",
                icon: s.icon || existing?.icon || "folder",
                slug: s.slug,
                goal: existing?.goal || { title: `Master ${s.name} Domain`, progress: 0 },
                milestones: existing?.milestones || [],
                agentPersona: existing?.agentPersona || {
                  name: `${s.name} Specialist`,
                  title: `Dedicated ${s.name} Co-pilot`,
                  specialty: `Autonomous synthesis and domain analysis for ${s.name}`,
                  status: "active",
                  avatarBg: s.color || "#262626",
                },
                scratchpad: existing?.scratchpad || `# ${s.name} Notes\n\n- Connected to real-time agent and backend database.`,
                sections: existing?.sections || { knowledge: [], notes: [], projects: [] },
                objects: existing?.objects || [],
              };
            });

            updates.spaces = apiSpaces;
            if (!get().activeSpaceId || !apiSpaces.find((s) => s.id === get().activeSpaceId)) {
              updates.activeSpaceId = apiSpaces[0].id;
            }
            if (!get().recentSpaceIds || get().recentSpaceIds.length === 0) {
              updates.recentSpaceIds = apiSpaces.slice(0, 2).map((s) => s.id);
            }
            updates.hasCompletedOnboarding = true;
          }

          if (knowledgeData.status === "fulfilled" && Array.isArray(knowledgeData.value)) {
            const objects: KnowledgeObject[] = knowledgeData.value.map((k) => ({
              id: k.id,
              title: k.title || k.content.slice(0, 40),
              type: (k.knowledge_type || "NOTE").toUpperCase(),
              badge: (k.knowledge_type || "NOTE").toUpperCase(),
              updated: "Recently",
              time: "Recently",
              spaceId: k.space_id,
              confidence: `${Math.round((k.confidence || 0.9) * 100)}%`,
              summary: k.content.slice(0, 150),
              content: k.content,
              meta: `${k.knowledge_type} • ${new Date(k.created_at).toLocaleDateString()}`,
              tags: [k.knowledge_type],
            }));
            updates.recentObjects = objects;
            updates.uploadedDocuments = objects.filter((o) => o.type === "DOCUMENT");

            if (objects.length > 0 && get().activityFeed.length === 0) {
              updates.activityFeed = objects.slice(0, 8).map((obj) => ({
                id: `act-${obj.id}`,
                title: `${obj.type === "DOCUMENT" ? "Document added" : "Note saved"}: ${obj.title}`,
                text: obj.summary || obj.title,
                time: "Recently",
                space: "General",
                iconType: obj.type === "DOCUMENT" ? "file" : "sparkles",
                color: "#6366F1",
                bg: "var(--surface-hover)",
              }));
            }
          }

          set((state) => ({ ...state, ...updates }));
        } catch (err) {
          console.warn("Backend sync error:", err);
        }
      },
    }),
    {
      name: "querymind_storage_v3",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Default theme must be dark
        if (!state.theme || state.theme === "light") {
          state.theme = "dark";
        }
        if (!state.accentColor) state.accentColor = "#FFFFFF";
        if (!state.uiDensity) state.uiDensity = "comfortable";
        if (state.reduceMotion === undefined) state.reduceMotion = false;
        if (state.soundEffects === undefined) state.soundEffects = true;
        if (!state.aiModel) state.aiModel = "gemini-3.7-flash";
        if (state.webSearchEnabled === undefined) state.webSearchEnabled = true;
        if (state.codeExecution === undefined) state.codeExecution = true;
        if (!state.defaultSpaceId) state.defaultSpaceId = "";
        if (!state.language) state.language = "en";

        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", state.theme || "dark");
          document.documentElement.setAttribute("data-density", state.uiDensity || "comfortable");
          if (state.accentColor) {
            document.documentElement.style.setProperty("--accent", state.accentColor);
            document.documentElement.style.setProperty("--accent-soft", state.accentColor + "26");
          }
        }
        // If onboarding has not been completed, spaces must be empty
        if (!state.hasCompletedOnboarding) {
          state.spaces = [];
          state.activeSpaceId = "";
        }
        if (!state.personalization) {
          state.personalization = defaultPersonalizationSettings;
        } else {
          state.personalization = { ...defaultPersonalizationSettings, ...state.personalization };
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
          color: s.color || "#FFFFFF",
          agentPersona: s.agentPersona ? { ...s.agentPersona, avatarBg: s.agentPersona.avatarBg || "#262626" } : undefined,
        }));
        state.recentObjects = dedupe(state.recentObjects);
        state.uploadedDocuments = dedupe(state.uploadedDocuments);
      },
    }
  )
);
