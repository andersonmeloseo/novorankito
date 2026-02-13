import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { mockKpis, mockTopPages, mockTrendData, mockInsights } from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { MousePointerClick, Eye, TrendingUp, ArrowUpDown, Lightbulb } from "lucide-react";

const QUERY_DATA = [
  { query: "wireless headphones", clicks: 1842, impressions: 42300, ctr: 4.35, position: 3.2 },
  { query: "best noise cancelling", clicks: 1210, impressions: 68400, ctr: 1.77, position: 6.8 },
  { query: "bluetooth headphones review", clicks: 980, impressions: 31200, ctr: 3.14, position: 4.1 },
  { query: "headphones under $100", clicks: 760, impressions: 52100, ctr: 1.46, position: 8.3 },
  { query: "smart speaker comparison", clicks: 540, impressions: 28900, ctr: 1.87, position: 7.2 },
];

const COUNTRY_DATA = [
  { country: "Brazil", clicks: 12400, impressions: 580000, ctr: 2.14, position: 12.1 },
  { country: "United States", clicks: 6200, impressions: 320000, ctr: 1.94, position: 15.8 },
  { country: "Portugal", clicks: 3100, impressions: 180000, ctr: 1.72, position: 14.2 },
  { country: "Spain", clicks: 1800, impressions: 120000, ctr: 1.50, position: 16.5 },
];

const DEVICE_DATA = [
  { device: "Mobile", clicks: 15200, impressions: 820000, ctr: 1.85, position: 14.8 },
  { device: "Desktop", clicks: 8400, impressions: 380000, ctr: 2.21, position: 12.6 },
  { device: "Tablet", clicks: 1232, impressions: 84920, ctr: 1.45, position: 16.1 },
];

export default function SeoPage() {
  return (
    <>
      <TopBar title="SEO" subtitle="Google Search Console" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Cliques" value={mockKpis.clicks.value} change={mockKpis.clicks.change} />
          <KpiCard label="Impressões" value={mockKpis.impressions.value} change={mockKpis.impressions.change} />
          <KpiCard label="CTR" value={mockKpis.ctr.value} change={mockKpis.ctr.change} suffix="%" />
          <KpiCard label="Posição Média" value={mockKpis.position.value} change={mockKpis.position.change} />
        </div>

        {/* Trend Chart */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Tendência de Performance</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTrendData}>
                <defs>
                  <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#clicksGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Data Tables */}
        <Tabs defaultValue="pages">
          <TabsList>
            <TabsTrigger value="pages" className="text-xs">Páginas</TabsTrigger>
            <TabsTrigger value="queries" className="text-xs">Consultas</TabsTrigger>
            <TabsTrigger value="countries" className="text-xs">Países</TabsTrigger>
            <TabsTrigger value="devices" className="text-xs">Dispositivos</TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="mt-4">
            <DataTable
              columns={["URL", "Cliques", "Impressões", "CTR", "Posição"]}
              rows={mockTopPages.map((p) => [p.url, p.clicks.toLocaleString(), p.impressions.toLocaleString(), p.ctr + "%", p.position.toFixed(1)])}
            />
          </TabsContent>
          <TabsContent value="queries" className="mt-4">
            <DataTable
              columns={["Consulta", "Cliques", "Impressões", "CTR", "Posição"]}
              rows={QUERY_DATA.map((q) => [q.query, q.clicks.toLocaleString(), q.impressions.toLocaleString(), q.ctr + "%", q.position.toFixed(1)])}
            />
          </TabsContent>
          <TabsContent value="countries" className="mt-4">
            <DataTable
              columns={["País", "Cliques", "Impressões", "CTR", "Posição"]}
              rows={COUNTRY_DATA.map((c) => [c.country, c.clicks.toLocaleString(), c.impressions.toLocaleString(), c.ctr + "%", c.position.toFixed(1)])}
            />
          </TabsContent>
          <TabsContent value="devices" className="mt-4">
            <DataTable
              columns={["Dispositivo", "Cliques", "Impressões", "CTR", "Posição"]}
              rows={DEVICE_DATA.map((d) => [d.device, d.clicks.toLocaleString(), d.impressions.toLocaleString(), d.ctr + "%", d.position.toFixed(1)])}
            />
          </TabsContent>
        </Tabs>

        {/* Insights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-medium text-foreground">Insights Automáticos</h3>
          </div>
          <div className="space-y-3">
            {mockInsights.map((insight) => (
              <InsightCard key={insight.id} {...insight} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? "font-mono text-foreground" : "text-muted-foreground"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
