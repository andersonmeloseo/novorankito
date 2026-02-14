import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const COLORS = ["hsl(var(--chart-6))", "hsl(var(--chart-8))", "hsl(var(--chart-10))", "hsl(var(--chart-1))", "hsl(var(--chart-9))", "hsl(var(--chart-12))", "hsl(var(--chart-3))"];
const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px -4px rgba(0,0,0,0.12)" };

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

  const ageChart = ageGroups.map((a: any) => ({
    name: a.userAgeBracket || "—",
    users: a.totalUsers || 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {genderChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Gênero</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Distribuição de usuários por gênero</p>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderChart} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={35} outerRadius={60} paddingAngle={3} label={false}>
                    {genderChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {ageChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Faixa Etária</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Distribuição por idade dos usuários</p>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChart} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="users" fill="hsl(var(--chart-10))" radius={[4, 4, 0, 0]} barSize={24} />
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
