"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import api, { setAuthToken, setStoredUser } from "@/lib/api";
import { useMyndStore } from "@/lib/mynd-store";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusText, setStatusText] = useState("Completing authentication...");

  useEffect(() => {
    let isMounted = true;

    async function handleAuth() {
      try {
        const nextTarget = searchParams.get("next") || "/dashboard";
        const finalUrl = nextTarget.startsWith("/") ? nextTarget : `/${nextTarget}`;

        // 1. Check for errors in query params
        const errorMsg = searchParams.get("error_description") || searchParams.get("error");
        if (errorMsg) {
          console.error("Auth callback error:", errorMsg);
          if (isMounted) {
            router.replace(`/login?error=${encodeURIComponent(errorMsg)}`);
          }
          return;
        }

        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // 2. Check for hash parameters (Google/GitHub Implicit / PKCE fragment)
        if (typeof window !== "undefined" && window.location.hash) {
          const hashString = window.location.hash.substring(1);
          const hashParams = new URLSearchParams(hashString);
          accessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token");

          if (accessToken) {
            setAuthToken(accessToken);
            localStorage.setItem("mynd_token", accessToken);
            try {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });
            } catch (err) {
              console.warn("Could not set supabase session:", err);
            }
          }
        }

        // 3. Check for code exchange (PKCE)
        const code = searchParams.get("code");
        if (code && !accessToken) {
          setStatusText("Exchanging security token...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session) {
            accessToken = data.session.access_token;
            refreshToken = data.session.refresh_token;
            setAuthToken(accessToken);
            localStorage.setItem("mynd_token", accessToken);
          }
        }

        // 4. Verify active session with supabase client
        const { data: sessionData } = await supabase.auth.getSession();
        const activeSession = sessionData?.session;

        if (activeSession?.access_token) {
          accessToken = activeSession.access_token;
          setAuthToken(accessToken);
          localStorage.setItem("mynd_token", accessToken);

          if (activeSession.user) {
            const u = activeSession.user;
            const displayName =
              u.user_metadata?.full_name ||
              u.user_metadata?.name ||
              u.user_metadata?.display_name ||
              u.email?.split("@")[0] ||
              "User";

            setStoredUser({
              id: u.id,
              email: u.email || "",
              display_name: displayName,
            });

            // 5. Sync user profile and ensure default Space exists in Postgres
            setStatusText("Syncing neural workspace...");
            try {
              await api.post(
                "/auth/sync",
                {
                  email: u.email || "",
                  display_name: displayName,
                  avatar_url: u.user_metadata?.avatar_url || null,
                },
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
            } catch (syncErr) {
              console.warn("Backend /auth/sync warning:", syncErr);
            }
          }
        }

        // Mark onboarding completed so user immediately enters dashboard
        useMyndStore.getState().setHasCompletedOnboarding(true);

        // Fetch spaces and knowledge
        try {
          await useMyndStore.getState().syncWithBackend();
        } catch (syncErr) {
          console.warn("Sync store notice:", syncErr);
        }

        // Redirect to intended destination
        if (isMounted) {
          window.location.replace(finalUrl);
        }
      } catch (err: any) {
        console.error("Auth callback processing failed:", err);
        if (isMounted) {
          router.replace("/login");
        }
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#EDEDED",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <Loader2
        style={{ width: "28px", height: "28px", color: "#FFFFFF" }}
        className="animate-spin"
      />
      <p style={{ fontSize: "14px", color: "#94A3B8", margin: 0 }}>
        {statusText}
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2
            style={{ width: "28px", height: "28px", color: "#FFFFFF" }}
            className="animate-spin"
          />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
