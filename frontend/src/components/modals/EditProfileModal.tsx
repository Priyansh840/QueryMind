"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMyndStore } from "@/lib/mynd-store";
import { Camera, X, Trash2 } from "lucide-react";

export default function EditProfileModal() {
  const isEditProfileOpen = useMyndStore((state) => state.isEditProfileOpen);
  const closeEditProfile = useMyndStore((state) => state.closeEditProfile);
  const userProfile = useMyndStore((state) => state.userProfile);
  const setUserProfile = useMyndStore((state) => state.setUserProfile);

  const [name, setName] = useState(userProfile.name || "");
  const [username, setUsername] = useState(userProfile.username || "");
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl || "");
  const [isFocusedName, setIsFocusedName] = useState(false);
  const [isFocusedUsername, setIsFocusedUsername] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isEditProfileOpen) {
      setName(userProfile.name || "");
      setUsername(userProfile.username || "");
      setAvatarUrl(userProfile.avatarUrl || "");
    }
  }, [isEditProfileOpen, userProfile]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditProfileOpen) {
        closeEditProfile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditProfileOpen, closeEditProfile]);

  if (!isEditProfileOpen) return null;

  // Calculate initials from current name input
  const initials = (() => {
    const trimmed = name.trim();
    if (!trimmed) return "DD";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setAvatarUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const finalName = name.trim() || "User";
    const finalUsername = username.trim() || "user";

    setUserProfile({
      name: finalName,
      username: finalUsername,
      avatarUrl: avatarUrl,
    });

    closeEditProfile();
  };

  return (
    <div
      className="settings-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeEditProfile();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
      }}
    >
      <div
        className="edit-profile-card"
        style={{
          width: "440px",
          maxWidth: "92vw",
          background: "#212121",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 40px -8px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          color: "#FFFFFF",
          fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
          position: "relative",
          animation: "modalFadeIn 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "#FFFFFF",
              margin: 0,
              letterSpacing: "-0.2px",
            }}
          >
            Edit profile
          </h2>
        </div>

        {/* Circular Avatar Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "16px",
            marginBottom: "22px",
            gap: "8px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100px",
              height: "100px",
            }}
          >
            {/* Main Avatar Circle */}
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "#D97706",
                border: "2.5px solid #FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "36px",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    userSelect: "none",
                    letterSpacing: "1px",
                  }}
                >
                  {initials}
                </span>
              )}
            </div>

            {/* Camera Overlay Badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload profile photo"
              style={{
                position: "absolute",
                bottom: "0px",
                right: "0px",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "#262626",
                border: "1.5px solid rgba(255, 255, 255, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.5)",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#383838";
                e.currentTarget.style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#262626";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <Camera size={15} style={{ color: "#E5E7EB" }} />
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              style={{ display: "none" }}
            />
          </div>

          {/* Remove Photo action if custom photo is loaded */}
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl("")}
              style={{
                background: "none",
                border: "none",
                color: "#9CA3AF",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "2px",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
            >
              <Trash2 size={12} />
              <span>Remove photo</span>
            </button>
          )}
        </div>

        {/* Form Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Display name field */}
          <div
            style={{
              background: "#171717",
              border: isFocusedName
                ? "1px solid rgba(255, 255, 255, 0.4)"
                : "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "8px 14px",
              transition: "border-color 150ms ease",
            }}
          >
            <label
              htmlFor="edit-display-name"
              style={{
                display: "block",
                fontSize: "11px",
                color: "#8E8E93",
                fontWeight: 500,
                marginBottom: "2px",
                userSelect: "none",
              }}
            >
              Display name
            </label>
            <input
              id="edit-display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setIsFocusedName(true)}
              onBlur={() => setIsFocusedName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="Your display name"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
                padding: 0,
                margin: 0,
              }}
            />
          </div>

          {/* Username field */}
          <div
            style={{
              background: "#171717",
              border: isFocusedUsername
                ? "1px solid rgba(255, 255, 255, 0.4)"
                : "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "8px 14px",
              transition: "border-color 150ms ease",
            }}
          >
            <label
              htmlFor="edit-username"
              style={{
                display: "block",
                fontSize: "11px",
                color: "#8E8E93",
                fontWeight: 500,
                marginBottom: "2px",
                userSelect: "none",
              }}
            >
              Username
            </label>
            <input
              id="edit-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              onFocus={() => setIsFocusedUsername(true)}
              onBlur={() => setIsFocusedUsername(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="username"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 500,
                padding: 0,
                margin: 0,
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "24px",
          }}
        >
          {/* Cancel Button */}
          <button
            type="button"
            onClick={closeEditProfile}
            style={{
              background: "#2F2F2F",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "9999px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#3D3D3D")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2F2F2F")}
          >
            Cancel
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            style={{
              background: "#FFFFFF",
              color: "#000000",
              border: "none",
              borderRadius: "9999px",
              padding: "8px 22px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 150ms ease, transform 100ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.92";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
