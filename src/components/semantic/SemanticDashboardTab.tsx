import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Network, GitBranch, Code2, AlertTriangle, CheckCircle2,
  TrendingUp, Loader2, ShieldCheck, Layers, Target, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ENTITY_ICONS, ENTITY_COLORS } from "./EntityNode";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface EntityRow {
  id: string;
  name: string;
  entity_type: string;
  schema_type: string | null;
  description: string | null;
}

interface RelationRow {
  id: string;
  subject_id: string;
  object_id: string;
  predicate: string;
}

export function SemanticDashboardTab() {
  const projectId = localStorage.getItem("rankito_current_project");
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      const [entRes, relRes] = await Promise.all([
        supabase.from("semantic_entities").select("id, name, entity_type, schema_type, description").eq("project_id", projectId),
        supabase.from("semantic_relations").select("id, subject_id, object_id, predicate").eq("project_id", projectId),
      ]);
      setEntities(entRes.data || []);
      setRelations(relRes.data || []);
      setLoading(false);
    })();
  }, [projectId]);

  // ── Computed metrics ──
  const metrics = useMemo(() => {
    const totalEntities = entities.length;
    const totalRelations = relations.length;
    const withSchema = entities.filter((e) => e.schema_type).length;
    const withDescription = entities.filter((e) => e.description?.trim()).length;
    const uniquePredicates = new Set(relations.map((r) => r.predicate)).size;

    // Connected nodes
    const connectedIds = new Set<string>();
    relations.forEach((r) => {
      connectedIds.add(r.subject_id);
      connectedIds.add(r.object_id);
    });
    const disconnected = entities.filter((e) => !connectedIds.has(e.id));

    // Type distribution
    const typeCount: Record<string, number> = {};
    entities.forEach((e) => {
      typeCount[e.entity_type] = (typeCount[e.entity_type] || 0) + 1;
    });
    const typeDistribution = Object.entries(typeCount)
      .map(([type, count]) => ({ type, count, color: ENTITY_COLORS[type] || "hsl(250 85% 60%)" }))
      .sort((a, b) => b.count - a.count);

    // Predicate distribution
    const predCount: Record<string, number> = {};
    relations.forEach((r) => {
      predCount[r.predicate] = (predCount[r.predicate] || 0) + 1;
    });
    const predicateDistribution = Object.entries(predCount)
      .map(([predicate, count]) => ({ predicate, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Authority Score (0-100)
    const scores = {
      entityCount: Math.min(totalEntities / 15, 1) * 25,
      relationDensity: totalEntities > 1 ? Math.min(totalRelations / (totalEntities * 1.5), 1) * 25 : 0,
      schemaCoverage: totalEntities > 0 ? (withSchema / totalEntities) * 25 : 0,
      connectivity: totalEntities > 0 ? ((totalEntities - disconnected.length) / totalEntities) * 25 : 0,
    };
    const authorityScore = Math.round(scores.entityCount + scores.relationDensity + scores.schemaCoverage + scores.connectivity);

    return {
      totalEntities,
      totalRelations,
      withSchema,
      withDescription,
      uniquePredicates,
      disconnected,
      typeDistribution,
      predicateDistribution,
      authorityScore,
      scores,
      schemaCoverage: totalEntities > 0 ? Math.round((withSchema / totalEntities) * 100) : 0,
      connectivity: totalEntities > 0 ? Math.round(((totalEntities - disconnected.length) / totalEntities) * 100) : 0,
    };
  }, [entities, relations]);

  const scoreColor = metrics.authorityScore >= 70 ? "text-success" : metrics.authorityScore >= 40 ? "text-warning" : "text-destructive";
  const scoreBg = metrics.authorityScore >= 70 ? "bg-success/10" : metrics.authorityScore >= 40 ? "bg-warning/10" : "bg-destructive/10";

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </Card>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-4 border-primary/20 bg-accent/30">
          <div className="flex gap-3 items-start">
            <BarChart3 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Dashboard de Autoridade Semântica</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Visualize o <strong>Score de Autoridade Semântica</strong> do seu negócio. Crie entidades no Construtor de Grafo para começar.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
          <Network className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-base font-semibold">Grafo vazio</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Crie entidades e relações no Construtor de Grafo para ver métricas aqui.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      <Card className="p-4 border-primary/20 bg-accent/30">
        <div className="flex gap-3 items-start">
          <BarChart3 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Dashboard de Autoridade Semântica</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O score mede quão bem o Google pode compreender seu negócio através das entidades, relações e marcações Schema.org que você configurou.
            </p>
          </div>
        </div>
      </Card>

      {/* Authority Score Hero */}
      <Card className={`p-6 ${scoreBg} border-2`} style={{ borderColor: metrics.authorityScore >= 70 ? "hsl(var(--success) / 0.3)" : metrics.authorityScore >= 40 ? "hsl(var(--warning) / 0.3)" : "hsl(var(--destructive) / 0.3)" }}>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div className={`text-5xl font-bold ${scoreColor}`}>{metrics.authorityScore}</div>
            <span className="text-[11px] text-muted-foreground font-medium">/ 100</span>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Score de Autoridade Semântica</h3>
              <p className="text-xs text-muted-foreground">
                {metrics.authorityScore >= 70
                  ? "Excelente! Seu grafo semântico está robusto e bem conectado."
                  : metrics.authorityScore >= 40
                    ? "Bom progresso. Continue adicionando entidades e schemas para melhorar."
                    : "Início da jornada. Adicione mais entidades, relações e schemas."}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Entidades", value: Math.round(metrics.scores.entityCount), max: 25, icon: Network },
                { label: "Relações", value: Math.round(metrics.scores.relationDensity), max: 25, icon: GitBranch },
                { label: "Schema", value: Math.round(metrics.scores.schemaCoverage), max: 25, icon: Code2 },
                { label: "Conexões", value: Math.round(metrics.scores.connectivity), max: 25, icon: ShieldCheck },
              ].map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <s.icon className="h-3 w-3" />
                    {s.label}
                  </div>
                  <Progress value={(s.value / s.max) * 100} className="h-1.5" />
                  <span className="text-[10px] font-medium text-foreground">{s.value}/{s.max}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Entidades", value: metrics.totalEntities, icon: Network, color: "text-primary" },
          { label: "Relações", value: metrics.totalRelations, icon: GitBranch, color: "text-success" },
          { label: "Predicados Únicos", value: metrics.uniquePredicates, icon: Layers, color: "text-warning" },
          { label: "Desconectadas", value: metrics.disconnected.length, icon: AlertTriangle, color: metrics.disconnected.length > 0 ? "text-destructive" : "text-success" },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-xs font-medium">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Coverage bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Cobertura Schema.org</span>
            </div>
            <Badge variant={metrics.schemaCoverage >= 80 ? "default" : "secondary"} className="text-[10px]">
              {metrics.schemaCoverage}%
            </Badge>
          </div>
          <Progress value={metrics.schemaCoverage} className="h-2" />
          <p className="text-[11px] text-muted-foreground">
            {metrics.withSchema} de {metrics.totalEntities} entidades possuem tipo Schema.org configurado
          </p>
        </Card>
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-success" />
              <span className="text-xs font-semibold text-foreground">Conectividade do Grafo</span>
            </div>
            <Badge variant={metrics.connectivity >= 80 ? "default" : "secondary"} className="text-[10px]">
              {metrics.connectivity}%
            </Badge>
          </div>
          <Progress value={metrics.connectivity} className="h-2" />
          <p className="text-[11px] text-muted-foreground">
            {metrics.totalEntities - metrics.disconnected.length} de {metrics.totalEntities} entidades estão conectadas
          </p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Type distribution pie */}
        <Card className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Distribuição por Tipo de Entidade
          </h4>
          {metrics.typeDistribution.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={metrics.typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    dataKey="count"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {metrics.typeDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {metrics.typeDistribution.map((t) => {
                  const Icon = ENTITY_ICONS[t.type] || Network;
                  return (
                    <div key={t.type} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <Icon className="h-3 w-3 shrink-0" style={{ color: t.color }} />
                      <span className="text-muted-foreground capitalize flex-1">{t.type}</span>
                      <span className="font-semibold text-foreground">{t.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sem dados</p>
          )}
        </Card>

        {/* Predicate bar chart */}
        <Card className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-success" />
            Predicados Mais Usados
          </h4>
          {metrics.predicateDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={metrics.predicateDistribution} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="predicate" type="category" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">Sem relações</p>
          )}
        </Card>
      </div>

      {/* Disconnected entities warning */}
      {metrics.disconnected.length > 0 && (
        <Card className="p-4 border-destructive/20 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">Entidades Desconectadas ({metrics.disconnected.length})</h4>
              <p className="text-[11px] text-muted-foreground">
                Estas entidades não possuem relações. Conecte-as no Construtor de Grafo para fortalecer a rede semântica.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {metrics.disconnected.map((e) => {
                  const Icon = ENTITY_ICONS[e.entity_type] || Network;
                  return (
                    <Badge key={e.id} variant="outline" className="text-[10px] gap-1">
                      <Icon className="h-3 w-3" />
                      {e.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-xs font-semibold text-foreground">Pontos Fortes</span>
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {metrics.totalEntities >= 5 && <li>✅ Grafo com {metrics.totalEntities} entidades</li>}
            {metrics.schemaCoverage >= 50 && <li>✅ Boa cobertura Schema ({metrics.schemaCoverage}%)</li>}
            {metrics.connectivity >= 80 && <li>✅ Alta conectividade ({metrics.connectivity}%)</li>}
            {metrics.uniquePredicates >= 3 && <li>✅ Diversidade de predicados ({metrics.uniquePredicates})</li>}
            {metrics.totalEntities < 5 && metrics.schemaCoverage < 50 && metrics.connectivity < 80 && (
              <li className="text-muted-foreground/60">Construa mais o grafo para ver pontos fortes</li>
            )}
          </ul>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-xs font-semibold text-foreground">Áreas de Melhoria</span>
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {metrics.totalEntities < 10 && <li>⚠️ Adicione mais entidades (meta: 10+)</li>}
            {metrics.schemaCoverage < 80 && <li>⚠️ Configure Schema em mais entidades</li>}
            {metrics.disconnected.length > 0 && <li>⚠️ {metrics.disconnected.length} entidade(s) isolada(s)</li>}
            {metrics.withDescription < metrics.totalEntities && <li>⚠️ {metrics.totalEntities - metrics.withDescription} sem descrição</li>}
          </ul>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Próximas Ações</span>
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {metrics.disconnected.length > 0 && <li>🔗 Conectar entidades isoladas</li>}
            {metrics.schemaCoverage < 100 && <li>🏷️ Configurar Schema.org nas entidades</li>}
            {metrics.totalEntities < 15 && <li>➕ Expandir o grafo com mais entidades</li>}
            <li>📊 Analisar schemas dos concorrentes</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
