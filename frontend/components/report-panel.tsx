"use client";

import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoQuestion } from "@/types/demo";
import { ReportCard } from "@/components/report-card";

interface ReportPanelProps {
  question: DemoQuestion;
  isGenerating: boolean;
  onBack?: () => void;
}

export function ReportPanel({
  question,
  isGenerating,
  onBack,
}: ReportPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 md:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="md:hidden"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                Analysis Report
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">
                {question.prompt}
              </p>
            </div>
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        {isGenerating ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Looking through data</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 md:space-y-6"
          >
            {question.cards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <ReportCard card={card} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
