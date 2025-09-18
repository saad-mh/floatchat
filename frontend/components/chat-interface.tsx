"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import type { DemoQuestion } from "@/types/demo";
import demoData from "@/data/demo-questions.json";

interface ChatInterfaceProps {
  onQuestionSubmit: (question: DemoQuestion) => void;
  isCompact: boolean;
  onReset?: () => void;
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isDetailedDescription?: boolean;
  questionId?: string;
}

export function ChatInterface({
  onQuestionSubmit,
  isCompact,
  onReset,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showQueryId, setShowQueryId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
  // Compact suggestion indices state
  const [suggestionIndices, setSuggestionIndices] = useState([0, 1]);

  // Detect mobile viewport
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Reset indices if demo questions change or out of bounds
    if (
      suggestionIndices.some((idx) => idx >= demoData.demo_questions.length)
    ) {
      setSuggestionIndices([0, 1]);
    }
  }, [demoData.demo_questions.length, suggestionIndices]);

  const handleReset = () => {
    // Clear all chat state
    setMessages([]);
    setInputValue("");
    setShowQueryId(null);
    setUsedSuggestions([]);
    setSuggestionIndices([0, 1]);

    // Call parent reset function to clear activeQuestion
    if (onReset) {
      onReset();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Find matching demo question
    const matchedQuestion = demoData.demo_questions.find(
      (q) => q.prompt.toLowerCase() === inputValue.toLowerCase()
    ) as DemoQuestion | undefined;

    if (matchedQuestion) {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "user",
        content: inputValue,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");

      // Submit the question
      onQuestionSubmit(matchedQuestion);

      // Add assistant response after delay
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content:
            "I found relevant data for your query. Check the report panel for detailed analysis.",
          timestamp: new Date(),
          questionId: matchedQuestion.id,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setShowQueryId(null);

        // Add detailed description after another delay if available
        if (matchedQuestion.detailedDescription) {
          setTimeout(() => {
            const descriptionMessage: ChatMessage = {
              id: (Date.now() + 2).toString(),
              type: "assistant",
              content: matchedQuestion.detailedDescription!,
              timestamp: new Date(),
              isDetailedDescription: true,
              questionId: matchedQuestion.id,
            };
            setMessages((prev) => [...prev, descriptionMessage]);
          }, 2500);
        }
      }, 1500);
    } else {
      // Handle unrecognized question
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "user",
        content: inputValue,
        timestamp: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "I'm sorry, I don't recognize that question. Please try one of the suggested demo questions.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInputValue("");
    }
  };

  const handleSuggestionClick = (question: DemoQuestion) => {
    setInputValue(question.prompt);
    setUsedSuggestions((prev) => [...prev, question.id]);
  };

  // Compact suggestion click handler
  const handleCompactSuggestionClick = (idx: number) => {
    handleSuggestionClick(
      demoData.demo_questions[suggestionIndices[idx]] as DemoQuestion
    );
    // Find next unused index
    let nextIdx = Math.max(...suggestionIndices) + 1;
    if (nextIdx >= demoData.demo_questions.length) nextIdx = 0;
    setSuggestionIndices((prev) =>
      prev.map((v, i) => (i === idx ? nextIdx : v))
    );
  };

  // Only show rounded corners, border, and shadow when isCompact and not mobile (no extra padding)
  const containerClass = `h-full flex flex-col bg-background ${isCompact && !isMobile ? 'rounded-xl shadow-xl border border-border' : ''}`;
  return (
    <div className={containerClass}>
      {/* Header */}
      <div className=" md:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 md:gap-3 focus:outline-none rounded-lg p-1 -m-1 cursor-pointer"
            title="Reset FloatChat"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="FloatChat Logo"
                className="w-5 h-5 md:w-6 md:h-6"
              />
            </div>
            <div className="text-left">
              <h1 className="text-lg md:text-xl font-bold text-foreground text-left">
                FloatChat
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground text-left">
                AI Ocean Data Interface
              </p>
            </div>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 && !isCompact && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-6 md:py-12"
          >
            <button
              onClick={handleReset}
              className="focus:outline-none rounded-2xl p-2 -m-2 cursor-pointer"
              title="Reset FloatChat"
            >
              <div className="w-20 h-20 md:w-16 md:h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <img
                  src="/logo.svg"
                  alt="FloatChat Logo"
                  className="w-10 h-10 md:w-10 md:h-10"
                />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 md:mb-3">
                Welcome to FloatChat
              </h2>
            </button>
            <p className="text-muted-foreground mb-6 md:mb-8 max-w-md mx-auto px-4 text-sm md:text-base">
              Ask questions about Argo ocean float data and get interactive
              visualizations and analysis.
            </p>

            {/* Demo Question Suggestions */}
            <div className="space-y-3 max-w-2xl mx-auto px-4">
              <p className="text-sm font-medium text-foreground mb-3 md:mb-4">
                Try these demo questions:
              </p>
              <div className="grid gap-2 md:gap-3">
                {(() => {
                  const suggestions: DemoQuestion[] = [];
                  const usedSet = new Set(usedSuggestions);
                  let i = 0,
                    j = 0;
                  while (
                    suggestions.length < 4 &&
                    j < demoData.demo_questions.length
                  ) {
                    const q = demoData.demo_questions[j];
                    if (!usedSet.has(q.id)) {
                      suggestions.push(q as DemoQuestion);
                    }
                    j++;
                  }
                  j = 0;
                  while (
                    suggestions.length < 4 &&
                    j < demoData.demo_questions.length
                  ) {
                    const q = demoData.demo_questions[j];
                    if (usedSet.has(q.id)) {
                      suggestions.push(q as DemoQuestion);
                    }
                    j++;
                  }
                  return suggestions.map((question) => (
                    <Card
                      key={question.id}
                      className="p-3 md:p-4 cursor-pointer hover:bg-accent/50 transition-colors text-left"
                      onClick={() =>
                        handleSuggestionClick(question as DemoQuestion)
                      }
                    >
                      <p className="text-xs md:text-sm text-foreground leading-relaxed">
                        {question.prompt}
                      </p>
                    </Card>
                  ));
                })()}
              </div>
            </div>
          </motion.div>
        )}

        {/* Chat Messages */}
        {messages.map((message, idx) => {
          const isAssistant = message.type === "assistant";
          let matchedQuestion: DemoQuestion | undefined = undefined;
          const isLastNonDescriptionAssistant =
            isAssistant &&
            !message.isDetailedDescription &&
            idx ===
              messages.findLastIndex(
                (m) => m.type === "assistant" && !m.isDetailedDescription
              );

          // Find the matched question for query display
          if (message.questionId) {
            matchedQuestion = demoData.demo_questions.find(
              (q) => q.id === message.questionId
            ) as DemoQuestion | undefined;
          }
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`${
                  message.isDetailedDescription ? "max-w-[95%]" : "max-w-[80%]"
                } rounded-2xl px-4 py-3 ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.isDetailedDescription
                    ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-card-foreground border border-blue-200 dark:border-blue-800"
                    : "bg-card text-card-foreground border border-border"
                }`}
              >
                {message.isDetailedDescription ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Detailed Analysis & Context
                      </h3>
                    </div>
                    <div
                      className="text-sm leading-relaxed space-y-2 prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(
                            /📍|📊|📈|🗺️|📋|🔥|🌍|⚡|🌡️|🔬|🔍|📏|🎯|🛰️|🌱|📍/g,
                            '<span class="text-lg">$&</span>'
                          )
                          .replace(/\n\n/g, "</p><p>")
                          .replace(
                            /^\*\*([^:]+):\*\*/gm,
                            '<h4 class="font-semibold text-blue-600 dark:text-blue-400 mt-3 mb-1">$1:</h4>'
                          )
                          .replace(
                            /^- \*\*([^:]+):\*\*/gm,
                            "<strong>• $1:</strong>"
                          ),
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {/* Query toggle for the last non-description assistant message */}
                {isLastNonDescriptionAssistant &&
                  matchedQuestion &&
                  !message.isDetailedDescription && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-border"
                        onClick={() =>
                          setShowQueryId(
                            showQueryId === matchedQuestion.id
                              ? null
                              : matchedQuestion.id
                          )
                        }
                      >
                        {showQueryId === matchedQuestion.id
                          ? "Hide Query"
                          : "Show Query"}
                      </Button>
                      {showQueryId === matchedQuestion.id && (
                        <div className="mt-2 p-2 rounded bg-muted text-xs font-mono whitespace-pre-wrap border border-border">
                          {matchedQuestion.querieGenerated}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2 md:gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about ocean data..."
            className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground text-sm md:text-base"
          />
          <Button
            type="submit"
            size="default"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 md:px-6 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {isCompact && (
          <div className="mt-3 flex flex-wrap gap-1 md:gap-2">
            {suggestionIndices.map((sIdx, i) => (
              <Button
                key={demoData.demo_questions[sIdx].id}
                variant="outline"
                size="sm"
                onClick={() => handleCompactSuggestionClick(i)}
                className="text-xs border-border hover:bg-accent/50 px-2 md:px-3"
              >
                {demoData.demo_questions[sIdx].prompt.slice(0, 20)}...
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
