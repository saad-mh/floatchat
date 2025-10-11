export interface DemoQuestion {
  id: string
  prompt: string
  primaryContentType: "flat-map" | "map" | "chart" | "table" | "summary" | "globe" | "mapglobe" | "heatmap"
  cards: DemoCard[]
  querieGenerated?: string
  detailedDescription?: string
}

export interface DemoCard {
  type: "flat-map" | "map" | "chart" | "table" | "summary" | "globe" | "mapglobe" | "heatmap"
  title: string
  dataUri?: string
  text?: string
  provenance?: string[]
}

export interface MapData {
  center: { lat: number; lon: number; zoom: number }
  markers: Array<{
    id: string
    lat: number
    lon: number
    label: string
    popup: string
  }>
  bbox: any
}

export interface ChartData {
  type: string
  variable: string
  units: string
  traces: Array<{
    id: string
    float: string
    cycle: number
    depths: number[]
    values: number[]
  }>
}

export interface HeatmapData {
  type: string
  variable: string
  units: string
  location: { lat: number; lon: number }
  timeRange: { start: string; end: string }
  data: Array<{
    time: string
    depth: number
    value: number
  }>
  depths: number[]
  times: string[]
  values: number[][]
}
