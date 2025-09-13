"use client"

import { useEffect, useState } from "react"
import { BarChart3, TrendingDown, Info, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ChartData } from "@/types/demo"
import { fetchDemoData } from "@/lib/demo-data"

interface ChartCardProps {
  dataUri?: string
}

export function ChartCard({ dataUri }: ChartCardProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleTraces, setVisibleTraces] = useState<Set<string>>(new Set())
  const [hoveredPoint, setHoveredPoint] = useState<{ traceId: string; pointIndex: number } | null>(null)

  useEffect(() => {
    const loadChartData = async () => {
      try {
        const questionId = dataUri?.includes("dq01")
          ? "dq01"
          : dataUri?.includes("dq02")
            ? "dq02"
            : dataUri?.includes("dq04")
              ? "dq04"
              : "dq01"
        const data = await fetchDemoData(questionId, "chart")

        if (data) {
          setChartData(data)
          // Initially show all traces
          setVisibleTraces(new Set(data.traces.map((trace: any) => trace.id)))
        } else {
          setError("No chart data available")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chart data")
      } finally {
        setLoading(false)
      }
    }

    loadChartData()
  }, [dataUri])

  const toggleTrace = (traceId: string) => {
    setVisibleTraces((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(traceId)) {
        newSet.delete(traceId)
      } else {
        newSet.add(traceId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading chart...</p>
        </div>
      </div>
    )
  }

  if (error || !chartData) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error || "No chart data available"}</p>
        </div>
      </div>
    )
  }

  // Calculate ranges for scaling
  const visibleData = chartData.traces.filter((trace) => visibleTraces.has(trace.id))
  const allValues = visibleData.flatMap((trace) => trace.values)
  const allDepths = visibleData.flatMap((trace) => trace.depths)

  if (allValues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No traces selected</p>
        </div>
      </div>
    )
  }

  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const maxDepth = Math.max(...allDepths)
  const valueRange = maxValue - minValue

  // Color palette for traces
  const colors = ["#4A90E2", "#6B7280", "#9CA3AF", "#60A5FA", "#34D399"]

  return (
    <div className="space-y-4">
      {/* Chart header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {chartData.variable} ({chartData.units})
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {visibleData.length} of {chartData.traces.length} profiles
          </Badge>
        </div>

        {/* Legend controls */}
        <div className="flex items-center gap-2">
          {chartData.traces.map((trace, index) => {
            const isVisible = visibleTraces.has(trace.id)
            const color = colors[index % colors.length]

            return (
              <Button
                key={trace.id}
                variant="ghost"
                size="sm"
                onClick={() => toggleTrace(trace.id)}
                className={`h-6 px-2 text-xs ${isVisible ? "bg-accent/50" : "opacity-50"}`}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{trace.float}</span>
                  {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-64 bg-muted/20 rounded-lg p-4 relative">
        <div className="flex h-full">
          {/* Y-axis (Depth) */}
          <div className="w-12 flex flex-col justify-between text-xs text-muted-foreground pr-3">
            <span className="font-mono">0m</span>
            <span className="font-mono">{Math.round(maxDepth / 4)}m</span>
            <span className="font-mono">{Math.round(maxDepth / 2)}m</span>
            <span className="font-mono">{Math.round((3 * maxDepth) / 4)}m</span>
            <span className="font-mono">{maxDepth}m</span>
          </div>

          {/* Chart plotting area */}
          <div className="flex-1 relative border-l border-b border-border bg-gradient-to-b from-transparent to-muted/10">
            {/* Grid lines */}
            <div className="absolute inset-0">
              {/* Horizontal grid lines (depth) */}
              {[0, 25, 50, 75, 100].map((percent) => (
                <div
                  key={`h-${percent}`}
                  className="absolute w-full border-t border-border/20"
                  style={{ top: `${percent}%` }}
                />
              ))}
              {/* Vertical grid lines (values) */}
              {[0, 25, 50, 75, 100].map((percent) => (
                <div
                  key={`v-${percent}`}
                  className="absolute h-full border-l border-border/20"
                  style={{ left: `${percent}%` }}
                />
              ))}
            </div>

            {/* Profile traces */}
            {visibleData.map((trace, traceIndex) => {
              const color = colors[chartData.traces.findIndex((t) => t.id === trace.id) % colors.length]
              const points = trace.depths.map((depth, i) => {
                const x = ((trace.values[i] - minValue) / valueRange) * 100
                const y = (depth / maxDepth) * 100
                return { x, y, value: trace.values[i], depth }
              })

              return (
                <div key={trace.id} className="absolute inset-0">
                  {/* Profile line */}
                  <svg className="w-full h-full overflow-visible">
                    <defs>
                      <filter id={`glow-${trace.id}`}>
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Connecting line */}
                    <polyline
                      points={points.map((p) => `${p.x}%,${p.y}%`).join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      className="drop-shadow-sm"
                      style={{ filter: `url(#glow-${trace.id})` }}
                    />

                    {/* Data points */}
                    {points.map((point, i) => (
                      <circle
                        key={i}
                        cx={`${point.x}%`}
                        cy={`${point.y}%`}
                        r={hoveredPoint?.traceId === trace.id && hoveredPoint?.pointIndex === i ? "5" : "3"}
                        fill={color}
                        stroke="white"
                        strokeWidth="1"
                        className="cursor-pointer transition-all duration-200 drop-shadow-sm"
                        onMouseEnter={() => setHoveredPoint({ traceId: trace.id, pointIndex: i })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </svg>
                </div>
              )
            })}

            {/* Tooltip */}
            {hoveredPoint && (
              <div className="absolute pointer-events-none z-20">
                {(() => {
                  const trace = chartData.traces.find((t) => t.id === hoveredPoint.traceId)
                  if (!trace) return null

                  const point = trace.depths.map((depth, i) => ({
                    x: ((trace.values[i] - minValue) / valueRange) * 100,
                    y: (depth / maxDepth) * 100,
                    value: trace.values[i],
                    depth,
                  }))[hoveredPoint.pointIndex]

                  return (
                    <div
                      className="bg-popover/95 backdrop-blur-sm text-popover-foreground px-3 py-2 rounded-lg shadow-xl border border-border text-xs"
                      style={{
                        left: `${point.x}%`,
                        top: `${point.y}%`,
                        transform: "translate(-50%, -120%)",
                      }}
                    >
                      <div className="font-medium">{trace.float}</div>
                      <div className="text-muted-foreground">Depth: {point.depth}m</div>
                      <div className="text-muted-foreground">
                        {chartData.variable}: {point.value.toFixed(2)} {chartData.units}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="absolute -bottom-6 left-12 right-0 flex justify-between text-xs text-muted-foreground font-mono">
          <span>{minValue.toFixed(2)}</span>
          <span>{((minValue + maxValue) / 2).toFixed(2)}</span>
          <span>{maxValue.toFixed(2)}</span>
        </div>

        {/* X-axis title */}
        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
          {chartData.variable} ({chartData.units})
        </div>
      </div>

      {/* Chart statistics */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>
              Range: {minValue.toFixed(2)} - {maxValue.toFixed(2)} {chartData.units}
            </span>
          </div>
          <div>Max depth: {maxDepth}m</div>
        </div>
        <div>{visibleData.reduce((sum, trace) => sum + trace.values.length, 0)} data points</div>
      </div>
    </div>
  )
}
