import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import {
  pluginEvents, conversionsByDay, EVENT_CATEGORIES, EVENT_LABELS,
} from "@/lib/plugin-mock-data";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { MessageCircle, Phone, Mail, FileText, TrendingUp, Users, DollarSign } from "lucide-react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, LineGlowGradient, BarGradient,
  ChartHeader, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  FunnelStep, DonutCenterLabel, CohortHeatmap,
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

function SparkKpi({ label, value, change, suffix, prefix, sparkData, color, icon: Icon }: {
  label: string; value: string | number; change: number; suffix?: string; prefix?: string;
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
          <span className="text-xl font-bold text-foreground font-display tracking-tight">{prefix}{value}{suffix}</span>
          <Sparkline data={sparkData} color={color} />
        </div>
      </div>
    </Card>
  );
}

const CONV_COLORS: Record<string, string> = {
  whatsapp_click: "hsl(var(--success))",
  phone_click: "hsl(var(--warning))",
  email_click: "hsl(var(--info))",
  form_submit: "hsl(var(--primary))",
};

export function ConversionsTrackingTab() {
  const convEvents = pluginEvents.filter(e => EVENT_CATEGORIES.conversions.includes(e.event_type));
  const whatsapp = convEvents.filter(e => e.event_type === "whatsapp_click").length;
  const phone = convEvents.filter(e => e.event_type === "phone_click").length;
  const email = convEvents.filter(e => e.event_type === "email_click").length;
  const forms = convEvents.filter(e => e.event_type === "form_submit").length;
  const totalConv = convEvents.length;
  const totalValue = convEvents.reduce((s, e) => s + e.value, 0);
  const leadsWithData = convEvents.filter(e => e.lead_name || e.lead_phone || e.lead_email).length;

  // Funnel
  const convFunnel = [
    { label: "WhatsApp", value: whatsapp, color: CONV_COLORS.whatsapp_click },
    { label: "Formulários", value: forms, color: CONV_COLORS.form_submit },
    { label: "Telefone", value: phone, color: CONV_COLORS.phone_click },
    { label: "Email", value: email, color: CONV_COLORS.email_click },
  ].sort((a, b) => b.value - a.value);

  // By device
  const convByDevice = (() => {
    const map = new Map<string, { whatsapp: number; phone: number; email: number; form: number }>();
    convEvents.forEach(e => {
      const entry = map.get(e.device) || { whatsapp: 0, phone: 0, email: 0, form: 0 };
      if (e.event_type === "whatsapp_click") entry.whatsapp++;
      if (e.event_type === "phone_click") entry.phone++;
      if (e.event_type === "email_click") entry.email++;
      if (e.event_type === "form_submit") entry.form++;
      map.set(e.device, entry);
    });
    return Array.from(map.entries()).map(([device, v]) => ({
      device: device.charAt(0).toUpperCase() + device.slice(1),
      ...v,
      total: v.whatsapp + v.phone + v.email + v.form,
    }));
  })();

  // Pie data
  const convPie = [
    { name: "WhatsApp", value: whatsapp },
    { name: "Telefone", value: phone },
    { name: "Email", value: email },
    { name: "Formulário", value: forms },
  ];

  // Cohort: type × device
  const cohortData = (() => {
    const types = ["whatsapp_click", "phone_click", "email_click", "form_submit"] as const;
    const devices = ["mobile", "desktop", "tablet"];
    const data = types.map(t => devices.map(d => convEvents.filter(e => e.event_type === t && e.device === d).length));
    return { data, xLabels: devices.map(d => d.charAt(0).toUpperCase() + d.slice(1)), yLabels: ["WhatsApp", "Telefone", "Email", "Formulário"] };
  })();

  // Recent leads
  const recentLeads = convEvents
    .filter(e => e.lead_name || e.lead_phone || e.lead_email)
    .slice(0, 10);

  return (
    <div className="space-y-4 sm:space-y-5">
      <FeatureBanner icon={TrendingUp} title="Conversões por Canal" description={<>Analise conversões de <strong>WhatsApp</strong>, <strong>telefone</strong>, <strong>email</strong> e <strong>formulários</strong> com funis, cohorts e leads capturados automaticamente.</>} />
      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <SparkKpi label="Total Conversões" value={totalConv} change={15.8} sparkData={generateSparkline(12, 40, 15)} color="hsl(var(--primary))" icon={TrendingUp} />
        <SparkKpi label="WhatsApp" value={whatsapp} change={22.3} sparkData={generateSparkline(12, 20, 8)} color="hsl(var(--success))" icon={MessageCircle} />
        <SparkKpi label="Telefone" value={phone} change={8.1} sparkData={generateSparkline(12, 10, 5)} color="hsl(var(--warning))" icon={Phone} />
        <SparkKpi label="Email" value={email} change={12.6} sparkData={generateSparkline(12, 8, 4)} color="hsl(var(--info))" icon={Mail} />
        <SparkKpi label="Formulários" value={forms} change={6.9} sparkData={generateSparkline(12, 15, 6)} color="hsl(var(--primary))" icon={FileText} />
        <SparkKpi label="Valor Total" value={`R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} change={18.4} sparkData={generateSparkline(12, 200, 80)} color="hsl(var(--success))" icon={DollarSign} />
        <SparkKpi label="Leads c/ Dados" value={leadsWithData} change={9.3} sparkData={generateSparkline(12, 30, 10)} color="hsl(var(--chart-5))" icon={Users} />
      </StaggeredGrid>

      {/* Conversions by day stacked area */}
      <AnimatedContainer>
        <Card className="p-5">
          <ChartHeader title="Conversões ao Longo do Tempo" subtitle="WhatsApp, Telefone, Email e Formulários — Stacked Area" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={conversionsByDay}>
                <defs>
                  {Object.entries(CONV_COLORS).map(([key, color]) => (
                    <LineGlowGradient key={key} id={`conv-${key}`} color={color} />
                  ))}
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="date" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                <Area type="monotone" dataKey="whatsapp_click" stackId="1" stroke={CONV_COLORS.whatsapp_click} fill={`url(#conv-whatsapp_click)`} strokeWidth={1.5} name="WhatsApp" />
                <Area type="monotone" dataKey="form_submit" stackId="1" stroke={CONV_COLORS.form_submit} fill={`url(#conv-form_submit)`} strokeWidth={1.5} name="Formulário" />
                <Area type="monotone" dataKey="phone_click" stackId="1" stroke={CONV_COLORS.phone_click} fill={`url(#conv-phone_click)`} strokeWidth={1.5} name="Telefone" />
                <Area type="monotone" dataKey="email_click" stackId="1" stroke={CONV_COLORS.email_click} fill={`url(#conv-email_click)`} strokeWidth={1.5} name="Email" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Funnel + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.05}>
          <Card className="p-5">
            <ChartHeader title="Ranking de Conversão" subtitle="Funnel por tipo de conversão avançada" />
            <div className="space-y-2">
              {convFunnel.map((step, i) => (
                <FunnelStep key={step.label} label={step.label} value={step.value} maxValue={convFunnel[0].value} color={step.color} index={i} />
              ))}
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <ChartHeader title="Distribuição de Conversões" subtitle="Donut chart com label central" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={convPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                    {convPie.map((_, i) => <Cell key={i} fill={Object.values(CONV_COLORS)[i]} />)}
                    <DonutCenterLabel viewBox={{ cx: "50%", cy: "50%" }} value={totalConv} label="Total" />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Radar Device + Cohort */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <ChartHeader title="Conversões por Dispositivo" subtitle="Radar chart multi-dimensional" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={convByDevice}>
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="device" {...AXIS_STYLE} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar name="WhatsApp" dataKey="whatsapp" stroke={CONV_COLORS.whatsapp_click} fill={CONV_COLORS.whatsapp_click} fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Telefone" dataKey="phone" stroke={CONV_COLORS.phone_click} fill={CONV_COLORS.phone_click} fillOpacity={0.1} strokeWidth={2} />
                  <Radar name="Email" dataKey="email" stroke={CONV_COLORS.email_click} fill={CONV_COLORS.email_click} fillOpacity={0.1} strokeWidth={2} />
                  <Legend {...LEGEND_STYLE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer delay={0.2}>
          <Card className="p-5">
            <ChartHeader title="Heatmap: Tipo × Dispositivo" subtitle="Cohort heatmap de conversões" />
            <CohortHeatmap
              data={cohortData.data}
              xLabels={cohortData.xLabels}
              yLabels={cohortData.yLabels}
              maxValue={Math.max(...cohortData.data.flat())}
              hue={150}
            />
          </Card>
        </AnimatedContainer>
      </div>

      {/* Recent Leads Table */}
      <AnimatedContainer delay={0.25}>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Leads Capturados Recentemente</h3>
            <p className="text-[10px] text-muted-foreground">Dados de nome, telefone e email capturados automaticamente pelo plugin</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Tipo</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Nome</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Telefone</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Página</th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((l) => (
                  <tr key={l.event_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[9px]" style={{ borderColor: CONV_COLORS[l.event_type] + "55", color: CONV_COLORS[l.event_type] }}>
                        {EVENT_LABELS[l.event_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{l.lead_name || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.lead_phone || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l.lead_email || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{l.page_url}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{l.device}</td>
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
