"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { apiClient } from "@/lib/api/client";
import { SpaceMember, SpaceRole } from "@/types/api";
import { UserPlus, Shield, Trash2, LogOut, Check, AlertCircle } from "lucide-react";

interface SpaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  currentUserRole?: SpaceRole;
  currentUserId?: string;
  onMembersUpdated?: () => void;
}

export const SpaceMembersModal: React.FC<SpaceMembersModalProps> = ({
  isOpen,
  onClose,
  spaceId,
  currentUserRole = "viewer",
  currentUserId,
  onMembersUpdated,
}) => {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner = currentUserRole === "owner";

  const fetchMembers = async () => {
    if (!spaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<SpaceMember[]>(`/api/v1/spaces/${spaceId}/members`);
      setMembers(data);
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setError(null);
      setSuccessMessage(null);
      setInviteEmail("");
    }
  }, [isOpen, spaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiClient(`/api/v1/spaces/${spaceId}/members`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      setSuccessMessage(`Added ${inviteEmail} as ${inviteRole}`);
      setInviteEmail("");
      await fetchMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to add member");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await apiClient(`/api/v1/spaces/${spaceId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: newRole,
        }),
      });
      setSuccessMessage("Member role updated successfully");
      await fetchMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to update role");
    }
  };

  const handleRemoveMember = async (userId: string, memberEmail?: string | null) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail || "this member"} from the Space?`)) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    try {
      await apiClient(`/api/v1/spaces/${spaceId}/members/${userId}`, {
        method: "DELETE",
      });
      setSuccessMessage("Member removed from Space");
      await fetchMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to remove member");
    }
  };

  const getRoleBadgeVariant = (role: SpaceRole) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "accent";
      case "member":
        return "default";
      case "viewer":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Space Team & Members"
      description="Manage who has access to this space and configure their permission levels."
      maxWidth="lg"
    >
      <div>
        {error && (
          <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-[var(--error-surface)] border border-[var(--error-border)] flex items-center gap-2.5 text-xs text-[var(--error-text)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-[var(--accent-surface)] border border-[var(--accent-primary)]/30 flex items-center gap-2.5 text-xs text-[var(--accent-text)]">
            <Check className="w-4 h-4 shrink-0 text-[var(--accent-primary)]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Invite Member Section (Owner & Admin only) */}
        {canManageMembers && (
          <form onSubmit={handleInvite} className="mb-6 p-4 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Add Collaborator
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="User email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
              >
                {isOwner && <option value="admin">Admin</option>}
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                isLoading={inviting}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Add
              </Button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Current Members ({members.length})
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">No members found.</div>
          ) : (
            members.map((member) => {
              const isSelf = member.user_id === currentUserId;
              const isMemberOwner = member.role === "owner";
              const canEditThisMember = isOwner ? !isMemberOwner : (canManageMembers && member.role !== "admin" && member.role !== "owner");

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-secondary)]/60 border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={member.display_name || member.email || "Member"} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--text-primary)] truncate flex items-center gap-1.5">
                        <span>{member.display_name || member.email || member.user_id}</span>
                        {isSelf && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded text-[var(--text-muted)]">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canEditThisMember ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                        className="px-2 py-1 text-xs rounded-[var(--radius-xs)] bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] cursor-pointer"
                      >
                        {isOwner && <option value="admin">Admin</option>}
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                        {member.role.toUpperCase()}
                      </Badge>
                    )}

                    {canEditThisMember && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.user_id, member.email)}
                        className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--error-text)] transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
