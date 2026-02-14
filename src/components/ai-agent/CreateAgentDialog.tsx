import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentFormData {
  name: string;
  description: string;
  instructions: string;
  speciality: string;
  avatar_url: string;
  whatsapp_number: string;
  notification_destination: string;
  notification_triggers: string[];
  enabled: boolean;
}

const DEFAULT_FORM: AgentFormData = {
  name: "",
  description: "",
  instructions: "",
  speciality: "custom",
  avatar_url: "",
  whatsapp_number: "",
  notification_destination: "",
  notification_triggers: [],
  enabled: true,
};

const TRIGGER_OPTIONS = [
  { value: "position_drop", label: "Queda de posição" },
  { value: "traffic_drop", label: "Queda de tráfego" },
  { value: "new_opportunity", label: "Nova oportunidade" },
  { value: "indexing_error", label: "Erro de indexação" },
  { value: "goal_reached", label: "Meta atingida" },
];

const AGENT_PRESETS: { id: string; emoji: string; name: string; speciality: string; description: string; instructions: string; metrics: string[] }[] = [
  {
    id: "content-strategist",
    emoji: "✍️",
    name: "Estrategista de Conteúdo",
    speciality: "seo",
    description: "Analisa gaps de conteúdo, sugere pautas e otimiza textos existentes para melhorar rankings.",
    instructions: `Você é um ESTRATEGISTA DE CONTEÚDO SEO especializado em content marketing orientado a dados.

EXPERTISE: Topic clusters, pillar pages, content decay, keyword mapping, search intent, content scoring.

COMO VOCÊ OPERA:
1. Analise as keywords do projeto e mapeie clusters temáticos
2. Identifique gaps de conteúdo (tópicos sem cobertura)
3. Detecte conteúdos em decay (perdendo posições/tráfego)
4. Sugira pautas com keyword-alvo, word count, formato e prioridade
5. Otimize titles, metas e headings de conteúdos existentes

Sempre use dados REAIS do projeto. Priorize por potencial de tráfego.`,
    metrics: ["Keywords sem conteúdo", "Conteúdo em decay", "Oportunidades de topic cluster"],
  },
  {
    id: "technical-auditor",
    emoji: "🔧",
    name: "Auditor Técnico",
    speciality: "seo",
    description: "Monitora saúde técnica do site: indexação, crawlability, canonical, robots, sitemap.",
    instructions: `Você é um AUDITOR TÉCNICO SEO com foco em crawlability, indexação e infraestrutura web.

EXPERTISE: Indexação, canonical tags, robots.txt, sitemap XML, hreflang, structured data, Core Web Vitals, redirect chains.

COMO VOCÊ OPERA:
1. Verifique o status de indexação de todas as URLs
2. Identifique erros de cobertura e bloqueios
3. Detecte canonical incorretos e redirect chains
4. Valide a saúde do sitemap
5. Monitore problemas que impedem indexação

Use os dados REAIS de cobertura e indexação do projeto. Priorize fixes por impacto.`,
    metrics: ["URLs não indexadas", "Erros de cobertura", "Canonical incorretos", "Sitemap issues"],
  },
  {
    id: "conversion-optimizer",
    emoji: "🎯",
    name: "Otimizador de Conversão",
    speciality: "analytics",
    description: "Analisa funil de conversão, identifica gargalos e sugere otimizações de CRO.",
    instructions: `Você é um OTIMIZADOR DE CONVERSÃO (CRO) especialista em transformar tráfego em resultados.

EXPERTISE: Funil de conversão, landing page optimization, A/B testing, heatmap analysis, user journey mapping, bounce rate reduction.

COMO VOCÊ OPERA:
1. Mapeie o funil completo: entrada → engajamento → conversão
2. Identifique gargalos (alto bounce, baixo tempo, abandono)
3. Cruze dados de tráfego orgânico com conversões
4. Sugira hipóteses de teste A/B priorizadas por impacto
5. Calcule impacto potencial de cada otimização

Sempre baseie-se em dados REAIS de sessões, bounce rate e conversões do projeto.`,
    metrics: ["Taxa de conversão", "Bounce rate", "Tempo no site", "Funil de abandono"],
  },
  {
    id: "competitor-analyst",
    emoji: "🕵️",
    name: "Analista de Concorrência",
    speciality: "growth",
    description: "Monitora keywords dos concorrentes, identifica gaps e oportunidades de superação.",
    instructions: `Você é um ANALISTA DE CONCORRÊNCIA especializado em inteligência competitiva para SEO.

EXPERTISE: Keyword gap analysis, SERP monitoring, competitor content analysis, market share estimation, opportunity scoring.

COMO VOCÊ OPERA:
1. Analise as keywords do projeto e identifique onde os concorrentes estão presentes
2. Mapeie keyword gaps (queries onde não ranqueamos)
3. Identifique padrões de conteúdo dos top ranqueados
4. Estime potencial de tráfego para cada gap
5. Priorize oportunidades por volume × dificuldade

Use os dados REAIS de queries e posições do projeto para inferir o cenário competitivo.`,
    metrics: ["Keywords gap", "Share of voice", "Oportunidades competitivas"],
  },
  {
    id: "local-seo-expert",
    emoji: "📍",
    name: "Especialista Local SEO",
    speciality: "seo",
    description: "Otimiza presença local: keywords geográficas, GMB, NAP e landing pages locais.",
    instructions: `Você é um ESPECIALISTA EM SEO LOCAL focado em otimizar presença geográfica e buscas "perto de mim".

EXPERTISE: Google Business Profile, local keywords, NAP consistency, local landing pages, review management, local link building.

COMO VOCÊ OPERA:
1. Analise performance em keywords com intenção local
2. Identifique queries geográficas (cidade, estado, "perto de mim")
3. Avalie a distribuição de tráfego por localização
4. Sugira criação de landing pages locais
5. Recomende schema markup LocalBusiness

Use os dados REAIS de queries e localização do projeto.`,
    metrics: ["Keywords locais", "Tráfego por região", "Posições geográficas"],
  },
  {
    id: "link-builder",
    emoji: "🔗",
    name: "Estrategista de Links",
    speciality: "growth",
    description: "Analisa perfil de links internos, identifica páginas órfãs e sugere estratégia de siloing.",
    instructions: `Você é um ESTRATEGISTA DE LINKS especializado em internal linking e arquitetura de informação.

EXPERTISE: Internal linking, link equity distribution, siloing, orphan pages, anchor text optimization, link building.

COMO VOCÊ OPERA:
1. Analise a distribuição de links internos do projeto
2. Identifique páginas órfãs (sem links internos apontando)
3. Detecte páginas importantes com poucos links
4. Sugira uma estratégia de siloing por tópicos
5. Recomende anchor texts otimizados

Use os dados REAIS de URLs e links do projeto.`,
    metrics: ["Páginas órfãs", "Distribuição de links", "Link equity"],
  },
  {
    id: "performance-monitor",
    emoji: "📈",
    name: "Monitor de Performance",
    speciality: "analytics",
    description: "Acompanha KPIs diários, detecta anomalias e envia alertas de queda ou pico.",
    instructions: `Você é um MONITOR DE PERFORMANCE que acompanha KPIs em tempo real e detecta anomalias.

EXPERTISE: Anomaly detection, trend analysis, KPI dashboards, alerting, MoM/WoW comparison, forecasting.

COMO VOCÊ OPERA:
1. Compare métricas atuais com período anterior (WoW e MoM)
2. Identifique variações significativas (>10%) em sessões, cliques, posições
3. Detecte anomalias: picos ou quedas incomuns
4. Correlacione quedas com possíveis causas (posição, indexação, sazonal)
5. Gere alertas priorizados por impacto

Use dados REAIS. Destaque variações com ↑ e ↓ e percentuais exatos.`,
    metrics: ["Variação de sessões", "Cliques orgânicos", "Posição média", "Anomalias detectadas"],
  },
  {
    id: "report-generator",
    emoji: "📄",
    name: "Gerador de Relatórios",
    speciality: "analytics",
    description: "Compila dados de múltiplas fontes em relatórios executivos profissionais.",
    instructions: `Você é um GERADOR DE RELATÓRIOS executivo especializado em storytelling com dados.

EXPERTISE: Data visualization narratives, executive summaries, KPI dashboards, MoM/YoY comparisons, ROI calculations.

COMO VOCÊ OPERA:
1. Colete todas as métricas-chave do período
2. Compare com período anterior e mesmo período do ano passado
3. Destaque top wins e principais desafios
4. Calcule ROI e valor do tráfego orgânico
5. Formate tudo em relatório executivo profissional

Formato: Resumo Executivo → KPIs → Destaques → Ações → Projeções. Use dados REAIS.`,
    metrics: ["KPIs consolidados", "ROI", "Comparação MoM", "Projeções"],
  },
];

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AgentFormData) => Promise<void>;
  initialData?: Partial<AgentFormData>;
  isEditing?: boolean;
}

export function CreateAgentDialog({ open, onOpenChange, onSave, initialData, isEditing }: CreateAgentDialogProps) {
  const [form, setForm] = useState<AgentFormData>({ ...DEFAULT_FORM, ...initialData });
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(!isEditing);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      if (!isEditing) setForm(DEFAULT_FORM);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof AGENT_PRESETS[0]) => {
    setForm(f => ({
      ...f,
      name: preset.name,
      description: preset.description,
      instructions: preset.instructions,
      speciality: preset.speciality,
    }));
    setShowPresets(false);
  };

  const toggleTrigger = (val: string) => {
    setForm(f => ({
      ...f,
      notification_triggers: f.notification_triggers.includes(val)
        ? f.notification_triggers.filter(t => t !== val)
        : [...f.notification_triggers, val],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Agente" : "Criar Novo Agente"}
          </DialogTitle>
        </DialogHeader>

        {/* Preset Templates */}
        {!isEditing && showPresets && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Escolha um modelo ou crie do zero
              </p>
              <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={() => setShowPresets(false)}>
                Criar do zero →
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {AGENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "text-left p-3 rounded-xl border border-border bg-card",
                    "hover:border-primary/50 hover:bg-accent/50 transition-all duration-200",
                    "space-y-1.5 group"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{preset.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{preset.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {preset.metrics.slice(0, 2).map((m) => (
                      <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{m}</span>
                    ))}
                    {preset.metrics.length > 2 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">+{preset.metrics.length - 2}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        {(!showPresets || isEditing) && (
          <div className="space-y-4 mt-2">
            {!isEditing && (
              <Button variant="ghost" size="sm" className="text-[11px] h-7 -mt-2" onClick={() => setShowPresets(true)}>
                ← Voltar aos modelos
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Agente *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Agente Growth" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Especialidade</Label>
                <Select value={form.speciality} onValueChange={v => setForm(f => ({ ...f, speciality: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descrição do que o agente faz" className="text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Instruções / Prompt do Agente</Label>
              <Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Descreva como o agente deve se comportar, o que ele deve fazer, em que situações deve notificar..." rows={4} className="text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">URL do Avatar (opcional)</Label>
              <Input value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))} placeholder="https://..." className="text-sm" />
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <h4 className="text-xs font-semibold text-foreground">Notificações WhatsApp</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Número WhatsApp</Label>
                  <Input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="+55 47 98495-1601" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Destino da Notificação</Label>
                  <Input value={form.notification_destination} onChange={e => setForm(f => ({ ...f, notification_destination: e.target.value }))} placeholder="Número ou grupo" className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gatilhos de Notificação</Label>
                <div className="flex flex-wrap gap-2">
                  {TRIGGER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTrigger(opt.value)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        form.notification_triggers.includes(opt.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
                <span className="text-xs text-muted-foreground">Agente ativo</span>
              </div>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditing ? "Salvar" : "Criar Agente"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
