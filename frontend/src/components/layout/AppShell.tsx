"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import SpotlightModal from "../modals/SpotlightModal";
import AskAiDrawer from "../modals/AskAiDrawer";
import SettingsModal from "../modals/SettingsModal";
import EditProfileModal from "../modals/EditProfileModal";
import ObjectDetailModal from "../modals/ObjectDetailModal";
import CreateSpaceModal from "../modals/CreateSpaceModal";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname === "/chat" || pathname?.startsWith("/chat/");

  const isFocusMode = useMyndStore((state) => state.isFocusMode);
  const isZenMode = useMyndStore((state) => state.isZenMode);
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
  const isObjectModalOpen = useMyndStore((state) => state.isObjectModalOpen);
  const setSpaces = useMyndStore((state) => state.setSpaces);
  const setActiveSpaceId = useMyndStore((state) => state.setActiveSpaceId);
  const activeSpaceId = useMyndStore((state) => state.activeSpaceId);

  // Sync body class for focus mode and zen mode
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("focus-mode-active", Boolean(isFocusMode));
      document.body.classList.toggle("zen-mode-active", Boolean(isZenMode));
    }
  }, [isFocusMode, isZenMode]);

  // Sync user profile, real spaces and knowledge from backend
  useEffect(() => {
    useMyndStore.getState().syncWithBackend().catch((err) => {
      console.warn("Could not sync backend data on mount:", err);
    });
  }, []);

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
        else if (isObjectModalOpen) closeObjectModal();
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
    isObjectModalOpen,
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
    <div
      id="app-root"
      style={isFocusMode || isZenMode ? { gridTemplateColumns: "1fr" } : undefined}
      className={`${isFocusMode ? "focus-mode-active" : ""} ${isZenMode ? "zen-mode-active" : ""}`.trim()}
    >
      {/* 1. Left Sidebar */}
      {!isFocusMode && !isZenMode && <AppSidebar />}

      {/* 2. Main Body Grid */}
      <div
        className="app-body"
        style={{ gridTemplateColumns: "1fr" }}
      >
        <main
          className="app-workspace"
          style={{ borderRight: "none", height: isChat ? "100vh" : undefined }}
        >
          {!isChat && <WorkspaceHeader />}
          <div
            className="workspace-scroll-container"
            style={
              isChat
                ? {
                  padding: 0,
                  margin: 0,
                  overflow: "hidden",
                  height: "100vh",
                  width: "100%",
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
                    width: "100%",
                    maxWidth: "100%",
                    margin: 0,
                    padding: 0,
                    gap: 0,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }
                  : isFocusMode || isZenMode
                    ? {
                      maxWidth: "1200px",
                      margin: "0 auto",
                      width: "100%",
                    }
                    : undefined
              }
            >
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Modals & Drawers */}
      <SpotlightModal />
      <AskAiDrawer />
      <SettingsModal />
      <EditProfileModal />
      <ObjectDetailModal />
      <CreateSpaceModal />

      {/* Zen Mode Exit Button */}
      {isZenMode && (
        <button
          onClick={toggleZenMode}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "8px 18px",
            borderRadius: "9999px",
            background: "#FFFFFF",
            color: "#000000",
            border: "none",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
          }}
        >
          Exit Zen Mode (Esc)
        </button>
      )}
    </div>
  );
}


