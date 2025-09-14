"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChatInterface } from "@/components/chat-interface"
import { ReportPanel } from "@/components/report-panel"
import type { DemoQuestion } from "@/types/demo"

export default function FloatChatPage() {
  const [activeQuestion, setActiveQuestion] = useState<DemoQuestion | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showMobileReport, setShowMobileReport] = useState(false)

  const handleQuestionSubmit = async (question: DemoQuestion) => {
    setActiveQuestion(question)
    setIsGenerating(true)
    setShowMobileReport(true)

    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false)
    }, 2200)
  }

  const handleMobileBack = () => {
    setShowMobileReport(false)
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-full">
        {/* Chat Interface */}
        <motion.div
          initial={{ width: "100%" }}
          animate={{
            width: activeQuestion ? "33.333%" : "100%",
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex-shrink-0 border-r border-border"
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
              transition={{ duration: 1, ease: "easeInOut" }}
              className="flex-1 bg-secondary/20"
            >
              <ReportPanel question={activeQuestion} isGenerating={isGenerating} />
            </motion.div>
          )}
        </AnimatePresence>
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
              <ChatInterface onQuestionSubmit={handleQuestionSubmit} isCompact={false} />
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
  )
}
