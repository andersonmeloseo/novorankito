import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, RefreshCw, TrendingUp, Target, AlertTriangle, Lightbulb, BarChart3 } from "lucide-react";
import { streamChatToCompletion } from "@/lib/stream-chat";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

interface AiInsightsTabProps {
  projectId: string | null;
  kpis: {
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
    prevClicks: number;
    prevImpressions: number;
    prevAvgCtr: number;
    prevAvgPosition: number;
  };
  topQueries: { name: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topPages: { name: string; clicks: number; impressions: number; ctr: number; position: number }[];
  dateRange: string;
}

const ANALYSIS_TYPES = [
  { id: "overview", label: "Visão Geral", icon: BarChart3, prompt: "Faça uma análise geral completa da performance SEO do projeto." },
  { id: "opportunities", label: "Oportunidades", icon: Target, prompt: "Identifique as 5 maiores oportunidades de crescimento SEO com base nos dados." },
  { id: "risks", label: "Riscos", icon: AlertTriangle, prompt: "Quais são os principais riscos e problemas SEO que preciso resolver com urgência?" },
  { id: "strategy", label: "Estratégia", icon: Lightbulb, prompt: "Sugira uma estratégia SEO priorizada para os próximos 30 dias." },
  { id: "growth", label: "Quick Wins", icon: TrendingUp, prompt: "Liste 5 quick wins de SEO que posso implementar hoje para ganhar cliques rapidamente." },
];

export function AiInsightsTab({ projectId, kpis, topQueries, topPages, dateRange }: AiInsightsTabProps) {
  const [activeType, setActiveType] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [generated, setGenerated] = useState(false);
  const abortRef = useRef(false);

  const buildContextPrompt = (type: typeof ANALYSIS_TYPES[number]) => {
    const pctChange = (curr: number, prev: number) => prev === 0 ? "N/A" : `${(((curr - prev) / prev) * 100).toFixed(1)}%`;

    const context = `
DADOS DE SEO DO PERÍODO (${dateRange} dias):
- Cliques: ${kpis.totalClicks.toLocaleString("pt-BR")} (variação: ${pctChange(kpis.totalClicks, kpis.prevClicks)})
- Impressões: ${kpis.totalImpressions.toLocaleString("pt-BR")} (variação: ${pctChange(kpis.totalImpressions, kpis.prevImpressions)})
- CTR Médio: ${kpis.avgCtr.toFixed(2)}% (anterior: ${kpis.prevAvgCtr.toFixed(2)}%)
- Posição Média: ${kpis.avgPosition.toFixed(1)} (anterior: ${kpis.prevAvgPosition.toFixed(1)})

TOP 15 CONSULTAS:
${topQueries.slice(0, 15).map((q, i) => `${i + 1}. "${q.name}" → ${q.clicks} cliques, ${q.impressions} imp, CTR ${q.ctr.toFixed(2)}%, pos ${q.position.toFixed(1)}`).join("\n")}

TOP 10 PÁGINAS:
${topPages.slice(0, 10).map((p, i) => `${i + 1}. ${p.name} → ${p.clicks} cliques, ${p.impressions} imp, CTR ${p.ctr.toFixed(2)}%, pos ${p.position.toFixed(1)}`).join("\n")}
`;

    return `${type.prompt}\n\nUse estes dados reais para fundamentar sua análise:\n${context}\n\nSeja específico, cite dados reais, priorize por impacto e dê ações concretas. Formate com markdown.`;
  };

  const generateInsight = async (typeId?: string) => {
    const type = ANALYSIS_TYPES.find(t => t.id === (typeId || activeType))!;
    setLoading(true);
    setResult("");
    setGenerated(false);
    abortRef.current = false;

    try {
      await streamChatToCompletion({
        prompt: buildContextPrompt(type),
        agentName: "SEO Analyst",
        agentInstructions: "Você é um especialista sênior em SEO técnico e estratégico. Analise dados reais do Google Search Console e forneça insights acionáveis. Sempre priorize por impacto potencial. Use formato de relatório profissional com seções claras.",
        projectId: projectId || undefined,
        onDelta: (text) => {
          if (!abortRef.current) setResult(text);
        },
      });
      setGenerated(true);
    } catch (err: any) {
      if (!abortRef.current) {
        setResult(`❌ Erro ao gerar análise: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (id: string) => {
    setActiveType(id);
    if (generated || result) {
      setResult("");
      setGenerated(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Analysis type selector */}
      <div className="flex flex-wrap gap-2">
        {ANALYSIS_TYPES.map(type => {
          const Icon = type.icon;
          const isActive = activeType === type.id;
          return (
            <Button
              key={type.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="text-xs gap-1.5 h-8"
              onClick={() => handleTypeChange(type.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {type.label}
            </Button>
          );
        })}
      </div>

      {/* Generate / status card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Análise IA — {ANALYSIS_TYPES.find(t => t.id === activeType)?.label}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Insights gerados por IA com base nos seus dados reais de SEO
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {generated && (
              <Badge variant="secondary" className="text-[9px]">
                ✓ Análise completa
              </Badge>
            )}
            <Button
              size="sm"
              className="text-xs gap-1.5 h-8"
              onClick={() => generateInsight()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : generated ? (
                <RefreshCw className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {loading ? "Analisando..." : generated ? "Regenerar" : "Gerar Análise"}
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!result && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Clique em "Gerar Análise" para receber insights personalizados
              </p>
              <p className="text-[10px] text-muted-foreground">
                A IA analisará {kpis.totalClicks.toLocaleString("pt-BR")} cliques e {topQueries.length} consultas do período selecionado
              </p>
            </motion.div>
          )}

          {(result || loading) && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
            >
              <ReactMarkdown>{result || "⏳ Analisando dados de SEO..."}</ReactMarkdown>
              {loading && (
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processando análise...
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
