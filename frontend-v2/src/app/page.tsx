"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Skeleton } from "@/components/ui/Skeleton";

export default function RootPage() {
  const router = useRouter();
  const { currentSpace, spaces, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (currentSpace) {
        router.replace(`/spaces/${currentSpace.id}`);
      } else if (spaces.length > 0) {
        router.replace(`/spaces/${spaces[0].id}`);
      } else {
        router.replace("/spaces");
      }
    }
  }, [isLoading, currentSpace, spaces, router]);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-8 bg-[var(--bg-app)]">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-6 h-6 rounded-[var(--radius-xs)] bg-[var(--accent-primary)] animate-pulse" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Entering Active Space...</span>
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
