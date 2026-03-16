import type { TrackingEvent } from "@/hooks/use-tracking-events";

export interface ClickPoint {
  x: number; y: number; vx: number; vy: number;
  vpW: number; vpH: number; docH: number;
}

export interface MovePoint { x: number; y: number; t: number; }

export interface HeatmapSnapshot {
  id: string; url: string; mode: string; device: string;
  totalClicks: number; avgScroll: number; visitors: number;
  capturedAt: string; thumbnail: string;
}

export interface UrlOption {
  url: string;
  rawUrls: string[];
  clicks: number;
  exits: number;
  views: number;
  visitors: number;
  avgScroll: number;
  moveCount: number;
  firstEvent: string;
  lastEvent: string;
  topCity: string;
  topCountry: string;
  topBrowser: string;
  topReferrer: string;
  devices: string[];
}

export const SNAPSHOTS_KEY = "rankito_heatmap_snapshots";
export function loadSnapshots(): HeatmapSnapshot[] {
  try { return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]"); } catch { return []; }
}
export function saveSnapshots(s: HeatmapSnapshot[]) {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(s.slice(0, 30)));
}

export const TRAIL_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];

export const DATE_RANGES = [
  { value: 7, label: "7 dias" },
  { value: 14, label: "14 dias" },
  { value: 30, label: "30 dias" },
] as const;

export type DateRangeValue = 7 | 14 | 30;
