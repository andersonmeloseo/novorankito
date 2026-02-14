import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import {
  pluginEvents, adsTrackingStats, utmSourceDistribution, utmMediumDistribution,
  utmCampaignDistribution, adsByCampaign,
} from "@/lib/plugin-mock-data";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { Target, Megaphone, Globe, Tag, Hash, Link2, Percent, TrendingUp } from "lucide-react";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, DonutCenterLabel,
} from "@/components/analytics/ChartPrimitives";

function generateSparkline(length = 12, base = 50, variance = 20): number[] {
  return Array.from({ length }, () => Math.max(0, base + Math.floor((Math.random() - 0.3) * variance)));
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80; const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return <svg width={w} height={h} className="ml-auto"><polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SparkKpi({ label, value, change, suffix, sparkData, color, icon: Icon }: {
  label: string; value: string | number; change: number; suffix?: string;
  sparkData: number[]; color: string; icon?: React.ElementType;
}) {
  const isPositive = change >= 0;
  return (
    <Card className="p-3.5 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isPositive ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
            {isPositive ? "+" : ""}{change}%
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-xl font-bold text-foreground font-display tracking-tight">{value}{suffix}</span>
          <Sparkline data={sparkData} color={color} />
        </div>
      </div>
    </Card>
  );
}

export function AdsUtmTrackingTab() {
  const { withGclid, withFbclid, withFbc, withFbp, withUtm, total } = adsTrackingStats;
  const gclidPct = total > 0 ? ((withGclid / total) * 100).toFixed(1) : "0";
  const fbclidPct = total > 0 ? ((withFbclid / total) * 100).toFixed(1) : "0";
  const utmPct = total > 0 ? ((withUtm / total) * 100).toFixed(1) : "0";

  // Ads capture funnel
  const adsFunnel = [
    { label: "UTM Params", value: withUtm, color: "hsl(var(--primary))" },
    { label: "Google Ads (gclid)", value: withGclid, color: "hsl(var(--info))" },
    { label: "Meta Ads (fbclid)", value: withFbclid, color: "hsl(var(--chart-5))" },
    { label: "FB Cookie (_fbc)", value: withFbc, color: "hsl(var(--warning))" },
    { label: "FB Pixel (_fbp)", value: withFbp, color: "hsl(var(--success))" },
  ].sort((a, b) => b.value - a.value);

  // Ads pie
  const adsPie = [
    { name: "gclid", value: withGclid },
    { name: "fbclid", value: withFbclid },
    { name: "_fbc", value: withFbc },
    { name: "_fbp", value: withFbp },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Info banner */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Dados de Ads Capturados (NOVO v3.1.0)</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O plugin captura automaticamente <strong>gclid</strong> (Google Ads), <strong>fbclid</strong> (Meta Ads), 
              cookies <strong>_fbc</strong> e <strong>_fbp</strong> (Conversions API) e todos os parâmetros <strong>UTM</strong>. 
              Os dados persistem durante toda a navegação do usuário.
            </p>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <SparkKpi label="UTM Capturados" value={withUtm} change={18.4} sparkData={generateSparkline(12, 80, 30)} color="hsl(var(--primary))" icon={Tag} />
        <SparkKpi label="Google Ads" value={withGclid} change={14.2} sparkData={generateSparkline(12, 30, 12)} color="hsl(var(--info))" icon={Hash} />
        <SparkKpi label="Meta Ads" value={withFbclid} change={9.8} sparkData={generateSparkline(12, 25, 10)} color="hsl(var(--chart-5))" icon={Megaphone} />
        <SparkKpi label="_fbc Cookie" value={withFbc} change={7.1} sparkData={generateSparkline(12, 15, 6)} color="hsl(var(--warning))" icon={Link2} />
        <SparkKpi label="_fbp Pixel" value={withFbp} change={5.6} sparkData={generateSparkline(12, 12, 5)} color="hsl(var(--success))" icon={Globe} />
        <SparkKpi label="% c/ gclid" value={gclidPct} suffix="%" change={3.2} sparkData={generateSparkline(12, 20, 8)} color="hsl(var(--info))" icon={Percent} />
        <SparkKpi label="% c/ UTM" value={utmPct} suffix="%" change={6.5} sparkData={generateSparkline(12, 50, 15)} color="hsl(var(--primary))" icon={Percent} />
      </StaggeredGrid>

      {/* Ads capture funnel + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer>
          <Card className="p-5">
            <ChartHeader title="Funnel de Captura de Ads" subtitle="Volume de dados de ads capturados pelo plugin" />
            <div className="space-y-2">
              {adsFunnel.map((step, i) => (
                <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={adsFunnel[0].value} color={step.color} index={i} />
              ))}
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.05}>
          <Card className="p-5">
            <ChartHeader title="Distribuição de IDs de Ads" subtitle="Donut — gclid, fbclid, _fbc, _fbp" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={adsPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                    {adsPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <DonutCenterLabel viewBox={{ cx: "50%", cy: "50%" }} value={adsPie.reduce((s, d) => s + d.value, 0)} label="IDs" />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* UTM Source + Medium + Campaign bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="utm_source" subtitle="Origem da campanha" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utmSourceDistribution} layout="vertical" margin={{ left: 5 }}>
                  <defs>
                    {utmSourceDistribution.map((_, i) => <BarGradient key={i} id={`utmSrc-${i}`} color={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" width={70} {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Eventos">
                    {utmSourceDistribution.map((_, i) => <Cell key={i} fill={`url(#utmSrc-${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <ChartHeader title="utm_medium" subtitle="Meio da campanha" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utmMediumDistribution} layout="vertical" margin={{ left: 5 }}>
                  <defs>
                    {utmMediumDistribution.map((_, i) => <BarGradient key={i} id={`utmMed-${i}`} color={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" width={60} {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Eventos">
                    {utmMediumDistribution.map((_, i) => <Cell key={i} fill={`url(#utmMed-${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.2}>
          <Card className="p-5">
            <ChartHeader title="utm_campaign" subtitle="Nome da campanha" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utmCampaignDistribution} layout="vertical" margin={{ left: 5 }}>
                  <defs>
                    {utmCampaignDistribution.map((_, i) => <BarGradient key={i} id={`utmCamp-${i}`} color={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" width={100} {...AXIS_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Eventos">
                    {utmCampaignDistribution.map((_, i) => <Cell key={i} fill={`url(#utmCamp-${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Campaign performance table */}
      <AnimatedContainer delay={0.25}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Performance por Campanha</h3>
            <p className="text-[10px] text-muted-foreground">Dados capturados automaticamente via UTM + gclid/fbclid</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Campanha</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Eventos</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Conversões</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Conv. %</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">Receita</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">gclid</th>
                  <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">fbclid</th>
                </tr>
              </thead>
              <tbody>
                {adsByCampaign.map((c) => (
                  <tr key={c.campaign} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground">{c.campaign}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{c.events}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-success">{c.conversions}</td>
                    <td className="px-4 py-2.5 text-xs text-right">
                      <Badge variant={c.conversionRate > 15 ? "default" : "secondary"} className="text-[9px]">{c.conversionRate}%</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-right text-foreground">R$ {c.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{c.hasGclid}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{c.hasFbclid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Recent events with ads data */}
      <AnimatedContainer delay={0.3}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Eventos Recentes com Dados de Ads</h3>
            <p className="text-[10px] text-muted-foreground">Persistência de sessão — dados capturados na primeira visita</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Evento</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Source</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Medium</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Campaign</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">gclid</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">fbclid</th>
                </tr>
              </thead>
              <tbody>
                {pluginEvents.filter(e => e.gclid || e.fbclid || e.utm_source).slice(0, 12).map((e) => (
                  <tr key={e.event_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[9px]">{e.event_type.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.utm_source || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.utm_medium || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.utm_campaign || "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground truncate max-w-[100px]">{e.gclid ? e.gclid.substring(0, 12) + "…" : "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground truncate max-w-[100px]">{e.fbclid ? e.fbclid.substring(0, 12) + "…" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
