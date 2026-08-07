"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Clock, FileText, MessageSquare, Brain, Upload } from "lucide-react";

const timelineEvents = [
  { date: "Today", items: [
    { text: "Uploaded machine_learning_notes.pdf", icon: Upload, color: "#00f0ff", time: "2:30 PM" },
    { text: "Chat: \"Explain attention mechanisms\"", icon: MessageSquare, color: "#a855f7", time: "2:15 PM" },
    { text: "Memory: Learned you prefer Python", icon: Brain, color: "#22d3ee", time: "1:45 PM" },
  ]},
  { date: "Yesterday", items: [
    { text: "Uploaded project_ideas.txt", icon: Upload, color: "#00f0ff", time: "11:00 AM" },
    { text: "Search: \"neural network architectures\"", icon: FileText, color: "#f472b6", time: "9:30 AM" },
  ]},
  { date: "Aug 3, 2026", items: [
    { text: "Uploaded deep_learning_ch5.pdf", icon: Upload, color: "#00f0ff", time: "4:00 PM" },
    { text: "Chat: \"Compare RNNs vs Transformers\"", icon: MessageSquare, color: "#a855f7", time: "3:20 PM" },
    { text: "Memory: Noted interest in NLP", icon: Brain, color: "#22d3ee", time: "3:15 PM" },
    { text: "Search: \"backpropagation\"", icon: FileText, color: "#f472b6", time: "2:00 PM" },
  ]},
];

export default function TimelinePage() {
  return (
    <>
      <Navbar title="Timeline" />
      <div className="p-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[#6b7294] mb-8 font-[family-name:var(--font-mono)]"
        >
          // chronological neural activity log
        </motion.p>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-[#00f0ff]/30 via-[#a855f7]/20 to-transparent" />

          <div className="space-y-8">
            {timelineEvents.map((group, gi) => (
              <motion.div
                key={group.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.15 }}
              >
                {/* Date header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-[#111128] border border-[rgba(0,240,255,0.15)] flex items-center justify-center z-10 relative">
                    <Clock className="w-4 h-4 text-[#00f0ff]" />
                  </div>
                  <span className="text-sm font-semibold text-[#e0e7ff] font-[family-name:var(--font-mono)]">
                    {group.date}
                  </span>
                </div>

                {/* Events */}
                <div className="ml-[18px] pl-8 space-y-3">
                  {group.items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: gi * 0.15 + i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[rgba(0,240,255,0.03)] transition-all group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${item.color}08`,
                          border: `1px solid ${item.color}12`,
                        }}
                      >
                        <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      </div>
                      <span className="text-sm text-[#e0e7ff] flex-1">{item.text}</span>
                      <span className="text-[10px] text-[#3d4270] font-[family-name:var(--font-mono)]">
                        {item.time}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
