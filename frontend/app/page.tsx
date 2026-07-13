"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/ui/sidebar-layout";
import { Button } from "@/components/ui/button";
import {
  History as HistoryIcon,
  CheckCheck,
  FileSpreadsheet,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Sparkles,
  Compass,
  FileText,
  Bolt,
  HelpCircle,
} from "lucide-react";

interface HistoryItem {
  id: number;
  type: string;
  topic: string | null;
  content: string;
  timestamp: string;
}

export default function Dashboard() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    quizzesTaken: 0,
    notesGenerated: 0,
  });

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        const data = await res.json();
        if (data.history) {
          setHistory(data.history);

          // Calculate stats
          const quizzes = data.history.filter((item: HistoryItem) => item.type === "quiz").length;
          const notes = data.history.filter((item: HistoryItem) => item.type === "notes").length;
          setStats({
            totalSessions: data.history.length,
            quizzesTaken: quizzes,
            notesGenerated: notes,
          });
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    }
    fetchHistory();
  }, []);

  const modules = [
    {
      href: "/notes",
      title: "Study Notes",
      description: "Transform any topic into comprehensive, structured study materials instantly.",
      icon: FileText,
      badge: "START GENERATING",
    },
    {
      href: "/chat",
      title: "AI Assistant",
      description: "Chat with your personal AI tutor to clarify doubts and explore complex topics.",
      icon: MessageSquare,
      badge: "START CHATTING",
    },
    {
      href: "/quiz",
      title: "Quiz Lab",
      description: "Test your knowledge with AI-driven adaptive quizzes on any subject.",
      icon: Bolt,
      badge: "TAKE A QUIZ",
    },
    {
      href: "/recommendations",
      title: "Pathfinder",
      description: "Discover customized learning paths and course suggestions based on your goals.",
      icon: Compass,
      badge: "DISCOVER PATHS",
    },
  ];

  return (
    <SidebarLayout>
      {/* Hero Header */}
      <div className="mb-10">
        <h1 className="bg-gradient-to-r from-white via-slate-300 to-[#FFEF4D] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          Academic Command Center
        </h1>
        <p className="mt-3 text-lg text-neutral-300 max-w-3xl">
          Your intelligent learning workspace is ready. Select a module below to begin your session.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-12">
        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f172a] p-6 transition-all hover:border-[#FFEF4D]/30 hover:-translate-y-1 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFEF4D]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e293b] text-[#FFEF4D] group-hover:scale-110 transition-transform">
              <HistoryIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{stats.totalSessions}</span>
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold">Total Sessions</span>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f172a] p-6 transition-all hover:border-[#FFEF4D]/30 hover:-translate-y-1 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFEF4D]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e293b] text-[#FFEF4D] group-hover:scale-110 transition-transform">
              <CheckCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{stats.quizzesTaken}</span>
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold">Quizzes Taken</span>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f172a] p-6 transition-all hover:border-[#FFEF4D]/30 hover:-translate-y-1 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFEF4D]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e293b] text-[#FFEF4D] group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{stats.notesGenerated}</span>
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold">Notes Generated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#FFEF4D]" />
          Learning Modules
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFEF4D]/20 bg-[#FFEF4D]/5 px-3 py-1 text-xs font-semibold text-[#FFEF4D]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          SYSTEM READY
        </span>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-14">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a] p-8 transition-all hover:border-[#FFEF4D] hover:-translate-y-1 hover:shadow-2xl shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFEF4D]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <mod.icon className="h-12 w-12 text-[#FFEF4D] mb-6 drop-shadow-[0_0_8px_rgba(255,239,77,0.35)] group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">{mod.title}</h3>
              <p className="text-neutral-300 text-sm leading-relaxed mb-8">{mod.description}</p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#020617] bg-[#FFEF4D] px-4 py-2.5 rounded-xl self-start group-hover:bg-[#fff37a] shadow-lg transition-colors">
              {mod.badge} <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* History / Activity Log */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#FFEF4D]" />
            Academic Footprint
          </h2>
          <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
            Last 5 Sessions
          </span>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0f172a]/50 p-6 backdrop-blur-sm shadow-xl">
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0 transition-all hover:pl-2"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0f172a] text-[#FFEF4D]">
                      {item.type === "chat" ? (
                        <MessageSquare className="h-5 w-5" />
                      ) : item.type === "notes" ? (
                        <FileText className="h-5 w-5" />
                      ) : item.type === "quiz" ? (
                        <Bolt className="h-5 w-5" />
                      ) : (
                        <Compass className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-md bg-[#FFEF4D]/10 px-2 py-0.5 text-xs font-medium text-[#FFEF4D] ring-1 ring-inset ring-[#FFEF4D]/20 uppercase tracking-wider mb-1">
                        {item.type}
                      </span>
                      <p className="text-sm font-semibold text-white">
                        {item.topic || "Neural Interaction Sequence"}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 font-medium">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Recent"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500">
              <HelpCircle className="h-10 w-10 mb-3 text-neutral-600" />
              <p className="text-sm font-semibold">No activity log detected in current cycle.</p>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
