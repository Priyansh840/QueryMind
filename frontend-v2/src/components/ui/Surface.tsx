import React from "react";
import { cn } from "@/lib/utils";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "elevated" | "flat";
  border?: boolean;
}

export const Surface: React.FC<SurfaceProps> = ({
  className,
  variant = "primary",
  border = true,
  children,
  ...props
}) => {
  const variantStyles = {
    primary: "bg-[var(--surface-primary)]",
    secondary: "bg-[var(--surface-secondary)]",
    elevated: "bg-[var(--surface-elevated)] shadow-[var(--shadow-md)]",
    flat: "bg-transparent",
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)]",
        variantStyles[variant],
        border && "border border-[var(--border-subtle)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
