"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Compass,
  CheckSquare,
  Layers,
  MessageSquare,
  ChevronDown,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton, Button } from "@/components/ui/Button";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { CreateSpaceDialog } from "@/components/spaces/CreateSpaceDialog";
import { useAuth } from "@/lib/auth/AuthContext";

export interface SpaceLayoutProps {
  children: React.ReactNode;
  spaceId?: string;
}

export const SpaceLayout: React.FC<SpaceLayoutProps> = ({ children, spaceId: explicitSpaceId }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, spaces, currentSpace, setCurrentSpace, signOut } = useAuth();

  // Linear-style collapsible sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSpaceDropdownOpen, setIsSpaceDropdownOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);

  // Authoritative Space determination
  const activeSpace =
    (explicitSpaceId ? spaces.find((s) => s.id === explicitSpaceId) : null) ||
    currentSpace ||
    spaces[0] || {
      id: explicitSpaceId || "default",
      name: "Workspace",
      color: "#0d9488",
      is_default: true,
    };

  const spaceId = explicitSpaceId || activeSpace.id;

  // EXACTLY 4 NAVIGATION LINKS (Linear / Stripe Command Center Architecture)
  const navItems = [
    {
      label: "Overview",
      href: `/spaces/${spaceId}`,
      icon: Compass,
      exact: true,
      hint: "⌘1",
    },
    {
      label: "Work",
      href: `/spaces/${spaceId}/work`,
      icon: CheckSquare,
      aliases: [
        `/spaces/${spaceId}/tasks`,
        `/spaces/${spaceId}/actions`,
        `/spaces/${spaceId}/decisions`,
      ],
      hint: "⌘2",
    },
    {
      label: "Knowledge",
      href: `/spaces/${spaceId}/knowledge`,
      icon: Layers,
      aliases: [
        `/spaces/${spaceId}/documents`,
        `/spaces/${spaceId}/memory`,
      ],
      hint: "⌘3",
    },
    {
      label: "Sessions",
      href: `/spaces/${spaceId}/conversations`,
      icon: MessageSquare,
      aliases: [],
      hint: "⌘4",
    },
  ];

  const displayName = profile?.display_name || profile?.email || user?.email || "Engineer";

  const renderNavLinks = (inCollapsedMode: boolean, onSelect?: () => void) => (
    <div className="space-y-1">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.aliases &&
              item.aliases.some(
                (alias) => pathname === alias || pathname.startsWith(`${alias}/`)
              ));

        const Icon = item.icon;

        return (
          <div key={item.href} className="relative group">
            <Link
              href={item.href}
              onClick={onSelect}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-xs rounded-lg font-medium transition-all select-none relative",
                isActive
                  ? "bg-[#141923] text-white font-medium border border-blue-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent",
                inCollapsedMode && "justify-center px-0 h-9 w-9 mx-auto"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-blue-400" : "text-slate-400 group-hover:text-white"
                )}
              />

              {!inCollapsedMode && (
                <div className="flex items-center justify-between grow min-w-0">
                  <span className="truncate text-xs">{item.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-400 font-mono">
                    {item.hint}
                  </span>
                </div>
              )}
            </Link>

            {/* Hover Tooltip when Collapsed in 64px Dock */}
            {inCollapsedMode && (
              <div className="hidden group-hover:flex items-center gap-2 absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-[#141923] border border-white/10 text-xs text-white font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                <span>{item.label}</span>
                <span className="text-[10px] text-slate-400 font-mono">{item.hint}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07080b] text-[#f8fafc] antialiased">
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />

      <CreateSpaceDialog
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onSuccess={(newSpaceId) => {
          router.push(`/spaces/${newSpaceId}`);
        }}
      />

      {/* =========================================================================
          1. LINEAR-STYLE COLLAPSIBLE SIDEBAR (256px expanded ↔ 64px icon dock)
          ========================================================================= */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-full bg-[#07080b] border-r border-white/8 transition-all duration-150 z-30 shrink-0 select-none",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Workspace Brand / Space Switcher */}
        <div className="p-2.5 border-b border-white/8">
          {!isCollapsed ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSpaceDropdownOpen(!isSpaceDropdownOpen)}
                className="flex items-center justify-between w-full p-2 rounded-lg bg-[#0e1117] border border-white/8 hover:bg-white/5 hover:border-white/15 transition-colors cursor-pointer text-left shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-[#141923] text-blue-400 font-bold text-xs shadow-xs border border-white/10">
                    {activeSpace.name[0]?.toUpperCase() || "M"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-white leading-tight">
                      {activeSpace.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Workspace
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
              </button>

              {/* Space Switcher Popover */}
              {isSpaceDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-[#111827] border border-white/10 rounded-lg shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Available Spaces ({spaces.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {spaces.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          setCurrentSpace(sp);
                          setIsSpaceDropdownOpen(false);
                          router.push(`/spaces/${sp.id}`);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-all text-left cursor-pointer",
                          sp.id === activeSpace.id
                            ? "bg-white/10 text-white font-semibold border border-white/15"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <span className="truncate">{sp.name}</span>
                        {sp.is_default && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-white/5 border border-white/10 rounded text-slate-400">
                            default
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpaceDropdownOpen(false);
                        setIsCreateSpaceOpen(true);
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#38bdf8] hover:bg-white/5 rounded-md font-medium transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Space</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                title={activeSpace.name}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#111827] border border-white/10 text-white font-mono font-bold text-xs shadow-xs hover:border-white/20 transition-all cursor-pointer"
              >
                {activeSpace.name[0]?.toUpperCase() || "M"}
              </button>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Navigation
            </div>
          )}
          {renderNavLinks(isCollapsed)}
        </nav>

        {/* Bottom User Profile & Sidebar Toggle Control */}
        <div className="p-3 border-t border-white/8 bg-[#07080b] flex items-center justify-between gap-2">
          <div className={cn("flex items-center gap-2.5 min-w-0", isCollapsed && "justify-center w-full")}>
            <Avatar name={displayName} src={profile?.avatar_url} size="sm" />
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate text-white">{displayName}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {profile?.email || user?.email}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <IconButton label="Sign out" size="sm" onClick={() => signOut()}>
                <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
              </IconButton>
              <IconButton
                label="Collapse sidebar"
                size="sm"
                onClick={() => setIsCollapsed(true)}
              >
                <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-white" />
              </IconButton>
            </div>
          )}
        </div>

        {/* When collapsed: render expand toggle button */}
        {isCollapsed && (
          <div className="p-2 border-t border-white/8 flex justify-center">
            <IconButton
              label="Expand sidebar"
              size="sm"
              onClick={() => setIsCollapsed(false)}
            >
              <PanelLeftOpen className="w-4 h-4 text-slate-400 hover:text-white" />
            </IconButton>
          </div>
        )}
      </aside>

      {/* =========================================================================
          2. MOBILE OVERLAY DRAWER
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative flex flex-col w-64 max-w-[80vw] h-full bg-[#07080b] border-r border-white/8 p-3 space-y-4 shadow-2xl z-50 animate-in slide-in-from-left duration-200 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-[#141923] text-blue-400 font-bold text-xs shadow-xs border border-white/10">
                  {activeSpace.name[0]?.toUpperCase() || "M"}
                </div>
                <span className="text-xs font-bold text-white truncate">
                  {activeSpace.name}
                </span>
              </div>
              <IconButton
                label="Close navigation"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </IconButton>
            </div>

            <nav className="flex-1 overflow-y-auto">
              {renderNavLinks(false, () => setIsMobileMenuOpen(false))}
            </nav>

            <div className="pt-3 border-t border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={displayName} src={profile?.avatar_url} size="sm" />
                <span className="text-xs font-medium text-white truncate">
                  {displayName}
                </span>
              </div>
              <IconButton label="Sign out" size="sm" onClick={() => signOut()}>
                <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
              </IconButton>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. MAIN CONTENT CANVAS
          ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#07080b]">
        {/* Top Global Header */}
        <header className="h-12 border-b border-white/8 bg-[#07080b]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Workspace Context Tag */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">{activeSpace.name}</span>
              <span className="text-slate-600">/</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#141923] border border-white/10 text-[11px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                <span className="text-blue-400 font-sans font-medium text-[10px]">SYNCED</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0e1117] border border-white/10 hover:border-white/20 text-xs text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline text-xs">Search or jump to...</span>
              <span className="sm:hidden text-xs">Search</span>
              <kbd className="hidden sm:inline-flex items-center text-[10px] text-slate-300 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded font-mono shadow-xs">
                ⌘K
              </kbd>
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <div className="flex-1 overflow-y-auto bg-[#07080b]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </div>
      </main>
    </div>
  );
};
