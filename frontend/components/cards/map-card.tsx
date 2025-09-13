"use client"

import { useEffect, useState } from "react"
import { MapPin, Globe, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MapData } from "@/types/demo"
import { fetchDemoData } from "@/lib/demo-data"

interface MapCardProps {
  dataUri?: string
}

export function MapCard({ dataUri }: MapCardProps) {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(5)
  const [center, setCenter] = useState({ lat: 0, lon: 0 })

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const questionId = dataUri?.includes("dq01") ? "dq01" : dataUri?.includes("dq02") ? "dq02" : "dq01"
        const data = await fetchDemoData(questionId, "map")

        if (data) {
          setMapData(data)
          setZoom(data.center.zoom)
          setCenter({ lat: data.center.lat, lon: data.center.lon })
        } else {
          setError("No map data available")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map data")
      } finally {
        setLoading(false)
      }
    }

    loadMapData()
  }, [dataUri])

  const handleZoomIn = () => setZoom(Math.min(zoom + 1, 10))
  const handleZoomOut = () => setZoom(Math.max(zoom - 1, 1))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  if (error || !mapData) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error || "No map data available"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-64 bg-gradient-to-br from-blue-950/40 to-blue-800/40 rounded-lg overflow-hidden border border-border">
      {/* Ocean background with depth effect */}
      <div className="absolute inset-0">
        <div className="w-full h-full bg-gradient-to-b from-blue-900/20 via-blue-800/30 to-blue-700/40" />

        {/* Subtle grid pattern for ocean effect */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(74, 144, 226, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(74, 144, 226, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${20 / zoom}px ${20 / zoom}px`,
            }}
          />
        </div>
      </div>

      {/* Coordinate system */}
      <div className="absolute inset-0">
        {/* Equator line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/30 transform -translate-y-1/2" />
        {/* Prime meridian */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/30 transform -translate-x-1/2" />

        {/* Center point */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-1 h-1 bg-primary/60 rounded-full" />
          <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-primary/80 whitespace-nowrap font-mono">
            {center.lat.toFixed(0)}°, {center.lon.toFixed(0)}°
          </div>
        </div>
      </div>

      {/* Float markers */}
      {mapData.markers.map((marker) => {
        // Convert lat/lon to pixel positions with zoom factor
        const baseScale = 50 // Base scale factor
        const zoomScale = zoom / 5 // Zoom adjustment
        const x = 50 + (marker.lon - center.lon) * baseScale * zoomScale
        const y = 50 - (marker.lat - center.lat) * baseScale * zoomScale

        return (
          <div
            key={marker.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
            style={{
              left: `${Math.max(5, Math.min(95, x))}%`,
              top: `${Math.max(5, Math.min(95, y))}%`,
            }}
          >
            {/* Marker pin with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 w-6 h-6 bg-primary/20 rounded-full animate-pulse" />
              <MapPin className="w-6 h-6 text-primary drop-shadow-lg relative z-10" />
            </div>

            {/* Tooltip */}
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
              <div className="bg-popover/95 backdrop-blur-sm text-popover-foreground px-3 py-2 rounded-lg shadow-xl border border-border min-w-max">
                <div className="font-medium text-sm">{marker.label}</div>
                <div className="text-xs text-muted-foreground">{marker.popup}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {marker.lat.toFixed(2)}°, {marker.lon.toFixed(2)}°
                </div>
                {/* Tooltip arrow */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover rotate-45 border-l border-t border-border" />
              </div>
            </div>
          </div>
        )
      })}

      {/* Map controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleZoomIn}
          className="w-8 h-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleZoomOut}
          className="w-8 h-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Map info panel */}
      <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-foreground font-medium">
              {mapData.markers.length} float{mapData.markers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-muted-foreground">Zoom {zoom}</div>
          <div className="text-muted-foreground font-mono">
            {center.lat.toFixed(1)}°, {center.lon.toFixed(1)}°
          </div>
        </div>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-3 right-3">
        <div className="bg-background/80 backdrop-blur-sm rounded px-2 py-1 border border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-px bg-foreground" />
            <span className="text-xs text-foreground font-mono">{Math.round(100 / zoom)} km</span>
          </div>
        </div>
      </div>
    </div>
  )
}
