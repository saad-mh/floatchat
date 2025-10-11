"use client";

import { GlobeCard } from "@/components/cards/globe-card";
import { ThemeToggle } from "@/components/theme-toggle";

const demoPoints = [
  { lat: 0, lng: 0, label: "Equator", color: "#4A90E2" },
  { lat: 37.7749, lng: -122.4194, label: "San Francisco", color: "#10b981" },
  { lat: 51.5074, lng: -0.1278, label: "London", color: "#3b82f6" },
  { lat: -33.8688, lng: 151.2093, label: "Sydney", color: "#64748b" },
];

export default function GlobeTestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      {/* Theme toggle in top-right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">So basically</h1>
        <GlobeCard points={demoPoints} height={500} />
      </div>
    </div>
  );
}
