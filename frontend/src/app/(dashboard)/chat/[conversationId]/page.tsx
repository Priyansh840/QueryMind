"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  User,
  Activity,
  Plus,
  ArrowUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  RefreshCcw,
  X,
  FileText,
  AlertCircle,
  History,
  Search,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Lightbulb,
  Code2,
  BookOpen,
  Compass,
  Zap,
  Target,
  Folder,
  FolderPlus,
  Brain,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Headphones,
  Square,
  Radio,
} from "lucide-react";
import { queryMindApi, TraceEvent, ObjectiveTraceData, getAuthToken } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import AgentWorkflowStepper, { WorkflowStepData } from "@/components/chat/AgentWorkflowStepper";
import VoiceChatModal from "@/components/chat/VoiceChatModal";
import { useSpeechToText, useTextToSpeech } from "@/lib/voice";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

/* ─── quick prompt definitions ───────────────────────────────── */


const emptyStatePrompts = [
  {
    icon: Code2,
    title: "Architecture Deep Dive",
    description: "Analyze system boundaries, dependencies, and core patterns across documents.",
    prompt: "Analyze the codebase architecture, module dependencies, and core patterns from my uploaded documents.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Synthesis",
    description: "Synthesize key insights and architectural decisions into a structured summary.",
    prompt: "Synthesize key concepts, architectural decisions, and retained learnings across all workspace documents.",
  },
  {
    icon: Compass,
    title: "Decision Proposals",
    description: "Formulate concrete recommendations with citations and grounded trade-offs.",
    prompt: "Examine our current project goals and formulate recommended next actions with grounded evidence.",
  },
  {
    icon: Zap,
    title: "QueryMind Insights",
    description: "Discover unexpected patterns, risks, and leverage opportunities.",
    prompt: "Analyze all uploaded documents and highlight unexpected patterns or high-leverage opportunities.",
  },
];

/* ─── types ───────────────────────────────────────────────────── */

export interface CitationItem {
  document_title?: string;
  page_number?: number;
  snippet?: string;
  chunk_id?: string;
  document_id?: string;
  source_type?: string;
  title?: string;
  [key: string]: any;
}

interface ActionProposalItem {
  id?: string;
  proposal_id: string;
  action_type: string;
  target_id?: string;
  space_id?: string;
  parameters: Record<string, any>;
  reason: string;
  source_recommendation?: string;
  confidence?: string;
  status: "pending" | "executed" | "rejected" | "failed";
  executed_target_id?: string;
  execution_message?: string;
}

interface Message {
  id: string | number;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  citations?: (string | CitationItem)[];
  objectiveId?: string;
  decisionInsight?: DecisionAnalysis | null;
  workflowSteps?: WorkflowStepData[];
  actionProposals?: ActionProposalItem[];
  isError?: boolean;
}

function getCitationLabel(c: any): string {
  if (typeof c === "string") return c;
  if (c && typeof c === "object") {
    if (c.title && typeof c.title === "string" && c.title.includes("(p")) return c.title;
    const docTitle = c.document_title || c.title || (c.source_type ? `${c.source_type} source` : "Document");
    if (Array.isArray(c.pages) && c.pages.length > 0) {
      return c.pages.length === 1 ? `${docTitle} (p. ${c.pages[0]})` : `${docTitle} (pp. ${c.pages.join(", ")})`;
    }
    const pageStr = c.page_number ? ` (p. ${c.page_number})` : "";
    return `${docTitle}${pageStr}`;
  }
  return String(c || "");
}

function getCitationSnippet(c: any): string | undefined {
  if (c && typeof c === "object" && typeof c.snippet === "string") {
    return c.snippet;
  }
  return undefined;
}

function deduplicateCitations(citations?: (string | CitationItem)[]): (string | CitationItem)[] {
  if (!citations || citations.length === 0) return [];
  
  const grouped = new Map<string, {
    title: string;
    pages: Set<number>;
    snippets: string[];
    source_type?: string;
    document_id?: string;
    firstItem: any;
  }>();

  for (const c of citations) {
    if (!c) continue;

    if (typeof c === "string") {
      const trimmed = c.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(.*?)(?:\s*\((?:p|pp)\.?\s*([0-9,\s]+)\))?$/i);
      const title = (match && match[1] ? match[1].trim() : trimmed) || trimmed;
      const key = title.toLowerCase();

      if (!grouped.has(key)) {
        grouped.set(key, {
          title,
          pages: new Set(),
          snippets: [],
          firstItem: c,
        });
      }
      const entry = grouped.get(key)!;
      if (match && match[2]) {
        match[2].split(",").forEach(p => {
          const num = parseInt(p.trim(), 10);
          if (!isNaN(num)) entry.pages.add(num);
        });
      }
      continue;
    }

    if (typeof c === "object") {
      const rawTitle = c.document_title || c.title || (c.source_type ? `${c.source_type} source` : "Document");
      const title = String(rawTitle).trim();
      const key = (c.document_id || title).toLowerCase();

      if (!grouped.has(key)) {
        grouped.set(key, {
          title,
          pages: new Set(),
          snippets: [],
          source_type: c.source_type,
          document_id: c.document_id,
          firstItem: c,
        });
      }

      const entry = grouped.get(key)!;
      if (typeof c.page_number === "number" && !isNaN(c.page_number)) {
        entry.pages.add(c.page_number);
      }
      if (Array.isArray(c.pages)) {
        c.pages.forEach((p: any) => {
          const num = typeof p === "number" ? p : parseInt(p, 10);
          if (!isNaN(num)) entry.pages.add(num);
        });
      }
      if (c.snippet && typeof c.snippet === "string") {
        const snip = c.snippet.trim();
        if (snip && !entry.snippets.includes(snip)) {
          entry.snippets.push(snip);
        }
      }
    }
  }

  const results: CitationItem[] = [];
  for (const entry of grouped.values()) {
    const sortedPages = Array.from(entry.pages).sort((a, b) => a - b);
    let pageStr = "";
    if (sortedPages.length === 1) {
      pageStr = ` (p. ${sortedPages[0]})`;
    } else if (sortedPages.length > 1) {
      pageStr = ` (pp. ${sortedPages.join(", ")})`;
    }

    results.push({
      ...(typeof entry.firstItem === "object" ? entry.firstItem : {}),
      document_title: entry.title,
      title: `${entry.title}${pageStr}`,
      page_number: sortedPages.length === 1 ? sortedPages[0] : undefined,
      pages: sortedPages,
      snippet: entry.snippets.join("\n\n---\n\n") || (typeof entry.firstItem === "object" ? entry.firstItem.snippet : undefined),
      source_type: entry.source_type || "document",
      document_id: entry.document_id,
    });
  }

  return results;
}

interface DecisionEvidence {
  source_type: "workspace" | "document" | "conversation";
  content: string;
  is_fact: boolean;
  source_id?: string;
}

interface Recommendation {
  action: string;
  reason: string;
  evidence: DecisionEvidence[];
  confidence: "high" | "medium" | "low";
}

interface DecisionAnalysis {
  blockers: string[];
  recommendations: Recommendation[];
  uncertainties: string[];
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case "create_goal":
    case "update_goal_status":
      return <Target style={{ width: "13px", height: "13px", color: "#10B981" }} />;
    case "create_space":
      return <Folder style={{ width: "13px", height: "13px", color: "#818CF8" }} />;
    case "create_project":
    case "update_project_status":
      return <FolderPlus style={{ width: "13px", height: "13px", color: "#60A5FA" }} />;
    case "create_note":
      return <FileText style={{ width: "13px", height: "13px", color: "#FBBF24" }} />;
    case "add_memory":
      return <Brain style={{ width: "13px", height: "13px", color: "#F472B6" }} />;
    default:
      return <Zap style={{ width: "13px", height: "13px", color: "var(--accent)" }} />;
  }
}

function getActionTypeLabel(actionType: string): string {
  switch (actionType) {
    case "create_goal": return "New Goal";
    case "update_goal_status": return "Update Goal";
    case "create_space": return "New Space";
    case "create_project": return "New Project";
    case "update_project_status": return "Update Project";
    case "create_note": return "Vault Note";
    case "add_memory": return "Workspace Memory";
    default: return actionType.replace(/_/g, " ");
  }
}

function getActionDestinationLink(proposal: ActionProposalItem): string {
  switch (proposal.action_type) {
    case "create_goal":
    case "update_goal_status":
      return "/goals";
    case "create_space":
      return proposal.executed_target_id ? `/spaces/${proposal.executed_target_id}` : "/spaces";
    case "create_project":
    case "update_project_status":
      return "/projects";
    case "create_note":
    case "add_memory":
      return "/vault";
    default:
      return "/dashboard";
  }
}

function getActionDestinationLabel(proposal: ActionProposalItem): string {
  switch (proposal.action_type) {
    case "create_goal":
    case "update_goal_status":
      return "View Goals";
    case "create_space":
      return "Open Space";
    case "create_project":
    case "update_project_status":
      return "View Projects";
    case "create_note":
      return "View in Vault";
    case "add_memory":
      return "View Memories";
    default:
      return "View in Workspace";
  }
}

/* ═══════════════════════════════════════════════════════════════ */

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const searchParams = useSearchParams();
  const router = useRouter();

  const userProfile = useMyndStore((state) => state.userProfile);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const spaces = useMyndStore((state) => state.spaces);

  const activeSpace = useMemo(() => {
    return spaces.find((s) => s.id === activeSpaceId || s.slug === activeSpaceId) || spaces[0];
  }, [spaces, activeSpaceId]);

  /* ─── state ───────────────────────────────────────────────── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [activeTrace, setActiveTrace] = useState<ObjectiveTraceData | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>("");
  const [decisionInsight, setDecisionInsight] = useState<DecisionAnalysis | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>("Chat Session");
  const [copiedMessageId, setCopiedMessageId] = useState<string | number | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // History Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);



  // File Attachments State
  const [attachments, setAttachments] = useState<{
    file: File;
    name: string;
    size: string;
    status: "uploading" | "ready" | "error";
    documentId?: string;
    errorMessage?: string;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const queryExecutedRef = useRef(false);
  const isSendingRef = useRef(false);

  // ─── Speak to Chat & Voice Mode Integration ───
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  const {
    isListening,
    interimTranscript: speechInterim,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    toggleListening,
    error: speechError,
  } = useSpeechToText({
    onTranscriptChange: (liveText) => {
      setInput(liveText);
    },
  });

  const {
    isSpeaking,
    speakingId,
    speak: speakAloud,
    stop: stopSpeaking,
  } = useTextToSpeech();

  useEffect(() => {
    if (speechError) {
      setVoiceToast(speechError);
      const timer = setTimeout(() => setVoiceToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [speechError]);

  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ai" && messages[i].content) {
        return messages[i].content;
      }
    }
    return "";
  }, [messages]);

  // Auto-scroll on new messages or streaming tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOrchestrating, workflowSteps]);

  // Auto-resize composer textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Load conversation details and messages
  useEffect(() => {
    if (!conversationId) return;

    queryMindApi.getConversation(conversationId)
      .then((conv) => {
        if (conv?.title) setConversationTitle(conv.title);
      })
      .catch((err) => console.warn("Could not load conversation title", err));

    queryMindApi.getConversationMessages(conversationId)
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped: Message[] = data.map((m: any) => ({
            id: m.id,
            role: m.role === "assistant" ? "ai" : m.role,
            content: m.content,
            citations: m.citations ? deduplicateCitations(m.citations) : undefined,
            objectiveId: m.metadata_json?.objective_id,
            workflowSteps: m.metadata_json?.workflow_steps || undefined,
            actionProposals: m.metadata_json?.action_proposals || undefined,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));
          setMessages((prev) => {
            // Check if there are active in-flight temporary messages (streaming AI response or pending user message)
            const inFlight = prev.filter((p) => typeof p.id === "number");
            if (inFlight.length > 0) {
              const existingUserContents = new Set(
                mapped.filter((m) => m.role === "user").map((m) => m.content.trim())
              );
              const result = [...mapped];
              for (const temp of inFlight) {
                // Prevent duplicate user message if DB already contains it
                if (temp.role === "user" && existingUserContents.has(temp.content.trim())) {
                  continue;
                }
                result.push(temp);
              }
              return result;
            }
            if (prev.length > mapped.length) {
              return prev;
            }
            return mapped;
          });
        } else {
          setMessages((prev) => (prev.length > 0 ? prev : []));
        }
      })
      .catch((err) => {
        console.warn("Could not load message history:", err?.response?.status || err?.message || err);
        setMessages((prev) => (prev.length > 0 ? prev : []));
      });
  }, [conversationId]);

  // Handle initial query from sessionStorage (clean) or ?q= fallback (without router reload races)
  useEffect(() => {
    if (!conversationId || queryExecutedRef.current) return;

    let initialQuery: string | null = null;
    if (typeof window !== "undefined") {
      initialQuery = sessionStorage.getItem(`querymind_initial_msg_${conversationId}`);
      if (initialQuery) {
        sessionStorage.removeItem(`querymind_initial_msg_${conversationId}`);
      }
    }
    if (!initialQuery) {
      initialQuery = searchParams.get("q");
    }

    if (initialQuery && !queryExecutedRef.current) {
      queryExecutedRef.current = true;
      handleSend(initialQuery);
    }
  }, [searchParams, conversationId]);

  // Load history drawer conversations
  const loadConversations = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await queryMindApi.getConversations(activeSpaceId || undefined);
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (err) {
      console.warn("Could not fetch conversations:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [activeSpaceId]);

  const filteredConversations = useMemo(() => {
    if (!searchHistory.trim()) return conversations;
    const q = searchHistory.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, searchHistory]);

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await queryMindApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === conversationId) {
        router.push("/chat");
      }
    } catch (err: any) {
      alert(`Could not delete conversation: ${err.message || err}`);
    }
  };

  /* ─── file upload handling ────────────────────────────────── */
  const handleAttachFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((f) => ({
      file: f,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
      status: "uploading" as const,
    }));

    setAttachments((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const data = await queryMindApi.uploadDocument(item.file, activeSpaceId);
        setAttachments((prev) =>
          prev.map((a) =>
            a.file === item.file
              ? { ...a, status: "ready", documentId: data.document_id }
              : a
          )
        );
        useMyndStore.getState().addDocument({
          name: data.filename || item.name,
          type: item.name.split(".").pop() || "txt",
          size: item.size,
          chunks: data.chunks_created || 1,
          vectorsStored: data.vectors_stored || 1,
          summary: `Document uploaded in conversation. Indexed into space.`,
        });
      } catch (err: any) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.file === item.file
              ? { ...a, status: "error", errorMessage: err.message || "Upload failed" }
              : a
          )
        );
      }
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const copyToClipboard = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  /* ─── retry a failed message ──────────────────────────────── */
  const retryMessage = useCallback((originalContent: string, errorMsgId: string | number) => {
    // Remove the error AI message, then re-send
    setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
    handleSend(originalContent);
  }, []);

  /* ─── send message & SSE stream ───────────────────────────── */
  const handleSend = async (queryText?: string) => {
    let textToSend = queryText !== undefined ? queryText : input;
    if ((!textToSend.trim() && attachments.length === 0) || isSendingRef.current) return;
    isSendingRef.current = true;

    // Abort any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 240s timeout to allow deep reasoning without cutting off streaming responses
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 240_000);

    if (!textToSend.trim() && attachments.length > 0) {
      textToSend = `Please analyze and summarize the attached document "${attachments[0].name}" and highlight key takeaways.`;
    } else if (attachments.length > 0) {
      const docNames = attachments.map((a) => `"${a.name}"`).join(", ");
      textToSend = `${textToSend}\n\n[Referenced Attached Document(s): ${docNames}]`;
    }

    setAttachments([]);

    const tempUserId = Date.now();
    const tempAiId = tempUserId + 1;

    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        role: "user",
        content: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: tempAiId,
        role: "ai",
        content: "",
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    ]);

    setInput("");
    setIsOrchestrating(true);
    setWorkflowSteps([]);
    setAgentStatus("Initializing reasoning engine...");
    setDecisionInsight(null);

    try {
      let token = getAuthToken();
      if (!token) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token || null;
        } catch {
          // offline / dev fallback
        }
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const personalization = useMyndStore.getState().personalization;
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
      const endpoint = apiUrl 
        ? `${apiUrl}/api/v1/conversations/${conversationId}/messages`
        : `/api/v1/conversations/${conversationId}/messages`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          role: "user",
          content: textToSend,
          metadata_json: {
            personalization,
          },
        }),
      });

      if (!response.ok) {
        let errDetail = `Server error (${response.status})`;
        try {
          const errJson = await response.json();
          errDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
        } catch {
          const errText = await response.text();
          if (errText) errDetail = errText;
        }
        throw new Error(errDetail);
      }

      if (!response.body) throw new Error("No response body received from server");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      let buffer = "";

      const handleSseLine = (line: string) => {
        if (!line.startsWith("data: ")) return;
        try {
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) return;
          const data = JSON.parse(jsonStr);

          if (data.event === "message.created") {
            if (data.data?.id) {
              setMessages((prev) => prev.map(msg =>
                msg.id === tempUserId ? { ...msg, id: data.data.id } : msg
              ));
            }
          } else if (data.event === "workflow.started") {
            if (data.data?.objective_id) {
              setMessages((prev) => prev.map(msg =>
                msg.id === tempAiId ? { ...msg, objectiveId: data.data.objective_id } : msg
              ));
            }
          } else if (data.event === "workflow.step.started") {
            setWorkflowSteps((prev) => {
              const exists = prev.find(s => s.step === data.data.step && s.iteration === data.data.iteration);
              const next = exists ? prev : [...prev, { ...data.data, status: "running" }];
              setMessages((mPrev) => mPrev.map(msg =>
                msg.id === tempAiId ? { ...msg, workflowSteps: next } : msg
              ));
              return next;
            });
          } else if (data.event === "workflow.step.completed") {
            setWorkflowSteps((prev) => {
              const next = prev.map(s =>
                (s.step === data.data.step && (s.iteration === data.data.iteration || !data.data.iteration))
                  ? { ...s, status: "completed", ...data.data }
                  : s
              );
              setMessages((mPrev) => mPrev.map(msg =>
                msg.id === tempAiId ? { ...msg, workflowSteps: next } : msg
              ));
              return next;
            });

            if (data.data.step === "decision_analyzer" && data.data.output) {
              try {
                const output = data.data.output;
                if (Array.isArray(output.recommendations) && Array.isArray(output.blockers) && Array.isArray(output.uncertainties)) {
                  const validRecs = output.recommendations.filter((r: any) =>
                    ["high", "medium", "low"].includes(r.confidence) && Array.isArray(r.evidence)
                  ).map((r: any) => ({
                    ...r,
                    evidence: r.evidence.filter((e: any) => ["workspace", "document", "conversation"].includes(e.source_type))
                  }));
                  const insight = { ...output, recommendations: validRecs };
                  setDecisionInsight(insight);
                  setMessages((prev) => prev.map(msg =>
                    msg.id === tempAiId ? { ...msg, decisionInsight: insight } : msg
                  ));
                }
              } catch (err) {
                console.warn("Invalid decision insight payload", err);
              }
            }
          } else if (data.event === "agent.status") {
            setAgentStatus(data.data.status);
          } else if (data.event === "token") {
            setMessages((prev) => prev.map(msg =>
              msg.id === tempAiId ? { ...msg, content: (msg.content || "") + data.data.text } : msg
            ));
          } else if (data.event === "citation") {
            setMessages((prev) => prev.map(msg =>
              msg.id === tempAiId
                ? {
                  ...msg,
                  citations: deduplicateCitations([...(msg.citations || []), data.data])
                }
                : msg
            ));
          } else if (data.event === "action.proposed") {
            setMessages((prev) => prev.map(msg => {
              if (msg.id !== tempAiId) return msg;
              const existing = msg.actionProposals || [];
              const proposal = data.data;
              const next = existing.some(p => p.proposal_id === proposal.proposal_id)
                ? existing.map(p => p.proposal_id === proposal.proposal_id ? { ...p, ...proposal } : p)
                : [...existing, proposal];
              return { ...msg, actionProposals: next };
            }));
          } else if (data.event === "action.executed") {
            setMessages((prev) => prev.map(msg => {
              if (msg.id !== tempAiId) return msg;
              const existing = msg.actionProposals || [];
              const executed = data.data;
              const next = existing.some(p => p.proposal_id === executed.proposal_id)
                ? existing.map(p => p.proposal_id === executed.proposal_id ? { ...p, ...executed, status: "executed" } : p)
                : [...existing, { ...executed, status: "executed" }];
              return { ...msg, actionProposals: next };
            }));
            // Refresh workspace store and notify goals view
            useMyndStore.getState().syncWithBackend().catch(() => {});
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("mynd:goals-refresh"));
            }
          } else if (data.event === "message.completed") {
            setMessages((prev) => prev.map(msg =>
              msg.id === tempAiId ? {
                ...msg,
                id: data.data.message_id || msg.id,
                content: data.data.content || msg.content,
                actionProposals: data.data.action_proposals || msg.actionProposals,
              } : msg
            ));
          } else if (data.event === "error") {
            throw new Error(data.data.detail);
          }
        } catch (err) {
          console.warn("SSE parse error", err, line);
        }
      };

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            handleSseLine(line);
          }
        }
      }

      if (buffer.trim()) {
        handleSseLine(buffer.trim());
      }

      // Fallback: if stream ended but AI bubble is still empty, show a soft warning
      setMessages((prev) => prev.map((m) =>
        m.id === tempAiId && !m.content
          ? { ...m, content: "The AI finished processing but produced no visible output. Please try again or rephrase your question.", isError: true }
          : m
      ));
    } catch (err: any) {
      console.warn("Chat error:", err);
      const isAbort = err.name === "AbortError";
      const errorMsg = isAbort
        ? "Request timed out — the server took too long to respond. Please try again."
        : (err.message || "Failed to complete reasoning request");
      setMessages((prev) => {
        const hasTemp = prev.some((m) => m.id === tempAiId);
        if (hasTemp) {
          return prev.map((m) => {
            if (m.id !== tempAiId) return m;
            // If the AI already has recommendations or partial content, preserve it
            if (m.content) {
              return { ...m, isError: false };
            }
            if (m.decisionInsight || (m.actionProposals && m.actionProposals.length > 0)) {
              return {
                ...m,
                content: "I have prepared the workspace recommendations and action plan below based on the retrieved document context.",
                isError: false,
              };
            }
            return {
              ...m,
              content: `⚠️ ${errorMsg}`,
              isError: true,
            };
          });
        }
        return [
          ...prev,
          {
            id: Date.now() + 1,
            role: "ai",
            content: `⚠️ ${errorMsg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isError: true,
          },
        ];
      });
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      isSendingRef.current = false;
      setIsOrchestrating(false);
    }
  };

  const openTraceModal = (msg: Message) => {
    if (!msg.objectiveId) return;
    setActiveTrace({
      objective_id: msg.objectiveId,
      raw_input: msg.content,
      status: "completed",
      created_at: msg.timestamp,
      trace: [],
    });
    setIsTraceModalOpen(true);
  };

  const handleApproveAction = async (proposalId: string) => {
    try {
      setExecutingActionId(proposalId);
      const res = await queryMindApi.approveAction(proposalId);
      if (res && (res.success || res.status === "executed")) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.actionProposals) return msg;
            return {
              ...msg,
              actionProposals: msg.actionProposals.map((p) =>
                p.proposal_id === proposalId || p.id === proposalId
                  ? {
                      ...p,
                      status: "executed",
                      executed_target_id: res.target_id || p.executed_target_id,
                      execution_message: res.message || "Executed successfully",
                    }
                  : p
              ),
            };
          })
        );
      } else {
        alert(res?.message || "Failed to execute action.");
      }
    } catch (err: any) {
      console.error("Action execution failed", err);
      alert(err?.response?.data?.detail || err?.message || "Action execution failed");
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleRejectAction = async (proposalId: string) => {
    try {
      setExecutingActionId(proposalId);
      await queryMindApi.rejectAction(proposalId);
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.actionProposals) return msg;
          return {
            ...msg,
            actionProposals: msg.actionProposals.map((p) =>
              p.proposal_id === proposalId || p.id === proposalId
                ? { ...p, status: "rejected" }
                : p
            ),
          };
        })
      );
    } catch (err: any) {
      console.error("Action rejection failed", err);
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        position: "relative",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      {/* ─── Top Sub-Header Bar ───────────────────────────────── */}
      <header
        style={{
          height: "52px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          background: "var(--bg)",
          zIndex: 10,
          flexShrink: 0,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: "12px",
              color: "var(--text-primary)",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            <span>📁</span>
            <span>{activeSpace?.name || "Workspace"}</span>
          </div>

          <span style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>/</span>

          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "480px",
            }}
          >
            {conversationTitle}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => router.push("/chat")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms var(--ease)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Plus style={{ width: "13px", height: "13px" }} />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              loadConversations();
              setIsHistoryOpen(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms var(--ease)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <History style={{ width: "13px", height: "13px" }} />
            <span>History</span>
          </button>
        </div>
      </header>

      {/* ─── Scrollable Message Thread ────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 28px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: 0,
          width: "100%",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "920px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          {messages.length === 0 && !isOrchestrating && (
            <div
              style={{
                padding: "60px 20px 40px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "20px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "26px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.025em", marginBottom: "6px" }}>
                  Hey, {userProfile.name || "there"}. Ready to dive in?
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-tertiary)", maxWidth: "460px", margin: "0 auto", lineHeight: 1.5 }}>
                  Ask anything about your workspace documents or explore strategic insights.
                </p>
              </div>

              {/* Compact Quick-Prompt Pills */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "center",
                  maxWidth: "680px",
                  marginTop: "8px",
                }}
              >
                {emptyStatePrompts.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => handleSend(card.prompt)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        padding: "7px 14px",
                        borderRadius: "20px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        transition: "all 150ms var(--ease)",
                        boxShadow: "var(--shadow-xs)",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                        e.currentTarget.style.color = "var(--text-primary)";
                        e.currentTarget.style.background = "var(--surface-hover)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                        e.currentTarget.style.background = "var(--surface)";
                      }}
                    >
                      <Icon style={{ width: "13px", height: "13px", color: "var(--accent)" }} />
                      <span>{card.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                width: "100%",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "user" ? (
                /* User Message - Clean Right-Aligned Pill */
                <div
                  style={{
                    maxWidth: "75%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 18px",
                      borderRadius: "22px 22px 4px 22px",
                      fontSize: "15px",
                      lineHeight: "1.5",
                      background: "var(--surface-hover, #232a3b)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      boxShadow: "var(--shadow-xs)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.content}
                  </div>
                  <span style={{ fontSize: "10.5px", color: "var(--text-ghost)", paddingRight: "6px" }}>
                    {msg.timestamp}
                  </span>
                </div>
              ) : (
                /* Assistant Message - Clean Typography Directly on Canvas */
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    <Sparkles style={{ width: "14px", height: "14px" }} />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {/* Multi-Agent Reasoning Stepper (Live and Historical) */}
                    {(((msg.workflowSteps && msg.workflowSteps.length > 0) || (workflowSteps.length > 0 && isOrchestrating && msg.id === messages[messages.length - 1]?.id)) && (
                      <AgentWorkflowStepper
                        steps={(msg.workflowSteps && msg.workflowSteps.length > 0) ? msg.workflowSteps : workflowSteps}
                        agentStatus={isOrchestrating ? agentStatus : null}
                        isStreaming={isOrchestrating && msg.id === messages[messages.length - 1]?.id}
                      />
                    ))}

                    <div
                      style={{
                        fontSize: "15px",
                        lineHeight: "1.7",
                        color: msg.isError ? "#EF4444" : "var(--text-primary)",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.content ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : !(((msg.workflowSteps && msg.workflowSteps.length > 0) || (workflowSteps.length > 0 && isOrchestrating && msg.id === messages[messages.length - 1]?.id))) ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-tertiary)", fontSize: "13px", padding: "2px 0" }}>
                          <Sparkles style={{ width: "13px", height: "13px", color: "var(--text-secondary)", animation: "spin 3s linear infinite" }} />
                          <span>Thinking...</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Grounded Citations */}
                    {(() => {
                      const uniqueCitations = deduplicateCitations(msg.citations);
                      if (uniqueCitations.length === 0) return null;
                      return (
                        <div style={{ marginTop: "4px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--text-tertiary)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: "8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <FileText style={{ width: "12px", height: "12px" }} />
                            <span>Evidence Sources</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {uniqueCitations.map((c, idx) => {
                              const label = getCitationLabel(c);
                              const snippet = getCitationSnippet(c);
                              return (
                                <span
                                  key={idx}
                                  title={snippet || label}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "3px 10px",
                                    borderRadius: "14px",
                                    fontSize: "11.5px",
                                    fontWeight: 500,
                                    background: "var(--surface-subtle)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  <span>📄</span>
                                  <span>{label}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Decision Insight Card */}
                    {msg.decisionInsight && (
                      <div
                        style={{
                          marginTop: "8px",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "14px",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            borderBottom: "1px solid var(--border)",
                            paddingBottom: "10px",
                          }}
                        >
                          <Lightbulb style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--text-primary)",
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            Decision Recommendations
                          </span>
                        </div>

                        {msg.decisionInsight.recommendations.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {msg.decisionInsight.recommendations.map((rec, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "12px",
                                  borderRadius: "10px",
                                  background: "var(--surface-subtle)",
                                  border: "1px solid var(--border)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "6px",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                    {idx + 1}. {rec.action}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: "10px",
                                      background:
                                        rec.confidence === "high"
                                          ? "rgba(16, 185, 129, 0.15)"
                                          : rec.confidence === "medium"
                                            ? "rgba(245, 158, 11, 0.15)"
                                            : "rgba(239, 68, 68, 0.15)",
                                      color:
                                        rec.confidence === "high"
                                          ? "#10B981"
                                          : rec.confidence === "medium"
                                            ? "#F59E0B"
                                            : "#EF4444",
                                      border: `1px solid ${
                                        rec.confidence === "high"
                                          ? "rgba(16, 185, 129, 0.3)"
                                          : rec.confidence === "medium"
                                            ? "rgba(245, 158, 11, 0.3)"
                                            : "rgba(239, 68, 68, 0.3)"
                                      }`,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {rec.confidence.toUpperCase()} CONFIDENCE
                                  </div>
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Why: </span>
                                  {rec.reason}
                                </div>

                                {rec.evidence && rec.evidence.length > 0 && (
                                  <div style={{ marginTop: "4px", paddingLeft: "10px", borderLeft: "2px solid var(--border)" }}>
                                    <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Evidence Grounding</div>
                                    {rec.evidence.map((ev: any, eIdx: number) => {
                                      const text = typeof ev === "string"
                                        ? ev
                                        : ev?.content || ev?.snippet || ev?.document_title || (typeof ev === "object" ? JSON.stringify(ev) : String(ev || ""));
                                      return (
                                        <div key={eIdx} style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                          • {text}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Blockers */}
                        {msg.decisionInsight.blockers.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                              <ShieldAlert style={{ width: "12px", height: "12px" }} />
                              <span>Identified Blockers</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                              {msg.decisionInsight.blockers.map((b, idx) => (
                                <li key={idx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Uncertainties */}
                        {msg.decisionInsight.uncertainties.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Uncertainties</div>
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                              {msg.decisionInsight.uncertainties.map((u, idx) => (
                                <li key={idx}>{u}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Execution Cards */}
                    {msg.actionProposals && msg.actionProposals.length > 0 && (
                      <div
                        style={{
                          marginTop: "12px",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                          background: "linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, rgba(0, 0, 0, 0.02) 100%)",
                          borderRadius: "14px",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                            paddingBottom: "10px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Zap style={{ width: "16px", height: "16px", color: "#10B981" }} />
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                              }}
                            >
                              Workspace Actions
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "10px",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#10B981",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                            }}
                          >
                            {msg.actionProposals.length} {msg.actionProposals.length === 1 ? "ACTION" : "ACTIONS"}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {msg.actionProposals.map((proposal, pIdx) => {
                            const pId = proposal.proposal_id || proposal.id || `prop-${pIdx}`;
                            const isExecuting = executingActionId === pId;
                            const title =
                              proposal.parameters?.title ||
                              proposal.parameters?.name ||
                              proposal.parameters?.key ||
                              proposal.parameters?.description ||
                              getActionTypeLabel(proposal.action_type);

                            return (
                              <div
                                key={pId || pIdx}
                                style={{
                                  padding: "14px",
                                  borderRadius: "10px",
                                  background: "var(--surface-subtle)",
                                  border: "1px solid var(--border)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <div
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "2px 8px",
                                        borderRadius: "6px",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        border: "1px solid var(--border)",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                      }}
                                    >
                                      {getActionIcon(proposal.action_type)}
                                      <span>{getActionTypeLabel(proposal.action_type)}</span>
                                    </div>
                                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                      {title}
                                    </span>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {proposal.status === "executed" && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "3px 10px",
                                            borderRadius: "12px",
                                            background: "rgba(16, 185, 129, 0.15)",
                                            color: "#10B981",
                                            border: "1px solid rgba(16, 185, 129, 0.35)",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                          }}
                                        >
                                          <CheckCircle2 style={{ width: "12px", height: "12px" }} />
                                          <span>Executed</span>
                                        </div>
                                        <Link
                                          href={getActionDestinationLink(proposal)}
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "4px 10px",
                                            borderRadius: "var(--r-sm)",
                                            background: "var(--surface-active, rgba(255, 255, 255, 0.08))",
                                            color: "var(--text-primary)",
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            textDecoration: "none",
                                            border: "1px solid var(--border)",
                                            transition: "all 120ms ease",
                                          }}
                                        >
                                          <span>{getActionDestinationLabel(proposal)}</span>
                                          <ExternalLink style={{ width: "11px", height: "11px" }} />
                                        </Link>
                                      </div>
                                    )}

                                    {proposal.status === "pending" && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <button
                                          type="button"
                                          disabled={isExecuting}
                                          onClick={() => handleApproveAction(proposal.proposal_id || proposal.id!)}
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            padding: "5px 12px",
                                            borderRadius: "var(--r-md)",
                                            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                            color: "#FFFFFF",
                                            border: "none",
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            cursor: isExecuting ? "not-allowed" : "pointer",
                                            opacity: isExecuting ? 0.7 : 1,
                                            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                                          }}
                                        >
                                          {isExecuting ? (
                                            <>
                                              <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} />
                                              <span>Executing...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Check style={{ width: "12px", height: "12px" }} />
                                              <span>Approve & Execute</span>
                                            </>
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isExecuting}
                                          onClick={() => handleRejectAction(proposal.proposal_id || proposal.id!)}
                                          style={{
                                            padding: "5px 10px",
                                            borderRadius: "var(--r-md)",
                                            background: "transparent",
                                            color: "var(--text-tertiary)",
                                            border: "1px solid var(--border)",
                                            fontSize: "11px",
                                            fontWeight: 500,
                                            cursor: isExecuting ? "not-allowed" : "pointer",
                                          }}
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    )}

                                    {proposal.status === "rejected" && (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "var(--text-tertiary)",
                                          padding: "2px 8px",
                                          borderRadius: "6px",
                                          background: "rgba(255, 255, 255, 0.04)",
                                        }}
                                      >
                                        Dismissed
                                      </span>
                                    )}

                                    {proposal.status === "failed" && (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "#EF4444",
                                          padding: "2px 8px",
                                          borderRadius: "6px",
                                          background: "rgba(239, 68, 68, 0.15)",
                                          border: "1px solid rgba(239, 68, 68, 0.3)",
                                        }}
                                      >
                                        Failed
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {proposal.reason && (
                                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Intent: </span>
                                    {proposal.reason}
                                  </div>
                                )}

                                {/* Parameter Tags / Chips */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                  {proposal.parameters?.priority && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        background: "rgba(245, 158, 11, 0.15)",
                                        color: "#F59E0B",
                                        border: "1px solid rgba(245, 158, 11, 0.25)",
                                      }}
                                    >
                                      Priority: {proposal.parameters.priority}
                                    </span>
                                  )}
                                  {proposal.parameters?.target_date && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        color: "var(--text-tertiary)",
                                        border: "1px solid var(--border)",
                                      }}
                                    >
                                      Target Date: {proposal.parameters.target_date}
                                    </span>
                                  )}
                                  {proposal.parameters?.category && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        background: "rgba(236, 72, 153, 0.1)",
                                        color: "#F472B6",
                                        border: "1px solid rgba(236, 72, 153, 0.25)",
                                      }}
                                    >
                                      {proposal.parameters.category}
                                    </span>
                                  )}
                                  {proposal.parameters?.tags && Array.isArray(proposal.parameters.tags) && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        color: "var(--text-tertiary)",
                                      }}
                                    >
                                      Tags: {proposal.parameters.tags.join(", ")}
                                    </span>
                                  )}
                                </div>

                                {proposal.parameters?.tasks && Array.isArray(proposal.parameters.tasks) && proposal.parameters.tasks.length > 0 && (
                                  <div style={{ marginTop: "4px", padding: "8px 12px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border)" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                      Tasks / Milestones ({proposal.parameters.tasks.length})
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      {proposal.parameters.tasks.map((task: any, tIdx: number) => (
                                        <div key={tIdx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
                                          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10B981" }} />
                                          <span>{typeof task === "string" ? task : task.title}</span>
                                          {task.priority && (
                                            <span style={{ fontSize: "9px", textTransform: "uppercase", opacity: 0.6, marginLeft: "auto" }}>
                                              {task.priority}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {proposal.status === "executed" && proposal.execution_message && (
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#10B981",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      marginTop: "2px",
                                    }}
                                  >
                                    <Check style={{ width: "12px", height: "12px" }} />
                                    <span>{proposal.execution_message}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Assistant Footer Toolbar */}
                    {msg.content && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: "6px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 8px",
                              borderRadius: "var(--r-sm)",
                              background: "transparent",
                              border: "none",
                              color: "var(--text-tertiary)",
                              fontSize: "12px",
                              cursor: "pointer",
                              transition: "all 120ms var(--ease)",
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check style={{ width: "13px", height: "13px", color: "#10B981" }} />
                                <span style={{ color: "#10B981" }}>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy style={{ width: "13px", height: "13px" }} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Read Aloud (Speak to Chat Response) */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isSpeaking && speakingId === String(msg.id)) {
                                stopSpeaking();
                              } else {
                                speakAloud(msg.content, String(msg.id));
                              }
                            }}
                            title={isSpeaking && speakingId === String(msg.id) ? "Stop speaking" : "Read aloud (Listen to AI)"}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 8px",
                              borderRadius: "var(--r-sm)",
                              background: isSpeaking && speakingId === String(msg.id) ? "rgba(16, 185, 129, 0.12)" : "transparent",
                              border: isSpeaking && speakingId === String(msg.id) ? "1px solid rgba(16, 185, 129, 0.3)" : "none",
                              color: isSpeaking && speakingId === String(msg.id) ? "#10B981" : "var(--text-tertiary)",
                              fontSize: "12px",
                              cursor: "pointer",
                              transition: "all 120ms var(--ease)",
                            }}
                            onMouseOver={(e) => {
                              if (!(isSpeaking && speakingId === String(msg.id))) {
                                e.currentTarget.style.color = "var(--text-primary)";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!(isSpeaking && speakingId === String(msg.id))) {
                                e.currentTarget.style.color = "var(--text-tertiary)";
                              }
                            }}
                          >
                            {isSpeaking && speakingId === String(msg.id) ? (
                              <>
                                <Square style={{ width: "11px", height: "11px", fill: "currentColor" }} />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 style={{ width: "13px", height: "13px" }} />
                                <span>Read aloud</span>
                              </>
                            )}
                          </button>

                          {msg.objectiveId && (
                            <button
                              type="button"
                              onClick={() => openTraceModal(msg)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "4px 8px",
                                borderRadius: "var(--r-sm)",
                                background: "transparent",
                                border: "none",
                                color: "var(--text-tertiary)",
                                fontSize: "12px",
                                cursor: "pointer",
                                transition: "all 120ms var(--ease)",
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
                            >
                              <Activity style={{ width: "13px", height: "13px" }} />
                              <span>View Trace</span>
                            </button>
                          )}
                        </div>

                        <span style={{ fontSize: "11px", color: "var(--text-ghost)" }}>
                          {msg.timestamp}
                        </span>
                      </div>
                    )}

                    {/* Retry button for error messages */}
                    {msg.isError && (
                      <div style={{ marginTop: "6px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const msgIdx = messages.findIndex((m) => m.id === msg.id);
                            const prevUserMsg = msgIdx > 0 ? messages.slice(0, msgIdx).reverse().find((m) => m.role === "user") : null;
                            if (prevUserMsg) {
                              retryMessage(prevUserMsg.content, msg.id);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            borderRadius: "var(--r-md)",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            color: "#F87171",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 150ms var(--ease)",
                          }}
                        >
                          <RefreshCcw style={{ width: "13px", height: "13px" }} />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ─── Bottom Fixed Composer Bar ────────────────────────── */}
      <div
        style={{
          background: "transparent",
          padding: "0 28px 20px",
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
          width: "100%",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "920px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Pill Composer Card - ChatGPT Classic Style */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "26px",
              padding: "12px 18px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
              transition: "border-color 150ms var(--ease), box-shadow 150ms var(--ease)",
            }}
          >
            {/* Attachment preview pills */}
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: att.status === "error" ? "rgba(239, 68, 68, 0.12)" : "var(--surface-subtle)",
                      border: `1px solid ${att.status === "error" ? "rgba(239, 68, 68, 0.3)" : "var(--border)"}`,
                      fontSize: "11.5px",
                      color: "var(--text-primary)",
                    }}
                  >
                    <FileText style={{ width: "13px", height: "13px", color: "var(--accent)" }} />
                    <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {att.name}
                    </span>
                    {att.status === "uploading" && (
                      <RefreshCw className="animate-spin" style={{ width: "11px", height: "11px", color: "var(--accent)" }} />
                    )}
                    {att.status === "ready" && (
                      <CheckCircle2 style={{ width: "12px", height: "12px", color: "#10B981" }} />
                    )}
                    {att.status === "error" && (
                      <span title={att.errorMessage || "Upload error"} style={{ display: "flex", alignItems: "center" }}>
                        <AlertCircle style={{ width: "12px", height: "12px", color: "#EF4444" }} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "2px",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      <X style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Live Voice Listening Bar (ChatGPT style) */}
            {isListening && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  marginBottom: "8px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  animation: "fadeIn 150ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "18px" }}>
                    {[10, 18, 26, 14, 20].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          width: "3px",
                          height: `${h}px`,
                          borderRadius: "2px",
                          background: "#10B981",
                          animation: `pulse ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#10B981" }}>
                      Listening... Speak now
                    </span>
                    {speechInterim && (
                      <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        &ldquo;{speechInterim}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => stopListening()}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "14px",
                      background: "rgba(16, 185, 129, 0.2)",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      color: "#10B981",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      handleSend();
                    }}
                    disabled={!input.trim()}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "14px",
                      background: "var(--accent)",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: input.trim() ? "pointer" : "not-allowed",
                      opacity: input.trim() ? 1 : 0.5,
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isOrchestrating}
              rows={1}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                outline: "none",
                resize: "none",
                fontSize: "15px",
                lineHeight: "1.5",
                color: "var(--text-primary)",
                fontFamily: "var(--sans)",
                minHeight: "26px",
                maxHeight: "140px",
                opacity: isOrchestrating ? 0.6 : 1,
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "2px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    handleAttachFiles(e.target.files);
                    e.target.value = "";
                  }}
                  multiple
                />
                <button
                  type="button"
                  title="Attach workspace file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isOrchestrating}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    cursor: isOrchestrating ? "not-allowed" : "pointer",
                    transition: "all 150ms var(--ease)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <Plus style={{ width: "15px", height: "15px" }} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Voice Mode (ChatGPT Full Hands-Free Voice Chat) */}
                <button
                  type="button"
                  title="Voice Mode (Hands-free Voice Chat with AI)"
                  onClick={() => setIsVoiceModalOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <Headphones style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                  <span>Voice</span>
                </button>

                {/* Speak to Chat (Microphone Dictation) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      toggleListening(input);
                    }
                  }}
                  title={isListening ? "Stop listening" : "Speak to Chat (Dictate)"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: isListening
                      ? "rgba(239, 68, 68, 0.2)"
                      : "var(--surface-subtle)",
                    border: isListening
                      ? "1px solid #EF4444"
                      : "1px solid var(--border)",
                    color: isListening ? "#EF4444" : "var(--text-secondary)",
                    cursor: "pointer",
                    boxShadow: isListening ? "0 0 10px rgba(239, 68, 68, 0.4)" : "none",
                    transition: "all 150ms var(--ease)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isListening) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isListening) {
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.borderColor = "var(--border)";
                    }
                  }}
                >
                  {isListening ? (
                    <MicOff style={{ width: "15px", height: "15px" }} />
                  ) : (
                    <Mic style={{ width: "15px", height: "15px" }} />
                  )}
                </button>

                {/* Think / Reasoning chip */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    fontWeight: 500,
                  }}
                >
                  <Sparkles style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                  <span>Think</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachments.length === 0) || isOrchestrating}
                  title="Send message (Enter)"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      (input.trim() || attachments.length > 0) && !isOrchestrating
                        ? "var(--accent)"
                        : "var(--surface-subtle)",
                    color:
                      (input.trim() || attachments.length > 0) && !isOrchestrating
                        ? "#FFFFFF"
                        : "var(--text-ghost)",
                    border: "none",
                    cursor:
                      (input.trim() || attachments.length > 0) && !isOrchestrating
                        ? "pointer"
                        : "not-allowed",
                    transition: "all 150ms var(--ease)",
                  }}
                >
                  {isOrchestrating ? (
                    <RefreshCw className="animate-spin" style={{ width: "14px", height: "14px" }} />
                  ) : (
                    <ArrowUp style={{ width: "15px", height: "15px", strokeWidth: 2.5 }} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: "11px", color: "var(--text-ghost)" }}>
            QueryMind can make mistakes. Verify important info.
          </div>
        </div>
      </div>

      {/* ─── Slide-over History Drawer ────────────────────────── */}
      {isHistoryOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            style={{
              width: "340px",
              maxWidth: "85vw",
              height: "100%",
              background: "#0E0F14",
              borderLeft: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <History style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Recent Conversations
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                }}
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "var(--r-md)",
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border)",
                }}
              >
                <Search style={{ width: "14px", height: "14px", color: "var(--text-ghost)" }} />
                <input
                  type="text"
                  placeholder="Search past conversations..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {/* Conversation List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
              {isLoadingHistory ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12px" }}>
                  Loading sessions...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12px" }}>
                  {searchHistory ? "No matching conversations found." : "No saved conversations yet."}
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isCurrent = c.id === conversationId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setIsHistoryOpen(false);
                        if (!isCurrent) router.push(`/chat/${c.id}`);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "var(--r-md)",
                        cursor: "pointer",
                        fontSize: "13px",
                        background: isCurrent ? "var(--surface-hover)" : "transparent",
                        border: isCurrent ? "1px solid var(--border-strong)" : "1px solid transparent",
                        color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
                        transition: "all 120ms var(--ease)",
                        marginBottom: "4px",
                      }}
                      onMouseOver={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = "var(--surface-hover)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1, paddingRight: "8px" }}>
                        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.title || "Untitled Session"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-ghost)" }}>
                          {formatRelativeTime(c.created_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        title="Delete conversation"
                        onClick={(e) => handleDeleteConversation(e, c.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "6px",
                          cursor: "pointer",
                          color: "var(--text-ghost)",
                          borderRadius: "var(--r-sm)",
                          display: "flex",
                          alignItems: "center",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = "#EF4444")}
                        onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-ghost)")}
                      >
                        <Trash2 style={{ width: "13px", height: "13px" }} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Reasoning Trace Modal ────────────────────────────── */}
      {isTraceModalOpen && activeTrace && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px",
          }}
          onClick={() => setIsTraceModalOpen(false)}
        >
          <div
            style={{
              background: "#0E0F14",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "620px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Multi-Agent Reasoning Trace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTraceModalOpen(false)}
                style={{
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                }}
              >
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  fontSize: "12px",
                  fontFamily: "var(--mono)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "var(--text-tertiary)" }}>Objective ID:</span>
                <span style={{ color: "var(--accent)" }}>{activeTrace.objective_id}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeTrace.trace && activeTrace.trace.length > 0 ? (
                  activeTrace.trace.map((evt, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--r-md)",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                        <span style={{ fontWeight: 600, color: "var(--accent)" }}>{evt.agent || "Orchestrator"}</span>
                        <span style={{ color: "var(--text-ghost)" }}>{evt.timestamp || ""}</span>
                      </div>
                      <div style={{ color: "var(--text-secondary)" }}>{evt.message}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
                    Trace telemetry recorded in PostgreSQL audit logs.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ─── ChatGPT-style Voice Chat Modal ─── */}
      <VoiceChatModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        spaceName={activeSpace?.name || conversationTitle || "Workspace"}
        onSendMessage={async (queryText) => {
          handleSend(queryText);
        }}
        isGenerating={isOrchestrating}
        lastAssistantMessage={lastAssistantMessage}
      />

      {/* ─── Voice Notification Toast ─── */}
      {voiceToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 18px",
            borderRadius: "10px",
            background: "rgba(239, 68, 68, 0.95)",
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 200ms ease",
          }}
        >
          <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
          <span>{voiceToast}</span>
          <button
            type="button"
            onClick={() => setVoiceToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
              padding: "2px",
              marginLeft: "6px",
            }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      )}
    </div>
  );
}
