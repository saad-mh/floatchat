"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInterface } from "@/components/chat-interface";
import { ReportPanel } from "@/components/report-panel";
import { AppWrapper } from "@/components/app-wrapper";
import type { DemoQuestion } from "@/types/demo";
import { Button } from "@/components/ui/button";

export default function FloatChatPage() {
  const [activeQuestion, setActiveQuestion] = useState<DemoQuestion | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMobileReport, setShowMobileReport] = useState(false);

  // Ensure page starts at top
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

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

  const handleGoToReport = () => {
    setShowMobileReport(true);
  };

  const handleReset = () => {
    setActiveQuestion(null);
    setIsGenerating(false);
    setShowMobileReport(false);
  };

  return (
    <AppWrapper>
      <div className="h-screen bg-background overflow-hidden">
        {/* Desktop Layout (Large screens) */}
        <div className="hidden lg:block h-full">
          <div className="flex h-full">
            {/* Chat Interface */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{
                width: activeQuestion ? "30%" : "100%",
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="p-4 flex-shrink-0 border-r border-border"
            >
              <ChatInterface
                onQuestionSubmit={handleQuestionSubmit}
                isCompact={!!activeQuestion}
                onReset={handleReset}
                showReportButton={!!activeQuestion}
                onGoToReport={handleGoToReport}
              />
            </motion.div>

            {/* Report Panel */}
            <AnimatePresence>
              {activeQuestion && (
                <motion.div
                  initial={{ x: "10%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "90%", opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="p-4 flex-1 bg-secondary/20"
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
        <div className="hidden md:block lg:hidden h-full relative">
          {/* Chat Interface - Always mounted but conditionally visible */}
          <motion.div
            className={`absolute inset-0 h-full ${
              !showMobileReport ? "z-10" : "z-0"
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: !showMobileReport ? 1 : 0,
              scale: !showMobileReport ? 1 : 0.95,
            }}
            transition={{ duration: 0.3 }}
            style={{
              pointerEvents: !showMobileReport ? "auto" : "none",
            }}
          >
            <div className="h-full p-3">
              <div className="h-full border border-border rounded-xl bg-card/95 overflow-hidden shadow-lg">
                <ChatInterface
                  onQuestionSubmit={handleQuestionSubmit}
                  isCompact={false}
                  onReset={handleReset}
                  showReportButton={!!activeQuestion}
                  onGoToReport={handleGoToReport}
                />
              </div>
            </div>
          </motion.div>

          {/* Report Panel - Conditionally rendered */}
          <AnimatePresence>
            {showMobileReport && (
              <motion.div
                className="absolute inset-0 h-full z-10"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <div className="h-full p-3">
                  <div className="h-full border border-border rounded-xl bg-card/95 overflow-hidden shadow-lg">
                    <ReportPanel
                      question={activeQuestion!}
                      isGenerating={isGenerating}
                      onBack={handleMobileBack}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Layout (Small screens) */}
        <div className="md:hidden h-full relative">
          {/* Chat Interface - Always mounted but conditionally visible */}
          <motion.div
            className={`absolute inset-0 h-full ${
              !showMobileReport ? "z-10" : "z-0"
            }`}
            initial={{ x: -20, opacity: 0 }}
            animate={{
              x: !showMobileReport ? 0 : -20,
              opacity: !showMobileReport ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            style={{
              pointerEvents: !showMobileReport ? "auto" : "none",
            }}
          >
            <ChatInterface
              onQuestionSubmit={handleQuestionSubmit}
              isCompact={false}
              onReset={handleReset}
              showReportButton={!!activeQuestion}
              onGoToReport={handleGoToReport}
            />
          </motion.div>

          {/* Report Panel - Conditionally rendered */}
          <AnimatePresence>
            {showMobileReport && (
              <motion.div
                className="absolute inset-0 h-full z-10"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.3 }}
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
    </AppWrapper>
  );
}
