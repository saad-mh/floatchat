
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
  const [hovered, setHovered] = useState<{ traceIdx: number; pointIdx: number } | null>(null);
  const [visibleTraces, setVisibleTraces] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadChartData = async () => {
      try {
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
        setError(err instanceof Error ? err.message : "Failed to load chart data");
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
          <p className="text-sm text-muted-foreground">{error || "No chart data available"}</p>
        </div>
      </Card>
    );
  }

  const colors = theme === "light"
    ? ["#4A90E2", "#475569", "#64748b", "#3b82f6", "#10b981"]
    : ["#4A90E2", "#6B7280", "#9CA3AF", "#60A5FA", "#34D399"];

  const allValues = chartData.traces.flatMap((t: any) => t.values);
  const allDepths = chartData.traces.flatMap((t: any) => t.depths);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const minDepth = Math.min(...allDepths);
  const maxDepth = Math.max(...allDepths);

  return (
    <Card className="space-y-4 p-4 w-300">
      {/* Header */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
            {chartData.variable} ({chartData.units})
          </span>
        </div>
        <Badge variant="secondary" className="text-xs px-2 py-1 whitespace-nowrap">
          {Array.from(visibleTraces).length} of {chartData.traces.length} profiles
        </Badge>
        <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs border-border" onClick={handleDownload}>
          <Download className="w-4 h-4" /> Download
        </Button>
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
              className={`text-xs px-2 py-1 flex items-center gap-1 border ${isVisible ? "border-primary" : "border-border opacity-60"}`}
              style={{ backgroundColor: isVisible ? color + "22" : undefined, color: color }}
              onClick={() => {
                setVisibleTraces(prev => {
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
      <div className="flex justify-center items-center w-full">
        <div className="relative h-64 w-full max-w-5xl">
          <svg className="absolute inset-0 w-full h-full">

          <line x1="40" y1="10" x2="40" y2="230" stroke="#ccc" strokeWidth="2" />
          <line x1="40" y1="230" x2="calc(100% - 40)" y2="230" stroke="#ccc" strokeWidth="2" />

          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <text key={i} x={10} y={230 - p * 220} fontSize="10" fill="#888">{Math.round(minDepth + p * (maxDepth - minDepth))}m</text>
          ))}


          {(() => {
            const chartWidth = 900;
            return [0, 0.5, 1].map((p, i) => (
              <text key={i} x={40 + p * chartWidth} y={245} fontSize="10" fill="#888">{(minValue + p * (maxValue - minValue)).toFixed(2)}</text>
            ));
          })()}
          {chartData.traces.map((trace: any, traceIdx: number) => {
            if (!visibleTraces.has(trace.id)) return null;
            const color = colors[traceIdx % colors.length];
            const chartWidth = window.innerWidth > 900 ? 900 : 320;
            const points = trace.depths.map((depth: number, i: number): { x: number; y: number; value: number; depth: number; idx: number } => {
              const x = 40 + ((trace.values[i] - minValue) / (maxValue - minValue)) * chartWidth;
              const y = 230 - ((depth - minDepth) / (maxDepth - minDepth)) * 220;
              return { x, y, value: trace.values[i], depth, idx: i };
            });
            const linePath = points.map((p: { x: number; y: number }, i: number) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
            return (
              <g key={trace.id}>
                <path d={linePath} stroke={color} strokeWidth="2" fill="none" />
                {points.map((p: { x: number; y: number; value: number; depth: number; idx: number }, i: number) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hovered?.traceIdx === traceIdx && hovered?.pointIdx === i ? 7 : 5}
                    fill={color}
                    stroke="#fff"
                    strokeWidth="1"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered({ traceIdx, pointIdx: i })}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hovered && (() => {
          const trace = chartData.traces[hovered.traceIdx];
          const value = trace.values[hovered.pointIdx];
          const depth = trace.depths[hovered.pointIdx];
          const color = colors[hovered.traceIdx % colors.length];
          const chartWidth = window.innerWidth > 900 ? 900 : 320;
          const x = 40 + ((value - minValue) / (maxValue - minValue)) * chartWidth;
          const y = 230 - ((depth - minDepth) / (maxDepth - minDepth)) * 220;
          return (
            <div
              className="absolute z-10 px-3 py-2 rounded-lg shadow-xl border border-border text-xs bg-popover/95 text-popover-foreground"
              style={{ left: x + 10, top: y - 40, minWidth: 120, pointerEvents: "none" }}
            >
              <div className="font-medium" style={{ color }}>{trace.float}</div>
              <div className="text-muted-foreground">Depth: {depth}m</div>
              <div className="text-muted-foreground">{chartData.variable}: {value.toFixed(2)} {chartData.units}</div>
            </div>
          );
        })()}
        </div>
      </div>

      {/* Chart statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span>Range: {minValue.toFixed(2)} - {maxValue.toFixed(2)} {chartData.units}</span>
          <span className="ml-4">Max depth: {maxDepth}m</span>
        </div>
        <div>
          {chartData.traces.reduce((sum: number, t: any) => sum + t.values.length, 0)} data points
        </div>
      </div>
    </Card>
  );
}
