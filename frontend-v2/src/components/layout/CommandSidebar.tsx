"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LayoutGrid,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Target,
  Zap,
  Network,
  FolderGit2,
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
import { getSpaceArchetype, resolveSpaceIcon } from "@/lib/spaces/spaceArchetypes";

interface CommandSidebarProps {
  spaceId: string;
  space: Space | null;
  spaces?: Space[];
  onOpenSettings?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  spaceId,
  space,
  spaces: propSpaces = [],
  onOpenSettings,
  isCollapsed = false,
  onToggleCollapse,
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

  // 1. Global Operating Layer
  const globalNavItems = [
    {
      label: "Home",
      href: "/home",
      icon: Home,
      isActive: pathname === "/home" || pathname === "/",
    },
    {
      label: "Spaces",
      href: "/spaces",
      icon: FolderGit2,
      isActive: pathname === "/spaces",
    },
  ];

  // 2. Active Space Context Navigation
  const spaceNavItems = [
    {
      label: "Overview",
      href: `/spaces/${spaceId}`,
      icon: LayoutGrid,
      isActive: pathname === `/spaces/${spaceId}`,
    },
    {
      label: "Conversations",
      href: `/spaces/${spaceId}/conversations`,
      icon: MessageSquare,
      isActive: pathname.includes(`/spaces/${spaceId}/conversations`),
    },
    {
      label: "Goals",
      href: `/spaces/${spaceId}/goals`,
      icon: Target,
      isActive: pathname.includes(`/spaces/${spaceId}/goals`),
    },
    {
      label: "Tasks",
      href: `/spaces/${spaceId}/tasks`,
      icon: CheckSquare,
      isActive: pathname.includes(`/spaces/${spaceId}/tasks`),
    },
    {
      label: "Actions",
      href: `/spaces/${spaceId}/actions`,
      icon: Zap,
      isActive: pathname.includes(`/spaces/${spaceId}/actions`),
    },
    {
      label: "Documents",
      href: `/spaces/${spaceId}/knowledge`,
      icon: BookOpen,
      isActive:
        pathname.includes(`/spaces/${spaceId}/knowledge`) &&
        !pathname.includes(`/spaces/${spaceId}/map`),
    },
    {
      label: "Knowledge Map",
      href: `/spaces/${spaceId}/map`,
      icon: Network,
      isActive: pathname.includes(`/spaces/${spaceId}/map`),
    },
  ];

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Leader";

  return (
    <>
      <aside
        className={cn(
          "shrink-0 h-full bg-[#08090d] border-r border-white/[0.06] flex flex-col justify-between select-none z-30 font-sans transition-[width] duration-150",
          isCollapsed ? "w-14 p-2 items-center" : "w-56 p-3"
        )}
      >
        {isCollapsed ? (
          /* Collapsed 56px Mini-Rail View */
          <div className="w-full flex flex-col items-center space-y-3">
            {/* Space Avatar Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
                title={`${activeSpaceName} (Click to switch)`}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold border border-white/10 hover:border-white/20 transition-all cursor-pointer text-zinc-200 bg-[#0d0e15]"
              >
                {activeSpaceName.slice(0, 2).toUpperCase()}
              </button>

              {isSpaceMenuOpen && (
                <div className="absolute top-0 left-full ml-2 w-56 bg-[#0d0e15] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-between">
                    <span>Spaces ({allSpaces.length || 1})</span>
                    <Link
                      href="/spaces"
                      onClick={() => setIsSpaceMenuOpen(false)}
                      className="text-zinc-400 hover:text-white font-normal normal-case"
                    >
                      All
                    </Link>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {allSpaces.map((sp) => {
                      const arch = getSpaceArchetype(sp);
                      return (
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
                              : "text-zinc-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <span className="truncate">{sp.name}</span>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase shrink-0">
                            {arch.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Spotlight Trigger */}
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(true)}
              title="Search & Jump (⌘K)"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            <div className="w-5 h-px bg-white/[0.08]" />

            {/* Global Nav Icons */}
            <nav className="space-y-1 w-full flex flex-col items-center">
              {globalNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                      item.isActive
                        ? "bg-white/[0.1] text-white border border-white/[0.12] shadow-xs"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", item.isActive ? "text-white" : "text-zinc-400")} />
                  </Link>
                );
              })}
            </nav>

            {spaceId && (
              <>
                <div className="w-5 h-px bg-white/[0.08]" />
                {/* Space Context Icons */}
                <nav className="space-y-1 w-full flex flex-col items-center">
                  {spaceNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                          item.isActive
                            ? "bg-white/[0.1] text-white border border-white/[0.12] shadow-xs"
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", item.isActive ? "text-white" : "text-zinc-400")} />
                      </Link>
                    );
                  })}
                </nav>
              </>
            )}
          </div>
        ) : (
          /* Expanded 224px Full Sidebar View */
          <div className="space-y-4">
            {/* Workspace Switcher */}
            <div className="relative">
              {(() => {
                const currentArchetype = getSpaceArchetype(activeSpace);
                return (
                  <button
                    type="button"
                    onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.18] transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 border border-white/10 text-zinc-200 bg-[#12131c]"
                      >
                        {activeSpaceName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-white truncate">
                        {activeSpaceName}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1 group-hover:text-white transition-colors" />
                  </button>
                );
              })()}

              {isSpaceMenuOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-[#0d0e15] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-between">
                    <span>Spaces ({allSpaces.length || 1})</span>
                    <Link
                      href="/spaces"
                      onClick={() => setIsSpaceMenuOpen(false)}
                      className="text-zinc-400 hover:text-white font-normal normal-case"
                    >
                      Directory
                    </Link>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {allSpaces.map((sp) => {
                      const arch = getSpaceArchetype(sp);
                      return (
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
                              : "text-zinc-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-mono font-bold border border-white/10 shrink-0 text-zinc-300 bg-zinc-800"
                            >
                              {sp.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate">{sp.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase shrink-0">
                            {arch.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1 mt-1 border-t border-white/[0.08] space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpaceMenuOpen(false);
                        setIsCreateSpaceOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Space</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Spotlight Trigger */}
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] text-zinc-400 hover:text-white transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-xs">
                <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                <span>Search & jump...</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 rounded">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            {/* 1. GLOBAL COMMAND HUB */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                Global
              </div>
              <nav className="space-y-0.5">
                {globalNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer",
                        item.isActive
                          ? "bg-white/[0.08] text-white font-semibold border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.08)]"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5 shrink-0 transition-colors",
                          item.isActive ? "text-white" : "text-zinc-400"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* 2. ACTIVE SPACE CONTEXT */}
            {spaceId && (
              <div className="space-y-1 pt-1">
                <div className="px-2 text-[10px] font-mono uppercase text-zinc-500 tracking-wider flex items-center justify-between">
                  <span>Workspace</span>
                </div>
                <nav className="space-y-0.5">
                  {spaceNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer",
                          item.isActive
                            ? "bg-white/[0.08] text-white font-semibold border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.08)]"
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-3.5 h-3.5 shrink-0 transition-colors",
                            item.isActive ? "text-white" : "text-zinc-400"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>
        )}

        {/* Footer: Settings & User Profile */}
        <div className={cn("pt-3 border-t border-white/[0.07]", isCollapsed ? "flex flex-col items-center space-y-2" : "space-y-1.5")}>
          {isCollapsed ? (
            <>
              <Link
                href={`/spaces/${spaceId}/settings`}
                title="Workspace Settings"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                title={`Sign out (${displayName})`}
                className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-200 hover:border-zinc-500 hover:bg-zinc-700 transition-all cursor-pointer"
              >
                {displayName.charAt(0).toUpperCase()}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/spaces/${spaceId}/settings`}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Link>

              <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-semibold text-zinc-200 shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-zinc-300 truncate">
                    {displayName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => signOut()}
                  title="Sign out"
                  className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
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
