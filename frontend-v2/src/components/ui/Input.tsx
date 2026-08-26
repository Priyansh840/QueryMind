import React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div
          className={cn(
            "relative flex items-center w-full bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-[var(--radius-sm)] transition-mynd focus-within:border-[var(--accent-primary)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)]",
            error && "border-[var(--error-border)] focus-within:border-[var(--error-text)] focus-within:ring-[var(--error-text)]",
            disabled && "opacity-50 cursor-not-allowed bg-[var(--surface-secondary)]"
          )}
        >
          {leftIcon && <div className="pl-3.5 pr-1 text-[var(--text-muted)] flex items-center shrink-0">{leftIcon}</div>}
          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full h-9 text-sm bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none disabled:cursor-not-allowed",
              leftIcon ? "pl-2 pr-3" : "px-3",
              rightIcon && "pr-2",
              className
            )}
            {...props}
          />
          {rightIcon && <div className="pr-3 text-[var(--text-muted)] flex items-center shrink-0">{rightIcon}</div>}
        </div>
        {error && <p className="mt-1 text-xs text-[var(--error-text)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface SearchInputProps extends InputProps {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, placeholder = "Search...", ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        placeholder={placeholder}
        leftIcon={<Search className="w-4 h-4" />}
        className={cn("bg-[var(--surface-secondary)] border-transparent focus:bg-[var(--surface-primary)]", className)}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";
