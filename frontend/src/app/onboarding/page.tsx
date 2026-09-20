"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Brain, 
  Code, 
  Sparkles, 
  Rocket, 
  BookOpen, 
  GraduationCap, 
  LineChart, 
  Check, 
  ArrowRight, 
  Layers, 
  Bot, 
  ShieldCheck,
  Target
} from "lucide-react";
import { useMyndStore, PRESET_INTERESTS, UserInterestDefinition } from "@/lib/mynd-store";

export default function OnboardingPage() {
  const router = useRouter();
  const provisionSpacesFromInterests = useMyndStore((state) => state.provisionSpacesFromInterests);
  const setHasCompletedOnboarding = useMyndStore((state) => state.setHasCompletedOnboarding);

  // Start with empty or user-selected interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [workspaceName, setWorkspaceName] = useState("My Second Brain");
  const [isProvisioning, setIsProvisioning] = useState(false);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => 
      prev.includes(id) 
        ? prev.filter((item) => item !== id) 
        : [...prev, id]
    );
  };

  // Compute spaces to be created
  const previewSpaces = PRESET_INTERESTS
    .filter((p) => selectedInterests.includes(p.id))
    .flatMap((p) => p.spacesToCreate);

  const handleLaunch = () => {
    if (selectedInterests.length === 0) return;
    setIsProvisioning(true);
    provisionSpacesFromInterests(selectedInterests);
    setHasCompletedOnboarding(true);
    
    // Quick smooth transition
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    router.push("/dashboard");
  };

  const getInterestIcon = (iconName: string) => {
    switch (iconName) {
      case "code":
        return <Code className="w-5 h-5" />;
      case "brain":
        return <Brain className="w-5 h-5" />;
      case "rocket":
        return <Rocket className="w-5 h-5" />;
      case "book-open":
        return <BookOpen className="w-5 h-5" />;
      case "graduation-cap":
        return <GraduationCap className="w-5 h-5" />;
      case "line-chart":
        return <LineChart className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div 
      className="min-h-screen text-slate-100 flex flex-col justify-between items-center px-4 py-10 relative overflow-x-hidden"
      style={{
        backgroundColor: "#000000",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* Ambient background glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none rounded-full"
        style={{
          width: "800px",
          height: "800px",
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)",
          filter: "blur(140px)",
          opacity: 0.7,
        }}
      />

      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }}
      />

      {/* Top Brand Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 mb-8">
        <div className="flex items-center gap-2.5">
          <div 
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#171717",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
            }}
          >
            <Brain style={{ width: "20px", height: "20px", color: "#FFFFFF" }} />
          </div>
          <div>
            <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
              QueryMind
            </span>
            <span style={{ fontSize: "11px", color: "#737373", marginLeft: "8px", fontFamily: "'IBM Plex Mono', monospace" }}>
              Workspace Provisioning
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/[0.04]"
        >
          Skip for now →
        </button>
      </header>

      {/* Center Content */}
      <main className="w-full max-w-5xl z-10 flex flex-col items-center">
        {/* Headline */}
        <div className="text-center max-w-2xl mb-8">
          <div 
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              fontSize: "11px",
              fontFamily: "'IBM Plex Mono', monospace",
              color: "#EDEDED",
              fontWeight: 500,
              marginBottom: "12px",
            }}
          >
            <Sparkles style={{ width: "13px", height: "13px", color: "#FFFFFF" }} />
            STEP 2 OF 3 • USER INTERESTS & PRE-SPACES
          </div>

          <h1 
            style={{
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            Tailor Your Knowledge Operating System
          </h1>
          <p 
            style={{
              fontSize: "14px",
              color: "#94A3B8",
              marginTop: "8px",
              lineHeight: 1.5,
            }}
          >
            Select what you'd like to organize and explore. We'll automatically provision dedicated Spaces, 
            autonomous agent co-pilots, and synthesis pipelines for you.
          </p>
        </div>

        {/* Interest Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PRESET_INTERESTS.map((interest) => {
            const isSelected = selectedInterests.includes(interest.id);
            return (
              <div
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                style={{
                  background: isSelected ? "#1A1A1A" : "#121212",
                  border: isSelected 
                    ? "1px solid #FFFFFF" 
                    : "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: "16px",
                  padding: "18px",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  position: "relative",
                  boxShadow: isSelected 
                    ? "0 8px 24px -6px rgba(255, 255, 255, 0.08)" 
                    : "0 2px 8px rgba(0, 0, 0, 0.5)",
                }}
                className="hover:border-slate-500/40 group"
              >
                {/* Selection Checkmark */}
                <div 
                  style={{
                    position: "absolute",
                    top: "14px",
                    right: "14px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "6px",
                    background: isSelected ? "#10B981" : "rgba(255, 255, 255, 0.04)",
                    border: isSelected ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 150ms ease",
                  }}
                >
                  {isSelected && <Check style={{ width: "14px", height: "14px", color: "#FFFFFF" }} />}
                </div>

                {/* Card Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                  <div 
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: isSelected ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)",
                      border: isSelected ? "1px solid rgba(255, 255, 255, 0.16)" : "1px solid rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "#FFFFFF" : "#A1A1A1",
                    }}
                  >
                    {getInterestIcon(interest.icon)}
                  </div>
                  <div>
                    <span 
                      style={{
                        fontSize: "10px",
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: isSelected ? "#FFFFFF" : "#A3A3A3",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 600,
                      }}
                    >
                      {interest.category}
                    </span>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
                      {interest.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: "12px", color: "#D4D4D4", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                  {interest.description}
                </p>

                {/* Generates Tag List */}
                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "10px" }}>
                  <div style={{ fontSize: "10px", color: "#A3A3A3", marginBottom: "6px", fontWeight: 500 }}>
                    PROVISIONS SPACES:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {interest.spacesToCreate.map((space) => (
                      <span 
                        key={space.id}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: isSelected ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
                          color: isSelected ? "#F1F5F9" : "#94A3B8",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span 
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            backgroundColor: "#FFFFFF",
                          }}
                        />
                        {space.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Preview Shelf */}
        <div 
          className="w-full"
          style={{
            background: "#121212",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "20px 24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-white" />
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
                  Pre-Configured Spaces Ready for Generation ({previewSpaces.length})
                </h4>
              </div>
              <p style={{ fontSize: "12px", color: "#A3A3A3", margin: "2px 0 0 0" }}>
                Each space is paired with a domain-expert agent and starter synthesis milestones.
              </p>
            </div>

            {/* Launch Action */}
            <button
              type="button"
              disabled={isProvisioning || previewSpaces.length === 0}
              onClick={handleLaunch}
              style={{
                height: "42px",
                padding: "0 22px",
                borderRadius: "10px",
                background: previewSpaces.length === 0 ? "rgba(255, 255, 255, 0.2)" : "#FFFFFF",
                border: "none",
                color: previewSpaces.length === 0 ? "#737373" : "#000000",
                fontSize: "13px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: previewSpaces.length === 0 ? "not-allowed" : "pointer",
                boxShadow: previewSpaces.length === 0 ? "none" : "0 4px 16px rgba(255, 255, 255, 0.15)",
                transition: "all 150ms ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (previewSpaces.length > 0) {
                  e.currentTarget.style.background = "#E5E5E5";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (previewSpaces.length > 0) {
                  e.currentTarget.style.background = "#FFFFFF";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <span>
                {isProvisioning
                  ? "Provisioning Spaces..."
                  : previewSpaces.length === 0
                  ? "Select Interests to Continue"
                  : `Enter Home Page (${previewSpaces.length} Spaces)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Generated Spaces Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-4">
            {previewSpaces.map((space) => (
              <div
                key={space.id}
                style={{
                  background: "#0D0D0D",
                  border: "1px solid rgba(255, 255, 255, 0.07)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span 
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#FFFFFF",
                        boxShadow: "0 0 6px rgba(255, 255, 255, 0.4)",
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#F8FAFC" }}>
                      {space.name}
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#64748B", margin: 0, lineHeight: 1.35 }}>
                    {space.desc}
                  </p>
                </div>

                <div 
                  style={{
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    paddingTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    color: "#94A3B8",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-white/80" />
                    <span className="truncate max-w-[110px]">{space.agentName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Target className="w-3 h-3" />
                    <span>{space.milestoneTitles.length} tasks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl flex items-center justify-between text-[11px] text-slate-500 pt-8 mt-6 border-t border-white/[0.06] z-10 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PostgreSQL + Qdrant Vector Engine Initialized</span>
        </div>
        <div>
          <span>QueryMind v2.6 • AI Second Brain</span>
        </div>
      </footer>
    </div>
  );
}
