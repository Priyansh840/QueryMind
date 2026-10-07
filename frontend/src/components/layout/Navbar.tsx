"use client";

import { Search, Bell, Command } from "lucide-react";

interface NavbarProps {
  title?: string;
}

export default function Navbar({ title }: NavbarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--bg)] sticky top-0 z-30">
      {/* Left — page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
          {title || "Dashboard"}
        </h1>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[rgba(16,185,129,0.12)] text-[#10B981] border border-[rgba(16,185,129,0.25)] uppercase font-semibold font-mono tracking-wider">
          ONLINE
        </span>
      </div>

      {/* Right — search + notifications */}
      <div className="flex items-center gap-3">
        {/* Quick search */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
          <kbd className="ml-4 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[10px] text-[var(--text-tertiary)] border border-[var(--border)]">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#10B981] rounded-full shadow-[0_0_6px_#10B981]" />
        </button>
      </div>
    </header>
  );
}
