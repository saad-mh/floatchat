"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChatInterface } from "@/components/chat-interface"
import { ReportPanel } from "@/components/report-panel"
import type { DemoQuestion } from "@/types/demo"

export default function FloatChatPage() {
  const [activeQuestion, setActiveQuestion] = useState<DemoQuestion | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleQuestionSubmit = async (question: DemoQuestion) => {
    setActiveQuestion(question)
    setIsGenerating(true)

    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false)
    }, 2200)
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="flex h-full">
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
    </div>
  )
}
