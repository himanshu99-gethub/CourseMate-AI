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

export default function RuixenMoonChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // File Attachment State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow State
  // 'general' = regular AI assistant
  // 'notes-generation' = waiting for topic for notes
  // 'quiz-generation' = waiting for topic for quiz
  // 'pathfinder-generation' = waiting for career goal
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

  // Sync document status from server
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
        // Trigger Notes Generation API
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
        
        // Reset Flow and cache document context
        setCurrentFlow("general");
        setAttachedFile(null);
        await checkDocumentStatus();

      } else if (currentFlow === "quiz-generation") {
        // Trigger Quiz Generation API
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

      } else if (currentFlow === "pathfinder-generation") {
        // Trigger Pathfinder API
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

      } else {
        // Normal general chat or RAG Notes chat
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

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center flex flex-col items-center overflow-hidden"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80')",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt"
        className="hidden"
      />

      {/* Header Panel */}
      <header className="relative w-full max-w-5xl flex items-center justify-between p-4 z-10 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
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
      <div className="relative flex-1 w-full max-w-4xl overflow-y-auto px-4 py-6 space-y-6 z-10">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
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
              <div className="max-w-[80%] rounded-2xl bg-[#FFEF4D] text-[#020617] px-4 py-3 font-semibold text-sm shadow-md rounded-br-none">
                {msg.text}
              </div>
            )}

            {/* AI Rendered Widgets */}
            {!msg.isUser && (
              <div className="w-full max-w-[90%]">
                {msg.type === "notes" && (
                  <div className="bg-white text-[#020617] p-8 rounded-3xl border border-neutral-200 shadow-xl mb-4">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#FFEF4D] fill-[#FFEF4D]" />
                        {msg.data?.topic || "Study Guide"} Manuscript
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 h-8 border-neutral-300 hover:bg-neutral-50 text-xs text-neutral-700"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print / PDF
                      </Button>
                    </div>
                    <div
                      className="prose prose-slate max-w-none text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                    />
                  </div>
                )}

                {msg.type === "quiz" && msg.data?.quiz && (
                  <div className="bg-[#0f172a]/95 border border-white/10 p-6 rounded-3xl shadow-xl w-full">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                      <span className="text-xs font-black tracking-widest text-[#FFEF4D] uppercase flex items-center gap-1.5">
                        <Brain className="h-4 w-4" /> Interactive Quiz
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold">
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
                                const isOptionSelected = selectedOption === opt;
                                const isCorrect = q.answer === opt;
                                return (
                                  <button
                                    key={opt}
                                    onClick={() => handleQuizAnswer(msg.id, qIdx, opt)}
                                    className={cn(
                                      "text-left p-3 rounded-xl text-xs font-medium transition-all border outline-none",
                                      selectedOption === undefined
                                        ? "bg-black/30 border-white/5 hover:border-[#FFEF4D] hover:bg-white/5"
                                        : isCorrect
                                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold"
                                        : isOptionSelected
                                        ? "bg-rose-500/10 border-rose-500 text-rose-400"
                                        : "bg-black/10 border-white/5 text-neutral-500 cursor-not-allowed"
                                    )}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {msg.type === "pathfinder" && (
                  <div className="bg-[#1e293b]/95 border border-white/10 p-6 rounded-3xl shadow-xl w-full prose prose-invert max-h-[50vh] overflow-y-auto">
                    <div
                      className="text-xs leading-relaxed text-neutral-200"
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                    />
                  </div>
                )}

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
          <div className="flex items-center justify-between bg-[#FFEF4D]/10 border border-[#FFEF4D]/20 px-4 py-2 rounded-t-xl text-xs font-semibold text-[#FFEF4D] mb-[-1px]">
            <span>
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

        <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-neutral-700 shadow-2xl overflow-hidden">
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
              "w-full px-4 py-3 resize-none border-none",
              "bg-transparent text-white text-sm focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-500 min-h-[48px]"
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
                    ? "bg-[#FFEF4D] text-[#020617] hover:bg-[#fff37a] shadow-lg shadow-[#FFEF4D]/10"
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
            className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-[#FFEF4D] transition-all text-[11px] h-8 px-3.5"
          >
            <FileText className="w-3.5 h-3.5 text-[#FFEF4D]" />
            <span>Study Notes</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => triggerQuickAction("tutor")}
            className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-[#FFEF4D] transition-all text-[11px] h-8 px-3.5"
          >
            <Cpu className="w-3.5 h-3.5 text-[#FFEF4D]" />
            <span>AI Tutor</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => triggerQuickAction("quiz")}
            className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-[#FFEF4D] transition-all text-[11px] h-8 px-3.5"
          >
            <Brain className="w-3.5 h-3.5 text-[#FFEF4D]" />
            <span>Quiz Lab</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => triggerQuickAction("pathfinder")}
            className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-[#FFEF4D] transition-all text-[11px] h-8 px-3.5"
          >
            <Compass className="w-3.5 h-3.5 text-[#FFEF4D]" />
            <span>Pathfinder</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
