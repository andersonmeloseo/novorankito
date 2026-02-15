import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Play, Pause, Trophy, BarChart3, Users, TrendingUp, ArrowUpRight,
  ArrowDownRight, Target, FlaskConical, Percent, CheckCircle2, Clock,
  Trash2, Eye, Zap, Copy, Check
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";

interface ABVariant {
  id: string;
  name: string;
  traffic: number;
  visitors: number;
  conversions: number;
  revenue: number;
  isControl: boolean;
}

interface ABTest {
  id: string;
  name: string;
  goal: string;
  status: "running" | "paused" | "completed" | "draft";
  variants: ABVariant[];
  startedAt: string;
  confidence: number;
  winner?: string;
  selector: string;
}

const MOCK_TESTS: ABTest[] = [
  {
    id: "t1", name: "CTA Hero — Cor do Botão", goal: "Cliques no CTA",
    status: "running", selector: "#hero-cta",
    startedAt: "2026-02-01", confidence: 94.2,
    variants: [
      { id: "v1a", name: "Controle (Verde)", traffic: 50, visitors: 4521, conversions: 312, revenue: 15600, isControl: true },
      { id: "v1b", name: "Variante (Laranja)", traffic: 50, visitors: 4489, conversions: 387, revenue: 19350, isControl: false },
    ],
  },
  {
    id: "t2", name: "Headline Pricing", goal: "Scroll até formulário",
    status: "completed", selector: ".pricing-headline",
    startedAt: "2026-01-15", confidence: 98.7, winner: "v2b",
    variants: [
      { id: "v2a", name: "Controle (Curta)", traffic: 33, visitors: 3200, conversions: 190, revenue: 9500, isControl: true },
      { id: "v2b", name: "Variante A (Longa)", traffic: 33, visitors: 3180, conversions: 285, revenue: 14250, isControl: false },
      { id: "v2c", name: "Variante B (Urgência)", traffic: 34, visitors: 3250, conversions: 220, revenue: 11000, isControl: false },
    ],
  },
  {
    id: "t3", name: "Formulário Contato — Layout", goal: "Submissões",
    status: "paused", selector: "#contact-form",
    startedAt: "2026-02-10", confidence: 62.1,
    variants: [
      { id: "v3a", name: "Controle (Vertical)", traffic: 50, visitors: 890, conversions: 45, revenue: 2250, isControl: true },
      { id: "v3b", name: "Variante (Horizontal)", traffic: 50, visitors: 875, conversions: 52, revenue: 2600, isControl: false },
    ],
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  running: { label: "Em Execução", color: "bg-success/10 text-success border-success/20" },
  paused: { label: "Pausado", color: "bg-warning/10 text-warning border-warning/20" },
  completed: { label: "Concluído", color: "bg-primary/10 text-primary border-primary/20" },
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground border-border" },
};

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 95 ? "text-success" : value >= 80 ? "text-warning" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className="h-2 flex-1" />
      <span className={`text-xs font-bold font-mono ${color}`}>{value.toFixed(1)}%</span>
    </div>
  );
}

function TestCard({ test }: { test: ABTest }) {
  const controlVariant = test.variants.find(v => v.isControl);
  const bestVariant = test.variants.reduce((best, v) => {
    const rate = v.visitors > 0 ? v.conversions / v.visitors : 0;
    const bestRate = best.visitors > 0 ? best.conversions / best.visitors : 0;
    return rate > bestRate ? v : best;
  }, test.variants[0]);
  
  const controlRate = controlVariant && controlVariant.visitors > 0
    ? (controlVariant.conversions / controlVariant.visitors) * 100 : 0;
  const bestRate = bestVariant.visitors > 0
    ? (bestVariant.conversions / bestVariant.visitors) * 100 : 0;
  const uplift = controlRate > 0 ? ((bestRate - controlRate) / controlRate) * 100 : 0;

  const chartData = test.variants.map(v => ({
    name: v.name.length > 20 ? v.name.substring(0, 20) + "…" : v.name,
    "Taxa Conv.": v.visitors > 0 ? parseFloat(((v.conversions / v.visitors) * 100).toFixed(2)) : 0,
    "Receita": v.revenue,
  }));

  const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--chart-5))"];

  const statusInfo = STATUS_LABELS[test.status];

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold font-display">{test.name}</h4>
            <Badge variant="outline" className={`text-[9px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
            {test.winner && (
              <Badge variant="secondary" className="text-[9px] gap-1 bg-success/10 text-success border-success/20">
                <Trophy className="h-2.5 w-2.5" /> Vencedor definido
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Meta: <strong>{test.goal}</strong> · Seletor: <code className="bg-muted px-1 rounded">{test.selector}</code> · Desde {new Date(test.startedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-1">
          {test.status === "running" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("Teste pausado")}>
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {test.status === "paused" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("Teste retomado")}>
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Confidence */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Significância Estatística</span>
          {test.confidence >= 95 && <Badge variant="secondary" className="text-[9px] bg-success/10 text-success">Significativo ✓</Badge>}
        </div>
        <ConfidenceMeter value={test.confidence} />
      </div>

      {/* Variants table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-[10px] font-medium text-muted-foreground">Variante</th>
              <th className="text-right py-2 text-[10px] font-medium text-muted-foreground">Tráfego</th>
              <th className="text-right py-2 text-[10px] font-medium text-muted-foreground">Visitantes</th>
              <th className="text-right py-2 text-[10px] font-medium text-muted-foreground">Conversões</th>
              <th className="text-right py-2 text-[10px] font-medium text-muted-foreground">Taxa</th>
              <th className="text-right py-2 text-[10px] font-medium text-muted-foreground">Receita</th>
              <th className="text-right py-2 text-[10px] font-medium text-muted-foreground">Uplift</th>
            </tr>
          </thead>
          <tbody>
            {test.variants.map((v, i) => {
              const rate = v.visitors > 0 ? (v.conversions / v.visitors) * 100 : 0;
              const vUplift = controlRate > 0 && !v.isControl ? ((rate - controlRate) / controlRate) * 100 : 0;
              const isWinner = test.winner === v.id;
              return (
                <tr key={v.id} className={`border-b border-border/50 ${isWinner ? "bg-success/5" : ""}`}>
                  <td className="py-2.5 font-medium flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {v.name}
                    {v.isControl && <Badge variant="outline" className="text-[8px] px-1">Controle</Badge>}
                    {isWinner && <Trophy className="h-3 w-3 text-success" />}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">{v.traffic}%</td>
                  <td className="py-2.5 text-right">{v.visitors.toLocaleString("pt-BR")}</td>
                  <td className="py-2.5 text-right">{v.conversions}</td>
                  <td className="py-2.5 text-right font-bold">{rate.toFixed(2)}%</td>
                  <td className="py-2.5 text-right">R$ {v.revenue.toLocaleString("pt-BR")}</td>
                  <td className={`py-2.5 text-right font-bold ${vUplift > 0 ? "text-success" : vUplift < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {v.isControl ? "—" : (
                      <span className="flex items-center justify-end gap-0.5">
                        {vUplift > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(vUplift).toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mini chart */}
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Bar dataKey="Taxa Conv." radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ABTestTrackerTab() {
  const [tests] = useState<ABTest[]>(MOCK_TESTS);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? tests : tests.filter(t => t.status === filter);

  const totalVisitors = tests.reduce((s, t) => s + t.variants.reduce((vs, v) => vs + v.visitors, 0), 0);
  const runningTests = tests.filter(t => t.status === "running").length;
  const completedTests = tests.filter(t => t.status === "completed").length;
  const avgConfidence = tests.length > 0 ? (tests.reduce((s, t) => s + t.confidence, 0) / tests.length) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <AnimatedContainer>
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display">A/B Test Tracker</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Crie testes A/B diretamente no dashboard, distribua tráfego entre variantes e acompanhe resultados com <strong>significância estatística em tempo real</strong>.
              </p>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* KPIs */}
      <StaggeredGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Testes Ativos", value: runningTests, icon: Play, color: "hsl(var(--success))" },
          { label: "Concluídos", value: completedTests, icon: CheckCircle2, color: "hsl(var(--primary))" },
          { label: "Visitantes", value: totalVisitors.toLocaleString("pt-BR"), icon: Users, color: "hsl(var(--info))" },
          { label: "Confiança Média", value: `${avgConfidence.toFixed(1)}%`, icon: Target, color: "hsl(var(--warning))" },
        ].map((kpi, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-1.5">
              <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            </div>
            <span className="text-2xl font-bold font-display mt-1 block">{kpi.value}</span>
          </Card>
        ))}
      </StaggeredGrid>

      {/* Filter + actions */}
      <AnimatedContainer delay={0.04}>
        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="running">Em Execução</SelectItem>
                  <SelectItem value="paused">Pausados</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="gap-1.5 text-xs h-9" onClick={() => toast.info("Em breve: criador visual de testes A/B")}>
              <Plus className="h-3.5 w-3.5" /> Novo Teste A/B
            </Button>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Tests */}
      <div className="space-y-4">
        {filtered.map((test, i) => (
          <AnimatedContainer key={test.id} delay={0.06 + i * 0.02}>
            <TestCard test={test} />
          </AnimatedContainer>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-8 text-center">
          <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum teste encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Crie seu primeiro teste A/B para começar a otimizar conversões.</p>
        </Card>
      )}
    </div>
  );
}
