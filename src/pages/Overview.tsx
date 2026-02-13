import { TopBar } from "@/components/layout/TopBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { mockKpis, mockTrendData, mockTopPages, mockInsights } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Overview() {
  const kpiList = [
    mockKpis.clicks,
    mockKpis.impressions,
    mockKpis.sessions,
    mockKpis.conversions,
  ];

  return (
    <>
      <TopBar title="Visão Geral" subtitle="Resumo de performance do seu projeto" />
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-auto">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpiList.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Tendência de Cliques & Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sessions" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Pages */}
          <Card>
          <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Top Páginas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="text-xs">URL</TableHead>
                     <TableHead className="text-xs text-right">Cliques</TableHead>
                     <TableHead className="text-xs text-right">CTR</TableHead>
                     <TableHead className="text-xs text-right">Posição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTopPages.map((page) => (
                    <TableRow key={page.url} className="cursor-pointer">
                      <TableCell className="text-xs font-medium text-primary truncate max-w-[200px]">{page.url}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{page.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{page.ctr}%</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{page.position}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Insights */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Insights Recentes</h3>
            {mockInsights.map((insight) => (
              <InsightCard key={insight.id} {...insight} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
