"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Download, TrendingDown, Droplets, Thermometer, Gauge } from "lucide-react";
import { fetchDemoData } from "@/lib/demo-data";
import { useTheme } from "next-themes";

interface ChartCardProps {
  dataUri?: string;
  chartData?: any; // Accept chart data as prop
}

type VariableType = 'salinity' | 'temperature' | 'pressure';

export function ChartCard({ dataUri, chartData: propChartData }: ChartCardProps) {
  const { theme } = useTheme();
  const [chartData, setChartData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVariable, setActiveVariable] = useState<VariableType>('salinity');
  const [hovered, setHovered] = useState<{
    traceIdx: number;
    pointIdx: number;
  } | null>(null);
  const [visibleTraces, setVisibleTraces] = useState<Record<VariableType, Set<string>>>({
    salinity: new Set(),
    temperature: new Set(),
    pressure: new Set()
  });

  useEffect(() => {
    const loadChartData = async () => {
      try {
        console.log('[ChartCard] Loading chart data...');
        console.log('[ChartCard] propChartData:', propChartData);
        console.log('[ChartCard] window.floatChatData:', typeof window !== 'undefined' ? (window as any).floatChatData : 'undefined');

        // First check if data was passed as prop
        if (propChartData) {
          console.log('[ChartCard] Using prop data');
          const data = propChartData;

          // Check if new format (with salinity/temperature/pressure keys)
          if (data && (data.salinity || data.temperature || data.pressure)) {
            setChartData(data);

            // Set first available variable as active
            if (data.salinity?.available) {
              setActiveVariable('salinity');
            } else if (data.temperature?.available) {
              setActiveVariable('temperature');
            } else if (data.pressure?.available) {
              setActiveVariable('pressure');
            }

            setLoading(false);
            return;
          }

          // Old format fallback - convert to new format
          if (data && data.traces && data.traces.length > 0) {
            const converted: any = {
              salinity: { traces: [] as any[], available: false, variable: "Salinity", units: "PSU", xLabel: "Salinity (PSU)", yLabel: "Depth (m)" },
              temperature: { traces: [] as any[], available: false, variable: "Temperature", units: "°C", xLabel: "Temperature (°C)", yLabel: "Depth (m)" },
              pressure: { traces: [] as any[], available: false, variable: "Pressure", units: "dbar", xLabel: "Pressure (dbar)", yLabel: "Depth (m)" }
            };

            // Separate traces by variable
            data.traces.forEach((trace: any) => {
              if (trace.variable === 'Salinity' || trace.id?.includes('salinity')) {
                converted.salinity.traces.push({ ...trace, visible: false });
                converted.salinity.available = true;
              } else if (trace.variable === 'Temperature' || trace.id?.includes('temperature')) {
                converted.temperature.traces.push({ ...trace, visible: false });
                converted.temperature.available = true;
              }
            });

            setChartData(converted);
            setActiveVariable(converted.salinity.available ? 'salinity' : 'temperature');
            setLoading(false);
            return;
          }
        }

        // Check if we have real backend data in window
        if (typeof window !== 'undefined' && (window as any).floatChatData?.chart) {
          console.log('[ChartCard] Using window.floatChatData');
          const data = (window as any).floatChatData.chart;
          console.log('[ChartCard] Chart data from window:', data);

          // Check if new format (with salinity/temperature/pressure keys)
          if (data && (data.salinity || data.temperature || data.pressure)) {
            console.log('[ChartCard] New format detected in window!');
            setChartData(data);

            // Set first available variable as active
            if (data.salinity?.available) {
              setActiveVariable('salinity');
            } else if (data.temperature?.available) {
              setActiveVariable('temperature');
            } else if (data.pressure?.available) {
              setActiveVariable('pressure');
            }

            setLoading(false);
            return;
          }

          // Old format fallback
          if (data && data.traces && data.traces.length > 0) {
            const converted: any = {
              salinity: { traces: [] as any[], available: false, variable: "Salinity", units: "PSU", xLabel: "Salinity (PSU)", yLabel: "Depth (m)" },
              temperature: { traces: [] as any[], available: false, variable: "Temperature", units: "°C", xLabel: "Temperature (°C)", yLabel: "Depth (m)" },
              pressure: { traces: [] as any[], available: false, variable: "Pressure", units: "dbar", xLabel: "Pressure (dbar)", yLabel: "Depth (m)" }
            };

            data.traces.forEach((trace: any) => {
              if (trace.variable === 'Salinity' || trace.id?.includes('salinity')) {
                converted.salinity.traces.push({ ...trace, visible: false });
                converted.salinity.available = true;
              } else if (trace.variable === 'Temperature' || trace.id?.includes('temperature')) {
                converted.temperature.traces.push({ ...trace, visible: false });
                converted.temperature.available = true;
              } else if (trace.variable === 'Pressure' || trace.id?.includes('pressure')) {
                converted.pressure.traces.push({ ...trace, visible: false });
                converted.pressure.available = true;
              }
            });

            setChartData(converted);
            setActiveVariable(converted.salinity.available ? 'salinity' : 'temperature');
            setLoading(false);
            return;
          }
        }

        // Fallback to demo data
        const questionId = dataUri?.includes("dq01") ? "dq01" : dataUri?.includes("dq02") ? "dq02" : dataUri?.includes("dq04") ? "dq04" : "dq01";
        const data = await fetchDemoData(questionId, "chart");

        // Convert demo data to new format
        const converted = {
          salinity: { traces: data.traces.map((t: any) => ({ ...t, visible: false })), available: true, variable: "Salinity", units: "PSU", xLabel: "Salinity (PSU)", yLabel: "Depth (m)" },
          temperature: { traces: [], available: false, variable: "Temperature", units: "°C", xLabel: "Temperature (°C)", yLabel: "Depth (m)" },
          pressure: { traces: [], available: false, variable: "Pressure", units: "dbar", xLabel: "Pressure (dbar)", yLabel: "Depth (m)" }
        };

        setChartData(converted);
        setActiveVariable('salinity');
        console.log('[ChartCard] Using demo data fallback');
      } catch (err) {
        console.error('[ChartCard] Error loading data:', err);
        setError(err instanceof Error ? err.message : "Failed to load chart data");
      } finally {
        console.log('[ChartCard] Loading complete. chartData:', chartData);
        setLoading(false);
      }
    };
    loadChartData();
  }, [dataUri, propChartData]);

  const handleDownload = () => {
    if (!chartData) return;
    const activeData = chartData[activeVariable];
    if (!activeData) return;

    console.log('[ChartCard] Download - activeVariable:', activeVariable);
    console.log('[ChartCard] Download - visibleTraces:', visibleTraces[activeVariable]);
    console.log('[ChartCard] Download - traces count:', activeData.traces.length);

    let csv = `float,depth,value\n`;
    let rowCount = 0;

    activeData.traces.forEach((trace: any) => {
      console.log('[ChartCard] Processing trace:', trace.id, 'visible:', visibleTraces[activeVariable].has(trace.id));
      console.log('[ChartCard] Trace depths:', trace.depths?.length, 'values:', trace.values?.length);

      const xData = trace.depths;
      if (!xData) {
        console.log('[ChartCard] No depths data for trace:', trace.id);
        return;
      }

      xData.forEach((x: number, i: number) => {
        if (visibleTraces[activeVariable].has(trace.id)) {
          csv += `${trace.float},${x},${trace.values[i]}\n`;
          rowCount++;
        }
      });
    });

    console.log('[ChartCard] CSV rows generated:', rowCount);

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeVariable}_profiles.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  console.log('[ChartCard] Render - loading:', loading, 'error:', error, 'chartData:', chartData);

  if (loading) {
    console.log('[ChartCard] Rendering loading state');
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
    console.log('[ChartCard] Rendering error state:', error);
    return (
      <Card className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error || "No chart data available"}</p>
        </div>
      </Card>
    );
  }

  const activeData = chartData[activeVariable];
  console.log('[ChartCard] Active variable:', activeVariable, 'activeData:', activeData);
  console.log('[ChartCard] activeData.available:', activeData?.available);
  console.log('[ChartCard] activeData.traces length:', activeData?.traces?.length);
  if (activeData?.traces?.length > 0) {
    console.log('[ChartCard] First trace sample:', activeData.traces[0]);
  }

  if (!activeData || !activeData.available) {
    console.log('[ChartCard] No active data available');
    return (
      <Card className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No {activeVariable} data available</p>
        </div>
      </Card>
    );
  }

  console.log('[ChartCard] Rendering chart with', activeData.traces?.length, 'traces');

  const colors = theme === "light"
    ? ["#4A90E2", "#475569", "#64748b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
    : ["#4A90E2", "#6B7280", "#9CA3AF", "#60A5FA", "#34D399", "#fbbf24", "#f87171", "#a78bfa"];

  // Get x and y data - all variables use the same format (values vs depths)
  const getXData = (trace: any) => trace.values;
  const getYData = (trace: any) => trace.depths;

  // Filter out invalid values
  const allXValues = activeData.traces.flatMap((t: any) => getXData(t) || []).filter((v: any) => typeof v === 'number' && !isNaN(v));
  const allYValues = activeData.traces.flatMap((t: any) => getYData(t) || []).filter((v: any) => typeof v === 'number' && !isNaN(v));

  const minX = allXValues.length > 0 ? Math.min(...allXValues) : 0;
  const maxX = allXValues.length > 0 ? Math.max(...allXValues) : 100;
  const minY = allYValues.length > 0 ? Math.min(...allYValues) : 0;
  const maxY = allYValues.length > 0 ? Math.max(...allYValues) : 1000;

  return (
    <Card className="space-y-3 sm:space-y-4 p-3 sm:p-4 w-full">
      {/* Variable Tabs */}
      <div className="flex flex-wrap gap-2 justify-center border-b border-border pb-3">
        <Button
          variant={activeVariable === 'salinity' ? 'default' : 'outline'}
          size="sm"
          disabled={!chartData.salinity?.available}
          onClick={() => setActiveVariable('salinity')}
          className="flex items-center gap-2"
        >
          <Droplets className="w-4 h-4" />
          Salinity
          {chartData.salinity?.available && (
            <Badge variant="secondary" className="ml-1">{chartData.salinity.traces.length}</Badge>
          )}
        </Button>
        <Button
          variant={activeVariable === 'temperature' ? 'default' : 'outline'}
          size="sm"
          disabled={!chartData.temperature?.available}
          onClick={() => setActiveVariable('temperature')}
          className="flex items-center gap-2"
        >
          <Thermometer className="w-4 h-4" />
          Temperature
          {chartData.temperature?.available && (
            <Badge variant="secondary" className="ml-1">{chartData.temperature.traces.length}</Badge>
          )}
        </Button>
        <Button
          variant={activeVariable === 'pressure' ? 'default' : 'outline'}
          size="sm"
          disabled={!chartData.pressure?.available}
          onClick={() => setActiveVariable('pressure')}
          className="flex items-center gap-2"
        >
          <Gauge className="w-4 h-4" />
          Pressure
          {chartData.pressure?.available && (
            <Badge variant="secondary" className="ml-1">{chartData.pressure.traces.length}</Badge>
          )}
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingDown className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
            {activeData.variable} ({activeData.units})
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs px-2 py-1 whitespace-nowrap">
            {visibleTraces[activeVariable].size} of {activeData.traces.length} profiles
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-xs border-border"
            onClick={handleDownload}
            disabled={visibleTraces[activeVariable].size === 0}
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>

      {/* Profile toggles - All hidden by default */}
      <div className="flex flex-wrap gap-2 mb-2 justify-center max-h-32 overflow-y-auto">
        {activeData.traces.map((trace: any, idx: number) => {
          const isVisible = visibleTraces[activeVariable].has(trace.id);
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
                color: isVisible ? color : undefined,
              }}
              onClick={() => {
                setVisibleTraces((prev) => {
                  const newSet = new Set(prev[activeVariable]);
                  if (newSet.has(trace.id)) {
                    newSet.delete(trace.id);
                  } else {
                    newSet.add(trace.id);
                  }
                  return { ...prev, [activeVariable]: newSet };
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
          <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet">
            {/* Chart axes */}
            <line x1="60" y1="20" x2="60" y2="260" stroke="#ccc" strokeWidth="2" />
            <line x1="60" y1="260" x2="940" y2="260" stroke="#ccc" strokeWidth="2" />

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
              <text key={i} x="50" y={260 - p * 240} fontSize="12" fill="#888" textAnchor="end" dominantBaseline="middle">
                {Math.round(minY + p * (maxY - minY))}
              </text>
            ))}

            {/* X-axis labels */}
            {[0, 0.5, 1].map((p, i) => (
              <text key={i} x={60 + p * 880} y="280" fontSize="12" fill="#888" textAnchor="middle">
                {(minX + p * (maxX - minX)).toFixed(2)}
              </text>
            ))}

            {/* Axis labels */}
            <text x="500" y="295" fontSize="14" fill="#666" textAnchor="middle">
              {activeData.xLabel}
            </text>
            <text x="30" y="140" fontSize="14" fill="#666" textAnchor="middle" transform="rotate(-90 30 140)">
              {activeData.yLabel}
            </text>

            {/* Chart traces */}
            {activeData.traces.map((trace: any, traceIdx: number) => {
              if (!visibleTraces[activeVariable].has(trace.id)) return null;

              const color = colors[traceIdx % colors.length];
              const xData = getXData(trace);
              const yData = getYData(trace);

              if (!xData || !yData) return null;

              const points = xData
                .map((x: number, i: number) => {
                  const y = yData[i];
                  if (typeof x !== 'number' || isNaN(x) || typeof y !== 'number' || isNaN(y)) {
                    return null;
                  }
                  const px = 60 + ((x - minX) / (maxX - minX)) * 880;
                  const py = 260 - ((y - minY) / (maxY - minY)) * 240;
                  if (isNaN(px) || isNaN(py)) return null;
                  return { x: px, y: py, value: x, depth: y, idx: i };
                })
                .filter((p: any): p is NonNullable<typeof p> => p !== null);

              const linePath = points.map((p: any, i: number) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

              return (
                <g key={trace.id}>
                  <path d={linePath} stroke={color} strokeWidth="2" fill="none" />
                  {points.map((p: any, i: number) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={hovered?.traceIdx === traceIdx && hovered?.pointIdx === i ? 8 : 5}
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
            const trace = activeData.traces[hovered.traceIdx];
            const xData = getXData(trace);
            const yData = getYData(trace);
            if (!xData || !yData) return null;

            const xValue = xData[hovered.pointIdx];
            const yValue = yData[hovered.pointIdx];
            const color = colors[hovered.traceIdx % colors.length];

            const xPercent = ((60 + ((xValue - minX) / (maxX - minX)) * 880) / 1000) * 100;
            const yPercent = ((260 - ((yValue - minY) / (maxY - minY)) * 240) / 300) * 100;

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
                <div className="font-medium text-xs" style={{ color }}>{trace.float}</div>
                <div className="text-muted-foreground text-xs">
                  Depth: {yValue?.toFixed(1)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {activeData.variable}: {xValue?.toFixed(2)} {activeData.units}
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
            Range: {minX.toFixed(2)} - {maxX.toFixed(2)} {activeData.units}
          </span>
          <span className="whitespace-nowrap">
            {activeVariable === 'pressure' ? 'Max pressure' : 'Max depth'}: {maxY.toFixed(1)}{activeVariable === 'pressure' ? ' dbar' : 'm'}
          </span>
        </div>
        <div className="text-center sm:text-right">
          {activeData.traces.reduce((sum: number, t: any) => sum + (t.values?.length || 0), 0)} data points
        </div>
      </div>
    </Card>
  );
}
