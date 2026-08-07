"use client";

import Navbar from "@/components/layout/Navbar";
import NeonCard from "@/components/ui/NeonCard";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Moon, Shield, Bell, Database, Globe, Cpu, Palette } from "lucide-react";
import { useState } from "react";

interface ToggleProps {
  active: boolean;
  onChange: () => void;
}

function NeonToggle({ active, onChange }: ToggleProps) {
  return (
    <button onClick={onChange} className={`neon-toggle ${active ? "active" : ""}`} />
  );
}

const settingSections = [
  {
    title: "Appearance",
    icon: Palette,
    color: "#a855f7",
    items: [
      { label: "Theme", value: "Cyberpunk Dark", type: "select" as const },
      { label: "Sidebar collapsed by default", value: false, type: "toggle" as const },
      { label: "Reduce animations", value: false, type: "toggle" as const },
    ],
  },
  {
    title: "AI & Privacy",
    icon: Shield,
    color: "#00f0ff",
    items: [
      { label: "LLM Provider", value: "Gemini Pro", type: "select" as const },
      { label: "Auto-extract memories from chats", value: true, type: "toggle" as const },
      { label: "Auto-tag documents on upload", value: true, type: "toggle" as const },
      { label: "Share anonymous usage data", value: false, type: "toggle" as const },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    color: "#f472b6",
    items: [
      { label: "Weekly reflection reminders", value: true, type: "toggle" as const },
      { label: "Upload completion alerts", value: true, type: "toggle" as const },
      { label: "AI insight notifications", value: true, type: "toggle" as const },
    ],
  },
  {
    title: "Data & Storage",
    icon: Database,
    color: "#22d3ee",
    items: [
      { label: "Export all data", value: "", type: "button" as const },
      { label: "Clear vector database", value: "", type: "button" as const },
      { label: "Delete all memories", value: "", type: "button" as const },
    ],
  },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  const getToggleValue = (sectionTitle: string, label: string, defaultValue: boolean) => {
    const key = `${sectionTitle}-${label}`;
    return toggles[key] ?? defaultValue;
  };

  const handleToggle = (sectionTitle: string, label: string, defaultValue: boolean) => {
    const key = `${sectionTitle}-${label}`;
    setToggles((prev) => ({ ...prev, [key]: !(prev[key] ?? defaultValue) }));
  };

  return (
    <>
      <Navbar title="Settings" />
      <div className="p-6 space-y-6 max-w-3xl">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[#6b7294] font-[family-name:var(--font-mono)]"
        >
          // system configuration · preferences · data management
        </motion.p>

        {settingSections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.1 }}
          >
            <NeonCard className="p-0 overflow-hidden" hover={false}>
              {/* Section Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(100,116,180,0.06)]">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${section.color}10`, border: `1px solid ${section.color}20` }}
                >
                  <section.icon className="w-4 h-4" style={{ color: section.color }} />
                </div>
                <h3 className="text-sm font-semibold text-[#e0e7ff] font-[family-name:var(--font-mono)]">
                  {section.title}
                </h3>
              </div>

              {/* Items */}
              <div className="divide-y divide-[rgba(100,116,180,0.04)]">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[rgba(0,240,255,0.02)] transition-all"
                  >
                    <span className="text-sm text-[#e0e7ff]">{item.label}</span>
                    {item.type === "toggle" && (
                      <NeonToggle
                        active={getToggleValue(section.title, item.label, item.value as boolean)}
                        onChange={() => handleToggle(section.title, item.label, item.value as boolean)}
                      />
                    )}
                    {item.type === "select" && (
                      <span className="text-xs text-[#00f0ff] px-3 py-1 rounded-lg bg-[#00f0ff]/[0.06] border border-[#00f0ff]/15 font-[family-name:var(--font-mono)]">
                        {item.value as string}
                      </span>
                    )}
                    {item.type === "button" && (
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-[#111128] border border-[rgba(100,116,180,0.1)] text-[#6b7294] hover:text-[#e0e7ff] hover:border-[rgba(0,240,255,0.15)] transition-all font-[family-name:var(--font-mono)]">
                        Execute
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </NeonCard>
          </motion.div>
        ))}
      </div>
    </>
  );
}
