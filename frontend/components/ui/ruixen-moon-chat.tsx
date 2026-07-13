"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { marked } from "marked";
import {
  Compass,
  FileText,
  HelpCircle,
  Cpu,
  Brain,
  X,
  Sparkles,
  Printer,
  Check,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  History,
  MessageSquare,
  ArrowUp,
  Paperclip,
  Trophy,
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
  data?: any;
  isUser: boolean;
}

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
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0f1d] text-white">
      {/* 📁 Clean History Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-white/10 bg-[#0f172a] transition-all duration-300 relative z-20 h-full shadow-2xl",
          isSidebarOpen ? "w-72" : "w-0 overflow-hidden border-r-0"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-[#FFEF4D] drop-shadow-[0_0_4px_rgba(255,239,77,0.35)]" />
            <span className="text-xs font-black tracking-widest text-[#FFEF4D] uppercase">
              Footprint History
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#0b0f19]">
          {historyItems.length > 0 ? (
            historyItems.map((item) => (
              <button
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="w-full text-left p-3 rounded-xl border border-white/5 bg-[#131b2e]/60 hover:bg-[#1e293b] hover:border-white/10 transition-all flex items-start gap-3 group active:scale-[0.98] shadow-sm"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-neutral-300 group-hover:text-[#FFEF4D] transition-colors shrink-0 mt-0.5">
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
                  <span className="inline-block text-[9px] uppercase font-bold tracking-wider text-[#FFEF4D]/70 mb-0.5">
                    {item.type}
                  </span>
                  <p className="text-xs font-bold text-neutral-300 truncate group-hover:text-white transition-colors">
                    {item.topic || "Interaction"}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-neutral-600">
              <HelpCircle className="h-7 w-7 mb-2 opacity-50" />
              <span className="text-[11px] font-semibold">No footprints yet.</span>
            </div>
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-white/10 bg-[#0f172a]">
          <Button
            onClick={clearChat}
            variant="outline"
            className="w-full justify-start gap-2 border-white/10 bg-[#0b0f19] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-xs h-9 rounded-xl font-bold"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Console
          </Button>
        </div>
      </aside>

      {/* 🌌 Main Chat Window Area */}
      <div className="flex-1 h-screen flex flex-col items-center overflow-hidden relative bg-[#0b0f19]">
        {/* Subtle Ambient Light Filters (Clean UI style) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[350px] w-[600px] rounded-full bg-gradient-to-b from-[#FFEF4D]/10 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

        {/* Header Panel */}
        <header className="relative w-full px-6 md:px-10 flex items-center justify-between p-4 z-10 border-b border-white/10 bg-[#0f172a]/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="h-9 w-9 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg"
              >
                <PanelLeft className="h-4.5 w-4.5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[#FFEF4D] drop-shadow-[0_0_4px_rgba(255,239,77,0.45)]" />
              <span className="font-bold text-sm tracking-tight text-white">CourseMate AI</span>
            </div>
          </div>

          {/* Notes Context mode indicator */}
          {hasDocument && (
            <div className="flex bg-[#0b0f19] border border-white/10 rounded-xl p-1 text-[11px] font-bold">
              <button
                onClick={() => setChatMode("general")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors",
                  chatMode === "general" ? "bg-[#FFEF4D] text-[#030712]" : "text-neutral-400 hover:text-white"
                )}
              >
                🤖 Tutor
              </button>
              <button
                onClick={() => setChatMode("notes")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors",
                  chatMode === "notes" ? "bg-[#FFEF4D] text-[#030712]" : "text-neutral-400 hover:text-white"
                )}
              >
                📄 Notes: {documentTopic}
              </button>
            </div>
          )}
        </header>

        {/* Scrollable Conversation Workspace */}
        <div className="flex-1 w-full max-w-3xl overflow-y-auto px-4 py-8 space-y-8 z-10">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="h-14 w-14 rounded-2xl bg-[#1e293b]/60 border border-white/10 flex items-center justify-center mb-6 shadow-md">
                <Cpu className="h-7 w-7 text-[#FFEF4D] drop-shadow-[0_0_8px_rgba(255,239,77,0.5)] animate-pulse" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">
                How can I assist you today?
              </h1>
              <p className="mt-2 text-neutral-400 text-sm max-w-md mx-auto">
                Synthesize study guides, take interactive quizzes, or map out your career paths inline.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full flex-col animate-in fade-in slide-in-from-bottom-3 duration-200",
                msg.isUser ? "items-end" : "items-start"
              )}
            >
              {/* Clean User Message */}
              {msg.isUser && (
                <div className="max-w-[75%] rounded-2xl bg-[#1e293b] border border-white/10 text-white px-4 py-2.5 font-semibold text-sm rounded-br-none shadow-md">
                  {msg.text}
                </div>
              )}

              {/* Clean AI Widgets */}
              {!msg.isUser && (
                <div className="w-full max-w-[90%] flex gap-4 items-start">
                  {/* AI Avatar badge */}
                  <div className="h-8 w-8 rounded-lg bg-[#FFEF4D]/10 border border-[#FFEF4D]/20 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_rgba(255,239,77,0.05)]">
                    <Sparkles className="h-4 w-4 text-[#FFEF4D]" />
                  </div>
                  
                  <div className="flex-1 space-y-3 overflow-hidden">
                    {/* Notes (Clean Card) */}
                    {msg.type === "notes" && (
                      <div className="bg-[#0f172a] border border-white/10 p-6 rounded-2xl shadow-xl w-full">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                          <span className="text-xs font-bold text-[#FFEF4D] uppercase flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Study Notes
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.print()}
                            className="flex items-center gap-1 h-7 border border-white/10 hover:bg-white/5 text-[10px] text-neutral-300 font-bold px-2 rounded-lg"
                          >
                            <Printer className="h-3 w-3" /> Print / PDF
                          </Button>
                        </div>
                        <div
                          className="prose prose-invert prose-xs max-w-none text-neutral-300 leading-relaxed prose-headings:text-white prose-strong:text-[#FFEF4D] prose-code:bg-white/5 prose-code:p-0.5 prose-code:rounded prose-ul:list-disc prose-ol:list-decimal"
                          dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                        />
                      </div>
                    )}

                    {/* Quiz (Clean Card) */}
                    {msg.type === "quiz" && msg.data?.quiz && (
                      <div className="bg-[#0f172a] border border-white/10 p-6 rounded-2xl shadow-xl w-full">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                          <span className="text-xs font-bold text-[#FFEF4D] uppercase flex items-center gap-1.5">
                            <Brain className="h-3.5 w-3.5" /> Interactive Quiz
                          </span>
                          <span className="text-[10px] text-neutral-400 font-bold bg-white/5 px-2.5 py-0.5 rounded-md">
                            Score: {Object.keys(msg.data.answers).filter(k => msg.data.answers[Number(k)] === msg.data.quiz[Number(k)].answer).length} / {msg.data.quiz.length}
                          </span>
                        </div>

                        <div className="space-y-5">
                          {msg.data.quiz.map((q: any, qIdx: number) => {
                            const selectedOption = msg.data.answers[qIdx];
                            return (
                              <div key={qIdx} className="space-y-2">
                                <p className="text-xs font-bold text-neutral-200">
                                  0{qIdx + 1}. {q.question}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {q.options.map((opt: string) => {
                                    const selected = selectedOption === opt;
                                    const isCorrect = q.answer === opt;
                                    return (
                                      <button
                                        key={opt}
                                        onClick={() => handleQuizAnswer(msg.id, qIdx, opt)}
                                        className={cn(
                                          "text-left p-2.5 rounded-lg text-xs transition-all border outline-none font-semibold",
                                          selectedOption === undefined
                                            ? "bg-[#0b0f19] border-white/5 hover:border-neutral-500 hover:bg-white/[0.02]"
                                            : isCorrect
                                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                            : selected
                                            ? "bg-rose-500/10 border-rose-500 text-rose-400"
                                            : "bg-[#0b0f19] border-white/5 text-neutral-500 cursor-not-allowed"
                                        )}
                                      >
                                        <span>{opt}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Complete Celebration */}
                        {Object.keys(msg.data.answers).length === msg.data.quiz.length && (
                          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-center text-xs font-bold text-[#FFEF4D]">
                            <Trophy className="h-4 w-4" />
                            <span>Evaluation Complete! Good Work.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pathfinder (Clean Card) */}
                    {msg.type === "pathfinder" && (
                      <div className="bg-[#0f172a] border border-white/10 p-6 rounded-2xl shadow-xl w-full">
                        <div className="flex items-center gap-1.5 border-b border-white/10 pb-3 mb-4">
                          <Compass className="h-4 w-4 text-[#FFEF4D]" />
                          <span className="text-xs font-bold text-[#FFEF4D] uppercase">
                            Career Pathway
                          </span>
                        </div>

                        {parseRoadmapSteps(msg.text).length > 0 ? (
                          <div className="relative border-l border-white/10 ml-2 pl-5 space-y-5">
                            {parseRoadmapSteps(msg.text).map((step, idx) => (
                              <div key={idx} className="relative">
                                <span className="absolute -left-[25px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#0b0f19] border border-[#FFEF4D] text-[8px] font-black text-[#FFEF4D]">
                                  {idx + 1}
                                </span>
                                <h4 className="text-xs font-bold text-white">{step.title}</h4>
                                <ul className="mt-1 space-y-0.5">
                                  {step.content.map((item, itemIdx) => (
                                    <li key={itemIdx} className="text-[11px] text-neutral-400 flex items-start gap-1">
                                      <ChevronRight className="h-3 w-3 text-neutral-600 mt-0.5 shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className="prose prose-invert prose-sm max-w-none text-xs text-neutral-300"
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                          />
                        )}
                      </div>
                    )}

                    {/* Standard Text Bubble */}
                    {msg.type === "text" && (
                      <div
                        className="prose prose-invert max-w-none text-sm text-neutral-200 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="self-start flex gap-4 items-start w-full">
              <div className="h-8 w-8 rounded-lg bg-[#FFEF4D]/10 border border-[#FFEF4D]/20 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(255,239,77,0.05)]">
                <Sparkles className="h-4 w-4 text-[#FFEF4D] animate-spin" />
              </div>
              <div className="flex gap-1 items-center pt-2">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-600 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-600 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-600 animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Console */}
        <div className="relative w-full max-w-2xl mb-8 px-4 z-10">
          {/* Active Flow HUD Bar */}
          {currentFlow !== "general" && (
            <div className="flex items-center justify-between bg-[#FFEF4D]/5 border border-[#FFEF4D]/10 px-4 py-2 rounded-t-xl text-[10px] font-bold text-[#FFEF4D] mb-[-1px] animate-in slide-in-from-bottom-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFEF4D] animate-pulse" />
                ACTIVE INTERACTIVE FLOW: <strong className="uppercase">{currentFlow.replace("-generation", "")}</strong>
              </span>
              <button
                onClick={() => {
                  setCurrentFlow("general");
                  setAttachedFile(null);
                }}
                className="text-neutral-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="bg-[#0f172a] rounded-2xl border border-white/10 shadow-xl overflow-hidden focus-within:border-white/20 transition-colors">
            {/* Attached file tag */}
            {attachedFile && (
              <div className="flex items-center justify-between bg-white/[0.02] px-4 py-2 border-b border-white/10 text-[11px]">
                <span className="text-[#FFEF4D] font-bold truncate max-w-xs">
                  📄 {attachedFile.name}
                </span>
                <button onClick={() => setAttachedFile(null)} className="text-neutral-500 hover:text-white">
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
                  ? "Describe notes subject..."
                  : currentFlow === "quiz-generation"
                  ? "Describe quiz subject..."
                  : currentFlow === "pathfinder-generation"
                  ? "Describe career roadmap details..."
                  : "Type your query here..."
              }
              className={cn(
                "w-full px-4 py-3.5 resize-none border-none bg-transparent text-white text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-neutral-600 min-h-[48px]"
              )}
              style={{ overflow: "hidden" }}
            />

            {/* Footer buttons */}
            <div className="flex items-center justify-between px-3 pb-3 border-t border-white/10 pt-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg h-8 w-8"
                title="Attach Source Document"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() && !attachedFile}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-bold h-8",
                    (message.trim() || attachedFile)
                      ? "bg-[#FFEF4D] text-[#030712] hover:bg-[#fff37a] active:scale-[0.98]"
                      : "bg-white/5 text-neutral-600 cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick actions bar */}
          <div className="flex items-center justify-center flex-wrap gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => triggerQuickAction("notes")}
              className="flex items-center gap-1.5 rounded-full border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all text-[10px] h-7.5 px-3 font-semibold"
            >
              <FileText className="w-3 h-3 text-[#FFEF4D]" />
              <span>Notes Generator</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => triggerQuickAction("tutor")}
              className="flex items-center gap-1.5 rounded-full border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all text-[10px] h-7.5 px-3 font-semibold"
            >
              <Cpu className="w-3 h-3 text-[#FFEF4D]" />
              <span>AI Tutor</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => triggerQuickAction("quiz")}
              className="flex items-center gap-1.5 rounded-full border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all text-[10px] h-7.5 px-3 font-semibold"
            >
              <Brain className="w-3 h-3 text-[#FFEF4D]" />
              <span>Quiz Lab</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => triggerQuickAction("pathfinder")}
              className="flex items-center gap-1.5 rounded-full border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all text-[10px] h-7.5 px-3 font-semibold"
            >
              <Compass className="w-3 h-3 text-[#FFEF4D]" />
              <span>Pathfinder</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
