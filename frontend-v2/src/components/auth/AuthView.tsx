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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

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
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

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
