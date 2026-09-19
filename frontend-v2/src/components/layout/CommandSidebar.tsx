"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  Zap,
  ChevronDown,
  LogOut,
  Settings,
  Plus,
} from "lucide-react";
import { Space } from "@/types/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

interface CommandSidebarProps {
  spaceId: string;
  space: Space | null;
  spaces?: Space[];
  onOpenSettings?: () => void;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  spaceId,
  space,
  spaces = [],
  onOpenSettings,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, setCurrentSpace } = useAuth();
  const [isSpaceMenuOpen, setIsSpaceMenuOpen] = useState(false);

  const activeSpaceName = space?.name || "General Workspace";

  const navItems = [
    { label: "Overview", href: `/spaces/${spaceId}`, icon: LayoutGrid, exact: true },
    { label: "Sessions", href: `/spaces/${spaceId}/conversations`, icon: MessageSquare },
    { label: "Knowledge", href: `/spaces/${spaceId}/knowledge`, icon: BookOpen },
    { label: "Work", href: `/spaces/${spaceId}/work`, icon: CheckCircle2 },
    { label: "Tasks", href: `/spaces/${spaceId}/tasks`, icon: Zap },
  ];

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Leader";

  return (
    <aside className="w-56 shrink-0 h-full bg-[#09090b] border-r border-white/[0.07] flex flex-col justify-between select-none p-3 z-30">
      <div className="space-y-4">
        {/* Workspace Selector Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-[#0f0f14] border border-white/[0.07] hover:border-white/[0.14] transition-colors cursor-pointer text-left shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#1a1a24] border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {activeSpaceName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-white truncate">
                {activeSpaceName}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
          </button>

          {isSpaceMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-[#121218] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Spaces ({spaces.length || 1})
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {spaces.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => {
                      setCurrentSpace(sp);
                      setIsSpaceMenuOpen(false);
                      router.push(`/spaces/${sp.id}`);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer",
                      sp.id === spaceId
                        ? "bg-white/10 text-white font-medium"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span className="truncate">{sp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MENU Navigation Section */}
        <div className="space-y-1">
          <div className="px-2.5 pb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Menu
          </div>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-[#15151c] text-white border border-white/[0.08] shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Profile & Footer Controls */}
      <div className="pt-3 border-t border-white/[0.07] space-y-1">
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Workspace Settings</span>
          </button>
        )}

        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/[0.02]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-slate-300 truncate">
              {displayName}
            </span>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out"
            className="text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
