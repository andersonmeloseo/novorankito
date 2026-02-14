import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-1))", "hsl(var(--chart-3))"];

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
      <div className="grid md:grid-cols-2 gap-4">
        {genderChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Gênero</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {genderChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {ageChart.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Faixa Etária</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="users" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
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
