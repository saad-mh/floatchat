"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import dynamic from "next/dynamic";
import type { MapData } from "@/types/demo";
import { fetchDemoData } from "@/lib/demo-data";
import ErrorBoundary from "@/components/error-boundary";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
      <Globe className="w-8 h-8 text-muted-foreground animate-pulse" />
    </div>
  ),
});

interface MapCardProps {
  dataUri?: string;
}

export function MapCard({ dataUri }: MapCardProps) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const questionId = dataUri?.includes("dq01")
          ? "dq01"
          : dataUri?.includes("dq02")
          ? "dq02"
          : "dq01";
        const data = await fetchDemoData(questionId, "map");

        if (data) {
          setMapData(data);
        } else {
          setError("No map data available");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load map data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, [dataUri]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-56 md:h-64 lg:h-72 bg-muted/20 rounded-lg">
        <div className="text-center">
          <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            Creating map view
          </p>
        </div>
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-56 md:h-64 lg:h-72 bg-muted/20 rounded-lg">
        <div className="text-center">
          <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            {error || "No map data available"}
          </p>
        </div>
      </div>
    );
  }

  const lats = mapData.markers.map((marker) => marker.lat);
  const lons = mapData.markers.map((marker) => marker.lon);
  const texts = mapData.markers.map(
    (marker) => `${marker.label}<br>${marker.popup}`
  );

  const plotData = [
    {
      type: "scattergeo" as const,
      lat: lats,
      lon: lons,
      text: texts,
      mode: "markers" as const,
      marker: {
        size: 10,
        color: "#3b82f6",
        line: {
          color: "#1e40af",
          width: 2,
        },
        symbol: "circle",
      },
      hovertemplate: "%{text}<extra></extra>",
      name: "ARGO Floats",
    },
  ];

  const layout = {
    geo: {
      projection: {
        type: "natural earth" as const,
      },
      showland: true,
      landcolor: "rgb(144, 180, 110)",
      showocean: true,
      oceancolor: "rgb(173, 216, 255)",
      showcoastlines: true,
      coastlinecolor: "rgb(204, 204, 204)",
      showframe: false,
      bgcolor: "rgba(0,0,0,0)",
      resolution: 50,
    },
    margin: { t: 0, r: 0, b: 0, l: 0 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    showlegend: false,
    autosize: true,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"] as any,
    toImageButtonOptions: {
      format: "png" as const,
      filename: "argo_floats_map",
      height: 500,
      width: 700,
      scale: 1,
    },
  };

  return (
    <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full rounded-lg overflow-hidden border border-border bg-background">
      <div className="w-full h-full">
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: "100%", height: "100%" }}
          onInitialized={(figure, graphDiv) => {
            // Prevent scroll zoom errors by ensuring proper initialization
            try {
              const plotlyDiv = graphDiv as any;
              if (plotlyDiv && plotlyDiv._fullLayout) {
                // Safely initialize scroll zoom if it doesn't exist
                if (!plotlyDiv._fullLayout._scrollZoom) {
                  plotlyDiv._fullLayout._scrollZoom = {};
                }
              }
            } catch (e) {
              console.warn("ScrollZoom initialization handled:", e);
            }
          }}
          onError={(error) => {
            console.warn("Plotly error in 3D map:", error);
            // Don't throw, just log the error
          }}
        />
      </div>
    </div>
  );
}
