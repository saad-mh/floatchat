"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DemoCard } from "@/types/demo";
import { MapCard } from "@/components/cards/map-card";
import { FlatMapCard } from "@/components/cards/flat-map-card";
import { ChartCard } from "@/components/cards/chart-card";
import { TableCard } from "@/components/cards/table-card";
import { SummaryCard } from "@/components/cards/summary-card";
import { GlobeCard } from "@/components/cards/globe-card";

interface ReportCardProps {
  card: DemoCard;
}

export function ReportCard({ card }: ReportCardProps) {
  // Helper to get demo points for dq01
  const getEquatorDemoPoints = () => [
    { lat: 0, lng: 0, label: "Equator", color: "#4A90E2" },
    { lat: 2, lng: 3, label: "Float 1", color: "#10b981" },
    { lat: -1.5, lng: -2.2, label: "Float 2", color: "#3b82f6" }
  ];

  const renderCardContent = () => {
    switch (card.type) {
      case "flat-map":
        return <FlatMapCard dataUri={card.dataUri} />;
      case "map": {
        return <MapCard dataUri={card.dataUri} />;
      }
      case "globe": {
        return <>
            <div className="mt-4">
              <GlobeCard points={getEquatorDemoPoints()} height={400} />
            </div>
          </>;
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
      <CardContent className="pt-0 p-4 md:p-6 md:pt-0">
        <div className="min-h-[200px] md:min-h-[250px] max-h-[400px] md:max-h-[500px] overflow-hidden">
          {renderCardContent()}
        </div>
      </CardContent>
    </Card>
  );
}
