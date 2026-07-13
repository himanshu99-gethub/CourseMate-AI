"use client";

import React, { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/ui/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowUp, Bot, Send, Sparkles } from "lucide-react";
import { marked } from "marked";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hello! I am your AI Study Partner. How can I help you today?",
      isUser: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<"general" | "notes">("general");
  const [hasDocument, setHasDocument] = useState(false);
  const [documentTopic, setDocumentTopic] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if a document context has been uploaded
    async function checkDocumentStatus() {
      try {
        const res = await fetch("/api/document-status");
        const data = await res.json();
        if (data.has_document) {
          setHasDocument(true);
          setDocumentTopic(data.topic);
        }
      } catch (err) {
        console.error("Failed to fetch document status:", err);
      }
    }
    checkDocumentStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), text: userMessage, isUser: true }]);
    setIsLoading(true);

    const isNotes = chatMode === "notes";
    const url = isNotes ? "/api/rag-chat" : "/api/chat";
    const payload = isNotes ? { query: userMessage } : { message: userMessage };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: data.response, isUser: false },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Sorry, the neural link was interrupted. Please re-engage.",
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

  return (
    <SidebarLayout>
      <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto rounded-2xl border border-white/5 bg-[#0f172a] overflow-hidden shadow-2xl">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0f172a]/50 p-4">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black tracking-wider uppercase text-[#FFEF4D]">
              ACADEMIC AI ASSISTANT
            </h1>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Context mode toggle */}
          {hasDocument && (
            <div className="flex items-center gap-3">
              <div className="flex bg-[#020617] rounded-xl p-1 border border-white/5 text-xs font-bold">
                <button
                  onClick={() => setChatMode("general")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-colors",
                    chatMode === "general" ? "bg-[#FFEF4D] text-[#020617]" : "text-neutral-400"
                  )}
                >
                  🤖 Tutor
                </button>
                <button
                  onClick={() => setChatMode("notes")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-colors",
                    chatMode === "notes" ? "bg-[#FFEF4D] text-[#020617]" : "text-neutral-400"
                  )}
                >
                  📄 Notes
                </button>
              </div>
              <span className="text-[10px] text-neutral-400 font-bold max-w-[120px] truncate">
                Context: <strong className="text-[#FFEF4D]">{documentTopic}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex max-w-[85%] flex-col rounded-2xl p-4 text-sm leading-relaxed border shadow-md animate-in fade-in zoom-in-95 duration-200",
                msg.isUser
                  ? "self-end bg-[#FFEF4D] text-[#020617] border-transparent font-semibold ml-auto rounded-br-none"
                  : "self-start bg-[#1e293b] text-neutral-100 border-white/5 rounded-bl-none border-l-4 border-l-[#FFEF4D]"
              )}
            >
              {!msg.isUser && (
                <div
                  className="prose prose-invert prose-sm"
                  dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                />
              )}
              {msg.isUser && <div>{msg.text}</div>}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="self-start flex gap-1 items-center bg-[#1e293b] border border-white/5 border-l-4 border-l-[#FFEF4D] rounded-2xl rounded-bl-none px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#FFEF4D] animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-[#FFEF4D] animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-[#FFEF4D] animate-bounce" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-white/5 bg-[#020617]/50 flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === "notes"
                ? `Query notes context: "${documentTopic}"...`
                : "Ask the AI tutor anything..."
            }
            className="flex-1 min-h-[48px] max-h-36 resize-none bg-[#0f172a] border border-white/5 focus-visible:ring-[#FFEF4D]/50 focus-visible:ring-1 text-white placeholder-neutral-500 rounded-xl"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-xl bg-[#FFEF4D] text-[#020617] hover:bg-[#fff37a] flex items-center justify-center transition-all disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </SidebarLayout>
  );
}
