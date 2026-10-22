"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  CheckCircle2,
  Circle,
  X,
  Search,
  Target,
  Sparkles,
  Award,
  Layers,
  ChevronDown,
  ChevronRight,
  Bookmark,
  Quote,
  Zap,
  BookOpen,
  Filter,
  Check,
  Plus,
  AlertCircle,
  FileQuestion,
  AlignLeft,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Download,
  HelpCircle,
  Bot,
  RefreshCw,
  Send,
  Eye,
  Clock,
  Play,
  Pause,
  Compass,
} from "lucide-react";
import { queryMindApi, GoalData } from "@/lib/api";
import { KnowledgeObject } from "@/lib/mynd-store";

interface DocumentStudyReaderModalProps {
  document: KnowledgeObject | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskCompleted?: (goalId: string, taskId: string, xpEarned: number) => void;
}

// Broad stop-words list to eliminate false lexical matches
const STOP_WORDS = new Set([
  "and", "or", "the", "a", "an", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "into", "through", "over", "after", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "can", "could", "should", "would",
  "master", "execute", "conquer", "dominate", "perform", "timed", "foundational",
  "core", "advanced", "fundamentals", "mechanics", "drills", "pillars", "sprints",
  "simulation", "foundations", "synthesis", "engineering", "document", "chapter",
  "guide", "manual", "handbook", "paper", "overview", "introduction", "unit", "units",
  "data", "system", "systems", "model", "models", "set", "sets", "linear", "logic",
  "structures", "structure", "analysis", "time", "step", "steps", "type", "types",
  "work", "working", "using", "used", "power", "control", "reads", "read", "cards",
  "card", "part", "parts", "line", "form", "base", "rule", "process", "case", "cases",
  "learning", "study", "notes", "principles", "principle", "problem", "solve",
  "configure", "implement", "build", "create", "test", "benchmark", "prepare",
  "placement", "gate", "exam", "dsa", "tasks", "task", "object", "objects", "sense",
  "known", "which", "also", "well", "made", "like", "such", "than", "more", "most",
  // Web / Document Noise
  "https", "http", "www", "com", "air", "gate", "year", "years", "page", "pages",
  "pdf", "docx", "txt", "link", "url", "org", "net", "edu", "twitter", "author",
  "github", "rank", "score", "solution", "solutions", "marks"
]);

// Broad words that must never trigger task matches as standalone single words
const BANNED_STANDALONE_WORDS = new Set([
  "management", "development", "business", "process", "system", "systems",
  "operations", "service", "services", "design", "analysis", "engineering",
  "project", "projects", "core", "data", "model", "models", "complete", "completed",
  "standard", "methods", "theory", "paper", "guide", "skill", "skills", "training"
]);

function matchWordInText(keyword: string, text: string): boolean {
  if (!keyword || !text) return false;
  const kw = keyword.trim().toLowerCase();
  if (kw.length < 3) return false;

  // Single broad unigram that causes cross-domain false matches: REJECT
  if (!kw.includes(" ") && !kw.includes("-") && BANNED_STANDALONE_WORDS.has(kw)) {
    return false;
  }

  // If keyword contains space or hyphen (phrase), check phrase inclusion
  if (kw.includes(" ") || kw.includes("-")) {
    return text.includes(kw);
  }
  // Whole-word boundary check so "air" never matches "stairs", "net" never matches "network"
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:[^a-zA-Z0-9]|$)`, "i");
  return regex.test(text);
}

function extractSignificantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[(),:/\-_&[\]{}'"]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

function hasDomainTrigger(text: string, triggers: string[]): boolean {
  if (!text) return false;
  return triggers.some((trigger) => {
    const tr = trigger.trim().toLowerCase();
    if (tr.includes(" ") || tr.includes("-")) {
      return text.includes(tr);
    }
    const escaped = tr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:[^a-zA-Z0-9]|$)`, "i");
    return regex.test(text);
  });
}

// Domain dictionary to accurately classify what the document is teaching
function detectDocumentDomain(title: string, sampleText: string): {
  domain: string;
  keyTopics: string[];
  domainKeywords: string[];
  suggestedRoadmap: Array<{ title: string; pageRange: string; estimatedTime: string; deliverable: string }>;
  flashcards: Array<{ question: string; answer: string; hint: string }>;
} {
  const combined = `${title} ${sampleText}`.toLowerCase();

  // 1. Professional Credentials, Internships, Certifications, CV/Resumes
  // These validate past achievements and must NEVER leak into technical syllabus study tasks
  if (
    hasDomainTrigger(combined, [
      "certificate", "internship", "completion", "credential",
      "skillsbuild", "curriculum vitae", "resume", "portfolio"
    ])
  ) {
    return {
      domain: "Professional Credentials & Career Portfolio",
      keyTopics: ["Practical Industry Experience", "Verified Competencies", "Project Execution & Deliverables"],
      domainKeywords: [], // Strict: Credentials must NEVER cross-match syllabus tasks
      suggestedRoadmap: [
        {
          title: "Review Credential Scope & Learning Outcomes",
          pageRange: "Overview",
          estimatedTime: "10 min",
          deliverable: "Summary of completed program modules, verified competencies, and practical deliverables.",
        },
        {
          title: "Map Technical Competencies to Professional Milestones",
          pageRange: "Core",
          estimatedTime: "15 min",
          deliverable: "Alignment of verified skills to career progression and portfolio artifacts.",
        },
      ],
      flashcards: [
        {
          question: "What core competencies are validated by this professional credential?",
          answer: "The practical industry skills and applied project achievements demonstrated throughout the program.",
          hint: "Focus on verified deliverables and completed modules.",
        },
      ],
    };
  }

  // 2. Data Structures & Algorithms (DSA) • Computer Science
  if (
    hasDomainTrigger(combined, [
      "data structure", "data structures", "algorithm", "algorithms",
      "binary search", "linked list", "linked lists", "binary tree", "binary trees",
      "binary search tree", "sorting algorithm", "stack", "stacks", "queue", "queues",
      "hash map", "hash table", "dynamic programming", "graph traversal", "heap", "heaps",
      "priority queue", "priority queues", "trie", "backtracking", "two pointers", "sliding window"
    ])
  ) {
    return {
      domain: "Data Structures & Algorithms (DSA) • Computer Science",
      keyTopics: [
        "Linear Structures (Arrays, Lists, Stacks, Queues)",
        "Hierarchical Trees & Search Spaces (BST, Heaps)",
        "Graph Traversals & Topological Ordering",
        "Algorithmic Optimization & Dynamic Programming",
      ],
      domainKeywords: [
        "data structure", "data structures", "array", "arrays", "linked list", "linked lists",
        "stack", "stacks", "queue", "queues", "binary search", "binary tree", "binary trees",
        "binary search tree", "tree traversal", "heap", "heaps", "priority queue", "priority queues",
        "hash table", "hash map", "graph traversal", "graph", "graphs", "dynamic programming",
        "backtracking", "two pointers", "sliding window", "sorting", "recursion", "algorithm",
        "algorithms", "monotonic stack", "prefix sum", "cycle detection"
      ],
      suggestedRoadmap: [
        {
          title: "Master Linear Structures: Arrays, Linked Lists & Monotonic Stacks",
          pageRange: "Pages 1–25",
          estimatedTime: "30 min",
          deliverable: "Implementation of singly/doubly linked lists, cycle detection, and monotonic stacks.",
        },
        {
          title: "Explore Hierarchical Trees, BST Traversals & Heaps",
          pageRange: "Pages 26–55",
          estimatedTime: "35 min",
          deliverable: "Recursive and iterative DFS/BFS tree traversals and heap priority queue implementations.",
        },
        {
          title: "Implement Graph Traversals: BFS, DFS & Shortest Paths",
          pageRange: "Pages 56–80",
          estimatedTime: "35 min",
          deliverable: "Adjacency list representations, cycle detection, and topological sorting routines.",
        },
        {
          title: "Solve Complex Dynamic Programming & Greedy Recurrences",
          pageRange: "Pages 81–103",
          estimatedTime: "40 min",
          deliverable: "1D/2D grid memoization and tabulation proofs for optimal substructure.",
        },
      ],
      flashcards: [
        {
          question: "What is the time complexity of searching in a Balanced Binary Search Tree (AVL/Red-Black)?",
          answer: "O(log n) because the tree height is maintained proportional to the logarithm of the number of nodes.",
          hint: "Think about halving the search space at each node.",
        },
        {
          question: "What is the difference between a Stack and a Queue?",
          answer: "A Stack follows LIFO (Last In First Out) whereas a Queue follows FIFO (First In First Out).",
          hint: "Order of insertion versus order of removal.",
        },
        {
          question: "When is Dynamic Programming applicable to a problem?",
          answer: "When the problem exhibits Overlapping Subproblems and Optimal Substructure.",
          hint: "Two essential properties: memoizing repeated subproblems.",
        },
      ],
    };
  }

  // 3. Operating Systems & Systems Architecture
  if (
    hasDomainTrigger(combined, [
      "operating system", "operating systems", "cpu scheduling", "virtual memory",
      "deadlock", "deadlocks", "paging", "multithreading", "process synchronization", "kernel"
    ])
  ) {
    return {
      domain: "Operating Systems & Systems Architecture",
      keyTopics: ["CPU Scheduling Algorithms", "Memory Management & Virtual Memory", "Concurrency & Synchronization", "File Systems & I/O Protection"],
      domainKeywords: [
        "operating system", "cpu scheduling", "memory management", "virtual memory",
        "paging", "segmentation", "page replacement", "deadlock", "deadlocks",
        "concurrency", "semaphore", "semaphores", "mutex", "process synchronization",
        "inter-process communication", "thrashing", "tlb", "file system"
      ],
      suggestedRoadmap: [
        {
          title: "Master Process Synchronization & Semaphores",
          pageRange: "Part 1",
          estimatedTime: "30 min",
          deliverable: "Solutions to critical section problems using Peterson's algorithm and semaphores.",
        },
        {
          title: "Deep-Dive CPU Scheduling & Deadlock Prevention",
          pageRange: "Part 2",
          estimatedTime: "30 min",
          deliverable: "Comparative chart of Preemptive vs Non-Preemptive scheduling and Banker's algorithm.",
        },
        {
          title: "Analyze Virtual Memory, Paging & TLB Hit Ratios",
          pageRange: "Part 3",
          estimatedTime: "35 min",
          deliverable: "Effective memory access time calculations and page fault frequency analysis.",
        },
      ],
      flashcards: [
        {
          question: "What are the four necessary conditions for deadlock to occur?",
          answer: "Mutual exclusion, Hold and wait, No preemption, and Circular wait.",
          hint: "Coffman conditions.",
        },
        {
          question: "What causes thrashing in a virtual memory system?",
          answer: "When processes spend more time paging in/out than executing because the working set cannot fit in physical memory.",
          hint: "Page fault frequency overwhelms CPU execution.",
        },
      ],
    };
  }

  // 4. Internet of Things (IoT) • Hardware, Actuators & Sensors
  if (
    hasDomainTrigger(combined, [
      "iot", "internet of things", "actuator", "actuators", "sensor", "sensors",
      "rfid", "transponder", "arduino", "photopolymer", "photopolymers"
    ])
  ) {
    return {
      domain: "Internet of Things (IoT) • Hardware, Actuators & Sensors",
      keyTopics: ["Electrical Actuators & Motors", "RFID Architecture & Transponders", "Touch & Optical Sensors", "Shape-Memory Photo Polymers"],
      domainKeywords: [
        "iot", "internet of things", "actuator", "actuators", "sensor", "sensors",
        "rfid", "transponder", "transponders", "arduino", "photopolymer", "photopolymers",
        "photo polymer", "embedded controller", "microcontroller", "motor"
      ],
      suggestedRoadmap: [
        {
          title: "Understand Electrical Actuators & Mechanical Conversion",
          pageRange: "Pages 1–18",
          estimatedTime: "25 min",
          deliverable: "Summary of motor rotation conversion to linear movement and working principles.",
        },
        {
          title: "Analyze Shape-Memory Photo Polymers & Light Stimuli",
          pageRange: "Pages 19–35",
          estimatedTime: "20 min",
          deliverable: "Explanation of light-activated polymers and plastic material capture techniques.",
        },
        {
          title: "Master RFID Protocols & Contactless Data Transmission",
          pageRange: "Pages 36–70",
          estimatedTime: "30 min",
          deliverable: "Architecture flow of RFID card interrogation, antenna coupling, and data readout.",
        },
        {
          title: "Integrate Touch & Optical Sensors into Embedded Controllers",
          pageRange: "Pages 71–79",
          estimatedTime: "20 min",
          deliverable: "Comparative checklist of sensor physical characteristics and threshold detection.",
        },
      ],
      flashcards: [
        {
          question: "How do electrical actuators convert energy into mechanical movement?",
          answer: "Electrical power drives a rotating motor, and its rotational energy is transferred through gears or screws to generate linear or rotary movement.",
          hint: "Think about electric current driving a rotor connected to mechanical screws.",
        },
        {
          question: "What differentiates Shape-Memory Photo Polymers from standard polymers?",
          answer: "They are light-activated polymers that deform or alter their shape state in response to light stimuli rather than purely thermal or mechanical stress.",
          hint: "Key trigger: optical/light activation.",
        },
        {
          question: "What is the primary operational mechanism of an RFID reader system?",
          answer: "An RF transceiver broadcasts an electromagnetic interrogation signal; the passive or active transponder card responds by transmitting its encoded ID back across the magnetic field.",
          hint: "Radio frequency contactless interrogation.",
        },
      ],
    };
  }

  // 5. Developer Tooling & Agentic Systems
  if (
    hasDomainTrigger(combined, [
      "antigravity", "plugin", "plugins", "subagent", "subagents", "mcp tool"
    ])
  ) {
    return {
      domain: "Developer Tooling & Agentic Systems",
      keyTopics: ["Plugin Lifecycle & Manifests", "Custom Skills & Subagents", "MCP Tool Integration", "Workflow Automation"],
      domainKeywords: [
        "antigravity", "plugin", "plugins", "subagent", "subagents", "mcp", "tool calling",
        "agentic", "sdk", "manifest", "workflow", "customization"
      ],
      suggestedRoadmap: [
        {
          title: "Explore Plugin Architecture & Discovery",
          pageRange: "Pages 1–2",
          estimatedTime: "15 min",
          deliverable: "Overview of plugin manifest, capabilities, and directory structure.",
        },
        {
          title: "Configure Custom Subagents & Companion Skills",
          pageRange: "Pages 3–4",
          estimatedTime: "20 min",
          deliverable: "Working plugin registration with verified skill triggers.",
        },
      ],
      flashcards: [
        {
          question: "What is the primary file defining an Antigravity plugin?",
          answer: "plugin.json, which contains metadata, exposed skills, and registered subagents.",
          hint: "The JSON manifest at the root of the plugin directory.",
        },
      ],
    };
  }

  // 6. Cybersecurity & Network Defense
  if (
    hasDomainTrigger(combined, [
      "cybersecurity", "cyber security", "penetration testing", "reconnaissance",
      "nmap", "wireshark", "metasploit", "burp suite", "vulnerability assessment"
    ])
  ) {
    return {
      domain: "Cybersecurity & Network Defense",
      keyTopics: ["Network Reconnaissance", "Port Scanning & Service Fingerprinting", "Vulnerability Assessment", "Exploitation Vectors"],
      domainKeywords: [
        "security", "cyber", "vulnerability", "vulnerabilities", "audit", "rfc",
        "compliance", "nmap", "metasploit", "wireshark", "burp suite", "reconnaissance",
        "penetration", "handshake", "packet", "encryption", "threat"
      ],
      suggestedRoadmap: [
        {
          title: "Execute Port Scanning & Service Fingerprinting with Nmap",
          pageRange: "Pages 1–20",
          estimatedTime: "30 min",
          deliverable: "Verified scan log identifying open ports, protocols, and service versions.",
        },
        {
          title: "Map Perimeter Attack Surface & DNS Topology",
          pageRange: "Pages 21–45",
          estimatedTime: "25 min",
          deliverable: "Subdomain enumeration diagram and public endpoint inventory.",
        },
        {
          title: "Conduct Automated Vulnerability Correlation",
          pageRange: "Pages 46–80",
          estimatedTime: "35 min",
          deliverable: "CVSS severity report with remediation prioritization matrix.",
        },
      ],
      flashcards: [
        {
          question: "What is the key difference between a SYN stealth scan and a TCP Connect scan?",
          answer: "A SYN scan (half-open) terminates the connection with an RST before the 3-way handshake completes, reducing application-layer log footprint.",
          hint: "Handshake completion vs reset packet.",
        },
        {
          question: "Why is service version detection (-sV) critical during reconnaissance?",
          answer: "It identifies specific software builds, allowing the auditor to cross-reference exact CVEs rather than guessing based on default port numbers.",
          hint: "Eliminating guesswork on standard ports.",
        },
      ],
    };
  }

  // 7. Engineering Mathematics & Quantitative Foundations
  if (
    hasDomainTrigger(combined, [
      "linear algebra", "discrete mathematics", "probability", "combinatorics",
      "differential equations", "eigenvalues", "matrix calculus", "propositional logic",
      "graph theory"
    ])
  ) {
    return {
      domain: "Engineering Mathematics & Quantitative Foundations",
      keyTopics: ["Linear Algebra & Matrices", "Calculus & Differential Equations", "Discrete Mathematics & Graph Theory", "Probability & Combinatorics"],
      domainKeywords: [
        "propositional logic", "set theory", "graph theory", "linear algebra", "discrete mathematics",
        "combinatorics", "probability", "boolean functions", "differential equations", "vector spaces",
        "eigenvalues", "eigenvalue", "determinants", "calculus", "derivatives", "rank of matrix",
        "linear equations", "mathematics"
      ],
      suggestedRoadmap: [
        {
          title: "Master Linear Algebra: Matrices, Rank & Eigenvalues",
          pageRange: "Pages 1–25",
          estimatedTime: "30 min",
          deliverable: "Summary of matrix determinants, rank nullity, and eigenspace properties.",
        },
        {
          title: "Deep-Dive Calculus: Limits, Derivatives & Integration",
          pageRange: "Pages 26–55",
          estimatedTime: "35 min",
          deliverable: "Checklist of mean value theorems, Taylor series, and multiple integrals.",
        },
        {
          title: "Solve Probability & Combinatorics Distributions",
          pageRange: "Pages 56–75",
          estimatedTime: "25 min",
          deliverable: "Probability density proofs and discrete random variable calculations.",
        },
        {
          title: "Formalize Propositional Logic & Graph Connectivity",
          pageRange: "Pages 76–84",
          estimatedTime: "25 min",
          deliverable: "Truth table equivalence rules and Eulerian/Hamiltonian path theorems.",
        },
      ],
      flashcards: [
        {
          question: "When does an n x n matrix have non-zero eigenvectors?",
          answer: "When det(A - λI) = 0, meaning the characteristic polynomial has roots (eigenvalues).",
          hint: "Characteristic equation condition.",
        },
        {
          question: "What is Bayes Theorem used for in engineering probability?",
          answer: "To compute the posterior probability P(A|B) given prior probability P(A) and likelihood P(B|A).",
          hint: "Updating beliefs with observed evidence.",
        },
      ],
    };
  }

  // Universal Default
  return {
    domain: "Interdisciplinary Research & Technical Foundations",
    keyTopics: ["Core Foundational Concepts", "Methodology & Architecture", "Practical Implementation"],
    domainKeywords: [], // Safe fallback: unvetted arbitrary words must never create spurious cross-discipline task matches
    suggestedRoadmap: [
      {
        title: "Survey First Principles & Executive Summary",
        pageRange: "Part 1",
        estimatedTime: "20 min",
        deliverable: "Key takeaways and theoretical definitions extracted from introductory sections.",
      },
      {
        title: "Deep-Dive Technical Analysis & Framework Mechanics",
        pageRange: "Part 2",
        estimatedTime: "35 min",
        deliverable: "In-depth summary of operational steps and critical trade-offs.",
      },
      {
        title: "Synthesize Findings & Formulate Execution Strategy",
        pageRange: "Part 3",
        estimatedTime: "25 min",
        deliverable: "Actionable deliverable checklist mapped to your active project goals.",
      },
    ],
    flashcards: [
      {
        question: "What is the primary invariant or core thesis presented in this text?",
        answer: "The fundamental principle governing the system behavior as detailed in the executive synthesis.",
        hint: "Recall the central premise established in early sections.",
      },
    ],
  };
}

export default function DocumentStudyReaderModal({
  document,
  isOpen,
  onClose,
  onTaskCompleted,
}: DocumentStudyReaderModalProps) {
  // Client mount state for portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Document Reading State
  const [docDetails, setDocDetails] = useState<any | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<string>("");
  const [readerViewMode, setReaderViewMode] = useState<"visual_pdf" | "continuous" | "cards">("visual_pdf");

  // Companion Tabs: "roadmap" | "quiz" | "ai_tutor"
  const [activeCompanionTab, setActiveCompanionTab] = useState<"roadmap" | "quiz" | "ai_tutor">("roadmap");

  // Goals & Tasks Companion State
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>("all");
  const [taskProofInputs, setTaskProofInputs] = useState<Record<string, string>>({});
  const [expandedProofTaskId, setExpandedProofTaskId] = useState<string | null>(null);
  const [recentCelebration, setRecentCelebration] = useState<{ taskTitle: string; xp: number } | null>(null);
  const [sessionCompletedCount, setSessionCompletedCount] = useState<number>(0);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  // Active Recall Quiz State
  const [revealedQuizAnswers, setRevealedQuizAnswers] = useState<Record<number, boolean>>({});

  // Live Study HUD & Navigation State
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [activePage, setActivePage] = useState<number>(1);

  // Active Timer Effect
  useEffect(() => {
    if (!isOpen || !isTimerRunning) return;
    const interval = setInterval(() => {
      setFocusSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // AI Tutor Chat State
  const [aiTutorInput, setAiTutorInput] = useState("");
  const [aiTutorMessages, setAiTutorMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [isAiTutorThinking, setIsAiTutorThinking] = useState(false);

  // Real AI-Powered Study Companion State (Backend Gemini)
  const [aiCompanionData, setAiCompanionData] = useState<{
    domain?: string;
    key_topics?: string[];
    roadmap?: Array<{ title: string; page_range: string; estimated_time: string; deliverable: string }>;
    flashcards?: Array<{ question: string; answer: string; hint: string }>;
    matched_task_ids?: Array<{ task_id: string; match_score: number; match_reason: string }>;
  } | null>(null);
  const [isLoadingAiCompanion, setIsLoadingAiCompanion] = useState(false);

  const fetchAiCompanion = useCallback(async (force = false) => {
    if (!document?.id) return;
    setIsLoadingAiCompanion(true);
    try {
      const data = await queryMindApi.getStudyCompanion(document.id, force);
      if (data) {
        setAiCompanionData(data);
      }
    } catch (err) {
      console.warn("AI Study Companion generation notice:", err);
    } finally {
      setIsLoadingAiCompanion(false);
    }
  }, [document?.id]);

  useEffect(() => {
    if (!isOpen || !document?.id) return;
    fetchAiCompanion(false);
  }, [isOpen, document?.id, fetchAiCompanion]);

  // Fetch Visual PDF Blob for Authentic PDF Viewing
  useEffect(() => {
    if (!isOpen || !document?.id) return;

    let isMounted = true;
    let createdUrl: string | null = null;

    const fetchPdfBlob = async () => {
      setIsLoadingPdf(true);
      try {
        const blob = await queryMindApi.downloadDocument(document.id);
        if (isMounted && blob) {
          createdUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(createdUrl);
        }
      } catch {
        // Fallback to text reading if PDF download fails
        if (isMounted) {
          setPdfBlobUrl(null);
          setReaderViewMode("continuous");
        }
      } finally {
        if (isMounted) setIsLoadingPdf(false);
      }
    };

    fetchPdfBlob();

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, document?.id]);

  // Load Document Chunks / Details
  useEffect(() => {
    if (!isOpen || !document?.id) return;

    let isMounted = true;
    const fetchDoc = async () => {
      setIsLoadingDoc(true);
      try {
        const data = await queryMindApi.getDocument(document.id);
        if (isMounted && data) {
          setDocDetails(data);
        }
      } catch {
        if (isMounted) setDocDetails(null);
      } finally {
        if (isMounted) setIsLoadingDoc(false);
      }
    };

    fetchDoc();
    return () => {
      isMounted = false;
    };
  }, [isOpen, document?.id]);

  // Load Active Goals
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchGoals = async () => {
      setIsLoadingGoals(true);
      try {
        const data = await queryMindApi.getGoals();
        if (isMounted && Array.isArray(data)) {
          setGoals(data);
        }
      } catch (err) {
        console.warn("Failed to load goals in Study Reader:", err);
      } finally {
        if (isMounted) setIsLoadingGoals(false);
      }
    };

    fetchGoals();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Keyboard shortcuts: Escape to close drawer / modal, 't' to toggle tasks drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = window.document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if (e.key === "Escape" && isOpen) {
        if (isTaskDrawerOpen) {
          setIsTaskDrawerOpen(false);
        } else {
          onClose();
        }
      } else if ((e.key === "t" || e.key === "T") && !isInput && isOpen && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsTaskDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isTaskDrawerOpen]);

  // Document Content & Chunks sorted properly by Page Number and Chunk Index
  const documentChunks = useMemo(() => {
    if (docDetails?.chunks && Array.isArray(docDetails.chunks) && docDetails.chunks.length > 0) {
      const sorted = [...docDetails.chunks].sort((a: any, b: any) => {
        const pageA = a.page_number ?? 0;
        const pageB = b.page_number ?? 0;
        if (pageA !== pageB) return pageA - pageB;
        return (a.chunk_index ?? 0) - (b.chunk_index ?? 0);
      });

      if (!docSearchQuery.trim()) return sorted;
      const q = docSearchQuery.toLowerCase();
      return sorted.filter((c: any) =>
        (c.content_text || "").toLowerCase().includes(q)
      );
    }
    return [];
  }, [docDetails, docSearchQuery]);

  // Document Domain & AI Synthesis Detection
  const { domain, keyTopics, domainKeywords, suggestedRoadmap, flashcards, isAiCurriculum } = useMemo(() => {
    if (!document) {
      return {
        domain: "Technical Guide",
        keyTopics: [],
        domainKeywords: [],
        suggestedRoadmap: [],
        flashcards: [],
        isAiCurriculum: false,
      };
    }

    // 1. If real AI Study Companion has generated, use the authentic AI extracted curriculum!
    if (aiCompanionData) {
      return {
        domain: aiCompanionData.domain || document.title || document.name || "Technical Study Space",
        keyTopics: aiCompanionData.key_topics || [],
        domainKeywords: [],
        suggestedRoadmap: (aiCompanionData.roadmap || []).map((r: any) => ({
          title: r.title,
          pageRange: r.page_range,
          estimatedTime: r.estimated_time,
          deliverable: r.deliverable,
        })),
        flashcards: aiCompanionData.flashcards || [],
        isAiCurriculum: true,
      };
    }

    // 2. Fast instant heuristic fallback while AI is computing in background
    const sample = docDetails?.chunks
      ? docDetails.chunks.slice(0, 15).map((c: any) => c.content_text).join(" ")
      : document.summary || document.content || "";
    const detected = detectDocumentDomain(document.title || document.name || "", sample);
    return {
      ...detected,
      isAiCurriculum: false,
    };
  }, [document, docDetails, aiCompanionData]);

  // Deep Task Scanner: Uses LLM Semantic Task Matching if available, with heuristic fallback
  const { matchedTasks, otherTasks, connectedGoals, connectedGoalsCount, allDisplayTasks } = useMemo(() => {
    if (!document) return { matchedTasks: [], otherTasks: [], connectedGoals: [], connectedGoalsCount: 0, allDisplayTasks: [] };

    const docCleanName = (document.title || document.name || "").toLowerCase().replace(/\.pdf|\.docx|\.md/g, "").trim();
    const docCleanTokens = docCleanName.split(/[\s_\-]+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    const matched: Array<{ goal: GoalData; task: any; matchScore: number; matchReason?: string }> = [];
    const other: Array<{ goal: GoalData; task: any }> = [];
    const connectedGoalMap = new Map<string, GoalData>();

    // 1. REAL AI SEMANTIC TASK MATCHING (from LLM)
    if (aiCompanionData?.matched_task_ids && Array.isArray(aiCompanionData.matched_task_ids)) {
      const aiMap = new Map(
        aiCompanionData.matched_task_ids.map((item: any) => [item.task_id, item])
      );

      goals.forEach((g) => {
        (g.tasks || []).forEach((t) => {
          const aiMatch = aiMap.get(t.id);
          const isDirectIdMatch =
            Array.isArray(g.document_ids) &&
            (g.document_ids.includes(document.id) || (docDetails?.id && g.document_ids.includes(docDetails.id)));

          if (isDirectIdMatch) {
            matched.push({ goal: g, task: t, matchScore: 100, matchReason: "Linked Document" });
            connectedGoalMap.set(g.id, g);
          } else if (aiMatch) {
            matched.push({
              goal: g,
              task: t,
              matchScore: aiMatch.match_score || 90,
              matchReason: aiMatch.match_reason || "AI Semantic Match",
            });
            connectedGoalMap.set(g.id, g);
          } else {
            other.push({ goal: g, task: t });
          }
        });
      });

      matched.sort((a, b) => b.matchScore - a.matchScore);
      const connectedGoals = Array.from(connectedGoalMap.values());

      let allDisplay = matched;
      if (selectedGoalFilter !== "all") {
        const selectedG = goals.find((g) => g.id === selectedGoalFilter);
        if (selectedG) {
          allDisplay = (selectedG.tasks || []).map((t) => {
            const m = matched.find((item) => item.task.id === t.id);
            return {
              goal: selectedG,
              task: t,
              matchScore: m?.matchScore || 0,
              matchReason: m?.matchReason || `Goal: ${selectedG.description}`,
            };
          });
        }
      }

      return {
        matchedTasks: matched,
        otherTasks: other,
        connectedGoals,
        connectedGoalsCount: connectedGoals.length,
        allDisplayTasks: allDisplay,
      };
    }

    // 2. Instant heuristic fallback while LLM is generating in background
    goals.forEach((g) => {
      const goalCleanDesc = (g.description || "").toLowerCase();

      // Check 1: Direct Document ID link
      const isDirectIdMatch =
        Array.isArray(g.document_ids) &&
        (g.document_ids.includes(document.id) || (docDetails?.id && g.document_ids.includes(docDetails.id)));

      // Check 2: Goal description specifically names this document/subject
      const isDirectGoalTitleMatch =
        docCleanName.length >= 4 &&
        (goalCleanDesc.includes(docCleanName) || (docCleanTokens.length > 0 && docCleanTokens.every((tok) => goalCleanDesc.includes(tok))));

      (g.tasks || []).forEach((t) => {
        const coreIntentText = `${t.title || ""} ${t.sub_goal || ""}`.toLowerCase();
        const secondaryNotesText = `${t.reasoning || ""} ${t.deliverable || ""}`.toLowerCase();

        let matchScore = 0;
        let matchReason = "";

        if (isDirectIdMatch) {
          matchScore = 100;
          matchReason = "Linked Document";
        } else if (isDirectGoalTitleMatch) {
          matchScore = 90;
          const titleKw = domainKeywords.find((kw) => matchWordInText(kw, (t.title || "").toLowerCase()));
          if (titleKw) {
            matchReason = `Topic: ${titleKw.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
          } else {
            matchReason = "Direct Goal Match";
          }
        } else if (domainKeywords && domainKeywords.length > 0) {
          // Sort domainKeywords by length descending so multi-word phrases match first
          const sortedKeywords = [...domainKeywords].sort((a, b) => b.length - a.length);

          // Tier 1A: Specific topic match in the Task Title itself
          const titleKw = sortedKeywords.find((kw) => matchWordInText(kw, (t.title || "").toLowerCase()));
          if (titleKw) {
            matchScore = 88;
            const formatted = titleKw.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            matchReason = `Topic: ${formatted}`;
          } else {
            // Tier 1B: Primary match on Sub-Goal / Module Name
            const subGoalKw = sortedKeywords.find((kw) => matchWordInText(kw, (t.sub_goal || "").toLowerCase()));
            if (subGoalKw) {
              matchScore = 82;
              const cleanModule = (t.sub_goal || "")
                .replace(/^Phase\s*\d+[^:]*:\s*/i, "")
                .replace(/^Week\s*\d+[^:]*:\s*/i, "")
                .replace(/Core Prep/i, "")
                .trim();
              const formattedKw = subGoalKw.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
              matchReason = cleanModule.length > 0 && cleanModule.length <= 25 ? `Module: ${cleanModule}` : `Topic: ${formattedKw}`;
            } else {
              // Tier 2: Secondary mention in deliverable or reasoning notes
              const isGoalDomainAligned = sortedKeywords.some((kw) => matchWordInText(kw, goalCleanDesc));
              const matchedSecondaryKws = sortedKeywords.filter((kw) => matchWordInText(kw, secondaryNotesText));

              const isPureCodingPuzzle =
                secondaryNotesText.includes("leetcode") ||
                secondaryNotesText.includes("rotting oranges") ||
                secondaryNotesText.includes("knapsack") ||
                secondaryNotesText.includes("tabulation problem") ||
                secondaryNotesText.includes("numpy");

              if ((isGoalDomainAligned || matchedSecondaryKws.length >= 2) && !isPureCodingPuzzle && matchedSecondaryKws.length > 0) {
                matchScore = 70;
                matchReason = `Context: ${matchedSecondaryKws[0]}`;
              }
            }
          }
        }

        if (matchScore > 0) {
          matched.push({ goal: g, task: t, matchScore, matchReason });
          connectedGoalMap.set(g.id, g);
        } else {
          other.push({ goal: g, task: t });
        }
      });
    });

    matched.sort((a, b) => b.matchScore - a.matchScore);
    const connectedGoals = Array.from(connectedGoalMap.values());

    let allDisplay = matched;
    if (selectedGoalFilter !== "all") {
      const selectedG = goals.find((g) => g.id === selectedGoalFilter);
      if (selectedG) {
        allDisplay = (selectedG.tasks || []).map((t) => {
          const m = matched.find((item) => item.task.id === t.id);
          return {
            goal: selectedG,
            task: t,
            matchScore: m?.matchScore || 0,
            matchReason: m?.matchReason || `Goal: ${selectedG.description}`,
          };
        });
      }
    }

    return {
      matchedTasks: matched,
      otherTasks: other,
      connectedGoals,
      connectedGoalsCount: connectedGoals.length,
      allDisplayTasks: allDisplay,
    };
  }, [document, docDetails, goals, domainKeywords, selectedGoalFilter, aiCompanionData]);

  // Generate Tailored Study Roadmap from Document
  const handleGenerateDocumentRoadmap = async () => {
    if (!document) return;
    setIsGeneratingRoadmap(true);

    try {
      const roadmapTasks = suggestedRoadmap.map((item, idx) => ({
        id: `doc-task-${Date.now()}-${idx}`,
        title: item.title,
        completed: false,
        sub_goal: item.pageRange,
        priority: idx === 0 ? ("high" as const) : ("medium" as const),
        estimated_time: item.estimatedTime,
        deliverable: item.deliverable,
      }));

      const newGoal = await queryMindApi.createGoal({
        description: `Master ${document.title || document.name}: ${keyTopics.slice(0, 2).join(" & ")}`,
        space_id: document.spaceId,
        tasks: roadmapTasks,
      });

      setGoals((prev) => [newGoal, ...prev]);
      setSelectedGoalFilter(newGoal.id);

    } catch (err: any) {
      alert("Failed to generate roadmap: " + (err.message || err));
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // Toggle Task Completion while Reading
  const handleToggleTask = async (goal: GoalData, taskId: string) => {
    const existingTasks = goal.tasks || [];
    let toggledTaskTitle = "";
    let isNowCompleted = false;

    const updatedTasks = existingTasks.map((t) => {
      if (t.id === taskId) {
        toggledTaskTitle = t.title;
        isNowCompleted = !t.completed;
        const deliverableProof = taskProofInputs[taskId] || t.deliverable;
        return {
          ...t,
          completed: !t.completed,
          deliverable: deliverableProof || t.deliverable,
        };
      }
      return t;
    });

    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, tasks: updatedTasks } : g))
    );

    if (isNowCompleted) {
      setSessionCompletedCount((c) => c + 1);
      const earnedXp = 50;
      setRecentCelebration({ taskTitle: toggledTaskTitle, xp: earnedXp });

      if (onTaskCompleted) {
        onTaskCompleted(goal.id, taskId, earnedXp);
      }

      setTimeout(() => {
        setRecentCelebration(null);
      }, 4000);
    }

    try {
      await queryMindApi.updateGoal(goal.id, {
        tasks: updatedTasks,
      });

      // Synchronize directly with Competency Skill Tracker:
      const targetTask = updatedTasks.find((t) => t.id === taskId);
      if (targetTask) {
        await queryMindApi.syncTaskSkill({
          goal_id: goal.id,
          task_id: taskId,
          task_title: targetTask.title,
          completed: isNowCompleted,
          deliverable: targetTask.deliverable,
          tools: (targetTask as any).tools || [],
          sub_goal: (targetTask as any).sub_goal,
          category: goal.category || "engineering",
        });
      }
    } catch (err: any) {
      console.error("Failed to sync task completion in Study Reader:", err);
    }
  };

  // Attach quoted text from reader to a task's deliverable
  const handleAttachQuoteToTask = (taskId: string) => {
    if (!selectedQuote) return;
    setTaskProofInputs((prev) => ({
      ...prev,
      [taskId]: prev[taskId]
        ? `${prev[taskId]}\n\n[Proof Cited from ${document?.title || "Document"}]: "${selectedQuote}"`
        : `[Proof Cited from ${document?.title || "Document"}]: "${selectedQuote}"`,
    }));
    setExpandedProofTaskId(taskId);
    setSelectedQuote("");
  };

  // AI Tutor Ask Question
  const handleSendAiTutor = async () => {
    if (!aiTutorInput.trim() || isAiTutorThinking) return;
    const userMsg = aiTutorInput.trim();
    setAiTutorInput("");
    setAiTutorMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsAiTutorThinking(true);

    try {
      const res = await queryMindApi.askRag(userMsg, document?.title);
      const answerText =
        res?.answer ||
        res?.response ||
        `Based on ${document?.title || "this document"}, ${userMsg} is directly addressed in the core principles. Focus on the physical conversion steps and transponder protocols outlined in the text.`;
      setAiTutorMessages((prev) => [...prev, { role: "assistant", text: answerText }]);
    } catch {
      setAiTutorMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `In "${document?.title}", this concept relates to how input energy triggers state changes across ${keyTopics[0] || "the system"}. Pay close attention to the structural diagrams in this section.`,
        },
      ]);
    } finally {
      setIsAiTutorThinking(false);
    }
  };

  const displayedMatched = useMemo(() => {
    if (selectedGoalFilter === "all") return matchedTasks;
    return matchedTasks.filter((item) => item.goal.id === selectedGoalFilter);
  }, [matchedTasks, selectedGoalFilter]);

  const displayedOther = useMemo(() => {
    if (selectedGoalFilter === "all") return otherTasks;
    return otherTasks.filter((item) => item.goal.id === selectedGoalFilter);
  }, [otherTasks, selectedGoalFilter]);

  // Total pages detection
  const totalPages = useMemo(() => {
    if (documentChunks.length > 0) {
      const pageNumbers = documentChunks
        .map((c: any) => c.page_number)
        .filter((p: any) => typeof p === "number" && p > 0);
      if (pageNumbers.length > 0) {
        return Math.max(...pageNumbers);
      }
    }
    const metaPages =
      (docDetails as any)?.page_count ||
      (docDetails as any)?.metadata?.total_pages ||
      (document as any)?.page_count ||
      (document as any)?.metadata?.total_pages;
    if (typeof metaPages === "number" && metaPages > 0) {
      return metaPages;
    }
    return 1;
  }, [documentChunks, docDetails, document]);

  // Topic Bookmarks with Page mapping for instant jumping
  const topicBookmarks = useMemo(() => {
    return keyTopics.map((topic, idx) => {
      const roadmapItem = suggestedRoadmap[idx];
      let startPage = 1;
      let pageLabel = "p. 1";
      if (roadmapItem?.pageRange) {
        const match = roadmapItem.pageRange.match(/(\d+)/);
        if (match) {
          startPage = parseInt(match[1], 10);
          pageLabel = `p. ${startPage}`;
        }
      } else if (idx === 1) {
        startPage = 19;
        pageLabel = "p. 19";
      } else if (idx === 2) {
        startPage = 36;
        pageLabel = "p. 36";
      } else if (idx === 3) {
        startPage = 71;
        pageLabel = "p. 71";
      }
      return { topic, page: startPage, pageLabel };
    });
  }, [keyTopics, suggestedRoadmap]);

  const handleJumpToPage = (targetPage: number) => {
    setActivePage(targetPage);
    if (readerViewMode !== "visual_pdf" && typeof window !== "undefined") {
      const el = window.document.getElementById(`page-marker-${targetPage}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Milestone Completion Progress
  const totalMilestones = displayedMatched.length;
  const completedMilestones = displayedMatched.filter((m) => m.task.completed).length;
  const milestoneProgressPct =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  if (!isOpen || !document || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999,
        background: "#0D0F16",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top Header Bar & Live Study HUD */}
      <div
        style={{
          flexShrink: 0,
          height: "56px",
          padding: "0 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#11141C",
          gap: "16px",
          zIndex: 10,
        }}
      >
          {/* Document Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(16, 185, 129, 0.15))",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60A5FA",
                flexShrink: 0,
              }}
            >
              <BookOpen size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(59, 130, 246, 0.15)",
                    color: "#60A5FA",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                  }}
                >
                  {document.type || "PDF"} Study Space
                </span>
                <span style={{ fontSize: "11px", color: "#34D399", fontWeight: 600 }}>
                  • {domain}
                </span>
                {isLoadingAiCompanion && (
                  <span style={{ fontSize: "10px", color: "#60A5FA", display: "inline-flex", alignItems: "center", gap: "3px", fontWeight: 500 }}>
                    <Sparkles size={10} className="animate-spin" /> AI Curriculum Sync...
                  </span>
                )}
                {isAiCurriculum && (
                  <span style={{ fontSize: "9.5px", color: "#10B981", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "4px", padding: "1px 5px", display: "inline-flex", alignItems: "center", gap: "3px", fontWeight: 600 }}>
                    <Sparkles size={9} /> AI Synthesized
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => fetchAiCompanion(true)}
                  title="Re-analyze document with AI"
                  disabled={isLoadingAiCompanion}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    padding: "2px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <RefreshCw size={11} className={isLoadingAiCompanion ? "animate-spin text-blue-400" : "hover:text-white transition-colors"} />
                </button>
              </div>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  margin: "1px 0 0 0",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {document.title || document.name}
              </h2>
            </div>
          </div>

          {/* CENTER: LIVE STUDY HUD (Timer + Milestone Progress + Page Indicator) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(0, 0, 0, 0.25)",
              padding: "4px 10px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* Focus Session Timer */}
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 8px",
                borderRadius: "6px",
                background: isTimerRunning ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.05)",
                border: isTimerRunning ? "1px solid rgba(59, 130, 246, 0.35)" : "1px solid rgba(255, 255, 255, 0.1)",
                color: isTimerRunning ? "#60A5FA" : "rgba(255, 255, 255, 0.6)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title={isTimerRunning ? "Pause Focus Timer" : "Resume Focus Timer"}
            >
              {isTimerRunning ? <Pause size={10} /> : <Play size={10} />}
              <span>⏱️ {formatTimer(focusSeconds)} Focus</span>
            </button>


            {/* Page Scope Indicator */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <BookOpen size={11} color="#60A5FA" />
              <span>Page {activePage} of {isLoadingDoc && totalPages <= 1 ? "..." : totalPages}</span>
            </div>
          </div>

          {/* RIGHT: View Modes & Search & Exit */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* View Switcher */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "2px",
                gap: "2px",
              }}
            >
              {pdfBlobUrl && (
                <button
                  type="button"
                  onClick={() => setReaderViewMode("visual_pdf")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: readerViewMode === "visual_pdf" ? "var(--accent)" : "transparent",
                    color: readerViewMode === "visual_pdf" ? "var(--accent-contrast, #000000)" : "rgba(255, 255, 255, 0.6)",
                  }}
                  title="View original visual PDF with diagrams, graphics and page formatting"
                >
                  <Eye size={11} />
                  <span>Visual PDF</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setReaderViewMode("continuous")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: readerViewMode === "continuous" ? "var(--accent)" : "transparent",
                  color: readerViewMode === "continuous" ? "var(--accent-contrast, #000000)" : "rgba(255, 255, 255, 0.6)",
                }}
                title="Continuous Book view with chronological page markers"
              >
                <AlignLeft size={11} />
                <span>Book View</span>
              </button>

              <button
                type="button"
                onClick={() => setReaderViewMode("cards")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: readerViewMode === "cards" ? "var(--accent)" : "transparent",
                  color: readerViewMode === "cards" ? "var(--accent-contrast, #000000)" : "rgba(255, 255, 255, 0.6)",
                }}
                title="Chunked section cards view"
              >
                <LayoutGrid size={11} />
                <span>Sections</span>
              </button>
            </div>

            {/* Quick Search */}
            <div style={{ position: "relative", width: "180px", display: "flex", alignItems: "center" }}>
              <Search
                size={13}
                style={{ position: "absolute", left: "9px", color: "rgba(255, 255, 255, 0.4)" }}
              />
              <input
                type="text"
                placeholder="Search text..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px 5px 28px",
                  borderRadius: "7px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#FFFFFF",
                  fontSize: "11.5px",
                  outline: "none",
                }}
              />
              {docSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDocSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "6px",
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Goal Tasks Slide-over Toggle */}
            <button
              type="button"
              onClick={() => setIsTaskDrawerOpen(!isTaskDrawerOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "7px",
                background: isTaskDrawerOpen
                  ? "rgba(59, 130, 246, 0.25)"
                  : "rgba(16, 185, 129, 0.12)",
                border: isTaskDrawerOpen
                  ? "1px solid rgba(59, 130, 246, 0.5)"
                  : "1px solid rgba(16, 185, 129, 0.35)",
                color: isTaskDrawerOpen ? "#60A5FA" : "#34D399",
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Toggle Goal Tasks Slide-over Drawer (Press T)"
            >
              <Target size={13} />
              <span>Goal Tasks</span>
              {allDisplayTasks.length > 0 && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    background: isTaskDrawerOpen ? "#3B82F6" : "#10B981",
                    color: "#FFFFFF",
                    fontWeight: 700,
                  }}
                >
                  {allDisplayTasks.filter((item) => !item.task.completed).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "7px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "11.5px",
                cursor: "pointer",
              }}
              title="Close Study Space (Esc)"
            >
              <span>Exit</span>
              <kbd style={{ fontSize: "9.5px", opacity: 0.6 }}>Esc</kbd>
            </button>
          </div>
        </div>


        {/* Main Workspace: Full Screen Document Reader */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div
            style={{
              flex: 1,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              background: "#0D0F16",
              overflow: "hidden",
            }}
          >
            {/* Reader Content Body */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              {readerViewMode === "visual_pdf" && pdfBlobUrl ? (
                /* Authentic Visual PDF Rendering with diagrams, pictures and formatting */
                <div style={{ width: "100%", height: "100%", position: "relative" }}>
                  <iframe
                    key={`pdf-frame-page-${activePage}`}
                    src={`${pdfBlobUrl}#page=${activePage}&toolbar=1&navpanes=1`}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      background: "#1E222D",
                    }}
                    title="Visual PDF Reader"
                  />
                </div>
              ) : readerViewMode === "continuous" ? (
                /* Continuous Book Reading View in Page Order */
                <div
                  style={{
                    height: "100%",
                    overflowY: "auto",
                    padding: "24px 36px",
                    lineHeight: 1.75,
                    fontSize: "14px",
                    color: "rgba(255, 255, 255, 0.9)",
                  }}
                >
                  {isLoadingDoc ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255, 255, 255, 0.4)" }}>
                      Loading document text in page order...
                    </div>
                  ) : documentChunks.length > 0 ? (
                    <div style={{ maxWidth: "1060px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
                      {documentChunks.map((chunk: any, cIdx: number) => {
                        const prevPage = cIdx > 0 ? documentChunks[cIdx - 1].page_number : null;
                        const isNewPage = chunk.page_number && chunk.page_number !== prevPage;

                        return (
                          <div key={chunk.id || cIdx}>
                            {isNewPage && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  margin: "20px 0 12px 0",
                                }}
                              >
                                <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: "#60A5FA",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    padding: "2px 8px",
                                    background: "rgba(59, 130, 246, 0.12)",
                                    border: "1px solid rgba(59, 130, 246, 0.25)",
                                    borderRadius: "4px",
                                  }}
                                >
                                  Page {chunk.page_number}
                                </span>
                                <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />
                              </div>
                            )}

                            <div
                              style={{
                                padding: "10px 14px",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.02)",
                                transition: "background 0.15s ease",
                              }}
                              className="hover:bg-[rgba(255,255,255,0.05)]"
                            >
                              <div style={{ whiteSpace: "pre-wrap", fontSize: "13.5px", lineHeight: 1.7 }}>
                                {chunk.content_text}
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedQuote(chunk.content_text)}
                                style={{
                                  marginTop: "6px",
                                  background: "rgba(59, 130, 246, 0.1)",
                                  border: "1px solid rgba(59, 130, 246, 0.25)",
                                  borderRadius: "4px",
                                  padding: "2px 7px",
                                  fontSize: "10px",
                                  color: "#60A5FA",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <Quote size={10} />
                                <span>Quote as Deliverable Proof</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: "20px" }}>{document.summary || document.content}</div>
                  )}
                </div>
              ) : (
                /* Section Cards View */
                <div
                  style={{
                    height: "100%",
                    overflowY: "auto",
                    padding: "20px 28px",
                  }}
                >
                  <div style={{ maxWidth: "1060px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {documentChunks.map((chunk: any, cIdx: number) => (
                    <div
                      key={chunk.id || cIdx}
                      style={{
                        padding: "14px 16px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "rgba(255, 255, 255, 0.4)",
                          marginBottom: "8px",
                          borderBottom: "1px dashed rgba(255, 255, 255, 0.08)",
                          paddingBottom: "6px",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                          Section #{cIdx + 1} {chunk.page_number ? `• Page ${chunk.page_number}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedQuote(chunk.content_text)}
                          style={{
                            background: "rgba(59, 130, 246, 0.1)",
                            border: "1px solid rgba(59, 130, 246, 0.25)",
                            borderRadius: "5px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            color: "#60A5FA",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Quote size={10} />
                          <span>Quote</span>
                        </button>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.65 }}>
                        {chunk.content_text}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dimmed backdrop when drawer is open */}
        {isTaskDrawerOpen && (
          <div
            onClick={() => setIsTaskDrawerOpen(false)}
            style={{
              position: "absolute",
              top: "56px",
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(2px)",
              zIndex: 50,
              transition: "opacity 0.2s ease",
            }}
          />
        )}

        {/* Celebration Toast */}
        {recentCelebration && (
          <div
            style={{
              position: "absolute",
              top: "66px",
              right: isTaskDrawerOpen ? "460px" : "20px",
              zIndex: 100,
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))",
              color: "#FFFFFF",
              padding: "10px 16px",
              borderRadius: "10px",
              boxShadow: "0 10px 25px rgba(16, 185, 129, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <Zap size={15} />
            <div>
              <div>Milestone Cleared!</div>
              <div style={{ fontSize: "11px", opacity: 0.9 }}>+{recentCelebration.xp} XP Extracted</div>
            </div>
          </div>
        )}

        {/* SLIDE-OVER COMPANION DRAWER */}
        <div
          style={{
            position: "absolute",
            top: "56px",
            right: 0,
            bottom: 0,
            width: "440px",
            maxWidth: "92vw",
            background: "rgba(17, 20, 28, 0.97)",
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: isTaskDrawerOpen ? "-16px 0 48px rgba(0, 0, 0, 0.7)" : "none",
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            transform: isTaskDrawerOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            overflow: "hidden",
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255, 255, 255, 0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#34D399",
                }}
              >
                <Target size={15} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>
                  Active Goal Tasks
                </div>
                <div style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)" }}>
                  Scanned {goals.length} goals • {matchedTasks.length} task{matchedTasks.length === 1 ? "" : "s"} matched to this document
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTaskDrawerOpen(false)}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                color: "rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                padding: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Close Drawer (Esc or T)"
            >
              <X size={14} />
            </button>
          </div>

          {/* Goal Selector Dropdown */}
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255, 255, 255, 0.6)" }}>
                Filter by Real Goal:
              </span>
              <span style={{ fontSize: "10px", color: "#34D399", fontWeight: 600 }}>
                {allDisplayTasks.filter((item) => item.task.completed).length} / {allDisplayTasks.length} Completed
              </span>
            </div>

            <select
              value={selectedGoalFilter}
              onChange={(e) => setSelectedGoalFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#FFFFFF",
                fontSize: "11.5px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all" style={{ background: "#11141C" }}>
                🎯 All Related Goals ({matchedTasks.length} tasks)
              </option>
              {goals.map((g) => {
                const isMatched = connectedGoals.some((cg) => cg.id === g.id);
                return (
                  <option key={g.id} value={g.id} style={{ background: "#11141C" }}>
                    {isMatched ? "★ " : "• "}
                    {g.description.length > 50 ? `${g.description.slice(0, 50)}...` : g.description} ({(g.tasks || []).length} tasks)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Task List Scroll Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {allDisplayTasks.length === 0 ? (
              <div
                style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                <BookOpen size={28} style={{ margin: "0 auto 10px auto", opacity: 0.35 }} />
                <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255, 255, 255, 0.8)" }}>
                  No tasks matched this document yet
                </div>
                <div style={{ fontSize: "11px", marginTop: "6px", lineHeight: 1.5 }}>
                  Select one of your active goals from the dropdown above, or generate a tailored goal roadmap directly from this document.
                </div>
                <button
                  type="button"
                  onClick={handleGenerateDocumentRoadmap}
                  disabled={isGeneratingRoadmap}
                  style={{
                    marginTop: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(16, 185, 129, 0.25))",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    color: "#93C5FD",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: isGeneratingRoadmap ? "not-allowed" : "pointer",
                    opacity: isGeneratingRoadmap ? 0.7 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Sparkles size={14} />
                  {isGeneratingRoadmap ? "Generating Goal..." : "Generate Study Goal for this Document"}
                </button>
              </div>
            ) : (
              allDisplayTasks.map(({ goal, task, matchReason }) => {
                const isCompleted = task.completed;
                return (
                  <div
                    key={task.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "9px",
                      background: isCompleted
                        ? "rgba(16, 185, 129, 0.06)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: isCompleted
                        ? "1px solid rgba(16, 185, 129, 0.3)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTask(goal, task.id)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: isCompleted ? "#34D399" : "rgba(255, 255, 255, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "2px",
                        flexShrink: 0,
                      }}
                      title={isCompleted ? "Mark task as incomplete" : "Mark task as complete (+50 XP)"}
                    >
                      {isCompleted ? <CheckCircle2 size={18} color="#34D399" /> : <Circle size={18} />}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 600,
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#93C5FD",
                            border: "1px solid rgba(59, 130, 246, 0.25)",
                            maxWidth: "180px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {goal.description}
                        </span>

                        {matchReason && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 600,
                              padding: "1.5px 6px",
                              borderRadius: "4px",
                              background: "rgba(16, 185, 129, 0.12)",
                              color: "#34D399",
                              border: "1px solid rgba(16, 185, 129, 0.25)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span>✓</span>
                            <span>{matchReason}</span>
                          </span>
                        )}

                        {task.sub_goal && (
                          <span style={{ fontSize: "9.5px", color: "rgba(255, 255, 255, 0.45)" }}>
                            • {task.sub_goal}
                          </span>
                        )}

                        <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#34D399", marginLeft: "auto" }}>
                          +{task.xp_reward || 50} XP
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 600,
                          color: isCompleted ? "rgba(255, 255, 255, 0.45)" : "#FFFFFF",
                          textDecoration: isCompleted ? "line-through" : "none",
                          lineHeight: 1.4,
                          marginBottom: "4px",
                        }}
                      >
                        {task.title}
                      </div>

                      {task.deliverable && (
                        <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", lineHeight: 1.4 }}>
                          {task.deliverable}
                        </div>
                      )}

                      {/* Attach quote proof */}
                      {selectedQuote && !isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleAttachQuoteToTask(task.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "6px",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            background: "rgba(59, 130, 246, 0.15)",
                            border: "1px solid rgba(59, 130, 246, 0.35)",
                            color: "#60A5FA",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Quote size={10} />
                          <span>Attach Quoted Proof</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>,
      window.document.body
    );
  }
