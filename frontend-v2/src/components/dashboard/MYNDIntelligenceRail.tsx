"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare, ArrowRight, Clock } from "lucide-react";
import { SpaceActivityItem, DocumentItem } from "@/types/api";

interface MYNDIntelligenceRailProps {
  spaceId: string;
  activities?: SpaceActivityItem[];
  recentConversations?: { id: string; title: string; created_at: string }[];
  documents?: DocumentItem[];
  className?: string;
}

export const MYNDIntelligenceRail: React.FC<MYNDIntelligenceRailProps> = ({
  spaceId,
  activities = [],
  recentConversations = [],
  documents = [],
  className,
}) => {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-5 space-y-6 select-none ${
        className || ""
      }`}
    >
      {/* 1. Recent Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
          <span className="text-xs font-semibold text-white">
            Recent Sessions
          </span>
          <Link
            href={`/spaces/${spaceId}/conversations`}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            All
          </Link>
        </div>

        <div className="space-y-1">
          {recentConversations.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">
              No sessions yet.
            </div>
          ) : (
            recentConversations.slice(0, 3).map((conv) => (
              <Link
                key={conv.id}
                href={`/spaces/${spaceId}/conversations/${conv.id}`}
                className="p-2 rounded-lg hover:bg-white/[0.03] flex items-center justify-between text-decoration-none group transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#818cf8] shrink-0" />
                  <span className="text-xs text-slate-300 group-hover:text-white truncate">
                    {conv.title || "Untitled Session"}
                  </span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-white shrink-0" />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 2. Activity Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
          <span className="text-xs font-semibold text-white">
            Recent Activity
          </span>
        </div>

        <div className="space-y-2.5">
          {activities.length === 0 && documents.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">
              No recent activity.
            </div>
          ) : activities.length > 0 ? (
            activities.slice(0, 4).map((act) => (
              <div key={act.id} className="text-xs space-y-0.5">
                <div className="text-slate-300 truncate">{act.title}</div>
                <div className="text-[10px] text-slate-500">
                  {act.created_at
                    ? new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Recently"}
                </div>
              </div>
            ))
          ) : (
            documents.slice(0, 3).map((doc) => (
              <div key={doc.id} className="text-xs space-y-0.5">
                <div className="text-slate-300 truncate">Uploaded {doc.title}</div>
                <div className="text-[10px] text-slate-500">
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recently"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
