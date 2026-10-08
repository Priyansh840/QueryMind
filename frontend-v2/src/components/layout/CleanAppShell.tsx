"use client";

import React, { useEffect } from "react";
import CleanSidebar from "./CleanSidebar";
import { useMyndStore } from "@/lib/mynd-store";

export default function CleanAppShell({ children }: { children: React.ReactNode }) {
  // Sync state on load
  useEffect(() => {
    useMyndStore.getState().syncWithBackend().catch((err) => {
      console.warn("Could not sync backend data on mount:", err);
    });
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-app)" }}>
      <React.Suspense fallback={<div style={{ width: "250px", height: "100vh", background: "var(--surface-primary)" }} />}>
        <CleanSidebar />
      </React.Suspense>
      <main
        style={{
          flex: 1,
          height: "100vh",
          overflowY: "auto",
          background: "var(--bg-app)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <React.Suspense fallback={<div style={{ padding: "40px", color: "var(--text-tertiary)" }}>Loading workspace...</div>}>
          {children}
        </React.Suspense>
      </main>
    </div>
  );
}
