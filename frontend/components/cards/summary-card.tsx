"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, ExternalLink, Copy, Check, AlertCircle, Info, TrendingUp } from "lucide-react"
import { useState } from "react"

interface SummaryCardProps {
  text?: string
  provenance?: string[]
}

export function SummaryCard({ text, provenance }: SummaryCardProps) {
  const [copiedText, setCopiedText] = useState(false)

  const handleCopyText = async () => {
    if (text) {
      await navigator.clipboard.writeText(text)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    }
  }

  if (!text) {
    return (
      <div className="flex items-center justify-center h-32 bg-muted/20 rounded-lg">
        <div className="text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No summary available</p>
        </div>
      </div>
    )
  }

  // Parse text for key insights (simple pattern matching)
  const insights = []
  if (text.includes("profiles")) {
    const profileMatch = text.match(/(\d+)\s+profiles?/i)
    if (profileMatch) {
      insights.push({ type: "data", label: "Profiles", value: profileMatch[1] })
    }
  }
  if (text.includes("floats")) {
    const floatMatch = text.match(/(\d+)\s+floats?/i)
    if (floatMatch) {
      insights.push({ type: "data", label: "Floats", value: floatMatch[1] })
    }
  }
  if (text.includes("ranges") || text.includes("range")) {
    const rangeMatch = text.match(/([\d.]+)[-–]([\d.]+)\s*(\w+)/i)
    if (rangeMatch) {
      insights.push({ type: "range", label: "Range", value: `${rangeMatch[1]}-${rangeMatch[2]} ${rangeMatch[3]}` })
    }
  }

  return (
    <div className="space-y-4">
      {/* Key insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {insights.map((insight, index) => (
            <Card key={index} className="p-3 bg-muted/20 border-border">
              <div className="flex items-center gap-2">
                {insight.type === "data" ? (
                  <TrendingUp className="w-4 h-4 text-primary" />
                ) : (
                  <Info className="w-4 h-4 text-primary" />
                )}
                <div>
                  <div className="text-xs text-muted-foreground">{insight.label}</div>
                  <div className="text-sm font-medium text-foreground">{insight.value}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Main summary text */}
      <div className="relative">
        <div className="prose prose-sm max-w-none">
          <div className="bg-muted/20 rounded-lg p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-foreground leading-relaxed text-sm mb-0">{text}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Copy button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyText}
          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copiedText ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>

      {/* Data provenance */}
      {provenance && provenance.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">Data Sources & Provenance</h4>
          </div>

          <div className="grid gap-2">
            {provenance.map((source, index) => {
              const isNetCDF = source.includes(".nc")
              const isJSON = source.includes(".json")
              const isCSV = source.includes(".csv")

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                      <FileText className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground font-mono">{source}</div>
                      <div className="text-xs text-muted-foreground">
                        {isNetCDF
                          ? "NetCDF Ocean Data File"
                          : isJSON
                            ? "JSON Metadata File"
                            : isCSV
                              ? "CSV Data Export"
                              : "Data File"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        isNetCDF
                          ? "bg-blue-500/20 text-blue-400"
                          : isJSON
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {isNetCDF ? "NetCDF" : isJSON ? "JSON" : isCSV ? "CSV" : "DATA"}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Provenance summary */}
          <div className="text-xs text-muted-foreground bg-muted/10 rounded p-2 border border-border/50">
            <div className="flex items-center gap-1 mb-1">
              <Info className="w-3 h-3" />
              <span className="font-medium">Data Quality Note</span>
            </div>
            <p>
              All data sources have been validated and processed through the Argo Quality Control system. Timestamps
              reflect data collection times in UTC.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
