"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Award,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Target,
  Brain,
  Code2,
  LayoutGrid,
  List,
  ChevronsUpDown,
  Globe,
  Cloud,
  Database,
  Cpu,
  BookOpen,
  X,
  FileText,
  HelpCircle,
  MessageSquare,
  Copy,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { queryMindApi, UserSkillItem, SkillStats, RadarCategoryItem } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";

const LEVEL_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Mastery: {
    text: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
  },
  Proficient: {
    text: "#C084FC",
    bg: "rgba(192, 132, 252, 0.12)",
    border: "rgba(192, 132, 252, 0.35)",
  },
  Competent: {
    text: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.35)",
  },
  Novice: {
    text: "#34D399",
    bg: "rgba(52, 211, 153, 0.12)",
    border: "rgba(52, 211, 153, 0.35)",
  },
};

const DISCIPLINE_CONFIG: Record<
  string,
  { icon: any; color: string; bg: string; border: string; desc: string }
> = {
  Cybersecurity: {
    icon: ShieldCheck,
    color: "#C084FC",
    bg: "rgba(192, 132, 252, 0.12)",
    border: "rgba(192, 132, 252, 0.25)",
    desc: "Offensive testing, vulnerability analysis & protocol defense",
  },
  "Computer Networks": {
    icon: Globe,
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.25)",
    desc: "Protocol tracing, packet inspection & network topology",
  },
  "DevOps & Cloud": {
    icon: Cloud,
    color: "#60A5FA",
    bg: "rgba(96, 165, 250, 0.12)",
    border: "rgba(96, 165, 250, 0.25)",
    desc: "Containerization, orchestration & deployment pipelines",
  },
  "Systems & OS": {
    icon: Layers,
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.25)",
    desc: "Memory management, process scheduling & low-level primitives",
  },
  "AI & Machine Learning": {
    icon: Brain,
    color: "#EC4899",
    bg: "rgba(236, 72, 153, 0.12)",
    border: "rgba(236, 72, 153, 0.25)",
    desc: "Neural models, embeddings, RAG pipelines & fine-tuning",
  },
  "Algorithms & Problem Solving": {
    icon: Target,
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.25)",
    desc: "Dynamic programming, graph algorithms & data structure invariants",
  },
  Databases: {
    icon: Database,
    color: "#F97316",
    bg: "rgba(249, 115, 22, 0.12)",
    border: "rgba(249, 115, 22, 0.25)",
    desc: "Relational queries, ACID transactions, indexing & vector search",
  },
  "Backend Engineering": {
    icon: Code2,
    color: "#818CF8",
    bg: "rgba(129, 140, 248, 0.12)",
    border: "rgba(129, 140, 248, 0.25)",
    desc: "FastAPI, asynchronous microservices & API contracts",
  },
};

interface SkillGuideData {
  summary: string;
  principles: string[];
  referenceTitle: string;
  referenceContent: string;
  pitfalls: string[];
  recallQuestions: Array<{ q: string; a: string }>;
}

function getStudyGuideContent(skill: UserSkillItem): SkillGuideData {
  const name = skill.skill_name.toLowerCase();

  if (name.includes("nmap") || name.includes("recon")) {
    return {
      summary:
        "Network reconnaissance is the foundational offensive security discipline of scanning target subnets to discover live hosts, open listening ports, OS fingerprints, and running service daemon versions.",
      principles: [
        "Three-Way Handshake Exploitation: Stealth SYN scans (-sS) send SYN, await SYN-ACK, then transmit RST to abort before completing the full handshake, minimizing logging.",
        "Port State Triad: Open (accepting connections), Closed (actively sending RST responses), and Filtered (firewall dropping probe packets with zero reply).",
        "Version Detection Mechanics: Probe payloads trigger service banners to identify exact software versions and potential known CVEs.",
      ],
      referenceTitle: "Essential Scanning Cheat Sheet & Syntax",
      referenceContent: `# Full TCP SYN Stealth Port Scan with OS & Version Detection:
nmap -sS -sV -O -T4 -p- 192.168.1.1/24

# Default Vulnerability & Script Scanning on Web Ports:
nmap -sC -sV -p 80,443,8080 target.domain

# Fast Top-100 Port Reconnaissance:
nmap -F --open -T4 target_ip`,
      pitfalls: [
        "Running aggressive timing (-T5) over noisy networks leads to dropped packets and false negatives.",
        "Failing to check UDP ports (DNS 53, SNMP 161) where critical misconfigurations often hide.",
      ],
      recallQuestions: [
        {
          q: "Why is a TCP SYN scan (-sS) called a 'half-open' scan?",
          a: "It terminates the TCP connection with a RST packet right after receiving the target's SYN-ACK, never completing the full 3-way handshake or opening a persistent connection.",
        },
        {
          q: "What does the 'Filtered' state indicate in an Nmap scan report?",
          a: "A packet filter, firewall, or network ACL is dropping or blocking probes, preventing Nmap from determining whether the port is open or closed.",
        },
        {
          q: "What flag combination performs OS detection, version scanning, script scanning, and traceroute simultaneously?",
          a: "The aggressive scan flag: nmap -A",
        },
      ],
    };
  }

  if (name.includes("metasploit") || name.includes("exploit")) {
    return {
      summary:
        "Vulnerability exploitation is the controlled execution of proof-of-concept payloads to verify actionable software flaws, misconfigurations, or unpatched CVEs inside isolated sandboxed environments.",
      principles: [
        "Staged vs. Inline Payloads: Staged payloads deliver a tiny stager that downloads the heavy payload into memory, whereas inline (single) payloads execute completely in one payload transmission.",
        "Meterpreter In-Memory Invariants: Meterpreter runs entirely in target RAM through reflective DLL injection, avoiding on-disk executable drops and bypassing basic antivirus.",
        "Handler Synchronization: Always configure multi/handler listening ports to match payload parameters exactly before firing an exploit.",
      ],
      referenceTitle: "Metasploit Handler & Execution Workflow",
      referenceContent: `# Launch Metasploit Framework:
msfconsole -q

# Set up listener for reverse callback:
use exploit/multi/handler
set payload linux/x64/meterpreter/reverse_tcp
set LHOST 10.10.14.5
set LPORT 4444
run -j

# Inspect active sessions:
sessions -l
sessions -i 1`,
      pitfalls: [
        "Mismatched architecture payloads (e.g. attempting to run an x86 payload on a 64-bit target architecture).",
        "Executing exploits outside of isolated lab networks without explicit written engagement scope.",
      ],
      recallQuestions: [
        {
          q: "What is the primary benefit of a Meterpreter session over a standard /bin/sh shell?",
          a: "Meterpreter executes entirely within process memory without touching disk, offering encrypted communications, automated pivoting, token manipulation, and forensics avoidance.",
        },
        {
          q: "What is the difference between an exploit module and an auxiliary module in Metasploit?",
          a: "Exploit modules deliver payloads to execute code on target systems; auxiliary modules perform reconnaissance, scanning, fuzzing, or denial of service without payload delivery.",
        },
      ],
    };
  }

  if (name.includes("wireshark") || name.includes("packet")) {
    return {
      summary:
        "Packet analysis is the deep-packet inspection of network frames across layers 2 through 7 to diagnose latency, verify cryptographic handshakes, and detect suspicious packet transmission anomalies.",
      principles: [
        "Capture Filters vs. Display Filters: Capture filters (BPF) discard packets at the network driver before buffering; display filters filter already-captured packets without data loss.",
        "TCP Stream Reassembly: Wireshark sequences TCP segments using sequence and acknowledgement numbers to reconstruct full client-server application dialogues.",
        "Handshake Decapsulation: Ethernet Frame -> IP Header -> TCP Header -> Application Payload (HTTP/TLS).",
      ],
      referenceTitle: "High-Yield Wireshark Display Filters",
      referenceContent: `# Filter TCP 3-Way Handshake Connection Requests:
tcp.flags.syn == 1 && tcp.flags.ack == 0

# Track HTTP POST Requests with Payloads:
http.request.method == "POST"

# Identify Potential Packet Retransmissions & Drops:
tcp.analysis.retransmission || tcp.analysis.lost_segment

# Filter DNS queries and failed lookups:
dns.flags.response == 0`,
      pitfalls: [
        "Assuming encrypted TLS traffic is plaintext (must configure premaster secret keys via SSLKEYLOGFILE for payload inspection).",
        "Using display filters during high-throughput multi-gigabit captures instead of hardware BPF capture filters.",
      ],
      recallQuestions: [
        {
          q: "What are the three TCP flag steps in a standard TCP connection establishment?",
          a: "1. Client sends [SYN] -> 2. Server responds with [SYN, ACK] -> 3. Client confirms with [ACK].",
        },
        {
          q: "How does a display filter differ from a capture filter in Wireshark?",
          a: "Capture filters use Berkeley Packet Filter (BPF) syntax before recording to reduce file size; display filters filter the recorded packet buffer in the GUI after capture.",
        },
      ],
    };
  }

  if (name.includes("docker") || name.includes("container")) {
    return {
      summary:
        "Containerization isolates application runtimes and dependencies using kernel-level Linux namespaces (process, network, mount) and control groups (cgroups) for resource constraint.",
      principles: [
        "Layer Immutability: Every Dockerfile instruction produces a read-only cache layer; changes only rebuild invalidated subsequent layers.",
        "Process Isolation: Containers share the host kernel while maintaining isolated root filesystems and virtual ethernet pairs.",
      ],
      referenceTitle: "Container Operations & Clean Builds",
      referenceContent: `# Multi-stage Build & Run:
docker build -t app:latest .
docker run -d --name service_worker -p 8080:80 --restart unless-stopped app:latest

# Clean Container Diagnostics:
docker ps -a
docker logs --tail 100 -f service_worker
docker exec -it service_worker sh`,
      pitfalls: [
        "Running containers as root inside the container, exposing the host kernel to privilege escalation escapes.",
        "Bloating images by failing to use multi-stage builds or alpine base images.",
      ],
      recallQuestions: [
        {
          q: "What two core Linux kernel primitives enable container isolation?",
          a: "Namespaces (isolates what a process can see: PID, NET, MNT, IPC) and Control Groups / cgroups (limits what resources a process can consume: CPU, Memory, I/O).",
        },
      ],
    };
  }

  // Universal Fallback for any discipline (Medicine, Law, Business, Science, Tech)
  return {
    summary: `Structured guide and core principles for mastering ${skill.skill_name}. This module codifies theoretical mental models, proven workflows, and diagnostic criteria for ${skill.category}.`,
    principles: [
      `First-Principles Definition: Break ${skill.skill_name} into its invariant laws, foundational axioms, and primary mechanisms before applying higher-level abstractions.`,
      `Systematic Application: Execute verifiable workflows that produce tangible deliverables rather than passive memorization.`,
      `Verification Invariant: Measure understanding by your ability to diagnose edge cases, anomalies, and multi-variable trade-offs in ${skill.category}.`,
    ],
    referenceTitle: `${skill.skill_name} Mastery Blueprint & Reference`,
    referenceContent: `// Core Diagnostic Blueprint for ${skill.skill_name}:
1. Identify primary input variables and environmental constraints.
2. Formulate hypothesis or target outcome based on domain principles.
3. Execute controlled validation steps and verify deliverables.
4. Record feedback loop, state deltas, and refine mental model.`,
    pitfalls: [
      "Premature optimization or jumping to conclusions before confirming baseline data.",
      "Treating symptoms instead of isolating root-cause dynamics.",
    ],
    recallQuestions: [
      {
        q: `What is the single most critical principle underlying ${skill.skill_name}?`,
        a: `Understanding the causal relationship between fundamental mechanisms and observed outcomes in ${skill.category}.`,
      },
      {
        q: `How do you verify whether a deliverable in ${skill.skill_name} meets professional standards?`,
        a: `By evaluating it against objective domain criteria, repeatability, and resilience against common edge cases.`,
      },
    ],
  };
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<UserSkillItem[]>([]);
  const [stats, setStats] = useState<SkillStats | null>(null);
  const [radarData, setRadarData] = useState<RadarCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Spaces & Study Guide Drawer
  const spaces = useMyndStore((state) => state.spaces);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");
  const [selectedStudySkill, setSelectedStudySkill] = useState<UserSkillItem | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"guide" | "docs" | "recall">("guide");
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);

  const fetchSkills = async (spaceId?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await queryMindApi.getSkills(spaceId && spaceId !== "all" ? spaceId : undefined);
      setSkills(data.skills || []);
      setStats(data.stats || null);
      setRadarData(data.radar_data || []);
    } catch (err: any) {
      console.warn("Failed to fetch user skills:", err);
      setErrorMsg("Failed to synchronize skills from backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills(selectedSpaceId === "all" ? undefined : selectedSpaceId);
  }, [selectedSpaceId]);

  // View Mode & Accordions State (defaults to compact rows, all categories start collapsed/compacted)
  const [viewMode, setViewMode] = useState<"grid" | "compact">("compact");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mynd_skills_view_mode");
      if (saved === "grid" || saved === "compact") {
        setViewMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSetViewMode = (mode: "grid" | "compact") => {
    setViewMode(mode);
    try {
      localStorage.setItem("mynd_skills_view_mode", mode);
    } catch {
      // ignore
    }
  };

  // Distinct Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    skills.forEach((s) => set.add(s.category));
    return ["all", ...Array.from(set)];
  }, [skills]);

  // Filtered Skills
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchesSearch =
        s.skill_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = selectedLevel === "all" || s.level === selectedLevel;
      const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [skills, searchQuery, selectedLevel, selectedCategory]);

  // Grouped by Discipline
  const groupedSkills = useMemo(() => {
    const map = new Map<string, UserSkillItem[]>();
    filteredSkills.forEach((s) => {
      const cat = s.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    });
    return map;
  }, [filteredSkills]);

  const toggleCategoryCollapse = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const expandAllCategories = () => {
    const all: Record<string, boolean> = {};
    groupedSkills.forEach((_, cat) => {
      all[cat] = true;
    });
    setExpandedCategories(all);
  };
  const collapseAllCategories = () => setExpandedCategories({});

  const openStudyGuide = (skill: UserSkillItem) => {
    setSelectedStudySkill(skill);
    setActiveDrawerTab("guide");
    setRevealedAnswers({});
    setCopiedSnippet(false);
  };

  const closeStudyGuide = () => {
    setSelectedStudySkill(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedStudySkill(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleExpandEvidence = (skillId: string) => {
    setExpandedSkillId((prev) => (prev === skillId ? null : skillId));
  };

  return (
    <div
      style={{
        padding: "36px 40px",
        maxWidth: "1400px",
        margin: "0 auto",
        color: "var(--text-primary)",
      }}
    >
      {/* Hero Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(168, 85, 247, 0.25))",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60A5FA",
              }}
            >
              <Award size={20} />
            </div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Competency Matrix & Skill Graph
            </h1>
          </div>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              margin: 0,
              maxWidth: "700px",
              lineHeight: 1.5,
            }}
          >
            Verifiable competencies organically derived from your completed roadmap deliverables.
            MYND uses your verified skills to auto-accelerate future roadmaps and bypass already-mastered fundamentals.
          </p>
        </div>

        {/* Rank Badge */}
        {stats && (
          <div
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-medium)",
              borderRadius: "14px",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F59E0B",
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Current Title
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#F59E0B" }}>
                {stats.current_rank}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 HUD Telemetry Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 600 }}>
              VERIFIED COMPETENCIES
            </span>
            <ShieldCheck size={16} color="#60A5FA" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)" }}>
            {stats?.total_skills || 0}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Total unique skills unlocked
          </div>
        </div>

        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 600 }}>
              CUMULATIVE KNOWLEDGE XP
            </span>
            <Zap size={16} color="#F59E0B" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#F59E0B" }}>
            {stats?.total_xp || 0} <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-tertiary)" }}>XP</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            +50 XP per verified deliverable
          </div>
        </div>

        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 600 }}>
              MASTERY & PROFICIENT
            </span>
            <TrendingUp size={16} color="#A855F7" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#A855F7" }}>
            {(stats?.mastery_count || 0) + (stats?.proficient_count || 0)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            {stats?.mastery_count || 0} Mastery • {stats?.proficient_count || 0} Proficient
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, rgba(30, 58, 138, 0.25), rgba(88, 28, 135, 0.25))",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "#93C5FD", fontWeight: 600 }}>
              ADAPTIVE DIFFICULTY
            </span>
            <Sparkles size={16} color="#60A5FA" />
          </div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>
            Active on Roadmaps
          </div>
          <div style={{ fontSize: "12px", color: "#93C5FD", marginTop: "4px", lineHeight: 1.4 }}>
            AI skips mastered fundamentals automatically in /goals
          </div>
        </div>
      </div>

      {/* Two-Column Layout: Radar Visualization & Domain Telemetry */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          marginBottom: "36px",
        }}
      >
        {/* Radar Spider Plot */}
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  Domain Proficiency Radar
                </h2>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#60A5FA",
                    background: "rgba(59, 130, 246, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    padding: "2px 7px",
                    borderRadius: "6px",
                  }}
                >
                  Top 6 Active Focus
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "4px 0 0 0" }}>
                Multi-axis balance dynamically tailored to your active disciplines and study areas
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
                style={{
                  background: "var(--surface-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">🌐 All Spaces (Top 6 Focus)</option>
                {spaces.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    📁 {sp.name}
                  </option>
                ))}
              </select>
              <Brain size={18} color="var(--accent)" />
            </div>
          </div>

          <div style={{ width: "100%", height: "300px", position: "relative" }}>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="var(--border-subtle)" strokeOpacity={0.6} />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                  />
                  <Radar
                    name="Proficiency"
                    dataKey="score"
                    stroke="#60A5FA"
                    strokeWidth={2}
                    fill="rgba(59, 130, 246, 0.3)"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.95)",
                              border: "1px solid rgba(59, 130, 246, 0.4)",
                              borderRadius: "8px",
                              padding: "8px 12px",
                              fontSize: "12px",
                              color: "#FFFFFF",
                              boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
                            }}
                          >
                            <div style={{ fontWeight: 700, color: "#60A5FA" }}>{data.category}</div>
                            <div>Score: {data.score}%</div>
                            <div>Verified Skills: {data.skill_count}</div>
                            <div>Total XP: {data.total_xp} XP</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-tertiary)",
                  fontSize: "13px",
                }}
              >
                Complete your first roadmap task to generate radar telemetry.
              </div>
            )}
          </div>
        </div>

        {/* Domain Breakdown Bars */}
        <div
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Discipline Mastery Breakdown
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "4px 0 0 0" }}>
                Progression towards domain-wide mastery caps (500 XP cap per domain)
              </p>
            </div>
            <Code2 size={18} color="var(--accent)" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
            {radarData.slice(0, 5).map((item, idx) => (
              <div key={idx}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.category}</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {item.total_xp} XP <span style={{ color: "var(--text-tertiary)" }}>({item.skill_count} skills)</span>
                  </span>
                </div>
                <div
                  style={{
                    height: "8px",
                    background: "var(--surface-secondary)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${item.score}%`,
                      background:
                        item.score >= 80
                          ? "linear-gradient(90deg, #F59E0B, #F97316)"
                          : item.score >= 50
                          ? "linear-gradient(90deg, #8B5CF6, #A855F7)"
                          : "linear-gradient(90deg, #3B82F6, #60A5FA)",
                      borderRadius: "4px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            ))}

            {radarData.length === 0 && (
              <div style={{ color: "var(--text-tertiary)", fontSize: "13px", textAlign: "center", padding: "40px 0" }}>
                No domain progress recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill List & Tech Tree Section */}
      <div
        style={{
          background: "var(--surface-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        {/* Filters & Search Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "8px 14px",
                width: "240px",
              }}
            >
              <Search size={14} color="var(--text-tertiary)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills, topics, tools..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  width: "100%",
                }}
              />
            </div>

            {/* Level Filter Tabs */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["all", "Mastery", "Proficient", "Competent", "Novice"].map((lvl) => {
                const isSelected = selectedLevel === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: isSelected ? 600 : 500,
                      background: isSelected ? "var(--accent)" : "var(--surface-secondary)",
                      color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {lvl === "all" ? "All Levels" : lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Category Dropdown Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Discipline:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  background: "var(--surface-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Disciplines" : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Expand / Collapse All */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={expandAllCategories}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  background: "var(--surface-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                }}
                title="Expand all disciplines"
              >
                <ChevronsUpDown size={13} />
                <span>Expand All</span>
              </button>
              <button
                type="button"
                onClick={collapseAllCategories}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  background: "var(--surface-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                }}
                title="Collapse all disciplines"
              >
                Collapse All
              </button>
            </div>

            {/* View Mode Toggle: Grid vs Compact */}
            <div
              style={{
                display: "flex",
                background: "var(--surface-secondary)",
                borderRadius: "8px",
                padding: "3px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                onClick={() => handleSetViewMode("grid")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: viewMode === "grid" ? 600 : 500,
                  background: viewMode === "grid" ? "var(--surface-primary)" : "transparent",
                  color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-tertiary)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: viewMode === "grid" ? "0 2px 6px rgba(0,0,0,0.2)" : "none",
                }}
              >
                <LayoutGrid size={13} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode("compact")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: viewMode === "compact" ? 600 : 500,
                  background: viewMode === "compact" ? "var(--surface-primary)" : "transparent",
                  color: viewMode === "compact" ? "var(--text-primary)" : "var(--text-tertiary)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: viewMode === "compact" ? "0 2px 6px rgba(0,0,0,0.2)" : "none",
                }}
              >
                <List size={13} />
                <span>Compact</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grouped Discipline Accordions */}
        {filteredSkills.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {Array.from(groupedSkills.entries()).map(([categoryName, categorySkills]) => {
              const isCollapsed = !expandedCategories[categoryName];
              const config = DISCIPLINE_CONFIG[categoryName] || {
                icon: Layers,
                color: "#60A5FA",
                bg: "rgba(96, 165, 250, 0.12)",
                border: "rgba(96, 165, 250, 0.25)",
                desc: "Technical competencies and applied skills",
              };
              const IconComp = config.icon;
              const categoryTotalXp = categorySkills.reduce((sum, s) => sum + s.xp, 0);
              const categoryScore = Math.min(100, Math.round((categoryTotalXp / 500) * 100));

              return (
                <div
                  key={categoryName}
                  style={{
                    background: "var(--surface-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "14px",
                    overflow: "hidden",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  {/* Discipline Accordion Header */}
                  <div
                    onClick={() => toggleCategoryCollapse(categoryName)}
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      userSelect: "none",
                      background: "rgba(255, 255, 255, 0.02)",
                      borderBottom: isCollapsed ? "none" : "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "10px",
                          background: config.bg,
                          border: `1px solid ${config.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: config.color,
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={18} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                            {categoryName}
                          </h3>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: config.color,
                              background: config.bg,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              border: `1px solid ${config.border}`,
                            }}
                          >
                            {categorySkills.length} Skill{categorySkills.length > 1 ? "s" : ""} • {categoryTotalXp} XP
                          </span>
                        </div>
                        <p style={{ fontSize: "11px", color: "var(--text-tertiary)", margin: "3px 0 0 0" }}>
                          {config.desc}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      {/* Mini Category Progress */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "90px",
                            height: "6px",
                            background: "var(--surface-primary)",
                            borderRadius: "3px",
                            overflow: "hidden",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${categoryScore}%`,
                              background: config.color,
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, minWidth: "32px" }}>
                          {categoryScore}%
                        </span>
                      </div>

                      <div
                        style={{
                          color: "var(--text-tertiary)",
                          display: "flex",
                          alignItems: "center",
                          transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                          transition: "transform 0.2s ease",
                        }}
                      >
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Discipline Skills Content */}
                  {!isCollapsed && (
                    <div style={{ padding: "18px" }}>
                      {viewMode === "grid" ? (
                        /* Grid View */
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                            gap: "14px",
                          }}
                        >
                          {categorySkills.map((skill) => {
                            const colors = LEVEL_COLORS[skill.level] || LEVEL_COLORS.Novice;
                            const isExpanded = expandedSkillId === skill.id;
                            const nextTierXp =
                              skill.level === "Mastery"
                                ? 500
                                : skill.level === "Proficient"
                                ? 500
                                : skill.level === "Competent"
                                ? 250
                                : 100;
                            const progressPct = Math.min(100, Math.round((skill.xp / nextTierXp) * 100));

                            return (
                              <div
                                key={skill.id}
                                style={{
                                  background: "var(--surface-primary)",
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: "12px",
                                  padding: "16px",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div>
                                  {/* Title & Badge */}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      justifyContent: "space-between",
                                      gap: "10px",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                                      {skill.skill_name}
                                    </h4>
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: colors.text,
                                        background: colors.bg,
                                        border: `1px solid ${colors.border}`,
                                        padding: "2px 7px",
                                        borderRadius: "5px",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {skill.level}
                                    </span>
                                  </div>

                                  {/* XP Bar */}
                                  <div style={{ margin: "10px 0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "4px" }}>
                                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{skill.xp} XP</span>
                                      <span style={{ color: "var(--text-tertiary)" }}>
                                        {skill.level === "Mastery" ? "Max Tier" : `${nextTierXp} XP tier`}
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        height: "5px",
                                        background: "var(--surface-secondary)",
                                        borderRadius: "3px",
                                        overflow: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: "100%",
                                          width: `${progressPct}%`,
                                          background: colors.text,
                                          borderRadius: "3px",
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Evidence Accordion Trigger */}
                                <div style={{ marginTop: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandEvidence(skill.id)}
                                    style={{
                                      width: "100%",
                                      background: "var(--surface-secondary)",
                                      border: "1px solid var(--border-subtle)",
                                      borderRadius: "7px",
                                      padding: "6px 8px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      color: "var(--text-secondary)",
                                      fontSize: "11px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                      <CheckCircle2 size={12} color="#34D399" />
                                      <span>{skill.verified_tasks_count} Proof{skill.verified_tasks_count > 1 ? "s" : ""}</span>
                                    </span>
                                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                  </button>
                                </div>

                                  {isExpanded && (
                                    <div
                                      style={{
                                        marginTop: "8px",
                                        background: "var(--surface-secondary)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "7px",
                                        padding: "8px 10px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                      }}
                                    >
                                      {(skill.evidence || []).map((ev: any, evIdx: number) => (
                                        <div
                                          key={evIdx}
                                          style={{
                                            borderLeft: "2px solid var(--accent)",
                                            paddingLeft: "7px",
                                            fontSize: "11px",
                                          }}
                                        >
                                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "11px" }}>
                                            {ev.task_title}
                                          </div>
                                          {ev.deliverable && (
                                            <div style={{ color: "var(--text-tertiary)", marginTop: "1px", fontSize: "10px" }}>
                                              {ev.deliverable}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        /* Compact Rows View */
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            background: "var(--surface-primary)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "10px",
                            overflow: "hidden",
                          }}
                        >
                          {categorySkills.map((skill, sIdx) => {
                            const colors = LEVEL_COLORS[skill.level] || LEVEL_COLORS.Novice;
                            const isExpanded = expandedSkillId === skill.id;

                            return (
                              <div
                                key={skill.id}
                                style={{
                                  borderBottom: sIdx < categorySkills.length - 1 ? "1px solid var(--border-subtle)" : "none",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 14px",
                                    gap: "12px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {/* Left: Skill title & Level badge */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "220px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                      {skill.skill_name}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: colors.text,
                                        background: colors.bg,
                                        border: `1px solid ${colors.border}`,
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      {skill.level}
                                    </span>
                                  </div>

                                  {/* Center: XP pill */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text }}>
                                      {skill.xp} XP
                                    </span>
                                  </div>

                                  {/* Right: Deliverables badge & Study Guide Action */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandEvidence(skill.id)}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        background: "var(--surface-secondary)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "6px",
                                        padding: "4px 8px",
                                        fontSize: "11px",
                                        color: "var(--text-secondary)",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <CheckCircle2 size={12} color="#34D399" />
                                      <span>{skill.verified_tasks_count} Proof{skill.verified_tasks_count > 1 ? "s" : ""}</span>
                                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    </button>
                                  </div>
                                </div>

                                {/* Inline Evidence Accordion Drawer in Compact View */}
                                {isExpanded && (
                                  <div
                                    style={{
                                      padding: "10px 14px 14px 14px",
                                      background: "rgba(0,0,0,0.15)",
                                      borderTop: "1px dashed var(--border-subtle)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "6px",
                                    }}
                                  >
                                    {(skill.evidence || []).map((ev: any, evIdx: number) => (
                                      <div
                                        key={evIdx}
                                        style={{
                                          borderLeft: "2px solid var(--accent)",
                                          paddingLeft: "8px",
                                          fontSize: "11px",
                                        }}
                                      >
                                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                          {ev.task_title}
                                        </div>
                                        {ev.deliverable && (
                                          <div style={{ color: "var(--text-tertiary)", marginTop: "2px", fontSize: "10px" }}>
                                            Deliverable: {ev.deliverable}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--text-tertiary)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                color: "#60A5FA",
              }}
            >
              <Award size={28} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              No Competencies Logged Yet
            </h3>
            <p style={{ fontSize: "13px", maxWidth: "460px", margin: "0 auto 20px auto", lineHeight: 1.5 }}>
              Whenever you check off a task in your active roadmaps, QueryMind extracts the core skills, awards XP, and adds it to your Competency Matrix.
            </p>
            <Link
              href="/goals"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "10px",
                background: "var(--accent)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Target size={14} /> Go to Objectives & Roadmaps
            </Link>
          </div>
        )}
      </div>

      {/* Slide-Over Contextual Study Guide Drawer */}
      {selectedStudySkill && (
        <>
          {/* Backdrop Blur Overlay */}
          <div
            onClick={closeStudyGuide}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              zIndex: 999,
              transition: "opacity 0.2s ease",
            }}
          />

          {/* Drawer Container */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "560px",
              maxWidth: "100vw",
              background: "var(--surface-primary)",
              borderLeft: "1px solid var(--border-medium)",
              boxShadow: "-12px 0 36px rgba(0, 0, 0, 0.6)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "14px",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: LEVEL_COLORS[selectedStudySkill.level]?.text || "#60A5FA",
                      background: LEVEL_COLORS[selectedStudySkill.level]?.bg || "rgba(59, 130, 246, 0.12)",
                      border: `1px solid ${LEVEL_COLORS[selectedStudySkill.level]?.border || "rgba(59, 130, 246, 0.3)"}`,
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {selectedStudySkill.level} • {selectedStudySkill.xp} XP
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {selectedStudySkill.category}
                  </span>
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  {selectedStudySkill.skill_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeStudyGuide}
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                title="Close guide (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border-subtle)",
                padding: "0 24px",
                background: "rgba(0, 0, 0, 0.15)",
                gap: "8px",
              }}
            >
              {[
                { id: "guide", label: "Study Notes & Syntax", icon: BookOpen },
                { id: "docs", label: "Vault Docs & Proof", icon: FileText },
                { id: "recall", label: "Active Recall Quiz", icon: HelpCircle },
              ].map((tab) => {
                const isSelected = activeDrawerTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveDrawerTab(tab.id as any)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "12px 14px",
                      fontSize: "12px",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "var(--accent)" : "var(--text-tertiary)",
                      border: "none",
                      borderBottom: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <TabIcon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body - Scrollable */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {(() => {
                const guideData = getStudyGuideContent(selectedStudySkill);

                if (activeDrawerTab === "guide") {
                  return (
                    <>
                      {/* Concept Summary Box */}
                      <div
                        style={{
                          background: "rgba(59, 130, 246, 0.08)",
                          border: "1px solid rgba(59, 130, 246, 0.25)",
                          borderRadius: "12px",
                          padding: "16px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <Sparkles size={16} color="#60A5FA" />
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#60A5FA", textTransform: "uppercase" }}>
                            Executive Summary & First Principles
                          </span>
                        </div>
                        <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-primary)", margin: 0 }}>
                          {guideData.summary}
                        </p>
                      </div>

                      {/* Core Mental Models & Principles */}
                      <div>
                        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
                          Core Invariants & Mechanics
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {guideData.principles.map((pr, pIdx) => (
                            <div
                              key={pIdx}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "10px",
                                background: "var(--surface-secondary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "10px",
                                padding: "12px 14px",
                              }}
                            >
                              <div
                                style={{
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  background: "rgba(99, 102, 241, 0.15)",
                                  color: "var(--accent)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  marginTop: "1px",
                                }}
                              >
                                {pIdx + 1}
                              </div>
                              <p style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>
                                {pr}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reference Cheat Sheet / Code Block */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                            {guideData.referenceTitle}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(guideData.referenceContent);
                              setCopiedSnippet(true);
                              setTimeout(() => setCopiedSnippet(false), 2000);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "var(--surface-secondary)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "11px",
                              color: copiedSnippet ? "#34D399" : "var(--text-tertiary)",
                              cursor: "pointer",
                            }}
                          >
                            {copiedSnippet ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedSnippet ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <pre
                          style={{
                            background: "rgba(10, 15, 29, 0.95)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "10px",
                            padding: "14px",
                            margin: 0,
                            fontFamily: "ui-monospace, monospace",
                            fontSize: "12px",
                            lineHeight: 1.5,
                            color: "#93C5FD",
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {guideData.referenceContent}
                        </pre>
                      </div>

                      {/* Common Pitfalls */}
                      <div>
                        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                          Common Pitfalls & Edge Cases
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {guideData.pitfalls.map((pf, pfIdx) => (
                            <li key={pfIdx} style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                              {pf}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  );
                }

                if (activeDrawerTab === "docs") {
                  // Find documents matching the skill or category from Vault
                  const matchingDocs = uploadedDocuments.filter((d) => {
                    const skillNameTokens = selectedStudySkill.skill_name.toLowerCase().split(/\s+/);
                    const titleLower = d.title.toLowerCase();
                    return (
                      skillNameTokens.some((t) => t.length > 3 && titleLower.includes(t)) ||
                      titleLower.includes(selectedStudySkill.category.toLowerCase())
                    );
                  });

                  return (
                    <>
                      {/* Vault Documents Section */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                            Knowledge Vault Documents
                          </h4>
                          <Link
                            href="/vault"
                            style={{
                              fontSize: "11px",
                              color: "var(--accent)",
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>Open Vault</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>

                        {matchingDocs.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {matchingDocs.map((doc) => (
                              <div
                                key={doc.id}
                                style={{
                                  background: "var(--surface-secondary)",
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: "10px",
                                  padding: "12px 14px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <FileText size={18} color="#60A5FA" />
                                  <div>
                                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                                      {doc.title}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                                      {doc.type?.toUpperCase() || "DOCUMENT"} • {doc.size || "1.2 MB"}
                                    </div>
                                  </div>
                                </div>
                                <Link
                                  href="/vault"
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: "var(--text-secondary)",
                                    background: "var(--surface-primary)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "6px",
                                    padding: "4px 8px",
                                    textDecoration: "none",
                                  }}
                                >
                                  Read Doc
                                </Link>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{
                              background: "var(--surface-secondary)",
                              border: "1px dashed var(--border-subtle)",
                              borderRadius: "10px",
                              padding: "20px",
                              textAlign: "center",
                            }}
                          >
                            <FileText size={24} color="var(--text-tertiary)" style={{ margin: "0 auto 8px auto" }} />
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                              No Direct Vault Document Linked
                            </div>
                            <p style={{ fontSize: "11px", color: "var(--text-tertiary)", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                              Upload RFCs, lecture slides, books, or study guides to your Knowledge Vault to automatically link them to this competency.
                            </p>
                            <Link
                              href="/vault"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#FFFFFF",
                                background: "var(--accent)",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                textDecoration: "none",
                              }}
                            >
                              Upload to Vault
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Verified Deliverables Proof */}
                      <div>
                        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
                          Completed Task Deliverables & Evidence
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(selectedStudySkill.evidence || []).map((ev: any, evIdx: number) => (
                            <div
                              key={evIdx}
                              style={{
                                background: "var(--surface-secondary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "10px",
                                padding: "12px 14px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <CheckCircle2 size={14} color="#34D399" />
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                                  {ev.task_title}
                                </span>
                              </div>
                              {ev.deliverable && (
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "22px", lineHeight: 1.4 }}>
                                  Deliverable Proof: {ev.deliverable}
                                </div>
                              )}
                              {ev.completed_at && (
                                <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginLeft: "22px", marginTop: "4px" }}>
                                  Verified on {new Date(ev.completed_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                }

                if (activeDrawerTab === "recall") {
                  return (
                    <>
                      <div
                        style={{
                          background: "rgba(168, 85, 247, 0.08)",
                          border: "1px solid rgba(168, 85, 247, 0.25)",
                          borderRadius: "12px",
                          padding: "14px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <Brain size={16} color="#C084FC" />
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#C084FC", textTransform: "uppercase" }}>
                            Active Recall & Spaced Retrieval
                          </span>
                        </div>
                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                          Test your conceptual retention. Attempt to answer each prompt mentally before clicking to reveal the solution.
                        </p>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {guideData.recallQuestions.map((rq, qIdx) => {
                          const isRevealed = !!revealedAnswers[qIdx];
                          return (
                            <div
                              key={qIdx}
                              style={{
                                background: "var(--surface-secondary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "10px",
                                padding: "14px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>
                                  Q{qIdx + 1}:
                                </span>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>
                                  {rq.q}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedAnswers((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }))
                                }
                                style={{
                                  background: isRevealed ? "var(--surface-primary)" : "var(--accent)",
                                  color: isRevealed ? "var(--text-secondary)" : "#FFFFFF",
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: "6px",
                                  padding: "5px 10px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  marginBottom: isRevealed ? "10px" : "0",
                                }}
                              >
                                {isRevealed ? "Hide Answer" : "Reveal Answer"}
                              </button>

                              {isRevealed && (
                                <div
                                  style={{
                                    marginTop: "8px",
                                    padding: "10px 12px",
                                    background: "rgba(0, 0, 0, 0.25)",
                                    borderLeft: "2px solid #34D399",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    color: "var(--text-secondary)",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {rq.a}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                }

                return null;
              })()}
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255, 255, 255, 0.02)",
                gap: "12px",
              }}
            >
              <Link
                href={`/chat?prompt=I am studying ${encodeURIComponent(selectedStudySkill.skill_name)}. Please act as an expert technical tutor, quiz me on edge cases, and clarify the core principles.`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: "var(--accent)",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                <MessageSquare size={14} />
                <span>Ask AI Tutor About This</span>
              </Link>

              <button
                type="button"
                onClick={closeStudyGuide}
                style={{
                  fontSize: "12px",
                  color: "var(--text-tertiary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Done Reading
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
