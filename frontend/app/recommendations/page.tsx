"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SidebarLayout from "@/components/ui/sidebar-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw } from "lucide-react";
import { marked } from "marked";

function RecommendationsContent() {
  const searchParams = useSearchParams();
  const [interests, setInterests] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [goal, setGoal] = useState("");
  const [time, setTime] = useState("Moderate (15-25 hrs/week)");

  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState("");
  const [roadmapGenerated, setRoadmapGenerated] = useState(false);

  useEffect(() => {
    const interestParam = searchParams.get("interest");
    const goalParam = searchParams.get("goal");
    if (interestParam) setInterests(interestParam);
    if (goalParam) setGoal(goalParam);
  }, [searchParams]);

  const handleGenerateRoadmap = async () => {
    if (!interests.trim() || !goal.trim()) {
      alert("Please specify your interests and goal.");
      return;
    }

    setIsLoading(true);
    setRoadmap("");

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, level, goal, time }),
      });
      const data = await res.json();
      if (data.roadmap) {
        setRoadmap(data.roadmap);
        setRoadmapGenerated(true);
      } else {
        throw new Error("Empty roadmap");
      }
    } catch (err) {
      alert("Trajectory simulation failure. The AI engine is currently optimizing. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = () => {
    setRoadmapGenerated(false);
    setRoadmap("");
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-8 shadow-2xl max-w-4xl mx-auto">
      {!roadmapGenerated ? (
        <div className="space-y-6">
          {/* Form grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Interests &amp; Passion
              </label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. AI, Space, Finance"
                className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#FFEF4D] focus:ring-1 focus:ring-[#FFEF4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Current Skill Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-white focus:outline-none focus:border-[#FFEF4D]"
              >
                <option value="Beginner">Beginner / Student</option>
                <option value="Intermediate">Intermediate / Junior Prof</option>
                <option value="Advanced">Advanced / Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Core Goal
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Become a Sr. Data Scientist"
                className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#FFEF4D] focus:ring-1 focus:ring-[#FFEF4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Time Availability
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-white focus:outline-none focus:border-[#FFEF4D]"
              >
                <option value="Part-time (5-10 hrs/week)">Part-time (5-10 hrs/week)</option>
                <option value="Moderate (15-25 hrs/week)">Moderate (15-25 hrs/week)</option>
                <option value="Full-immersion (40+ hrs/week)">Full-immersion (40+ hrs/week)</option>
              </select>
            </div>
          </div>

          {/* Synthesize Button */}
          <Button
            onClick={handleGenerateRoadmap}
            disabled={isLoading || !interests.trim() || !goal.trim()}
            className="w-full h-14 bg-[#FFEF4D] text-[#020617] hover:bg-[#fff37a] font-extrabold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-[#FFEF4D]/10"
          >
            {isLoading ? "Parsing trajectory data... Stand by." : "Synthesize Career Roadmap"}
          </Button>
        </div>
      ) : (
        <div>
          {/* Header Status */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold text-white">Optimized Pathways</h2>
              <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mt-1">
                Goal: {goal}
              </p>
            </div>
            <Button
              onClick={handleRefine}
              variant="outline"
              className="flex items-center gap-2 border-white/10 hover:bg-neutral-800 text-white rounded-xl text-xs h-9 px-3"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refine Parameters
            </Button>
          </div>

          {/* Structured Manuscript Layout */}
          <div className="bg-white text-[#0f172a] p-10 rounded-2xl shadow-inner prose prose-slate max-w-none max-h-[60vh] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: marked.parse(roadmap) }} />
          </div>
        </div>
      )}

      {/* Loader */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-[#FFEF4D] gap-3">
          <span className="h-10 w-10 border-4 border-[#FFEF4D]/20 border-t-[#FFEF4D] rounded-full animate-spin" />
          <p className="text-sm font-bold text-neutral-400">
            Generating advisor telemetry... Stand by.
          </p>
        </div>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <SidebarLayout>
      {/* Header */}
      <div className="mb-10">
        <h1 className="bg-gradient-to-r from-white via-slate-300 to-[#FFEF4D] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          Course Pathfinder
        </h1>
        <p className="mt-3 text-lg text-neutral-300">
          Discover courses and topics tailored to your interests and career goals.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-12 text-[#FFEF4D] gap-3">
          <span className="h-10 w-10 border-4 border-[#FFEF4D]/20 border-t-[#FFEF4D] rounded-full animate-spin" />
          <p className="text-sm font-bold text-neutral-400">Loading Pathfinder...</p>
        </div>
      }>
        <RecommendationsContent />
      </Suspense>
    </SidebarLayout>
  );
}
