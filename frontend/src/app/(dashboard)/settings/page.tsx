"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Moon, Globe, Shield, Bell, Database } from "lucide-react";

const settingSections = [
  {
    title: "Appearance",
    icon: Moon,
    items: [
      { label: "Theme", value: "Dark", type: "select" },
      { label: "Sidebar collapsed by default", value: false, type: "toggle" },
    ],
  },
  {
    title: "AI & Privacy",
    icon: Shield,
    items: [
      { label: "LLM Provider", value: "Gemini", type: "select" },
      { label: "Auto-extract memories from chats", value: true, type: "toggle" },
      { label: "Auto-tag documents on upload", value: true, type: "toggle" },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    items: [
      { label: "Weekly reflection reminders", value: true, type: "toggle" },
      { label: "Upload completion alerts", value: true, type: "toggle" },
    ],
  },
  {
    title: "Data",
    icon: Database,
    items: [
      { label: "Export all data", value: "", type: "button" },
      { label: "Clear vector database", value: "", type: "button" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <>
      <Navbar title="Settings" subtitle="Configure your QueryMind experience" />

      <div className="p-6 max-w-3xl space-y-6">
        {settingSections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6"
          >
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <section.icon className="w-5 h-5 text-indigo-400" />
              {section.title}
            </h3>
            <div className="space-y-4">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-slate-300">{item.label}</span>
                  {item.type === "toggle" && (
                    <div
                      className={`w-10 h-6 rounded-full relative cursor-pointer transition-all ${
                        item.value
                          ? "bg-indigo-500"
                          : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                          item.value ? "left-5" : "left-1"
                        }`}
                      />
                    </div>
                  )}
                  {item.type === "select" && (
                    <span className="px-3 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
                      {item.value as string}
                    </span>
                  )}
                  {item.type === "button" && (
                    <button className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 hover:text-white transition-all">
                      Action
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
