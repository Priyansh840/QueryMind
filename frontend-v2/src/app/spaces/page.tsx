"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { Folder, ArrowRight } from "lucide-react";

export default function SpacesDirectoryPage() {
  const { spaces, currentSpace, setCurrentSpace } = useAuth();

  return (
    <div className="min-h-screen w-screen bg-[#09090b] text-[#f8fafc] flex flex-col items-center justify-center p-6 select-none">
      <div className="max-w-2xl w-full space-y-6">
        <div className="space-y-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#818cf8]">
            Workspace Directory
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Select Your Command Space
          </h1>
          <p className="text-xs text-slate-400">
            Each space maintains an isolated operating layer for signals, approvals, and outcomes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {spaces.map((space) => {
            const isCurrent = currentSpace?.id === space.id;
            return (
              <div
                key={space.id}
                className={`romer-card p-5 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all ${
                  isCurrent ? "border-[#818cf8]/50" : ""
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#181824] border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                      {space.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {space.name}
                      </h3>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {space.slug || "space"}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {space.description || "Command dashboard for decisions, signals, and goals."}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {isCurrent ? "Active Space" : "Available"}
                  </span>
                  <Link
                    href={`/spaces/${space.id}`}
                    onClick={() => setCurrentSpace(space)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#09090b] hover:bg-slate-200 transition-colors"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
