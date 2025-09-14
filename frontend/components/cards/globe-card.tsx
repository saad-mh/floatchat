"use client";
import React, { useRef, useEffect, useState } from "react";
import Globe from "globe.gl";

interface GlobeCardProps {
  points?: Array<{ lat: number; lng: number; label?: string; color?: string }>;
  height?: number;
}

export function GlobeCard({ points = [], height = 400 }: GlobeCardProps) {
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !globeRef.current) return;
    // Calculate center of points
    let center = { lat: 0, lng: 0, altitude: 1.5 };
    if (points.length > 0) {
      const sumLat = points.reduce((acc, p) => acc + p.lat, 0);
      const sumLng = points.reduce((acc, p) => acc + p.lng, 0);
      center.lat = sumLat / points.length;
      center.lng = sumLng / points.length;
      center.altitude = 0.4;
    }

    // Prepare rings data
    const ringsData = points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      maxR: 8,
      propagationSpeed: 5,
      repeatPeriod: 1200,
      color: p.color || "#4A90E2"
    }));

    if (!globeInstance.current) {
      globeInstance.current = new Globe(globeRef.current)
        .height(height)
        .width(globeRef.current.offsetWidth || 600)
        .backgroundColor("#101624")
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .pointLat((d: any) => d.lat)
        .pointLng((d: any) => d.lng)
        .pointColor((d: any) => d.color || "#4A90E2")
        .pointAltitude(0.01)
        .pointRadius(0.5)
        .pointsData(points)
        .ringsData(ringsData)
        .ringColor((d: any) => (t: any) => {
          // Use color interpolator similar to example
          const base = d.color || "#4A90E2";
          const hex = base.replace('#','');
          const r = parseInt(hex.substring(0,2),16);
          const g = parseInt(hex.substring(2,4),16);
          const b = parseInt(hex.substring(4,6),16);
          return `rgba(${r},${g},${b},${Math.sqrt(1-t)})`;
        })
        .ringMaxRadius((d: any) => d.maxR || 8)
        .ringPropagationSpeed((d: any) => d.propagationSpeed || 5)
        .ringRepeatPeriod((d: any) => d.repeatPeriod || 1200)
        .pointOfView(center, 2000);
    } else {
      globeInstance.current.pointsData(points);
      globeInstance.current.ringsData(ringsData);
      globeInstance.current.pointOfView(center, 100);
    }
    return () => {
      if (globeInstance.current) {
        globeInstance.current = null;
      }
    };
  }, [points, height]);

  return (
    <div className="bg-card rounded-lg shadow-lg p-4" style={{ height, minWidth: 400 }}>
      <div ref={globeRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
