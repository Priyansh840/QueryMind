"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface ExecutiveCommandPromptProps {
  spaceId: string;
  className?: string;
}

export const ExecutiveCommandPrompt: React.FC<ExecutiveCommandPromptProps> = ({
  spaceId,
  className,
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestions = [
    "Summarize key insights from my documents",
    "Propose next initiatives for our projects",
    "Audit pending decisions and risks",
  ];

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const promptText = (customQuery || query).trim();
    if (!promptText || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newConv = await apiClient<{ id: string }>(`/api/v1/conversations`, {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          title: promptText.slice(0, 48),
        }),
      }).catch(() => null);

      const targetConvId = newConv?.id || "new";
      router.push(
        `/spaces/${spaceId}/conversations/${targetConvId}?prompt=${encodeURIComponent(promptText)}`
      );
    } catch {
      router.push(
        `/spaces/${spaceId}/conversations?prompt=${encodeURIComponent(promptText)}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-4 space-y-3 select-none ${
        className || ""
      }`}
    >
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask MYND anything about your documents, decisions, or projects..."
          disabled={isSubmitting}
          className="w-full bg-[#12131a] text-sm text-white placeholder-slate-500 pl-4 pr-24 py-3 rounded-xl border border-white/[0.07] focus:border-white/20 focus:outline-hidden transition-colors"
        />
        <button
          type="submit"
          disabled={!query.trim() || isSubmitting}
          className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-30 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>{isSubmitting ? "Opening..." : "Ask"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Simple suggestions */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px] text-slate-400">
        <span className="text-slate-500 shrink-0">Try:</span>
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSubmit(undefined, item)}
            className="hover:text-white transition-colors cursor-pointer shrink-0 truncate"
          >
            &ldquo;{item}&rdquo;{idx < suggestions.length - 1 && <span className="ml-2 text-slate-600">•</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
