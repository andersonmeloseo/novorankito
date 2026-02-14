import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Legend, Label,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, DonutCenterLabel, BarGradient, PipelineVisual, CohortHeatmap,
} from "./ChartPrimitives";

interface DemographicsTabProps {
  data: any;
}

export function DemographicsTab({ data }: DemographicsTabProps) {
  const countries = data?.countries || [];
  const cities = data?.cities || [];
  const languages = data?.languages || [];
  const ageGroups = data?.ageGroups || [];
  const genders = data?.genders || [];

  const genderChart = genders.map((g: any) => ({
    name: g.userGender === "male" ? "Masculino" : g.userGender === "female" ? "Feminino" : "Outro",
    value: g.totalUsers || 0,
  }));
  const totalGenderUsers = genderChart.reduce((s: number, g: any) => s + g.value, 0);
  const GENDER_COLORS = ["hsl(var(--chart-6))", "hsl(var(--chart-8))", "hsl(var(--chart-5))"];

  const ageChart = ageGroups.map((a: any) => ({
    name: a.userAgeBracket || "—",
    users: a.totalUsers || 0,
  }));

  // ─── Scatter/Bubble: countries users vs sessions ───
  const countryBubble = useMemo(() => {
    return countries.slice(0, 15).map((c: any, i: number) => ({
      name: c.country || "—",
      x: c.totalUsers || 0,
      y: c.sessions || 0,
      z: Math.max(c.conversions || 1, 1),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [countries]);

  // ─── Pipeline visual: top countries ───
  const pipelineSteps = useMemo(() => {
    return countries.slice(0, 6).map((c: any, i: number) => ({
      label: (c.country || "—").substring(0, 10),
      value: c.totalUsers || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [countries]);

  // ─── Cohort heatmap: cities x engagement ───
  const cohortData = useMemo(() => {
    const topCities = cities.slice(0, 5);
    const metrics = ["Usuários", "Sessões", "Engajamento"];
    const heatData = topCities.map((c: any) => [
      c.totalUsers || 0,
      c.sessions || 0,
      Math.round((c.engagementRate || 0) * 100),
    ]);
    const maxVal = Math.max(...heatData.flat(), 1);
    return {
      data: heatData,
      xLabels: metrics,
      yLabels: topCities.map((c: any) => (c.city || "—").substring(0, 12)),
      maxValue: maxVal,
    };
  }, [cities]);

  // ─── Radar: age groups multi-dimensional ───
  const ageRadar = useMemo(() => {
    return ageGroups.slice(0, 8).map((a: any) => ({
      age: a.userAgeBracket || "—",
      users: a.totalUsers || 0,
      sessions: a.sessions || 0,
      engagement: Math.round((a.engagementRate || 0) * 100),
    }));
  }, [ageGroups]);

  return (
    <div className="space-y-4">
      {/* ─── Row 1: Gender Donut + Age Radar ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {genderChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Gênero" subtitle="Distribuição de usuários por gênero" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4} strokeWidth={0} animationDuration={900}>
                    {genderChart.map((_: any, i: number) => <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />)}
                    <Label content={<DonutCenterLabel value={totalGenderUsers.toLocaleString("pt-BR")} label="usuários" />} />
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {ageRadar.length > 2 ? (
          <Card className="p-5">
            <ChartHeader title="Radar de Faixa Etária" subtitle="Usuários × Sessões × Engajamento por idade" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={ageRadar}>
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="age" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <Radar name="Usuários" dataKey="users" stroke="hsl(var(--chart-9))" fill="hsl(var(--chart-9))" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Engajamento" dataKey="engagement" stroke="hsl(var(--chart-6))" fill="hsl(var(--chart-6))" fillOpacity={0.1} strokeWidth={2} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : ageChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Faixa Etária" subtitle="Distribuição por idade dos usuários" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChart} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-9))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--chart-9))" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} vertical={false} />
                  <XAxis dataKey="name" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} width={40} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="users" fill="url(#ageGrad)" radius={[6, 6, 0, 0]} barSize={28} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Row 2: Country Bubble + Pipeline Visual ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {countryBubble.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Bubble: Países" subtitle="Usuários × Sessões (tamanho = conversões)" />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" dataKey="x" name="Usuários" {...AXIS_STYLE} />
                  <YAxis type="number" dataKey="y" name="Sessões" {...AXIS_STYLE} width={45} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: number, n: string) => [v.toLocaleString("pt-BR"), n]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""} />
                  <Scatter data={countryBubble} animationDuration={900}>
                    {countryBubble.map((e: any, i: number) => (
                      <Cell key={i} fill={e.color} fillOpacity={0.7} stroke={e.color} strokeWidth={1} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {pipelineSteps.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Pipeline de Países" subtitle="Volume de usuários dos principais países" />
            <PipelineVisual steps={pipelineSteps} />
          </Card>
        )}
      </div>

      {/* ─── Row 3: Cohort Heatmap ─── */}
      {cohortData.data.length > 0 && (
        <Card className="p-5">
          <ChartHeader title="Heatmap: Cidades × Métricas" subtitle="Matriz de calor com usuários, sessões e engajamento" />
          <CohortHeatmap {...cohortData} hue={210} />
        </Card>
      )}

      {/* ─── Data Tables ─── */}
      <Tabs defaultValue="countries">
        <TabsList>
          <TabsTrigger value="countries" className="text-xs">Países</TabsTrigger>
          <TabsTrigger value="cities" className="text-xs">Cidades</TabsTrigger>
          <TabsTrigger value="languages" className="text-xs">Idiomas</TabsTrigger>
        </TabsList>
        <TabsContent value="countries" className="mt-4">
          <AnalyticsDataTable
            columns={["País", "Usuários", "Sessões", "Tx. Engajamento", "Conversões"]}
            rows={countries.map((c: any) => [
              c.country || "—", (c.totalUsers || 0).toLocaleString(), (c.sessions || 0).toLocaleString(),
              ((c.engagementRate || 0) * 100).toFixed(1) + "%", (c.conversions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
        <TabsContent value="cities" className="mt-4">
          <AnalyticsDataTable
            columns={["Cidade", "Usuários", "Sessões", "Tx. Engajamento"]}
            rows={cities.map((c: any) => [
              c.city || "—", (c.totalUsers || 0).toLocaleString(), (c.sessions || 0).toLocaleString(),
              ((c.engagementRate || 0) * 100).toFixed(1) + "%",
            ])}
          />
        </TabsContent>
        <TabsContent value="languages" className="mt-4">
          <AnalyticsDataTable
            columns={["Idioma", "Usuários", "Sessões"]}
            rows={languages.map((l: any) => [
              l.language || "—", (l.totalUsers || 0).toLocaleString(), (l.sessions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
