"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SidebarLayout from "@/components/ui/sidebar-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface Question {
  question: string;
  options: string[];
  answer: string;
}

function QuizContent() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);

  // Track user answers: index -> selected option
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam) {
      setTopic(topicParam);
    }
  }, [searchParams]);

  const handleStartQuiz = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setAnswers({});
    setQuizQuestions([]);

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, num_questions: numQuestions }),
      });
      const data = await res.json();
      setQuizQuestions(data.quiz);
      setQuizStarted(true);
    } catch (err) {
      alert("Evaluation initialization failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionIdx: number, selectedOption: string) => {
    if (answers[questionIdx] !== undefined) return;

    setAnswers((prev) => ({
      ...prev,
      [questionIdx]: selectedOption,
    }));
  };

  const handleRestart = () => {
    setQuizStarted(false);
    setQuizQuestions([]);
    setAnswers({});
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-8 shadow-2xl max-w-4xl mx-auto">
      {!quizStarted ? (
        <div className="space-y-6">
          {/* Input Config */}
          <div>
            <label htmlFor="quiz-topic" className="block text-lg font-bold text-[#FFEF4D] mb-3">
              Enter Topic for Quiz
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                id="quiz-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Psychology, Macroeconomics, AI Algorithms"
                className="flex-grow bg-[#020617] border border-white/5 p-4 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#FFEF4D] focus:ring-1 focus:ring-[#FFEF4D]"
              />
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full sm:w-44 bg-[#020617] border border-white/5 p-4 rounded-xl text-white focus:outline-none focus:border-[#FFEF4D]"
              >
                <option value="5">5 Questions</option>
                <option value="10">10 Questions</option>
                <option value="15">15 Questions</option>
                <option value="20">20 Questions</option>
              </select>
            </div>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStartQuiz}
            disabled={isLoading || !topic.trim()}
            className="w-full h-14 bg-[#FFEF4D] text-[#020617] hover:bg-[#fff37a] font-extrabold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-[#FFEF4D]/10"
          >
            {isLoading ? "Calibrating evaluation parameters... Stand by." : "START QUIZ"}
          </Button>
        </div>
      ) : (
        <div>
          {/* Header Status */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold text-white">{topic} Evaluation</h2>
              <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mt-1">
                Score: {Object.keys(answers).filter((idx) => answers[Number(idx)] === quizQuestions[Number(idx)].answer).length} / {quizQuestions.length}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFEF4D]/20 bg-[#FFEF4D]/5 px-3 py-1 text-xs font-semibold text-[#FFEF4D]">
              Assessment in Progress
            </span>
          </div>

          {/* Question Blocks */}
          <div className="space-y-10 mb-10">
            {quizQuestions.map((q, idx) => {
              const selectedOption = answers[idx];
              const isCorrect = selectedOption === q.answer;

              return (
                <div key={idx} className="space-y-4">
                  <h3 className="text-base font-bold text-white leading-relaxed flex items-start gap-2">
                    <span className="text-[#FFEF4D] font-extrabold">0{idx + 1}.</span>
                    {q.question}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((option) => {
                      const isOptionSelected = selectedOption === option;
                      const isThisOptionCorrect = q.answer === option;

                      return (
                        <button
                          key={option}
                          onClick={() => handleSelectOption(idx, option)}
                          className={cn(
                            "text-left p-4 rounded-xl text-sm font-semibold transition-all border outline-none",
                            selectedOption === undefined
                              ? "bg-[#020617]/50 border-white/5 hover:border-[#FFEF4D] hover:bg-[#1e293b]"
                              : isThisOptionCorrect
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold"
                              : isOptionSelected
                              ? "bg-rose-500/10 border-rose-500 text-rose-400"
                              : "bg-[#020617]/30 border-white/5 text-neutral-500 cursor-not-allowed"
                          )}
                        >
                          <span className="flex items-center justify-between">
                            <span>{option}</span>
                            {selectedOption !== undefined && isThisOptionCorrect && (
                              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                            )}
                            {selectedOption !== undefined && isOptionSelected && !isCorrect && (
                              <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Restart Button */}
          <Button
            onClick={handleRestart}
            className="w-full h-12 bg-[#1e293b] hover:bg-[#334155] border border-white/10 text-white font-bold rounded-xl transition-all"
          >
            New Evaluation Sequence
          </Button>
        </div>
      )}

      {/* Loader */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-[#FFEF4D] gap-3">
          <span className="h-10 w-10 border-4 border-[#FFEF4D]/20 border-t-[#FFEF4D] rounded-full animate-spin" />
          <p className="text-sm font-bold text-neutral-400">
            Formulating questions... Stand by.
          </p>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <SidebarLayout>
      {/* Header */}
      <div className="mb-10">
        <h1 className="bg-gradient-to-r from-white via-slate-300 to-[#FFEF4D] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          Quiz Practice Lab
        </h1>
        <p className="mt-3 text-lg text-neutral-300">
          Test your knowledge on any subject. Enter a topic below and start your quiz.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-12 text-[#FFEF4D] gap-3">
          <span className="h-10 w-10 border-4 border-[#FFEF4D]/20 border-t-[#FFEF4D] rounded-full animate-spin" />
          <p className="text-sm font-bold text-neutral-400">Loading Quiz Interface...</p>
        </div>
      }>
        <QuizContent />
      </Suspense>
    </SidebarLayout>
  );
}
