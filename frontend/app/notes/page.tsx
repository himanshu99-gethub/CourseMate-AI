"use client";

import React, { useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/ui/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CloudUpload,
  Printer,
  Sparkles,
  ArrowRight,
  Brain,
  MessageSquare,
  Compass,
  Send,
  HelpCircle,
  FileText,
} from "lucide-react";
import { marked } from "marked";

interface RagMessage {
  id: string;
  text: string;
  isUser: boolean;
}

export default function NotesPage() {
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState("Intermediate");
  const [mode, setMode] = useState("Deep Dive");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [notesTopic, setNotesTopic] = useState("");

  // RAG Section
  const [ragMessages, setRagMessages] = useState<RagMessage[]>([
    {
      id: "initial",
      text: "I've parsed the document. You can now ask specific questions based on this content.",
      isUser: false,
    },
  ]);
  const [ragInput, setRagInput] = useState("");
  const [isRagLoading, setIsRagLoading] = useState(false);

  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!topic && !file) {
      alert("Please provide a topic or upload a file.");
      return;
    }

    setIsLoading(true);
    setGeneratedNotes("");

    try {
      const formData = new FormData();
      if (topic) formData.append("topic", topic);
      if (file) formData.append("file", file);
      formData.append("level", level);
      formData.append("mode", mode);

      const res = await fetch("/api/generate-notes", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setGeneratedNotes(data.notes);
      setNotesTopic(topic || (file ? file.name.replace(/\.[^/.]+$/, "") : "academic study"));
    } catch (err) {
      alert("Synthesis link failure. Please re-initiate.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRagSend = async () => {
    if (!ragInput.trim() || isRagLoading) return;

    const userMessage = ragInput.trim();
    setRagInput("");
    setRagMessages((prev) => [...prev, { id: Date.now().toString(), text: userMessage, isUser: true }]);
    setIsRagLoading(true);

    try {
      const res = await fetch("/api/rag-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage }),
      });
      const data = await res.json();
      setRagMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: data.response, isUser: false },
      ]);
    } catch (err) {
      setRagMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: "Quantum link severed. Retrying...", isUser: false },
      ]);
    } finally {
      setIsRagLoading(false);
    }
  };

  return (
    <SidebarLayout>
      {/* Header */}
      <div className="mb-10">
        <h1 className="bg-gradient-to-r from-white via-slate-300 to-[#FFEF4D] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          Study Notes Generator
        </h1>
        <p className="mt-3 text-lg text-neutral-300">
          Enter a topic below to generate a comprehensive, structured study guide instantly.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="space-y-6">
          {/* Main Form Fields */}
          <div>
            <label htmlFor="topic" className="block text-lg font-bold text-[#FFEF4D] mb-3">
              What's the subject or document?
            </label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quantum Physics, History of Art"
              className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#FFEF4D] focus:ring-1 focus:ring-[#FFEF4D]"
            />
            <p className="text-xs text-neutral-400 mt-1">Enter a topic for AI-driven research...</p>
          </div>

          {/* Academic Level & Generation Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Academic Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-white focus:outline-none focus:border-[#FFEF4D]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced / Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Generation Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-white focus:outline-none focus:border-[#FFEF4D]"
              >
                <option value="Standard">Standard</option>
                <option value="Deep Dive">Deep Dive</option>
                <option value="Quick Revision">Quick Revision</option>
              </select>
            </div>
          </div>

          {/* Separator */}
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-neutral-400 text-xs font-extrabold uppercase tracking-widest">
              OR UPLOAD SOURCE
            </span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-8 bg-[#020617]/30 transition-all cursor-pointer text-center",
              dragOver ? "border-[#FFEF4D] bg-[#FFEF4D]/5 scale-[1.02]" : "hover:border-[#FFEF4D]/50 hover:bg-[#0f172a]/50"
            )}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <CloudUpload className="h-10 w-10 text-[#FFEF4D] mx-auto mb-3 animate-pulse" />
              <span className="block text-sm font-semibold text-neutral-300">
                Click to upload PDF/TXT or drag &amp; drop
              </span>
              {file && (
                <span className="block text-xs text-[#FFEF4D] font-bold mt-2">
                  Selected: {file.name}
                </span>
              )}
            </label>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full h-14 bg-[#FFEF4D] text-[#020617] hover:bg-[#fff37a] font-extrabold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-[#FFEF4D]/10"
          >
            {isLoading ? "Analyzing source data... Synthesizing academic manuscript." : "Process & Generate Notes"}
          </Button>
        </div>

        {/* Loader */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-[#FFEF4D] gap-3">
            <span className="h-10 w-10 border-4 border-[#FFEF4D]/20 border-t-[#FFEF4D] rounded-full animate-spin" />
            <p className="text-sm font-bold text-neutral-400">
              Generating manuscript... Please wait.
            </p>
          </div>
        )}

        {/* Generated Notes Output */}
        {generatedNotes && (
          <div className="mt-12 border-t border-white/5 pt-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight text-white">{notesTopic} Notes</h2>
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="flex items-center gap-2 border-white/10 hover:bg-neutral-800 text-white rounded-xl text-xs h-9 px-3"
              >
                <Printer className="h-4 w-4 text-[#FFEF4D]" />
                Export to PDF
              </Button>
            </div>

            {/* Structured Manuscript Layout */}
            <div className="bg-white text-[#0f172a] p-10 rounded-2xl shadow-inner prose prose-slate max-w-none mb-10">
              <div dangerouslySetInnerHTML={{ __html: marked.parse(generatedNotes) }} />
            </div>

            {/* Premium Flow integrations */}
            <div className="mb-10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">
                Accelerate Your Learning
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href={`/quiz?topic=${encodeURIComponent(notesTopic)}`}
                  className="group block bg-[#1e293b] border border-white/5 hover:border-[#FFEF4D]/50 p-6 rounded-2xl transition-all hover:-translate-y-1 shadow-lg"
                >
                  <Brain className="h-6 w-6 text-[#FFEF4D] mb-3 group-hover:scale-110 transition-transform" />
                  <span className="block font-bold text-white mb-1">Practice Quiz</span>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Test your retention of these notes with an AI quiz.
                  </p>
                </Link>

                <Link
                  href={`/chat?mode=notes`}
                  className="group block bg-[#1e293b] border border-white/5 hover:border-[#FFEF4D]/50 p-6 rounded-2xl transition-all hover:-translate-y-1 shadow-lg"
                >
                  <MessageSquare className="h-6 w-6 text-[#FFEF4D] mb-3 group-hover:scale-110 transition-transform" />
                  <span className="block font-bold text-white mb-1">Discuss with AI Tutor</span>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Open this context in the main tutor room for full dialogue.
                  </p>
                </Link>

                <Link
                  href={`/recommendations?interest=${encodeURIComponent(notesTopic)}&goal=${encodeURIComponent(
                    "Master " + notesTopic
                  )}`}
                  className="group block bg-[#1e293b] border border-white/5 hover:border-[#FFEF4D]/50 p-6 rounded-2xl transition-all hover:-translate-y-1 shadow-lg"
                >
                  <Compass className="h-6 w-6 text-[#FFEF4D] mb-3 group-hover:scale-110 transition-transform" />
                  <span className="block font-bold text-white mb-1">Pathfinder Roadmap</span>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Create a career pathway and find courses based on this topic.
                  </p>
                </Link>
              </div>
            </div>

            {/* Document Context Q&A */}
            <div className="bg-[#020617]/50 rounded-2xl border border-white/5 overflow-hidden">
              <div className="bg-[#1e293b]/50 p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-[#FFEF4D]">
                  NOTES Q&amp;A
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {ragMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] rounded-xl p-3 text-xs leading-relaxed border shadow-md animate-in fade-in zoom-in-95 duration-100",
                      msg.isUser
                        ? "bg-[#FFEF4D] text-[#020617] border-transparent font-semibold ml-auto rounded-br-none"
                        : "bg-[#1e293b] text-neutral-100 border-white/5 rounded-bl-none border-l-2 border-l-[#FFEF4D]"
                    )}
                  >
                    {msg.text}
                  </div>
                ))}
                {isRagLoading && (
                  <div className="self-start flex gap-1 items-center bg-[#1e293b] border border-white/5 border-l-2 border-l-[#FFEF4D] rounded-xl rounded-bl-none px-3 py-2 max-w-[80px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FFEF4D] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FFEF4D] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FFEF4D] animate-bounce" />
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-white/5 bg-[#0f172a]/50 flex gap-2">
                <input
                  type="text"
                  value={ragInput}
                  onChange={(e) => setRagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRagSend()}
                  placeholder="Ask anything about these notes..."
                  className="flex-grow bg-[#020617] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFEF4D]"
                />
                <Button
                  onClick={handleRagSend}
                  disabled={!ragInput.trim() || isRagLoading}
                  className="bg-[#FFEF4D] hover:bg-[#fff37a] text-[#020617] p-2 h-8 w-8 rounded-lg flex items-center justify-center"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
