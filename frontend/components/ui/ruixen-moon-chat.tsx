"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { marked } from "marked";
import {
  ImageIcon,
  FileUp,
  MonitorIcon,
  CircleUserRound,
  ArrowUpIcon,
  Paperclip,
  PlusIcon,
  Code2,
  Palette,
  Layers,
  Rocket,
  Compass,
  FileText,
  HelpCircle,
  Cpu,
  Brain,
  X,
  Sparkles,
  Printer,
  CheckCircle,
  XCircle,
  Trophy,
  Star,
  Check,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  History,
  MessageSquare,
  LogOut,
} from "lucide-react";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

interface Message {
  id: string;
  type: "text" | "notes" | "quiz" | "pathfinder";
  text: string;
  data?: any; // Payload for quiz or notes metadata
  isUser: boolean;
}

// Custom parser to map roadmap markdown to an interactive timeline component
function parseRoadmapSteps(markdownText: string) {
  const steps: { title: string; content: string[] }[] = [];
  const lines = markdownText.split("\n");
  let currentStep: { title: string; content: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(?:###\s+)?\d+\.\s+/.test(trimmed)) {
      if (currentStep) {
        steps.push(currentStep);
      }
      currentStep = {
        title: trimmed.replace(/^(?:###\s+)?\d+\.\s+/, ""),
        content: [],
      };
    } else if (currentStep && trimmed) {
      const cleanLine = trimmed.replace(/^-\s+/, "").replace(/^\*\s+/, "");
      currentStep.content.push(cleanLine);
    }
  }
  if (currentStep) {
    steps.push(currentStep);
  }
  return steps;
}

export default function RuixenMoonChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  
  // File Attachment State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow State
  const [currentFlow, setCurrentFlow] = useState<"general" | "notes-generation" | "quiz-generation" | "pathfinder-generation">("general");
  const [chatMode, setChatMode] = useState<"general" | "notes">("general");
  const [hasDocument, setHasDocument] = useState(false);
  const [documentTopic, setDocumentTopic] = useState("");

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.history) {
        setHistoryItems(data.history);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkDocumentStatus = async () => {
    try {
      const res = await fetch("/api/document-status");
      const data = await res.json();
      if (data.has_document) {
        setHasDocument(true);
        setDocumentTopic(data.topic);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkDocumentStatus();
    fetchHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleSend = async () => {
    const userPrompt = message.trim();
    if (!userPrompt && !attachedFile) return;

    setMessage("");
    adjustHeight(true);

    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, type: "text", text: userPrompt || `Uploaded: ${attachedFile?.name}`, isUser: true },
    ]);
    setIsLoading(true);

    try {
      if (currentFlow === "notes-generation") {
        const formData = new FormData();
        if (userPrompt) formData.append("topic", userPrompt);
        if (attachedFile) formData.append("file", attachedFile);
        formData.append("level", "Intermediate");
        formData.append("mode", "Deep Dive");

        const res = await fetch("/api/generate-notes", { method: "POST", body: formData });
        const data = await res.json();
        
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            type: "notes",
            text: data.notes,
            data: { topic: userPrompt || attachedFile?.name.replace(/\.[^/.]+$/, "") },
            isUser: false,
          },
        ]);
        
        setCurrentFlow("general");
        setAttachedFile(null);
        await checkDocumentStatus();
        fetchHistory();

      } else if (currentFlow === "quiz-generation") {
        const res = await fetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: userPrompt, num_questions: 5 }),
        });
        const data = await res.json();
        
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            type: "quiz",
            text: `Quiz on "${userPrompt}" loaded. Check your options below!`,
            data: { quiz: data.quiz, answers: {} },
            isUser: false,
          },
        ]);
        setCurrentFlow("general");
        fetchHistory();

      } else if (currentFlow === "pathfinder-generation") {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interests: userPrompt, level: "Intermediate", goal: `Master ${userPrompt}`, time: "Moderate" }),
        });
        const data = await res.json();
        
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            type: "pathfinder",
            text: data.roadmap,
            isUser: false,
          },
        ]);
        setCurrentFlow("general");
        fetchHistory();

      } else {
        const isNotes = chatMode === "notes";
        const url = isNotes ? "/api/rag-chat" : "/api/chat";
        const payload = isNotes ? { query: userPrompt } : { message: userPrompt };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), type: "text", text: data.response, isUser: false },
        ]);
        fetchHistory();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "text",
          text: "Neural link lost. Please check backend connection and retry.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const triggerQuickAction = (action: "notes" | "tutor" | "quiz" | "pathfinder") => {
    if (action === "notes") {
      setCurrentFlow("notes-generation");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "text",
          text: "✍️ Enter a subject or drag & drop a PDF/TXT file below to synthesize structured study notes.",
          isUser: false,
        },
      ]);
    } else if (action === "tutor") {
      setChatMode("general");
      setCurrentFlow("general");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "text",
          text: "🤖 AI Assistant Tutor mode activated. Ask me any question!",
          isUser: false,
        },
      ]);
    } else if (action === "quiz") {
      setCurrentFlow("quiz-generation");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "text",
          text: "⚡ Quiz Lab engaged. What topic would you like to be evaluated on?",
          isUser: false,
        },
      ]);
    } else if (action === "pathfinder") {
      setCurrentFlow("pathfinder-generation");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "text",
          text: "🧭 Pathfinder advisor online. Type in your interests & career goals to build a roadmap.",
          isUser: false,
        },
      ]);
    }
  };

  const handleQuizAnswer = (messageId: string, questionIdx: number, option: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.data) {
          const currentAnswers = { ...msg.data.answers, [questionIdx]: option };
          return {
            ...msg,
            data: { ...msg.data, answers: currentAnswers },
          };
        }
        return msg;
      })
    );
  };

  const loadHistoryItem = (item: any) => {
    let msgType: "text" | "notes" | "quiz" | "pathfinder" = "text";
    let dataPayload: any = null;

    if (item.type === "notes") {
      msgType = "notes";
      dataPayload = { topic: item.topic };
    } else if (item.type === "quiz") {
      msgType = "quiz";
      try {
        const quizList = JSON.parse(item.content);
        dataPayload = { quiz: quizList, answers: {} };
      } catch (e) {
        dataPayload = { quiz: [], answers: {} };
      }
    } else if (item.type === "recommendation") {
      msgType = "pathfinder";
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: msgType,
        text: item.content,
        data: dataPayload,
        isUser: false,
      },
    ]);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentFlow("general");
    setAttachedFile(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#020617] text-white">
      {/* 📁 History Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-white/5 bg-[#0f172a]/95 backdrop-blur-md transition-all duration-300 relative z-20 h-full",
          isSidebarOpen ? "w-72" : "w-0 overflow-hidden border-r-0"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-[#FFEF4D]" />
            <span className="text-xs font-black tracking-widest text-[#FFEF4D] uppercase">
              Academic Footprint
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="h-8 w-8 text-neutral-400 hover:text-white rounded-lg"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {historyItems.length > 0 ? (
            historyItems.map((item) => (
              <button
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="w-full text-left p-3 rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 transition-all flex items-start gap-3 group active:scale-[0.98]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-[#FFEF4D] group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                  {item.type === "chat" ? (
                    <MessageSquare className="h-3.5 w-3.5" />
                  ) : item.type === "notes" ? (
                    <FileText className="h-3.5 w-3.5" />
                  ) : item.type === "quiz" ? (
                    <Brain className="h-3.5 w-3.5" />
                  ) : (
                    <Compass className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <span className="inline-block text-[9px] uppercase font-black tracking-widest text-[#FFEF4D] mb-0.5 opacity-80">
                    {item.type}
                  </span>
                  <p className="text-xs font-bold text-neutral-200 truncate group-hover:text-white transition-colors">
                    {item.topic || "Interaction Sequence"}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-neutral-500">
              <HelpCircle className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-xs font-bold">No footprint logged.</span>
            </div>
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-white/5">
          <Button
            onClick={clearChat}
            variant="outline"
            className="w-full justify-start gap-2 border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-xs h-10 rounded-xl"
          >
            <Trash2 className="h-4 w-4" /> Clear Chat Console
          </Button>
        </div>
      </aside>

      {/* 🌌 Main Chat Window Area */}
      <div
        className="flex-1 h-screen flex flex-col items-center overflow-hidden relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80')",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#020617]/75 pointer-events-none" />

        {/* Ambient drifting neon light filters */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#FFEF4D]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt"
          className="hidden"
        />

        {/* Header Panel */}
        <header className="relative w-full max-w-5xl flex items-center justify-between p-4 z-10 border-b border-white/5 bg-[#0f172a]/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="h-9 w-9 text-neutral-400 hover:text-white rounded-lg animate-in fade-in"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
            )}
            <Cpu className="h-6 w-6 text-[#FFEF4D] drop-shadow-[0_0_8px_rgba(255,239,77,0.45)]" />
            <span className="font-bold tracking-tight text-white">CourseMate AI Console</span>
          </div>

          {/* Notes Context mode indicator */}
          {hasDocument && (
            <div className="flex bg-black/60 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
              <button
                onClick={() => setChatMode("general")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors",
                  chatMode === "general" ? "bg-[#FFEF4D] text-[#020617]" : "text-neutral-400"
                )}
              >
                🤖 Tutor
              </button>
              <button
                onClick={() => setChatMode("notes")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors",
                  chatMode === "notes" ? "bg-[#FFEF4D] text-[#020617]" : "text-neutral-400"
                )}
              >
                📄 Notes: {documentTopic}
              </button>
            </div>
          )}
        </header>

        {/* Scrollable Conversation Workspace */}
        <div className="relative flex-1 w-full max-w-4xl overflow-y-auto px-6 py-8 space-y-8 z-10">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="bg-[#1e293b]/30 p-8 rounded-full border border-white/5 backdrop-blur-sm mb-6 drop-shadow-[0_0_15px_rgba(255,239,77,0.05)]">
                <Cpu className="h-16 w-16 text-[#FFEF4D] drop-shadow-[0_0_12px_rgba(255,239,77,0.5)] animate-pulse" />
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                CourseMate AI
              </h1>
              <p className="mt-3 text-neutral-300 text-lg max-w-md mx-auto">
                Your unified learning copilot. Choose an action or start typing.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full flex-col animate-in fade-in slide-in-from-bottom-4 duration-300",
                msg.isUser ? "items-end" : "items-start"
              )}
            >
              {/* User Speech Bubble */}
              {msg.isUser && (
                <div className="max-w-[80%] rounded-2xl bg-[#FFEF4D] text-[#020617] px-4 py-3 font-semibold text-sm shadow-lg rounded-br-none border border-[#FFEF4D]/10">
                  {msg.text}
                </div>
              )}

              {/* AI Rendered Widgets */}
              {!msg.isUser && (
                <div className="w-full max-w-[90%]">
                  {/* 📄 Upgraded Cyber-Notes Card */}
                  {msg.type === "notes" && (
                    <div className="bg-[#0f172a]/90 backdrop-blur-lg border border-[#FFEF4D]/20 p-8 rounded-3xl shadow-2xl mb-4 text-neutral-100 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#FFEF4D] to-transparent opacity-80" />
                      
                      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-[#FFEF4D] tracking-wide">
                          <FileText className="h-5 w-5 text-[#FFEF4D] drop-shadow-[0_0_8px_rgba(255,239,77,0.45)]" />
                          {msg.data?.topic || "Study Guide"} Manuscript
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.print()}
                          className="flex items-center gap-1.5 h-8 border-white/10 hover:bg-white/5 text-xs text-[#FFEF4D]"
                        >
                          <Printer className="h-3.5 w-3.5" /> Print / PDF
                        </Button>
                      </div>
                      <div
                        className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed prose-headings:text-white prose-strong:text-[#FFEF4D] prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
                        dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                      />
                    </div>
                  )}

                  {/* ⚡ Upgraded Interactive Quiz Widget */}
                  {msg.type === "quiz" && msg.data?.quiz && (
                    <div className="bg-[#0f172a]/95 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-xl w-full">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6">
                        <span className="text-xs font-black tracking-widest text-[#FFEF4D] uppercase flex items-center gap-1.5">
                          <Brain className="h-4 w-4 text-[#FFEF4D]" /> Interactive Quiz
                        </span>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase bg-white/5 px-2.5 py-1 rounded-lg">
                          Score: {Object.keys(msg.data.answers).filter(k => msg.data.answers[Number(k)] === msg.data.quiz[Number(k)].answer).length} / {msg.data.quiz.length}
                        </span>
                      </div>

                      <div className="space-y-6">
                        {msg.data.quiz.map((q: any, qIdx: number) => {
                          const selectedOption = msg.data.answers[qIdx];
                          return (
                            <div key={qIdx} className="space-y-3">
                              <p className="text-xs font-semibold text-white leading-relaxed">
                                0{qIdx + 1}. {q.question}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {q.options.map((opt: string) => {
                                  const selected = selectedOption === opt;
                                  const isCorrect = q.answer === opt;
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => handleQuizAnswer(msg.id, qIdx, opt)}
                                      className={cn(
                                        "text-left p-3 rounded-xl text-xs font-medium transition-all border outline-none",
                                        selectedOption === undefined
                                          ? "bg-black/30 border-white/5 hover:border-[#FFEF4D] hover:bg-white/5 active:scale-[0.98]"
                                          : isCorrect
                                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                          : selected
                                          ? "bg-rose-500/10 border-rose-500 text-rose-400"
                                          : "bg-black/10 border-white/5 text-neutral-500 cursor-not-allowed"
                                      )}
                                    >
                                      <span className="flex justify-between items-center">
                                        <span>{opt}</span>
                                        {selectedOption !== undefined && isCorrect && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                                        {selectedOption !== undefined && selected && !isCorrect && <X className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quiz Complete Celebration Widget */}
                      {Object.keys(msg.data.answers).length === msg.data.quiz.length && (
                        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                          <Trophy className="h-10 w-10 text-[#FFEF4D] mb-3 drop-shadow-[0_0_8px_rgba(255,239,77,0.45)]" />
                          <span className="text-sm font-bold text-white mb-1">Evaluation Complete!</span>
                          <p className="text-xs text-neutral-400">
                            {Object.keys(msg.data.answers).filter(k => msg.data.answers[Number(k)] === msg.data.quiz[Number(k)].answer).length === msg.data.quiz.length
                              ? "Perfect Score! You've mastered this topic. 🏆"
                              : "Good job! Review incorrect responses to lock in the knowledge. 📚"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🧭 Upgraded Pathfinder Interactive Timeline */}
                  {msg.type === "pathfinder" && (
                    <div className="bg-[#0f172a]/95 border border-white/10 p-6 rounded-3xl shadow-xl w-full">
                      <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-6">
                        <Compass className="h-5 w-5 text-[#FFEF4D]" />
                        <span className="text-xs font-black tracking-widest text-[#FFEF4D] uppercase">
                          Career Path Roadmap
                        </span>
                      </div>

                      {parseRoadmapSteps(msg.text).length > 0 ? (
                        <div className="relative border-l-2 border-[#FFEF4D]/30 ml-3.5 pl-6 space-y-6">
                          {parseRoadmapSteps(msg.text).map((step, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[35px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#020617] border-2 border-[#FFEF4D] text-[#FFEF4D] text-[9px] font-bold">
                                {idx + 1}
                              </span>
                              <h4 className="text-sm font-bold text-white">{step.title}</h4>
                              <ul className="mt-2 space-y-1">
                                {step.content.map((item, itemIdx) => (
                                  <li key={itemIdx} className="text-xs text-neutral-300 flex items-start gap-1.5">
                                    <ChevronRight className="h-3 w-3 text-[#FFEF4D] mt-0.5 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                        />
                      )}
                    </div>
                  )}

                  {/* Standard Text Bubble */}
                  {msg.type === "text" && (
                    <div
                      className="prose prose-invert max-w-none text-sm leading-relaxed bg-[#1e293b]/80 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-none border-l-4 border-l-[#FFEF4D] shadow-md"
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="self-start flex gap-1 items-center bg-[#1e293b]/80 border border-white/5 border-l-4 border-l-[#FFEF4D] rounded-2xl rounded-bl-none px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFEF4D] animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFEF4D] animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFEF4D] animate-bounce" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input console */}
        <div className="relative w-full max-w-3xl mb-8 px-4 z-10">
          {/* Dynamic active flow hint */}
          {currentFlow !== "general" && (
            <div className="flex items-center justify-between bg-[#FFEF4D]/10 border border-[#FFEF4D]/20 px-4 py-2 rounded-t-xl text-xs font-semibold text-[#FFEF4D] mb-[-1px] animate-in slide-in-from-bottom-2">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Flow engaged: <strong className="uppercase">{currentFlow.replace("-generation", "")}</strong>
              </span>
              <button
                onClick={() => {
                  setCurrentFlow("general");
                  setAttachedFile(null);
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-neutral-700 shadow-2xl overflow-hidden focus-within:border-[#FFEF4D]/50 focus-within:ring-2 focus-within:ring-[#FFEF4D]/10 transition-all">
            {/* File Attachment Pill */}
            {attachedFile && (
              <div className="flex items-center justify-between bg-[#1e293b]/60 px-4 py-2 border-b border-neutral-800 text-xs">
                <span className="text-[#FFEF4D] font-semibold truncate max-w-xs">
                  📄 {attachedFile.name}
                </span>
                <button onClick={() => setAttachedFile(null)} className="text-neutral-400 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                currentFlow === "notes-generation"
                  ? "Enter subject matter details..."
                  : currentFlow === "quiz-generation"
                  ? "Enter quiz topic..."
                  : currentFlow === "pathfinder-generation"
                  ? "Enter career goal or core interests..."
                  : "Type your query here..."
              }
              className={cn(
                "w-full px-4 py-3 resize-none border-none bg-transparent text-white text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-neutral-500 min-h-[48px]"
              )}
              style={{ overflow: "hidden" }}
            />

            {/* Footer controls */}
            <div className="flex items-center justify-between px-3 pb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg h-9 w-9"
                title="Attach File Source"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() && !attachedFile}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all text-xs h-9 font-bold",
                    (message.trim() || attachedFile)
                      ? "bg-[#FFEF4D] text-[#020617] hover:bg-[#fff37a] hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-[#FFEF4D]/10"
                      : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  )}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation pills */}
          <div className="flex items-center justify-center flex-wrap gap-2.5 mt-5">
            <Button
              variant="outline"
              onClick={() => triggerQuickAction("notes")}
              className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-850 hover:border-[#FFEF4D] transition-all text-[11px] h-8 px-3.5 hover:-translate-y-0.5 active:translate-y-0"
            >
              <FileText className="w-3.5 h-3.5 text-[#FFEF4D]" />
              <span>Study Notes</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => triggerQuickAction("tutor")}
              className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-850 hover:border-[#FFEF4D] transition-all text-[11px] h-8 px-3.5 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Cpu className="w-3.5 h-3.5 text-[#FFEF4D]" />
              <span>AI Tutor</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => triggerQuickAction("quiz")}
              className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-850 hover:border-[#FFEF4D] transition-all text-[11px] h-8 px-3.5 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Brain className="w-3.5 h-3.5 text-[#FFEF4D]" />
              <span>Quiz Lab</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => triggerQuickAction("pathfinder")}
              className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-850 hover:border-[#FFEF4D] transition-all text-[11px] h-8 px-3.5 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Compass className="w-3.5 h-3.5 text-[#FFEF4D]" />
              <span>Pathfinder</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
