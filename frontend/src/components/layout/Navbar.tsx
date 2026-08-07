"use client";

import { Search, Bell, Command } from "lucide-react";

interface NavbarProps {
  title?: string;
}

export default function Navbar({ title }: NavbarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-gray-200 bg-white sticky top-0 z-30">
      {/* Left — page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-medium text-gray-900 tracking-tight">
          {title || "Dashboard"}
        </h1>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 uppercase font-medium">
          ONLINE
        </span>
      </div>

      {/* Right — search + notifications */}
      <div className="flex items-center gap-3">
        {/* Quick search */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 text-gray-500 text-xs hover:border-gray-300 hover:text-gray-900 transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
          <kbd className="ml-4 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white text-[10px] border border-gray-200">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Notification bell */}
        <button className="relative p-2 rounded-md hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gray-900 rounded-full border border-white" />
        </button>
      </div>
    </header>
  );
}
