"use client";

import React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthView } from "@/components/auth/AuthView";
import { Skeleton } from "@/components/ui/Skeleton";

export const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center p-8 bg-[var(--bg-app)]">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-6 h-6 rounded-[var(--radius-xs)] bg-[var(--accent-primary)] animate-pulse" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Initializing MYND Workspace...</span>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return <>{children}</>;
};
