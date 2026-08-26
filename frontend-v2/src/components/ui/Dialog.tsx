import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { IconButton } from "./Button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Box */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150",
          maxWidthStyles[maxWidth]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-5 border-b border-[var(--border-subtle)]">
            <div>
              {title && <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>}
              {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
            </div>
            <IconButton label="Close dialog" size="sm" onClick={onClose}>
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </IconButton>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
