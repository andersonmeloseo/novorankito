// Types for the Overview page components

export interface OverviewRpcData {
  total_urls: number;
  total_clicks: number;
  total_impressions: number;
  avg_position: number;
  avg_ctr: number;
  total_queries: number;
  indexing: {
    submitted: number;
    failed: number;
    inspected: number;
    indexed: number;
    total_requests: number;
    total_urls: number;
  };
  top_pages: Array<{
    url: string;
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
  }>;
  top_queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    position: number;
  }>;
  devices: Array<{
    device: string;
    clicks: number;
    impressions: number;
  }>;
  countries: Array<{
    country: string;
    clicks: number;
    impressions: number;
  }>;
  daily_trend: Array<{
    metric_date: string;
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
  }>;
}

export interface OverviewKpiProps {
  label: string;
  value: string;
  change?: number;
  previousValue?: string;
  explanation?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sparkData?: number[];
  sparkColor?: string;
  subtitle?: string;
}

export interface IndexingStats {
  totalUrls: number;
  submitted: number;
  failed: number;
  inspected: number;
  indexed: number;
  totalRequests: number;
  pending: number;
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString("pt-BR");
}

export const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))",
];
