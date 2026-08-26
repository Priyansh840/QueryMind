import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "success" | "warning" | "error" | "info" | "outline";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
    accent: "bg-[var(--accent-surface)] text-[var(--accent-text)] border-[var(--accent-border)]",
    success: "bg-[var(--success-surface)] text-[var(--success-text)] border-[var(--success-border)]",
    warning: "bg-[var(--warning-surface)] text-[var(--warning-text)] border-[var(--warning-border)]",
    error: "bg-[var(--error-surface)] text-[var(--error-text)] border-[var(--error-border)]",
    info: "bg-[var(--info-surface)] text-[var(--info-text)] border-[var(--info-border)]",
    outline: "bg-transparent text-[var(--text-secondary)] border-[var(--border-default)]",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[10px] font-medium tracking-tight",
    md: "px-2.5 py-0.5 text-xs font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
