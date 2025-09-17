"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInterface } from "@/components/chat-interface";
import { ReportPanel } from "@/components/report-panel";
import type { DemoQuestion } from "@/types/demo";

export default function FloatChatPage() {
  const [activeQuestion, setActiveQuestion] = useState<DemoQuestion | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMobileReport, setShowMobileReport] = useState(false);

  const handleQuestionSubmit = (question: DemoQuestion) => {
    setActiveQuestion(question);
    setIsGenerating(true);
    setShowMobileReport(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2200);
  };

  const handleMobileBack = () => {
    setShowMobileReport(false);
  };

  const handleReset = () => {
    setActiveQuestion(null);
    setIsGenerating(false);
    setShowMobileReport(false);
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Desktop Layout (Large screens) */}
      <div className="hidden lg:block h-full">
        <div className="flex h-full">
          {/* Chat Interface */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{
              width: activeQuestion ? "25%" : "100%",
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex-shrink-0 border-r border-border"
          >
            <ChatInterface
              onQuestionSubmit={handleQuestionSubmit}
              isCompact={!!activeQuestion}
              onReset={handleReset}
            />
          </motion.div>

          {/* Report Panel */}
          <AnimatePresence>
            {activeQuestion && (
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="flex-1 bg-secondary/20"
              >
                <ReportPanel
                  question={activeQuestion}
                  isGenerating={isGenerating}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tablet Layout (Medium screens) */}
      <div className="hidden md:block lg:hidden h-full">
        <AnimatePresence mode="wait">
          {!showMobileReport ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-full p-3"
            >
              <div className="h-full border border-border rounded-xl bg-card/95 overflow-hidden shadow-lg">
                <ChatInterface
                  onQuestionSubmit={handleQuestionSubmit}
                  isCompact={false}
                  onReset={handleReset}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="report"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-full p-3"
            >
              <div className="h-full border border-border rounded-xl bg-card/95 overflow-hidden shadow-lg">
                <ReportPanel
                  question={activeQuestion!}
                  isGenerating={isGenerating}
                  onBack={handleMobileBack}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Layout (Small screens) */}
      <div className="md:hidden h-full">
        <AnimatePresence mode="wait">
          {!showMobileReport ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ChatInterface
                onQuestionSubmit={handleQuestionSubmit}
                isCompact={false}
                onReset={handleReset}
              />
            </motion.div>
          ) : (
            <motion.div
              key="report"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ReportPanel
                question={activeQuestion!}
                isGenerating={isGenerating}
                onBack={handleMobileBack}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
