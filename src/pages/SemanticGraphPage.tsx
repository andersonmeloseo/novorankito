import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Network, GitBranch, Code2, BarChart3, Lightbulb, FileDown, Users,
} from "lucide-react";
import { FeatureBanner } from "@/components/tracking/FeatureBanner";
import { GraphBuilder } from "@/components/semantic/GraphBuilder";
import { TriplesTable } from "@/components/semantic/TriplesTable";
import { SchemaOrgTab } from "@/components/semantic/SchemaOrgTab";
import { CompetitorAnalysisTab } from "@/components/semantic/CompetitorAnalysisTab";

const TABS = [
  { id: "graph", label: "Construtor de Grafo", icon: Network },
  { id: "triples", label: "Triples", icon: GitBranch },
  { id: "schema", label: "Schema.org", icon: Code2 },
  { id: "competitors", label: "Concorrentes", icon: Users },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "recommendations", label: "Recomendações", icon: Lightbulb },
  { id: "exports", label: "Exportações", icon: FileDown },
];

export default function SemanticGraphPage() {
  const [activeTab, setActiveTab] = useState("graph");

  useEffect(() => {
    const handler = (e: Event) => setActiveTab((e as CustomEvent).detail);
    window.addEventListener("switch-semantic-tab", handler);
    return () => window.removeEventListener("switch-semantic-tab", handler);
  }, []);

  return (
    <>
      <TopBar
        title="Grafo Semântico"
        subtitle="Construa o ecossistema de entidades do seu negócio para SEO semântico"
      />
      <div className="p-4 sm:p-6 space-y-4 flex flex-col min-h-0 overflow-auto">
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

          {/* Graph Builder Tab */}
          <TabsContent value="graph" className="mt-4">
            <GraphBuilder />
          </TabsContent>

          {/* Triples Tab */}
          <TabsContent value="triples" className="mt-4">
            <TriplesTable />
          </TabsContent>

          {/* Schema.org Tab */}
          <TabsContent value="schema" className="mt-4">
            <SchemaOrgTab projectId={localStorage.getItem("rankito_current_project") || ""} />
          </TabsContent>

          {/* Competitors Tab */}
          <TabsContent value="competitors" className="mt-4">
            <CompetitorAnalysisTab />
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-4">
            <div className="space-y-4">
              <Card className="p-4 border-primary/20 bg-accent/30">
                <div className="flex gap-3 items-start">
                  <BarChart3 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Dashboard de Autoridade Semântica</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Visualize o <strong>Score de Autoridade Semântica</strong> do seu negócio — uma métrica que mede o quão bem o Google compreende suas entidades e relações. Identifique <strong>lacunas de autoridade</strong>, acompanhe a evolução do grafo e receba recomendações de próximas ações.
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      💡 <strong>Quando usar:</strong> Consulte após criar ou expandir seu grafo para avaliar a cobertura semântica e priorizar melhorias de SEO baseadas em dados.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                <BarChart3 className="h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Em breve</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Score de Autoridade Semântica, visual do grafo, lacunas de autoridade,
                  próximas ações recomendadas e nível de confiança do negócio.
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="mt-4">
            <div className="space-y-4">
              <Card className="p-4 border-primary/20 bg-accent/30">
                <div className="flex gap-3 items-start">
                  <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Recomendador de Conteúdo Semântico</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      O motor de recomendações analisa seu grafo semântico e identifica <strong>páginas que faltam criar</strong>, <strong>entidades desconectadas</strong> e <strong>relações estratégicas ausentes</strong>. Cada sugestão fortalece o Knowledge Graph do seu negócio e melhora o posicionamento orgânico.
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      💡 <strong>Quando usar:</strong> Após montar seu grafo inicial, consulte as recomendações para descobrir conteúdos estratégicos que ampliam sua cobertura semântica no nicho.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                <Lightbulb className="h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Em breve</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Identifica páginas a criar, conteúdos estratégicos e conexões ausentes
                  para fortalecer o grafo semântico do seu negócio.
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Exports Tab */}
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
