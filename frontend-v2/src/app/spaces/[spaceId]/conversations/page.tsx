"use client";

import React, { useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { ConversationItem } from "@/types/api";

interface ConversationsIndexPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function ConversationsIndexPage({ params }: ConversationsIndexPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt");

  useEffect(() => {
    const handleInit = async () => {
      try {
        if (prompt) {
          // Create new conversation with prompt title
          const newConv = await apiClient<ConversationItem>(`/api/v1/conversations`, {
            method: "POST",
            body: JSON.stringify({
              space_id: spaceId,
              title: prompt.slice(0, 48),
            }),
          });
          router.replace(
            `/spaces/${spaceId}/conversations/${newConv.id}?prompt=${encodeURIComponent(prompt)}`
          );
          return;
        }

        // Otherwise find most recent conversation or create one
        const convs = await apiClient<ConversationItem[]>(
          `/api/v1/conversations?space_id=${spaceId}`
        ).catch(() => []);

        if (convs && convs.length > 0) {
          router.replace(`/spaces/${spaceId}/conversations/${convs[0].id}`);
        } else {
          try {
            const newConv = await apiClient<ConversationItem>(`/api/v1/conversations`, {
              method: "POST",
              body: JSON.stringify({
                space_id: spaceId,
                title: "Autonomous Reasoning Session",
              }),
            });
            router.replace(`/spaces/${spaceId}/conversations/${newConv.id}`);
          } catch (postErr) {
            console.warn("Backend unavailable, falling back to local conversation view:", postErr);
            router.replace(`/spaces/${spaceId}/conversations/default`);
          }
        }
      } catch (err) {
        console.error("Failed to initialize conversation session:", err);
        // Fallback so user is never stuck in infinite loading
        router.replace(`/spaces/${spaceId}/conversations/default`);
      }
    };

    handleInit();
  }, [spaceId, prompt, router]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#08090d] text-white select-none gap-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <div className="absolute w-6 h-6 rounded-full bg-indigo-500/10 blur-sm animate-pulse" />
      </div>
      <div className="text-xs font-mono tracking-widest text-slate-400 uppercase">
        Connecting Reasoning Session...
      </div>
      <button
        onClick={() => router.replace(`/spaces/${spaceId}/conversations/default`)}
        className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 underline mt-2 transition-colors cursor-pointer"
      >
        Taking too long? Open session directly &rarr;
      </button>
    </div>
  );
}
