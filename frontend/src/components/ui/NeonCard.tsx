"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NeonCardProps {
  children: ReactNode;
  glow?: "cyan" | "purple" | "pink" | "green" | "none";
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function NeonCard({
  children,
  hover = true,
  className,
  onClick,
}: NeonCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      onClick={onClick}
      className={cn(
        "bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)] transition-all duration-200",
        hover && "hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
