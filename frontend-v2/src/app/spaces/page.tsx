"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateSpaceDialog } from "@/components/spaces/CreateSpaceDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import { Folder, Plus, ArrowRight, Star, Clock } from "lucide-react";

export default function SpacesDirectoryPage() {
  const { spaces, currentSpace, setCurrentSpace } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <AppShell>
      <CreateSpaceDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <div className="space-y-8 pb-12">
        {/* Header Brief */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-wider text-[var(--accent-text)] uppercase">
                Workspace Directory
              </span>
              <span className="text-xs text-[var(--border-strong)]">•</span>
              <span className="text-xs text-[var(--text-muted)]">{spaces.length} Spaces</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Your Context Spaces
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Each space maintains its own isolated documents, conversations, projects, and autonomous actions.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsCreateOpen(true)}
          >
            New Space
          </Button>
        </div>

        {/* Spaces Grid */}
        {spaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => {
              const isCurrent = currentSpace?.id === space.id;
              return (
                <Surface
                  key={space.id}
                  variant="primary"
                  className={`p-5 hover:border-[var(--border-strong)] transition-mynd flex flex-col justify-between ${
                    isCurrent ? "ring-1 ring-[var(--accent-primary)]" : ""
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-[var(--radius-xs)] flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: space.color || "var(--accent-primary)" }}
                        >
                          {space.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {space.name}
                          </h3>
                          <div className="text-[11px] text-[var(--text-muted)] truncate">
                            {space.slug || "space"}
                          </div>
                        </div>
                      </div>

                      {space.is_default && (
                        <Badge variant="outline" size="sm">
                          Default
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 min-h-[32px]">
                      {space.description || "Personal workspace context for documents and decisions."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentSpace(space)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      {isCurrent ? "Active Space" : "Set Active"}
                    </button>

                    <Link href={`/spaces/${space.id}`}>
                      <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Open Space
                      </Button>
                    </Link>
                  </div>
                </Surface>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Folder className="w-8 h-8 text-[var(--text-muted)]" />}
            title="No spaces created yet"
            description="Create your first context space to start organizing documents and workflows."
            actionLabel="Create Space"
            onAction={() => setIsCreateOpen(true)}
          />
        )}
      </div>
    </AppShell>
  );
}
