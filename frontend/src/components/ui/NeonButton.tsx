"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NeonButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const variants = {
  primary: "bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/50 hover:shadow-[0_0_25px_rgba(0,240,255,0.15)]",
  secondary: "bg-[#a855f7]/10 border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/20 hover:border-[#a855f7]/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]",
  ghost: "bg-transparent border-[#6b7294]/20 text-[#6b7294] hover:bg-[#111128] hover:text-[#e0e7ff] hover:border-[#6b7294]/40",
  danger: "bg-[#f472b6]/10 border-[#f472b6]/30 text-[#f472b6] hover:bg-[#f472b6]/20 hover:border-[#f472b6]/50 hover:shadow-[0_0_25px_rgba(244,114,182,0.15)]",
};

const sizes = {
  sm: "px-4 py-2 text-xs gap-1.5",
  md: "px-6 py-2.5 text-sm gap-2",
  lg: "px-8 py-3.5 text-base gap-2.5",
};

export default function NeonButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onClick,
  className,
  type = "button",
}: NeonButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-xl border transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="30 70" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
