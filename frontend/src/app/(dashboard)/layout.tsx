"use client";

import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* Main content area — offset by sidebar width */}
      <main className="flex-1 ml-[260px] transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
