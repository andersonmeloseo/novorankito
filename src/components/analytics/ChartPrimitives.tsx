import { ReactNode } from "react";

/* ─── Shared Tooltip ─── */
export const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card) / 0.85)",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 11,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.18), 0 0 0 1px hsl(var(--border) / 0.5)",
  padding: "8px 12px",
};

/* ─── Shared Colors ─── */
export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-11))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-10))",
  "hsl(var(--chart-12))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-2))",
];

/* ─── Custom Donut Center Label ─── */
export function DonutCenterLabel({ viewBox, value, label }: { viewBox?: any; value: string | number; label?: string }) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-foreground">
      <tspan x={cx} dy="-0.3em" className="text-lg font-bold font-display" style={{ fill: "hsl(var(--foreground))" }}>
        {value}
      </tspan>
      {label && (
        <tspan x={cx} dy="1.4em" className="text-[9px]" style={{ fill: "hsl(var(--muted-foreground))" }}>
          {label}
        </tspan>
      )}
    </text>
  );
}

/* ─── Gradient Defs Helper ─── */
export function ChartGradient({ id, color, opacity = 0.2 }: { id: string; color: string; opacity?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={opacity} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}

/* ─── Bar Gradient (horizontal) ─── */
export function BarGradient({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={color} stopOpacity={0.7} />
      <stop offset="100%" stopColor={color} stopOpacity={1} />
    </linearGradient>
  );
}

/* ─── Chart Section Header ─── */
export function ChartHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ─── Shared Axis Styles ─── */
export const AXIS_STYLE = {
  tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
  tickLine: false as const,
  axisLine: false as const,
  stroke: "hsl(var(--muted-foreground))",
};

export const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
  strokeOpacity: 0.5,
};

export const LEGEND_STYLE = {
  iconSize: 8,
  wrapperStyle: { fontSize: 10, paddingTop: 8, opacity: 0.85 },
};

export function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
