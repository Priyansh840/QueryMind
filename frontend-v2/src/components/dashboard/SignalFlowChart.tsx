"use client";

import React, { useState } from "react";

interface SignalFlowChartProps {
  className?: string;
}

export const SignalFlowChart: React.FC<SignalFlowChartProps> = ({ className }) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // SVG dimensions
  const width = 800;
  const height = 180;

  // Smooth spline coordinates representing activity cadence
  // Mon to Sun data points
  const points = [
    { day: "Mon", x: 40, y: 130, value: "12 signals", status: "Baseline ingestion" },
    { day: "Tue", x: 160, y: 110, value: "19 signals", status: "Evidence verified" },
    { day: "Wed", x: 280, y: 125, value: "15 signals", status: "Model reasoning" },
    { day: "Thu", x: 400, y: 135, value: "14 signals", status: "Proposals formulated" },
    { day: "Fri", x: 520, y: 120, value: "22 signals", status: "Decisions authorized" },
    { day: "Sat", x: 640, y: 105, value: "28 signals", status: "Execution peak" },
    { day: "Sun", x: 760, y: 75, value: "34 signals", status: "Pipeline synchronized" },
  ];

  // SVG cubic Bézier smooth path
  const pathD = `M 40 130 C 100 115, 120 105, 160 110 C 220 118, 240 128, 280 125 C 340 120, 360 140, 400 135 C 460 130, 480 115, 520 120 C 580 125, 600 100, 640 105 C 700 110, 720 70, 760 75`;
  const areaD = `${pathD} L 760 170 L 40 170 Z`;

  return (
    <div className={`romer-card p-5 space-y-3 select-none ${className || ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-white tracking-normal">
          Signal Flow
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-[#818cf8] rounded-full" />
            <span>Telemetry Cadence</span>
          </div>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Past 7 Days</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[160px] overflow-hidden rounded-lg bg-[#0c0c10] border border-white/[0.04]">
        {/* Subtle Horizontal Grid Rails */}
        <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none opacity-20">
          <div className="w-full border-b border-white/[0.08]" />
          <div className="w-full border-b border-white/[0.08]" />
          <div className="w-full border-b border-white/[0.08]" />
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full preserve-3d"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#a5b4fc" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill="url(#signalGradient)" />

          {/* Line Spline */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#strokeGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Interactive Data Points */}
          {points.map((p, idx) => (
            <g key={p.day}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredPoint === idx ? 5 : 3.5}
                className={`transition-all duration-150 cursor-pointer ${
                  hoveredPoint === idx
                    ? "fill-white stroke-[#818cf8] stroke-[3]"
                    : "fill-[#0c0c10] stroke-[#818cf8] stroke-[2]"
                }`}
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint !== null && (
          <div
            className="absolute z-20 px-2.5 py-1.5 rounded-lg bg-[#181822] border border-white/10 shadow-xl pointer-events-none text-xs text-white transform -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${(points[hoveredPoint].x / width) * 100}%`,
              top: `${(points[hoveredPoint].y / height) * 100 - 10}%`,
            }}
          >
            <div className="font-semibold text-white text-[11px]">
              {points[hoveredPoint].day}: {points[hoveredPoint].value}
            </div>
            <div className="text-[10px] text-slate-400">
              {points[hoveredPoint].status}
            </div>
          </div>
        )}

        {/* Day Labels along bottom */}
        <div className="absolute bottom-1.5 inset-x-0 px-6 flex justify-between text-[10px] text-slate-500 font-medium pointer-events-none">
          {points.map((p) => (
            <span key={p.day}>{p.day}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
