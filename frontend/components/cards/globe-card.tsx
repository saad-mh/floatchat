"use client";
import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "../theme-toggle";
// import { bg } from "date-fns/locale";

interface GlobeCardProps {
  points?: Array<{ lat: number; lng: number; label?: string; color?: string }>;
  height?: number;
  center?: { lat: number; lng: number; altitude?: number };
}

export function GlobeCard({
  points = [],
  height = 400,
  center,
}: GlobeCardProps) {
  const { theme } = useTheme();
  useEffect(() => { //update bg when theme changes
    if (!globeInstance.current) return;
    const bgImage = theme === "light" ? "/day-sky.jpeg" : "/night-sky.png";
    const bgColor = theme === "light" ? "#ffffff" : "#111827";
    globeInstance.current.backgroundImageUrl(bgImage);
    globeInstance.current.backgroundColor(bgColor);
  }, [theme]);
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState<number>(100);
  const [isClient, setIsClient] = useState(false);
  const [globeLoaded, setGlobeLoaded] = useState(false);

  const downloadCSV = () => {
    if (points.length === 0) return;

    const headers = ["Latitude", "Longitude", "Label", "Color"];
    const csvContent = [
      headers.join(","),
      ...points.map((point) =>
        [
          point.lat,
          point.lng,
          point.label ? `"${point.label.replace(/"/g, '""')}"` : "",
          point.color || "#4A90E2",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "globe_locations.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    function handleResize() {
      if (typeof window !== "undefined" && globeRef.current) {
        setContainerWidth(globeRef.current.offsetWidth || 400);
      }
    }
    if (typeof window !== "undefined") {
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isClient]);

  // Initialize globe once
  useEffect(() => {
    if (typeof window === "undefined" || !isClient || globeInstance.current)
      return;

    // Small delay to ensure the div is properly rendered
    const initializeGlobe = async () => {
      if (!globeRef.current) return;

      // Dynamically import Globe only on client side
      try {
        const GlobeModule = await import("globe.gl");
        const Globe = GlobeModule.default;

        if (!globeRef.current || globeInstance.current) return;

        // Choose background image based on theme
        const bgImage = theme === "light" ? "/day-sky.jpeg" : "/night-sky.png";
        const bgColor = theme === "light" ? "#ffffff" : "#111827";

        globeInstance.current = new Globe(globeRef.current)
          .height(height)
          .width(containerWidth)
          .backgroundColor(bgColor)
          .globeImageUrl("/earth-blue-marble.jpg")
          .backgroundImageUrl(bgImage)
          .pointLat((d: any) => d.lat)
          .pointLng((d: any) => d.lng)
          .pointColor((d: any) => d.color || "#1e2a3a")
          .pointAltitude(0.01)
          .pointRadius(0.5)
          .pointsData([]) // Initialize with empty data
          .ringsData([]) // Initialize with empty data
          .ringColor((d: any) => (t: any) => {
            const base = d.color || "#4A90E2";
            const hex = base.replace("#", "");
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r},${g},${b},${Math.sqrt(1 - t)})`;
          })
          .ringMaxRadius((d: any) => d.maxR || 8)
          .ringPropagationSpeed((d: any) => d.propagationSpeed || 5)
          .ringRepeatPeriod((d: any) => d.repeatPeriod || 1200);

        setGlobeLoaded(true);
      } catch (error) {
        console.error("Error loading globe:", error);
        setGlobeLoaded(true); // Set loaded even on error to prevent infinite loading
      }
    };

    // Add a small delay to ensure DOM is ready
    setTimeout(initializeGlobe, 100);

    return () => {
      if (globeInstance.current) {
        globeInstance.current = null;
        setGlobeLoaded(false);
      }
    };
  }, [isClient, height, containerWidth]);

  useEffect(() => {
    if (!globeInstance.current || !globeLoaded) return;
    const pov = center || { lat: 0, lng: 0, altitude: 1.5 };

    const ringsData = points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      maxR: 8,
      propagationSpeed: 5,
      repeatPeriod: 1200,
      color: p.color || "#4A90E2",
    }));

    globeInstance.current
      .pointsData(points)
      .ringsData(ringsData)
      .pointOfView(pov, 0);
  }, [points, globeLoaded, center]);

  return (
    <div
      className="bg-card rounded-lg overflow-hidden w-full relative"
      style={{ height }}
    >
      <div className="absolute top-2 right-2 z-10">
        <Button
          onClick={downloadCSV}
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
      </div>
      <div ref={globeRef} style={{ width: "100%", height: "100%" }} />
      {(!isClient || !globeLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="text-center text-muted-foreground">
            <div className="w-8 h-8 mx-auto mb-2 animate-pulse bg-muted rounded-full"></div>
            <p className="text-sm">3D view</p>
          </div>
        </div>
      )}
    </div>
  );
}
