"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMyndStore } from "@/lib/mynd-store";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
  citations?: Array<{ document_title?: string; page_number?: number }>;
  isError?: boolean;
}

export default function AskAiDrawer() {
  const isAskAiOpen = useMyndStore((state) => state.isAskAiOpen);
  const closeAskAi = useMyndStore((state) => state.closeAskAi);
  const askAiTarget = useMyndStore((state) => state.askAiTarget);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "ai",
      content: `Ready to analyze ${askAiTarget || "your knowledge base"}. Ask anything.`,
      time: "Just now",
    },
  ]);

  const streamEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!isAskAiOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const question = input.trim();
    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: question,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Build context query
      const queryWithContext = askAiTarget
        ? `${question} (Focus on document: ${askAiTarget})`
        : question;

      const formData = new FormData();
      formData.append("question", question);
      if (askAiTarget) {
        formData.append("document_title", askAiTarget);
      }

      // Try local Next.js proxy route first, then direct port 8000
      let response: Response;
      try {
        response = await fetch("/api/v1/test/ask", {
          method: "POST",
          body: formData,
        });
      } catch {
        response = await fetch("http://127.0.0.1:8000/api/v1/test/ask", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        // Fallback to simple chat endpoint
        const simpleData = new FormData();
        simpleData.append("message", question);
        const simpleRes = await fetch("/api/v1/test/chat-simple", {
          method: "POST",
          body: simpleData,
        }).catch(() =>
          fetch("http://127.0.0.1:8000/api/v1/test/chat-simple", {
            method: "POST",
            body: simpleData,
          })
        );

        if (!simpleRes.ok) {
          throw new Error(`Server returned HTTP ${simpleRes.status}`);
        }

        const simpleJson = await simpleRes.json();
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: simpleJson.response || "Knowledge synthesized successfully.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        return;
      }

      const data = await response.json();
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: data.answer || "Knowledge synthesized successfully.",
        citations: data.citations || [],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Connection error";
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: "ai",
        content: `⚠️ Could not reach AI backend: ${errorMsg}. Please ensure the backend is running on port 8000.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="ask-ai-drawer open" style={{ right: 0 }}>
      <div className="ask-ai-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="alive-dot" />
          <span style={{ fontWeight: 600, fontSize: "13px" }}>QueryMind Intelligence</span>
        </div>
        <button className="close-btn" onClick={closeAskAi} title="Close Drawer">
          ✕
        </button>
      </div>

      <div className="ask-ai-context">
        Context: {askAiTarget || "Active Workspace"}
      </div>

      <div className="ask-ai-stream" id="askAiStreamContent">
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              lineHeight: "1.5",
              background: m.role === "user" ? "var(--accent)" : m.isError ? "#FEF2F2" : "var(--surface)",
              color: m.role === "user" ? "#FFF" : m.isError ? "#991B1B" : "var(--text-primary)",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
              marginBottom: "10px",
            }}
          >
            {m.role === "user" ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            ) : (
              <MarkdownRenderer content={m.content} />
            )}

            {m.citations && m.citations.length > 0 && (
              <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid var(--border)", fontSize: "10px", color: "var(--text-tertiary)" }}>
                Sources: {m.citations.map((c) => c.document_title).filter(Boolean).slice(0, 2).join(", ")}
              </div>
            )}

            <div style={{ fontSize: "9px", opacity: 0.6, marginTop: "4px", textAlign: m.role === "user" ? "right" : "left" }}>
              {m.time}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>
            QueryMind is searching your documents and thinking…
          </div>
        )}
        <div ref={streamEndRef} />
      </div>

      <div className="ask-ai-input-row">
        <input
          type="text"
          className="ask-ai-input"
          placeholder="Ask anything about your documents…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button className="ask-ai-send" onClick={handleSend} disabled={!input.trim() || isTyping}>
          →
        </button>
      </div>
    </div>
  );
}
