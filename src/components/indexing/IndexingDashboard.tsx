import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ShieldCheck, ShieldOff, AlertCircle, HelpCircle, Zap, Globe, TrendingUp, TrendingDown,
  Activity, Calendar, BarChart3, PieChart as PieChartIcon
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
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

const COLORS = {
  indexed: "hsl(var(--success))",
  notIndexed: "hsl(var(--destructive))",
  unknown: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
};

function HealthGauge({ score }: { score: number }) {
  const color = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const bgColor = score >= 75 ? "bg-success/10" : score >= 50 ? "bg-warning/10" : "bg-destructive/10";
  const label = score >= 75 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
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
      <Badge variant="outline" className={`text-[10px] ${bgColor} ${color} border-current/20`}>
        {label}
      </Badge>
    </div>
  );
}

function KpiMini({ icon: Icon, label, value, suffix, color }: { icon: React.ElementType; label: string; value: number | string; suffix?: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
      <div className={`p-2 rounded-lg ${color || "bg-primary/10"}`}>
        <Icon className={`h-4 w-4 ${color ? "" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        <div className="text-lg font-bold text-foreground tabular-nums">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          {suffix && <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

const CustomTooltipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: payload[0].payload.fill }} />
        <span className="text-xs font-medium text-foreground">{payload[0].name}</span>
      </div>
      <div className="text-sm font-bold text-foreground mt-0.5">{payload[0].value.toLocaleString("pt-BR")} URLs</div>
    </div>
  );
};

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
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

const CustomTooltipArea = ({ active, payload, label }: any) => {
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
  const pieData = useMemo(() => [
    { name: "Indexadas", value: stats.indexed, fill: COLORS.indexed },
    { name: "Não Indexadas", value: stats.notIndexed, fill: COLORS.notIndexed },
    { name: "Sem Inspeção", value: stats.unknown, fill: COLORS.unknown },
  ].filter(d => d.value > 0), [stats]);

  // ─── Timeline Data (last 30 days of indexing requests) ───
  const timelineData = useMemo(() => {
    const days: Record<string, { date: string; enviadas: number; sucesso: number; falha: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "dd/MM");
      const key = format(subDays(new Date(), i), "yyyy-MM-dd");
      days[key] = { date: d, enviadas: 0, sucesso: 0, falha: 0 };
    }
    (requests || []).forEach(r => {
      const key = r.submitted_at ? format(startOfDay(parseISO(r.submitted_at)), "yyyy-MM-dd") : null;
      if (key && days[key]) {
        days[key].enviadas++;
        if (r.status === "success") days[key].sucesso++;
        else if (r.status === "failed") days[key].falha++;
      }
    });
    return Object.values(days);
  }, [requests]);

  // ─── Bar Chart Data (sitemaps) ───
  const sitemapBarData = useMemo(() => {
    return sitemaps.slice(0, 10).map((sm: any) => {
      const path = sm.path || "";
      const shortName = path.replace(/https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/sitemap.xml";
      return {
        name: shortName.length > 25 ? shortName.slice(0, 22) + "…" : shortName,
        declaradas: sm.urlCount || 0,
        indexadas: sm.indexedCount || 0,
      };
    });
  }, [sitemaps]);

  const indexedPercent = stats.totalUrls > 0 ? Math.round((stats.indexed / stats.totalUrls) * 100) : 0;
  const inspectedPercent = stats.totalUrls > 0 ? Math.round(((stats.totalUrls - stats.unknown) / stats.totalUrls) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ─── KPI Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Health Score */}
        <Card className="p-4 flex items-center justify-center lg:row-span-1">
          <HealthGauge score={healthScore} />
        </Card>

        {/* KPI Mini Cards */}
        <div className="col-span-2 lg:col-span-2 grid grid-cols-2 gap-2">
          <KpiMini icon={Globe} label="Total de URLs" value={stats.totalUrls} />
          <KpiMini icon={ShieldCheck} label="Indexadas" value={stats.indexed} color="bg-success/10 text-success" />
          <KpiMini icon={ShieldOff} label="Não Indexadas" value={stats.notIndexed} color="bg-destructive/10 text-destructive" />
          <KpiMini icon={HelpCircle} label="Sem Inspeção" value={stats.unknown} color="bg-muted text-muted-foreground" />
        </div>

        {/* Progress Cards */}
        <Card className="p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxa de Indexação</div>
            <div className="text-2xl font-bold text-foreground mt-1">{indexedPercent}%</div>
          </div>
          <Progress value={indexedPercent} className="h-2" />
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-success" />
            {stats.indexed} de {stats.totalUrls}
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cobertura de Inspeção</div>
            <div className="text-2xl font-bold text-foreground mt-1">{inspectedPercent}%</div>
          </div>
          <Progress value={inspectedPercent} className="h-2" />
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Activity className="h-3 w-3 text-primary" />
            {stats.totalUrls - stats.unknown} inspecionadas
          </div>
        </Card>
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Pie Chart */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground">Distribuição de Status</h3>
          </div>
          {pieData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltipPie />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
          )}
          <div className="flex items-center justify-center gap-4 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-[10px] text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Timeline Chart */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground">Atividade de Indexação (30 dias)</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="gradSucesso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.indexed} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.indexed} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFalha" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.notIndexed} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.notIndexed} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={30} />
                <RechartsTooltip content={<CustomTooltipArea />} />
                <Area type="monotone" dataKey="sucesso" name="Sucesso" stroke={COLORS.indexed} fill="url(#gradSucesso)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="falha" name="Falha" stroke={COLORS.notIndexed} fill="url(#gradFalha)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ─── Sitemap Bar Chart ─── */}
      {sitemapBarData.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground">URLs Declaradas vs Indexadas por Sitemap</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sitemapBarData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={130} />
                <RechartsTooltip content={<CustomTooltipBar />} />
                <Bar dataKey="declaradas" name="Declaradas" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} barSize={14} opacity={0.4} />
                <Bar dataKey="indexadas" name="Indexadas" fill={COLORS.indexed} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
              <span className="text-[10px] text-muted-foreground">Declaradas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.indexed }} />
              <span className="text-[10px] text-muted-foreground">Indexadas</span>
            </div>
          </div>
        </Card>
      )}

      {/* Quota Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Quota de Indexação Diária</div>
              <div className="text-lg font-bold text-foreground tabular-nums">{stats.sentToday} / {stats.dailyLimit}</div>
            </div>
          </div>
          <div className="w-32">
            <Progress value={Math.min(100, Math.round((stats.sentToday / stats.dailyLimit) * 100))} className="h-2.5" />
            <div className="text-[9px] text-muted-foreground text-right mt-1">
              {Math.max(0, stats.dailyLimit - stats.sentToday)} restantes
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
