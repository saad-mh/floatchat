"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { OceanographicNews } from "@/components/oceanographic-news";
import type { DemoQuestion } from "@/types/demo";
import demoData from "@/data/demo-questions.json";

interface ChatInterfaceProps {
  onQuestionSubmit: (question: DemoQuestion) => void;
  isCompact: boolean;
  onReset?: () => void;
  showReportButton?: boolean;
  onGoToReport?: () => void;
}

// Simple markdown to HTML converter
function convertMarkdownToHTML(text: string, isDetailed: boolean = false): string {
  let html = text;

  // Headers (## text)
  html = html.replace(/^##\s+(.+)$/gm, '<h4 class="font-semibold text-blue-600 dark:text-blue-400 mt-3 mb-1">$1</h4>');

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Emojis in larger size (only for detailed)
  if (isDetailed) {
    html = html.replace(
      /📍|📊|📈|🗺️|📋|🔥|🌍|⚡|🌡️|🔬|🔍|📏|🎯|🛰️|🌱/g,
      '<span class="text-lg">$&</span>'
    );
  }

  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>");

  // Bold headers with colons (**Text:**)
  html = html.replace(
    /^\*\*([^:]+):\*\*/gm,
    '<h4 class="font-semibold text-blue-600 dark:text-blue-400 mt-3 mb-1">$1:</h4>'
  );

  // List items with bold (- **Text:**)
  html = html.replace(/^- \*\*([^:]+):\*\*/gm, "<strong>• $1:</strong>");

  // Single line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
  isDetailedDescription?: boolean;
  questionId?: string;
  sqlQuery?: string;
  resultCount?: number;
}

export function ChatInterface({
  onQuestionSubmit,
  isCompact,
  onReset,
  showReportButton = false,
  onGoToReport,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showQueryId, setShowQueryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
  const [suggestionIndices, setSuggestionIndices] = useState([0, 1]);

  // Detect mobile viewport
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const scrollToBottom = () => {
    // Only scroll if we have actual messages to avoid unwanted initial scroll
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userQuery = inputValue;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: userQuery,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call the real backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userQuery,
          user_id: 'user_' + Date.now(),
          use_rag: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process query');
      }

      const data = await response.json();

      if (data.success) {
        // Add assistant response with summary
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: data.processed_data?.summary || "Query executed successfully.",
          timestamp: new Date(),
          sqlQuery: data.sql_query,
          resultCount: data.raw_data?.length || 0,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Add detailed explanation if available
        if (data.processed_data?.explanation) {
          setTimeout(() => {
            const explanationMessage: ChatMessage = {
              id: (Date.now() + 2).toString(),
              type: "assistant",
              content: data.processed_data.explanation,
              timestamp: new Date(),
              isDetailedDescription: true,
            };
            setMessages((prev) => [...prev, explanationMessage]);
          }, 500);
        }

        // Store the data globally for visualization components
        if (typeof window !== 'undefined') {
          (window as any).floatChatData = {
            map: data.processed_data?.map_data,
            chart: data.processed_data?.chart_data,
            table: data.processed_data?.table_data,
            heatmap: data.processed_data?.heatmap_data,
            raw: data.raw_data
          };
        }

        // Create a demo question from the real data to trigger visualizations
        const syntheticQuestion: DemoQuestion = {
          id: 'real_' + Date.now(),
          prompt: userQuery,
          primaryContentType: 'map',
          detailedDescription: data.processed_data?.explanation,
          cards: []
        };

        // ALWAYS add 3D Globe and 2D Map as first cards (they will use real data or fall back to demo)
        syntheticQuestion.cards.push({
          type: 'globe',
          title: 'Float Locations - 3D Globe View',
          dataUri: '/demo/maps/real_data.json'
        });
        syntheticQuestion.cards.push({
          type: 'flat-map',
          title: 'Float Locations - 2D Map',
          dataUri: '/demo/maps/real_data.json'
        });

        // Add other cards based on available data
        console.log('[ChatInterface] Checking chart_data:', data.processed_data?.chart_data);
        console.log('[ChatInterface] Has salinity?', data.processed_data?.chart_data?.salinity);
        console.log('[ChatInterface] Has temperature?', data.processed_data?.chart_data?.temperature);
        console.log('[ChatInterface] Has pressure?', data.processed_data?.chart_data?.pressure);

        // Check for new format (salinity/temperature/pressure) or old format (traces)
        const hasChartData = data.processed_data?.chart_data && (
          data.processed_data.chart_data.salinity?.available ||
          data.processed_data.chart_data.temperature?.available ||
          data.processed_data.chart_data.pressure?.available ||
          (data.processed_data.chart_data.traces && data.processed_data.chart_data.traces.length > 0)
        );

        console.log('[ChatInterface] hasChartData:', hasChartData);

        // ALWAYS add chart card - it will show available tabs
        syntheticQuestion.cards.push({
          type: 'chart',
          title: 'Depth Profiles',
          dataUri: '/demo/charts/real_data.json'
        });

        if (data.processed_data?.table_data?.rows?.length > 0) {
          syntheticQuestion.cards.push({
            type: 'table',
            title: 'Data Table',
            dataUri: '/demo/tables/real_data.json'
          });
        }

        syntheticQuestion.cards.push({
          type: 'summary',
          title: 'Query Summary',
          text: data.processed_data?.summary || 'Query executed successfully',
          provenance: ['Real-time data from Supabase']
        });

        // Trigger visualization panel
        onQuestionSubmit(syntheticQuestion);
      } else {
        throw new Error(data.error || 'Query failed');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "error",
        content: error instanceof Error ? error.message : "An error occurred while processing your query.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
  const containerClass = `h-full flex flex-col bg-background ${isCompact && !isMobile ? " rounded-xl shadow-xl border border-border" : ""
    }`;
  const isLanding = messages.length === 0 && !isCompact;

  // Ensure page starts at top when in landing mode
  useEffect(() => {
    if (isLanding && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isLanding]);

  return (
    <div className={containerClass}>
      {/* Header */}
      {!isLanding && (
        <motion.div
          className="p-4 md:p-6 border-b border-border"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
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
            <div className="flex items-center gap-2 flex-shrink-0">
              {showReportButton && onGoToReport && (
                <Button
                  onClick={onGoToReport}
                  size="sm"
                  className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary lg:hidden whitespace-nowrap"
                >
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Report</span>
                </Button>
              )}
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </motion.div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {isLanding && (
          <div className="min-h-full flex flex-col relative">
            {/* Theme Toggle and User Menu in upper right corner */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>

            <div className="flex-1 flex flex-col">
              <div className="w-full max-w-6xl mx-auto px-4 py-8">
                {/* Welcome Form - Centered */}
                <div className="w-full md:w-2/3 lg:w-1/2 max-w-2xl mx-auto mb-12">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                      <img
                        src="/logo.svg"
                        alt="FloatChat Logo"
                        className="w-9 h-9"
                      />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                      FloatChat
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6">
                      Ask questions about oceanographic data and get interactive
                      visualizations and analysis.
                    </p>
                  </div>
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
                  <div className="mt-4 grid gap-2">
                    {(() => {
                      const suggestions: DemoQuestion[] = [];
                      const usedSet = new Set(usedSuggestions);
                      let j = 0;
                      while (
                        suggestions.length < 4 &&
                        j < demoData.demo_questions.length
                      ) {
                        const q = demoData.demo_questions[j];
                        if (!usedSet.has(q.id))
                          suggestions.push(q as DemoQuestion);
                        j++;
                      }
                      j = 0;
                      while (
                        suggestions.length < 4 &&
                        j < demoData.demo_questions.length
                      ) {
                        const q = demoData.demo_questions[j];
                        if (usedSet.has(q.id))
                          suggestions.push(q as DemoQuestion);
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

                {/* Oceanographic News Section - Full Width */}
                <div className="w-full">
                  <OceanographicNews />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {!isLanding && messages.map((message, idx) => {
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
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"
                }`}
            >
              <div
                className={`${message.isDetailedDescription ? "max-w-[95%]" : "max-w-[80%]"
                  } rounded-2xl px-4 py-3 ${message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.type === "error"
                      ? "bg-destructive/10 text-destructive border border-destructive"
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
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{
                      __html: convertMarkdownToHTML(message.content, false)
                    }}
                  />
                )}
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {/* Query toggle for SQL display */}
                {message.sqlQuery && message.type === "assistant" && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-border"
                      onClick={() =>
                        setShowQueryId(
                          showQueryId === message.id ? null : message.id
                        )
                      }
                    >
                      {showQueryId === message.id ? "Hide Query" : "Show Query"}
                    </Button>
                    {showQueryId === message.id && (
                      <div className="mt-2 p-2 rounded bg-muted text-xs font-mono whitespace-pre-wrap border border-border">
                        {message.sqlQuery}
                      </div>
                    )}
                  </div>
                )}
                {/* Show result count if available */}
                {message.resultCount !== undefined && message.resultCount > 0 && (
                  <div className="mt-1 text-xs opacity-70">
                    Found {message.resultCount} records
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-card text-card-foreground border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing your query...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (hidden during landing) */}
      {!isLanding && (
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

          {(isCompact || (isMobile && messages.length > 0)) && (
            <div className="mt-3 flex flex-wrap gap-1 md:gap-2">
              {/* Show a random follow-up question for the active question */}
              {(() => {
                // Find the currently active question (last assistant message with questionId)
                const lastAssistantMsg = messages
                  .slice()
                  .reverse()
                  .find((m) => m.type === "assistant" && m.questionId);
                if (lastAssistantMsg && lastAssistantMsg.questionId) {
                  const activeQuestion = demoData.demo_questions.find(
                    (q) => q.id === lastAssistantMsg.questionId
                  );
                  if (
                    activeQuestion &&
                    Array.isArray(activeQuestion.followUpQuestions) &&
                    activeQuestion.followUpQuestions.length > 0
                  ) {
                    // Pick a random follow-up question
                    const randIdx = Math.floor(
                      Math.random() * activeQuestion.followUpQuestions.length
                    );
                    const followUp = activeQuestion.followUpQuestions[randIdx];
                    return (
                      <Button
                        key={followUp.prompt}
                        variant="outline"
                        size="sm"
                        onClick={() => setInputValue(followUp.prompt)}
                        className="text-xs border-border hover:bg-accent/50 px-2 md:px-3"
                      >
                        {followUp.prompt.slice(0, 40)}
                      </Button>
                    );
                  }
                }
                // Fallback: show default suggestions
                return suggestionIndices.map((sIdx, i) => (
                  <Button
                    key={demoData.demo_questions[sIdx].id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleCompactSuggestionClick(i)}
                    className="text-xs border-border hover:bg-accent/50 px-2 md:px-3"
                  >
                    {demoData.demo_questions[sIdx].prompt.slice(0, 20)}...
                  </Button>
                ));
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
