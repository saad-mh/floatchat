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
      <div className="h-screen bg-background overflow-hidden flex items-center justify-center">
        <div className="flex h-[90vh] w-[90vw] gap-x-8 items-stretch">
          {/* Chat Interface */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{
              width: activeQuestion ? "33.333%" : "100%",
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
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
                transition={{ duration: 1, ease: "easeInOut" }}
                className="flex-1 border border-border rounded-xl shadow-2xl bg-card/95 z-20"
                style={{ marginLeft: '0px' }}
              >
                <ReportPanel question={activeQuestion} isGenerating={isGenerating} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
  )
}
