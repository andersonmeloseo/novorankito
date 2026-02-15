import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { useTrackingEvents, EVENT_LABELS } from "@/hooks/use-tracking-events";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { Target, Megaphone, Globe, Tag, Hash, Link2, Percent, Loader2 } from "lucide-react";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, DonutCenterLabel,
} from "@/components/analytics/ChartPrimitives";
import { EmptyState } from "@/components/ui/empty-state";

function SparkKpi({ label, value, suffix, color, icon: Icon }: {
  label: string; value: string | number; suffix?: string; color: string; icon?: React.ElementType;
}) {
  return (
    <Card className="p-3.5 card-hover group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
        <span className="text-xl font-bold text-foreground font-display tracking-tight">{value}{suffix}</span>
      </div>
    </Card>
  );
}

export function AdsUtmTrackingTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const { data: allEvents = [], isLoading } = useTrackingEvents(projectId);

  const stats = useMemo(() => {
    const total = allEvents.length;
    const withGclid = allEvents.filter(e => e.gclid).length;
    const withFbclid = allEvents.filter(e => e.fbclid).length;
    const withUtm = allEvents.filter(e => e.utm_source).length;
    // fbc/fbp not in schema, count fbclid-derived
    return { total, withGclid, withFbclid, withFbc: 0, withFbp: 0, withUtm };
  }, [allEvents]);

  const gclidPct = stats.total > 0 ? ((stats.withGclid / stats.total) * 100).toFixed(1) : "0";
  const utmPct = stats.total > 0 ? ((stats.withUtm / stats.total) * 100).toFixed(1) : "0";

  const adsFunnel = useMemo(() => [
    { label: "UTM Params", value: stats.withUtm, color: "hsl(var(--primary))" },
    { label: "Google Ads (gclid)", value: stats.withGclid, color: "hsl(var(--info))" },
    { label: "Meta Ads (fbclid)", value: stats.withFbclid, color: "hsl(var(--chart-5))" },
  ].filter(d => d.value > 0).sort((a, b) => b.value - a.value), [stats]);

  const adsPie = useMemo(() => [
    { name: "gclid", value: stats.withGclid },
    { name: "fbclid", value: stats.withFbclid },
  ].filter(d => d.value > 0), [stats]);

  const utmSourceDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allEvents.filter(e => e.utm_source).forEach(e => map.set(e.utm_source!, (map.get(e.utm_source!) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [allEvents]);

  const utmMediumDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allEvents.filter(e => e.utm_medium).forEach(e => map.set(e.utm_medium!, (map.get(e.utm_medium!) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [allEvents]);

  const utmCampaignDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allEvents.filter(e => e.utm_campaign).forEach(e => map.set(e.utm_campaign!, (map.get(e.utm_campaign!) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [allEvents]);

  const adsByCampaign = useMemo(() => {
    const map = new Map<string, { events: number; conversions: number; revenue: number; hasGclid: number; hasFbclid: number }>();
    allEvents.filter(e => e.utm_campaign).forEach(e => {
      const entry = map.get(e.utm_campaign!) || { events: 0, conversions: 0, revenue: 0, hasGclid: 0, hasFbclid: 0 };
      entry.events++;
      if (e.event_type === "purchase") { entry.conversions++; entry.revenue += e.cart_value || 0; }
      if (e.gclid) entry.hasGclid++;
      if (e.fbclid) entry.hasFbclid++;
      map.set(e.utm_campaign!, entry);
    });
    return Array.from(map.entries()).map(([campaign, v]) => ({
      campaign, ...v,
      conversionRate: v.events > 0 ? Number(((v.conversions / v.events) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.events - a.events);
  }, [allEvents]);

  const adsEvents = useMemo(() => allEvents.filter(e => e.gclid || e.fbclid || e.utm_source).slice(0, 12), [allEvents]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (stats.withUtm === 0 && stats.withGclid === 0 && stats.withFbclid === 0) {
    return <EmptyState title="Nenhum dado de Ads/UTM" description="Os parâmetros UTM e IDs de ads serão capturados automaticamente quando visitantes chegarem via campanhas." />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Dados de Ads Capturados</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O plugin captura automaticamente <strong>gclid</strong> (Google Ads), <strong>fbclid</strong> (Meta Ads) e todos os parâmetros <strong>UTM</strong>.
            </p>
          </div>
        </div>
      </Card>

      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SparkKpi label="UTM Capturados" value={stats.withUtm} color="hsl(var(--primary))" icon={Tag} />
        <SparkKpi label="Google Ads" value={stats.withGclid} color="hsl(var(--info))" icon={Hash} />
        <SparkKpi label="Meta Ads" value={stats.withFbclid} color="hsl(var(--chart-5))" icon={Megaphone} />
        <SparkKpi label="% c/ gclid" value={gclidPct} suffix="%" color="hsl(var(--info))" icon={Percent} />
        <SparkKpi label="% c/ UTM" value={utmPct} suffix="%" color="hsl(var(--primary))" icon={Percent} />
      </StaggeredGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {adsFunnel.length > 0 && (
          <AnimatedContainer>
            <Card className="p-5">
              <ChartHeader title="Funnel de Captura de Ads" subtitle="Volume de dados de ads capturados" />
              <div className="space-y-2">
                {adsFunnel.map((step, i) => (
                  <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={adsFunnel[0].value} color={step.color} index={i} />
                ))}
              </div>
            </Card>
          </AnimatedContainer>
        )}

        {adsPie.length > 0 && (
          <AnimatedContainer delay={0.05}>
            <Card className="p-5">
              <ChartHeader title="Distribuição de IDs de Ads" subtitle="gclid vs fbclid" />
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
        )}
      </div>

      {/* UTM breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { data: utmSourceDistribution, title: "utm_source", subtitle: "Origem da campanha", prefix: "utmSrc" },
          { data: utmMediumDistribution, title: "utm_medium", subtitle: "Meio da campanha", prefix: "utmMed" },
          { data: utmCampaignDistribution, title: "utm_campaign", subtitle: "Nome da campanha", prefix: "utmCamp" },
        ].map((chart, ci) => chart.data.length > 0 && (
          <AnimatedContainer key={chart.title} delay={0.1 + ci * 0.05}>
            <Card className="p-5">
              <ChartHeader title={chart.title} subtitle={chart.subtitle} />
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.data} layout="vertical" margin={{ left: 5 }}>
                    <defs>
                      {chart.data.map((_, i) => <BarGradient key={i} id={`${chart.prefix}-${i}`} color={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis type="number" {...AXIS_STYLE} />
                    <YAxis dataKey="name" type="category" width={100} {...AXIS_STYLE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Eventos">
                      {chart.data.map((_, i) => <Cell key={i} fill={`url(#${chart.prefix}-${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </AnimatedContainer>
        ))}
      </div>

      {/* Campaign table */}
      {adsByCampaign.length > 0 && (
        <AnimatedContainer delay={0.25}>
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">Performance por Campanha</h3>
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
      )}

      {/* Recent events with ads data */}
      {adsEvents.length > 0 && (
        <AnimatedContainer delay={0.3}>
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">Eventos Recentes com Dados de Ads</h3>
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
                  {adsEvents.map((e) => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[9px]">{(EVENT_LABELS[e.event_type] || e.event_type).replace("_", " ")}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.utm_source || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.utm_medium || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.utm_campaign || "—"}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground truncate max-w-[100px]" title={e.gclid || undefined}>{e.gclid ? e.gclid.substring(0, 12) + "…" : "—"}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground truncate max-w-[100px]" title={e.fbclid || undefined}>{e.fbclid ? e.fbclid.substring(0, 12) + "…" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}
