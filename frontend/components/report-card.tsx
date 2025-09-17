"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { fetchDemoData } from "@/lib/demo-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DemoCard } from "@/types/demo";
import { MapCard } from "@/components/cards/map-card";
import { FlatMapCard } from "@/components/cards/flat-map-card";
import { ChartCard } from "@/components/cards/chart-card";
import { TableCard } from "@/components/cards/table-card";
import { SummaryCard } from "@/components/cards/summary-card";

// Dynamically import GlobeCard to prevent SSR issues
const GlobeCard = dynamic(() => import("@/components/cards/globe-card").then(mod => ({ default: mod.GlobeCard })), {
  ssr: false,
  loading: () => (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden w-full flex items-center justify-center h-96">
      <div className="text-center text-muted-foreground">
        <div className="w-8 h-8 mx-auto mb-2 animate-pulse bg-muted rounded-full"></div>
        <p className="text-sm">Loading 3D view...</p>
      </div>
    </div>
  )
});

interface ReportCardProps {
  card: DemoCard;
}

export function ReportCard({ card }: ReportCardProps) {
  // Helper to get demo points for dq01
  // Helper to fetch points from card.dataUri.map
  const [globePoints, setGlobePoints] = useState<
    Array<{ lat: number; lng: number; label?: string; color?: string }>
  >([]);

  const [loadingGlobe, setLoadingGlobe] = useState(false);
  const [globeError, setGlobeError] = useState<string | null>(null);
  useEffect(() => {
    async function fetchDemoCardData() {
      // Only run for supported types with a dataUri
      if (
        ["globe", "map", "chart", "table", "summary"].includes(card.type) &&
        card.dataUri
      ) {
        setLoadingGlobe(true);
        setGlobeError(null);
        try {
          // Extract questionId and dataType from dataUri
          // e.g. /demo/maps/dq01map.json, /demo/charts/dq01salinityprofiles.json
          const match = card.dataUri.match(
            /\/([a-zA-Z0-9]+)(map|chart|table|summary)[^/]*\.json$/
          );
          const questionId = match ? match[1] : null;
          let dataType = null;
          if (card.type === "globe" || card.type === "map") dataType = "map";
          else if (card.type === "chart") dataType = "chart";
          else if (card.type === "table") dataType = "table";
          else if (card.type === "summary") dataType = "summary";
          if (!questionId || !dataType)
            throw new Error(
              "Could not determine questionId or dataType from dataUri"
            );
          const data = await fetchDemoData(questionId, dataType);
          if (card.type === "globe") {
            if (data && Array.isArray(data.markers)) {
              setGlobePoints(
                data.markers.map((m: any) => ({
                  lat: m.lat,
                  lng: m.lon ?? m.lng,
                  label: m.label,
                  color: m.color || "#4A90E2",
                }))
              );
            } else {
              setGlobePoints([]);
              setGlobeError("No markers found in map data.");
            }
          }
          // For other types, you could set state here as needed
        } catch (e) {
          setGlobePoints([]);
          setGlobeError("Failed to load demo data.");
        }
        setLoadingGlobe(false);
      }
    }
    fetchDemoCardData();
  }, [card.type, card.dataUri]);

  const renderCardContent = () => {
    switch (card.type) {
      case "flat-map":
        return <FlatMapCard dataUri={card.dataUri} />;
      case "map": {
        return <MapCard dataUri={card.dataUri} />;
      }
      case "globe": {
        return (
          <div className="mt-4">
            {loadingGlobe ? (
              <div className="p-4 text-muted-foreground">
                3D viewport loading
              </div>
            ) : globeError ? (
              <div className="p-4 text-destructive">{globeError}</div>
            ) : (
              <GlobeCard points={globePoints} height={400} />
            )}
          </div>
        );
      }
      case "chart":
        return <ChartCard dataUri={card.dataUri} />;
      case "table":
        return <TableCard dataUri={card.dataUri} />;
      case "summary":
        return <SummaryCard text={card.text} provenance={card.provenance} />;
      default:
        return (
          <div className="p-4 text-muted-foreground">Unsupported card type</div>
        );
    }
  };

  return (
    <Card className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="pb-3 md:pb-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-semibold text-card-foreground">
            {card.title}
          </CardTitle>
          <Badge
            variant="secondary"
            className="text-xs bg-secondary/50 text-secondary-foreground"
          >
            {card.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-3 sm:p-4 md:p-6 md:pt-0">
        <div className="min-h-[200px] sm:min-h-[250px] md:min-h-[300px] w-full overflow-hidden">
          {renderCardContent()}
        </div>
      </CardContent>
    </Card>
  );
}
