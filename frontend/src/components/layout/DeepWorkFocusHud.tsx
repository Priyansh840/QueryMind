"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Target,
  FileEdit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Flame,
  Clock,
  Sparkles,
  Save,
  Check,
} from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";

// Native Web Audio API Chime (crystal bell sound without external assets)
function playGentleChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Harmonic double bell (528 Hz - Solfeggio Love/DNA repair tone & 880 Hz)
    playTone(528, now, 1.4);
    playTone(880, now + 0.15, 1.8);
  } catch {
    // Audio context might be restricted before user gesture
  }
}

export default function DeepWorkFocusHud() {
  const isFocusMode = useMyndStore((state) => state.isFocusMode);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const focusSession = useMyndStore((state) => state.focusSession);
  const startFocusTimer = useMyndStore((state) => state.startFocusTimer);
  const pauseFocusTimer = useMyndStore((state) => state.pauseFocusTimer);
  const resetFocusTimer = useMyndStore((state) => state.resetFocusTimer);
  const tickFocusTimer = useMyndStore((state) => state.tickFocusTimer);
  const setFocusDuration = useMyndStore((state) => state.setFocusDuration);
  const addFocusTime = useMyndStore((state) => state.addFocusTime);
  const setFocusObjective = useMyndStore((state) => state.setFocusObjective);
  const setFocusScratchpad = useMyndStore((state) => state.setFocusScratchpad);
  const toggleFocusScratchpad = useMyndStore((state) => state.toggleFocusScratchpad);
  const toggleFocusHudExpanded = useMyndStore((state) => state.toggleFocusHudExpanded);

  const spaces = useMyndStore((state) => state.spaces);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);
  const updateSpaceScratchpad = useMyndStore((state) => state.updateSpaceScratchpad);

  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [objectiveInput, setObjectiveInput] = useState(focusSession.currentObjective);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isObjectiveCompleted, setIsObjectiveCompleted] = useState(false);

  const prevSecondsRef = useRef(focusSession.secondsRemaining);

  // Tick interval
  useEffect(() => {
    if (!focusSession.isRunning) return;
    const interval = setInterval(() => {
      tickFocusTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [focusSession.isRunning, tickFocusTimer]);

  // Audio notification when session completes
  useEffect(() => {
    if (prevSecondsRef.current === 1 && focusSession.secondsRemaining === 0) {
      playGentleChime();
    }
    prevSecondsRef.current = focusSession.secondsRemaining;
  }, [focusSession.secondsRemaining]);

  // Keep local input in sync
  useEffect(() => {
    setObjectiveInput(focusSession.currentObjective);
  }, [focusSession.currentObjective]);

  if (!isFocusMode) return null;

  const minutes = Math.floor(focusSession.secondsRemaining / 60);
  const seconds = focusSession.secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const totalSeconds = focusSession.durationMinutes * 60;
  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - focusSession.secondsRemaining) / totalSeconds) * 100));

  const handleSaveObjective = () => {
    setFocusObjective(objectiveInput.trim());
    setIsEditingObjective(false);
  };

  const handleSaveScratchpadToSpace = () => {
    if (!focusSession.scratchpad.trim()) return;
    const targetSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];
    if (targetSpace) {
      const existing = targetSpace.scratchpad || "";
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newEntry = `\n\n### ⏱️ Focus Note (${timestamp})\n${focusSession.scratchpad.trim()}`;
      updateSpaceScratchpad(targetSpace.id, existing + newEntry);
      setIsSavedFeedback(true);
      setTimeout(() => setIsSavedFeedback(false), 2500);
    }
  };

  const handleObjectiveCheck = () => {
    setIsObjectiveCompleted(!isObjectiveCompleted);
    if (!isObjectiveCompleted) {
      playGentleChime();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        maxWidth: focusSession.isExpanded ? "760px" : "480px",
        width: "calc(100vw - 32px)",
        transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          background: "rgba(18, 18, 18, 0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: focusSession.sessionMode === "break" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "20px",
          boxShadow: focusSession.sessionMode === "break"
            ? "0 12px 40px rgba(16, 185, 129, 0.15), 0 0 1px 1px rgba(16, 185, 129, 0.3)"
            : "0 12px 40px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
          color: "#FFFFFF",
        }}
      >
        {/* Top Floating Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            borderBottom: focusSession.isExpanded ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
            gap: "12px",
          }}
        >
          {/* Status Badge & Mode */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 9px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                background: focusSession.sessionMode === "break" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.12)",
                color: focusSession.sessionMode === "break" ? "#10B981" : "#FFFFFF",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: focusSession.isRunning ? (focusSession.sessionMode === "break" ? "#10B981" : "#3B82F6") : "#737373",
                  boxShadow: focusSession.isRunning ? `0 0 8px ${focusSession.sessionMode === "break" ? "#10B981" : "#3B82F6"}` : "none",
                }}
              />
              {focusSession.sessionMode === "break" ? "Rest Break" : "Deep Focus"}
            </span>

            {/* Time Countdown Pill */}
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: focusSession.sessionMode === "break" ? "#10B981" : "#FFFFFF",
              }}
            >
              {formattedTime}
            </span>
          </div>

          {/* Collapsed Objective Preview */}
          {!focusSession.isExpanded && (
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "12.5px",
                color: focusSession.currentObjective ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.4)",
                padding: "0 8px",
              }}
            >
              {focusSession.currentObjective ? `🎯 ${focusSession.currentObjective}` : "Click expand to set target objective..."}
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={focusSession.isRunning ? pauseFocusTimer : startFocusTimer}
              title={focusSession.isRunning ? "Pause (Space)" : "Start Focus Timer"}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                background: focusSession.isRunning ? "rgba(255, 255, 255, 0.15)" : "#FFFFFF",
                color: focusSession.isRunning ? "#FFFFFF" : "#000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {focusSession.isRunning ? <Pause style={{ width: "13px", height: "13px" }} /> : <Play style={{ width: "13px", height: "13px", marginLeft: "1px" }} />}
            </button>

            {/* Scratchpad Toggle Button */}
            <button
              type="button"
              onClick={toggleFocusScratchpad}
              title="Toggle Quick Scratchpad"
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: focusSession.isScratchpadOpen ? "rgba(255, 255, 255, 0.15)" : "transparent",
                color: focusSession.scratchpad ? "#10B981" : "rgba(255, 255, 255, 0.8)",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
              }}
            >
              <FileEdit style={{ width: "13px", height: "13px" }} />
              <span className="hidden sm:inline">Notes</span>
              {focusSession.scratchpad.trim() && (
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10B981" }} />
              )}
            </button>

            {/* Expand / Collapse Button */}
            <button
              type="button"
              onClick={toggleFocusHudExpanded}
              title={focusSession.isExpanded ? "Collapse HUD" : "Expand Cockpit"}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {focusSession.isExpanded ? <ChevronUp style={{ width: "16px", height: "16px" }} /> : <ChevronDown style={{ width: "16px", height: "16px" }} />}
            </button>

            {/* Exit Focus Mode Button */}
            <button
              type="button"
              onClick={toggleFocusMode}
              title="Exit Focus Mode (Esc)"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: "15px", height: "15px" }} />
            </button>
          </div>
        </div>

        {/* Progress bar line right beneath top bar */}
        <div style={{ width: "100%", height: "2px", background: "rgba(255, 255, 255, 0.08)" }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: focusSession.sessionMode === "break" ? "#10B981" : "linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)",
              transition: "width 1s linear",
            }}
          />
        </div>

        {/* Expanded Focus Cockpit Body */}
        {focusSession.isExpanded && (
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* 1. Single Objective Spotlight */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <button
                  type="button"
                  onClick={handleObjectiveCheck}
                  title={isObjectiveCompleted ? "Mark Uncompleted" : "Mark Objective Accomplished"}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: isObjectiveCompleted ? "#10B981" : "rgba(255, 255, 255, 0.4)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <CheckCircle2 style={{ width: "20px", height: "20px" }} />
                </button>

                {isEditingObjective ? (
                  <input
                    type="text"
                    autoFocus
                    value={objectiveInput}
                    onChange={(e) => setObjectiveInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveObjective();
                      if (e.key === "Escape") setIsEditingObjective(false);
                    }}
                    placeholder="e.g. Master GATE Question Pattern & Solve 5 Practice Problems..."
                    style={{
                      flex: 1,
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      color: "#FFFFFF",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingObjective(true)}
                    style={{
                      flex: 1,
                      fontSize: "13.5px",
                      fontWeight: 500,
                      color: focusSession.currentObjective
                        ? isObjectiveCompleted
                          ? "rgba(255, 255, 255, 0.4)"
                          : "#FFFFFF"
                        : "rgba(255, 255, 255, 0.4)",
                      textDecoration: isObjectiveCompleted ? "line-through" : "none",
                      cursor: "pointer",
                    }}
                  >
                    {focusSession.currentObjective || "Set your single sprint target (Click to edit)..."}
                  </div>
                )}
              </div>

              {isEditingObjective ? (
                <button
                  type="button"
                  onClick={handleSaveObjective}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "#FFFFFF",
                    color: "#000000",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingObjective(true)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "transparent",
                    color: "rgba(255, 255, 255, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {/* 2. Timer Controls & Presets */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {/* Presets */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {[
                  { label: "25m Sprint", mins: 25, mode: "focus" as const },
                  { label: "50m Deep Work", mins: 50, mode: "focus" as const },
                  { label: "5m Break", mins: 5, mode: "break" as const },
                ].map((p) => {
                  const isActive = focusSession.durationMinutes === p.mins && focusSession.sessionMode === p.mode;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFocusDuration(p.mins, p.mode)}
                      style={{
                        padding: "5px 11px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: isActive ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                        background: isActive ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                        color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => addFocusTime(5)}
                  title="Add 5 Minutes"
                  style={{
                    padding: "5px 9px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "rgba(255, 255, 255, 0.7)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    cursor: "pointer",
                  }}
                >
                  <Plus style={{ width: "12px", height: "12px" }} />
                  <span>5m</span>
                </button>

                <button
                  type="button"
                  onClick={resetFocusTimer}
                  title="Reset Timer"
                  style={{
                    padding: "5px 8px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw style={{ width: "12px", height: "12px" }} />
                </button>
              </div>

              {/* Day Telemetry */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12px", color: "rgba(255, 255, 255, 0.7)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Flame style={{ width: "14px", height: "14px", color: "#F59E0B" }} />
                  <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{focusSession.sessionsCompletedToday}</span>
                  <span>sprints</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock style={{ width: "13px", height: "13px", color: "#10B981" }} />
                  <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{focusSession.totalFocusMinutesToday}m</span>
                  <span>logged</span>
                </div>
              </div>
            </div>

            {/* 3. Distraction-Free Quick Scratchpad (Toggleable) */}
            {focusSession.isScratchpadOpen && (
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.45)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Focus Scratchpad & Thoughts
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isSavedFeedback && (
                      <span style={{ fontSize: "11px", color: "#10B981", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Check style={{ width: "12px", height: "12px" }} /> Saved to Space
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveScratchpadToSpace}
                      title="Save note into active Space Scratchpad"
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "#FFFFFF",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Save style={{ width: "11px", height: "11px" }} />
                      <span>Save to Space</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={focusSession.scratchpad}
                  onChange={(e) => setFocusScratchpad(e.target.value)}
                  placeholder="Capture quick realizations, formulas, or questions here without losing context..."
                  rows={3}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
