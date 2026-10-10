"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMyndStore } from "@/lib/mynd-store";
import { queryMindApi } from "@/lib/api";
import {
  Mail,
  Briefcase,
  Camera,
  Edit3,
  Plus,
  X,
  Target,
  Heart,
  FileText,
  Sparkles,
  Brain,
  Compass,
} from "lucide-react";

export default function ProfilePage() {
  const userProfile = useMyndStore((state) => state.userProfile);
  const setUserProfile = useMyndStore((state) => state.setUserProfile);
  const openEditProfile = useMyndStore((state) => state.openEditProfile);
  const uploadedDocuments = useMyndStore((state) => state.uploadedDocuments);
  const spaces = useMyndStore((state) => state.spaces);

  const [memoryCount, setMemoryCount] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Form inputs
  const [newSkillInput, setNewSkillInput] = useState("");
  const [newInterestInput, setNewInterestInput] = useState("");
  const [newGoalInput, setNewGoalInput] = useState("");

  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Fetch real memory count from backend
  useEffect(() => {
    queryMindApi
      .getMemories()
      .then((mems) => {
        if (Array.isArray(mems)) setMemoryCount(mems.length);
      })
      .catch(() => setMemoryCount(0));
  }, []);

  const initials = (() => {
    const name = userProfile?.name?.trim() || "User";
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const skills = userProfile?.skills || [];
  const interests = userProfile?.interests || [];
  const goals = userProfile?.goals || [];

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setUserProfile({ avatarUrl: event.target.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillInput.trim()) return;
    setUserProfile({ skills: [...skills, newSkillInput.trim()] });
    setNewSkillInput("");
    setIsAddingSkill(false);
  };

  const handleRemoveSkill = (index: number) => {
    setUserProfile({ skills: skills.filter((_, i) => i !== index) });
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterestInput.trim()) return;
    setUserProfile({ interests: [...interests, newInterestInput.trim()] });
    setNewInterestInput("");
    setIsAddingInterest(false);
  };

  const handleRemoveInterest = (index: number) => {
    setUserProfile({ interests: interests.filter((_, i) => i !== index) });
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;
    setUserProfile({ goals: [...goals, newGoalInput.trim()] });
    setNewGoalInput("");
    setIsAddingGoal(false);
  };

  const handleRemoveGoal = (index: number) => {
    setUserProfile({ goals: goals.filter((_, i) => i !== index) });
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "840px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        paddingBottom: "80px",
        fontFamily: "var(--sans)",
      }}
    >
      {/* 1. Page Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Profile & Account
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-tertiary)", margin: 0, lineHeight: 1.5 }}>
          Manage your personal identity, workspace overview, and domain knowledge.
        </p>
      </div>

      {/* 2. User Identity Card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "26px 30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "22px", flexWrap: "wrap" }}>
          {/* Avatar Container */}
          <div style={{ position: "relative", width: "76px", height: "76px", flexShrink: 0 }}>
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: "none" }}
            />
            <div
              onClick={() => avatarInputRef.current?.click()}
              title="Click to upload profile photo"
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(168, 85, 247, 0.35))",
                color: "#A78BFA",
                fontWeight: 700,
                fontSize: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                letterSpacing: "0.5px",
              }}
            >
              {userProfile?.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              title="Upload new photo"
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "#242428",
                border: "1.5px solid rgba(255, 255, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.5)",
              }}
            >
              <Camera style={{ width: "13px", height: "13px" }} />
            </button>
          </div>

          {/* Identity Text */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {userProfile?.name || "QueryMind User"}
              </span>
              {userProfile?.username && (
                <span
                  style={{
                    fontSize: "12px",
                    padding: "2px 10px",
                    borderRadius: "9999px",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--mono)",
                    fontWeight: 500,
                  }}
                >
                  @{userProfile.username}
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
                flexWrap: "wrap",
                fontSize: "13.5px",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <Briefcase style={{ width: "15px", height: "15px", color: "#818CF8" }} />
                <span>{userProfile?.role || "Knowledge Architect"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <Mail style={{ width: "15px", height: "15px", color: "var(--text-tertiary)" }} />
                <span>{userProfile?.email || "No email assigned"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Button */}
        <button
          type="button"
          onClick={openEditProfile}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 18px",
            borderRadius: "10px",
            background: "#FFFFFF",
            color: "#000000",
            fontWeight: 600,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            transition: "opacity 150ms ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Edit3 style={{ width: "14px", height: "14px" }} />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* 3. Workspace Metrics (3 Generous Columns) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Documents
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38BDF8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText style={{ width: "16px", height: "16px" }} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                fontFamily: "var(--mono)",
                color: "var(--text-primary)",
              }}
            >
              {uploadedDocuments.length}
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              Indexed vault assets
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Active Spaces
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(168, 85, 247, 0.12)",
                color: "#C084FC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles style={{ width: "16px", height: "16px" }} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                fontFamily: "var(--mono)",
                color: "var(--text-primary)",
              }}
            >
              {spaces.length}
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              Context domains
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Neural Memories
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#34D399",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Brain style={{ width: "16px", height: "16px" }} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                fontFamily: "var(--mono)",
                color: "var(--text-primary)",
              }}
            >
              {memoryCount}
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              Synaptic cognitive vectors
            </p>
          </div>
        </div>
      </div>

      {/* 4. Skills Card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--divider)",
            paddingBottom: "14px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Target style={{ width: "17px", height: "17px", color: "#818CF8" }} />
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Skills & Proficiencies
              </h2>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>
                ({skills.length})
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: 0 }}>
              Your core technical abilities and domain competencies.
            </p>
          </div>

          {!isAddingSkill && (
            <button
              type="button"
              onClick={() => setIsAddingSkill(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Plus style={{ width: "14px", height: "14px" }} />
              <span>Add Skill</span>
            </button>
          )}
        </div>

        {/* Add Skill Form */}
        {isAddingSkill && (
          <form onSubmit={handleAddSkill} style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              placeholder="e.g. Distributed Systems, PostgreSQL, Python..."
              style={{
                flex: 1,
                padding: "9px 14px",
                borderRadius: "8px",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-strong)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                outline: "none",
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                background: "#6366F1",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingSkill(false)}
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                background: "transparent",
                color: "var(--text-tertiary)",
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Skills Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {skills.length > 0 ? (
            skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border)",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--mono)",
                }}
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(idx)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Remove"
                >
                  <X style={{ width: "13px", height: "13px" }} />
                </button>
              </span>
            ))
          ) : (
            <p style={{ fontSize: "13.5px", color: "var(--text-ghost)", margin: "4px 0", fontStyle: "italic" }}>
              No skills added yet. Click &quot;Add Skill&quot; to configure your domain proficiencies.
            </p>
          )}
        </div>
      </div>

      {/* 5. Interests Card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--divider)",
            paddingBottom: "14px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Heart style={{ width: "17px", height: "17px", color: "#F472B6" }} />
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Research & Intellectual Interests
              </h2>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>
                ({interests.length})
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: 0 }}>
              Topics and concepts that guide agent exploration and context gathering.
            </p>
          </div>

          {!isAddingInterest && (
            <button
              type="button"
              onClick={() => setIsAddingInterest(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Plus style={{ width: "14px", height: "14px" }} />
              <span>Add Interest</span>
            </button>
          )}
        </div>

        {/* Add Interest Form */}
        {isAddingInterest && (
          <form onSubmit={handleAddInterest} style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={newInterestInput}
              onChange={(e) => setNewInterestInput(e.target.value)}
              placeholder="e.g. Cognitive Swarms, Neural Graph RAG..."
              style={{
                flex: 1,
                padding: "9px 14px",
                borderRadius: "8px",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-strong)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                outline: "none",
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                background: "#DB2777",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingInterest(false)}
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                background: "transparent",
                color: "var(--text-tertiary)",
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Interests Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {interests.length > 0 ? (
            interests.map((interest, idx) => (
              <span
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border)",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--mono)",
                }}
              >
                <span>{interest}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(idx)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Remove"
                >
                  <X style={{ width: "13px", height: "13px" }} />
                </button>
              </span>
            ))
          ) : (
            <p style={{ fontSize: "13.5px", color: "var(--text-ghost)", margin: "4px 0", fontStyle: "italic" }}>
              No interests added yet. Click &quot;Add Interest&quot; to calibrate exploration topics.
            </p>
          )}
        </div>
      </div>

      {/* 6. Goals Card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--divider)",
            paddingBottom: "14px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Compass style={{ width: "17px", height: "17px", color: "#34D399" }} />
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Strategic Goals & Milestones
              </h2>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>
                ({goals.length})
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: 0 }}>
              Active milestones and target outcomes tracked across your workspace.
            </p>
          </div>

          {!isAddingGoal && (
            <button
              type="button"
              onClick={() => setIsAddingGoal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Plus style={{ width: "14px", height: "14px" }} />
              <span>Add Goal</span>
            </button>
          )}
        </div>

        {/* Add Goal Form */}
        {isAddingGoal && (
          <form onSubmit={handleAddGoal} style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={newGoalInput}
              onChange={(e) => setNewGoalInput(e.target.value)}
              placeholder="Describe your milestone..."
              style={{
                flex: 1,
                padding: "9px 14px",
                borderRadius: "8px",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-strong)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                outline: "none",
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                background: "#059669",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingGoal(false)}
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                background: "transparent",
                color: "var(--text-tertiary)",
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Goals list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {goals.length > 0 ? (
            goals.map((goal, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border)",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.06)",
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      fontWeight: 700,
                      color: "var(--text-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {goal}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveGoal(idx)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "4px",
                  }}
                  title="Remove goal"
                >
                  <X style={{ width: "14px", height: "14px" }} />
                </button>
              </div>
            ))
          ) : (
            <p style={{ fontSize: "13.5px", color: "var(--text-ghost)", margin: "4px 0", fontStyle: "italic" }}>
              No goals configured yet. Click &quot;Add Goal&quot; to establish target milestones.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
