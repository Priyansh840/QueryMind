"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        // Automatically sync the user to our backend
        await api.post("/auth/sync", {
          email: data.user!.email,
          full_name: name,
        });
        
        router.push("/dashboard");
      } else if (data.user) {
        // Supabase requires email confirmation by default!
        setError("Account created! Please check your email to verify your account before logging in.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">QueryMind</span>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white text-center mb-1">
            Create your account
          </h2>
          <p className="text-sm text-slate-400 text-center mb-8">
            Start building your second brain
          </p>

          <form className="space-y-4" onSubmit={handleRegister}>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 uppercase tracking-wider">
                Full Name
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus-within:border-indigo-500/50 transition-all">
                <User className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Priyansh"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 uppercase tracking-wider">
                Email
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus-within:border-indigo-500/50 transition-all">
                <Mail className="w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus-within:border-indigo-500/50 transition-all">
                <Lock className="w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 mt-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 transition-all"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
