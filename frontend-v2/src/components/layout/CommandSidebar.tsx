"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  LogOut,
  Settings,
  Plus,
  Search,
  Command,
} from "lucide-react";
import { Space } from "@/types/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import { CreateSpaceDialog } from "@/components/modals/CreateSpaceDialog";
import { SpotlightModal } from "@/components/modals/SpotlightModal";

interface CommandSidebarProps {
  spaceId: string;
  space: Space | null;
  spaces?: Space[];
  onOpenSettings?: () => void;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  spaceId,
  space,
  spaces: propSpaces = [],
  onOpenSettings,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, setCurrentSpace, spaces: authSpaces, refreshSpaces } = useAuth();
  const [isSpaceMenuOpen, setIsSpaceMenuOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  // Combine authSpaces and propSpaces with deduplication
  const allSpaces = authSpaces && authSpaces.length > 0 ? authSpaces : propSpaces;
  const activeSpace = allSpaces.find((s) => s.id === spaceId) || space;
  const activeSpaceName = activeSpace?.name || "General Workspace";
  const activeSpaceColor = activeSpace?.color || "#6366f1";

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Strict 4-Pillar Mental Model
  const primaryPillars = [
    {
      label: "Overview",
      href: `/spaces/${spaceId}`,
      icon: LayoutGrid,
      isActive: pathname === `/spaces/${spaceId}`,
    },
    {
      label: "Sessions",
      href: `/spaces/${spaceId}/conversations`,
      icon: MessageSquare,
      isActive: pathname.includes(`/spaces/${spaceId}/conversations`),
    },
    {
      label: "Knowledge",
      href: `/spaces/${spaceId}/knowledge`,
      icon: BookOpen,
      isActive:
        pathname.includes(`/spaces/${spaceId}/knowledge`) ||
        pathname.includes(`/spaces/${spaceId}/map`) ||
        pathname.includes(`/spaces/${spaceId}/memory`) ||
        pathname.includes(`/spaces/${spaceId}/reflection`),
    },
    {
      label: "Work",
      href: `/spaces/${spaceId}/work`,
      icon: CheckCircle2,
      isActive:
        pathname.includes(`/spaces/${spaceId}/work`) ||
        pathname.includes(`/spaces/${spaceId}/tasks`) ||
        pathname.includes(`/spaces/${spaceId}/decisions`),
    },
  ];

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Leader";

  return (
    <>
      <aside className="w-56 shrink-0 h-full bg-[#08080c] border-r border-white/[0.07] flex flex-col justify-between select-none p-3 z-30 font-sans">
        <div className="space-y-4">
          {/* Workspace Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-[#0f1017] border border-white/[0.08] hover:border-white/[0.16] transition-all cursor-pointer text-left shadow-xs group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-4.5 h-4.5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: activeSpaceColor }}
                >
                  {activeSpaceName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-white truncate">
                  {activeSpaceName}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 group-hover:text-white transition-colors" />
            </button>

            {isSpaceMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-full bg-[#12131d] border border-white/[0.12] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Spaces ({allSpaces.length || 1})
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {allSpaces.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setCurrentSpace(sp);
                        setIsSpaceMenuOpen(false);
                        router.push(`/spaces/${sp.id}`);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer",
                        sp.id === spaceId
                          ? "bg-white/10 text-white font-medium"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sp.color || "#6366f1" }}
                        />
                        <span className="truncate">{sp.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-1 mt-1 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSpaceMenuOpen(false);
                      setIsCreateSpaceOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Space</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Spotlight Trigger */}
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:text-white transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
              <span>Search & jump...</span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          {/* 4-PILLAR PRIMARY NAVIGATION */}
          <nav className="space-y-1 pt-1">
            {primaryPillars.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer",
                    item.isActive
                      ? "bg-white/[0.08] text-white font-semibold border border-white/[0.09] shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      item.isActive ? "text-indigo-400" : "text-slate-400"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer: Settings & User Profile */}
        <div className="pt-3 border-t border-white/[0.07] space-y-1.5">
          <Link
            href={`/spaces/${spaceId}/settings`}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Workspace Settings</span>
          </Link>

          <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-semibold text-indigo-300 shrink-0">
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
              className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Global Modals */}
      <CreateSpaceDialog
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onCreated={async (newSpace) => {
          await refreshSpaces();
          setCurrentSpace(newSpace);
          router.push(`/spaces/${newSpace.id}`);
        }}
      />

      <SpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        spaceId={spaceId}
        onOpenCreateSpace={() => setIsCreateSpaceOpen(true)}
      />
    </>
  );
};
