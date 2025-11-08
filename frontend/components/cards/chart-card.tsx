"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Download, TrendingDown } from "lucide-react";
import { fetchDemoData } from "@/lib/demo-data";
import { useTheme } from "next-themes";

interface ChartCardProps {
  dataUri?: string;
}

export function ChartCard({ dataUri }: ChartCardProps) {
  const { theme } = useTheme();
  const [chartData, setChartData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{
    traceIdx: number;
    pointIdx: number;
  } | null>(null);
  const [visibleTraces, setVisibleTraces] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadChartData = async () => {
      try {
        // Check if we have real backend data first
        if (typeof window !== 'undefined' && (window as any).floatChatData?.chart) {
          const data = (window as any).floatChatData.chart;
          if (data && data.traces && data.traces.length > 0) {
            setChartData(data);
            setVisibleTraces(new Set(data.traces.map((trace: any) => trace.id)));
            setLoading(false);
            return;
          }
        }

        // Fallback to demo data only if no real data available
        const questionId = dataUri?.includes("dq01")
          ? "dq01"
          : dataUri?.includes("dq02")
            ? "dq02"
            : dataUri?.includes("dq04")
              ? "dq04"
              : "dq01";
        const data = await fetchDemoData(questionId, "chart");
        setChartData(data);
        setVisibleTraces(new Set(data.traces.map((trace: any) => trace.id)));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load chart data"
        );
      } finally {
        setLoading(false);
      }
    };
    loadChartData();
  }, [dataUri]);

  const handleDownload = () => {
    if (!chartData) return;
    let csv = `float,depth,value\n`;
    chartData.traces.forEach((trace: any) => {
      trace.depths.forEach((depth: number, i: number) => {
        csv += `${trace.float},${depth},${trace.values[i]}\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chartData.variable}_profiles.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Creating charts</p>
        </div>
      </Card>
    );
  }

  if (error || !chartData) {
    return (
      <Card className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {error || "No chart data available"}
          </p>
        </div>
      </Card>
    );
  }

  const colors =
    theme === "light"
      ? ["#4A90E2", "#475569", "#64748b", "#3b82f6", "#10b981"]
      : ["#4A90E2", "#6B7280", "#9CA3AF", "#60A5FA", "#34D399"];

  // Filter out invalid values (NaN, null, undefined)
  const allValues = chartData.traces
    .flatMap((t: any) => t.values)
    .filter((v: any) => typeof v === 'number' && !isNaN(v));
  const allDepths = chartData.traces
    .flatMap((t: any) => t.depths)
    .filter((d: any) => typeof d === 'number' && !isNaN(d));

  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
  const minDepth = allDepths.length > 0 ? Math.min(...allDepths) : 0;
  const maxDepth = allDepths.length > 0 ? Math.max(...allDepths) : 1000;

  return (
    <Card className="space-y-3 sm:space-y-4 p-3 sm:p-4 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingDown className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
            {chartData.variable} ({chartData.units})
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className="text-xs px-2 py-1 whitespace-nowrap"
          >
            {Array.from(visibleTraces).length} of {chartData.traces.length}{" "}
            profiles
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-xs border-border"
            onClick={handleDownload}
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>

      {/* Profile toggles */}
      <div className="flex flex-wrap gap-2 mb-2 justify-center">
        {chartData.traces.map((trace: any, idx: number) => {
          const isVisible = visibleTraces.has(trace.id);
          const color = colors[idx % colors.length];
          return (
            <Button
              key={trace.id}
              variant={isVisible ? "default" : "outline"}
              size="sm"
              className={`text-xs px-2 py-1 flex items-center gap-1 border ${isVisible ? "border-primary" : "border-border opacity-60"
                }`}
              style={{
                backgroundColor: isVisible ? color + "22" : undefined,
                color: color,
              }}
              onClick={() => {
                setVisibleTraces((prev) => {
                  const newSet = new Set(prev);
                  if (newSet.has(trace.id)) {
                    newSet.delete(trace.id);
                  } else {
                    newSet.add(trace.id);
                  }
                  return newSet;
                });
              }}
            >
              <span className="font-mono">{trace.float}</span>
              <span>{isVisible ? "Hide" : "Show"}</span>
            </Button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="w-full overflow-hidden">
        <div className="relative h-48 sm:h-56 md:h-64 w-full">
          <svg
            className="w-full h-full"
            viewBox="0 0 1000 300"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Chart axes */}
            <line
              x1="60"
              y1="20"
              x2="60"
              y2="260"
              stroke="#ccc"
              strokeWidth="2"
            />
            <line
              x1="60"
              y1="260"
              x2="940"
              y2="260"
              stroke="#ccc"
              strokeWidth="2"
            />

            {/* Y-axis labels (depth) */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
              <text
                key={i}
                x="50"
                y={260 - p * 240}
                fontSize="12"
                fill="#888"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {Math.round(minDepth + p * (maxDepth - minDepth))}m
              </text>
            ))}

            {/* X-axis labels (values) */}
            {[0, 0.5, 1].map((p, i) => (
              <text
                key={i}
                x={60 + p * 880}
                y="280"
                fontSize="12"
                fill="#888"
                textAnchor="middle"
              >
                {(minValue + p * (maxValue - minValue)).toFixed(2)}
              </text>
            ))}

            {/* Chart traces */}
            {chartData.traces.map((trace: any, traceIdx: number) => {
              if (!visibleTraces.has(trace.id)) return null;
              const color = colors[traceIdx % colors.length];
              const points = trace.depths
                .map(
                  (
                    depth: number,
                    i: number
                  ): {
                    x: number;
                    y: number;
                    value: number;
                    depth: number;
                    idx: number;
                  } | null => {
                    const value = trace.values[i];
                    // Skip invalid data points
                    if (typeof depth !== 'number' || isNaN(depth) ||
                      typeof value !== 'number' || isNaN(value)) {
                      return null;
                    }
                    const x =
                      60 +
                      ((value - minValue) / (maxValue - minValue)) * 880;
                    const y =
                      260 - ((depth - minDepth) / (maxDepth - minDepth)) * 240;
                    // Check if calculated coordinates are valid
                    if (isNaN(x) || isNaN(y)) {
                      return null;
                    }
                    return { x, y, value, depth, idx: i };
                  }
                )
                .filter((p): p is NonNullable<typeof p> => p !== null);
              const linePath = points
                .map(
                  (p: { x: number; y: number }, i: number) =>
                    `${i === 0 ? "M" : "L"}${p.x},${p.y}`
                )
                .join(" ");
              return (
                <g key={trace.id}>
                  <path
                    d={linePath}
                    stroke={color}
                    strokeWidth="2"
                    fill="none"
                  />
                  {points.map(
                    (
                      p: {
                        x: number;
                        y: number;
                        value: number;
                        depth: number;
                        idx: number;
                      },
                      i: number
                    ) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={
                          hovered?.traceIdx === traceIdx &&
                            hovered?.pointIdx === i
                            ? 8
                            : 5
                        }
                        fill={color}
                        stroke="#fff"
                        strokeWidth="1"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() =>
                          setHovered({ traceIdx, pointIdx: i })
                        }
                        onMouseLeave={() => setHovered(null)}
                      />
                    )
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hovered &&
            (() => {
              const trace = chartData.traces[hovered.traceIdx];
              const value = trace.values[hovered.pointIdx];
              const depth = trace.depths[hovered.pointIdx];
              const color = colors[hovered.traceIdx % colors.length];
              // Calculate position as percentage of SVG viewBox
              const xPercent =
                ((60 + ((value - minValue) / (maxValue - minValue)) * 880) /
                  1000) *
                100;
              const yPercent =
                ((260 - ((depth - minDepth) / (maxDepth - minDepth)) * 240) /
                  300) *
                100;
              return (
                <div
                  className="absolute z-10 px-2 py-1 sm:px-3 sm:py-2 rounded-lg shadow-xl border border-border text-xs bg-popover/95 text-popover-foreground"
                  style={{
                    left: `${xPercent}%`,
                    top: `${yPercent}%`,
                    minWidth: 100,
                    maxWidth: 150,
                    pointerEvents: "none",
                    transform: "translate(-50%, -100%)",
                    marginTop: "-8px",
                  }}
                >
                  <div className="font-medium text-xs" style={{ color }}>
                    {trace.float}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Depth: {typeof depth === 'number' && !isNaN(depth) ? depth.toFixed(1) : 'N/A'}m
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {chartData.variable}: {typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A'} {chartData.units}
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Chart statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs text-muted-foreground bg-muted/20 rounded-lg p-2 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="whitespace-nowrap">
            Range: {typeof minValue === 'number' && !isNaN(minValue) ? minValue.toFixed(2) : 'N/A'} - {typeof maxValue === 'number' && !isNaN(maxValue) ? maxValue.toFixed(2) : 'N/A'}{" "}
            {chartData.units}
          </span>
          <span className="whitespace-nowrap">Max depth: {typeof maxDepth === 'number' && !isNaN(maxDepth) ? maxDepth.toFixed(1) : 'N/A'}m</span>
        </div>
        <div className="text-center sm:text-right">
          {chartData.traces.reduce(
            (sum: number, t: any) => sum + t.values.length,
            0
          )}{" "}
          data points
        </div>
      </div>
    </Card>
  );
}
