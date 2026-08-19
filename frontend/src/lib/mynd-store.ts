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
  goal?: SpaceGoal;
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

  setUserProfile: (profile: Partial<UserProfile>) => void;
  addDocument: (doc: {
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
  addSpace: (space: { name: string; desc?: string; color?: string; id?: string }) => void;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpaceId: (spaceId: string) => void;
  clearSpaces: () => void;
  clearAllData: () => void;
  loadSampleData: () => void;
}

// Initial Clean Default State (starts with your real workspace)
const initialSpaces: Space[] = [
  {
    id: "general",
    name: "General",
    status: "Active",
    count: 0,
    updated: "Just now",
    pinned: true,
    color: "#8B5CF6",
    desc: "Primary workspace for uploaded documents, notes, and research",
    goal: { title: "Index Knowledge & Documents", progress: 0 },
    liveUpdate: { text: "Ready for document ingestion", time: "Now" },
    sections: {
      knowledge: [],
      projects: [],
      notes: [],
    },
    objects: [],
  },
  {
    id: "projects",
    name: "Projects",
    status: "Active",
    count: 0,
    updated: "Today",
    pinned: true,
    color: "#3B82F6",
    desc: "Code repositories, architecture specs, and system designs",
    goal: { title: "Track Project Architecture", progress: 0 },
    sections: { knowledge: [], projects: [] },
    objects: [],
  },
  {
    id: "research",
    name: "Research",
    status: "Active",
    count: 0,
    updated: "Today",
    pinned: false,
    color: "#10B981",
    desc: "Technical papers, papers, and AI engineering notes",
    goal: { title: "Explore AI Paradigms", progress: 0 },
    sections: { knowledge: [], notes: [] },
    objects: [],
  },
];

const initialProfile: UserProfile = {
  name: "User",
  email: "user@querymind.os",
  role: "Knowledge Explorer",
  timezone: "UTC+05:30 (India Standard Time)",
  focusDomain: "General & Projects",
  stats: {
    knowledgeObjects: 0,
    connections: 0,
    daemonsRunning: 1,
    learningHours: "0.0 hrs",
  },
};

export const useMyndStore = create<MyndState>()(
  persist(
    (set, get) => ({
      theme: "light",
      activeRoute: "home",
      activeSpaceId: "general",
      activeSpaceTab: "overview",
      activeSpaceSection: "all",
      selectedObject: null,

      isFocusMode: false,
      isZenMode: false,
      isSpotlightOpen: false,
      isAskAiOpen: false,
      askAiTarget: null,
      isSettingsOpen: false,
      activeSettingsTab: "general",

      userProfile: initialProfile,
      spaces: initialSpaces,
      activityFeed: [
        {
          id: "init-act",
          title: "QueryMind OS Initialized",
          text: "Ready for live document ingestion into Qdrant & Gemini",
          time: "Just now",
          space: "General",
          iconType: "sparkles",
          color: "#8B5CF6",
          bg: "#F5F3FF",
        },
      ],
      recentObjects: [],
      uploadedDocuments: [],
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
      openObjectModal: (obj) => set({ selectedObject: obj }),
      closeObjectModal: () => set({ selectedObject: null }),

      toggleTheme: () => {
        const cur = get().theme;
        const next = cur === "light" ? "dark" : cur === "dark" ? "zen" : "light";
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

      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),

      addDocument: (doc) => {
        const targetSpaceId = doc.spaceId || get().activeSpaceId || "general";
        const newObj: KnowledgeObject = {
          id: `doc-${Date.now()}`,
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
          id: `act-${Date.now()}`,
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
            uploadedDocuments: [newObj, ...state.uploadedDocuments],
            recentObjects: [newObj, ...state.recentObjects],
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
          color: "#8B5CF6",
          bg: "#F5F3FF",
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
            recentObjects: [newNote, ...state.recentObjects],
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
          color: space.color || "#6366F1",
          sections: { knowledge: [], notes: [], projects: [] },
          objects: [],
        };
        set((state) => ({
          spaces: [...state.spaces, newSpace],
        }));
      },

      setSpaces: (spaces: Space[]) => {
        set({ spaces });
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
    }
  )
);
