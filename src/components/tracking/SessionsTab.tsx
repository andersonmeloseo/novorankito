import { Card } from "@/components/ui/card";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { generateConversionsHeatmap, mockConversionsByDay } from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { Flame } from "lucide-react";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-5))",
  "hsl(var(--info))",
];

const heatmapData = generateConversionsHeatmap();

// Mock page views data for sessions/page views
const mockPageViewsData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 0, 15 + i);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    views: Math.floor(Math.random() * 300 + 100 + i * 8),
    unique: Math.floor(Math.random() * 200 + 60 + i * 5),
  };
});

const topViewPages = [
  { url: "/products/wireless-headphones", count: 842 },
  { url: "/blog/best-noise-cancelling-2026", count: 631 },
  { url: "/pricing", count: 524 },
  { url: "/contact", count: 412 },
  { url: "/products/smart-speaker", count: 389 },
  { url: "/blog/home-audio-guide", count: 287 },
];

const viewsPieData = [
  { name: "Orgânico", value: 58 },
  { name: "Direto", value: 22 },
  { name: "Social", value: 12 },
  { name: "Referral", value: 8 },
];

export function SessionsTab() {
  return (
    <div className="space-y-4">
      {/* Line Chart */}
      <AnimatedContainer>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Page Views ao Longo do Tempo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockPageViewsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Visualizações" />
                <Line type="monotone" dataKey="unique" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Únicas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AnimatedContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages */}
        <AnimatedContainer delay={0.1}>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Top Páginas por Views</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topViewPages} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="url" type="category" width={140} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} name="Views" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>

        {/* Pie */}
        <AnimatedContainer delay={0.15}>
          <Card className="p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Origem do Tráfego</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={viewsPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                    {viewsPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Heatmap */}
      <AnimatedContainer delay={0.2}>
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" /> Mapa de Calor de Acessos (Dia × Hora)
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex gap-0.5 mb-1 ml-10">
                {Array.from({ length: 8 }, (_, i) => i * 3).map((h) => (
                  <span key={h} className="text-[9px] text-muted-foreground" style={{ width: `${100 / 8}%` }}>{h}h</span>
                ))}
              </div>
              {heatmapData.map((row) => (
                <div key={row.day} className="flex items-center gap-0.5 mb-0.5">
                  <span className="text-[10px] text-muted-foreground w-10 text-right pr-2">{row.day}</span>
                  {row.hours.map((cell) => (
                    <div
                      key={cell.hour}
                      className="flex-1 h-7 rounded-sm flex items-center justify-center"
                      style={{ backgroundColor: `hsl(var(--info) / ${Math.max(0.05, cell.value / 40)})` }}
                      title={`${row.day} ${cell.hour}:00 — ${cell.value} acessos`}
                    >
                      <span className={`text-[8px] font-medium ${cell.value > 20 ? "text-info-foreground" : "text-muted-foreground"}`}>
                        {cell.value}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
