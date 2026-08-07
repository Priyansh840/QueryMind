"use client";

import { useState, useEffect } from "react";

interface TypeWriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  cursor?: boolean;
  onComplete?: () => void;
}

export default function TypeWriter({
  text,
  speed = 50,
  delay = 0,
  className = "",
  cursor = true,
  onComplete,
}: TypeWriterProps) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(delayTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [started, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {cursor && (
        <span className="inline-block w-[2px] h-[1em] bg-[#00f0ff] ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}
