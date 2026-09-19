"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Mic, Sparkles, Target, CheckSquare, CornerDownLeft } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { ConversationItem } from "@/types/api";

export type IntentMode = "research" | "decision" | "plan";

export interface MYNDInputProps {
  spaceId: string;
  placeholder?: string;
  className?: string;
  onSubmitted?: (conversationId: string) => void;
}

export const MYNDInput: React.FC<MYNDInputProps> = ({
  spaceId,
  placeholder = "Ask MYND anything, research topics, or plan next steps...",
  className,
  onSubmitted,
}) => {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<IntentMode>("research");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage("Gathering context...");

    try {
      const contextualPrompt =
        mode === "decision"
          ? `[Intent: Make a Decision] ${cleanPrompt}`
          : mode === "plan"
          ? `[Intent: Plan Next Steps] ${cleanPrompt}`
          : cleanPrompt;

      // 1. Create a dedicated conversation thread in this space
      const newConv = await apiClient<ConversationItem>("/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          title: cleanPrompt.slice(0, 60),
        }),
      });

      // 2. Dispatch initial message into thread
      try {
        await apiClient(`/api/v1/conversations/${newConv.id}/messages`, {
          method: "POST",
          body: JSON.stringify({
            content: contextualPrompt,
          }),
        });
      } catch (postErr) {
        console.warn("Initial message dispatch notice:", postErr);
      }

      setPrompt("");
      if (onSubmitted) {
        onSubmitted(newConv.id);
      } else {
        router.push(`/spaces/${spaceId}/conversations/${newConv.id}`);
      }
    } catch (err: unknown) {
      console.error("Failed to initialize conversation from MYNDInput:", err);
      setStatusMessage("Could not gather context. Please try again.");
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setStatusMessage(`Ingesting ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("space_id", spaceId);

      await apiClient(`/api/v1/documents/?space_id=${spaceId}`, {
        method: "POST",
        body: formData,
      });

      setStatusMessage(`Grounded ${file.name} successfully.`);
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (uploadErr) {
      console.error("File ingestion error:", uploadErr);
      setStatusMessage("File upload failed.");
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [isListening, setIsListening] = useState(false);

  const handleVoiceToggle = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage("Voice input not supported in this browser.");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (isListening) {
      setIsListening(false);
      setStatusMessage(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage("Listening...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setPrompt((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
          setStatusMessage("Voice captured.");
          setTimeout(() => setStatusMessage(null), 2000);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition notice:", e);
        setStatusMessage("Microphone unavailable or permission required.");
        setTimeout(() => setStatusMessage(null), 3000);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition startup error:", err);
      setStatusMessage("Could not initialize microphone.");
      setTimeout(() => setStatusMessage(null), 3000);
      setIsListening(false);
    }
  };

  const intentChips: { id: IntentMode; label: string; icon: React.ElementType }[] = [
    { id: "research", label: "Research", icon: Sparkles },
    { id: "decision", label: "Make a decision", icon: Target },
    { id: "plan", label: "Plan", icon: CheckSquare },
  ];

  const sampleQueries = [
    { label: "Benchmark Analysis", query: "Analyze document ingestion benchmarks and recommend queue optimizations." },
    { label: "Propose Decision", query: "Propose an actionable architecture decision for our document ingestion pipeline." },
    { label: "Milestone Review", query: "Review progress and blockers across all active goals in this space." },
  ];

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111726]/95 via-[#0d121d]/98 to-[#07090f] p-4.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.18)] backdrop-blur-2xl transition-all",
        "focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.18)]",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Top Telemetry & Quick Prompt Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 mb-2 border-b border-white/[0.06] text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <span className="font-medium text-[11px] text-slate-300">Executive Synthesis</span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">Grounding active</span>
        </div>

        {/* Quick Context Prompt Chips */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto">
          {sampleQueries.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setPrompt(item.query);
                textareaRef.current?.focus();
              }}
              className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] hover:border-white/[0.14] transition-all cursor-pointer whitespace-nowrap font-medium"
            >
              + {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-resizing borderless textarea */}
      <div className="pb-3">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          placeholder={isSubmitting ? "Gathering context..." : placeholder}
          rows={2}
          className="w-full bg-transparent border-0 resize-none text-sm text-[#f8fafc] placeholder:text-slate-500 focus:outline-none focus:ring-0 leading-relaxed font-normal tracking-normal"
        />
      </div>

      {/* Bottom Utility Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
        {/* Intent Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {intentChips.map((chip) => {
            const Icon = chip.icon;
            const isSelected = mode === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setMode(chip.id)}
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none font-medium",
                  isSelected
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.2)] scale-[1.02]"
                    : "bg-[#141a27]/80 text-slate-300 hover:text-white border border-white/8 hover:border-white/20 hover:bg-[#1a2336] shadow-xs"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-blue-400" : "text-slate-400")} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center justify-end gap-2.5 shrink-0">
          {statusMessage && (
            <span className="text-xs text-blue-400 font-medium mr-1 animate-pulse">
              {statusMessage}
            </span>
          )}

          <button
            type="button"
            onClick={handleFileTrigger}
            disabled={isSubmitting}
            title="Attach context document"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer shadow-xs font-medium"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attach</span>
          </button>

          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={isSubmitting}
            title={isListening ? "Listening... click to stop" : "Voice input"}
            className={cn(
              "p-2 rounded-xl transition-all cursor-pointer border",
              isListening
                ? "bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                : "text-slate-400 hover:text-white hover:bg-white/[0.08] border-white/[0.06] hover:border-white/[0.15]"
            )}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!prompt.trim() || isSubmitting}
            className={cn(
              "flex items-center gap-2 px-4.5 py-1.5 rounded-xl text-xs font-semibold select-none transition-all duration-150 cursor-pointer",
              prompt.trim() && !isSubmitting
                ? "bg-[#3b82f6] hover:bg-blue-600 text-white shadow-[0_2px_14px_rgba(59,130,246,0.35)] hover:shadow-[0_2px_18px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                : "bg-white/[0.04] text-slate-500 opacity-60 cursor-not-allowed border border-white/[0.06]"
            )}
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Ask MYND</span>
                <CornerDownLeft className="w-3 h-3 opacity-80 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
