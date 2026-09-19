"use client";

import React, { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Cpu } from "lucide-react";

interface TasksRedirectProps {
  params: Promise<{ spaceId: string }>;
}

export default function TasksRedirectPage({ params }: TasksRedirectProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  useEffect(() => {
    // Graceful automatic redirect to the new Work & Initiatives Hub
    router.replace(`/spaces/${spaceId}/work`);
  }, [spaceId, router]);

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center">
          <Cpu className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Redirecting to Work & Initiatives...
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Tasks, autonomous workflows, and project outcomes have moved to the unified Work Hub.
          </p>
        </div>
        <Link href={`/spaces/${spaceId}/work`}>
          <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Go to Work Hub
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}
