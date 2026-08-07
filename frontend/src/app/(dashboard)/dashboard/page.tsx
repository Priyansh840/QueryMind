"use client";

import { Eye, Cloud, Circle, Lightbulb } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="p-10 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-3">
          Your World
        </h1>
        <p className="text-gray-600 max-w-2xl text-[15px]">
          A living map of your knowledge, connected by semantic relationships and
          continuous observation.
        </p>
      </header>

      {/* Graph Visualization Area */}
      <div className="w-full h-[400px] rounded-lg border border-gray-200 mb-12 grid-pattern relative overflow-hidden flex items-center justify-center">
        {/* Connection Lines (Approximated with CSS) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Top Line */}
          <div className="absolute top-[25%] left-[45%] w-[1px] h-[100px] border-l-2 border-dashed border-gray-300 transform -rotate-45" />
          {/* Top Left Line */}
          <div className="absolute top-[35%] left-[35%] w-[1px] h-[100px] border-l-2 border-dashed border-gray-300 transform -rotate-90" />
          {/* Bottom Left Line */}
          <div className="absolute bottom-[35%] left-[40%] w-[1px] h-[80px] border-l-2 border-dashed border-gray-300 transform rotate-45" />
          {/* Right Line */}
          <div className="absolute top-[40%] right-[30%] w-[1px] h-[120px] border-l-2 border-dashed border-gray-300 transform rotate-[60deg]" />
          {/* Bottom Right Line */}
          <div className="absolute bottom-[40%] right-[35%] w-[1px] h-[80px] border-l-2 border-dashed border-gray-300 transform -rotate-45" />
        </div>

        {/* Nodes */}
        <div className="relative w-full h-full max-w-3xl mx-auto">
          {/* Center Node */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-gray-900 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <Lightbulb className="w-4 h-4 text-gray-300" />
              <span className="font-medium text-sm">Core Intelligence</span>
            </div>
          </div>

          {/* Peripheral Nodes */}
          <div className="absolute top-[20%] left-[40%] transform -translate-x-1/2 hover:scale-105 transition-transform cursor-pointer">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-md shadow-sm flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Generative AI Models</span>
            </div>
          </div>

          <div className="absolute top-[35%] left-[25%] transform -translate-x-1/2 hover:scale-105 transition-transform cursor-pointer">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-md shadow-sm flex items-center gap-2">
              <Circle className="w-2 h-2 text-gray-300 fill-gray-300" />
              <span className="text-sm font-medium text-gray-700">Career</span>
            </div>
          </div>

          <div className="absolute bottom-[30%] left-[35%] transform -translate-x-1/2 hover:scale-105 transition-transform cursor-pointer">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-md shadow-sm flex items-center gap-2">
              <Circle className="w-2 h-2 text-gray-800 fill-gray-800" />
              <span className="text-sm font-medium text-gray-700">Skills</span>
            </div>
          </div>

          <div className="absolute top-[35%] right-[20%] transform translate-x-1/2 hover:scale-105 transition-transform cursor-pointer">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-md shadow-sm flex items-center gap-2">
              <Circle className="w-2 h-2 text-gray-400 fill-gray-400" />
              <span className="text-sm font-medium text-gray-700">Projects</span>
            </div>
          </div>

          <div className="absolute bottom-[40%] right-[25%] transform translate-x-1/2 hover:scale-105 transition-transform cursor-pointer">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-md shadow-sm flex items-center gap-2">
              <Circle className="w-2 h-2 text-gray-300 fill-gray-300" />
              <span className="text-sm font-medium text-gray-700">Research</span>
            </div>
          </div>
        </div>
      </div>

      {/* QueryMind Noticed Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Eye className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900 tracking-tight">
            QUERYMIND NOTICED
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-wider text-gray-600 uppercase border border-gray-300 rounded">
                New Connection
              </span>
            </div>
            <p className="text-gray-700 text-[15px] leading-relaxed flex-1 mb-8">
              This research paper is related to 3 concepts in your Projects Space.
            </p>
            <div className="flex items-center gap-3">
              <button className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">
                Explore
              </button>
              <button className="px-5 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                Save
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-wider text-gray-600 uppercase border border-gray-300 rounded">
                Career Evolved
              </span>
            </div>
            <p className="text-gray-700 text-[15px] leading-relaxed flex-1 mb-8">
              Your recent projects show experience with technologies that were not previously part of your Career Space.
            </p>
            <div className="flex items-center gap-3">
              <button className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">
                Review
              </button>
              <button className="px-5 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                Update
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-wider text-gray-600 uppercase border border-gray-300 rounded">
                Memory
              </span>
            </div>
            <p className="text-gray-700 text-[15px] leading-relaxed flex-1 mb-8">
              You have repeatedly referenced multi-agent orchestration across several projects.
            </p>
            <div className="flex items-center gap-3">
              <button className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">
                Explore
              </button>
              <button className="px-5 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                Synthesize
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
