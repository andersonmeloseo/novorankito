import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
  MarkerType,
  BackgroundVariant,
  Panel,
  MiniMap,
  useReactFlow,
  addEdge,
  type Connection,
  type OnConnectEnd,
  type EdgeProps,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CheckCircle2, XCircle, Loader2, MessageSquare, X, Maximize2, Minimize2,
  Send, Zap, Users, LayoutDashboard, UserPlus, TrendingUp, TrendingDown,
  FileText, Star, Briefcase, Award, Clock, PalmtreeIcon, History,
  ChevronDown, ChevronRight, Trash2, Plus, Brain, Target, BarChart3,
  Hammer, Palette, ShoppingCart, Megaphone, HeartHandshake, Code2,
  DollarSign, Scale, Lightbulb, Smartphone, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TeamHubTab } from "./TeamHubTab";

/* ─── Extended Role Suggestions ─────────────────────────────── */
const ROLE_CATALOG: Array<{ title: string; emoji: string; department: string; category: string; instructions: string; skills: string[] }> = [
  // C-Suite / Diretoria
  { title: "CEO / Diretor", emoji: "👔", department: "Diretoria", category: "C-Suite", skills: ["Visão estratégica", "OKRs", "Gestão"], instructions: "Você é o CEO da agência. Defina visão estratégica, coordene equipes, tome decisões de alto nível e gere relatórios executivos." },
  { title: "COO / Dir. Operações", emoji: "⚙️", department: "Diretoria", category: "C-Suite", skills: ["Operações", "Processos", "Eficiência"], instructions: "Você é o COO. Otimize processos operacionais, garanta eficiência entre departamentos e reporte ao CEO." },
  { title: "CFO / Dir. Financeiro", emoji: "💼", department: "Financeiro", category: "C-Suite", skills: ["Finanças", "Budget", "ROI"], instructions: "Você é o CFO. Analise KPIs financeiros, controle custos, monitore receita e reporte saúde financeira ao CEO." },
  { title: "CMO / Dir. Marketing", emoji: "📢", department: "Marketing", category: "C-Suite", skills: ["Marketing", "Branding", "Aquisição"], instructions: "Você é o CMO. Lidere estratégia de marketing, campanhas de aquisição, branding e reporte ao CEO." },
  { title: "CTO / Dir. Tecnologia", emoji: "💻", department: "Tecnologia", category: "C-Suite", skills: ["Tech Stack", "Arquitetura", "Performance"], instructions: "Você é o CTO. Supervisione a infraestrutura técnica, performance, segurança e evolução tecnológica." },
  // Comercial / Vendas — estrutura completa
  { title: "Head Comercial", emoji: "🤝", department: "Comercial", category: "Comercial", skills: ["Vendas", "Negociação", "Pipeline"], instructions: "Você é o Head Comercial. Gerencie pipeline de vendas, lidere os times de SDR, BDR e Closers, analise oportunidades e reporte ao CEO com métricas de receita." },
  { title: "Gerente de Vendas", emoji: "📈", department: "Comercial", category: "Comercial", skills: ["CRM", "Coaching", "Forecast"], instructions: "Você é o Gerente de Vendas. Supervisione SDRs, BDRs e Closers, faça forecast de receita, identifique gargalos no funil e reporte ao Head Comercial." },
  { title: "SDR (Sales Dev. Rep.)", emoji: "📞", department: "Comercial", category: "Comercial", skills: ["Prospecção", "Cold Call", "Qualificação"], instructions: "Você é o SDR (Sales Development Representative). Sua missão é prospectar leads inbound, qualificar usando critérios BANT/SPIN, agendar reuniões e passar oportunidades qualificadas ao Closer. Registre todas as interações no CRM." },
  { title: "BDR (Business Dev. Rep.)", emoji: "🎯", department: "Comercial", category: "Comercial", skills: ["Outbound", "Cold Email", "LinkedIn"], instructions: "Você é o BDR (Business Development Representative). Sua missão é prospecção outbound: pesquisar ICP (perfil de cliente ideal), criar cadências de cold email/LinkedIn, fazer cold calls e gerar oportunidades novas. Trabalhe em conjunto com o SDR e reporte ao Gerente." },
  { title: "Closer / Account Executive", emoji: "🏆", department: "Comercial", category: "Comercial", skills: ["Negociação", "Demo", "Fechamento"], instructions: "Você é o Closer (Account Executive). Receba oportunidades qualificadas pelos SDRs/BDRs, conduza demos e apresentações consultivas, negocie condições, supere objeções e feche contratos. Reporte taxa de conversão e ticket médio ao Gerente." },
  { title: "Account Manager", emoji: "💼", department: "Comercial", category: "Comercial", skills: ["Upsell", "Carteira", "Relacionamento"], instructions: "Você é o Account Manager. Gerencie a carteira de clientes existentes, identifique oportunidades de upsell e cross-sell, garanta renovações e aumente o LTV (lifetime value). Trabalhe próximo ao CS." },
  { title: "Inside Sales", emoji: "💻", department: "Comercial", category: "Comercial", skills: ["Vendas remotas", "CRM", "Pipeline"], instructions: "Você é o Inside Sales. Gerencie todo o ciclo de vendas de forma remota: prospecção, qualificação, demo e fechamento. Mantenha CRM atualizado e reporte KPIs de vendas diários." },
  { title: "Analista de CRM", emoji: "🗃️", department: "Comercial", category: "Comercial", skills: ["CRM", "Dados", "Automação"], instructions: "Você é o Analista de CRM. Mantenha a higiene do CRM, crie relatórios de funil, automatize sequências e dê suporte analítico a todo o time comercial." },
  { title: "RevOps (Revenue Ops.)", emoji: "⚙️", department: "Comercial", category: "Comercial", skills: ["Processos", "Integrações", "Analytics"], instructions: "Você é o RevOps (Revenue Operations). Alinhe marketing, vendas e CS em torno de dados e processos unificados. Configure integrações entre CRM, automação e analytics. Elimine gargalos no funil." },
  // Marketing
  { title: "Head de Marketing", emoji: "🎯", department: "Marketing", category: "Marketing", skills: ["Estratégia", "Brand", "Campanhas"], instructions: "Você é o Head de Marketing. Coordene todas as estratégias de marketing, branding e aquisição." },
  { title: "Gerente de Marketing", emoji: "📣", department: "Marketing", category: "Marketing", skills: ["Planejamento", "Campanhas", "ROI"], instructions: "Você é o Gerente de Marketing. Planeje e execute campanhas, analise resultados e otimize investimentos." },
  { title: "Gerente de Growth", emoji: "🚀", department: "Growth", category: "Marketing", skills: ["Growth Hacking", "A/B Testing", "Funil"], instructions: "Você é o Gerente de Growth. Identifique alavancas de crescimento, teste hipóteses e reporte ao Head." },
  { title: "Social Media Manager", emoji: "📱", department: "Social", category: "Marketing", skills: ["Instagram", "LinkedIn", "Engajamento"], instructions: "Você é o Social Media Manager. Crie estratégia social, analise engajamento e distribua conteúdos." },
  { title: "Especialista em Ads", emoji: "📣", department: "Ads", category: "Marketing", skills: ["Google Ads", "Meta Ads", "ROAS"], instructions: "Você é o Especialista em Ads. Gerencie campanhas pagas, otimize ROAS e reporte performance." },
  { title: "Email Marketing", emoji: "📧", department: "Marketing", category: "Marketing", skills: ["Automação", "Segmentação", "Taxa abertura"], instructions: "Você é o Especialista em Email Marketing. Crie fluxos de automação, segmente audiências e analise resultados." },
  { title: "Analista de Marketing", emoji: "🔎", department: "Marketing", category: "Marketing", skills: ["Analytics", "Relatórios", "KPIs"], instructions: "Você é o Analista de Marketing. Coleta e analisa dados de campanhas, gera relatórios e identifica oportunidades." },
  // SEO
  { title: "Gerente de SEO", emoji: "🔍", department: "SEO", category: "SEO", skills: ["Estratégia SEO", "Keyword Research", "Link Building"], instructions: "Você é o Gerente de SEO. Defina estratégia, coordene analistas e reporte ao Head/CEO." },
  { title: "Analista de SEO", emoji: "📊", department: "SEO", category: "SEO", skills: ["Auditoria Técnica", "On-page", "Schema"], instructions: "Você é o Analista de SEO. Execute auditorias técnicas, otimize páginas e monitore rankings." },
  { title: "Especialista Link Building", emoji: "🔗", department: "SEO", category: "SEO", skills: ["Outreach", "Digital PR", "Backlinks"], instructions: "Você é o Especialista em Link Building. Prospecte backlinks, execute outreach e reporte autoridade." },
  { title: "Estrategista de Conteúdo", emoji: "✍️", department: "Conteúdo", category: "SEO", skills: ["Calendário editorial", "Content gaps", "E-E-A-T"], instructions: "Você é o Estrategista de Conteúdo. Crie calendário editorial, identifique gaps e priorize otimizações." },
  { title: "Especialista CRO", emoji: "🎯", department: "CRO", category: "SEO", skills: ["A/B Test", "Heatmap", "Conversão"], instructions: "Você é o Especialista em CRO. Analise taxas de conversão, proponha testes e reporte melhorias." },
  // Analytics / Dados
  { title: "Gerente de Analytics", emoji: "📉", department: "Analytics", category: "Analytics", skills: ["GA4", "GTM", "Data Studio"], instructions: "Você é o Gerente de Analytics. Configure tracking, analise dados e suporte todas as equipes." },
  { title: "Analista de Dados", emoji: "🧮", department: "Analytics", category: "Analytics", skills: ["SQL", "BI", "Visualização"], instructions: "Você é o Analista de Dados. Colete, processe e visualize dados para suportar decisões estratégicas." },
  { title: "Cientista de Dados", emoji: "🔬", department: "Analytics", category: "Analytics", skills: ["ML", "Estatística", "Previsão"], instructions: "Você é o Cientista de Dados. Construa modelos preditivos e identifique padrões nos dados." },
  // RH / Pessoas
  { title: "Head de RH", emoji: "👥", department: "RH", category: "RH", skills: ["Cultura", "Recrutamento", "Desenvolvimento"], instructions: "Você é o Head de RH. Gerencie cultura, recrutamento e desenvolvimento de pessoas." },
  { title: "Gerente de RH", emoji: "🧑‍💼", department: "RH", category: "RH", skills: ["Onboarding", "Retenção", "Performance"], instructions: "Você é o Gerente de RH. Coordene processos de onboarding, avaliações e bem-estar da equipe." },
  { title: "Analista de RH", emoji: "📋", department: "RH", category: "RH", skills: ["Recrutamento", "Benefícios", "Treinamento"], instructions: "Você é o Analista de RH. Apoie processos de seleção, integração e treinamento de colaboradores." },
  // Produto / UX
  { title: "Head de Produto", emoji: "🧩", department: "Produto", category: "Produto", skills: ["Roadmap", "OKRs", "Discovery"], instructions: "Você é o Head de Produto. Defina roadmap, priorize features e alinhe produto com negócio." },
  { title: "Product Manager", emoji: "📌", department: "Produto", category: "Produto", skills: ["Backlog", "Stakeholders", "Métricas"], instructions: "Você é o PM. Gerencie backlog, coordene desenvolvimento e meça impacto de features." },
  { title: "UX Designer", emoji: "🎨", department: "Design", category: "Produto", skills: ["UI/UX", "Wireframe", "Pesquisa"], instructions: "Você é o UX Designer. Crie interfaces centradas no usuário e otimize experiência de conversão." },
  { title: "Designer Gráfico", emoji: "🖌️", department: "Design", category: "Produto", skills: ["Identidade visual", "Criativos", "Branding"], instructions: "Você é o Designer Gráfico. Crie materiais visuais, criativos para Ads e mantenha consistência de marca." },
  // CS / Suporte
  { title: "Head de CS", emoji: "⭐", department: "Customer Success", category: "CS", skills: ["NPS", "Churn", "Health Score"], instructions: "Você é o Head de CS. Lidere estratégia de retenção, monitore NPS e aumente receita por cliente." },
  { title: "Gerente de CS", emoji: "🤝", department: "Customer Success", category: "CS", skills: ["Onboarding", "Expansão", "Satisfação"], instructions: "Você é o Gerente de CS. Garanta sucesso dos clientes, identifique churn risk e expanda contas." },
  { title: "Analista de CS", emoji: "💬", department: "Customer Success", category: "CS", skills: ["Suporte", "Follow-up", "Relatórios"], instructions: "Você é o Analista de CS. Atenda clientes, colete feedback e reporte health score da carteira." },
  // Financeiro / Jurídico
  { title: "Controller Financeiro", emoji: "📊", department: "Financeiro", category: "Financeiro", skills: ["Controle", "DRE", "Fluxo de Caixa"], instructions: "Você é o Controller. Monitore DRE, fluxo de caixa, custos e reporte ao CFO." },
  { title: "Analista Financeiro", emoji: "💰", department: "Financeiro", category: "Financeiro", skills: ["Budget", "Análise", "Previsão"], instructions: "Você é o Analista Financeiro. Controle orçamento, preveja receitas e identifique oportunidades de economia." },
  { title: "Analista Jurídico", emoji: "⚖️", department: "Jurídico", category: "Jurídico", skills: ["Contratos", "Compliance", "LGPD"], instructions: "Você é o Analista Jurídico. Revise contratos, garanta compliance e monitore obrigações legais." },
  // Tecnologia
  { title: "Dev Full Stack", emoji: "💻", department: "Tecnologia", category: "Tech", skills: ["Frontend", "Backend", "APIs"], instructions: "Você é o Dev Full Stack. Implemente features, integre APIs e otimize performance técnica." },
  { title: "Dev Front-end", emoji: "🖥️", department: "Tecnologia", category: "Tech", skills: ["React", "CSS", "Performance"], instructions: "Você é o Dev Front-end. Desenvolva interfaces, otimize Core Web Vitals e implemente UX." },
  { title: "Dev Back-end", emoji: "⚙️", department: "Tecnologia", category: "Tech", skills: ["APIs", "Banco de dados", "Segurança"], instructions: "Você é o Dev Back-end. Construa APIs, gerencie banco de dados e garanta segurança." },
  { title: "DevOps / Infra", emoji: "☁️", department: "Tecnologia", category: "Tech", skills: ["Cloud", "CI/CD", "Monitoramento"], instructions: "Você é o DevOps. Gerencie infraestrutura, automatize deploys e monitore uptime." },
  // Projetos
  { title: "Gerente de Projetos", emoji: "📋", department: "Projetos", category: "Gestão", skills: ["Scrum", "Cronograma", "Riscos"], instructions: "Você é o Gerente de Projetos. Organize sprints, monitore entregas e identifique bloqueios." },
  { title: "Scrum Master", emoji: "🔄", department: "Projetos", category: "Gestão", skills: ["Ágil", "Cerimônias", "Impedimentos"], instructions: "Você é o Scrum Master. Facilite cerimônias ágeis, remova impedimentos e aumente velocity." },
  { title: "Analista de PMO", emoji: "📐", department: "Projetos", category: "Gestão", skills: ["Portfólio", "Governança", "Relatórios"], instructions: "Você é o Analista de PMO. Monitore portfólio de projetos, garanta governança e reporte ao CPO." },
];

const ROLE_CATEGORIES = ["C-Suite", "Comercial", "Marketing", "SEO", "Analytics", "RH", "Produto", "CS", "Financeiro", "Tech", "Gestão"];

const ROLE_SUGGESTIONS_BY_DEPTH: Record<number, string[]> = {
  0: ["C-Suite", "Comercial", "Marketing", "SEO", "Analytics", "CS"],
  1: ["Marketing", "SEO", "Analytics", "Comercial", "Produto", "RH"],
  2: ["SEO", "Analytics", "Marketing", "CS", "Tech", "Gestão"],
};

/* ─── Types ────────────────────────────────────────────────── */
interface AgentNodeData {
  roleId: string;
  title: string;
  emoji: string;
  department: string;
  status: "idle" | "waiting" | "running" | "success" | "error" | "vacation";
  result?: string;
  onDelete?: (id: string) => void;
  onPromote?: (id: string) => void;
  onDemote?: (id: string) => void;
  onVacation?: (id: string) => void;
  onClick?: (id: string) => void;
  isEditable?: boolean;
  isOnVacation?: boolean;
  isActiveSpotlight?: boolean;
}

interface ConvoMessage {
  id: string;
  fromId: string;
  fromEmoji: string;
  fromTitle: string;
  toId?: string;
  toEmoji?: string;
  toTitle?: string;
  content: string;
  type: "message" | "report" | "error";
  ts: number;
}

/* ─── Live Convo Dialog ─────────────────────────────────────── */
interface LiveConvoEntry {
  fromEmoji: string;
  fromTitle: string;
  toEmoji?: string;
  toTitle?: string;
  text: string;
  ts: number;
  type: "work" | "report" | "question";
}

const WORK_PHRASES: Record<string, string[]> = {
  seo: [
    "Analisando posições orgânicas para palavras-chave de cauda longa…",
    "Identificamos oportunidade de melhoria em CTR para query com posição média 6.2",
    "Auditoria técnica detectou 3 páginas com conteúdo duplicado",
    "Schema markup ausente em 12 páginas de produto — prioridade alta",
    "Backlink profile: 2 novos domínios autoritativos linkando esta semana",
  ],
  analytics: [
    "Bounce rate aumentou 8% — correlacionado com mudança de layout mobile",
    "Funil de conversão: queda de 22% na etapa de checkout",
    "Sessões orgânicas cresceram 15% vs. semana anterior",
    "Evento de compra disparando corretamente em 97% das conversões",
    "Segmento de usuários recorrentes com LTV 3x maior que novos",
  ],
  marketing: [
    "Campanha Google Ads: ROAS atual 4.2x — meta é 5x",
    "Email open rate: 24% acima da média do setor",
    "A/B test em landing page mostrando variante B com +18% de conversão",
    "CPL do Meta Ads caiu 12% após ajuste de segmentação",
    "Funil de nurturing: 340 leads qualificados aguardando follow-up",
  ],
  comercial: [
    "Pipeline atualizado: 18 oportunidades em negociação ativa",
    "Demo agendada com cliente enterprise — potencial R$8k/mês",
    "3 propostas enviadas hoje, follow-up programado para amanhã",
    "Taxa de fechamento este mês: 31% vs. meta de 25%",
    "Churn alert: cliente Acme Corp sinalizou insatisfação",
  ],
  default: [
    "Relatório de performance concluído — aguardando revisão",
    "Identificamos 3 oportunidades de melhoria de alta prioridade",
    "Dados consolidados e prontos para apresentação ao CEO",
    "Plano de ação atualizado com base nos resultados da semana",
    "Reunião de alinhamento com equipe concluída — próximos passos definidos",
  ],
};

function getWorkPhrase(role: any): string {
  const t = (role.title || "").toLowerCase();
  const d = (role.department || "").toLowerCase();
  if (t.includes("seo") || d.includes("seo")) return WORK_PHRASES.seo[Math.floor(Math.random() * WORK_PHRASES.seo.length)];
  if (t.includes("analytics") || d.includes("analytics") || d.includes("dado")) return WORK_PHRASES.analytics[Math.floor(Math.random() * WORK_PHRASES.analytics.length)];
  if (t.includes("marketing") || d.includes("marketing") || t.includes("ads")) return WORK_PHRASES.marketing[Math.floor(Math.random() * WORK_PHRASES.marketing.length)];
  if (t.includes("comercial") || t.includes("sdr") || t.includes("bdr") || t.includes("closer")) return WORK_PHRASES.comercial[Math.floor(Math.random() * WORK_PHRASES.comercial.length)];
  return WORK_PHRASES.default[Math.floor(Math.random() * WORK_PHRASES.default.length)];
}

const PM_REPORT_PHRASES = [
  "📊 Status do projeto: {n} tarefas em andamento, {s} concluídas esta semana. Taxa de progresso: {p}% no prazo.",
  "📋 Update do projeto: equipe operando com {n} frentes ativas. Próximas entregas: relatório SEO e ajustes de campanhas.",
  "⏱️ Check-in de 30min: todos os agentes responderam. Destaque positivo: analytics detectou aumento de 15% em conversões orgânicas.",
  "🚦 Report de status: sem bloqueios críticos. {n} ações previstas para as próximas 4h. Equipe 100% operacional.",
];

function getPmReport(totalAgents: number): string {
  const phrase = PM_REPORT_PHRASES[Math.floor(Math.random() * PM_REPORT_PHRASES.length)];
  return phrase
    .replace("{n}", String(Math.floor(totalAgents * 1.5)))
    .replace("{s}", String(Math.floor(totalAgents * 0.8)))
    .replace("{p}", String(Math.floor(72 + Math.random() * 20)));
}

/* ─── Status helpers ───────────────────────────────────────── */
const STATUS_RING: Record<string, string> = {
  idle: "border-border",
  waiting: "border-amber-400/60 animate-pulse",
  running: "border-blue-400 shadow-blue-400/40 shadow-lg",
  success: "border-emerald-500 shadow-emerald-500/30 shadow-md",
  error: "border-destructive shadow-destructive/30 shadow-md",
  vacation: "border-orange-400/60",
};

const STATUS_DOT: Record<string, string> = {
  idle: "bg-muted-foreground/40",
  waiting: "bg-amber-400 animate-pulse",
  running: "bg-blue-400",
  success: "bg-emerald-500",
  error: "bg-destructive",
  vacation: "bg-orange-400",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "standby",
  waiting: "aguardando…",
  running: "analisando…",
  success: "✓ concluído",
  error: "✗ falhou",
  vacation: "🌴 férias",
};

// Dynamic action labels per role type (shown while running)
function getRunningActionLabel(title: string, department: string): string {
  const t = title.toLowerCase();
  const d = department.toLowerCase();
  if (t.includes("analista") || t.includes("analyst")) {
    if (d.includes("seo")) return "🔍 auditando SEO…";
    if (d.includes("dado") || d.includes("data")) return "📊 processando dados…";
    if (d.includes("marketing")) return "📈 analisando campanhas…";
    return "🔎 analisando…";
  }
  if (t.includes("gerente") || t.includes("manager")) {
    if (d.includes("seo")) return "📋 definindo estratégia…";
    if (d.includes("marketing")) return "🎯 planejando campanha…";
    return "📋 coordenando equipe…";
  }
  if (t.includes("estrategista") || t.includes("content")) return "✍️ criando pauta…";
  if (t.includes("ceo") || t.includes("diretor")) return "🧠 consolidando…";
  if (t.includes("cto") || t.includes("tech") || t.includes("dev")) return "⚙️ implementando…";
  if (t.includes("sdr") || t.includes("bdr") || t.includes("closer")) return "📞 prospectando…";
  if (t.includes("cro") || t.includes("conversão")) return "🧪 testando…";
  if (t.includes("link") || t.includes("outreach")) return "🔗 conquistando links…";
  if (t.includes("social") || t.includes("mídia")) return "📱 criando conteúdo…";
  if (t.includes("ads") || t.includes("mídia paga")) return "💰 otimizando anúncios…";
  return "⚡ executando…";
}

const STATUS_LABEL_COLOR: Record<string, string> = {
  idle: "text-muted-foreground",
  waiting: "text-amber-400",
  running: "text-blue-400",
  success: "text-emerald-400",
  error: "text-destructive",
  vacation: "text-orange-400",
};

/* ─── Deletable Edge ───────────────────────────────────────── */
function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  style, markerEnd, label, labelStyle, labelBgStyle, data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd as any} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan group"
        >
          {label ? (
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-card border border-border/80 text-emerald-400 shadow-sm">
              {label as string}
            </span>
          ) : (
            <button
              onClick={() => (data as any)?.onDelete?.(id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:scale-110"
              title="Remover conexão"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

/* ─── Agent Node ───────────────────────────────────────────── */
const AgentNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as AgentNodeData;
  const [hovered, setHovered] = useState(false);
  const status = d.isOnVacation ? "vacation" : (d.status || "idle");
  const isRunning = status === "running";
  const isSpotlight = d.isActiveSpotlight && !isRunning;
  const dynamicLabel = isSpotlight
    ? "💬 em atividade…"
    : isRunning
    ? getRunningActionLabel(d.title, d.department)
    : STATUS_LABEL[status];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => d.onClick?.(d.roleId)}
      style={isRunning || isSpotlight ? {
        background: isSpotlight
          ? "linear-gradient(var(--agent-border-angle, 0deg), #2563eb, #3b82f6, #60a5fa, #2563eb)"
          : "linear-gradient(var(--agent-border-angle, 0deg), #3b82f6, #06b6d4, #8b5cf6, #3b82f6)",
        animation: "agent-border-spin 2s linear infinite",
        padding: "2px",
        borderRadius: "16px",
      } : undefined}
      className={cn(
        "relative cursor-pointer active:cursor-grabbing transition-all duration-300",
        !isRunning && !isSpotlight && "p-[2px] rounded-2xl",
        !isRunning && !isSpotlight && STATUS_RING[status] + " border-2 bg-card",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        status === "vacation" && "opacity-75",
        isSpotlight && "scale-110 z-10",
      )}
    >
      {/* Animated glow for running/spotlight */}
      {(isRunning || isSpotlight) && (
        <div
          className="absolute inset-0 opacity-40 blur-xl pointer-events-none"
          style={{
            background: isSpotlight
              ? "linear-gradient(var(--agent-border-angle, 0deg), #2563eb, #3b82f6, #60a5fa)"
              : "linear-gradient(var(--agent-border-angle, 0deg), #3b82f6, #06b6d4, #8b5cf6)",
            animation: "agent-border-spin 2s linear infinite",
            borderRadius: "16px",
          }}
        />
      )}

      {/* Inner card */}
      <div className={cn(
        "relative flex flex-col items-center gap-2 px-3 py-3 rounded-[14px] bg-card min-w-[120px] max-w-[140px]",
        isSpotlight && "bg-blue-950/60",
      )}>
        {/* Action buttons on hover */}
        {hovered && d.isEditable && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg z-20 whitespace-nowrap">
            {d.onPromote && (
              <button
                onClick={(e) => { e.stopPropagation(); d.onPromote!(d.roleId); }}
                className="h-5 w-5 rounded-full bg-amber-500/80 text-white flex items-center justify-center hover:bg-amber-500 transition-colors"
                title="Promover"
              >
                <TrendingUp className="h-2.5 w-2.5" />
              </button>
            )}
            {d.onDemote && (
              <button
                onClick={(e) => { e.stopPropagation(); d.onDemote!(d.roleId); }}
                className="h-5 w-5 rounded-full bg-blue-500/80 text-white flex items-center justify-center hover:bg-blue-500 transition-colors"
                title="Regredir"
              >
                <TrendingDown className="h-2.5 w-2.5" />
              </button>
            )}
            {d.onVacation && (
              <button
                onClick={(e) => { e.stopPropagation(); d.onVacation!(d.roleId); }}
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                  d.isOnVacation
                    ? "bg-emerald-500/80 hover:bg-emerald-500 text-white"
                    : "bg-orange-400/80 hover:bg-orange-400 text-white"
                )}
                title={d.isOnVacation ? "Retornar de férias" : "Colocar em férias"}
              >
                <PalmtreeIcon className="h-2.5 w-2.5" />
              </button>
            )}
            {d.onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); d.onDelete!(d.roleId); }}
                className="h-5 w-5 rounded-full bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive transition-colors"
                title="Demitir"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}

        {/* Hierarchical handles */}
        <Handle type="target" position={Position.Top} id="top-target" className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background" isConnectable={true} />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-3 !h-3 !bg-primary/70 !border-2 !border-background" isConnectable={true} />

        {/* Avatar */}
        <div className={cn(
          "relative h-12 w-12 rounded-full border-2 flex items-center justify-center text-2xl transition-all duration-300 bg-card",
          isRunning ? "border-blue-400/60" : isSpotlight ? "border-blue-400" : STATUS_RING[status],
        )}>
          {status === "vacation" ? "🌴" : d.emoji}
          <span className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background transition-colors",
            isSpotlight ? "bg-blue-400 animate-pulse" : STATUS_DOT[status],
          )} />
          {isRunning && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-blue-500/10">
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            </div>
          )}
          {isSpotlight && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-blue-500/10">
              <MessageSquare className="h-3 w-3 text-blue-300 animate-pulse" />
            </div>
          )}
        </div>

        {/* Name & Status */}
        <div className="text-center space-y-0.5">
          <p className="text-[10px] font-bold leading-tight line-clamp-2">{d.title}</p>
          <p className="text-[8px] text-muted-foreground">{d.department}</p>
          <p className={cn(
            "text-[9px] font-semibold transition-all duration-300",
            isSpotlight ? "text-blue-400 animate-pulse" : STATUS_LABEL_COLOR[status],
            (isRunning || isSpotlight) && "animate-pulse",
          )}>{dynamicLabel}</p>
        </div>

        {d.result && status === "success" && !isSpotlight && (
          <div className="w-full mt-1 px-1.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[7px] text-emerald-400 line-clamp-3 leading-relaxed">{d.result}</p>
          </div>
        )}
        {d.result && status === "error" && (
          <div className="w-full mt-1 px-1.5 py-1 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-[7px] text-destructive line-clamp-2">{d.result.slice(0, 80)}</p>
          </div>
        )}
      </div>
    </div>
  );
});
AgentNode.displayName = "AgentNode";

const nodeTypes = { agentNode: AgentNode };
const edgeTypes = { deletable: DeletableEdge };

/* ─── Employee Profile Dialog ─────────────────────────────── */
interface EmployeeProfileDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: any;
  agentResult?: any;
  runs: any[];
  hierarchy: Record<string, string>;
  allRoles: any[];
  onFire: (id: string) => void;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  onVacation: (id: string) => void;
  onEdit: (id: string, patch: Partial<{ title: string; emoji: string; department: string; instructions: string; memory: string; whatsapp: string }>) => Promise<void>;
  isOnVacation?: boolean;
  lastRunSummary?: string;
}

function EmployeeProfileDialog({
  open, onOpenChange, role, agentResult, runs, hierarchy, allRoles,
  onFire, onPromote, onDemote, onVacation, onEdit, isOnVacation, lastRunSummary,
}: EmployeeProfileDialogProps) {
  const [editTitle, setEditTitle] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editMemory, setEditMemory] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);

  useEffect(() => {
    if (role && open) {
      setEditTitle(role.title || "");
      setEditEmoji(role.emoji || "🤖");
      setEditDept(role.department || "");
      setEditInstructions(role.instructions || "");
      setEditMemory(role.memory || "");
      setEditWhatsapp(role.whatsapp || "");
    }
  }, [role, open]);

  if (!role) return null;

  const parentId = hierarchy[role.id];
  const parentRole = parentId ? allRoles.find((r: any) => r.id === parentId) : null;
  const directReports = allRoles.filter((r: any) => hierarchy[r.id] === role.id);

  const history = runs
    .map(run => {
      const ar = ((run.agent_results as any[]) || []).find((r: any) => r.role_id === role.id);
      return ar ? { run, ar } : null;
    })
    .filter(Boolean)
    .slice(0, 10);

  const successRate = history.length > 0
    ? Math.round(history.filter((h: any) => h?.ar.status === "success").length / history.length * 100)
    : 0;

  const catalogRole = ROLE_CATALOG.find(c => c.title === role.title);
  const skills: string[] = catalogRole?.skills || (Array.isArray(role.skills) ? role.skills : []);

  const isCeo = !hierarchy[role.id];

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await onEdit(role.id, {
        title: editTitle,
        emoji: editEmoji,
        department: editDept,
        instructions: editInstructions,
        memory: editMemory,
        whatsapp: editWhatsapp,
      });
      toast.success("Agente atualizado com sucesso!");
    } finally {
      setSaving(false);
    }
  };

  const handleSendWhatsAppNow = async () => {
    if (!editWhatsapp) { toast.error("Configure o número WhatsApp primeiro e salve."); return; }
    if (!lastRunSummary) { toast.error("Nenhum relatório disponível. Execute a equipe primeiro."); return; }
    setSendingWa(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.functions.invoke("send-workflow-notification", {
        body: {
          workflow_name: `${role.emoji} ${role.title} — Relatório Executivo`,
          report: lastRunSummary,
          recipient_name: editTitle,
          direct_send: {
            phones: [editWhatsapp],
          },
        },
      });
      if (error) throw error;
      toast.success(`✅ Relatório enviado para ${editWhatsapp} via WhatsApp!`);
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`);
    } finally {
      setSendingWa(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-4">
            <div className={cn(
              "h-16 w-16 rounded-2xl border-2 flex items-center justify-center text-3xl bg-card shrink-0",
              isOnVacation ? "border-orange-400" : "border-primary/30",
            )}>
              {isOnVacation ? "🌴" : role.emoji}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                {role.title}
                {isOnVacation && <Badge variant="outline" className="text-orange-400 border-orange-400/40 text-[10px]">🌴 Férias</Badge>}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{role.department}</p>
              {parentRole && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reporta a: <span className="font-semibold text-foreground">{parentRole.emoji} {parentRole.title}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => { onPromote(role.id); onOpenChange(false); }}>
                <TrendingUp className="h-3 w-3" /> Promover
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                onClick={() => { onDemote(role.id); onOpenChange(false); }}>
                <TrendingDown className="h-3 w-3" /> Regredir
              </Button>
              <Button size="sm" variant="outline"
                className={cn("h-7 text-[10px] gap-1.5", isOnVacation
                  ? "text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"
                  : "text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                )}
                onClick={() => { onVacation(role.id); onOpenChange(false); }}>
                <PalmtreeIcon className="h-3 w-3" />
                {isOnVacation ? "Retornar" : "Férias"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { onFire(role.id); onOpenChange(false); }}>
                <Trash2 className="h-3 w-3" /> Demitir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="h-8 bg-muted/30 shrink-0">
            <TabsTrigger value="profile" className="text-[11px]">👤 Perfil</TabsTrigger>
            <TabsTrigger value="edit" className="text-[11px]">✏️ Editar</TabsTrigger>
            <TabsTrigger value="memory" className="text-[11px]">🧠 Memória</TabsTrigger>
            <TabsTrigger value="history" className="text-[11px]">📋 Histórico</TabsTrigger>
            <TabsTrigger value="team" className="text-[11px]">👥 Equipe</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Profile Tab */}
            <TabsContent value="profile" className="p-4 space-y-4 mt-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-card/50 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{history.length}</p>
                  <p className="text-[10px] text-muted-foreground">Execuções</p>
                </div>
                <div className="rounded-lg border border-border bg-card/50 p-3 text-center">
                  <p className={cn("text-2xl font-bold", successRate >= 70 ? "text-emerald-400" : successRate >= 40 ? "text-amber-400" : "text-destructive")}>
                    {successRate}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Taxa de sucesso</p>
                </div>
                <div className="rounded-lg border border-border bg-card/50 p-3 text-center">
                  <p className="text-2xl font-bold">{directReports.length}</p>
                  <p className="text-[10px] text-muted-foreground">Subordinados</p>
                </div>
              </div>
              {skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Brain className="h-3 w-3" /> Competências
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="text-[10px] gap-1">
                        <Star className="h-2 w-2 text-amber-400" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {agentResult?.result && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Último relatório
                  </p>
                  <div className={cn(
                    "rounded-lg border p-3 text-xs leading-relaxed whitespace-pre-wrap",
                    agentResult.status === "success"
                      ? "bg-emerald-500/5 border-emerald-500/20 text-foreground/80"
                      : "bg-destructive/5 border-destructive/20 text-destructive/80"
                  )}>
                    {String(agentResult.result).slice(0, 600)}
                    {String(agentResult.result).length > 600 && "…"}
                  </div>
                </div>
              )}
              {/* WhatsApp configurado — card no perfil */}
              {role.whatsapp && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-emerald-400">WhatsApp configurado</p>
                    <p className="text-[10px] text-muted-foreground truncate">{role.whatsapp}</p>
                  </div>
                  {lastRunSummary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1.5 shrink-0 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                      onClick={handleSendWhatsAppNow}
                      disabled={sendingWa}
                    >
                      {sendingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Enviar relatório
                    </Button>
                  )}
                </div>
              )}
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Departamento:</span> {role.department}
                </p>
                {parentRole && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-semibold text-foreground">Hierarquia:</span>{" "}
                    {parentRole.emoji} {parentRole.title} → {role.emoji} {role.title}
                    {Array.isArray(directReports) && directReports.length > 0 && ` → ${directReports.map((r: any) => `${r.emoji} ${r.title}`).join(", ")}`}
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Edit Tab */}
            <TabsContent value="edit" className="p-4 space-y-4 mt-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" /> Editar Agente
              </p>
              <div className="flex gap-2">
                <div className="w-16 shrink-0">
                  <label className="text-[10px] text-muted-foreground block mb-1">Emoji</label>
                  <Input value={editEmoji} onChange={e => setEditEmoji(e.target.value)} className="text-center text-lg h-9" placeholder="🤖" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground block mb-1">Cargo / Título</label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Ex: SDR, Closer, Analista…" className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Departamento</label>
                <Input value={editDept} onChange={e => setEditDept(e.target.value)} placeholder="Ex: Comercial, Marketing, SEO…" className="h-9 text-sm" />
              </div>

              {/* WhatsApp section — destaque para CEO */}
              <div className={cn("rounded-xl border p-3 space-y-2", isCeo ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20")}>
                <div className="flex items-center gap-2">
                  <Smartphone className={cn("h-3.5 w-3.5 shrink-0", isCeo ? "text-emerald-400" : "text-muted-foreground")} />
                  <div>
                    <label className={cn("text-[10px] font-semibold block", isCeo ? "text-emerald-400" : "text-foreground")}>
                      {isCeo ? "📲 WhatsApp do CEO — Receber reports" : "WhatsApp (opcional)"}
                    </label>
                    {isCeo && (
                      <p className="text-[9px] text-muted-foreground/70">
                        Configure aqui para receber automaticamente o relatório executivo após cada execução da equipe.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={editWhatsapp}
                    onChange={e => setEditWhatsapp(e.target.value)}
                    placeholder="+5511999999999"
                    className="h-8 text-sm flex-1"
                  />
                  {lastRunSummary && editWhatsapp && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] gap-1.5 shrink-0 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                      onClick={handleSendWhatsAppNow}
                      disabled={sendingWa}
                    >
                      {sendingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Enviar agora
                    </Button>
                  )}
                </div>
                {editWhatsapp && (
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <CheckCheck className="h-3 w-3 text-emerald-400" />
                    Número configurado — será notificado após cada execução
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Instruções do Agente</label>
                <p className="text-[9px] text-muted-foreground/60 mb-1.5">Define o papel, objetivos e como o agente deve agir em cada execução.</p>
                <Textarea
                  value={editInstructions}
                  onChange={e => setEditInstructions(e.target.value)}
                  placeholder="Você é o SDR da equipe. Sua missão é prospectar leads, qualificar pelo critério BANT e passar para o Closer…"
                  className="text-xs min-h-[120px] resize-none"
                />
              </div>
              <Button onClick={handleSaveEdit} disabled={saving} className="w-full h-9 gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
                Salvar Alterações
              </Button>
            </TabsContent>

            {/* Memory Tab */}
            <TabsContent value="memory" className="p-4 space-y-4 mt-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Brain className="h-3 w-3 text-primary" /> Memória &amp; Contexto Evolutivo
                  </p>
                  <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                    Este contexto é injetado nas próximas execuções do agente, permitindo que ele evolua com o tempo.
                  </p>
                </div>
                {history.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1.5 shrink-0"
                    onClick={() => {
                      const accumulated = history
                        .filter((h: any) => h?.ar.status === "success")
                        .map((h: any) => `[${new Date(h.run.started_at).toLocaleDateString("pt-BR")}] ${String(h.ar.result || "").slice(0, 200)}`)
                        .join("\n\n");
                      setEditMemory(prev => prev ? `${prev}\n\n--- Importado ---\n${accumulated}` : accumulated);
                      toast.success("Histórico importado para memória");
                    }}
                  >
                    <History className="h-2.5 w-2.5" /> Importar do histórico
                  </Button>
                )}
              </div>
              <Textarea
                value={editMemory}
                onChange={e => setEditMemory(e.target.value)}
                placeholder="Ex: Em 15/02 identificamos que o ICP são empresas SaaS B2B com 50-200 funcionários. Os melhores horários para cold call são 10h e 16h. Taxa de resposta por email: 12%…"
                className="text-xs min-h-[180px] resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] text-muted-foreground">{editMemory.length} caracteres de contexto</p>
                <Button onClick={handleSaveEdit} disabled={saving} size="sm" className="h-8 gap-2 text-xs">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                  Salvar Memória
                </Button>
              </div>
              {role.memory && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[10px] font-semibold text-primary mb-1.5 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Memória ativa</p>
                  <p className="text-[10px] text-foreground/70 leading-relaxed whitespace-pre-wrap line-clamp-4">{String(role.memory).slice(0, 300)}{String(role.memory).length > 300 && "…"}</p>
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="p-4 space-y-3 mt-0">
              {history.length === 0 ? (
                <div className="py-10 text-center">
                  <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">Nenhuma execução registrada ainda.</p>
                </div>
              ) : (
                history.map((h: any, i) => (
                  <div key={i} className={cn(
                    "rounded-lg border p-3 space-y-1.5",
                    h.ar.status === "success" ? "border-emerald-500/20 bg-emerald-500/5" : "border-destructive/20 bg-destructive/5"
                  )}>
                    <div className="flex items-center gap-2">
                      {h.ar.status === "success"
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      }
                      <span className="text-[10px] font-semibold">{new Date(h.run.started_at).toLocaleString("pt-BR")}</span>
                      {h.run.completed_at && (
                        <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {Math.round((new Date(h.run.completed_at).getTime() - new Date(h.run.started_at).getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-foreground/70 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                      {String(h.ar.result || "").slice(0, 300)}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="p-4 space-y-4 mt-0">
              {parentRole && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reporta para</p>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                    <span className="text-2xl">{parentRole.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold">{parentRole.title}</p>
                      <p className="text-xs text-muted-foreground">{parentRole.department}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-[9px]">Superior</Badge>
                  </div>
                </div>
              )}
              {directReports.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Subordinados Diretos</p>
                  <div className="space-y-2">
                    {directReports.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                        <span className="text-xl">{r.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum subordinado direto.</p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Hire Dialog ──────────────────────────────────────────── */
interface HireDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parentRole: any;
  parentDepth: number;
  onHire: (roleData: { title: string; emoji: string; department: string; instructions: string; skills: string[] }, parentId: string) => Promise<void>;
}

function HireDialog({ open, onOpenChange, parentRole, parentDepth, onHire }: HireDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customEmoji, setCustomEmoji] = useState("🤖");
  const [customDept, setCustomDept] = useState("Geral");
  const [customInstructions, setCustomInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestedCategories = ROLE_SUGGESTIONS_BY_DEPTH[Math.min(parentDepth + 1, 2)] || ROLE_SUGGESTIONS_BY_DEPTH[2];

  const filtered = ROLE_CATALOG.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.department.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || r.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleConfirm = async () => {
    if (!parentRole) return;
    const roleData = customMode
      ? { title: customTitle, emoji: customEmoji, department: customDept, instructions: customInstructions, skills: [] }
      : { ...selected, skills: selected?.skills || [] };
    if (!roleData?.title) { toast.error("Selecione ou crie um cargo"); return; }
    setLoading(true);
    try {
      await onHire(roleData, parentRole.id);
      onOpenChange(false);
      setSelected(null);
      setCustomMode(false);
      setSearch("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Contratar Novo Membro
          </DialogTitle>
          {parentRole && (
            <DialogDescription>
              Reportará a: <span className="font-semibold text-foreground">{parentRole.emoji} {parentRole.title}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        {!customMode ? (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cargo…"
              className="shrink-0 h-8 text-sm"
            />

            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                  !selectedCategory ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card/50 text-muted-foreground hover:border-primary/50"
                )}
              >
                Todos
              </button>
              {ROLE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                    selectedCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card/50 text-muted-foreground hover:border-primary/50",
                    suggestedCategories.includes(cat) && !selectedCategory && "border-primary/40 text-primary"
                  )}
                >
                  {cat}
                  {suggestedCategories.includes(cat) && !selectedCategory && " ✨"}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 gap-2 pr-2">
                {filtered.map((r) => (
                  <button
                    key={r.title}
                    onClick={() => setSelected(selected?.title === r.title ? null : r)}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all hover:border-primary/50",
                      selected?.title === r.title
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card/60"
                    )}
                  >
                    <span className="text-xl shrink-0">{r.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold leading-tight truncate">{r.title}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{r.department}</p>
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {r.skills.slice(0, 2).map(s => (
                          <span key={s} className="text-[8px] bg-muted/50 rounded px-1">{s}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <button
              onClick={() => setCustomMode(true)}
              className="text-xs text-primary hover:underline shrink-0 text-center"
            >
              + Criar cargo personalizado
            </button>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Cargo personalizado</p>
            <div className="flex gap-2">
              <Input value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} className="w-16 text-center text-lg" placeholder="🤖" />
              <Input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Título do cargo" className="flex-1" />
            </div>
            <Input value={customDept} onChange={e => setCustomDept(e.target.value)} placeholder="Departamento" />
            <Textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="Instruções para o agente…"
              className="text-xs"
              rows={4}
            />
            <button onClick={() => setCustomMode(false)} className="text-xs text-muted-foreground hover:underline">
              ← Voltar para catálogo
            </button>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">Cancelar</Button>
          <Button onClick={handleConfirm} size="sm" disabled={loading || (!customMode && !selected)}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
            Contratar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Live Conversation Dialog ──────────────────────────────── */
interface LiveConvoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeRole: any | null;
  targetRole: any | null;
  entries: LiveConvoEntry[];
  isWorking: boolean;
}

function LiveConvoDialog({ open, onOpenChange, activeRole, targetRole, entries, isWorking }: LiveConvoDialogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (!activeRole) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[75vh] flex flex-col p-0 overflow-hidden border-blue-500/30 bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-blue-500/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="text-2xl">{activeRole.emoji}</span>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-blue-400 border border-background animate-pulse" />
            </div>
            {targetRole && (
              <>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <div className="h-px w-6 bg-blue-400/40" />
                  <MessageSquare className="h-3 w-3 text-blue-400" />
                  <div className="h-px w-6 bg-blue-400/40" />
                </div>
                <span className="text-2xl">{targetRole.emoji}</span>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate">
              {activeRole.title}
              {targetRole && <span className="text-blue-400 font-normal"> → {targetRole.title}</span>}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-[9px] text-blue-400 font-semibold">{isWorking ? "em atividade agora" : "standby"}</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0">
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div ref={scrollRef as any} className="p-4 space-y-3">
            {entries.length === 0 && (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-400/30 animate-spin" />
                <p className="text-xs text-muted-foreground">Iniciando atividade…</p>
              </div>
            )}
            {entries.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2.5 animate-fade-in",
                  entry.type === "report" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div className="text-xl shrink-0 mt-0.5">{entry.fromEmoji}</div>
                <div className={cn(
                  "flex-1 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed",
                  entry.type === "report"
                    ? "bg-primary/10 border border-primary/20 text-right"
                    : entry.type === "question"
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "bg-muted/40 border border-border",
                )}>
                  <p className="font-bold text-[9px] text-muted-foreground mb-1">{entry.fromTitle}{entry.toTitle && ` → ${entry.toTitle}`}</p>
                  <p className="text-foreground/90">{entry.text}</p>
                </div>
              </div>
            ))}
            {isWorking && (
              <div className="flex gap-2.5">
                <div className="text-xl shrink-0">{activeRole.emoji}</div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


function ReorganizeButton({ roles, hierarchy, agentResults, lastRun, setNodes, vacations }: {
  roles: any[];
  hierarchy: Record<string, string>;
  agentResults: Record<string, any>;
  lastRun: any;
  setNodes: (nodes: any[]) => void;
  vacations: Set<string>;
}) {
  const { fitView } = useReactFlow();
  const handleReorganize = useCallback(() => {
    const { rfNodes } = buildNodesAndEdges(roles, hierarchy, agentResults, lastRun, undefined, undefined, undefined, undefined, vacations);
    setNodes(rfNodes);
    setTimeout(() => fitView({ padding: 0.3, duration: 500 }), 50);
  }, [roles, hierarchy, agentResults, lastRun, setNodes, fitView, vacations]);

  return (
    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 px-2.5 bg-card/90 backdrop-blur-sm" onClick={handleReorganize}>
      <LayoutDashboard className="h-3 w-3" /> Reorganizar
    </Button>
  );
}

/* ─── Layout builder ───────────────────────────────────────── */
const H_GAP = 210;
const V_GAP = 170;

/** Proper hierarchical tree layout — children always below their own parent, no crossings */
function computeTreePositions(roles: any[], hierarchy: Record<string, string>): Map<string, { x: number; y: number }> {
  // Build children map
  const childrenMap = new Map<string, string[]>();
  const rootId = roles.find(r => r.id === "ceo")?.id || roles[0]?.id;

  roles.forEach(r => {
    if (r.id === rootId) return;
    const parentId = hierarchy[r.id] || rootId;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(r.id);
  });

  const positions = new Map<string, { x: number; y: number }>();

  // Recursive subtree width (each leaf = 1 unit of H_GAP)
  function subtreeWidth(nodeId: string): number {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return H_GAP;
    return children.reduce((sum, c) => sum + subtreeWidth(c), 0);
  }

  // Position node and its subtree; cx = center x of this subtree
  function positionSubtree(nodeId: string, cx: number, y: number) {
    positions.set(nodeId, { x: cx - 90, y }); // -90 to center the 180px-wide card
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    const totalW = children.reduce((sum, c) => sum + subtreeWidth(c), 0);
    let offsetX = cx - totalW / 2;

    children.forEach(childId => {
      const cw = subtreeWidth(childId);
      positionSubtree(childId, offsetX + cw / 2, y + V_GAP);
      offsetX += cw;
    });
  }

  if (rootId) positionSubtree(rootId, 0, 0);

  // Any disconnected nodes get placed below
  roles.forEach((r, i) => {
    if (!positions.has(r.id)) {
      positions.set(r.id, { x: i * H_GAP - (roles.length * H_GAP) / 2, y: 600 });
    }
  });

  return positions;
}

function buildNodesAndEdges(
  roles: any[],
  hierarchy: Record<string, string>,
  agentResults: Record<string, any>,
  lastRun: any,
  onDeleteNode?: (id: string) => void,
  onPromoteNode?: (id: string) => void,
  onDemoteNode?: (id: string) => void,
  onVacationNode?: (id: string) => void,
  vacations: Set<string> = new Set(),
  onClickNode?: (id: string) => void,
  onDeleteEdge?: (id: string) => void,
) {
  const getDepth = (id: string, d = 0): number => {
    if (id === "ceo" || d > 8) return d;
    const p = hierarchy[id];
    return p ? getDepth(p, d + 1) : d;
  };

  const nodePositions = computeTreePositions(roles, hierarchy);

  const getStatus = (roleId: string): AgentNodeData["status"] => {
    if (vacations.has(roleId)) return "vacation";
    if (!lastRun) return "idle";
    const ar = agentResults[roleId];
    if (!ar) return lastRun.status === "running" ? "waiting" : "idle";
    if (ar.status === "success") return "success";
    if (ar.status === "error") return "error";
    return "running";
  };

  const rfNodes = roles.map(r => {
    const isCeo = r.id === "ceo" || getDepth(r.id) === 0;
    return {
      id: r.id,
      type: "agentNode",
      position: nodePositions.get(r.id) || { x: 0, y: 0 },
      data: {
        roleId: r.id,
        title: r.title,
        emoji: r.emoji,
        department: r.department || "",
        status: getStatus(r.id),
        isOnVacation: vacations.has(r.id),
        result: agentResults[r.id]?.result ? String(agentResults[r.id].result).slice(0, 120) : undefined,
        onDelete: !isCeo ? onDeleteNode : undefined,
        onPromote: !isCeo ? onPromoteNode : undefined,
        onDemote: !isCeo ? onDemoteNode : undefined,
        onVacation: !isCeo ? onVacationNode : undefined,
        onClick: onClickNode,
        isEditable: true,
      } as unknown as Record<string, unknown>,
      draggable: true,
    };
  });

  // Helper: determine the kind of communication flowing on each edge
  const getEdgeFlowLabel = (childRole: any, parentRole: any, childStatus: string, isRunning: boolean): string | undefined => {
    if (!parentRole) return undefined;
    const childT = (childRole.title || "").toLowerCase();
    const parentT = (parentRole.title || "").toLowerCase();
    if (childStatus === "success") {
      // Describe what was delivered
      if (childT.includes("analista") && parentT.includes("gerente")) return "📊 análise →";
      if (childT.includes("analista") && parentT.includes("estrategista")) return "📊 dados →";
      if (childT.includes("estrategista")) return "📋 pauta →";
      if (childT.includes("gerente") && (parentT.includes("ceo") || parentT.includes("diretor"))) return "📈 relatório →";
      if (childT.includes("sdr") || childT.includes("bdr")) return "🎯 leads →";
      if (childT.includes("closer")) return "💰 deals →";
      return "✓ entregue";
    }
    if (isRunning && childStatus === "running") {
      if (childT.includes("analista")) return "🔍 analisando";
      if (childT.includes("estrategista")) return "✍️ criando";
      if (childT.includes("gerente")) return "📋 coordenando";
      return "⚡ executando";
    }
    return undefined;
  };

  const rfEdges = roles
    .filter(r => r.id !== "ceo" && hierarchy[r.id])
    .map(r => {
      const parentId = hierarchy[r.id] || "ceo";
      const parentRole = roles.find((p: any) => p.id === parentId);
      const childStatus = getStatus(r.id);
      const isActive = childStatus === "running" || (lastRun?.status === "running" && childStatus !== "success");
      const isSuccess = childStatus === "success";
      const flowLabel = getEdgeFlowLabel(r, parentRole, childStatus, isActive);

      return {
        id: `e-${parentId}-${r.id}`,
        source: parentId,
        target: r.id,
        sourceHandle: "bottom-source",
        targetHandle: "top-target",
        animated: isActive || isSuccess,
        type: "deletable",
        data: { onDelete: onDeleteEdge },
        style: {
          stroke: isSuccess ? "hsl(142, 71%, 45%)" : isActive ? "hsl(217, 91%, 60%)" : "hsl(var(--border))",
          strokeWidth: isSuccess || isActive ? 2.5 : 1.5,
          strokeDasharray: isActive ? undefined : "4 3",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSuccess ? "hsl(142, 71%, 45%)" : isActive ? "hsl(217, 91%, 60%)" : "hsl(var(--muted-foreground))",
          width: 16, height: 16,
        },
        label: flowLabel,
        labelStyle: {
          fontSize: 8,
          fill: isSuccess ? "hsl(142, 71%, 45%)" : "hsl(217, 91%, 60%)",
          fontWeight: 600,
        },
        labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.9 },
      };
    });

  return { rfNodes, rfEdges };
}

/* ─── Message builder ──────────────────────────────────────── */
function buildMessages(depRuns: any[], roles: any[], hierarchy: Record<string, string>): ConvoMessage[] {
  const msgs: ConvoMessage[] = [];
  const lastRun = depRuns[0];
  if (!lastRun) return msgs;
  const roleMap = new Map(roles.map(r => [r.id, r]));
  const results: any[] = (lastRun.agent_results as any[]) || [];
  results.forEach((ar, i) => {
    const parentId = hierarchy[ar.role_id];
    const parent = parentId ? roleMap.get(parentId) : undefined;
    if (ar.status === "success" && ar.result) {
      msgs.push({ id: `m-${i}`, fromId: ar.role_id, fromEmoji: ar.emoji || "🤖", fromTitle: ar.role_title, toId: parentId, toEmoji: parent?.emoji, toTitle: parent?.title, content: String(ar.result).slice(0, 200), type: "message", ts: new Date(lastRun.started_at).getTime() + i * 1000 });
    } else if (ar.status === "error") {
      msgs.push({ id: `err-${i}`, fromId: ar.role_id, fromEmoji: ar.emoji || "🤖", fromTitle: ar.role_title, content: `Falha: ${ar.result || "erro desconhecido"}`, type: "error", ts: new Date(lastRun.started_at).getTime() + i * 1000 });
    }
  });
  if (lastRun.summary && !lastRun.summary.includes("AI error")) {
    msgs.push({ id: `ceo-sum`, fromId: "ceo", fromEmoji: "👔", fromTitle: "CEO / Diretor", content: String(lastRun.summary).slice(0, 400), type: "report", ts: lastRun.completed_at ? new Date(lastRun.completed_at).getTime() : Date.now() });
  }
  return msgs.sort((a, b) => a.ts - b.ts);
}

/* ─── Main Component ───────────────────────────────────────── */
interface TeamWarRoomProps {
  deployment: any;
  runs: any[];
  onClose: () => void;
  onRunNow?: () => void;
  isRunning?: boolean;
  onRefresh?: () => void;
  projectId?: string;
}

export function TeamWarRoom({ deployment, runs, onClose, onRunNow, isRunning, onRefresh, projectId }: TeamWarRoomProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"canvas" | "hub">("canvas");
  const [hireOpen, setHireOpen] = useState(false);
  const [hireParentRole, setHireParentRole] = useState<any>(null);
  const [hireParentDepth, setHireParentDepth] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileRoleId, setProfileRoleId] = useState<string | null>(null);
  const [vacations, setVacations] = useState<Set<string>>(new Set((deployment.vacations as string[]) || []));

  // Live activity cycling state
  const [spotlightRoleId, setSpotlightRoleId] = useState<string | null>(null);
  const [liveConvoOpen, setLiveConvoOpen] = useState(false);
  const [liveConvoEntries, setLiveConvoEntries] = useState<LiveConvoEntry[]>([]);
  const [liveConvoTyping, setLiveConvoTyping] = useState(false);
  const spotlightIndexRef = useRef(0);
  const pmReportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roles: any[] = useMemo(() => (deployment.roles as any[]) || [], [deployment.roles]);
  const hierarchy: Record<string, string> = useMemo(() => (deployment.hierarchy as Record<string, string>) || {}, [deployment.hierarchy]);

  const depRuns = useMemo(() => runs.filter(r => r.deployment_id === deployment.id), [runs, deployment.id]);
  const lastRun = depRuns[0];

  const agentResults = useMemo(() => {
    const map: Record<string, any> = {};
    if (lastRun) ((lastRun.agent_results as any[]) || []).forEach((ar: any) => { map[ar.role_id] = ar; });
    return map;
  }, [lastRun]);

  const getDepth = useCallback((id: string, d = 0): number => {
    if (id === "ceo" || d > 8) return d;
    const p = hierarchy[id];
    return p ? getDepth(p, d + 1) : d;
  }, [hierarchy]);

  /* ─── Live Activity Cycling ─────────────────────────────── */
  const activeRoles = useMemo(() => roles.filter(r => !vacations.has(r.id)), [roles, vacations]);

  // Cycle through agents every ~60s, showing their activity for ~8s
  useEffect(() => {
    if (isRunning || activeRoles.length === 0) return;

    const runCycle = () => {
      const idx = spotlightIndexRef.current % activeRoles.length;
      const activeRole = activeRoles[idx];
      spotlightIndexRef.current = (spotlightIndexRef.current + 1) % activeRoles.length;

      setSpotlightRoleId(activeRole.id);

      // After 8s, clear spotlight and wait before next cycle
      activityTimerRef.current = setTimeout(() => {
        setSpotlightRoleId(null);
        // Wait 52s before next spotlight (total ~60s cycle per agent)
        activityTimerRef.current = setTimeout(runCycle, 52000);
      }, 8000);
    };

    // Start first cycle after 5s delay
    activityTimerRef.current = setTimeout(runCycle, 5000);

    return () => {
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    };
  }, [isRunning, activeRoles]);

  // When spotlight changes, add a convo entry
  useEffect(() => {
    if (!spotlightRoleId) return;
    const activeRole = roles.find(r => r.id === spotlightRoleId);
    if (!activeRole) return;

    const parentId = hierarchy[activeRole.id];
    const parentRole = parentId ? roles.find(r => r.id === parentId) : null;
    const workPhrase = getWorkPhrase(activeRole);

    setLiveConvoTyping(true);
    const t = setTimeout(() => {
      setLiveConvoTyping(false);
      const newEntry: LiveConvoEntry = {
        fromEmoji: activeRole.emoji,
        fromTitle: activeRole.title,
        toEmoji: parentRole?.emoji,
        toTitle: parentRole?.title,
        text: workPhrase,
        ts: Date.now(),
        type: parentRole ? "report" : "work",
      };
      setLiveConvoEntries(prev => [...prev.slice(-19), newEntry]);
    }, 1500);

    return () => clearTimeout(t);
  }, [spotlightRoleId, roles, hierarchy]);

  /* ─── PM 30-min report ──────────────────────────────────── */
  useEffect(() => {
    if (isRunning || activeRoles.length === 0) return;

    const sendPmReport = () => {
      // Find project manager / gerente de projetos or fallback to second in hierarchy
      const pmRole = activeRoles.find(r =>
        (r.title || "").toLowerCase().includes("projeto") ||
        (r.title || "").toLowerCase().includes("gerente") ||
        (r.title || "").toLowerCase().includes("scrum")
      ) || activeRoles[Math.min(1, activeRoles.length - 1)];

      const ceoRole = activeRoles.find(r => r.id === "ceo" || !hierarchy[r.id]) || activeRoles[0];
      if (!pmRole || !ceoRole) return;

      const reportText = getPmReport(activeRoles.length);
      const newEntry: LiveConvoEntry = {
        fromEmoji: pmRole.emoji,
        fromTitle: pmRole.title,
        toEmoji: ceoRole.emoji,
        toTitle: ceoRole.title,
        text: reportText,
        ts: Date.now(),
        type: "report",
      };
      setLiveConvoEntries(prev => [...prev.slice(-19), newEntry]);
      setSpotlightRoleId(pmRole.id);
      setLiveConvoOpen(true);

      // Send WhatsApp if CEO has number configured
      const ceosWhatsapp = ceoRole.whatsapp;
      if (ceosWhatsapp) {
        supabase.functions.invoke("send-workflow-notification", {
          body: {
            workflow_name: `⏱️ Report 30min — ${deployment.name}`,
            report: `${pmRole.emoji} ${pmRole.title} → ${ceoRole.emoji} ${ceoRole.title}\n\n${reportText}`,
            recipient_name: ceoRole.title,
            direct_send: { phones: [ceosWhatsapp] },
          },
        }).then(() => {
          toast.success(`📲 Report enviado ao CEO via WhatsApp`);
        }).catch(() => {});
      }

      // Clear spotlight after 10s
      setTimeout(() => setSpotlightRoleId(null), 10000);
    };

    // Run every 30 minutes (30 * 60 * 1000 ms)
    pmReportTimerRef.current = setTimeout(sendPmReport, 30 * 60 * 1000);
    const interval = setInterval(sendPmReport, 30 * 60 * 1000);

    return () => {
      if (pmReportTimerRef.current) clearTimeout(pmReportTimerRef.current);
      clearInterval(interval);
    };
  }, [isRunning, activeRoles, hierarchy, deployment.name, deployment.id]);

  const getDepth2 = useCallback((id: string, d = 0): number => {
    if (id === "ceo" || d > 8) return d;
    const p = hierarchy[id];
    return p ? getDepth2(p, d + 1) : d;
  }, [hierarchy]);

  /* ─── Member management ─── */
  const handleFireMember = useCallback(async (roleId: string) => {
    const updatedRoles = roles.filter(r => r.id !== roleId);
    const updatedHierarchy = { ...hierarchy };
    const firedParent = updatedHierarchy[roleId];
    delete updatedHierarchy[roleId];
    Object.keys(updatedHierarchy).forEach(childId => {
      if (updatedHierarchy[childId] === roleId) updatedHierarchy[childId] = firedParent || "ceo";
    });
    const { error } = await supabase.from("orchestrator_deployments").update({ roles: updatedRoles as any, hierarchy: updatedHierarchy as any }).eq("id", deployment.id);
    if (error) { toast.error(error.message); return; }
    const fired = roles.find(r => r.id === roleId);
    toast.success(`${fired?.emoji || ""} ${fired?.title || "Membro"} removido da equipe`);
    onRefresh?.();
  }, [roles, hierarchy, deployment.id, onRefresh]);

  const handleHireMember = useCallback(async (roleData: { title: string; emoji: string; department: string; instructions: string; skills: string[] }, parentId: string) => {
    const newRole = {
      id: `role-${Date.now()}`,
      ...roleData,
      skills: Array.isArray(roleData.skills) ? roleData.skills : [],
      routine: {
        frequency: "daily",
        tasks: ["Análise geral da área", "Geração de relatório de resultados"],
        dataSources: ["Dados do projeto", "Métricas de performance"],
        outputs: ["Relatório detalhado com ações recomendadas"],
        autonomousActions: ["Análise e recomendações estratégicas"],
      },
    };
    const updatedRoles = [...roles, newRole];
    const updatedHierarchy = { ...hierarchy, [newRole.id]: parentId };
    const { error } = await supabase.from("orchestrator_deployments").update({ roles: updatedRoles as any, hierarchy: updatedHierarchy as any }).eq("id", deployment.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${roleData.emoji} ${roleData.title} contratado!`);
    onRefresh?.();
  }, [roles, hierarchy, deployment.id, onRefresh]);

  const handlePromoteMember = useCallback(async (roleId: string) => {
    const currentParentId = hierarchy[roleId];
    if (!currentParentId) return;
    const grandParentId = hierarchy[currentParentId];
    if (!grandParentId) { toast("Já está no nível mais alto possível"); return; }
    const updatedHierarchy = { ...hierarchy, [roleId]: grandParentId };
    await supabase.from("orchestrator_deployments").update({ hierarchy: updatedHierarchy as any }).eq("id", deployment.id);
    const promoted = roles.find(r => r.id === roleId);
    toast.success(`⬆️ ${promoted?.emoji || ""} ${promoted?.title} promovido!`);
    onRefresh?.();
  }, [hierarchy, roles, deployment.id, onRefresh]);

  const handleDemoteMember = useCallback(async (roleId: string) => {
    // Find a peer to become the new parent (first child of same parent)
    const currentParentId = hierarchy[roleId];
    if (!currentParentId) return;
    const peers = roles.filter(r => hierarchy[r.id] === currentParentId && r.id !== roleId);
    if (peers.length === 0) { toast("Não há par disponível para se tornar superior"); return; }
    const newParent = peers[0];
    const updatedHierarchy = { ...hierarchy, [roleId]: newParent.id };
    await supabase.from("orchestrator_deployments").update({ hierarchy: updatedHierarchy as any }).eq("id", deployment.id);
    const demoted = roles.find(r => r.id === roleId);
    toast.success(`⬇️ ${demoted?.emoji || ""} ${demoted?.title} regredido para reportar a ${newParent.emoji} ${newParent.title}`);
    onRefresh?.();
  }, [hierarchy, roles, deployment.id, onRefresh]);

  const handleVacationToggle = useCallback(async (roleId: string) => {
    const newVacations = new Set(vacations);
    if (newVacations.has(roleId)) {
      newVacations.delete(roleId);
      toast.success(`${roles.find(r => r.id === roleId)?.emoji || ""} retornou das férias!`);
    } else {
      newVacations.add(roleId);
      toast.success(`🌴 ${roles.find(r => r.id === roleId)?.title || "Membro"} colocado em férias`);
    }
    setVacations(newVacations);
    // Persist vacations as metadata on deployment (using delivery_config for now)
    await supabase.from("orchestrator_deployments")
      .update({ delivery_config: { ...(deployment.delivery_config || {}), vacations: Array.from(newVacations) } as any })
      .eq("id", deployment.id);
  }, [vacations, roles, deployment.id, deployment.delivery_config]);

  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    // edgeId format: e-{parentId}-{childId}
    const parts = edgeId.replace("e-", "").split("-");
    if (parts.length < 2) return;
    // Find the child role (last segment is child, rest is parent)
    // Find edge in edges and identify child node
    const childRoleId = roles.find(r => `e-${hierarchy[r.id]}-${r.id}` === edgeId)?.id;
    if (!childRoleId) return;
    const updatedHierarchy = { ...hierarchy };
    delete updatedHierarchy[childRoleId];
    await supabase.from("orchestrator_deployments").update({ hierarchy: updatedHierarchy as any }).eq("id", deployment.id);
    toast.success("Conexão removida");
    onRefresh?.();
  }, [hierarchy, roles, deployment.id, onRefresh]);

  const handleEditMember = useCallback(async (roleId: string, patch: Partial<{ title: string; emoji: string; department: string; instructions: string; memory: string; whatsapp: string }>) => {
    const updatedRoles = roles.map(r => r.id === roleId ? { ...r, ...patch } : r);
    const { error } = await supabase.from("orchestrator_deployments").update({ roles: updatedRoles as any }).eq("id", deployment.id);
    if (error) { toast.error(error.message); throw error; }
    onRefresh?.();
  }, [roles, deployment.id, onRefresh]);

  /* ── Build nodes/edges (with spotlight awareness) ── */
  const buildArgs = useMemo(
    () => [roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember, handleDemoteMember, handleVacationToggle, vacations, (id: string) => { setProfileRoleId(id); setProfileOpen(true); }, handleDeleteEdge, spotlightRoleId] as const,
    [roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember, handleDemoteMember, handleVacationToggle, vacations, handleDeleteEdge, spotlightRoleId],
  );

  const { rfNodes: initialNodes, rfEdges: initialEdges } = useMemo(
    () => {
      const result = buildNodesAndEdges(roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember, handleDemoteMember, handleVacationToggle, vacations, (id) => { setProfileRoleId(id); setProfileOpen(true); }, handleDeleteEdge);
      // Apply spotlight
      if (spotlightRoleId) {
        result.rfNodes = result.rfNodes.map(n => ({
          ...n,
          data: { ...n.data, isActiveSpotlight: n.id === spotlightRoleId },
        }));
      }
      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...buildArgs],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const result = buildNodesAndEdges(roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember, handleDemoteMember, handleVacationToggle, vacations, (id) => { setProfileRoleId(id); setProfileOpen(true); }, handleDeleteEdge);
    if (spotlightRoleId) {
      result.rfNodes = result.rfNodes.map(n => ({
        ...n,
        data: { ...n.data, isActiveSpotlight: n.id === spotlightRoleId },
      }));
    }
    setNodes(result.rfNodes);
    setEdges(result.rfEdges);
  }, [roles, hierarchy, agentResults, lastRun, handleFireMember, handlePromoteMember, handleDemoteMember, handleVacationToggle, vacations, handleDeleteEdge, spotlightRoleId]);

  const messages = useMemo(() => buildMessages(depRuns, roles, hierarchy), [depRuns, roles, hierarchy]);

  // Derived values for spotlight dialog
  const spotlightRole = spotlightRoleId ? roles.find(r => r.id === spotlightRoleId) : null;
  const spotlightTargetId = spotlightRole ? hierarchy[spotlightRole.id] : null;
  const spotlightTargetRole = spotlightTargetId ? roles.find(r => r.id === spotlightTargetId) : null;


  const successCount = Object.values(agentResults).filter((a: any) => a.status === "success").length;
  const totalAgents = roles.length;
  const runStatus = lastRun?.status;

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      const updatedHierarchy = { ...hierarchy, [connection.target]: connection.source };
      supabase.from("orchestrator_deployments").update({ hierarchy: updatedHierarchy as any }).eq("id", deployment.id)
        .then(({ error }) => { if (!error) { toast.success("Hierarquia atualizada"); onRefresh?.(); } });
    }
    setEdges(eds => addEdge(connection, eds));
  }, [hierarchy, deployment.id, onRefresh, setEdges]);

  const onConnectEnd: OnConnectEnd = useCallback((_, connectionState) => {
    if (!connectionState.isValid) {
      const sourceId = (connectionState as any).fromNode?.id;
      if (sourceId) {
        const sourceRole = roles.find(r => r.id === sourceId);
        const depth = getDepth(sourceId);
        setHireParentRole(sourceRole || null);
        setHireParentDepth(depth);
        setHireOpen(true);
      }
    }
  }, [roles, getDepth]);

  const profileRole = profileRoleId ? roles.find(r => r.id === profileRoleId) : null;

  return (
    <div className={cn(
      "mt-3 rounded-xl border border-border overflow-hidden transition-all duration-300 bg-background",
      expanded ? "fixed inset-3 z-50 border-primary/40 shadow-2xl flex flex-col" : "flex flex-col",
    )}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
            runStatus === "running" ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
              : runStatus === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-muted/30 text-muted-foreground border-border",
          )}>
            {runStatus === "running" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            {runStatus === "completed" && <Zap className="h-2.5 w-2.5" />}
            {!lastRun && <Users className="h-2.5 w-2.5" />}
            {runStatus === "running" ? "Em execução" : runStatus === "completed" ? "Concluído" : "Standby"}
          </div>
          <span className="text-xs font-bold">🏢 {deployment.name}</span>
          {lastRun && <Badge variant="outline" className="text-[9px]">{successCount}/{totalAgents} ✓</Badge>}
          <Badge variant="outline" className="text-[9px] gap-1"><Users className="h-2.5 w-2.5" />{roles.length}</Badge>
          {vacations.size > 0 && <Badge variant="outline" className="text-[9px] text-orange-400 border-orange-400/30">🌴 {vacations.size} em férias</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          {onRunNow && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={onRunNow} disabled={isRunning}>
              {isRunning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
              Executar
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2"
            onClick={() => { setHireParentRole(roles[0] || null); setHireParentDepth(0); setHireOpen(true); }}>
            <UserPlus className="h-2.5 w-2.5" /> Contratar
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(e => !e)}>
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "canvas" | "hub")} className="flex flex-col flex-1 min-h-0">
        <div className="px-4 pt-2 border-b border-border bg-card/40 shrink-0">
          <TabsList className="h-7 gap-1 bg-transparent p-0">
            <TabsTrigger value="canvas" className="h-6 text-[10px] px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              🖥️ Canvas
            </TabsTrigger>
            <TabsTrigger value="hub" className="h-6 text-[10px] px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              📋 Team Hub
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Canvas Tab ── */}
        <TabsContent value="canvas" className="flex-1 min-h-0 m-0">
          <div className={cn("grid flex-1 min-h-0", expanded ? "grid-cols-[1fr_360px] h-[calc(100%-0px)]" : "grid-cols-1")}>
            {/* ReactFlow Canvas */}
            <div className={cn("relative", expanded ? "h-full" : "h-[640px]")}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                minZoom={0.3}
                maxZoom={2}
                className="!bg-background"
                deleteKeyCode={["Backspace", "Delete"]}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
                <Controls className="!bg-card !border-border !shadow-lg" showInteractive={false} />

                <Panel position="top-right">
                  <div className="flex flex-col gap-1.5">
                    <ReorganizeButton
                      roles={roles} hierarchy={hierarchy} agentResults={agentResults}
                      lastRun={lastRun} setNodes={setNodes} vacations={vacations}
                    />
                    <Button variant="outline" size="sm"
                      className="h-7 text-[10px] gap-1.5 px-2.5 bg-card/90 backdrop-blur-sm"
                      onClick={() => { setHireParentRole(roles[0] || null); setHireParentDepth(0); setHireOpen(true); }}>
                      <UserPlus className="h-3 w-3" /> Contratar
                    </Button>
                  </div>
                </Panel>

                {expanded && (
                  <MiniMap
                    className="!bg-card !border-border"
                    nodeColor={(n) => {
                      const d = n.data as unknown as AgentNodeData;
                      const m: Record<string, string> = { success: "#22c55e", error: "#ef4444", running: "#3b82f6", waiting: "#f59e0b", idle: "#6b7280", vacation: "#f97316" };
                      return m[d?.status] || "#6b7280";
                    }}
                  />
                )}

                {runStatus === "running" && (
                  <Panel position="top-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm">
                      <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                      <span className="text-[11px] font-semibold text-blue-400">Equipe em execução…</span>
                      <div className="flex gap-0.5 ml-1">
                        {[0, 150, 300].map(d => (
                          <div key={d} className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  </Panel>
                )}

                {/* Live activity spotlight indicator */}
                {spotlightRole && !isRunning && (
                  <Panel position="top-center">
                    <button
                      onClick={() => setLiveConvoOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm hover:bg-blue-500/30 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">{spotlightRole.emoji}</span>
                      <div className="flex gap-0.5">
                        {[0, 150, 300].map(d => (
                          <div key={d} className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-blue-400">{spotlightRole.title} em atividade</span>
                      {spotlightTargetRole && (
                        <span className="text-[10px] text-blue-300/70">→ {spotlightTargetRole.emoji} {spotlightTargetRole.title}</span>
                      )}
                      <MessageSquare className="h-3 w-3 text-blue-400 ml-1" />
                    </button>
                  </Panel>
                )}

                {runStatus === "completed" && (
                  <Panel position="top-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span className="text-[11px] font-semibold text-emerald-400">
                        {successCount}/{totalAgents} agentes bem-sucedidos
                      </span>
                    </div>
                  </Panel>
                )}
              </ReactFlow>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-card/90 border border-border backdrop-blur-sm text-[9px]">
                {[
                  { label: "Standby", color: "bg-muted-foreground/40" },
                  { label: "Executando", color: "bg-blue-400" },
                  { label: "Concluído", color: "bg-emerald-500" },
                  { label: "Férias", color: "bg-orange-400" },
                  { label: "Falhou", color: "bg-destructive" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className={cn("h-2 w-2 rounded-full", l.color)} />
                    <span className="text-muted-foreground">{l.label}</span>
                  </div>
                ))}
                <div className="border-l border-border pl-2 text-muted-foreground">
                  💡 Clique no card para ver perfil · Arraste para contratar · Hover para ações
                </div>
              </div>
            </div>

            {/* Conversation feed — expanded */}
            {expanded && (
              <div className="flex flex-col border-l border-border h-full">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50 shrink-0">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">Chat da Equipe</p>
                  {messages.length > 0 && <Badge variant="secondary" className="text-[8px]">{messages.length}</Badge>}
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2.5">
                    {messages.length === 0 && (
                      <div className="py-10 text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                        <p className="text-xs text-muted-foreground">{runStatus === "running" ? "Processando…" : "Execute a equipe para ver os agentes em ação."}</p>
                      </div>
                    )}
                    {runStatus === "running" && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-blue-400">Equipe em reunião…</p>
                          <p className="text-[9px] text-muted-foreground">Análise em andamento</p>
                        </div>
                      </div>
                    )}
                    {messages.map(msg => (
                      <div key={msg.id} className={cn(
                        "rounded-xl border p-2.5 space-y-1.5",
                        msg.type === "report" ? "bg-primary/5 border-primary/20" :
                          msg.type === "error" ? "bg-destructive/5 border-destructive/20" :
                            "bg-card/60 border-border",
                      )}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm leading-none">{msg.fromEmoji}</span>
                          <span className="text-[10px] font-bold">{msg.fromTitle}</span>
                          {msg.toId && msg.toTitle && (
                            <>
                              <span className="text-[9px] text-muted-foreground">→</span>
                              <span className="text-sm leading-none">{msg.toEmoji}</span>
                              <span className="text-[10px] text-muted-foreground">{msg.toTitle}</span>
                            </>
                          )}
                          {msg.type === "report" && <Badge variant="secondary" className="text-[7px] ml-auto">📝 CEO</Badge>}
                          {msg.type === "error" && <XCircle className="h-3 w-3 text-destructive ml-auto" />}
                        </div>
                        <p className="text-[10px] text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-6">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Collapsed: mini feed */}
          {!expanded && messages.length > 0 && (
            <div className="border-t border-border bg-card/40">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Últimas mensagens</p>
              </div>
              <ScrollArea className="max-h-44">
                <div className="p-2.5 space-y-1.5">
                  {messages.slice(-5).map(msg => (
                    <div key={msg.id} className={cn(
                      "flex gap-2 items-start rounded-lg border px-2.5 py-1.5",
                      msg.type === "report" ? "bg-primary/5 border-primary/20" :
                        msg.type === "error" ? "bg-destructive/5 border-destructive/20" :
                          "bg-card/50 border-border/60",
                    )}>
                      <span className="text-base leading-none mt-0.5 shrink-0">{msg.fromEmoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[9px] font-bold">{msg.fromTitle}</span>
                          {msg.toTitle && <span className="text-[9px] text-muted-foreground">→ {msg.toEmoji} {msg.toTitle}</span>}
                        </div>
                        <p className="text-[9px] text-foreground/70 line-clamp-2 leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* ── Team Hub Tab ── */}
        <TabsContent value="hub" className="flex-1 min-h-0 m-0">
          <div className={cn("h-full", expanded ? "h-full" : "h-[640px]")}>
            <TeamHubTab deploymentId={deployment.id} projectId={projectId} deploymentName={deployment.name} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Hire Dialog ── */}
      <HireDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        parentRole={hireParentRole}
        parentDepth={hireParentDepth}
        onHire={handleHireMember}
      />

      {/* ── Employee Profile Dialog ── */}
      {profileRole && (
        <EmployeeProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          role={profileRole}
          agentResult={agentResults[profileRole.id]}
          runs={depRuns}
          hierarchy={hierarchy}
          allRoles={roles}
          onFire={handleFireMember}
          onPromote={handlePromoteMember}
          onDemote={handleDemoteMember}
          onVacation={handleVacationToggle}
          onEdit={handleEditMember}
          isOnVacation={vacations.has(profileRole.id)}
          lastRunSummary={lastRun?.summary || undefined}
        />
      )}

      {/* ── Live Convo Dialog ── */}
      <LiveConvoDialog
        open={liveConvoOpen}
        onOpenChange={setLiveConvoOpen}
        activeRole={spotlightRole}
        targetRole={spotlightTargetRole}
        entries={liveConvoEntries}
        isWorking={liveConvoTyping || !!spotlightRoleId}
      />
    </div>
  );
}
