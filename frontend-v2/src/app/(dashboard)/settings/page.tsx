"use client";

import React, { useState } from "react";
import { Settings, User, Bell, Shield, Palette } from "lucide-react";
import { useMyndStore } from "@/lib/mynd-store";

export default function SettingsPage() {
  const userProfile = useMyndStore((state) => state.userProfile);
  const [name, setName] = useState(userProfile?.name || "Workspace User");
  const [email, setEmail] = useState(userProfile?.email || "user@querymind.local");

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 32px", width: "100%" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Workspace Settings
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Manage your profile, theme, and workspace preferences.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ padding: "24px", background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", borderRadius: "14px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <User size={18} style={{ color: "var(--accent)" }} />
            Profile Information
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-tertiary)", display: "block", marginBottom: "6px" }}>Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-tertiary)", display: "block", marginBottom: "6px" }}>Email</label>
              <input
                type="email"
                value={email}
                disabled
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)", fontSize: "13px" }}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: "24px", background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", borderRadius: "14px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Palette size={18} style={{ color: "var(--accent)" }} />
            Appearance
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Theme: <strong style={{ color: "var(--text-primary)" }}>Dark Matte Luxury</strong> (Active Default)
          </p>
        </div>
      </div>
    </div>
  );
}
