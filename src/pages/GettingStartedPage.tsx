import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  FolderOpen, Search, BarChart3, Bot, Database, Layers,
  Target, Coins, Network, MousePointerClick, CheckCircle2,
  Circle, ArrowRight, Sparkles, Rocket, BookOpen,
} from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  category: "setup" | "seo" | "analytics" | "advanced";
  checkFn?: () => boolean;
}

const categories = {
  setup: { label: "Configuração Inicial", color: "text-emerald-400", emoji: "🚀" },
  seo: { label: "SEO & Indexação", color: "text-blue-400", emoji: "🔍" },
  analytics: { label: "Analytics & Tracking", color: "text-amber-400", emoji: "📊" },
  advanced: { label: "Avançado", color: "text-purple-400", emoji: "🧠" },
};

export default function GettingStartedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("rankito_onboarding_steps");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["getting-started-projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: hasGsc } = useQuery({
    queryKey: ["getting-started-gsc", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("gsc_connections")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user!.id);
      return (count || 0) > 0;
    },
    enabled: !!user,
  });

  const { data: hasGa4 } = useQuery({
    queryKey: ["getting-started-ga4", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ga4_connections")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user!.id);
      return (count || 0) > 0;
    },
    enabled: !!user,
  });

  const steps: Step[] = [
    {
      id: "create-project",
      title: "Crie seu primeiro projeto",
      description: "Adicione o domínio do seu site para começar a monitorar SEO, tráfego e performance.",
      icon: FolderOpen,
      route: "/projects",
      category: "setup",
    },
    {
      id: "connect-gsc",
      title: "Conecte o Google Search Console",
      description: "Integre seus dados de busca para ver queries, cliques, impressões e posições em tempo real.",
      icon: Search,
      route: "/project-settings#integrations",
      category: "setup",
    },
    {
      id: "connect-ga4",
      title: "Conecte o Google Analytics 4",
      description: "Importe sessões, conversões, fontes de tráfego e dados demográficos do seu site.",
      icon: BarChart3,
      route: "/project-settings#integrations",
      category: "setup",
    },
    {
      id: "explore-seo",
      title: "Explore o Dashboard SEO",
      description: "Analise queries, páginas, oportunidades perdidas e canibalização de palavras-chave.",
      icon: Search,
      route: "/seo#queries",
      category: "seo",
    },
    {
      id: "indexing",
      title: "Gerencie a Indexação",
      description: "Submeta URLs ao Google, monitore cobertura e agende indexações automáticas.",
      icon: Database,
      route: "/indexing#dashboard",
      category: "seo",
    },
    {
      id: "semantic-graph",
      title: "Monte seu Grafo Semântico",
      description: "Construa entidades, triplas e Schema.org para fortalecer sua autoridade tópica.",
      icon: Network,
      route: "/semantic-graph#builder",
      category: "seo",
    },
    {
      id: "ga4-dashboard",
      title: "Analise os dados do GA4",
      description: "Veja tráfego em tempo real, aquisição por canal, público e performance de e-commerce.",
      icon: BarChart3,
      route: "/ga4#overview",
      category: "analytics",
    },
    {
      id: "install-pixel",
      title: "Instale o Pixel do Rankito",
      description: "Copie o snippet de tracking para capturar eventos, sessões e heatmaps do seu site.",
      icon: MousePointerClick,
      route: "/analitica-rankito/pixel",
      category: "analytics",
    },
    {
      id: "tracking-goals",
      title: "Configure Metas de Conversão",
      description: "Defina metas para formulários, compras e eventos customizados do seu funil.",
      icon: Target,
      route: "/analitica-rankito/metas",
      category: "analytics",
    },
    {
      id: "ai-agent",
      title: "Conheça o Rankito IA",
      description: "Use o assistente de IA para obter insights, relatórios e recomendações automáticas.",
      icon: Bot,
      route: "/rankito-ai#chat",
      category: "advanced",
    },
    {
      id: "rank-rent",
      title: "Explore o Rank & Rent",
      description: "Monetize seus sites ranqueados alugando-os para clientes locais.",
      icon: Coins,
      route: "/rank-rent",
      category: "advanced",
    },
  ];

  // Auto-check based on real data
  useEffect(() => {
    const autoChecks = new Set(completed);
    if (projects.length > 0) autoChecks.add("create-project");
    if (hasGsc) autoChecks.add("connect-gsc");
    if (hasGa4) autoChecks.add("connect-ga4");
    if (autoChecks.size !== completed.size) {
      setCompleted(autoChecks);
      localStorage.setItem("rankito_onboarding_steps", JSON.stringify([...autoChecks]));
    }
  }, [projects, hasGsc, hasGa4]);

  const toggleStep = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompleted(next);
    localStorage.setItem("rankito_onboarding_steps", JSON.stringify([...next]));
  };

  const progress = Math.round((completed.size / steps.length) * 100);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Guia de Início"
        description="Siga o passo a passo para configurar e aproveitar ao máximo o Rankito."
      />
      {/* Intro explanation */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20 bg-accent/30">
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Como funciona o Rankito?</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    <strong className="text-foreground">Crie um projeto</strong> — cadastre o domínio do seu site. Todos os módulos (SEO, GA4, Indexação, IA, etc.) ficam vinculados ao projeto selecionado.
                  </li>
                  <li>
                    <strong className="text-foreground">Conecte as APIs do Google</strong> — integre o <span className="text-primary font-medium">Google Search Console</span> e o <span className="text-primary font-medium">Google Analytics 4</span> nas configurações do projeto para importar seus dados reais.
                  </li>
                  <li>
                    <strong className="text-foreground">Explore os módulos</strong> — com o projeto ativo e as integrações configuradas, todas as abas da sidebar (SEO, GA4, Indexação, Analítica, IA, etc.) passam a funcionar com dados reais.
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground/70 pt-1">
                  💡 <strong>Dica:</strong> selecione o projeto ativo no topo da sidebar para alternar entre sites. Cada projeto tem suas próprias integrações e dados independentes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Card className="border-sidebar-primary/20 bg-gradient-to-r from-sidebar-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-sidebar-primary" />
                <span className="font-semibold text-sm">Progresso do Setup</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {completed.size}/{steps.length} concluídos
              </Badge>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sidebar-primary to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            {progress === 100 && (
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Parabéns! Você completou todas as etapas! 🎉
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Steps by category */}
      {Object.entries(categories).map(([catKey, cat]) => {
        const catSteps = steps.filter((s) => s.category === catKey);
        return (
          <motion.div
            key={catKey}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>{cat.emoji}</span>
              <span className={cat.color}>{cat.label}</span>
            </h3>
            <div className="space-y-2">
              {catSteps.map((step, i) => {
                const done = completed.has(step.id);
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className={`transition-all duration-200 cursor-pointer group hover:border-sidebar-primary/40 ${
                        done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
                      }`}
                      onClick={() => toggleStep(step.id)}
                    >
                      <CardContent className="py-3 px-4 flex items-center gap-4">
                        <button
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStep(step.id);
                          }}
                        >
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </button>
                        <step.icon className={`h-5 w-5 shrink-0 ${done ? "text-emerald-400/60" : "text-sidebar-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{step.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(step.route);
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
