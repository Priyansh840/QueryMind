"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext: string;
  subtextColor?: "cyan" | "urgent" | "positive" | "muted";
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  subtextColor = "muted",
  className,
}) => {
  const colorMap = {
    cyan: "text-[#38bdf8]",
    positive: "text-[#818cf8]",
    urgent: "text-[#f87171]",
    muted: "text-slate-400",
  };

  return (
    <div
      className={cn(
        "romer-card p-4 flex flex-col justify-between space-y-2 select-none",
        className
      )}
    >
      <div className="text-xs font-medium text-slate-400 tracking-normal">
        {label}
      </div>
      <div className="text-2xl font-bold tracking-tight text-white">
        {value}
      </div>
      <div className={cn("text-[11px] font-medium tracking-tight", colorMap[subtextColor])}>
        {subtext}
      </div>
    </div>
  );
};
