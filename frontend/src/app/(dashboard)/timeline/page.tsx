"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Clock, FileText, MessageSquare, Brain, Upload, Sparkles } from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";

interface TimelineItem {
  id: string;
  text: string;
  icon: any;
  color: string;
  time: string;
  timestamp: number;
}

export default function TimelinePage() {
  const activityFeed = useMyndStore((state) => state.activityFeed);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const [realEvents, setRealEvents] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRealTimeline() {
      const items: TimelineItem[] = [];

      // 1. Add uploaded documents
      uploadedDocuments.forEach((doc, idx) => {
        items.push({
          id: `doc-${doc.id || idx}`,
          text: `Document uploaded: "${doc.title}" (${doc.type || "PDF"})`,
          icon: Upload,
          color: "#10B981",
          time: doc.updated || doc.time || "Recently",
          timestamp: Date.now() - idx * 3600000,
        });
      });

      // 2. Add real activity feed items from store
      activityFeed.forEach((act, idx) => {
        items.push({
          id: `act-${act.id || idx}`,
          text: `${act.title}: ${act.text}`,
          icon: act.iconType === "document" ? FileText : Sparkles,
          color: act.color || "#00f0ff",
          time: act.time || "Recently",
          timestamp: Date.now() - (idx + 1) * 1800000,
        });
      });

      // 3. Fetch real memories from backend
      try {
        const mems = await queryMindApi.getMemories();
        if (Array.isArray(mems)) {
          mems.slice(0, 10).forEach((mem) => {
            items.push({
              id: `mem-${mem.id}`,
              text: `Memory recorded (${mem.memory_type}): "${mem.content.slice(0, 60)}${mem.content.length > 60 ? "..." : ""}"`,
              icon: Brain,
              color: "#3B82F6",
              time: new Date(mem.created_at || Date.now()).toLocaleDateString(),
              timestamp: new Date(mem.created_at || Date.now()).getTime(),
            });
          });
        }
      } catch {
        // Fallback to local store data
      }

      // Sort newest first
      items.sort((a, b) => b.timestamp - a.timestamp);

      if (isMounted) {
        setRealEvents(items);
        setIsLoading(false);
      }
    }

    loadRealTimeline();

    return () => {
      isMounted = false;
    };
  }, [activityFeed, uploadedDocuments]);

  return (
    <>
      <Navbar title="Timeline" />
      <div className="p-6 max-w-4xl">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-[#9CA3AF] mb-8 font-mono"
        >
          // chronological neural activity log · {realEvents.length} real events tracked
        </motion.p>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-[#9CA3AF]">
            Loading chronological timeline...
          </div>
        ) : realEvents.length > 0 ? (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-[#00f0ff]/30 via-[#a855f7]/20 to-transparent" />

            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#111128] border border-white/10 flex items-center justify-center z-10 relative">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-white font-mono">
                  Activity Stream
                </span>
              </div>

              <div className="ml-[18px] pl-8 space-y-3">
                {realEvents.map((item, i) => (
                  <motion.div
                    key={item.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${item.color}15`,
                        border: `1px solid ${item.color}25`,
                      }}
                    >
                      <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm text-[#E5E7EB] flex-1 font-normal">
                      {item.text}
                    </span>
                    <span className="text-[11px] text-[#6B7280] font-mono">
                      {item.time}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-[#141414] text-center space-y-3">
            <Clock className="w-10 h-10 text-white/40 mx-auto" />
            <h3 className="text-base font-bold text-white">No timeline activity yet</h3>
            <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
              As you upload documents, chat with the AI, or save memories, your real-time chronological event stream will appear here.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
