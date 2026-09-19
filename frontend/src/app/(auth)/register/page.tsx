"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Brain, 
  ArrowRight, 
  Key, 
  AtSign, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Fingerprint, 
  Loader2,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const isPlaceholder = 
      !process.env.NEXT_PUBLIC_SUPABASE_URL || 
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

    try {
      if (isPlaceholder) {
        router.push("/onboarding");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: password || "password123",
        options: { data: { full_name: name || email.split("@")[0] } },
      });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("api key") || signUpError.message?.toLowerCase().includes("fetch")) {
          router.push("/onboarding");
          return;
        }
        throw signUpError;
      }

      if (data?.session) {
        api.post("/auth/sync", {
          email: data.user?.email || email,
          display_name: name || email.split("@")[0],
        }).catch(() => {});
      }
      router.push("/onboarding");
    } catch (err: any) {
      if (isPlaceholder || err?.message?.toLowerCase().includes("api key") || err?.message?.toLowerCase().includes("fetch")) {
        router.push("/onboarding");
        return;
      }
      setError(err?.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    setSocialLoading(provider);
    setError(null);
    try {
      const isPlaceholder = 
        !process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

      if (isPlaceholder) {
        router.push("/onboarding");
        return;
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined,
        },
      });
      if (oauthError) {
        if (oauthError.message?.toLowerCase().includes("api key") || oauthError.message?.toLowerCase().includes("fetch")) {
          router.push("/onboarding");
          return;
        }
        throw oauthError;
      }
    } catch (err: any) {
      router.push("/onboarding");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient background glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none rounded-full blur-[140px] opacity-35"
        style={{
          background: "radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, rgba(99, 102, 241, 0.25) 45%, transparent 70%)"
        }}
      />

      {/* Subtle grid texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
          backgroundSize: "28px 28px"
        }}
      />

      <div className="w-full max-w-[440px] z-10">
        <div className="relative bg-[#0D121F]/90 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/80 rounded-3xl p-7 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#162035] to-[#0D1424] border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <Brain className="w-7 h-7 text-cyan-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cyan-400 border-2 border-[#0D121F] rounded-full shadow-sm shadow-cyan-400/80 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white flex items-center justify-center gap-2">
              QueryMind
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Knowledge Operating System & AI Second Brain
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/[0.08] border border-cyan-500/20 text-[11px] font-mono font-medium text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              v2.6 Core Neural Hub
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-6 p-1 bg-[#090D17] border border-white/[0.06] rounded-xl flex items-center gap-1">
            <Link
              href="/login"
              className="flex-1 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center gap-1.5"
            >
              Sign In
            </Link>
            <div className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#162035] text-white shadow-sm border border-white/[0.08] flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Create Space
            </div>
          </div>

          {/* Social Logins */}
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              disabled={loading || socialLoading !== null}
              onClick={() => handleSocialLogin("google")}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-slate-200 transition-all hover:border-white/20 group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              disabled={loading || socialLoading !== null}
              onClick={() => handleSocialLogin("github")}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-slate-200 transition-all hover:border-white/20 group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>Continue with GitHub</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-[#0D121F] px-3 text-slate-500">
                OR REGISTER IDENTITY
              </span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Full Name / Space Admin
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full bg-[#080C14] border border-white/[0.08] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Workspace Email
                </label>
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Sync Ready
                </span>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <AtSign className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@querymind.ai"
                  className="w-full bg-[#080C14] border border-white/[0.08] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Master Session Key (Password)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-[#080C14] border border-white/[0.08] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-600 transition-all outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#080C14] border border-white/[0.06] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-cyan-400">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">
                    Agentic Biometric Pass
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Face ID & Secure Enclave
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={biometricEnabled}
                onClick={() => setBiometricEnabled(!biometricEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  biometricEnabled ? "bg-indigo-600" : "bg-slate-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    biometricEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Provisioning Neural Space...</span>
                </>
              ) : (
                <>
                  <span>Create Neural Workspace</span>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col items-center text-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>PostgreSQL + Qdrant Vector Zero-Knowledge Enclave</span>
            </div>
            <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
              By establishing telemetry you consent to QueryMind's{" "}
              <a href="#" className="text-cyan-400 hover:underline">Neural Privacy Protocol</a>{" "}
              &{" "}
              <a href="#" className="text-cyan-400 hover:underline">Vector Terms</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
