"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DemoCard } from "@/types/demo";
import { MapCard } from "@/components/cards/map-card";
import { ChartCard } from "@/components/cards/chart-card";
import { TableCard } from "@/components/cards/table-card";
import { SummaryCard } from "@/components/cards/summary-card";

interface ReportCardProps {
  card: DemoCard;
}

export function ReportCard({ card }: ReportCardProps) {
  const renderCardContent = () => {
    switch (card.type) {
      case "map":
        return <MapCard dataUri={card.dataUri} />;
      case "chart":
        return <ChartCard dataUri={card.dataUri} />;
      case "table":
        return <TableCard dataUri={card.dataUri} />;
      case "summary":
        return <SummaryCard text={card.text} provenance={card.provenance} />;
      default:
<<<<<<< HEAD
        return (
          <div className="p-4 text-muted-foreground">Unsupported card type</div>
        );
=======
        return <div className="p-4 text-muted-foreground">New card type huh?</div>
>>>>>>> a99ec0ff96f1cea4fca7cf576ef63927fb8a3b0d
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
