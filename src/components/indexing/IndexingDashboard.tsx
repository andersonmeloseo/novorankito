import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ShieldCheck, ShieldOff, AlertCircle, HelpCircle, Zap, Globe, TrendingUp,
  Activity, Calendar, BarChart3, PieChart as PieChartIcon, Info, CheckCircle2, XCircle
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, AreaChart, Area, Legend
} from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InventoryUrl, InventoryStats, IndexingRequest } from "@/hooks/use-indexing";

interface Props {
  stats: InventoryStats;
  inventory: InventoryUrl[];
  requests: IndexingRequest[];
  sitemaps: any[];
}

/* ─── Color palette using design tokens ─── */
const CHART_COLORS = {
  indexed: "hsl(var(--chart-2))",       // green
  notIndexed: "hsl(var(--chart-4))",    // red
  unknown: "hsl(var(--chart-5))",       // purple
  success: "hsl(var(--chart-2))",
  failure: "hsl(var(--chart-4))",
  sent: "hsl(var(--chart-1))",          // primary blue
  declared: "hsl(var(--chart-6))",      // cyan
};

/* ────────────────────────────────────────────
   Health Gauge — circular score with explanation
   ──────────────────────────────────────────── */
function HealthGauge({ score, stats }: { score: number; stats: InventoryStats }) {
  const color = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const bgColor = score >= 75 ? "bg-success/10" : score >= 50 ? "bg-warning/10" : "bg-destructive/10";
  const label = score >= 75 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;

  const indexedPct = stats.totalUrls > 0 ? Math.round((stats.indexed / stats.totalUrls) * 100) : 0;
  const inspectedPct = stats.totalUrls > 0 ? Math.round(((stats.totalUrls - stats.unknown) / stats.totalUrls) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Saúde do Site</h3>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            Score calculado com base em: <strong>50%</strong> taxa de indexação, <strong>30%</strong> cobertura de inspeção e <strong>20%</strong> penalidade por URLs não indexadas. Quanto mais URLs indexadas e inspecionadas, maior o score.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" opacity={0.3} />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={`${color} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${color}`}>{score}</span>
            <span className="text-[9px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-3">
          <Badge variant="outline" className={`text-[10px] ${bgColor} ${color} border-current/20`}>
            {label}
          </Badge>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Taxa de Indexação</span>
                <span className="text-[10px] font-medium text-foreground">{indexedPct}%</span>
              </div>
              <Progress value={indexedPct} className="h-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Cobertura de Inspeção</span>
                <span className="text-[10px] font-medium text-foreground">{inspectedPct}%</span>
              </div>
              <Progress value={inspectedPct} className="h-1.5" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {score >= 75
              ? "Seu site está bem indexado. Continue monitorando para manter a saúde."
              : score >= 50
              ? "Algumas URLs não estão indexadas. Envie-as para indexação ou inspecione para entender o motivo."
              : "Muitas URLs não indexadas ou sem inspeção. Revise sua cobertura com urgência."}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ icon: Icon, label, value, suffix, description, color }: {
  icon: React.ElementType; label: string; value: number | string;
  suffix?: string; description: string; color?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color || "bg-primary/10"}`}>
          <Icon className={`h-4 w-4 ${color ? "" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="text-xl font-bold text-foreground tabular-nums mt-0.5">
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            {suffix && <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{description}</p>
    </Card>
  );
}

/* ─── Custom Tooltips ─── */
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.payload.fill }} />
        <span className="text-xs font-medium text-foreground">{d.name}</span>
      </div>
      <div className="text-sm font-bold text-foreground mt-0.5">
        {d.value.toLocaleString("pt-BR")} URLs ({d.payload.percent}%)
      </div>
    </div>
  );
};

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.stroke }} />
          <span className="text-xs text-muted-foreground">{p.name}:</span>
          <span className="text-xs font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="text-[10px] text-muted-foreground mb-1 max-w-[200px] truncate">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span className="text-xs text-muted-foreground">{p.name}:</span>
          <span className="text-xs font-bold text-foreground">{p.value.toLocaleString("pt-BR")}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Pie Legend ─── */
function PieLegend({ data }: { data: { name: string; value: number; fill: string; percent: string }[] }) {
  return (
    <div className="space-y-2 mt-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: d.fill }} />
            <span className="text-muted-foreground">{d.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground tabular-nums">{d.value.toLocaleString("pt-BR")}</span>
            <span className="text-muted-foreground">({d.percent}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ════════════════════════════════════════════ */
export function IndexingDashboard({ stats, inventory, requests, sitemaps }: Props) {
  // ─── Health Score ───
  const healthScore = useMemo(() => {
    if (stats.totalUrls === 0) return 0;
    const indexedRatio = stats.indexed / stats.totalUrls;
    const inspectedRatio = (stats.totalUrls - stats.unknown) / stats.totalUrls;
    const notIndexedPenalty = stats.notIndexed / stats.totalUrls;
    const score = Math.round(
      (indexedRatio * 50) + (inspectedRatio * 30) + ((1 - notIndexedPenalty) * 20)
    );
    return Math.max(0, Math.min(100, score));
  }, [stats]);

  // ─── Pie Chart Data ───
  const pieData = useMemo(() => {
    const total = stats.totalUrls || 1;
    return [
      { name: "Indexadas", value: stats.indexed, fill: CHART_COLORS.indexed, percent: Math.round((stats.indexed / total) * 100) + "" },
      { name: "Não Indexadas", value: stats.notIndexed, fill: CHART_COLORS.notIndexed, percent: Math.round((stats.notIndexed / total) * 100) + "" },
      { name: "Sem Inspeção", value: stats.unknown, fill: CHART_COLORS.unknown, percent: Math.round((stats.unknown / total) * 100) + "" },
    ].filter(d => d.value > 0);
  }, [stats]);

  // ─── Timeline Data (30 days) ───
  const timelineData = useMemo(() => {
    const days: Record<string, { date: string; sucesso: number; falha: number; total: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "dd/MM");
      const key = format(subDays(new Date(), i), "yyyy-MM-dd");
      days[key] = { date: d, sucesso: 0, falha: 0, total: 0 };
    }
    (requests || []).forEach(r => {
      const key = r.submitted_at ? format(startOfDay(parseISO(r.submitted_at)), "yyyy-MM-dd") : null;
      if (key && days[key]) {
        days[key].total++;
        if (r.status === "success") days[key].sucesso++;
        else if (r.status === "failed" || r.status === "quota_exceeded") days[key].falha++;
      }
    });
    return Object.values(days);
  }, [requests]);

  // ─── Sitemap Bar Data ───
  const sitemapBarData = useMemo(() => {
    return sitemaps.slice(0, 10).map((sm: any) => {
      const path = sm.path || "";
      const shortName = path.replace(/https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/sitemap.xml";
      const indexPct = sm.urlCount > 0 ? Math.round((sm.indexedCount / sm.urlCount) * 100) : 0;
      return {
        name: shortName.length > 20 ? shortName.slice(0, 17) + "…" : shortName,
        fullName: shortName,
        declaradas: sm.urlCount || 0,
        indexadas: sm.indexedCount || 0,
        percent: indexPct,
      };
    });
  }, [sitemaps]);

  return (
    <div className="space-y-4">

      {/* ─── Row 1: Health Gauge + KPI Cards ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HealthGauge score={healthScore} stats={stats} />

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            icon={Globe} label="Total de URLs" value={stats.totalUrls}
            description="Quantidade total de URLs descobertas no seu site via sitemap e crawling."
          />
          <KpiCard
            icon={ShieldCheck} label="Indexadas" value={stats.indexed}
            color="bg-success/10 text-success"
            description="URLs que o Google confirmou estar no índice de busca."
          />
          <KpiCard
            icon={ShieldOff} label="Não Indexadas" value={stats.notIndexed}
            color="bg-destructive/10 text-destructive"
            description="URLs que foram inspecionadas mas não estão no índice do Google."
          />
          <KpiCard
            icon={HelpCircle} label="Sem Inspeção" value={stats.unknown}
            color="bg-chart-5/10 text-chart-5"
            description="URLs que ainda não foram inspecionadas. Use 'Varrer Status' para verificar."
          />
        </div>
      </div>

      {/* ─── Row 2: Pie Chart + Timeline ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Distribuição de Status</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Proporção de URLs indexadas, não indexadas e pendentes de inspeção.
          </p>
          {pieData.length > 0 ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={48} outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <PieLegend data={pieData} />
            </>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
          )}
        </Card>

        {/* Timeline */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Atividade de Indexação (30 dias)</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Histórico diário dos envios de URLs para indexação. <strong className="text-success">Verde</strong> = sucesso, <strong className="text-destructive">Vermelho</strong> = falha ou quota excedida.
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="gradSucesso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFalha" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.failure} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.failure} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <RechartsTooltip content={<AreaTooltip />} />
                <Area type="monotone" dataKey="sucesso" name="Sucesso" stroke={CHART_COLORS.success} fill="url(#gradSucesso)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="falha" name="Falha" stroke={CHART_COLORS.failure} fill="url(#gradFalha)" strokeWidth={2} dot={false} />
                <Legend
                  verticalAlign="top" align="right" height={28}
                  formatter={(value: string) => <span className="text-[10px] text-muted-foreground">{value}</span>}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ─── Row 3: Sitemap Coverage ─── */}
      {sitemapBarData.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Cobertura por Sitemap</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">
            Visualize a taxa de indexação de cada sitemap. Quanto mais preenchida a barra, melhor a cobertura.
          </p>
          <div className="space-y-3">
            {sitemapBarData.map((sm, i) => {
              const pct = sm.percent;
              const barColor = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive";
              const textColor = pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-medium text-foreground truncate max-w-[250px] cursor-default">{sm.name}</span>
                      </TooltipTrigger>
                      <TooltipContent>{sm.fullName}</TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {sm.indexadas.toLocaleString("pt-BR")} / {sm.declaradas.toLocaleString("pt-BR")}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${textColor}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${barColor} transition-all duration-700 ease-out`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-success" />
              <span className="text-[10px] text-muted-foreground">≥ 80%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-warning" />
              <span className="text-[10px] text-muted-foreground">50–79%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-destructive" />
              <span className="text-[10px] text-muted-foreground">{"<"} 50%</span>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
