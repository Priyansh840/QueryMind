"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Square,
  Radio,
  ChevronDown,
} from "lucide-react";
import { cleanMarkdownForSpeech } from "@/lib/voice";

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceName?: string;
  onSendMessage: (text: string) => Promise<string | void>;
  isGenerating?: boolean;
  lastAssistantMessage?: string;
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export default function VoiceChatModal({
  isOpen,
  onClose,
  spaceName = "Workspace",
  onSendMessage,
  isGenerating = false,
  lastAssistantMessage = "",
}: VoiceChatModalProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [userSpeech, setUserSpeech] = useState("");
  const [assistantSpokenText, setAssistantSpokenText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMounted = useRef(true);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop everything when closed
  useEffect(() => {
    isComponentMounted.current = true;
    if (!isOpen) {
      cleanupAudio();
    } else {
      startListeningLoop();
    }
    return () => {
      isComponentMounted.current = false;
      cleanupAudio();
    };
  }, [isOpen]);

  // React to generating status changes
  useEffect(() => {
    if (isGenerating) {
      setVoiceState("thinking");
    }
  }, [isGenerating]);

  // When new assistant message arrives and we are in voice mode, speak it
  useEffect(() => {
    if (!isOpen || !lastAssistantMessage) return;
    if (voiceState === "thinking") {
      speakAssistantResponse(lastAssistantMessage);
    }
  }, [lastAssistantMessage, isOpen]);

  const cleanupAudio = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceState("idle");
    setUserSpeech("");
  };

  const startListeningLoop = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";

      let accumulatedFinal = "";

      recognition.onstart = () => {
        if (!isComponentMounted.current) return;
        setVoiceState("listening");
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            accumulatedFinal = (accumulatedFinal + " " + text).trim();
          } else {
            interim += text;
          }
        }

        const liveTranscript = (accumulatedFinal + " " + interim).trim();
        setUserSpeech(liveTranscript);

        // Reset silence detection timer (wait 1.8s of silence after speaking to auto-send)
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (liveTranscript.length > 2) {
          silenceTimerRef.current = setTimeout(() => {
            if (isComponentMounted.current && liveTranscript.trim()) {
              handleVoiceQuerySubmit(liveTranscript.trim());
            }
          }, 1800);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === "not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permissions.");
        } else if (e.error !== "no-speech") {
          console.warn("Voice mode error:", e.error);
        }
      };

      recognition.onend = () => {
        // If we are still supposed to be listening and not thinking/speaking
        if (voiceState === "listening" && !isMuted && isOpen) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start voice recognition:", err);
      setErrorMessage("Could not initialize microphone. Please check permissions.");
    }
  };

  const handleVoiceQuerySubmit = async (queryText: string) => {
    if (!queryText.trim()) return;

    // Stop listening while thinking and answering
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    setVoiceState("thinking");

    try {
      const response = await onSendMessage(queryText);
      if (response && typeof response === "string") {
        speakAssistantResponse(response);
      }
    } catch (err) {
      console.error("Voice query failed:", err);
      setVoiceState("listening");
      startListeningLoop();
    }
  };

  const speakAssistantResponse = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceState("listening");
      startListeningLoop();
      return;
    }

    const cleanText = cleanMarkdownForSpeech(text);
    setAssistantSpokenText(cleanText);
    setVoiceState("speaking");

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Jenny") ||
            v.name.includes("Daniel"))
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      if (!isComponentMounted.current) return;
      setUserSpeech("");
      setVoiceState("listening");
      // Auto-listen for follow up speech
      startListeningLoop();
    };

    utterance.onerror = () => {
      if (!isComponentMounted.current) return;
      setVoiceState("listening");
      startListeningLoop();
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleInterruptSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setUserSpeech("");
    setVoiceState("listening");
    startListeningLoop();
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startListeningLoop();
    } else {
      setIsMuted(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setVoiceState("idle");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(9, 11, 15, 0.94)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "32px 24px",
        color: "#FFFFFF",
        animation: "fadeIn 200ms ease-out",
      }}
    >
      {/* ─── Top Header Bar ─── */}
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "12.5px",
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            <Radio
              style={{
                width: "13px",
                height: "13px",
                color: voiceState === "listening" ? "#10B981" : "var(--accent)",
                animation: "pulse 1.5s infinite",
              }}
            />
            <span>{spaceName} • Voice Mode</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setShowSubtitles((prev) => !prev)}
            title="Toggle Subtitles"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "18px",
              background: showSubtitles ? "rgba(255, 255, 255, 0.1)" : "transparent",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: showSubtitles ? "#FFFFFF" : "var(--text-tertiary)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <MessageSquare style={{ width: "13px", height: "13px" }} />
            <span>Captions</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Exit Voice Mode"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#FFFFFF",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
          >
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>
      </div>

      {/* ─── Center Hero: Iconic ChatGPT Fluid Voice Orb ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "36px",
          width: "100%",
          maxWidth: "600px",
          margin: "auto 0",
        }}
      >
        {/* The Animated Voice Orb */}
        <div
          style={{
            position: "relative",
            width: "180px",
            height: "180px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer Ripple Wave Rings */}
          {(voiceState === "listening" || voiceState === "speaking") && (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: "-20px",
                  borderRadius: "50%",
                  background:
                    voiceState === "listening"
                      ? "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)"
                      : "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
                  animation: "ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "-40px",
                  borderRadius: "50%",
                  background:
                    voiceState === "listening"
                      ? "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)"
                      : "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)",
                  animation: "ping 3s cubic-bezier(0, 0, 0.2, 1) infinite 600ms",
                }}
              />
            </>
          )}

          {/* Core Orb Sphere */}
          <div
            style={{
              width: "140px",
              height: "140px",
              borderRadius: "50%",
              background:
                voiceState === "speaking"
                  ? "radial-gradient(circle at 35% 35%, #60A5FA 0%, #3B82F6 45%, #1D4ED8 100%)"
                  : voiceState === "thinking"
                    ? "radial-gradient(circle at 35% 35%, #FBBF24 0%, #F59E0B 50%, #D97706 100%)"
                    : voiceState === "listening"
                      ? "radial-gradient(circle at 35% 35%, #34D399 0%, #10B981 50%, #059669 100%)"
                      : "radial-gradient(circle at 35% 35%, #94A3B8 0%, #64748B 50%, #475569 100%)",
              boxShadow:
                voiceState === "speaking"
                  ? "0 0 50px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.4)"
                  : voiceState === "thinking"
                    ? "0 0 50px rgba(245, 158, 11, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.4)"
                    : voiceState === "listening"
                      ? "0 0 50px rgba(16, 185, 129, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.4)"
                      : "0 0 25px rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              transform:
                voiceState === "listening" || voiceState === "speaking"
                  ? "scale(1.08)"
                  : "scale(1)",
            }}
          >
            {voiceState === "speaking" && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {[12, 28, 44, 28, 16].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      width: "4px",
                      height: `${h}px`,
                      borderRadius: "4px",
                      background: "#FFFFFF",
                      animation: `pulse ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </div>
            )}

            {voiceState === "thinking" && (
              <Sparkles
                style={{
                  width: "36px",
                  height: "36px",
                  color: "#FFFFFF",
                  animation: "spin 3s linear infinite",
                }}
              />
            )}

            {voiceState === "listening" && (
              <Mic
                style={{
                  width: "36px",
                  height: "36px",
                  color: "#FFFFFF",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            )}

            {voiceState === "idle" && (
              <MicOff style={{ width: "32px", height: "32px", color: "rgba(255, 255, 255, 0.6)" }} />
            )}
          </div>
        </div>

        {/* Dynamic Status Text */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "#FFFFFF",
            }}
          >
            {voiceState === "listening" && "Listening..."}
            {voiceState === "thinking" && "Thinking..."}
            {voiceState === "speaking" && "QueryMind Speaking"}
            {voiceState === "idle" && (isMuted ? "Microphone Muted" : "Ready")}
          </div>

          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-tertiary)" }}>
            {voiceState === "listening" && "Speak clearly into your microphone"}
            {voiceState === "thinking" && "Formulating answer grounded in your vault..."}
            {voiceState === "speaking" && "Tap interrupt below to ask something else"}
            {voiceState === "idle" && "Tap unmute or speak to begin"}
          </p>
        </div>

        {/* Live Captions Display */}
        {showSubtitles && (
          <div
            style={{
              width: "100%",
              minHeight: "72px",
              maxHeight: "130px",
              overflowY: "auto",
              padding: "16px 20px",
              borderRadius: "14px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "14px",
              lineHeight: 1.6,
              textAlign: "center",
              color: userSpeech ? "var(--text-primary)" : "var(--text-tertiary)",
              fontStyle: userSpeech ? "normal" : "italic",
            }}
          >
            {voiceState === "speaking"
              ? assistantSpokenText
              : userSpeech
                ? `“${userSpeech}”`
                : "Your spoken words will appear here..."}
          </div>
        )}

        {/* Error notification if any */}
        {errorMessage && (
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#EF4444",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>

      {/* ─── Bottom Floating Controls ─── */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "18px",
          paddingBottom: "12px",
        }}
      >
        {/* Mute / Unmute Button */}
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 22px",
            borderRadius: "28px",
            background: isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.08)",
            border: isMuted ? "1px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.15)",
            color: isMuted ? "#EF4444" : "#FFFFFF",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          {isMuted ? <MicOff style={{ width: "16px", height: "16px" }} /> : <Mic style={{ width: "16px", height: "16px" }} />}
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        {/* Interrupt / Stop speaking button (when AI is speaking) */}
        {voiceState === "speaking" && (
          <button
            type="button"
            onClick={handleInterruptSpeaking}
            title="Interrupt AI"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 22px",
              borderRadius: "28px",
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <Square style={{ width: "14px", height: "14px", fill: "currentColor" }} />
            <span>Interrupt</span>
          </button>
        )}

        {/* Manual Send Now (if spoken words exist and not yet auto-sent) */}
        {voiceState === "listening" && userSpeech.trim().length > 0 && (
          <button
            type="button"
            onClick={() => handleVoiceQuerySubmit(userSpeech.trim())}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              borderRadius: "28px",
              background: "var(--accent)",
              border: "none",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.35)",
              transition: "all 150ms ease",
            }}
          >
            <span>Send Now</span>
          </button>
        )}
      </div>
    </div>
  );
}
