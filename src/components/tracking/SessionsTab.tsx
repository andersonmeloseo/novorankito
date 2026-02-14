import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { generateConversionsHeatmap, mockPageViewsByDay, mockSessionsDetailed, type MockSession } from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { Flame, Search, ArrowUpDown, ChevronLeft, ChevronRight, Clock, MousePointerClick, LogOut, DollarSign } from "lucide-react";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-5))",
  "hsl(var(--info))",
];

const heatmapData = generateConversionsHeatmap();

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

type SortKey = keyof MockSession;
const PER_PAGE = 15;

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export function SessionsTab() {
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("started_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = [...mockSessionsDetailed];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(s =>
        s.landing_page.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        s.session_id.toLowerCase().includes(q)
      );
    }
    if (deviceFilter !== "all") data = data.filter(s => s.device === deviceFilter);
    if (sourceFilter !== "all") data = data.filter(s => s.source === sourceFilter);
    data.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [search, deviceFilter, sourceFilter, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(1);
  };

  // KPIs
  const totalSessions = mockSessionsDetailed.length;
  const avgDuration = Math.round(mockSessionsDetailed.reduce((s, r) => s + r.duration_sec, 0) / totalSessions);
  const bounceRate = ((mockSessionsDetailed.filter(s => s.is_bounce).length / totalSessions) * 100).toFixed(1);
  const totalRevenue = mockSessionsDetailed.reduce((s, r) => s + r.revenue, 0).toFixed(2);

  const SortHeader = ({ label, colKey }: { label: string; colKey: SortKey }) => (
    <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort(colKey)}>
      <span className="flex items-center gap-1 text-[11px]">
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: MousePointerClick, label: "Sessões", value: totalSessions.toLocaleString("pt-BR"), color: "text-primary" },
          { icon: Clock, label: "Duração Média", value: formatDuration(avgDuration), color: "text-info" },
          { icon: LogOut, label: "Taxa de Rejeição", value: `${bounceRate}%`, color: "text-warning" },
          { icon: DollarSign, label: "Receita Total", value: `R$ ${totalRevenue}`, color: "text-success" },
        ].map((kpi) => (
          <AnimatedContainer key={kpi.label}>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            </Card>
          </AnimatedContainer>
        ))}
      </div>

      {/* Charts row */}
      <AnimatedContainer delay={0.05}>
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

      {/* Detailed Sessions Table */}
      <AnimatedContainer delay={0.2}>
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border space-y-3">
            <h3 className="text-sm font-medium text-foreground">Sessões Detalhadas</h3>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por página, cidade, source..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Select value={deviceFilter} onValueChange={(v) => { setDeviceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Dispositivo</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Source</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="bing">Bing</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Início" colKey="started_at" />
                  <SortHeader label="Duração" colKey="duration_sec" />
                  <SortHeader label="Páginas" colKey="pages_viewed" />
                  <TableHead className="text-[11px]">Landing Page</TableHead>
                  <TableHead className="text-[11px]">Saída</TableHead>
                  <SortHeader label="Source" colKey="source" />
                  <TableHead className="text-[11px]">Device</TableHead>
                  <TableHead className="text-[11px]">Cidade</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <SortHeader label="Receita" colKey="revenue" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((s) => (
                  <TableRow key={s.session_id}>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(s.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium">{formatDuration(s.duration_sec)}</TableCell>
                    <TableCell className="text-[11px] text-center">{s.pages_viewed}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[150px] truncate">{s.landing_page}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[150px] truncate">{s.exit_page}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] capitalize">{s.source} / {s.medium}</Badge>
                    </TableCell>
                    <TableCell className="text-[11px] capitalize">{s.device}</TableCell>
                    <TableCell className="text-[11px]">{s.city}</TableCell>
                    <TableCell>
                      {s.is_bounce ? (
                        <Badge variant="destructive" className="text-[9px]">Bounce</Badge>
                      ) : s.converted ? (
                        <Badge className="text-[9px] bg-success/20 text-success border-success/30">Conversão</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px]">Engajada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium">
                      {s.revenue > 0 ? `R$ ${s.revenue.toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[11px] text-muted-foreground">{filtered.length} sessões</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <Button key={p} variant={p === page ? "default" : "ghost"} size="icon" className="h-7 w-7 text-[11px]" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                );
              })}
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Heatmap */}
      <AnimatedContainer delay={0.25}>
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
