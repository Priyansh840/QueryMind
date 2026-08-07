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
        "bg-white border border-gray-200 rounded-lg shadow-sm p-6",
        hover && "hover:shadow-md transition-shadow",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
