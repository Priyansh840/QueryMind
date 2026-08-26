"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api/client";
import { UserProfile, Space, SpaceCreateInput, SpaceUpdateInput } from "@/types/api";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  spaces: Space[];
  currentSpace: Space | null;
  setCurrentSpace: (space: Space) => void;
  createSpace: (input: SpaceCreateInput) => Promise<Space>;
  updateSpace: (spaceId: string, input: SpaceUpdateInput) => Promise<Space>;
  deleteSpace: (spaceId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSpaces: () => Promise<Space[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user with backend and retrieve authoritative profile and spaces
  const syncAndHydrate = useCallback(async (session: Session) => {
    try {
      setError(null);
      // 1. Sync Supabase user into PostgreSQL
      await apiClient<UserProfile>("/api/v1/auth/sync", {
        method: "POST",
        body: JSON.stringify({
          email: session.user.email,
          display_name: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name,
          avatar_url: session.user.user_metadata?.avatar_url,
        }),
      });

      // 2. Fetch authoritative user profile
      const userProfile = await apiClient<UserProfile>("/api/v1/auth/me");
      setProfile(userProfile);

      // 3. Fetch real user spaces
      const userSpaces = await apiClient<Space[]>("/api/v1/spaces");
      setSpaces(userSpaces);

      if (userSpaces.length > 0) {
        // Read persisted space ID from localStorage if available
        const savedSpaceId = typeof window !== "undefined" ? localStorage.getItem("mynd_active_space_id") : null;
        const matched = savedSpaceId ? userSpaces.find((s) => s.id === savedSpaceId) : null;
        const defaultSpace = matched || userSpaces.find((s) => s.is_default) || userSpaces[0];

        setCurrentSpace(defaultSpace);
        if (typeof window !== "undefined" && defaultSpace) {
          localStorage.setItem("mynd_active_space_id", defaultSpace.id);
        }
      }
    } catch (err: any) {
      console.error("Failed to sync and hydrate user session:", err);
      setError(err?.message || "Failed to initialize workspace session.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        syncAndHydrate(session);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        syncAndHydrate(session);
      } else {
        setUser(null);
        setProfile(null);
        setSpaces([]);
        setCurrentSpace(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, syncAndHydrate]);

  const handleSetCurrentSpace = (space: Space) => {
    setCurrentSpace(space);
    if (typeof window !== "undefined") {
      localStorage.setItem("mynd_active_space_id", space.id);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSpaces([]);
    setCurrentSpace(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("mynd_active_space_id");
    }
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    try {
      const userProfile = await apiClient<UserProfile>("/api/v1/auth/me");
      setProfile(userProfile);
    } catch (err: any) {
      console.error("Error refreshing profile:", err);
    }
  };

  const refreshSpaces = async (): Promise<Space[]> => {
    try {
      const userSpaces = await apiClient<Space[]>("/api/v1/spaces");
      setSpaces(userSpaces);
      return userSpaces;
    } catch (err: any) {
      console.error("Error refreshing spaces:", err);
      return [];
    }
  };

  const createSpace = async (input: SpaceCreateInput): Promise<Space> => {
    const newSpace = await apiClient<Space>("/api/v1/spaces", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const updated = await refreshSpaces();
    const resolved = updated.find((s) => s.id === newSpace.id) || newSpace;
    handleSetCurrentSpace(resolved);
    return resolved;
  };

  const updateSpace = async (spaceId: string, input: SpaceUpdateInput): Promise<Space> => {
    const updatedSpace = await apiClient<Space>(`/api/v1/spaces/${spaceId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    await refreshSpaces();
    if (currentSpace?.id === spaceId) {
      handleSetCurrentSpace(updatedSpace);
    }
    return updatedSpace;
  };

  const deleteSpace = async (spaceId: string): Promise<void> => {
    await apiClient(`/api/v1/spaces/${spaceId}`, {
      method: "DELETE",
    });
    const updated = await refreshSpaces();
    if (currentSpace?.id === spaceId) {
      const nextSpace = updated.find((s) => s.is_default) || updated[0] || null;
      if (nextSpace) {
        handleSetCurrentSpace(nextSpace);
      } else {
        setCurrentSpace(null);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        spaces,
        currentSpace,
        setCurrentSpace: handleSetCurrentSpace,
        createSpace,
        updateSpace,
        deleteSpace,
        isLoading,
        error,
        signOut,
        refreshProfile,
        refreshSpaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
