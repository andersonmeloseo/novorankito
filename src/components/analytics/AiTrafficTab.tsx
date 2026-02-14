import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Bot, TrendingUp, ExternalLink, Sparkles } from "lucide-react";
import { useMemo } from "react";

// Known AI/LLM referral sources mapped to friendly labels + brand colors
const AI_SOURCES: Record<string, { label: string; color: string }> = {
  "chatgpt.com": { label: "ChatGPT", color: "hsl(172 66% 50%)" },
  "chat.openai.com": { label: "ChatGPT", color: "hsl(172 66% 50%)" },
  "openai.com": { label: "OpenAI", color: "hsl(172 66% 40%)" },
  "gemini.google.com": { label: "Gemini", color: "hsl(217 91% 60%)" },
  "bard.google.com": { label: "Gemini (Bard)", color: "hsl(217 91% 60%)" },
  "perplexity.ai": { label: "Perplexity", color: "hsl(210 80% 55%)" },
  "claude.ai": { label: "Claude", color: "hsl(24 80% 55%)" },
  "anthropic.com": { label: "Anthropic", color: "hsl(24 80% 45%)" },
  "copilot.microsoft.com": { label: "Copilot", color: "hsl(207 90% 54%)" },
  "bing.com/chat": { label: "Bing Chat", color: "hsl(207 90% 45%)" },
  "you.com": { label: "You.com", color: "hsl(260 70% 60%)" },
  "phind.com": { label: "Phind", color: "hsl(145 60% 45%)" },
  "poe.com": { label: "Poe", color: "hsl(280 60% 55%)" },
  "meta.ai": { label: "Meta AI", color: "hsl(214 89% 52%)" },
  "kagi.com": { label: "Kagi", color: "hsl(45 90% 50%)" },
  "searchgpt.com": { label: "SearchGPT", color: "hsl(172 66% 45%)" },
  "t.co": { label: "Grok (X)", color: "hsl(0 0% 40%)" },
  "grok.x.ai": { label: "Grok", color: "hsl(0 0% 35%)" },
  "deepseek.com": { label: "DeepSeek", color: "hsl(220 75% 55%)" },
  "huggingface.co": { label: "HuggingFace", color: "hsl(42 95% 55%)" },
  "mistral.ai": { label: "Mistral", color: "hsl(25 85% 50%)" },
};

function matchAiSource(source: string): { label: string; color: string } | null {
  const s = (source || "").toLowerCase().trim();
  for (const [domain, info] of Object.entries(AI_SOURCES)) {
    if (s.includes(domain) || s === domain.split(".")[0]) return info;
  }
  // Catch generic AI patterns
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
}

export function AiTrafficTab({ sources, pages }: AiTrafficTabProps) {
  const aiData = useMemo(() => {
    if (!sources?.length) return { grouped: [], totalUsers: 0, totalSessions: 0, byPage: [] };

    // Group by AI brand
    const brandMap = new Map<string, { label: string; color: string; users: number; sessions: number; engagementRate: number; conversions: number; revenue: number; count: number }>();

    for (const row of sources) {
      const src = row.sessionSource || row.source || "";
      const match = matchAiSource(src);
      if (!match) continue;

      const existing = brandMap.get(match.label);
      const users = row.totalUsers || 0;
      const sessions = row.sessions || 0;
      const engagement = row.engagementRate || 0;
      const conversions = row.conversions || 0;
      const revenue = row.totalRevenue || 0;

      if (existing) {
        existing.users += users;
        existing.sessions += sessions;
        existing.engagementRate += engagement;
        existing.conversions += conversions;
        existing.revenue += revenue;
        existing.count++;
      } else {
        brandMap.set(match.label, { label: match.label, color: match.color, users, sessions, engagementRate: engagement, conversions, revenue, count: 1 });
      }
    }

    const grouped = Array.from(brandMap.values())
      .map(g => ({ ...g, engagementRate: g.count > 0 ? g.engagementRate / g.count : 0 }))
      .sort((a, b) => b.sessions - a.sessions);

    const totalUsers = grouped.reduce((s, g) => s + g.users, 0);
    const totalSessions = grouped.reduce((s, g) => s + g.sessions, 0);

    // Try to find AI-referred landing pages
    const byPage: any[] = [];
    if (pages?.length) {
      // pages from engagement report have pagePath
      // We can't directly link sources to pages from GA4 standard reports,
      // but we show top pages as context
    }

    return { grouped, totalUsers, totalSessions, byPage };
  }, [sources, pages]);

  const { grouped, totalUsers, totalSessions } = aiData;

  if (!grouped.length) {
    return (
      <Card className="p-8 text-center">
        <Bot className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Nenhum tráfego de IA detectado</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          Quando visitantes chegarem via ChatGPT, Gemini, Perplexity e outros LLMs, os dados aparecerão aqui.
        </p>
      </Card>
    );
  }

  const pieData = grouped.map(g => ({ name: g.label, value: g.sessions, color: g.color }));
  const totalConversions = grouped.reduce((s, g) => s + g.conversions, 0);
  const totalRevenue = grouped.reduce((s, g) => s + g.revenue, 0);
  const avgEngagement = grouped.length > 0
    ? grouped.reduce((s, g) => s + g.engagementRate, 0) / grouped.length
    : 0;

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

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bar Chart - Sessions by AI */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Sessões por Plataforma de IA
          </h3>
          <p className="text-[10px] text-muted-foreground mb-3">Volume de visitas originadas de cada LLM/IA</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grouped} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Sessões"]}
                />
                <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                  {grouped.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie Chart - Share */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5 text-primary" />
            Distribuição de Tráfego IA
          </h3>
          <p className="text-[10px] text-muted-foreground mb-3">Participação de cada plataforma no total de sessões via IA</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Sessões"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="p-4 overflow-x-auto">
        <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Detalhamento por Fonte de IA
        </h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Plataforma</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Usuários</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Sessões</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Engajamento</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Conversões</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Receita</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">% do Total IA</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((row) => (
              <tr key={row.label} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-2 px-2 font-medium text-foreground flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  {row.label}
                </td>
                <td className="text-right py-2 px-2 text-foreground">{row.users.toLocaleString("pt-BR")}</td>
                <td className="text-right py-2 px-2 text-foreground">{row.sessions.toLocaleString("pt-BR")}</td>
                <td className="text-right py-2 px-2 text-foreground">{(row.engagementRate * 100).toFixed(1)}%</td>
                <td className="text-right py-2 px-2 text-foreground">{row.conversions.toLocaleString("pt-BR")}</td>
                <td className="text-right py-2 px-2 text-foreground">
                  {row.revenue > 0 ? `R$${row.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "–"}
                </td>
                <td className="text-right py-2 px-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {totalSessions > 0 ? ((row.sessions / totalSessions) * 100).toFixed(1) : 0}%
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
