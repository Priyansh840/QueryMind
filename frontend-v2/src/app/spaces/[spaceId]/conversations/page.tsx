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
          const newConv = await apiClient<ConversationItem>(`/api/v1/conversations`, {
            method: "POST",
            body: JSON.stringify({
              space_id: spaceId,
              title: "Autonomous Reasoning Session",
            }),
          });
          router.replace(`/spaces/${spaceId}/conversations/${newConv.id}`);
        }
      } catch (err) {
        console.error("Failed to initialize conversation session:", err);
      }
    };

    handleInit();
  }, [spaceId, prompt, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white select-none">
      <div className="text-xs font-mono text-slate-400 animate-pulse">
        CONNECTING REASONING SESSION...
      </div>
    </div>
  );
}
