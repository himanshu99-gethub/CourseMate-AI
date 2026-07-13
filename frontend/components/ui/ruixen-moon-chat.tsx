"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { marked } from "marked";
import AuthScreen from "./auth-screen";
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
  Plus,
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

const getWelcomeMessage = (mode: string) => {
  if (mode === "notes") {
    return "✍️ **Notes Generator Workspace**: Synthesize academic summaries. Upload PDFs/TXTs or enter a topic to generate structured study materials.";
  }
  if (mode === "tutor") {
    return "🤖 **AI Tutor Room**: Explain complex subjects, formulas, or concepts. Ask me any academic question!";
  }
  if (mode === "quiz") {
    return "⚡ **Quiz Lab**: Test your knowledge. Enter a topic below to generate an interactive evaluation quiz.";
  }
  if (mode === "pathfinder") {
    return "🧭 **Pathfinder Advisor**: Share your career aspirations, interests, and skill level to map out an advanced career roadmap.";
  }
  return "How can I assist you today? Synthesize study guides, take interactive quizzes, or map out your career paths inline.";
};

export default function RuixenMoonChat() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  // Check storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("coursemate_token");
    const savedUser = localStorage.getItem("coursemate_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem("coursemate_token", newToken);
    localStorage.setItem("coursemate_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("coursemate_token");
    localStorage.removeItem("coursemate_user");
    setToken(null);
    setUser(null);
  };

  // Auth fetch wrapper (injects Bearer token dynamically)
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    };
    return fetch(url, { ...options, headers });
  }, [token]);

  const [activeMode, setActiveMode] = useState<"general" | "notes" | "tutor" | "quiz" | "pathfinder">("general");
  
  const [conversations, setConversations] = useState<Record<string, Message[]>>({
    general: [
      {
        id: "w-general",
        type: "text",
        text: getWelcomeMessage("general"),
        isUser: false,
      }
    ],
    notes: [
      {
        id: "w-notes",
        type: "text",
        text: getWelcomeMessage("notes"),
        isUser: false,
      }
    ],
    tutor: [
      {
        id: "w-tutor",
        type: "text",
        text: getWelcomeMessage("tutor"),
        isUser: false,
      }
    ],
    quiz: [
      {
        id: "w-quiz",
        type: "text",
        text: getWelcomeMessage("quiz"),
        isUser: false,
      }
    ],
    pathfinder: [
      {
        id: "w-pathfinder",
        type: "text",
        text: getWelcomeMessage("pathfinder"),
        isUser: false,
      }
    ],
  });

  const messages = conversations[activeMode] || [];

  const setMessages = useCallback((updater: any) => {
    setConversations((prev) => {
      const oldMsgs = prev[activeMode] || [];
      const newMsgs = typeof updater === "function" ? updater(oldMsgs) : updater;
      return {
        ...prev,
        [activeMode]: newMsgs
      };
    });
  }, [activeMode]);

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
      const res = await authFetch("/api/history");
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
      const res = await authFetch("/api/document-status");
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
    if (token) {
      checkDocumentStatus();
      fetchHistory();
    }
  }, [token, activeMode]);

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
    setMessages((prev: Message[]) => [
      ...prev,
      { id: userMsgId, type: "text", text: userPrompt || `Uploaded: ${attachedFile?.name}`, isUser: true },
    ]);
    setIsLoading(true);

    try {
      // If we are explicitly in a notes upload flow or user attached a file in Notes Mode
      if (currentFlow === "notes-generation" || (activeMode === "notes" && attachedFile)) {
        const formData = new FormData();
        if (userPrompt) formData.append("topic", userPrompt);
        if (attachedFile) formData.append("file", attachedFile);
        formData.append("level", "Intermediate");
        formData.append("mode", "Deep Dive");

        const res = await authFetch("/api/generate-notes", { method: "POST", body: formData });
        const data = await res.json();
        
        setMessages((prev: Message[]) => [
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

      } else if (currentFlow === "quiz-generation" || (activeMode === "quiz" && messages.length <= 1)) {
        // If first prompt in Quiz Mode, generate the Quiz Grid component directly
        const res = await authFetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: userPrompt, num_questions: 5 }),
        });
        const data = await res.json();
        
        setMessages((prev: Message[]) => [
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

      } else if (currentFlow === "pathfinder-generation" || (activeMode === "pathfinder" && messages.length <= 1)) {
        // If first prompt in Pathfinder Mode, build career steps timeline component directly
        const res = await authFetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interests: userPrompt, level: "Intermediate", goal: `Master ${userPrompt}`, time: "Moderate" }),
        });
        const data = await res.json();
        
        setMessages((prev: Message[]) => [
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
        // Regular conversation scoped to the activeMode
        const useRAG = activeMode === "notes" && hasDocument && chatMode === "notes";
        const url = useRAG ? "/api/rag-chat" : "/api/chat";
        const payload = useRAG ? { query: userPrompt } : { message: userPrompt, mode: activeMode };

        const res = await authFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        setMessages((prev: Message[]) => [
          ...prev,
          { id: (Date.now() + 1).toString(), type: "text", text: data.response, isUser: false },
        ]);
        fetchHistory();
      }
    } catch (err) {
      setMessages((prev: Message[]) => [
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
    setActiveMode(action);
  };

  const handleQuizAnswer = (messageId: string, questionIdx: number, option: string) => {
    setMessages((prev: Message[]) =>
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

    setMessages((prev: Message[]) => [
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
    setConversations((prev) => ({
      ...prev,
      [activeMode]: [
        {
          id: `welcome-${activeMode}-${Date.now()}`,
          type: "text",
          text: getWelcomeMessage(activeMode),
          isUser: false,
        }
      ]
    }));
    setCurrentFlow("general");
    setAttachedFile(null);
  };

  const clearAllHistory = async () => {
    try {
      await authFetch("/api/history", { method: "DELETE" });
      setHistoryItems([]);
      setConversations({
        general: [{ id: "w-g", type: "text", text: getWelcomeMessage("general"), isUser: false }],
        notes: [{ id: "w-n", type: "text", text: getWelcomeMessage("notes"), isUser: false }],
        tutor: [{ id: "w-t", type: "text", text: getWelcomeMessage("tutor"), isUser: false }],
        quiz: [{ id: "w-q", type: "text", text: getWelcomeMessage("quiz"), isUser: false }],
        pathfinder: [{ id: "w-p", type: "text", text: getWelcomeMessage("pathfinder"), isUser: false }],
      });
      setAttachedFile(null);
      setCurrentFlow("general");
      setChatMode("general");
      setHasDocument(false);
      setDocumentTopic("");
    } catch (e) {
      console.error("Failed to delete chat history:", e);
    }
  };

  const deleteMessage = (id: string) => {
    setMessages((prev: Message[]) => prev.filter((msg) => msg.id !== id));
  };

  const deleteHistoryLog = async (id: number) => {
    try {
      await authFetch(`/api/history/${id}`, { method: "DELETE" });
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error("Failed to delete history item:", e);
    }
  };

  if (!token) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0f1d] text-white">
      {/* Mobile backdrop overlay — tap to close sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 📁 Clean Sidebar with Modules & History */}
      <aside
        className={cn(
          "flex flex-col border-r border-white/10 bg-[#0f172a] transition-all duration-300 h-full shadow-2xl",
          isSidebarOpen
            ? "fixed md:relative inset-y-0 left-0 w-[280px] md:w-72 z-30"
            : "w-0 overflow-hidden border-r-0 relative z-20"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-[#FFEF4D] drop-shadow-[0_0_4px_rgba(255,239,77,0.35)] animate-pulse" />
            <span className="text-xs font-black tracking-widest text-[#FFEF4D] uppercase">
              CourseMate Console
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

        {/* 🛠️ Sidebar Modules/Triggers — hidden on mobile (bottom nav used instead) */}
        <div className="hidden md:block p-4 border-b border-white/5 space-y-1 bg-[#0b0f19]/35">
          <Button
            onClick={clearChat}
            className="w-full flex items-center justify-center gap-2 bg-[#FFEF4D] text-[#030712] hover:bg-[#fff37a] text-xs h-9 rounded-xl font-extrabold active:scale-[0.98] cursor-pointer mb-3"
          >
            <Plus className="h-4 w-4" /> New Chat Session
          </Button>

          <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase block pb-1">
            Learning Modules
          </span>

          <button
            onClick={() => {
              setActiveMode("general");
              setCurrentFlow("general");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-xs font-bold active:scale-[0.98] cursor-pointer text-left",
              activeMode === "general"
                ? "bg-[#FFEF4D]/10 text-white border-l-2 border-[#FFEF4D] pl-2"
                : "hover:bg-white/5 text-neutral-300 hover:text-white"
            )}
          >
            <Cpu className={cn("h-4 w-4 shrink-0", activeMode === "general" ? "text-[#FFEF4D]" : "text-neutral-500")} />
            <span>Main Assistant Tutor</span>
          </button>

          <button
            onClick={() => {
              setActiveMode("notes");
              setCurrentFlow("general");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-xs font-bold active:scale-[0.98] cursor-pointer text-left",
              activeMode === "notes"
                ? "bg-[#FFEF4D]/10 text-white border-l-2 border-[#FFEF4D] pl-2"
                : "hover:bg-white/5 text-neutral-300 hover:text-white"
            )}
          >
            <FileText className={cn("h-4 w-4 shrink-0", activeMode === "notes" ? "text-[#FFEF4D]" : "text-neutral-500")} />
            <span>Notes Generator</span>
          </button>

          <button
            onClick={() => {
              setActiveMode("tutor");
              setCurrentFlow("general");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-xs font-bold active:scale-[0.98] cursor-pointer text-left",
              activeMode === "tutor"
                ? "bg-[#FFEF4D]/10 text-white border-l-2 border-[#FFEF4D] pl-2"
                : "hover:bg-white/5 text-neutral-300 hover:text-white"
            )}
          >
            <Cpu className={cn("h-4 w-4 shrink-0", activeMode === "tutor" ? "text-[#FFEF4D]" : "text-neutral-500")} />
            <span>AI Tutor Room</span>
          </button>

          <button
            onClick={() => {
              setActiveMode("quiz");
              setCurrentFlow("general");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-xs font-bold active:scale-[0.98] cursor-pointer text-left",
              activeMode === "quiz"
                ? "bg-[#FFEF4D]/10 text-white border-l-2 border-[#FFEF4D] pl-2"
                : "hover:bg-white/5 text-neutral-300 hover:text-white"
            )}
          >
            <Brain className={cn("h-4 w-4 shrink-0", activeMode === "quiz" ? "text-[#FFEF4D]" : "text-neutral-500")} />
            <span>Quiz Practice Lab</span>
          </button>

          <button
            onClick={() => {
              setActiveMode("pathfinder");
              setCurrentFlow("general");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-xs font-bold active:scale-[0.98] cursor-pointer text-left",
              activeMode === "pathfinder"
                ? "bg-[#FFEF4D]/10 text-white border-l-2 border-[#FFEF4D] pl-2"
                : "hover:bg-white/5 text-neutral-300 hover:text-white"
            )}
          >
            <Compass className={cn("h-4 w-4 shrink-0", activeMode === "pathfinder" ? "text-[#FFEF4D]" : "text-neutral-500")} />
            <span>Pathfinder Advisor</span>
          </button>
        </div>

        {/* History List (Scroll hidden) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b0f19] no-scrollbar border-t border-white/5">
          <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase block mb-1">
            Footprint Logs
          </span>
          {historyItems.length > 0 ? (
            historyItems.map((item) => (
              <div key={item.id} className="relative group/item w-full">
                <button
                  onClick={() => loadHistoryItem(item)}
                  className="w-full text-left p-3 pr-9 rounded-xl border border-white/5 bg-[#131b2e]/40 hover:bg-[#1e293b] hover:border-white/10 transition-all flex items-start gap-3 group active:scale-[0.98] shadow-sm"
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistoryLog(item.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity p-1.5 text-neutral-500 hover:text-rose-400 z-30"
                  title="Delete log entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-neutral-600">
              <HelpCircle className="h-7 w-7 mb-2 opacity-50" />
              <span className="text-[11px] font-semibold text-neutral-500">No footprints yet.</span>
            </div>
          )}
        </div>

        {/* 👤 User Profile & Logout */}
        {user && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-[#0b0f19]/35">
            <div className="flex flex-col overflow-hidden mr-2">
              <span className="text-xs font-black text-white truncate">{user.name}</span>
              <span className="text-[10px] text-neutral-400 truncate">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-8 w-8 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer shrink-0 animate-in fade-in duration-200"
              title="Logout Session"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}

      </aside>

      {/* 🌌 Main Chat Window Area */}
      <div className="flex-1 h-screen flex flex-col items-center overflow-hidden relative bg-[#0b0f19]">
        {/* Subtle Ambient Light Filters (Clean UI style) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[350px] w-[600px] rounded-full bg-gradient-to-b from-[#FFEF4D]/10 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt"
          className="hidden"
        />

        {/* Header Panel */}
        <header className="relative w-full px-3 md:px-6 lg:px-10 flex items-center justify-between py-3 px-3 md:p-4 z-10 border-b border-white/10 bg-[#0f172a]/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Always show hamburger on mobile; only show on desktop when sidebar is closed */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "h-9 w-9 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg",
                isSidebarOpen ? "hidden md:hidden" : ""
              )}
            >
              <PanelLeft className="h-4.5 w-4.5" />
            </Button>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 md:h-5 md:w-5 text-[#FFEF4D] drop-shadow-[0_0_4px_rgba(255,239,77,0.45)]" />
              <span className="font-bold text-sm tracking-tight text-white">CourseMate AI</span>
              <span className="hidden sm:inline text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[#FFEF4D] font-black uppercase tracking-wider">
                {activeMode === "general"
                  ? "Main Tutor"
                  : activeMode === "notes"
                  ? "Notes"
                  : activeMode === "tutor"
                  ? "AI Tutor"
                  : activeMode === "quiz"
                  ? "Quiz Lab"
                  : "Pathfinder"}
              </span>
            </div>
          </div>

          {/* Notes Context mode indicator */}
          {hasDocument && activeMode === "notes" && (
            <div className="flex bg-[#0b0f19] border border-white/10 rounded-xl p-1 text-[10px] md:text-[11px] font-bold">
              <button
                onClick={() => setChatMode("general")}
                className={cn(
                  "px-2 md:px-2.5 py-1 rounded-lg transition-colors",
                  chatMode === "general" ? "bg-[#FFEF4D] text-[#030712]" : "text-neutral-400 hover:text-white"
                )}
              >
                🤖 <span className="hidden sm:inline">Tutor</span>
              </button>
              <button
                onClick={() => setChatMode("notes")}
                className={cn(
                  "px-2 md:px-2.5 py-1 rounded-lg transition-colors",
                  chatMode === "notes" ? "bg-[#FFEF4D] text-[#030712]" : "text-neutral-400 hover:text-white"
                )}
              >
                📄 <span className="hidden sm:inline">{documentTopic}</span>
              </button>
            </div>
          )}
        </header>

        {/* Scrollable Conversation Workspace */}
        <div className="flex-1 w-full max-w-3xl overflow-y-auto px-3 md:px-4 py-4 md:py-8 pb-2 md:pb-4 space-y-5 md:space-y-8 z-10 no-scrollbar">
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
                <div className="group relative max-w-[88%] md:max-w-[75%] flex items-center gap-2">
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-neutral-500 hover:text-rose-400 shrink-0"
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="rounded-2xl bg-[#1e293b] border border-white/10 text-white px-4 py-2.5 font-semibold text-sm rounded-br-none shadow-md">
                    {msg.text}
                  </div>
                </div>
              )}

              {/* Clean AI Widgets */}
              {!msg.isUser && (
                <div className="group relative w-full max-w-[96%] md:max-w-[90%] flex gap-2 md:gap-4 items-start">
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

                  {/* Clean Hover Delete Button */}
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-500 hover:text-rose-400 shrink-0 self-center"
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
        <div className="relative w-full max-w-2xl mb-20 md:mb-8 px-2 md:px-4 z-10">
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
                activeMode === "notes"
                  ? "Describe notes subject or type a query..."
                  : activeMode === "quiz"
                  ? "Describe quiz subject or type a query..."
                  : activeMode === "pathfinder"
                  ? "Describe career goals or type a query..."
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
        </div>
      </div>

      {/* 📱 Mobile Bottom Navigation Bar — visible only on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-around px-1 py-2">
          {([
            { mode: "general", icon: <Cpu className="h-5 w-5" />, label: "Tutor" },
            { mode: "notes", icon: <FileText className="h-5 w-5" />, label: "Notes" },
            { mode: "tutor", icon: <Brain className="h-5 w-5" />, label: "AI Room" },
            { mode: "quiz", icon: <Trophy className="h-5 w-5" />, label: "Quiz" },
            { mode: "pathfinder", icon: <Compass className="h-5 w-5" />, label: "Paths" },
          ] as const).map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => { setActiveMode(mode); setCurrentFlow("general"); }}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[52px]",
                activeMode === mode
                  ? "text-[#FFEF4D]"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <span className={cn(activeMode === mode && "drop-shadow-[0_0_6px_rgba(255,239,77,0.6)]")}>  
                {icon}
              </span>
              <span className="text-[9px] font-bold tracking-wide">{label}</span>
              {activeMode === mode && (
                <span className="h-0.5 w-4 rounded-full bg-[#FFEF4D] mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
