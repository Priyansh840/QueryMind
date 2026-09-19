"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { Space, SpaceMember } from "@/types/api";
import { CommandSidebar } from "@/components/layout/CommandSidebar";
import {
  Users,
  Settings,
  Trash2,
  Plus,
  Shield,
  Check,
  AlertTriangle,
} from "lucide-react";

interface SpaceSettingsPageProps {
  params: Promise<{ spaceId: string }>;
}

export default function SpaceSettingsPage({ params }: SpaceSettingsPageProps) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;
  const router = useRouter();

  const { currentSpace, spaces, setCurrentSpace } = useAuth();
  const [space, setSpace] = useState<Space | null>(currentSpace);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [spaceRes, membersRes] = await Promise.all([
          apiClient<Space>(`/api/v1/spaces/${spaceId}`),
          apiClient<SpaceMember[]>(`/api/v1/spaces/${spaceId}/members`).catch(() => []),
        ]);
        setSpace(spaceRes);
        setName(spaceRes.name);
        setDescription(spaceRes.description || "");
        setMembers(membersRes || []);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [spaceId]);

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await apiClient<Space>(`/api/v1/spaces/${spaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      setSpace(updated);
      setCurrentSpace(updated);
      alert("Space settings updated successfully.");
    } catch (err) {
      console.error("Failed to update space:", err);
      alert("Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const added = await apiClient<SpaceMember>(`/api/v1/spaces/${spaceId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setMembers((prev) => [...prev, added]);
      setInviteEmail("");
      alert(`Invited ${inviteEmail} successfully.`);
    } catch (err: any) {
      console.error("Failed to invite member:", err);
      alert(err.message || "Failed to invite member. User must be registered.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (!confirm("Are you sure you want to permanently delete this space and all its documents and vectors? This cannot be undone.")) return;
    try {
      await apiClient(`/api/v1/spaces/${spaceId}`, {
        method: "DELETE",
      });
      router.push("/spaces");
    } catch (err) {
      console.error("Failed to delete space:", err);
      alert("Failed to delete space.");
    }
  };

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#f8fafc] flex overflow-hidden select-none">
      {/* 1. Command Sidebar */}
      <CommandSidebar spaceId={spaceId} space={space} spaces={spaces} />

      {/* 2. Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-white truncate">
              Space Settings & Team
            </h1>
            <p className="text-xs text-slate-400 truncate">
              Manage workspace identity, team collaboration, and permissions
            </p>
          </div>
        </header>

        {/* Settings Body */}
        <div className="flex-1 p-8 pb-16 max-w-4xl mx-auto w-full space-y-8 min-w-0">
          {/* General Metadata */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-6 space-y-5">
            <div className="text-xs font-semibold text-white">General Identity</div>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Space Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#12131a] text-sm text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:border-white/20 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#12131a] text-sm text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:border-white/20 focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          {/* Team Collaboration */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">Team Members & Access</div>
              <span className="text-[11px] text-slate-500 font-mono">{members.length} Members</span>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInviteMember} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 bg-[#12131a] text-xs text-white placeholder-slate-500 px-3.5 py-2 rounded-xl border border-white/[0.08] focus:border-white/20 focus:outline-hidden"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="bg-[#12131a] text-xs text-slate-300 px-3 py-2 rounded-xl border border-white/[0.08] focus:border-white/20 focus:outline-hidden"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={isInviting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors cursor-pointer disabled:opacity-40"
              >
                {isInviting ? "Inviting..." : "Invite"}
              </button>
            </form>

            {/* Members List */}
            <div className="space-y-2 pt-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl border border-white/[0.05] bg-[#12131a] flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-white">{m.display_name || m.email}</div>
                    <div className="text-[10px] text-slate-500">{m.email}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-500/20 bg-red-950/[0.08] p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </div>

            <p className="text-xs text-slate-400">
              Permanently delete this workspace and all associated documents, vector chunks, projects, and decisions.
            </p>

            <button
              type="button"
              onClick={handleDeleteSpace}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
            >
              Delete Workspace
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
