"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API Types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

/**
 * Strips markdown, code blocks, links, and citations so text-to-speech sounds natural
 */
export function cleanMarkdownForSpeech(markdown: string): string {
  if (!markdown) return "";

  let text = markdown;

  // Replace code blocks with "Code snippet omitted"
  text = text.replace(/```[\s\S]*?```/g, " [code snippet] ");

  // Replace inline code with the code content
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove markdown images: ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "");

  // Replace markdown links with link text: [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Remove reference-style links or citations: [^1], [1], etc.
  text = text.replace(/\[\^?[0-9]+\]/g, "");

  // Remove markdown headers: #, ##, etc.
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove blockquotes: >
  text = text.replace(/^>\s+/gm, "");

  // Remove bold and italics: **text**, *text*, __text__, _text_
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");

  // Remove horizontal rules
  text = text.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "");

  // Clean bullet list markers
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  // Collapse multiple whitespaces and newlines
  text = text.replace(/\n+/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Hook for Speech-to-Text (Microphone input) using Web Speech API
 */
export function useSpeechToText(options?: {
  onTranscriptChange?: (text: string, isFinal: boolean) => void;
  onSpeechEnd?: (finalText: string) => void;
  lang?: string;
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isManuallyStoppedRef = useRef(false);
  const finalTranscriptAccumulatorRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition: SpeechRecognitionInstance = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = options?.lang || (typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US");

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = "";
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            newFinal += text;
          } else {
            currentInterim += text;
          }
        }

        if (newFinal) {
          const updated = (finalTranscriptAccumulatorRef.current + " " + newFinal).trim();
          finalTranscriptAccumulatorRef.current = updated;
          setTranscript(updated);
          options?.onTranscriptChange?.(updated, true);
        }

        setInterimTranscript(currentInterim);
        if (currentInterim) {
          const combined = (finalTranscriptAccumulatorRef.current + " " + currentInterim).trim();
          options?.onTranscriptChange?.(combined, false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone access was denied. Please allow microphone permissions in your browser.");
        } else if (event.error === "network") {
          setError("Network error occurred during speech recognition.");
        } else if (event.error !== "no-speech") {
          setError(`Speech recognition notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        // If not explicitly stopped and continuous mode stopped unexpectedly, restart unless errored
        if (!isManuallyStoppedRef.current && isListening) {
          try {
            recognition.start();
            return;
          } catch {
            // Already started or terminated
          }
        }
        setIsListening(false);
        setInterimTranscript("");
        if (options?.onSpeechEnd) {
          options.onSpeechEnd(finalTranscriptAccumulatorRef.current);
        }
      };

      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error("Speech recognition initialization failed:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        isManuallyStoppedRef.current = true;
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [options?.lang]);

  const startListening = useCallback((initialText: string = "") => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      isManuallyStoppedRef.current = false;
      finalTranscriptAccumulatorRef.current = initialText.trim();
      setTranscript(initialText.trim());
      setInterimTranscript("");
      setError(null);
      recognitionRef.current.start();
    } catch (err: any) {
      if (err.name === "InvalidStateError") {
        // Already active
        setIsListening(true);
      } else {
        setError("Could not activate microphone. Please check browser permissions.");
        console.error("Error starting speech recognition:", err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const toggleListening = useCallback(
    (currentText: string = "") => {
      if (isListening) {
        stopListening();
      } else {
        startListening(currentText);
      }
    },
    [isListening, startListening, stopListening]
  );

  const resetTranscript = useCallback(() => {
    finalTranscriptAccumulatorRef.current = "";
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: (transcript + " " + interimTranscript).trim(),
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
}

/**
 * Hook for Text-to-Speech (Speaking AI responses aloud) using Web SpeechSynthesis
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (rawText: string, messageId?: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      const cleanText = cleanMarkdownForSpeech(rawText);
      if (!cleanText) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05; // Slightly natural pace
      utterance.pitch = 1.0;

      // Select best voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
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

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setSpeakingId(messageId || "active");
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeakingId(null);
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeakingId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  return {
    isSpeaking,
    isPaused,
    speakingId,
    isSupported,
    speak,
    stop,
    pause,
    resume,
  };
}
