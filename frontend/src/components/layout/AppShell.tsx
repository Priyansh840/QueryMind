"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import ContextPanel from "./ContextPanel";
import SpotlightModal from "../modals/SpotlightModal";
import AskAiDrawer from "../modals/AskAiDrawer";
import SettingsModal from "../modals/SettingsModal";
import ObjectDetailModal from "../modals/ObjectDetailModal";
import { useMyndStore } from "@/lib/mynd-store";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname === "/chat" || pathname?.startsWith("/chat/");

  const isFocusMode = useMyndStore((state) => state.isFocusMode);
  const openSpotlight = useMyndStore((state) => state.openSpotlight);
  const closeSpotlight = useMyndStore((state) => state.closeSpotlight);
  const closeSettings = useMyndStore((state) => state.closeSettings);
  const closeAskAi = useMyndStore((state) => state.closeAskAi);
  const closeObjectModal = useMyndStore((state) => state.closeObjectModal);
  const toggleFocusMode = useMyndStore((state) => state.toggleFocusMode);
  const toggleZenMode = useMyndStore((state) => state.toggleZenMode);
  const isSpotlightOpen = useMyndStore((state) => state.isSpotlightOpen);
  const isSettingsOpen = useMyndStore((state) => state.isSettingsOpen);
  const isAskAiOpen = useMyndStore((state) => state.isAskAiOpen);
  const selectedObject = useMyndStore((state) => state.selectedObject);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      // Escape -> Close all open overlays
      if (e.key === "Escape") {
        if (isSpotlightOpen) closeSpotlight();
        else if (isSettingsOpen) closeSettings();
        else if (isAskAiOpen) closeAskAi();
        else if (selectedObject) closeObjectModal();
        else if (isFocusMode) toggleFocusMode();
        return;
      }

      // Cmd/Ctrl + K -> Universal Spotlight
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openSpotlight();
        return;
      }

      // Cmd/Ctrl + Shift + F -> Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // Cmd/Ctrl + Shift + Z -> Zen Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        toggleZenMode();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isSpotlightOpen,
    isSettingsOpen,
    isAskAiOpen,
    selectedObject,
    isFocusMode,
    openSpotlight,
    closeSpotlight,
    closeSettings,
    closeAskAi,
    closeObjectModal,
    toggleFocusMode,
    toggleZenMode,
  ]);

  return (
    <div id="app-root">
      {/* 1. Left Sidebar */}
      {!isFocusMode && <AppSidebar />}

      {/* 2. Main Body Grid */}
      <div
        className="app-body"
        style={isFocusMode || isChat ? { gridTemplateColumns: "1fr" } : undefined}
      >
        <main
          className="app-workspace"
          style={isChat ? { borderRight: "none" } : undefined}
        >
          <WorkspaceHeader />
          <div
            className="workspace-scroll-container"
            style={
              isChat
                ? {
                    padding: 0,
                    overflow: "hidden",
                    height: "calc(100vh - var(--header-h))",
                    display: "flex",
                    flexDirection: "column",
                  }
                : undefined
            }
          >
            <div
              className="workspace-content-grid view-enter"
              style={
                isChat
                  ? {
                      height: "100%",
                      maxWidth: "100%",
                      gap: 0,
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    }
                  : undefined
              }
            >
              {children}
            </div>
          </div>
        </main>

        {/* 3. Right Context Panel (hidden on chat & focus mode) */}
        {!isFocusMode && !isChat && <ContextPanel />}
      </div>

      {/* Modals & Drawers */}
      <SpotlightModal />
      <AskAiDrawer />
      <SettingsModal />
      <ObjectDetailModal />
    </div>
  );
}


