"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BrainCircuit,
  Compass,
  Cpu,
  Menu,
  X,
  User,
} from "lucide-react";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "AI Assistant", icon: MessageSquare },
    { href: "/notes", label: "Study Notes", icon: FileText },
    { href: "/quiz", label: "Quiz Lab", icon: BrainCircuit },
    { href: "/recommendations", label: "Pathfinder", icon: Compass },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#020617] text-white">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#0f172a] px-6 py-8 transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1e293b] p-3 transition-colors hover:border-[#FFEF4D]/30"
          onClick={() => setSidebarOpen(false)}
        >
          <Cpu className="h-8 w-8 text-[#FFEF4D] drop-shadow-[0_0_8px_rgba(255,239,77,0.45)] animate-pulse" />
          <span className="font-sans text-xl font-bold tracking-tight text-white">
            CourseMate AI
          </span>
        </Link>

        {/* Navigation Menu */}
        <nav className="mt-12 flex-1 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-semibold tracking-wide transition-all",
                  isActive
                    ? "bg-[#FFEF4D] text-[#020617] shadow-[0_0_15px_rgba(255,239,77,0.3)]"
                    : "text-neutral-300 hover:bg-[#1e293b] hover:text-white"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform group-hover:scale-110",
                    isActive ? "text-[#020617]" : "text-[#FFEF4D]"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-neutral-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-wider uppercase">
              Quantum Engine Active
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-20 items-center justify-between border-b border-white/5 bg-[#020617]/80 px-6 backdrop-blur-md lg:px-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-[#FFEF4D] hover:bg-[#1e293b] lg:hidden"
              aria-label="Toggle Sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden items-center gap-2 text-xs font-bold tracking-wider text-[#FFEF4D] md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              NEURAL CORE ONLINE
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-neutral-200">
              Academic Admin
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFEF4D] text-xs font-black text-[#020617] hover:scale-105 transition-transform cursor-pointer shadow-[0_0_10px_rgba(255,239,77,0.2)]">
              AA
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
