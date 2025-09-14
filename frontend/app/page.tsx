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

    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false);
    }, 2200);
  };

  const handleMobileBack = () => {
    setShowMobileReport(false);
  };

  return (
    <>
      <div className="h-screen bg-background overflow-hidden flex items-center justify-center">
        <div className="flex h-[90vh] w-[90vw] gap-x-8 items-stretch">
          {/* Chat Interface */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{
              width: activeQuestion ? "33.333%" : "100%",
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex-shrink-0 border border-border rounded-xl shadow-2xl bg-card/90 z-10"
          >
            <ChatInterface onQuestionSubmit={handleQuestionSubmit} isCompact={!!activeQuestion} />
          </motion.div>

          {/* Report Panel */}
          <AnimatePresence>
            {activeQuestion && (
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="flex-1 border border-border rounded-xl shadow-2xl bg-card/95 z-20"
                style={{ marginLeft: '0px' }}
              >
                <ReportPanel question={activeQuestion} isGenerating={isGenerating} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Layout */}
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
    </>
  );
}
