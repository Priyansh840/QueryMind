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
  PanelLeft,
  Search,
  Sparkles,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton, Button } from "@/components/ui/Button";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { CreateSpaceDialog } from "@/components/spaces/CreateSpaceDialog";
import { useAuth } from "@/lib/auth/AuthContext";

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, spaces, currentSpace, setCurrentSpace, signOut } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSpaceDropdownOpen, setIsSpaceDropdownOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);

  const activeSpace = currentSpace || spaces[0] || {
    id: "default",
    name: "General Workspace",
    color: "#0d9488",
    is_default: true,
  };

  const spaceId = activeSpace.id;

  // The 4 Core Pillars of MYND (Strict Non-Negotiable Contract)
  const navigationItems = [
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

  const renderNavList = (isCollapsed: boolean, onItemClick?: () => void) => (
    <div className="space-y-1">
      {navigationItems.map((item) => {
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
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 text-xs rounded-[var(--radius-sm)] font-medium transition-mynd select-none relative",
                isActive
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] border border-transparent",
                isCollapsed && "justify-center px-0 h-9 w-9 mx-auto"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-[var(--accent-text)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                )}
              />

              {!isCollapsed && (
                <div className="flex items-center justify-between grow min-w-0">
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-opacity">
                    {item.hint}
                  </span>
                </div>
              )}
            </Link>

            {/* Hover Tooltip for 64px Dock Mode */}
            {isCollapsed && (
              <div className="hidden group-hover:flex items-center gap-1.5 absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium rounded-[var(--radius-xs)] shadow-[var(--shadow-md)] whitespace-nowrap z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                <span>{item.label}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.hint}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] antialiased">
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />

      <CreateSpaceDialog
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onSuccess={(newSpaceId) => {
          router.push(`/spaces/${newSpaceId}`);
        }}
      />

      {/* =========================================================================
          1. Desktop / Tablet Dockable Sidebar (256px ↔ 64px)
          ========================================================================= */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-full bg-[var(--surface-primary)] border-r border-[var(--border-subtle)] transition-all duration-200 z-30 shrink-0",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Workspace Switcher Header */}
        <div className="p-2.5 border-b border-[var(--border-subtle)]">
          {isSidebarOpen ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSpaceDropdownOpen(!isSpaceDropdownOpen)}
                className="flex items-center justify-between w-full p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-mynd cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-5 h-5 rounded-[var(--radius-xs)] flex items-center justify-center shrink-0 text-white font-mono font-bold text-[10px] shadow-xs"
                    style={{ backgroundColor: activeSpace.color || "var(--accent-primary)" }}
                  >
                    {activeSpace.name[0]?.toUpperCase() || "M"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-[var(--text-primary)] leading-tight">
                      {activeSpace.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                      Space Command
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 ml-1.5" />
              </button>

              {/* Space Switcher Popover */}
              {isSpaceDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-[var(--shadow-modal)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
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
                          "w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[var(--radius-xs)] hover:bg-[var(--surface-hover)] transition-mynd text-left cursor-pointer",
                          sp.id === activeSpace.id
                            ? "bg-[var(--accent-surface)] text-[var(--accent-text)] font-semibold border border-[var(--accent-border)]"
                            : "text-[var(--text-secondary)]"
                        )}
                      >
                        <span className="truncate">{sp.name}</span>
                        {sp.is_default && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded text-[var(--text-muted)]">
                            default
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpaceDropdownOpen(false);
                        setIsCreateSpaceOpen(true);
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-[var(--accent-text)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-xs)] font-medium transition-mynd cursor-pointer"
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
                onClick={() => setIsSidebarOpen(true)}
                title={activeSpace.name}
                className="w-8 h-8 rounded-[var(--radius-xs)] flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundColor: activeSpace.color || "var(--accent-primary)" }}
              >
                {activeSpace.name[0]?.toUpperCase() || "M"}
              </button>
            </div>
          )}
        </div>

        {/* Global Command / Reasoning Trigger */}
        <div className="p-2 border-b border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-[var(--radius-sm)] transition-mynd cursor-pointer",
              !isSidebarOpen && "justify-center px-0 h-9 w-9 mx-auto"
            )}
            title={!isSidebarOpen ? "Search workspace (⌘K)" : undefined}
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
            {isSidebarOpen && (
              <>
                <span className="grow text-left text-xs">Command Bar</span>
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* 4-Pillar Navigation Section */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {isSidebarOpen && (
            <div className="px-2.5 py-1 text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Navigation
            </div>
          )}
          {renderNavList(!isSidebarOpen)}
        </nav>

        {/* Bottom Dock: User Profile & Sidebar Toggle */}
        <div className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] flex items-center justify-between gap-1.5">
          <div className={cn("flex items-center gap-2 min-w-0", !isSidebarOpen && "justify-center w-full")}>
            <Avatar name={displayName} src={profile?.avatar_url} size="sm" />
            {isSidebarOpen && (
              <div className="min-w-0">
                <div className="text-xs font-medium truncate text-[var(--text-primary)]">{displayName}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                  {profile?.email || user?.email}
                </div>
              </div>
            )}
          </div>

          {isSidebarOpen && (
            <div className="flex items-center gap-1 shrink-0">
              <IconButton label="Sign out" size="sm" onClick={() => signOut()}>
                <LogOut className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--error-text)]" />
              </IconButton>
              <IconButton
                label="Collapse sidebar (64px)"
                size="sm"
                onClick={() => setIsSidebarOpen(false)}
              >
                <PanelLeftClose className="w-4 h-4 text-[var(--text-muted)]" />
              </IconButton>
            </div>
          )}
        </div>

        {/* Collapsed expand trigger button */}
        {!isSidebarOpen && (
          <div className="p-2 border-t border-[var(--border-subtle)] flex justify-center">
            <IconButton
              label="Expand sidebar (256px)"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
            >
              <PanelLeft className="w-4 h-4 text-[var(--text-muted)]" />
            </IconButton>
          </div>
        )}
      </aside>

      {/* =========================================================================
          2. Mobile Overlay Drawer (< md screens)
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative flex flex-col w-64 max-w-[80vw] h-full bg-[var(--surface-primary)] border-r border-[var(--border-subtle)] p-3 space-y-4 shadow-xl z-50 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-[var(--radius-xs)] flex items-center justify-center text-white font-mono font-bold text-xs"
                  style={{ backgroundColor: activeSpace.color || "var(--accent-primary)" }}
                >
                  {activeSpace.name[0]?.toUpperCase() || "M"}
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {activeSpace.name}
                </span>
              </div>
              <IconButton
                label="Close navigation"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-4 h-4" />
              </IconButton>
            </div>

            <nav className="flex-1 overflow-y-auto">
              {renderNavList(false, () => setIsMobileMenuOpen(false))}
            </nav>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={displayName} src={profile?.avatar_url} size="sm" />
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {displayName}
                </span>
              </div>
              <IconButton label="Sign out" size="sm" onClick={() => signOut()}>
                <LogOut className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </IconButton>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. Main Content Canvas
          ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--bg-app)]">
        {/* Top Minimal Canvas Header */}
        <header className="h-12 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)]/80 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-[var(--radius-xs)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-mynd"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
              <Link href="/spaces" className="hover:text-[var(--text-primary)] transition-colors">
                Spaces
              </Link>
              <span>/</span>
              <span className="font-medium text-[var(--text-primary)] truncate max-w-[140px] sm:max-w-[240px]">
                {activeSpace.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-mynd cursor-pointer"
            >
              <Search className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="hidden sm:inline text-xs">Search...</span>
              <kbd className="hidden sm:inline-flex items-center text-[9px] font-mono text-[var(--text-muted)] bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-1 rounded">
                ⌘K
              </kbd>
            </button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />}
              onClick={() => setIsCommandOpen(true)}
            >
              <span className="hidden sm:inline">Ask MYND</span>
            </Button>
          </div>
        </header>

        {/* Viewport Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
};
