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

/* ─── Gradient Defs Helper (vertical) ─── */
export function ChartGradient({ id, color, opacity = 0.2 }: { id: string; color: string; opacity?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={opacity} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}

/* ─── Line Glow Gradient (vertical for area under line) ─── */
export function LineGlowGradient({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.35} />
      <stop offset="50%" stopColor={color} stopOpacity={0.1} />
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

/* ─── Funnel Step Component ─── */
export function FunnelStep({ label, value, maxValue, color, index }: {
  label: string; value: number; maxValue: number; color: string; index: number; total?: number;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="w-[120px] text-right">
        <span className="text-[10px] text-muted-foreground leading-tight block truncate">{label}</span>
      </div>
      <div className="flex-1 relative">
        <div className="h-7 rounded-lg bg-muted/30 overflow-hidden">
          <div
            className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2"
            style={{
              width: `${Math.max(pct, 4)}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              boxShadow: `0 0 12px ${color}33`,
            }}
          >
            <span className="text-[10px] font-bold text-white drop-shadow-sm">
              {value.toLocaleString("pt-BR")}
            </span>
          </div>
        </div>
      </div>
      <div className="w-12 text-right">
        <span className="text-[10px] font-medium text-muted-foreground">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

/* ─── Custom Treemap Content ─── */
export function TreemapContent(props: any) {
  const { x, y, width, height, name, value, color } = props;
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} ry={6}
        style={{ fill: color, stroke: "hsl(var(--background))", strokeWidth: 2, opacity: 0.85 }}
      />
      {width > 50 && height > 30 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 5} textAnchor="middle" dominantBaseline="central"
            style={{ fill: "#fff", fontSize: 10, fontWeight: 600 }}>
            {(name || "").substring(0, Math.floor(width / 7))}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" dominantBaseline="central"
            style={{ fill: "#ffffffbb", fontSize: 9 }}>
            {(value || 0).toLocaleString("pt-BR")}
          </text>
        </>
      )}
    </g>
  );
}

/* ─── Pipeline Visual Component ─── */
export function PipelineVisual({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...steps.map(s => s.value), 1);
  return (
    <div className="flex items-end gap-1 h-[160px]">
      {steps.map((step, i) => {
        const heightPct = Math.max((step.value / max) * 100, 8);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-bold text-foreground">{step.value.toLocaleString("pt-BR")}</span>
            <div className="w-full rounded-t-lg transition-all duration-700" style={{
              height: `${heightPct}%`,
              background: `linear-gradient(180deg, ${step.color}, ${step.color}66)`,
              boxShadow: `0 0 16px ${step.color}22`,
            }} />
            <span className="text-[8px] text-muted-foreground text-center leading-tight truncate w-full">{step.label}</span>
            {i < steps.length - 1 && (
              <span className="text-[8px] text-muted-foreground absolute" style={{ display: 'none' }}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Cohort Heatmap Grid ─── */
export function CohortHeatmap({ data, xLabels, yLabels, maxValue, hue = 210 }: {
  data: number[][]; xLabels: string[]; yLabels: string[]; maxValue: number; hue?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `80px repeat(${xLabels.length}, 1fr)` }}>
        <div />
        {xLabels.map((label, i) => (
          <div key={i} className="text-[8px] text-muted-foreground text-center font-medium px-1 truncate">{label}</div>
        ))}
        {yLabels.map((yLabel, row) => (
          <>
            <div key={`y-${row}`} className="text-[9px] text-muted-foreground text-right pr-2 flex items-center justify-end">{yLabel}</div>
            {(data[row] || []).map((val, col) => {
              const intensity = maxValue > 0 ? Math.min(val / maxValue, 1) : 0;
              return (
                <div
                  key={`${row}-${col}`}
                  className="rounded-md min-w-[32px] min-h-[28px] flex items-center justify-center transition-transform hover:scale-[1.08] cursor-default"
                  style={{
                    background: `hsla(${hue}, 70%, 50%, ${0.08 + intensity * 0.7})`,
                    border: `1px solid hsla(${hue}, 70%, 50%, ${0.1 + intensity * 0.2})`,
                  }}
                  title={`${yLabel} × ${xLabels[col]}: ${val}`}
                >
                  <span className="text-[9px] font-medium" style={{
                    color: intensity > 0.5 ? '#fff' : 'hsl(var(--foreground))',
                  }}>
                    {val > 0 ? val.toLocaleString("pt-BR") : "–"}
                  </span>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
