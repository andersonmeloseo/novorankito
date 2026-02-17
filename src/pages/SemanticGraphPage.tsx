import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Network, GitBranch, Code2, BarChart3, Lightbulb, FileDown, Users, ArrowLeft,
  Target, MessageSquare, Layout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { GraphBuilder } from "@/components/semantic/GraphBuilder";
import { TriplesTable } from "@/components/semantic/TriplesTable";
import { SchemaOrgTab } from "@/components/semantic/SchemaOrgTab";
import { CompetitorAnalysisTab } from "@/components/semantic/CompetitorAnalysisTab";
import { SemanticDashboardTab } from "@/components/semantic/SemanticDashboardTab";
import { SemanticRecommendationsTab } from "@/components/semantic/SemanticRecommendationsTab";
import { SemanticProjectSelector } from "@/components/semantic/SemanticProjectSelector";
import { SemanticGoalsTab } from "@/components/semantic/SemanticGoalsTab";
import { SemanticFeedbackTab } from "@/components/semantic/SemanticFeedbackTab";
import { SemanticImplementationTab } from "@/components/semantic/SemanticImplementationTab";

const TABS = [
  { id: "goals", label: "Metas", icon: Target },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "graph", label: "Construtor de Grafo", icon: Network },
  { id: "triples", label: "Triples", icon: GitBranch },
  { id: "schema", label: "Schema.org", icon: Code2 },
  { id: "implementation", label: "Implementação", icon: Layout },
  { id: "competitors", label: "Concorrentes", icon: Users },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "recommendations", label: "Recomendações", icon: Lightbulb },
  { id: "exports", label: "Exportações", icon: FileDown },
];

export default function SemanticGraphPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("goals");
  const [projectId, setProjectId] = useState(localStorage.getItem("rankito_current_project") || "");
  const [semanticProjectId, setSemanticProjectId] = useState<string | null>(null);
  const [implementationActivated, setImplementationActivated] = useState(false);

  // Sync projectId with localStorage
  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem("rankito_current_project") || "";
      if (stored !== projectId) setProjectId(stored);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("rankito_project_changed", sync);
    const interval = setInterval(sync, 1000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("rankito_project_changed", sync);
      clearInterval(interval);
    };
  }, [projectId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      setActiveTab(tab);
      if (tab === "implementation") setImplementationActivated(true);
    };
    window.addEventListener("switch-semantic-tab", handler);
    return () => window.removeEventListener("switch-semantic-tab", handler);
  }, []);

  // If no main project selected, show prompt
  if (!projectId) {
    return (
      <>
        <TopBar title="Grafo Semântico" subtitle="Selecione um projeto para começar" />
        <div className="p-6 flex flex-col items-center justify-center h-[60vh] text-center gap-4">
          <Network className="h-16 w-16 text-muted-foreground/20" />
          <h2 className="text-lg font-bold text-foreground">Nenhum projeto selecionado</h2>
          <p className="text-sm text-muted-foreground max-w-md">Selecione um projeto na barra lateral ou crie um novo para começar.</p>
          <Button onClick={() => navigate("/projects")} className="gap-2">
            Ver Projetos
          </Button>
        </div>
      </>
    );
  }

  // If no semantic project selected, show the project selector
  if (!semanticProjectId) {
    return (
      <>
        <TopBar
          title="Grafo Semântico"
          subtitle="Selecione ou crie um projeto semântico para organizar suas entidades"
        />
        <div className="p-4 sm:p-6 space-y-4 overflow-auto">
          <FeatureBanner
            title="Projetos Semânticos"
            description="Organize seu trabalho de SEO semântico em projetos separados. Cada projeto é uma pasta com seu próprio grafo de entidades, relações e schemas."
            icon={Network}
          />
          <SemanticProjectSelector
            projectId={projectId}
            selected={semanticProjectId}
            onSelect={setSemanticProjectId}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Grafo Semântico"
        subtitle="Construa o ecossistema de entidades do seu negócio para SEO semântico"
      />
      <div className="p-4 sm:p-6 space-y-4 flex flex-col min-h-0 overflow-auto">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSemanticProjectId(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projetos
          </Button>
        </div>

        <FeatureBanner
          title="Semantic Graph Engine"
          description="Transforme seu negócio em um ecossistema de entidades compreendido pelo Google. Crie entidades, defina relações ontológicas e gere Schema.org automaticamente."
          icon={Network}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl h-auto">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="tab-glow flex items-center gap-1.5 text-xs data-[state=active]:shadow-sm px-3 py-1.5"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="goals" className="mt-4">
            <SemanticGoalsTab projectId={projectId} goalProjectId={semanticProjectId} />
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            <SemanticFeedbackTab projectId={projectId} goalProjectId={semanticProjectId} />
          </TabsContent>

          <TabsContent value="graph" className="mt-4">
            <GraphBuilder semanticProjectId={semanticProjectId} />
          </TabsContent>

          <TabsContent value="triples" className="mt-4">
            <TriplesTable semanticProjectId={semanticProjectId} />
          </TabsContent>

          <TabsContent value="schema" className="mt-4">
            <SchemaOrgTab projectId={projectId} semanticProjectId={semanticProjectId} />
          </TabsContent>

          <TabsContent value="implementation" className="mt-4">
            {implementationActivated ? (
              <SemanticImplementationTab semanticProjectId={semanticProjectId} projectId={projectId} />
            ) : (
              <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                <Layout className="h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Implementação não iniciada</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Para gerar o plano de implementação, vá ao <strong>Construtor de Grafo</strong>, monte seu grafo de entidades e clique no botão <strong>"Implementar"</strong>.
                </p>
                <Button variant="outline" onClick={() => setActiveTab("graph")}>
                  <Network className="h-4 w-4 mr-2" />
                  Ir para o Construtor de Grafo
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="competitors" className="mt-4">
            <CompetitorAnalysisTab />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <SemanticDashboardTab semanticProjectId={semanticProjectId} />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <SemanticRecommendationsTab semanticProjectId={semanticProjectId} />
          </TabsContent>

          <TabsContent value="exports" className="mt-4">
            <div className="space-y-4">
              <Card className="p-4 border-primary/20 bg-accent/30">
                <div className="flex gap-3 items-start">
                  <FileDown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Exportações do Grafo Semântico</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Exporte todo o trabalho do seu grafo semântico em <strong>formatos utilizáveis</strong>: plano de ação com prioridades, estrutura de entidades e relações, checklist de implementação Schema.org e código JSON-LD pronto para colar nas suas páginas.
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      💡 <strong>Quando usar:</strong> Após finalizar seu grafo e schemas, exporte para compartilhar com sua equipe de desenvolvimento ou usar como guia de implementação técnica.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                <FileDown className="h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Em breve</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Exporte o plano de ação, estrutura de entidades, checklist de implementação
                  e sugestões de Schema em formatos utilizáveis.
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
