"use client";

import { useEffect, useState, useRef } from "react";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import type { HeatmapData } from "@/types/demo";
import { fetchDemoData } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";

import "leaflet/dist/leaflet.css";

// Add custom CSS for clickable tooltips
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    .clickable-tooltip {
      pointer-events: auto !important;
      cursor: pointer;
    }
    .clickable-tooltip .leaflet-tooltip-content {
      margin: 0 !important;
      padding: 0 !important;
    }
    .leaflet-tooltip-top:before {
      border-top-color: rgba(255,255,255,0.95) !important;
    }
  `;
  if (!document.head.querySelector("style[data-clickable-tooltip]")) {
    style.setAttribute("data-clickable-tooltip", "true");
    document.head.appendChild(style);
  }
}

// Simplified Leaflet heatmap component
const LeafletHeatmapComponent = dynamic(
  () => {
    return import("react-leaflet").then((reactLeaflet) => {
      const { MapContainer, TileLayer, useMap } = reactLeaflet;

      function HeatmapLayer({ heatmapData }: { heatmapData: HeatmapData }) {
        const map = useMap();
        const heatLayerRef = useRef<any>(null);
        const tooltipRef = useRef<any>(null);

        useEffect(() => {
          if (!map || !heatmapData || typeof window === "undefined") return;

          let L: any = null;
          let cleanup: (() => void) | null = null;

          const loadLeafletAndCreateHeatmap = async () => {
            try {
              // Dynamically import Leaflet
              const LeafletModule = await import("leaflet");
              L = LeafletModule.default || LeafletModule;

              // Try to import leaflet.heat
              try {
                await import("leaflet.heat");
              } catch (heatError) {
                console.warn("leaflet.heat not available, using fallback");
              }

              // Generate dense heatmap points
              const generateHeatmapPoints = () => {
                const points: [number, number, number][] = [];
                const centerLat = heatmapData.location.lat;
                const centerLon = heatmapData.location.lon;

                const gridResolution = 0.05;
                const extent = 2.0;

                for (let i = -extent; i <= extent; i += gridResolution) {
                  for (let j = -extent; j <= extent; j += gridResolution) {
                    const lat = centerLat + i;
                    const lng = centerLon + j;

                    const distanceFromCenter = Math.sqrt(i * i + j * j);
                    const baseIntensity = Math.exp(-distanceFromCenter / 1.5);

                    const eddyPattern = Math.sin(i * 3) * Math.cos(j * 3) * 0.3;
                    const gradientPattern = Math.exp(-Math.abs(i) / 2) * 0.4;
                    const turbulence = Math.sin(i * 10) * Math.cos(j * 8) * 0.1;

                    let intensity =
                      baseIntensity +
                      eddyPattern +
                      gradientPattern +
                      turbulence;
                    intensity = Math.max(
                      0.01,
                      Math.min(1.0, intensity + Math.random() * 0.1)
                    );

                    if (intensity > 0.05) {
                      points.push([lat, lng, intensity]);
                    }
                  }
                }

                return points;
              };

              // Remove existing layer
              if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
              }

              const points = generateHeatmapPoints();

              // Try using leaflet.heat if available
              if (L && (L as any).heatLayer) {
                try {
                  heatLayerRef.current = (L as any)
                    .heatLayer(points, {
                      radius: 30,
                      blur: 20,
                      maxZoom: 17,
                      max: 1.0,
                      minOpacity: 0.1,
                      gradient: {
                        0.0: "#000080",
                        0.1: "#0000FF",
                        0.2: "#0080FF",
                        0.3: "#00FFFF",
                        0.4: "#00FF80",
                        0.5: "#00FF00",
                        0.6: "#80FF00",
                        0.7: "#FFFF00",
                        0.8: "#FF8000",
                        0.9: "#FF4000",
                        1.0: "#FF0000",
                      },
                    })
                    .addTo(map);

                  // Click-based tooltip management
                  const activeTooltips = new Set<any>();

                  // Remove a specific tooltip
                  const removeTooltip = (tooltip: any) => {
                    try {
                      if (tooltip && map.hasLayer && map.hasLayer(tooltip)) {
                        map.removeLayer(tooltip);
                      }
                      activeTooltips.delete(tooltip);
                    } catch (e) {
                      console.warn("Error removing tooltip:", e);
                    }
                  };

                  // Clear all tooltips
                  const clearAllTooltips = () => {
                    activeTooltips.forEach((tooltip) => {
                      removeTooltip(tooltip);
                    });
                    activeTooltips.clear();
                  };

                  // Check if point is within heatmap bounds
                  const isWithinHeatmapBounds = (lat: number, lng: number) => {
                    const centerLat = heatmapData.location.lat;
                    const centerLon = heatmapData.location.lon;
                    const extent = 2.0; // Same as heatmap extent

                    return (
                      lat >= centerLat - extent &&
                      lat <= centerLat + extent &&
                      lng >= centerLon - extent &&
                      lng <= centerLon + extent
                    );
                  };

                  // Add click-based tooltip system
                  const onMapClick = (e: any) => {
                    const { lat, lng } = e.latlng;

                    // Check if click is within heatmap bounds
                    if (!isWithinHeatmapBounds(lat, lng)) {
                      return; // Don't create tooltip outside heatmap area
                    }

                    // Calculate data for this location
                    const centerLat = heatmapData.location.lat;
                    const centerLon = heatmapData.location.lon;

                    const distanceFromCenter = Math.sqrt(
                      Math.pow(lat - centerLat, 2) +
                        Math.pow(lng - centerLon, 2)
                    );

                    const baseValue = heatmapData.values[0]?.[0] || 0;
                    const intensity = Math.exp(-distanceFromCenter / 1.5);
                    const estimatedValue = baseValue * (0.5 + intensity * 0.5);

                    const simulatedTime =
                      heatmapData.times[
                        Math.floor(
                          ((lat - centerLat + 2) / 4) * heatmapData.times.length
                        )
                      ] || heatmapData.times[0];
                    const simulatedDepth =
                      heatmapData.depths[
                        Math.floor(
                          ((lng - centerLon + 2) / 4) *
                            heatmapData.depths.length
                        )
                      ] || heatmapData.depths[0];

                    // Create clickable tooltip content
                    const tooltipId = `tooltip-${Date.now()}-${Math.random()}`;
                    const tooltipContent = `
                      <div id="${tooltipId}" style="background: rgba(255,255,255,0.95); backdrop-filter: blur(4px); border-radius: 8px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.1); font-size: 14px; cursor: pointer; min-width: 200px;">
                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">${
                          heatmapData.variable.charAt(0).toUpperCase() +
                          heatmapData.variable.slice(1)
                        } Data</div>
                        <div style="font-size: 12px; color: #4b5563; line-height: 1.4;">
                          <div><span style="font-weight: 500;">Value:</span> ${estimatedValue.toFixed(
                            2
                          )} ${heatmapData.units}</div>
                          <div><span style="font-weight: 500;">Time:</span> ${simulatedTime}</div>
                          <div><span style="font-weight: 500;">Depth:</span> ${simulatedDepth}m</div>
                          <div><span style="font-weight: 500;">Position:</span> ${lat.toFixed(
                            3
                          )}°, ${lng.toFixed(3)}°</div>
                        </div>
                        <div style="font-size: 10px; color: #9ca3af; margin-top: 8px; font-style: italic;">Click to close</div>
                      </div>
                    `;

                    try {
                      // Create permanent tooltip
                      const tooltip = L.tooltip({
                        permanent: true,
                        direction: "top",
                        opacity: 1,
                        className: "clickable-tooltip",
                        interactive: true,
                      })
                        .setLatLng([lat, lng])
                        .setContent(tooltipContent)
                        .addTo(map);

                      // Add to active tooltips set
                      activeTooltips.add(tooltip);

                      // Add click event to close tooltip after it's rendered
                      setTimeout(() => {
                        const tooltipElement =
                          document.getElementById(tooltipId);
                        if (tooltipElement) {
                          tooltipElement.addEventListener("click", (event) => {
                            event.stopPropagation();
                            removeTooltip(tooltip);
                          });
                        }
                      }, 100);
                    } catch (e) {
                      console.warn("Error creating tooltip:", e);
                    }
                  };

                  // Add click event listener to the map
                  map.on("click", onMapClick);

                  cleanup = () => {
                    // Clear all tooltips
                    clearAllTooltips();

                    // Remove click event listener
                    map.off("click", onMapClick);

                    // Remove heatmap layer
                    if (heatLayerRef.current) {
                      try {
                        map.removeLayer(heatLayerRef.current);
                      } catch (e) {
                        console.warn("Error removing heat layer:", e);
                      }
                    }
                  };
                } catch (heatError) {
                  console.warn(
                    "Error creating heat layer, using fallback:",
                    heatError
                  );
                  // Fallback implementation would go here
                }
              } else {
                // Create simple circle markers as fallback
                const layerGroup = L.layerGroup();

                points.forEach(([lat, lng, intensity]) => {
                  let color: string;
                  if (intensity > 0.8) color = "#FF0000";
                  else if (intensity > 0.6) color = "#FF8000";
                  else if (intensity > 0.4) color = "#FFFF00";
                  else if (intensity > 0.2) color = "#00FFFF";
                  else color = "#000080";

                  const circle = L.circleMarker([lat, lng], {
                    radius: Math.max(2, intensity * 8),
                    fillColor: color,
                    color: color,
                    weight: 1,
                    opacity: 0.7,
                    fillOpacity: 0.5,
                  });

                  layerGroup.addLayer(circle);
                });

                heatLayerRef.current = layerGroup.addTo(map);

                cleanup = () => {
                  if (heatLayerRef.current) {
                    try {
                      map.removeLayer(heatLayerRef.current);
                    } catch (e) {
                      console.warn("Error removing fallback layer:", e);
                    }
                  }
                };
              }
            } catch (error) {
              console.error(
                "Error loading Leaflet or creating heatmap:",
                error
              );
            }
          };

          loadLeafletAndCreateHeatmap();

          return () => {
            if (cleanup) {
              cleanup();
            }
          };
        }, [map, heatmapData]);

        return (
          <>
            <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
              <div className="text-xs font-medium text-gray-700 mb-1">
                {heatmapData.variable}
              </div>
              <div className="flex items-center space-x-1">
                <div
                  className="w-16 h-3 rounded-sm"
                  style={{
                    background:
                      "linear-gradient(to right, #000080, #0080FF, #00FFFF, #00FF00, #FFFF00, #FF8000, #FF0000)",
                  }}
                ></div>
                <span className="text-xs text-gray-600">
                  {heatmapData.units}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Click for details
              </div>
            </div>
          </>
        );
      }

      return function LeafletHeatmap({
        heatmapData,
      }: {
        heatmapData: HeatmapData;
      }) {
        if (!heatmapData) {
          return (
            <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">No heatmap data available</p>
            </div>
          );
        }

        const center: [number, number] = [
          heatmapData.location.lat,
          heatmapData.location.lon,
        ];

        return (
          <MapContainer
            center={center}
            zoom={3}
            scrollWheelZoom={true}
            className="h-full w-full rounded-lg"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <HeatmapLayer heatmapData={heatmapData} />
          </MapContainer>
        );
      };
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-48 sm:h-56 md:h-64 lg:h-72 bg-muted/20 rounded-lg">
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2 animate-pulse bg-muted rounded-full"></div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Loading heatmap
          </p>
        </div>
      </div>
    ),
  }
);

interface HeatmapCardProps {
  dataUri?: string;
}

export function HeatmapCard({ dataUri }: HeatmapCardProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const downloadData = () => {
    if (!heatmapData) return;

    const csvContent = [
      ["Time", "Depth", "Value", "Units"].join(","),
      ...heatmapData.data.map((point) =>
        [point.time, point.depth, point.value, heatmapData.units].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `heatmap_${heatmapData.variable}_data.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const loadHeatmapData = async () => {
      try {
        let questionId = "dq01";
        let variable = "oxygen";

        if (dataUri) {
          if (dataUri.includes("dq01")) questionId = "dq01";
          else if (dataUri.includes("dq02")) questionId = "dq02";
          else if (dataUri.includes("dq05")) questionId = "dq05";

          if (dataUri.toLowerCase().includes("oxygen")) variable = "oxygen";
          else if (dataUri.toLowerCase().includes("nitrogen"))
            variable = "nitrogen";
          else if (dataUri.toLowerCase().includes("temperature"))
            variable = "temperature";
          else if (dataUri.toLowerCase().includes("salinity"))
            variable = "salinity";
        }

        let data = await fetchDemoData(questionId, "heatmap");

        if (!data) {
          const syntheticData = generateSyntheticHeatmapData(variable);
          data = syntheticData;
        } else {
          data.variable = variable;
        }

        if (data) {
          setHeatmapData(data);
        } else {
          setError("No heatmap data available");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load heatmap data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadHeatmapData();
  }, [dataUri]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-56 md:h-64 lg:h-72 bg-muted/20 rounded-lg">
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2 animate-pulse bg-muted rounded-full"></div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Loading data
          </p>
        </div>
      </div>
    );
  }

  if (error || !heatmapData) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-56 md:h-64 lg:h-72 bg-muted/20 rounded-lg">
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2"></div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {error || "No heatmap data available"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border bg-background">
      <div className="flex justify-between items-center p-3 border-b border-border bg-muted/20">
        <h3 className="text-sm font-medium text-foreground">
          {heatmapData.variable.charAt(0).toUpperCase() +
            heatmapData.variable.slice(1)}{" "}
          Heatmap
        </h3>
        <Button onClick={downloadData} size="sm" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
      </div>
      <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full relative">
        <LeafletHeatmapComponent heatmapData={heatmapData} />
      </div>
    </div>
  );
}

function generateSyntheticHeatmapData(variable: string): HeatmapData {
  const variables = {
    oxygen: { units: "mg/L", baseValue: 8.0, range: 2.0 },
    nitrogen: { units: "mg/L", baseValue: 12.0, range: 3.0 },
    temperature: { units: "°C", baseValue: 25.0, range: 5.0 },
    salinity: { units: "PSU", baseValue: 35.0, range: 1.5 },
  };

  const varConfig =
    variables[variable as keyof typeof variables] || variables.oxygen;

  const times = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12 + i);
    return date.toISOString().slice(0, 7);
  });

  const depths = [0, 10, 25, 50, 100, 200, 500, 1000];

  const data: Array<{ time: string; depth: number; value: number }> = [];
  const values: number[][] = [];

  times.forEach((time, timeIdx) => {
    const timeValues: number[] = [];
    depths.forEach((depth, depthIdx) => {
      const depthFactor = Math.exp(-depth / 500);
      const seasonalFactor = Math.sin((timeIdx / 12) * 2 * Math.PI) * 0.3;
      const noise = (Math.random() - 0.5) * 0.2;

      const value =
        varConfig.baseValue +
        depthFactor * varConfig.range * seasonalFactor +
        varConfig.range * noise;

      data.push({ time, depth, value: Math.max(0, value) });
      timeValues.push(Math.max(0, value));
    });
    values.push(timeValues);
  });

  return {
    type: "heatmap",
    variable,
    units: varConfig.units,
    location: { lat: -10, lon: 80 },
    timeRange: { start: times[0], end: times[times.length - 1] },
    data,
    depths,
    times,
    values,
  };
}
