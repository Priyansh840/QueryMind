"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Surface } from "@/components/ui/Surface";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, ArrowRight, ShieldCheck, Mail, Lock, User as UserIcon } from "lucide-react";

export interface AuthModalProps {
  initialMode?: "signin" | "signup";
}

export const AuthView: React.FC<AuthModalProps> = ({ initialMode = "signin" }) => {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/home`
        : undefined;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthError) throw oauthError;
    } catch (err: any) {
      console.error("Google authentication error:", err);
      setError(err?.message || "Failed to initialize Google authentication. Ensure Google provider is enabled in Supabase.");
      setIsGoogleLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (signUpError) throw signUpError;
        setMessage("Account created successfully. Initializing workspace session...");
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-[var(--bg-app)]">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)] text-xs font-semibold select-none">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MYND Intelligence Workspace</span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {mode === "signin" ? "Sign in to your Space" : "Create your MYND workspace"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {mode === "signin"
              ? "Access your unified context, intelligence graph, and action proposals."
              : "Start structuring your personal knowledge, projects, and autonomous workflows."}
          </p>
        </div>

        {/* Auth Form Surface */}
        <Surface variant="primary" className="p-6 shadow-[var(--shadow-md)]">
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Full Name</label>
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  leftIcon={<UserIcon className="w-4 h-4" />}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Email Address</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Password</label>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </div>

            {error && (
              <div className="p-3 text-xs rounded-[var(--radius-xs)] bg-[var(--error-surface)] text-[var(--error-text)] border border-[var(--error-border)]">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 text-xs rounded-[var(--radius-xs)] bg-[var(--success-surface)] text-[var(--success-text)] border border-[var(--success-border)]">
                {message}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === "signin" ? "Sign In with Email" : "Create Account with Email"}
            </Button>
          </form>

          {/* OAuth Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-[#0f1117] px-3 text-zinc-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.02] border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200 text-xs font-medium text-white select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            {isGoogleLoading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
                />
              </svg>
            )}
            <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
            {mode === "signin" ? (
              <span>
                Don&apos;t have a workspace account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="text-[var(--accent-text)] font-semibold hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </span>
            ) : (
              <span>
                Already have a workspace account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className="text-[var(--accent-text)] font-semibold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </Surface>

        {/* Security Assurance footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--success-text)]" />
          <span>PostgreSQL Row-Level Security Enforced</span>
        </div>
      </div>
    </div>
  );
};
