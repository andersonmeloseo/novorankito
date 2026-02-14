import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Label } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE, ChartHeader, DonutCenterLabel } from "./ChartPrimitives";

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

  const ageChart = ageGroups.map((a: any) => ({
    name: a.userAgeBracket || "—",
    users: a.totalUsers || 0,
  }));

  const GENDER_COLORS = ["hsl(var(--chart-6))", "hsl(var(--chart-8))", "hsl(var(--chart-5))"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {genderChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Gênero" subtitle="Distribuição de usuários por gênero" />
            <div className="h-[200px]">
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
        {ageChart.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Faixa Etária" subtitle="Distribuição por idade dos usuários" />
            <div className="h-[200px]">
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
              c.country || "—",
              (c.totalUsers || 0).toLocaleString(), (c.sessions || 0).toLocaleString(),
              ((c.engagementRate || 0) * 100).toFixed(1) + "%",
              (c.conversions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
        <TabsContent value="cities" className="mt-4">
          <AnalyticsDataTable
            columns={["Cidade", "Usuários", "Sessões", "Tx. Engajamento"]}
            rows={cities.map((c: any) => [
              c.city || "—",
              (c.totalUsers || 0).toLocaleString(), (c.sessions || 0).toLocaleString(),
              ((c.engagementRate || 0) * 100).toFixed(1) + "%",
            ])}
          />
        </TabsContent>
        <TabsContent value="languages" className="mt-4">
          <AnalyticsDataTable
            columns={["Idioma", "Usuários", "Sessões"]}
            rows={languages.map((l: any) => [
              l.language || "—",
              (l.totalUsers || 0).toLocaleString(), (l.sessions || 0).toLocaleString(),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
