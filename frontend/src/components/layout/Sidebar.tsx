"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Briefcase, 
  FlaskConical, 
  FolderGit2, 
  GraduationCap, 
  Plus, 
  BrainCircuit, 
  History, 
  Settings 
} from "lucide-react";

const mainNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Career", href: "/career", icon: Briefcase },
  { name: "Research", href: "/research", icon: FlaskConical },
  { name: "Projects", href: "/projects", icon: FolderGit2 },
  { name: "Learning", href: "/learning", icon: GraduationCap },
];

const secondaryNav = [
  { name: "New Space", href: "/new", icon: Plus },
  { name: "Memory", href: "/memory", icon: BrainCircuit },
  { name: "Activity", href: "/timeline", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen border-r border-gray-200 bg-[#F3F4F6] flex flex-col pt-6 pb-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 mb-8">
        <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
          Q
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">
            QueryMind
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
            Personal Intelligence
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-3 flex-1">
        <nav className="space-y-1">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-gray-200 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
                }`}
              >
                <item.icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="my-6 border-t border-gray-200 mx-3"></div>

        {/* Secondary Navigation */}
        <nav className="space-y-1">
          {secondaryNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 transition-colors"
            >
              <item.icon className="w-4 h-4" strokeWidth={2} />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="px-3 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200/50 transition-colors cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-300">
             {/* Replace with actual image later */}
             <div className="w-full h-full bg-gray-400 text-white flex items-center justify-center text-xs">PS</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">User profile</p>
            <p className="text-xs text-gray-500 truncate">Active</p>
          </div>
          <Settings className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </div>
      </div>
    </aside>
  );
}
