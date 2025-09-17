"use client";
import React, { useRef, useEffect, useState } from "react";

interface GlobeCardProps {
  points?: Array<{ lat: number; lng: number; label?: string; color?: string }>;
  height?: number;
}

export function GlobeCard({ points = [], height = 400 }: GlobeCardProps) {
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState<number>(100);
  const [isClient, setIsClient] = useState(false);
  const [globeLoaded, setGlobeLoaded] = useState(false);

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

        globeInstance.current = new Globe(globeRef.current)
          .height(height)
          .width(containerWidth)
          .backgroundColor("#101624")
          .globeImageUrl("/earth-blue-marble.jpg")
          .pointLat((d: any) => d.lat)
          .pointLng((d: any) => d.lng)
          .pointColor((d: any) => d.color || "#4A90E2")
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

  // Update globe data when props change
  useEffect(() => {
    if (!globeInstance.current || !globeLoaded) return;

    let center = { lat: 0, lng: 0, altitude: 1.5 };
    if (points.length > 0) {
      const sumLat = points.reduce((acc, p) => acc + p.lat, 0);
      const sumLng = points.reduce((acc, p) => acc + p.lng, 0);
      center.lat = sumLat / points.length;
      center.lng = sumLng / points.length;
      center.altitude = 0.4;
    }

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
      .pointOfView(center, points.length > 0 ? 100 : 2000);
  }, [points, globeLoaded]);

  return (
    <div
      className="bg-card rounded-lg shadow-lg overflow-hidden w-full relative"
      style={{ height }}
    >
      <div ref={globeRef} style={{ width: "100%", height: "100%" }} />
      {(!isClient || !globeLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="text-center text-muted-foreground">
            <div className="w-8 h-8 mx-auto mb-2 animate-pulse bg-muted rounded-full"></div>
            <p className="text-sm">Loading 3D view...</p>
          </div>
        </div>
      )}
    </div>
  );
}
