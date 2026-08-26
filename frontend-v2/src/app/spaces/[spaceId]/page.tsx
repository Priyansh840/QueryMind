"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { Space, DocumentItem, ConversationItem, ActionProposal } from "@/types/api";
import {
  Sparkles,
  FileText,
  MessageSquare,
  CheckSquare,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Plus,
  Compass,
  ArrowUpRight,
  Clock,
  Folder,
  Settings,
} from "lucide-react";
import { SpaceSettingsModal } from "@/components/spaces/SpaceSettingsModal";

interface SpaceDetailPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceDetailPage({ params }: SpaceDetailPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const { spaces, currentSpace, setCurrentSpace } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSpaceData() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch space details
        const spaceData = await apiClient<Space>(`/api/v1/spaces/${spaceId}`);
        setSpace(spaceData);
        if (currentSpace?.id !== spaceData.id) {
          setCurrentSpace(spaceData);
        }

        // 2. Fetch space-scoped documents
        try {
          const docRes = await apiClient<{ documents: DocumentItem[] } | DocumentItem[]>(
            `/api/v1/documents/?space_id=${spaceId}`
          );
          const docs = Array.isArray(docRes) ? docRes : docRes?.documents || [];
          setDocuments(docs);
        } catch {
          setDocuments([]);
        }

        // 3. Fetch space-scoped conversations
        try {
          const convRes = await apiClient<ConversationItem[]>(
            `/api/v1/conversations?space_id=${spaceId}`
          );
          setConversations(convRes || []);
        } catch {
          setConversations([]);
        }

        // 4. Fetch space-scoped action proposals
        try {
          const actRes = await apiClient<{ items: ActionProposal[]; total: number }>(
            `/api/v1/actions?space_id=${spaceId}&limit=5`
          );
          setProposals(actRes?.items || []);
        } catch {
          setProposals([]);
        }
      } catch (err: any) {
        console.error("Failed to load space data:", err);
        setError(err?.message || "Space not found or unauthorized.");
      } finally {
        setIsLoading(false);
      }
    }

    loadSpaceData();
  }, [spaceId, currentSpace?.id, setCurrentSpace]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error || !space) {
    return (
      <AppShell>
        <EmptyState
          icon={<AlertCircle className="w-8 h-8 text-[var(--error-text)]" />}
          title="Space Not Found"
          description={error || "The requested space could not be found or you do not have permission to view it."}
          actionLabel="Return to Spaces"
          onAction={() => {
            window.location.href = "/spaces";
          }}
        />
      </AppShell>
    );
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  return (
    <AppShell>
      <SpaceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          // Refresh space data on modal close
          apiClient<Space>(`/api/v1/spaces/${spaceId}`).then(setSpace).catch(() => {});
        }}
        space={space}
        onDeleted={() => {
          window.location.href = "/spaces";
        }}
      />
      <div className="space-y-8 pb-12">
        {/* =========================================================================
            1. Space Overview Header Brief
            ========================================================================= */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: space.color || "var(--accent-primary)" }}
            />
            <span className="text-xs font-semibold tracking-wider text-[var(--accent-text)] uppercase">
              Workspace Overview
            </span>
            {space.is_default && (
              <>
                <span className="text-xs text-[var(--border-strong)]">•</span>
                <Badge variant="outline" size="sm">
                  Default Space
                </Badge>
              </>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                {space.name}
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                {space.description || "Personal context space containing documents, conversations, and intelligence workflows."}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Settings className="w-3.5 h-3.5" />}
                onClick={() => setIsSettingsOpen(true)}
              >
                Space Settings
              </Button>
              <Link href={`/spaces/${space.id}/conversations`}>
                <Button variant="primary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                  Ask in Space
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. High-Priority Attention / Pending Action Proposals
            ========================================================================= */}
        {pendingProposals.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Requires Attention
              </h2>
              <Badge variant="accent" size="sm">
                {pendingProposals.length} proposal{pendingProposals.length > 1 ? "s" : ""} pending
              </Badge>
            </div>

            <div className="space-y-3">
              {pendingProposals.map((proposal) => (
                <Surface
                  key={proposal.id}
                  variant="primary"
                  className="p-5 border-l-2 border-l-[var(--accent-primary)] hover:border-[var(--border-default)] transition-mynd"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--accent-surface)] text-[var(--accent-text)] shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {proposal.action_type.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <Badge variant="outline" size="sm">
                            {proposal.confidence} confidence
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                          {proposal.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Link href={`/spaces/${space.id}/actions`}>
                        <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                          Review Action
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Surface>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            3. Space Metrics & Living Workspace Canvas (Real Data)
            ========================================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href={`/spaces/${space.id}/documents`}>
            <Surface variant="secondary" className="p-4 hover:bg-[var(--surface-hover)]/40 transition-mynd h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                  <FileText className="w-4 h-4 text-[var(--info-text)]" />
                  <span>Documents</span>
                </div>
                <Badge variant="default" size="sm">
                  {documents.length}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Knowledge sources indexed for RAG vector search in this space.
              </p>
            </Surface>
          </Link>

          <Link href={`/spaces/${space.id}/conversations`}>
            <Surface variant="secondary" className="p-4 hover:bg-[var(--surface-hover)]/40 transition-mynd h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                  <MessageSquare className="w-4 h-4 text-[var(--accent-text)]" />
                  <span>Conversations</span>
                </div>
                <Badge variant="default" size="sm">
                  {conversations.length}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Contextual chat sessions with LangGraph multi-agent synthesis.
              </p>
            </Surface>
          </Link>

          <Link href={`/spaces/${space.id}/actions`}>
            <Surface variant="secondary" className="p-4 hover:bg-[var(--surface-hover)]/40 transition-mynd h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                  <ShieldAlert className="w-4 h-4 text-[var(--warning-text)]" />
                  <span>Action Center</span>
                </div>
                <Badge variant="default" size="sm">
                  {proposals.length}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Proposals with row-level locking and user authorization.
              </p>
            </Surface>
          </Link>
        </section>

        {/* =========================================================================
            4. Recent Space Activity & Documents Quick Access
            ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Recent Documents
              </h2>
              <Link
                href={`/spaces/${space.id}/documents`}
                className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1"
              >
                <span>View all ({documents.length})</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {documents.length > 0 ? (
              <Surface variant="primary" className="divide-y divide-[var(--border-subtle)]">
                {documents.slice(0, 4).map((doc) => (
                  <div key={doc.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[var(--info-text)] shrink-0" />
                      <span className="font-medium text-[var(--text-primary)] truncate">{doc.title}</span>
                    </div>
                    <Badge variant="outline" size="sm">
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </Surface>
            ) : (
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title="No documents uploaded yet"
                description="Upload research notes or PDFs to ground MYND intelligence in this space."
              />
            )}
          </div>

          {/* Recent Conversations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Recent Conversations
              </h2>
              <Link
                href={`/spaces/${space.id}/conversations`}
                className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1"
              >
                <span>View all ({conversations.length})</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {conversations.length > 0 ? (
              <Surface variant="primary" className="divide-y divide-[var(--border-subtle)]">
                {conversations.slice(0, 4).map((conv) => (
                  <div key={conv.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageSquare className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
                      <span className="font-medium text-[var(--text-primary)] truncate">{conv.title}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
              </Surface>
            ) : (
              <EmptyState
                icon={<MessageSquare className="w-6 h-6" />}
                title="No conversations yet"
                description="Start a multi-agent contextual thread to ask questions about this space."
              />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
