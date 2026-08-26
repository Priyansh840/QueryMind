import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rectangular",
  ...props
}) => {
  const variantStyles = {
    text: "h-4 w-full rounded-[var(--radius-xs)]",
    circular: "rounded-full aspect-square",
    rectangular: "rounded-[var(--radius-sm)]",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-[var(--surface-active)]/50",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};
