export interface DemoQuestion {
  id: string
  prompt: string
  primaryContentType: "flat-map" | "map" | "chart" | "table" | "summary"
  cards: DemoCard[]
  querieGenerated?: string
}

export interface DemoCard {
  type: "flat-map" | "map" | "chart" | "table" | "summary"
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
