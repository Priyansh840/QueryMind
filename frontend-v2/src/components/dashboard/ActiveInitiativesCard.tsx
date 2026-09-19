"use client";

import React from "react";
import Link from "next/link";
import { ProjectItem, GoalItem } from "@/types/api";
import { ArrowRight, FolderGit2 } from "lucide-react";

interface ActiveInitiativesCardProps {
  spaceId: string;
  projects: ProjectItem[];
  goals: GoalItem[];
  className?: string;
}

export const ActiveInitiativesCard: React.FC<ActiveInitiativesCardProps> = ({
  spaceId,
  projects,
  goals,
  className,
}) => {
  const displayProjects = projects.slice(0, 4);

  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#0c0d12] p-5 space-y-3 select-none ${
        className || ""
      }`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
        <div className="text-xs font-semibold text-white">
          Active Projects
        </div>
        <Link
          href={`/spaces/${spaceId}/work`}
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <span>View all</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-1.5">
        {displayProjects.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No active projects yet.
          </div>
        ) : (
          displayProjects.map((proj) => {
            const projGoals = goals.filter((g) => g.project_id === proj.id);

            return (
              <Link
                key={proj.id}
                href={`/spaces/${spaceId}/work/projects/${proj.id}`}
                className="p-2.5 rounded-xl hover:bg-white/[0.03] flex items-center justify-between transition-colors text-decoration-none group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    {proj.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 shrink-0">
                  {projGoals.length} {projGoals.length === 1 ? "milestone" : "milestones"}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};
