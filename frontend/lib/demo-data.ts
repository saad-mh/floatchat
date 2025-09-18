// Demo data service for FloatChat
export interface DemoDataResponse {
  map?: any
  globe?: any
  chart?: any
  table?: any
  summary?: any
}

// Sample data for different question types
const demoDataSets = {
  dq01: {
    map: {
      center: { lat: 0, lon: 0, zoom: 5 },
      markers: [
        { id: "WMO_5901234", lat: 0.12, lon: -0.03, label: "WMO_5901234", popup: "3 profiles - Mar 2023" },
        { id: "WMO_5902345", lat: -0.2, lon: 0.8, label: "WMO_5902345", popup: "2 profiles - Mar 2023" },
        { id: "WMO_5903456", lat: 0.05, lon: 0.15, label: "WMO_5903456", popup: "1 profile - Mar 2023" },
        { id: "WMO_5906789", lat: 0.18, lon: -0.22, label: "WMO_5906789", popup: "2 profiles - Mar 2023" },
        { id: "WMO_5907890", lat: -0.11, lon: 0.33, label: "WMO_5907890", popup: "1 profile - Mar 2023" },
        { id: "WMO_5908901", lat: 0.25, lon: -0.18, label: "WMO_5908901", popup: "1 profile - Mar 2023" },
        { id: "WMO_5909012", lat: -0.09, lon: 0.21, label: "WMO_5909012", popup: "2 profiles - Mar 2023" },
      ],
      bbox: null,
    },
    chart: {
      type: "profiles",
      variable: "salinity",
      units: "PSU",
      traces: [
        {
          "id": "P1",
          "float": "WMO_5901234",
          "cycle": 182,
          "depths": [0, 5, 10, 25, 50, 100, 200],
          "values": [35.1, 35.05, 35.02, 34.95, 34.9, 34.85, 34.8]
        },
        {
          "id": "P2",
          "float": "WMO_5902345",
          "cycle": 183,
          "depths": [0, 5, 10, 25, 50, 100, 200],
          "values": [35.2, 35.15, 35.1, 35.0, 34.95, 34.88, 34.82]
        },
        {
          "id": "P3",
          "float": "WMO_5903456",
          "cycle": 184,
          "depths": [0, 5, 10, 25, 50, 100, 200],
          "values": [34.98, 34.95, 34.93, 34.90, 34.88, 34.85, 34.83]
        },
        {
          "id": "P4",
          "float": "WMO_5904567",
          "cycle": 185,
          "depths": [0, 5, 10, 25, 50, 100, 200],
          "values": [35.05, 35.00, 34.97, 34.92, 34.89, 34.87, 34.84]
        },
        {
          "id": "P5",
          "float": "WMO_5905678",
          "cycle": 186,
          "depths": [0, 5, 10, 25, 50, 100, 200],
          "values": [35.15, 35.10, 35.07, 35.02, 34.98, 34.93, 34.90]
        }
      ],
    },
  },
  dq02: {
    chart: {
      type: "timeseries",
      variable: "chlorophyll",
      units: "mg/m³",
      traces: [
        {
          id: "BGC1",
          float: "WMO_5906789",
          cycle: 45,
          depths: [0, 10, 20, 50, 100],
          values: [2.1, 1.8, 1.2, 0.8, 0.3],
        },
        {
          id: "BGC2",
          float: "WMO_5907890",
          cycle: 46,
          depths: [0, 10, 20, 50, 100],
          values: [1.9, 1.6, 1.0, 0.6, 0.2],
        },
        {
          id: "BGC3",
          float: "WMO_5908901",
          cycle: 47,
          depths: [0, 10, 20, 50, 100],
          values: [2.3, 2.0, 1.5, 1.0, 0.4],
        },
        {
          id: "BGC4",
          float: "WMO_5909012",
          cycle: 48,
          depths: [0, 10, 20, 50, 100],
          values: [2.0, 1.7, 1.3, 0.9, 0.3],
        },
        {
          id: "BGC5",
          float: "WMO_5900123",
          cycle: 49,
          depths: [0, 10, 20, 50, 100],
          values: [2.2, 1.9, 1.4, 1.1, 0.5],
        },
      ],
    },
    map: {
      center: { lat: 15, lon: 65, zoom: 4 },
      markers: [
        { id: "WMO_5906789", lat: 14.5, lon: 64.2, label: "WMO_5906789", popup: "BGC Float — Active" },
        { id: "WMO_5907890", lat: 15.8, lon: 66.1, label: "WMO_5907890", popup: "BGC Float — Active" },
      ],
      bbox: null,
    },
  },
  dq04: {
    chart: {
      type: "profiles",
      variable: "temperature",
      units: "°C",
      traces: [
        {
          id: "T1",
          float: "WMO_5901234",
          cycle: 182,
          depths: [0, 10, 25, 50, 100, 200, 500],
          values: [28.5, 28.2, 27.8, 26.5, 24.2, 18.5, 12.1],
        },
        {
          id: "T2",
          float: "WMO_5901234",
          cycle: 183,
          depths: [0, 10, 25, 50, 100, 200, 500],
          values: [28.3, 28.0, 27.6, 26.3, 24.0, 18.2, 11.9],
        },
        {
          id: "T3",
          float: "WMO_5901234",
          cycle: 184,
          depths: [0, 10, 25, 50, 100, 200, 500],
          values: [28.1, 27.8, 27.4, 26.1, 23.8, 17.9, 11.7],
        },
        {
          id: "T4",
          float: "WMO_5902345",
          cycle: 185,
          depths: [0, 10, 25, 50, 100, 200, 500],
          values: [27.9, 27.6, 27.2, 25.9, 23.5, 17.2, 10.9],
        },
        {
          id: "T5",
          float: "WMO_5903456",
          cycle: 186,
          depths: [0, 10, 25, 50, 100, 200, 500],
          values: [28.7, 28.4, 28.0, 26.7, 24.4, 19.1, 13.2],
        },
        {
          id: "T6",
          float: "WMO_5904567",
          cycle: 187,
          depths: [0, 10, 25, 50, 100, 200, 500],
          values: [28.0, 27.7, 27.3, 26.0, 23.7, 18.3, 12.0],
        },
      ],
    },
  },
  dq03: {
    map: {
      center: { lat: 15.5, lon: 70.2, zoom: 8 },
      markers: [
        { id: "target", lat: 15.5, lon: 70.2, label: "Query Point", popup: "Target location", color: "#f43f5e" },
        { id: "WMO_5906428", lat: 15.6, lon: 70.3, label: "WMO_5906428", popup: "Distance: 12.3 km", color: "#3b82f6" },
        { id: "WMO_5907123", lat: 15.4, lon: 70.1, label: "WMO_5907123", popup: "Distance: 15.8 km", color: "#f59e0b" },
      ],
    },
  },
  dq05: {
    map: {
      center: { lat: -10.0, lon: 80.0, zoom: 6 },
      markers: [
        { id: "WMO_5901111", lat: -10.0, lon: 80.0, label: "WMO_5901111", popup: "O2: 185.2 μmol/kg", color: "#22d3ee" },
        { id: "WMO_5902222", lat: -9.8, lon: 80.2, label: "WMO_5902222", popup: "O2: 192.1 μmol/kg", color: "#eab308" },
        { id: "WMO_5903333", lat: -10.2, lon: 79.9, label: "WMO_5903333", popup: "O2: 178.5 μmol/kg", color: "#ef4444" },
      ],
    },
  },
  dq07: {
    map: {
      center: { lat: 18.5, lon: 66.0, zoom: 6 },
      markers: [
        { id: "WMO_5906428", lat: 18.45, lon: 65.23, label: "WMO_5906428", popup: "Chl-a: 0.78 mg/m³", color: "#22c55e" },
        { id: "WMO_5904859", lat: 20.12, lon: 68.77, label: "WMO_5904859", popup: "Chl-a: 0.65 mg/m³", color: "#16a34a" },
        { id: "WMO_5906329", lat: 16.89, lon: 62.45, label: "WMO_5906329", popup: "Chl-a: 0.93 mg/m³", color: "#15803d" },
        { id: "WMO_5905784", lat: 22.33, lon: 71.56, label: "WMO_5905784", popup: "Chl-a: 0.54 mg/m³", color: "#166534" },
        { id: "WMO_5907123", lat: 19.67, lon: 66.89, label: "WMO_5907123", popup: "Chl-a: 0.76 mg/m³", color: "#14532d" },
        { id: "WMO_5906551", lat: 15.78, lon: 70.12, label: "WMO_5906551", popup: "Chl-a: 0.58 mg/m³", color: "#052e16" },
      ],
    },
  },
  dq08: {
    map: {
      center: { lat: 18.0, lon: 67.0, zoom: 5 },
      markers: [
        { id: "deployment", lat: 12.3, lon: 62.1, label: "Deployment", popup: "April 12, 2020", color: "#ef4444", size: 10 },
        { id: "month1", lat: 12.8, lon: 62.5, label: "Month 1", popup: "May 15, 2020", color: "#f97316" },
        { id: "month6", lat: 14.2, lon: 63.8, label: "Month 6", popup: "Oct 20, 2020", color: "#eab308" },
        { id: "year1", lat: 16.1, lon: 65.2, label: "Year 1", popup: "Apr 18, 2021", color: "#84cc16" },
        { id: "year2", lat: 18.7, lon: 67.4, label: "Year 2", popup: "Apr 25, 2022", color: "#22c55e" },
        { id: "year3", lat: 20.3, lon: 69.1, label: "Year 3", popup: "May 2, 2023", color: "#06b6d4" },
        { id: "year4", lat: 22.1, lon: 70.8, label: "Year 4", popup: "May 10, 2024", color: "#3b82f6" },
        { id: "current", lat: 23.5, lon: 71.9, label: "Current", popup: "Aug 15, 2025", color: "#8b5cf6", size: 8 },
      ],
    },
  },
}

export async function fetchDemoData(questionId: string, dataType: string): Promise<any> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  const dataset = demoDataSets[questionId as keyof typeof demoDataSets]
  if (!dataset) {
    throw new Error(`No demo data found for question ${questionId}`)
  }

  return dataset[dataType as keyof typeof dataset] || null
}

export function getDemoQuestionById(questionId: string) {
  const demoQuestions = [
    {
      id: "dq01",
      prompt: "Show me salinity profiles near the equator in March 2023.",
      primaryContentType: "map",
      cards: [
        { type: "map", title: "Floats within 100 km of (0°N, 0°E) — March 2023", dataUri: "/demo/maps/dq01map.json" },
        {
          type: "chart",
          title: "Salinity vs Depth — Selected Profiles",
          dataUri: "/demo/charts/dq01salinityprofiles.json",
        },
        {
          type: "summary",
          title: "Quick Summary",
          text: "Found 6 profiles from 3 floats. Near-surface salinity ranges 34.8–35.2 PSU. See QC notes.",
          provenance: ["WMO_5901234.nc", "WMO_5902345.nc"],
        },
      ],
    },
    {
      id: "dq02",
      prompt: "Compare BGC parameters in the Arabian Sea for the last 6 months.",
      primaryContentType: "chart",
      cards: [
        {
          type: "chart",
          title: "BGC Time-Series — Arabian Sea (6 months)",
          dataUri: "/demo/charts/dq02_bgc_timeseries.json",
        },
        { type: "map", title: "Profile Locations (Arabian Sea)", dataUri: "/demo/maps/dq02_map.json" },
        { type: "table", title: "BGC Stats (mean, median, std)", dataUri: "/demo/tables/dq02_bgc_stats.json" },
      ],
    },
    {
      id: "dq03",
      prompt: "What are the nearest ARGO floats to 15.5°N, 70.2°E?",
      primaryContentType: "map",
      cards: [
        { type: "map", title: "Nearest floats to (15.5N, 70.2E)", dataUri: "/demo/maps/dq03_nearest.json" },
        {
          type: "summary",
          title: "Nearest Float List",
          text: "Top 5 nearest floats: WMO_5901234 (12 km), WMO_5905678 (24 km)...",
          provenance: ["WMO_5901234.nc"],
        },
      ],
    },
    {
      id: "dq04",
      prompt: "Show temperature profiles for float WMO_5901234 for its last 3 cycles.",
      primaryContentType: "chart",
      cards: [
        {
          type: "chart",
          title: "Temperature vs Depth — WMO_5901234 (last 3 cycles)",
          dataUri: "/demo/charts/dq04_temp_profiles.json",
        },
        {
          type: "summary",
          title: "Profile Metadata",
          text: "Cycles: 182 to 184. Deployment date: 2021-06-10. QC: majority good.",
          provenance: ["WMO_5901234_cycle182.nc"],
        },
      ],
    },
  ]

  return demoQuestions.find((q) => q.id === questionId)
}
