"use client";

import React, { useState } from "react";
import { useMyndStore, PersonalizationSettings, defaultPersonalizationSettings } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";
import {
  Sparkles,
  Layers,
  Compass,
  MessageSquareCode,
  Zap,
  Sliders,
  FileText,
  ShieldCheck,
  Brain,
  RotateCcw,
  Check,
  ArrowRight,
  Terminal,
  Play,
  Loader2,
  Database,
  Globe2,
} from "lucide-react";

export default function PersonalizationPage() {
  const personalization = useMyndStore((state) => state.personalization);
  const updatePersonalization = useMyndStore((state) => state.updatePersonalization);
  const resetPersonalization = useMyndStore((state) => state.resetPersonalization);

  const [savedToast, setSavedToast] = useState(false);
  const [testPrompt, setTestPrompt] = useState("Explain how caching works in simple terms.");
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleUpdate = (updates: Partial<PersonalizationSettings>) => {
    updatePersonalization(updates);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleReset = () => {
    if (confirm("Reset all AI personalization settings back to default?")) {
      resetPersonalization();
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    }
  };

  const personaOptions = [
    {
      id: "first_principles",
      name: "Step-by-Step Thinker",
      tag: "Finds Root Causes",
      icon: Layers,
      description:
        "Breaks down hard problems step-by-step to find the real cause. Great for understanding how things work from scratch and fixing tough bugs.",
      sample:
        "Let's understand what's happening step-by-step: First, the computer sends a request over the network. Second, the database searches through millions of rows...",
    },
    {
      id: "executive",
      name: "Quick Summary",
      tag: "Saves Time",
      icon: Compass,
      description:
        "Gives you fast, clear answers, pros & cons, and clear next steps. No long essays, just the key facts so you can decide quickly.",
      sample:
        "In short: Option A is best. It is 40% faster, cheaper to run, and much easier to maintain.",
    },
    {
      id: "socratic",
      name: "Helpful Challenger",
      tag: "Tests Your Ideas",
      icon: MessageSquareCode,
      description:
        "Helps you spot mistakes before you build. Asks smart questions about what could go wrong and how to make your plan stronger.",
      sample:
        "What happens if a user loses internet connection halfway through saving? How will the app handle that without losing data?",
    },
    {
      id: "speed",
      name: "Fast Coder",
      tag: "Ready-to-Use Code",
      icon: Zap,
      description:
        "Gives you clean, working code immediately with very little talking. Perfect when you just want to copy, paste, and get things done.",
      sample:
        "```javascript\n// Quick caching helper\nconst cache = new Map();\nfunction get(key) { return cache.get(key); }\n```",
    },
  ];

  const handleSimulate = async () => {
    if (!testPrompt.trim()) return;
    setIsSimulating(true);
    setSimulatedResponse(null);

    const { cognitiveStyle, verbosity, codeStandard, formattingPreference, strictGrounding } = personalization;

    // Build a system-level instruction that mirrors the user's personalization
    const styleDirective = `Respond using the "${cognitiveStyle}" cognitive style. ` +
      `Verbosity level: ${verbosity}. ` +
      `Code standard: ${codeStandard}. ` +
      `Formatting preference: ${formattingPreference}. ` +
      (strictGrounding ? "Ground all answers strictly against uploaded documents. " : "") +
      (personalization.customDirectives ? `Custom instructions from user: ${personalization.customDirectives}. ` : "");

    const fullPrompt = `[SYSTEM CONTEXT — AI Personalization Test]\n${styleDirective}\n\n[USER QUESTION]\n${testPrompt.trim()}`;

    try {
      const res = await queryMindApi.chatWithOrchestrator(fullPrompt);
      if (res && res.response) {
        setSimulatedResponse(res.response);
      } else {
        setSimulatedResponse("AI returned an empty response. Try a different question or check your backend connection.");
      }
    } catch {
      // Fallback — call askRag as secondary path
      try {
        const ragRes = await queryMindApi.askRag(fullPrompt);
        if (ragRes && ragRes.answer) {
          setSimulatedResponse(ragRes.answer);
        } else {
          setSimulatedResponse("Unable to reach the AI engine right now. Please ensure your backend is running and try again.");
        }
      } catch {
        setSimulatedResponse("Unable to reach the AI engine right now. Please ensure your backend is running and try again.");
      }
    } finally {
      setIsSimulating(false);
    }
  };


  return (
    <div
      style={{
        maxWidth: "1080px",
        margin: "0 auto",
        padding: "32px 24px 80px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
              AI Personalization
            </h1>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "20px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10B981",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
              Active
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "680px", lineHeight: "1.5" }}>
            Customize how your AI speaks, thinks, and helps you. Pick an AI personality, choose how long or detailed answers should be, and teach it what you care about.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {savedToast && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                color: "#10B981",
                fontSize: "12px",
                fontWeight: 600,
                background: "rgba(16, 185, 129, 0.1)",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <Check className="w-3.5 h-3.5" />
              Settings Saved
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* SECTION 1: AI Personality */}
      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>1. AI Thinking Style (Personality)</h2>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "2px" }}>
              Choose how you want the AI to talk and think when answering your questions.
            </p>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Selected: <strong style={{ color: "#FFFFFF" }}>{personaOptions.find((p) => p.id === personalization.cognitiveStyle)?.name}</strong>
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          {personaOptions.map((persona) => {
            const isSelected = personalization.cognitiveStyle === persona.id;
            const Icon = persona.icon;
            return (
              <div
                key={persona.id}
                onClick={() => handleUpdate({ cognitiveStyle: persona.id as any })}
                style={{
                  padding: "18px",
                  borderRadius: "12px",
                  background: isSelected ? "rgba(255, 255, 255, 0.05)" : "var(--surface)",
                  border: isSelected ? "1.5px solid #FFFFFF" : "1px solid var(--border)",
                  boxShadow: isSelected ? "0 0 20px rgba(255, 255, 255, 0.08)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  position: "relative",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      background: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.08)",
                      color: isSelected ? "#000000" : "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: isSelected ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      color: isSelected ? "#FFFFFF" : "var(--text-tertiary)",
                    }}
                  >
                    {persona.tag}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", marginBottom: "4px" }}>
                    {persona.name}
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.45" }}>
                    {persona.description}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border)",
                    fontSize: "11px",
                    color: "var(--text-tertiary)",
                    fontStyle: "italic",
                    lineHeight: "1.4",
                  }}
                >
                  "{persona.sample.slice(0, 85)}..."
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Answer Length & Quality */}
      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>2. Answer Length & Style</h2>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            Choose how long answers should be, what kind of code you want, and how answers look.
          </p>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Verbosity */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                How Long Should Answers Be?
              </label>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                Selected: <span style={{ color: "#FFFFFF", textTransform: "capitalize" }}>
                  {personalization.verbosity === "concise" ? "Short" : personalization.verbosity === "balanced" ? "Normal" : "Detailed"}
                </span>
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { id: "concise", label: "Short & Quick", desc: "Brief bullet points, under 150 words" },
                { id: "balanced", label: "Normal (Balanced)", desc: "Easy to read with clear examples" },
                { id: "deep_dive", label: "Detailed & In-Depth", desc: "Full explanation with all details" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleUpdate({ verbosity: item.id as any })}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: personalization.verbosity === item.id ? "1.5px solid #FFFFFF" : "1px solid var(--border)",
                    background: personalization.verbosity === item.id ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: personalization.verbosity === item.id ? "#FFFFFF" : "var(--text-secondary)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Engineering Standards */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                Code Quality & Style
              </label>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                Selected: <span style={{ color: "#FFFFFF" }}>
                  {personalization.codeStandard === "staff_engineer" ? "Production Quality" : personalization.codeStandard === "rapid_prototype" ? "Quick Prototype" : "Theory & Formal"}
                </span>
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { id: "staff_engineer", label: "Production Quality", desc: "Clean, safe code with error handling & types" },
                { id: "rapid_prototype", label: "Quick Prototype", desc: "Simple code to test ideas fast" },
                { id: "academic", label: "Theory & Formal", desc: "Explains the math and algorithms behind code" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleUpdate({ codeStandard: item.id as any })}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: personalization.codeStandard === item.id ? "1.5px solid #FFFFFF" : "1px solid var(--border)",
                    background: personalization.codeStandard === item.id ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: personalization.codeStandard === item.id ? "#FFFFFF" : "var(--text-secondary)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Formatting Preference */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                How Should Answers Look?
              </label>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                Selected: <span style={{ color: "#FFFFFF" }}>
                  {personalization.formattingPreference === "structured_markdown" ? "Clean & Organized" : personalization.formattingPreference === "analytical_prose" ? "Story / Paragraphs" : "Checklists & Bullets"}
                </span>
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { id: "structured_markdown", label: "Clean & Organized", desc: "Uses tables, headings, and neat code boxes" },
                { id: "analytical_prose", label: "Story / Paragraphs", desc: "Natural paragraphs that read like an article" },
                { id: "bullet_points", label: "Checklists & Bullets", desc: "Easy-to-scan bullet lists and action steps" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleUpdate({ formattingPreference: item.id as any })}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: personalization.formattingPreference === item.id ? "1.5px solid #FFFFFF" : "1px solid var(--border)",
                    background: personalization.formattingPreference === item.id ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: personalization.formattingPreference === item.id ? "#FFFFFF" : "var(--text-secondary)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Teach the AI About You */}
      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>3. Teach the AI About You</h2>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            The AI remembers this in every chat so you never have to repeat yourself.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* User Context */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "6px" }}>
                <Brain className="w-4 h-4 text-white" />
                About Me & My Work
              </label>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                {personalization.userContext.length} chars
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: "1.4" }}>
              Tell the AI what you do, what tools you use, or what you are building. This helps it give you relevant advice instead of generic tips.
            </p>
            <textarea
              value={personalization.userContext}
              onChange={(e) => handleUpdate({ userContext: e.target.value })}
              placeholder="Example: I am a full-stack developer using React, Python, and PostgreSQL. I prefer simple, modern code that is easy to understand..."
              rows={4}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border-strong)",
                borderRadius: "8px",
                color: "#FFFFFF",
                padding: "10px 12px",
                fontSize: "12px",
                fontFamily: "inherit",
                lineHeight: "1.5",
                resize: "vertical",
              }}
            />
          </div>

          {/* Custom Directives */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "6px" }}>
                <Terminal className="w-4 h-4 text-white" />
                Rules the AI Must Always Follow
              </label>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                {personalization.customDirectives.length} chars
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-tertiary)", lineHeight: "1.4" }}>
              Specific rules you want the AI to remember in every chat.
            </p>
            <textarea
              value={personalization.customDirectives}
              onChange={(e) => handleUpdate({ customDirectives: e.target.value })}
              placeholder="Example: Always explain code in plain, simple English. Never use complicated jargon without explaining it. Always show working examples..."
              rows={4}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border-strong)",
                borderRadius: "8px",
                color: "#FFFFFF",
                padding: "10px 12px",
                fontSize: "12px",
                fontFamily: "inherit",
                lineHeight: "1.5",
                resize: "vertical",
              }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: Memory & Accuracy Settings */}
      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>4. Memory & Accuracy Settings</h2>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            Choose how the AI remembers things and where it gets its facts.
          </p>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Autonomous Memory */}
          <div
            style={{
              padding: "18px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                }}
              >
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
                  Remember Things Automatically
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  The AI automatically remembers important facts, tools, and preferences you mention during chats.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpdate({ autonomousMemory: !personalization.autonomousMemory })}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                border: personalization.autonomousMemory ? "1px solid #10B981" : "1px solid var(--border)",
                background: personalization.autonomousMemory ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: personalization.autonomousMemory ? "#10B981" : "var(--text-tertiary)",
                cursor: "pointer",
              }}
            >
              {personalization.autonomousMemory ? "On" : "Off"}
            </button>
          </div>

          {/* Cross-Space Synthesis */}
          <div
            style={{
              padding: "18px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                }}
              >
                <Globe2 className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
                  Search Across All Spaces
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Allows the AI to find and connect notes from all your projects, not just the one you are currently viewing.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpdate({ crossSpaceSynthesis: !personalization.crossSpaceSynthesis })}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                border: personalization.crossSpaceSynthesis ? "1px solid #10B981" : "1px solid var(--border)",
                background: personalization.crossSpaceSynthesis ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: personalization.crossSpaceSynthesis ? "#10B981" : "var(--text-tertiary)",
                cursor: "pointer",
              }}
            >
              {personalization.crossSpaceSynthesis ? "Search Everywhere" : "Current Space Only"}
            </button>
          </div>

          {/* Strict Vault Grounding */}
          <div
            style={{
              padding: "18px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                }}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
                  Only Use My Uploaded Files
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  When turned on, the AI only answers using files and notes you uploaded. If the answer isn't in your files, it will say "I don't know" instead of guessing.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpdate({ strictGrounding: !personalization.strictGrounding })}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                border: personalization.strictGrounding ? "1px solid #10B981" : "1px solid var(--border)",
                background: personalization.strictGrounding ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: personalization.strictGrounding ? "#10B981" : "var(--text-tertiary)",
                cursor: "pointer",
              }}
            >
              {personalization.strictGrounding ? "Strict (No Guessing)" : "Normal (Files + AI Knowledge)"}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 5: Try It Live (Preview) */}
      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>5. Try It Live (Preview)</h2>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            Ask any question below to see how the AI answers with your chosen settings.
          </p>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Preset Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 600 }}>Example Questions:</span>
            {[
              "Explain how caching works in simple terms.",
              "Help me choose between two databases for my project.",
              "How do I make my slow website load faster?",
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTestPrompt(preset)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Prompt Input & Trigger */}
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Ask any question to test your AI style..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border-strong)",
                color: "#FFFFFF",
                fontSize: "13px",
              }}
            />
            <button
              type="button"
              onClick={handleSimulate}
              disabled={isSimulating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 18px",
                borderRadius: "8px",
                background: "#FFFFFF",
                color: "#000000",
                fontWeight: 600,
                fontSize: "13px",
                border: "none",
                cursor: isSimulating ? "wait" : "pointer",
              }}
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Test It
                </>
              )}
            </button>
          </div>

          {/* Response Output Box */}
          {simulatedResponse && (
            <div
              style={{
                marginTop: "10px",
                padding: "16px",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "var(--text-primary)",
                fontSize: "13px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {simulatedResponse}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
