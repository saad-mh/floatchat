// Demo data service for FloatChat
export interface DemoDataResponse {
  map?: any
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
        { id: "WMO_5901234", lat: 0.12, lon: -0.03, label: "WMO_5901234", popup: "3 profiles — Mar 2023" },
        { id: "WMO_5902345", lat: -0.2, lon: 0.8, label: "WMO_5902345", popup: "2 profiles — Mar 2023" },
        { id: "WMO_5903456", lat: 0.05, lon: 0.15, label: "WMO_5903456", popup: "1 profile — Mar 2023" },
      ],
      bbox: null,
    },
    chart: {
      type: "profiles",
      variable: "salinity",
      units: "PSU",
      traces: [
        {
          id: "P1",
          float: "WMO_5901234",
          cycle: 182,
          depths: [0, 5, 10, 25, 50, 100, 200],
          values: [35.1, 35.05, 35.02, 34.95, 34.9, 34.85, 34.8],
        },
        {
          id: "P2",
          float: "WMO_5902345",
          cycle: 183,
          depths: [0, 5, 10, 25, 50, 100, 200],
          values: [35.2, 35.15, 35.1, 35.0, 34.95, 34.88, 34.82],
        },
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
