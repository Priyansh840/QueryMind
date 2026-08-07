"use client";

import { cn } from "@/lib/utils";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "span" | "p";
}

export default function GlitchText({
  text,
  className = "",
  as: Tag = "span",
}: GlitchTextProps) {
  return (
    <Tag
      className={cn("relative inline-block glitch-hover", className)}
      data-text={text}
    >
      {text}
    </Tag>
  );
}
