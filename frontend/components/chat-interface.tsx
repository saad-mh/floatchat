"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
// Update DemoQuestion type to match JSON structure
interface DemoQuestion {
  id: string;
  prompt: string;
  primaryContentType: string;
  cards: Array<any>;
  querieGenerated?: string;
}
import demoData from "@/data/demo-questions.json";

interface ChatInterfaceProps {
  onQuestionSubmit: (question: DemoQuestion) => void;
  isCompact: boolean;
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatInterface({
  onQuestionSubmit,
  isCompact,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showQueryId, setShowQueryId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        };
        setMessages((prev) => [...prev, assistantMessage]);
  setShowQueryId(null);
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
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">FloatChat</h1>
            <p className="text-sm text-muted-foreground">AI Ocean Data Interface</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !isCompact && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Welcome to FloatChat
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Ask questions about Argo ocean float data and get interactive
              visualizations and analysis.
            </p>

            {/* Demo Question Suggestions */}
            <div className="space-y-3 max-w-2xl mx-auto">
              <p className="text-sm font-medium text-foreground mb-4">
                Try these demo questions:
              </p>
              <div className="grid gap-2">
                {demoData.demo_questions.slice(0, 4).map((question) => (
                  <Card
                    key={question.id}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors text-left"
                    onClick={() =>
                      handleSuggestionClick(question as DemoQuestion)
                    }
                  >
                    <p className="text-sm text-foreground">{question.prompt}</p>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Chat Messages */}
        {messages.map((message, idx) => {
          const isAssistant = message.type === "assistant";
          // Only show the query toggle for the most recent assistant message that matches a demo question
          let matchedQuestion: DemoQuestion | undefined = undefined;
          const isLastAssistant = isAssistant && idx === messages.length - 1 && showQueryId !== null;
          if (isLastAssistant) {
            matchedQuestion = demoData.demo_questions.find((q) => q.id === showQueryId);
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
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground border border-border"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {/* Query toggle for the last assistant message only */}
                {isLastAssistant && matchedQuestion && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-border"
                      onClick={() => setShowQueryId(showQueryId === matchedQuestion.id ? null : matchedQuestion.id)}
                    >
                      {showQueryId === matchedQuestion.id ? "Hide Query" : "Show Query"}
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
      <div className="p-6 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about ocean data..."
            className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {isCompact && (
          <div className="mt-3 flex flex-wrap gap-2">
            {demoData.demo_questions.slice(0, 3).map((question) => (
              <Button
                key={question.id}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(question as DemoQuestion)}
                className="text-xs border-border hover:bg-accent/50"
              >
                {question.prompt.slice(0, 30)}...
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
