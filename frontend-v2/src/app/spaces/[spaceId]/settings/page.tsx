"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { Space, SpaceMember, SpaceRole } from "@/types/api";
import {
  Settings,
  Users,
  Shield,
  Trash2,
  LogOut,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  Check,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { SpaceMembersModal } from "@/components/spaces/SpaceMembersModal";

interface SettingsPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceSettingsPage({ params }: SettingsPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();
  const { user, spaces, refreshSpaces } = useAuth();

  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for general settings
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#0f766e");
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Ownership transfer
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Deletion / Leave
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Modal
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [spaceData, membersData] = await Promise.all([
        apiClient<Space>(`/api/v1/spaces/${spaceId}`),
        apiClient<SpaceMember[]>(`/api/v1/spaces/${spaceId}/members`),
      ]);
      setSpace(spaceData);
      setMembers(membersData);
      setName(spaceData.name);
      setDescription(spaceData.description || "");
      setColor(spaceData.color || "#0f766e");
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to load space settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spaceId]);

  const currentMember = members.find((m) => m.user_id === user?.id);
  const currentRole: SpaceRole = currentMember?.role || (space?.user_id === user?.id ? "owner" : "viewer");
  const isOwner = currentRole === "owner";
  const isAdmin = currentRole === "admin" || isOwner;

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingGeneral(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiClient<Space>(`/api/v1/spaces/${spaceId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
        }),
      });
      setSpace(updated);
      setSuccess("Space settings saved successfully");
      await refreshSpaces();
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to save settings");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!isOwner || !transferTargetId) return;
    const targetMember = members.find((m) => m.user_id === transferTargetId);
    if (!confirm(`Are you sure you want to transfer Space ownership to ${targetMember?.email || "this member"}? You will be demoted to Admin.`)) {
      return;
    }
    setTransferring(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient(`/api/v1/spaces/${spaceId}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({
          new_owner_user_id: transferTargetId,
        }),
      });
      setSuccess("Space ownership transferred successfully");
      await loadData();
      await refreshSpaces();
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  const handleLeaveSpace = async () => {
    if (isOwner) {
      alert("Owners cannot leave a Space without transferring ownership first.");
      return;
    }
    if (!confirm("Are you sure you want to leave this Space?")) return;
    setLeaving(true);
    setError(null);
    try {
      await apiClient(`/api/v1/spaces/${spaceId}/members/${user?.id}`, {
        method: "DELETE",
      });
      await refreshSpaces();
      router.push("/spaces");
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to leave space");
      setLeaving(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (!isOwner) return;
    if (!confirm(`Are you sure you want to PERMANENTLY delete "${space?.name}"? All documents, conversations, and workflows in this space will be deleted.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiClient(`/api/v1/spaces/${spaceId}`, {
        method: "DELETE",
      });
      await refreshSpaces();
      router.push("/spaces");
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to delete space");
      setDeleting(false);
    }
  };

  if (loading && !space) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-white font-bold text-base"
              style={{ backgroundColor: space?.color || "var(--accent-primary)" }}
            >
              {space?.name[0]?.toUpperCase() || "S"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {space?.name} Settings
                </h1>
                <Badge variant={isOwner ? "default" : isAdmin ? "accent" : "outline"} size="sm">
                  {currentRole.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Manage workspace details, team members, and role-based permissions.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--error-surface)] border border-[var(--error-border)] flex items-center gap-2.5 text-xs text-[var(--error-text)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--accent-surface)] border border-[var(--accent-primary)]/30 flex items-center gap-2.5 text-xs text-[var(--accent-text)]">
            <Check className="w-4 h-4 shrink-0 text-[var(--accent-primary)]" />
            <span>{success}</span>
          </div>
        )}

        {/* SECTION 1: GENERAL SETTINGS */}
        <Surface variant="primary" className="p-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Settings className="w-4 h-4 text-[var(--accent-primary)]" />
            General Workspace Settings
          </div>

          <form onSubmit={handleUpdateGeneral} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Space Name
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Description
              </label>
              <textarea
                rows={3}
                disabled={!isAdmin}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this workspace for?"
                className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] disabled:opacity-50 resize-none"
              />
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" variant="primary" isLoading={savingGeneral}>
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </Surface>

        {/* SECTION 2: TEAM & MEMBERS */}
        <Surface variant="primary" className="p-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Users className="w-4 h-4 text-[var(--accent-primary)]" />
              Team Collaborators ({members.length})
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsMembersModalOpen(true)}
              leftIcon={<Users className="w-3.5 h-3.5" />}
            >
              Manage Members
            </Button>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {members.slice(0, 5).map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={m.display_name || m.email || "Member"} size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {m.display_name || m.email || m.user_id}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Joined {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge variant={m.role === "owner" ? "default" : m.role === "admin" ? "accent" : "outline"} size="sm">
                  {m.role.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </Surface>

        {/* SECTION 3: OWNER CONTROLS (Transfer Ownership) */}
        {isOwner && (
          <Surface variant="primary" className="p-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <KeyRound className="w-4 h-4 text-[var(--accent-primary)]" />
              Transfer Space Ownership
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Transfer primary ownership of this Space to another registered member. Your role will become Admin.
            </p>

            <div className="flex gap-2">
              <select
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-primary)]"
              >
                <option value="">Select a member to make Owner...</option>
                {members
                  .filter((m) => m.user_id !== user?.id)
                  .map((m) => (
                    <option key={m.id} value={m.user_id}>
                      {m.email || m.display_name || m.user_id} ({m.role})
                    </option>
                  ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={!transferTargetId || transferring}
                isLoading={transferring}
                onClick={handleTransferOwnership}
              >
                Transfer
              </Button>
            </div>
          </Surface>
        )}

        {/* SECTION 4: DANGER ZONE */}
        <Surface variant="primary" className="p-6 rounded-[var(--radius-lg)] border border-[var(--error-border)]/40 bg-[var(--error-surface)]/20 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--error-text)]">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                {isOwner ? "Delete this Space" : "Leave this Space"}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {isOwner
                  ? "Permanently delete this workspace and all associated documents, chats, and actions."
                  : "Remove your membership and access to this workspace."}
              </p>
            </div>

            {isOwner ? (
              <Button
                variant="danger"
                size="sm"
                isLoading={deleting}
                onClick={handleDeleteSpace}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Space
              </Button>
            ) : (
              <Button
                variant="danger"
                size="sm"
                isLoading={leaving}
                onClick={handleLeaveSpace}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Leave Space
              </Button>
            )}
          </div>
        </Surface>
      </div>

      <SpaceMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        spaceId={spaceId}
        currentUserRole={currentRole}
        currentUserId={user?.id}
        onMembersUpdated={loadData}
      />
    </AppShell>
  );
}
