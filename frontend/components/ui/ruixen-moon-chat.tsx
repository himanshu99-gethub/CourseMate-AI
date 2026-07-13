"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  FileUp,
  MonitorIcon,
  CircleUserRound,
  ArrowUpIcon,
  Paperclip,
  Code2,
  Palette,
  Layers,
  Rocket,
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
    if (textareaRef.current)
      textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

export default function RuixenMoonChat() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  const handleSend = () => {
    if (!message.trim()) return;
    setSent(true);
    setMessage("");
    adjustHeight(true);
    // Reset after brief flash (replace with real API call as needed)
    setTimeout(() => setSent(false), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center flex flex-col items-center"
      style={{
        // Unsplash: dark moody night sky / moon atmosphere
        backgroundImage:
          "url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80')",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />

      {/* Centered AI Title */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center z-10">
        <div className="text-center px-4">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg tracking-tight">
            Ruixen AI
          </h1>
          <p className="mt-3 text-neutral-300 text-lg max-w-md mx-auto">
            Build something amazing — just start typing below.
          </p>
        </div>
      </div>

      {/* Input Box Section */}
      <div className="relative w-full max-w-3xl mb-[15vh] px-4 z-10">
        <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-neutral-700 shadow-2xl">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your request... (Enter to send)"
            className={cn(
              "w-full px-4 py-3 resize-none border-none",
              "bg-transparent text-white text-sm",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-500 min-h-[48px]"
            )}
            style={{ overflow: "hidden" }}
          />

          {/* Footer Buttons */}
          <div className="flex items-center justify-between px-3 pb-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              {sent && (
                <span className="text-xs text-green-400 animate-pulse">
                  Sent!
                </span>
              )}
              <Button
                onClick={handleSend}
                disabled={!message.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all",
                  message.trim()
                    ? "bg-white text-black hover:bg-neutral-200 shadow-lg"
                    : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                )}
              >
                <ArrowUpIcon className="w-4 h-4" />
                <span className="text-xs font-semibold">Send</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-5">
          <QuickAction icon={<Code2 className="w-3.5 h-3.5" />} label="Generate Code" />
          <QuickAction icon={<Rocket className="w-3.5 h-3.5" />} label="Launch App" />
          <QuickAction icon={<Layers className="w-3.5 h-3.5" />} label="UI Components" />
          <QuickAction icon={<Palette className="w-3.5 h-3.5" />} label="Theme Ideas" />
          <QuickAction icon={<CircleUserRound className="w-3.5 h-3.5" />} label="User Dashboard" />
          <QuickAction icon={<MonitorIcon className="w-3.5 h-3.5" />} label="Landing Page" />
          <QuickAction icon={<FileUp className="w-3.5 h-3.5" />} label="Upload Docs" />
          <QuickAction icon={<ImageIcon className="w-3.5 h-3.5" />} label="Image Assets" />
        </div>
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
}

function QuickAction({ icon, label }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      className="flex items-center gap-1.5 rounded-full border-neutral-600 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-400 transition-all text-xs h-8 px-3"
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
