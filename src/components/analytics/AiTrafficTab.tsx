import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyticsDataTable } from "./AnalyticsDataTable";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Label,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { Bot, TrendingUp, Sparkles, Users } from "lucide-react";
import { useMemo } from "react";
import {
  CHART_TOOLTIP_STYLE, CHART_COLORS, AXIS_STYLE, GRID_STYLE, LEGEND_STYLE,
  ChartHeader, DonutCenterLabel, BarGradient, FunnelStep, PipelineVisual,
} from "./ChartPrimitives";

// Known AI/LLM referral sources mapped to friendly labels + brand colors
const AI_SOURCES: Record<string, { label: string; color: string }> = {
  "chatgpt.com": { label: "ChatGPT", color: "hsl(172 66% 50%)" },
  "chat.openai.com": { label: "ChatGPT", color: "hsl(172 66% 50%)" },
  "openai.com": { label: "OpenAI", color: "hsl(172 66% 40%)" },
  "gemini.google.com": { label: "Gemini", color: "hsl(217 91% 60%)" },
  "bard.google.com": { label: "Gemini (Bard)", color: "hsl(217 91% 60%)" },
  "perplexity.ai": { label: "Perplexity", color: "hsl(265 70% 58%)" },
  "claude.ai": { label: "Claude", color: "hsl(24 80% 55%)" },
  "anthropic.com": { label: "Anthropic", color: "hsl(24 80% 45%)" },
  "copilot.microsoft.com": { label: "Copilot", color: "hsl(195 90% 50%)" },
  "bing.com/chat": { label: "Bing Chat", color: "hsl(195 85% 45%)" },
  "you.com": { label: "You.com", color: "hsl(290 65% 58%)" },
  "phind.com": { label: "Phind", color: "hsl(145 60% 45%)" },
  "poe.com": { label: "Poe", color: "hsl(42 90% 52%)" },
  "meta.ai": { label: "Meta AI", color: "hsl(214 89% 52%)" },
  "kagi.com": { label: "Kagi", color: "hsl(45 90% 50%)" },
  "searchgpt.com": { label: "SearchGPT", color: "hsl(172 66% 45%)" },
  "t.co": { label: "Grok (X)", color: "hsl(0 0% 45%)" },
  "grok.x.ai": { label: "Grok", color: "hsl(0 0% 40%)" },
  "deepseek.com": { label: "DeepSeek", color: "hsl(220 75% 55%)" },
  "huggingface.co": { label: "HuggingFace", color: "hsl(42 95% 55%)" },
  "mistral.ai": { label: "Mistral", color: "hsl(25 85% 50%)" },
};

function matchAiSource(source: string): { label: string; color: string } | null {
  const s = (source || "").toLowerCase().trim();
  for (const [domain, info] of Object.entries(AI_SOURCES)) {
    if (s.includes(domain) || s === domain.split(".")[0]) return info;
  }
  if (s.includes("chatgpt") || s.includes("openai")) return AI_SOURCES["chatgpt.com"];
  if (s.includes("gemini") || s.includes("bard")) return AI_SOURCES["gemini.google.com"];
  if (s.includes("perplexity")) return AI_SOURCES["perplexity.ai"];
  if (s.includes("claude") || s.includes("anthropic")) return AI_SOURCES["claude.ai"];
  if (s.includes("copilot")) return AI_SOURCES["copilot.microsoft.com"];
  if (s.includes("phind")) return AI_SOURCES["phind.com"];
  if (s.includes("poe")) return AI_SOURCES["poe.com"];
  if (s.includes("grok")) return AI_SOURCES["grok.x.ai"];
  if (s.includes("deepseek")) return AI_SOURCES["deepseek.com"];
  if (s.includes("mistral")) return AI_SOURCES["mistral.ai"];
  if (s.includes("meta.ai")) return AI_SOURCES["meta.ai"];
  return null;
}

interface AiTrafficTabProps {
  sources: any[];
  pages?: any[];
  firstUserChannels?: any[];
}

export function AiTrafficTab({ sources, pages, firstUserChannels }: AiTrafficTabProps) {
  const aiData = useMemo(() => {
    if (!sources?.length) return { grouped: [], totalUsers: 0, totalSessions: 0, bySourceMedium: [], byFirstOrigin: [] };

    const brandMap = new Map<string, { label: string; color: string; users: number; sessions: number; engagementRate: number; conversions: number; revenue: number; count: number }>();
    const sourceMediumList: { source: string; medium: string; users: number; sessions: number; engagementRate: number; conversions: number; revenue: number; aiLabel: string }[] = [];

    for (const row of sources) {
      const src = row.sessionSource || row.source || "";
      const medium = row.sessionMedium || row.medium || "";
      const match = matchAiSource(src);
      if (!match) continue;

      const users = row.totalUsers || 0;
      const sessions = row.sessions || 0;
      const engagement = row.engagementRate || 0;
      const conversions = row.conversions || 0;
      const revenue = row.totalRevenue || 0;

      sourceMediumList.push({ source: src, medium, users, sessions, engagementRate: engagement, conversions, revenue, aiLabel: match.label });

      const existing = brandMap.get(match.label);
      if (existing) {
        existing.users += users; existing.sessions += sessions;
        existing.engagementRate += engagement; existing.conversions += conversions;
        existing.revenue += revenue; existing.count++;
      } else {
        brandMap.set(match.label, { label: match.label, color: match.color, users, sessions, engagementRate: engagement, conversions, revenue, count: 1 });
      }
    }

    const grouped = Array.from(brandMap.values())
      .map(g => ({ ...g, engagementRate: g.count > 0 ? g.engagementRate / g.count : 0 }))
      .sort((a, b) => b.sessions - a.sessions);

    const totalUsers = grouped.reduce((s, g) => s + g.users, 0);
    const totalSessions = grouped.reduce((s, g) => s + g.sessions, 0);
    const bySourceMedium = sourceMediumList.sort((a, b) => b.sessions - a.sessions);

    const byFirstOrigin: { channel: string; users: number; newUsers: number }[] = [];
    if (firstUserChannels?.length) {
      for (const f of firstUserChannels) {
        const ch = (f.firstUserDefaultChannelGroup || "").toLowerCase();
        if (ch.includes("ai") || ch.includes("referral")) {
          byFirstOrigin.push({ channel: f.firstUserDefaultChannelGroup || "—", users: f.totalUsers || 0, newUsers: f.newUsers || 0 });
        }
      }
    }

    return { grouped, totalUsers, totalSessions, bySourceMedium, byFirstOrigin };
  }, [sources, pages, firstUserChannels]);

  const { grouped, totalUsers, totalSessions, bySourceMedium } = aiData;

  if (!grouped.length) {
    return (
      <Card className="p-8 text-center">
        <Bot className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Nenhum tráfego de IA detectado</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">Quando visitantes chegarem via ChatGPT, Gemini, Perplexity e outros LLMs, os dados aparecerão aqui.</p>
      </Card>
    );
  }

  const totalConversions = grouped.reduce((s, g) => s + g.conversions, 0);
  const avgEngagement = grouped.length > 0 ? grouped.reduce((s, g) => s + g.engagementRate, 0) / grouped.length : 0;

  // ─── Radar: AI platform quality ───
  const radarData = grouped.slice(0, 6).map(g => ({
    platform: g.label,
    sessions: g.sessions,
    engagement: Math.round(g.engagementRate * 100),
    conversions: g.conversions,
  }));

  // ─── Scatter: sessions vs users ───
  const scatterData = grouped.map(g => ({
    name: g.label,
    x: g.users,
    y: g.sessions,
    z: Math.max(g.conversions, 1),
    color: g.color,
  }));

  // ─── Pipeline: AI funnel ───
  const pipelineSteps = [
    { label: "Sessões IA", value: totalSessions, color: CHART_COLORS[0] },
    { label: "Usuários IA", value: totalUsers, color: CHART_COLORS[1] },
    { label: "Conversões", value: totalConversions, color: CHART_COLORS[2] },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-3.5 flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Usuários via IA</span>
          <span className="text-2xl font-bold font-display text-foreground mt-1">{totalUsers.toLocaleString("pt-BR")}</span>
        </Card>
        <Card className="p-3.5 flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sessões via IA</span>
          <span className="text-2xl font-bold font-display text-foreground mt-1">{totalSessions.toLocaleString("pt-BR")}</span>
        </Card>
        <Card className="p-3.5 flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fontes Detectadas</span>
          <span className="text-2xl font-bold font-display text-foreground mt-1">{grouped.length}</span>
        </Card>
        <Card className="p-3.5 flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversões (IA)</span>
          <span className="text-2xl font-bold font-display text-foreground mt-1">{totalConversions.toLocaleString("pt-BR")}</span>
        </Card>
        <Card className="p-3.5 flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Engajamento Médio</span>
          <span className="text-2xl font-bold font-display text-foreground mt-1">{(avgEngagement * 100).toFixed(1)}%</span>
        </Card>
      </div>

      {/* ─── Row 1: Donut + Radar ─── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <ChartHeader title="Distribuição de Tráfego IA" subtitle="Proporção de sessões por plataforma" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={grouped.map(g => ({ name: g.label, value: g.sessions }))} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0} animationDuration={900}>
                  {grouped.map((g, i) => <Cell key={i} fill={g.color} />)}
                  <Label content={<DonutCenterLabel value={totalSessions.toLocaleString("pt-BR")} label="sessões" />} />
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {radarData.length > 2 && (
          <Card className="p-5">
            <ChartHeader title="Radar de Qualidade IA" subtitle="Sessões × Engajamento × Conversões" />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="platform" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <Radar name="Sessões" dataKey="sessions" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Engajamento" dataKey="engagement" stroke="hsl(var(--chart-9))" fill="hsl(var(--chart-9))" fillOpacity={0.1} strokeWidth={2} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend {...LEGEND_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Row 2: Scatter/Bubble + Pipeline ─── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {scatterData.length > 0 && (
          <Card className="p-5">
            <ChartHeader title="Bubble: Sessões × Usuários" subtitle="Tamanho = conversões por plataforma" />
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" dataKey="x" name="Usuários" {...AXIS_STYLE} />
                  <YAxis type="number" dataKey="y" name="Sessões" {...AXIS_STYLE} width={45} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: number, n: string) => [v.toLocaleString("pt-BR"), n]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""} />
                  <Scatter data={scatterData} animationDuration={900}>
                    {scatterData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.7} stroke={e.color} strokeWidth={1} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <ChartHeader title="Pipeline de Conversão IA" subtitle="Funil visual: sessões → usuários → conversões" />
          <PipelineVisual steps={pipelineSteps} />
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="p-4 overflow-x-auto">
        <ChartHeader title="Detalhamento por Origem / Mídia (IA)" />
        <AnalyticsDataTable
          columns={["Plataforma", "Origem", "Mídia", "Usuários", "Sessões", "Engajamento", "Conversões", "Receita"]}
          rows={bySourceMedium.map((row) => [
            row.aiLabel, row.source, row.medium,
            row.users.toLocaleString("pt-BR"), row.sessions.toLocaleString("pt-BR"),
            ((row.engagementRate || 0) * 100).toFixed(1) + "%",
            row.conversions.toLocaleString("pt-BR"),
            row.revenue > 0 ? `R$${row.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "–",
          ])}
        />
      </Card>
    </div>
  );
}
