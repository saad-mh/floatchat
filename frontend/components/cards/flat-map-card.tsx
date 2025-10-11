"use client";

import { useEffect, useState } from "react";
import { Globe, Download } from "lucide-react";
import dynamic from "next/dynamic";
import type { MapData } from "@/types/demo";
import { fetchDemoData } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";

// Import Leaflet CSS in a component that uses Leaflet
import "leaflet/dist/leaflet.css";

// Leaflet Map Component
const LeafletMapComponent = dynamic(
  () => {
    return import("react-leaflet").then((mod) => {
      const { MapContainer, TileLayer, Marker, Popup, useMap } = mod;

      return Promise.resolve().then(() => {
        // Import Leaflet for icons
        return import("leaflet").then((L) => {
          // Fix for default markers in react-leaflet
          delete (L.default.Icon.Default.prototype as any)._getIconUrl;
          L.default.Icon.Default.mergeOptions({
            iconRetinaUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
            iconUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            shadowUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          });

          // Custom ARGO float icon
          const argoIcon = new L.default.Icon({
            iconUrl:
              "data:image/svg+xml;base64," +
              btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="24" height="24">
              <circle cx="12" cy="12" r="8" stroke="#1e40af" stroke-width="2" fill="#3b82f6" opacity="0.8"/>
              <circle cx="12" cy="12" r="3" fill="#1e40af"/>
            </svg>
          `),
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
          });

          function MapFitBounds({ bounds }: { bounds: any }) {
            const map = useMap();

            useEffect(() => {
              if (bounds && map) {
                map.fitBounds(bounds, { padding: [-10, 10], maxZoom: 4.6 });
              }
            }, [map, bounds]);

            return null;
          }

          // Return the actual component
          return function LeafletMap({ mapData }: { mapData: MapData }) {
            if (!mapData?.markers || mapData.markers.length === 0) {
              return (
                <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg">
                  <p className="text-muted-foreground">
                    No location data available
                  </p>
                </div>
              );
            }

            // Calculate bounds for all markers
            const bounds = L.default.latLngBounds(
              mapData.markers.map(
                (marker) => [marker.lat, marker.lon] as [number, number]
              )
            );

            return (
              <MapContainer
                bounds={bounds}
                scrollWheelZoom={true}
                className="h-full w-full rounded-lg"
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />

                <MapFitBounds bounds={bounds} />

                {mapData.markers.map((marker) => (
                  <Marker
                    key={marker.id}
                    position={[marker.lat, marker.lon]}
                    icon={argoIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{marker.label}</strong>
                        <br />
                        {marker.popup}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          Lat: {marker.lat.toFixed(4)}, Lon:{" "}
                          {marker.lon.toFixed(4)}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            );
          };
        });
      });
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-48 sm:h-56 md:h-64 lg:h-72 bg-muted/20 rounded-lg">
        <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground animate-pulse" />
      </div>
    ),
  }
);

interface FlatMapCardProps {
  dataUri?: string;
}

export function FlatMapCard({ dataUri }: FlatMapCardProps) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const downloadCSV = () => {
    if (!mapData?.markers || mapData.markers.length === 0) return;

    const headers = ["ID", "Latitude", "Longitude", "Label", "Popup"];
    const csvContent = [
      headers.join(","),
      ...mapData.markers.map((marker) =>
        [
          marker.id,
          marker.lat,
          marker.lon,
          `"${marker.label.replace(/"/g, '""')}"`,
          `"${marker.popup.replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "map_locations.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <p className="text-xs sm:text-sm text-muted-foreground">Hold on</p>
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

  // No need for Plotly data preparation - Leaflet handles this directly

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border bg-background">
      <div className="flex justify-between items-center p-3 border-b border-border bg-muted/20">
        <h3 className="text-sm font-medium text-foreground">
          ARGO Float Locations
        </h3>
        <Button onClick={downloadCSV} size="sm" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
      </div>
      <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full">
        <LeafletMapComponent mapData={mapData} />
      </div>
    </div>
  );
}
