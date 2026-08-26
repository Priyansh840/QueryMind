import React from "react";
import { cn } from "@/lib/utils";

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: "idle" | "running" | "completed" | "failed" | "pending" | "approved" | "executed" | "rejected" | "processing";
  label?: string;
  size?: "sm" | "md";
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = "md",
  className,
  ...props
}) => {
  const dotColor = {
    idle: "bg-[var(--text-muted)]",
    pending: "bg-[var(--warning-text)]",
    processing: "bg-[var(--accent-primary)] animate-pulse",
    approved: "bg-[var(--info-text)]",
    running: "bg-[var(--accent-primary)] animate-pulse",
    completed: "bg-[var(--success-text)]",
    executed: "bg-[var(--success-text)]",
    failed: "bg-[var(--error-text)]",
    rejected: "bg-[var(--text-muted)]",
  }[status];

  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]", className)} {...props}>
      <span className={cn("rounded-full shrink-0", dotSize, dotColor)} />
      {label && <span>{label}</span>}
    </span>
  );
};
