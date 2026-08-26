"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Compass,
  Folder,
  Layers,
  Activity,
  Settings,
  Search,
  ChevronDown,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  LogOut,
  FileText,
  MessageSquare,
  CheckSquare,
  ShieldAlert,
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
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSpaceDropdownOpen, setIsSpaceDropdownOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);

  const activeSpace = currentSpace || spaces[0] || {
    id: "default",
    name: "General Workspace",
    color: "#0f766e",
    is_default: true,
  };

  // Determine if we are inside a space-scoped route
  const spaceId = activeSpace.id;

  const spaceScopedNav = [
    { label: "Overview", href: `/spaces/${spaceId}`, icon: Compass },
    { label: "Documents", href: `/spaces/${spaceId}/documents`, icon: FileText },
    { label: "Conversations", href: `/spaces/${spaceId}/conversations`, icon: MessageSquare },
    { label: "Tasks & Workflows", href: `/spaces/${spaceId}/tasks`, icon: CheckSquare },
    { label: "Actions", href: `/spaces/${spaceId}/actions`, icon: ShieldAlert },
    { label: "Activity", href: `/spaces/${spaceId}/activity`, icon: Activity },
  ];

  const globalNav = [
    { label: "All Spaces", href: "/spaces", icon: Folder },
    { label: "Knowledge Graph", href: "/knowledge", icon: Layers },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const displayName = profile?.display_name || profile?.email || user?.email || "Workspace User";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
      <CreateSpaceDialog
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onSuccess={(newSpaceId) => {
          router.push(`/spaces/${newSpaceId}`);
        }}
      />

      {/* =========================================================================
          1. Sidebar (Desktop & Tablet)
          ========================================================================= */}
      <aside
        className={cn(
          "relative flex flex-col h-full bg-[var(--surface-primary)] border-r border-[var(--border-subtle)] transition-all duration-200 z-30",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Brand & Workspace Switcher Header */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--border-subtle)]">
          {isSidebarOpen ? (
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setIsSpaceDropdownOpen(!isSpaceDropdownOpen)}
                className="flex items-center justify-between w-full p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-mynd cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-5 h-5 rounded-[var(--radius-xs)] flex items-center justify-center shrink-0 text-white font-bold text-[10px]"
                    style={{ backgroundColor: activeSpace.color || "var(--accent-primary)" }}
                  >
                    {activeSpace.name[0]?.toUpperCase() || "M"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-[var(--text-primary)]">
                      {activeSpace.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">Current Workspace</div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 ml-1" />
              </button>

              {/* Space Switcher Popover */}
              {isSpaceDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Your Spaces ({spaces.length})
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
                            ? "bg-[var(--accent-surface)] text-[var(--accent-text)] font-medium"
                            : "text-[var(--text-secondary)]"
                        )}
                      >
                        <span className="truncate">{sp.name}</span>
                        {sp.is_default && (
                          <span className="text-[9px] px-1 py-0.2 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded text-[var(--text-muted)]">
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
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-[var(--accent-primary)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-xs)] font-medium transition-mynd cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Space</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div
                className="w-6 h-6 rounded-[var(--radius-xs)] flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: activeSpace.color || "var(--accent-primary)" }}
              >
                {activeSpace.name[0]?.toUpperCase() || "M"}
              </div>
            </div>
          )}
        </div>

        {/* Global Search Trigger (⌘K) */}
        <div className="p-2 border-b border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] transition-mynd cursor-pointer",
              !isSidebarOpen && "justify-center px-0"
            )}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            {isSidebarOpen && (
              <>
                <span className="grow text-left">Search / Ask MYND</span>
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
          {/* Active Space Context Section */}
          <div className="space-y-0.5">
            {isSidebarOpen && (
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Current Context
              </div>
            )}
            {spaceScopedNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] font-medium transition-mynd select-none",
                    isActive
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]",
                    !isSidebarOpen && "justify-center px-0"
                  )}
                  title={!isSidebarOpen ? item.label : undefined}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-[var(--accent-primary)]")} />
                  {isSidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Global Workspace Views */}
          <div className="space-y-0.5 pt-2 border-t border-[var(--border-subtle)]">
            {isSidebarOpen && (
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Workspace Tools
              </div>
            )}
            {globalNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && !pathname.startsWith("/spaces/"));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] font-medium transition-mynd select-none",
                    isActive
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]",
                    !isSidebarOpen && "justify-center px-0"
                  )}
                  title={!isSidebarOpen ? item.label : undefined}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-[var(--accent-primary)]")} />
                  {isSidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Account / Footer with Sign Out */}
        <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={displayName} src={profile?.avatar_url} size="sm" />
            {isSidebarOpen && (
              <div className="min-w-0">
                <div className="text-xs font-medium truncate text-[var(--text-primary)]">{displayName}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">{profile?.email || user?.email}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="Sign out" size="sm" onClick={() => signOut()}>
              <LogOut className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--error-text)]" />
            </IconButton>
            <IconButton
              label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 text-[var(--text-muted)]" />
              ) : (
                <PanelLeft className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </IconButton>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. Main Content Canvas
          ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--bg-app)]">
        {/* Workspace Canvas Header */}
        <header className="h-12 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Link href="/spaces" className="hover:text-[var(--text-primary)] transition-colors">
                Spaces
              </Link>
              <span>/</span>
              <span className="font-semibold text-[var(--text-primary)]">{activeSpace.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
              onClick={() => setIsCommandOpen(true)}
            >
              Ask MYND
            </Button>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
};
