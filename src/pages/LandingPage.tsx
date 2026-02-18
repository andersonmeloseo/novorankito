import { useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Search, BarChart3, Zap, Bot, TrendingUp, Globe, Target,
  Shield, Users, Database, ArrowRight, CheckCircle2, Star,
  ChevronRight, Brain, Layers, Activity, MousePointerClick,
  Map, ShoppingCart, Link, Clock, Play, Sparkles, Award,
  Building2, DollarSign, LineChart, FileSearch, Network
} from "lucide-react";

// ---------- Animated counter ----------
function Counter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);

  return <span ref={ref}>{prefix}{count.toLocaleString("pt-BR")}{suffix}</span>;
}

// ---------- Feature Card ----------
function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group relative bg-white dark:bg-[#141927] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300"
    >
      <div className={`inline-flex p-3 rounded-xl mb-4 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// ---------- Screenshot mockup ----------
function ScreenshotFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-slate-500 dark:text-slate-400 font-mono">rankito.io / {label}</span>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

// ---------- Fake SEO dashboard screenshot ----------
function SeoScreenshot() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <Search className="w-3 h-3 text-violet-600" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">SEO — Google Search Console</span>
        <span className="ml-auto text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">● Conectado</span>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "CLIQUES", val: "774", delta: "+43.6%", up: true },
          { label: "IMPRESSÕES", val: "20.2K", delta: "+27.8%", up: true },
          { label: "CTR MÉDIO", val: "3.8%", delta: "+12.4%", up: true },
          { label: "POSIÇÃO MÉDIA", val: "8", delta: "-6.4%", up: false },
        ].map(k => (
          <div key={k.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase mb-1">{k.label}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{k.val}</div>
            <div className={`text-[10px] mt-1 font-medium ${k.up ? "text-emerald-500" : "text-red-400"}`}>{k.delta}</div>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3">
        <div className="text-xs font-semibold text-slate-500 mb-2">Tendência de Performance</div>
        <div className="flex items-end gap-1 h-16">
          {[30,45,38,60,52,70,65,80,72,90,85,95].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-violet-500/60" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Fake GA4 screenshot ----------
function GA4Screenshot() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <Activity className="w-3 h-3 text-blue-600" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">GA4 — KPIs Executivos</span>
        <span className="ml-auto text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">● Ao vivo</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "USUÁRIOS", val: "2.5K" },
          { label: "SESSÕES", val: "2.6K" },
          { label: "ENGAJAMENTO", val: "22.8%" },
          { label: "RECEITA", val: "R$4.2K" },
          { label: "CONVERSÕES", val: "128" },
          { label: "DURAÇÃO", val: "2m 39s" },
        ].map(k => (
          <div key={k.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
            <div className="text-[8px] font-semibold tracking-wider text-slate-400 uppercase mb-0.5">{k.label}</div>
            <div className="text-base font-bold text-slate-900 dark:text-white">{k.val}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-3">
          <div className="text-[9px] text-slate-400 uppercase font-semibold mb-2">Por Canal</div>
          {[["Orgânico",65],["Direto",20],["Social",15]].map(([c,p]) => (
            <div key={c as string} className="flex items-center gap-2 mb-1">
              <div className="text-[10px] text-slate-500 w-14">{c}</div>
              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p}%` }} />
              </div>
              <div className="text-[10px] text-slate-400">{p}%</div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-3">
          <div className="text-[9px] text-slate-400 uppercase font-semibold mb-2">Por Dispositivo</div>
          {[["Mobile",58],["Desktop",35],["Tablet",7]].map(([c,p]) => (
            <div key={c as string} className="flex items-center gap-2 mb-1">
              <div className="text-[10px] text-slate-500 w-14">{c}</div>
              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p}%` }} />
              </div>
              <div className="text-[10px] text-slate-400">{p}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Fake AI Agent screenshot ----------
function AIAgentScreenshot() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <Bot className="w-3 h-3 text-violet-600" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Rankito IA — Agentes Autônomos</span>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 bg-violet-50 dark:bg-violet-900/20 rounded-xl rounded-tl-none p-3 text-xs text-slate-700 dark:text-slate-300">
            📊 Analisei seus últimos 28 dias. Suas impressões cresceram <span className="font-bold text-violet-600">+27.8%</span>. Identifiquei <span className="font-bold">12 keywords</span> com alto potencial de crescimento na posição 8-15.
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl rounded-tr-none p-3 text-xs text-slate-700 dark:text-slate-300">
            Quais páginas devo otimizar primeiro?
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 bg-violet-50 dark:bg-violet-900/20 rounded-xl rounded-tl-none p-3 text-xs text-slate-700 dark:text-slate-300">
            🎯 Top 3 prioridades: <span className="font-bold">/advogado-criminal</span> (pos. 9, 340 impressões), <span className="font-bold">/consulta-gratuita</span> (pos. 11), <span className="font-bold">/honorarios</span> (pos. 8). Enviei relatório por WhatsApp!
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {["📈 Analisar performance","🔍 Keywords em alta","📧 Enviar relatório"].map(s => (
          <button key={s} className="text-[9px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-left text-slate-600 dark:text-slate-400 hover:border-violet-400 transition-colors">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Fake Tracking screenshot ----------
function TrackingScreenshot() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
          <MousePointerClick className="w-3 h-3 text-orange-600" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Analítica Rankito — Pixel v4.1</span>
        <span className="ml-auto text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">● Ativo</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { icon: Activity, label: "Eventos", val: "1.2K", color: "text-blue-500" },
          { icon: Users, label: "Sessões", val: "384", color: "text-violet-500" },
          { icon: Map, label: "Heatmaps", val: "12", color: "text-orange-500" },
          { icon: Target, label: "Metas", val: "8/10", color: "text-emerald-500" },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className="text-base font-bold text-slate-900 dark:text-white">{val}</div>
            <div className="text-[9px] text-slate-400">{label}</div>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-3">
        <div className="text-[9px] text-slate-400 uppercase font-semibold mb-2">Eventos Recentes</div>
        {[
          { e: "cta_click", p: "/contato", t: "2s atrás", c: "bg-blue-400" },
          { e: "form_submit", p: "/servicos", t: "15s atrás", c: "bg-emerald-400" },
          { e: "page_view", p: "/sobre", t: "32s atrás", c: "bg-slate-400" },
          { e: "whatsapp_click", p: "/home", t: "1m atrás", c: "bg-green-400" },
        ].map(({ e, p, t, c }) => (
          <div key={e+t} className="flex items-center gap-2 py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
            <span className={`w-1.5 h-1.5 rounded-full ${c} shrink-0`} />
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 flex-1">{e}</span>
            <span className="text-[9px] text-slate-400">{p}</span>
            <span className="text-[9px] text-slate-400">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Fake Rank Rent screenshot ----------
function RankRentScreenshot() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <DollarSign className="w-3 h-3 text-emerald-600" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Rank & Rent — Portfólio</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: "PATRIMÔNIO", val: "R$148K" },
          { label: "RECEITA/MÊS", val: "R$3.2K" },
          { label: "ATIVOS", val: "12" },
          { label: "ALUGADOS", val: "8/12" },
        ].map(k => (
          <div key={k.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="text-[8px] font-semibold tracking-wider text-slate-400 uppercase mb-0.5">{k.label}</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{k.val}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          { name: "Advogados SP", client: "Dr. Costa", val: "R$450/mês", status: "Alugado", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
          { name: "Encanadores RJ", client: "Hidro Fix", val: "R$320/mês", status: "Alugado", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
          { name: "Dentistas BH", client: "—", val: "—", status: "Disponível", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
        ].map(r => (
          <div key={r.name} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg px-3 py-2">
            <div className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-200">{r.name}</div>
            <div className="text-[10px] text-slate-400">{r.client}</div>
            <div className="text-[10px] font-semibold text-emerald-600">{r.val}</div>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${r.color}`}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN LANDING PAGE
// ============================================================
export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    { icon: Search, title: "SEO via Search Console", desc: "Monitore cliques, impressões, CTR e posição média com dados reais do Google Search Console. Compare períodos, filtre por país e dispositivo.", color: "bg-violet-100 dark:bg-violet-900/40 text-violet-600" },
    { icon: BarChart3, title: "Analytics GA4 Avançado", desc: "Dashboard executivo completo: usuários, sessões, engajamento, receita, retenção, aquisição e demografia — tudo em um só lugar.", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600" },
    { icon: Zap, title: "Indexação Automática", desc: "Envie URLs ao Google Index API com até 200 notificações/dia, monitore status de cobertura e agende indexações automáticas.", color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600" },
    { icon: Bot, title: "Rankito IA Autônoma", desc: "Agentes especializados em SEO, Growth e Analytics que analisam seus dados reais, criam tarefas e enviam relatórios por WhatsApp e e-mail.", color: "bg-violet-100 dark:bg-violet-900/40 text-violet-600" },
    { icon: MousePointerClick, title: "Tracking de Conversões", desc: "Pixel próprio v4.1 que captura eventos, sessões, heatmaps, jornada do usuário, metas de conversão e rastreamento offline.", color: "bg-orange-100 dark:bg-orange-900/40 text-orange-600" },
    { icon: Network, title: "Grafo Semântico", desc: "Construa e visualize a arquitetura semântica do seu site com entidades, relações e Schema.org para dominar a busca semântica.", color: "bg-teal-100 dark:bg-teal-900/40 text-teal-600" },
    { icon: DollarSign, title: "Rank & Rent", desc: "Gerencie seu portfólio de ativos digitais: clientes, contratos, receitas mensais, avaliação do ativo e disponibilidade de aluguel.", color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" },
    { icon: TrendingUp, title: "Oportunidades SEO", desc: "Identificação automática de keywords com potencial de crescimento, canibalização de conteúdo e decaimento de páginas.", color: "bg-pink-100 dark:bg-pink-900/40 text-pink-600" },
    { icon: Brain, title: "Orquestrador de IA", desc: "Canvas visual para criar fluxos de automação com múltiplos agentes, gatilhos, ações e entrega por múltiplos canais.", color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600" },
    { icon: ShoppingCart, title: "E-commerce Analytics", desc: "Funil de compras completo, análise de receita, produtos mais vendidos e rastreamento de conversões de e-commerce.", color: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600" },
    { icon: Globe, title: "Multi-Projetos", desc: "Gerencie múltiplos sites em uma única plataforma. Dashboard unificado por projeto com KPIs de SEO, GA4, indexação e conversões.", color: "bg-slate-100 dark:bg-slate-700/60 text-slate-600" },
    { icon: Shield, title: "White Label", desc: "Personalize a plataforma com sua marca. Ideal para agências que querem entregar uma ferramenta própria aos seus clientes.", color: "bg-rose-100 dark:bg-rose-900/40 text-rose-600" },
  ];

  const modules = [
    { id: 0, label: "SEO & GSC", icon: Search },
    { id: 1, label: "GA4 Analytics", icon: BarChart3 },
    { id: 2, label: "IA Autônoma", icon: Bot },
    { id: 3, label: "Tracking Pixel", icon: MousePointerClick },
    { id: 4, label: "Rank & Rent", icon: DollarSign },
  ];

  const screenshots = [
    { component: <SeoScreenshot />, title: "SEO & Google Search Console", desc: "Dados reais em tempo real do seu Google Search Console. Compare períodos, identifique oportunidades e tome decisões com dados.", label: "seo" },
    { component: <GA4Screenshot />, title: "GA4 — Visão Executiva", desc: "Todos os seus dados do Google Analytics 4 organizados de forma clara: usuários, sessões, receita, canais e dispositivos.", label: "ga4" },
    { component: <AIAgentScreenshot />, title: "Rankito IA — Agentes Especializados", desc: "Converse com agentes treinados em SEO que analisam seus dados reais e entregam relatórios por WhatsApp e e-mail automaticamente.", label: "rankito-ai" },
    { component: <TrackingScreenshot />, title: "Analítica Rankito — Pixel v4.1", desc: "Capture eventos, sessões, heatmaps e jornadas do usuário com o pixel próprio da plataforma, sem depender de terceiros.", label: "analitica-rankito" },
    { component: <RankRentScreenshot />, title: "Rank & Rent — Portfólio Digital", desc: "Gerencie seu portfólio de ativos, contratos com clientes, receita recorrente e patrimônio digital estimado em uma visão única.", label: "rank-rent" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#090e1a] text-slate-900 dark:text-white overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#090e1a]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Rankito</span>
            <span className="text-[10px] font-semibold text-slate-400 ml-1 mt-0.5">SEO Intelligence</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-violet-600 transition-colors">Funcionalidades</a>
            <a href="#modules" className="hover:text-violet-600 transition-colors">Módulos</a>
            <a href="#pricing" className="hover:text-violet-600 transition-colors">Planos</a>
          </div>
          <a href="/login" className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
            Começar grátis <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-violet-200 dark:border-violet-800/50">
              <Sparkles className="w-3.5 h-3.5" />
              A plataforma de SEO mais completa do Brasil
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              Domine o{" "}
              <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 bg-clip-text text-transparent">
                Google Search
              </span>
              <br />com Inteligência Artificial
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto">
              Rankito unifica <strong className="text-slate-800 dark:text-slate-200">SEO, GA4, Indexação, IA Autônoma, Tracking de Conversões e Rank & Rent</strong> em uma única plataforma. Tome decisões com dados reais, não achismo.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <a href="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold px-8 py-4 rounded-2xl text-base shadow-xl shadow-violet-500/30 transition-all hover:scale-105">
                <Play className="w-4 h-4" /> Começar gratuitamente
              </a>
              <a href="#modules" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-8 py-4 rounded-2xl text-base hover:border-violet-400 hover:text-violet-600 transition-all">
                Ver funcionalidades <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {[
                { end: 12, suffix: "+", label: "Módulos integrados" },
                { end: 200, suffix: "k", label: "URLs indexadas/dia" },
                { end: 100, suffix: "%", label: "Dados reais do Google" },
                { end: 24, suffix: "/7", label: "IA trabalhando por você" },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-violet-600 mb-1">
                    <Counter end={s.end} suffix={s.suffix} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MODULES SHOWCASE ── */}
      <section id="modules" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0b1120]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Veja o sistema{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">em ação</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Cada módulo foi construído para profissionais de SEO e agências que precisam de dados reais, não estimativas.
            </p>
          </motion.div>

          {/* Tab switcher */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {modules.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveTab(m.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === m.id
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-400"
                }`}
              >
                <m.icon className="w-4 h-4" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Screenshot */}
          <div className="max-w-4xl mx-auto">
            {screenshots.map((s, i) => (
              <div key={i} className={activeTab === i ? "block" : "hidden"}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid lg:grid-cols-2 gap-10 items-center">
                    <div>
                      <h3 className="text-2xl font-black mb-4">{s.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{s.desc}</p>
                      <a href="/login" className="inline-flex items-center gap-2 text-violet-600 font-semibold hover:gap-3 transition-all">
                        Acessar módulo <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                    <ScreenshotFrame label={s.label}>
                      {s.component}
                    </ScreenshotFrame>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL FEATURES ── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Todas as{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">funcionalidades</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Uma plataforma completa para quem leva SEO a sério.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── DETAILED FEATURES LIST ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0b1120]">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-black text-center mb-12"
          >
            Tudo que você encontra dentro da plataforma
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-3">
            {[
              // SEO
              "✅ Consultas orgânicas com posição e CTR",
              "✅ Análise por páginas, países e dispositivos",
              "✅ Histórico de posições por keyword",
              "✅ Oportunidades de otimização automatizadas",
              "✅ Detecção de canibalização de keywords",
              "✅ Monitoramento de decaimento de conteúdo",
              "✅ Análise de aparência de busca (rich results)",
              "✅ Inspeção de URLs via GSC API",
              "✅ Sitemaps e links internos/externos",
              "✅ Discover e notícias no Search Console",
              // GA4
              "✅ KPIs executivos em tempo real",
              "✅ Análise de aquisição por canal e fonte",
              "✅ Dados demográficos e geográficos",
              "✅ Taxa de engajamento e retenção",
              "✅ Análise de e-commerce e receita",
              "✅ Mapa mundial de sessões",
              "✅ Comparação de períodos com delta visual",
              "✅ Filtros avançados por campanha, device, país",
              // Indexação
              "✅ Indexação automática via Google Indexing API",
              "✅ Quota de 200 URLs/dia por projeto",
              "✅ Agendamentos de indexação recorrentes",
              "✅ Status de cobertura por URL",
              "✅ Inspeção detalhada (fetch, robots, sitemaps)",
              // IA
              "✅ Chat conversacional com agentes especializados",
              "✅ Agentes de SEO, Growth e Analytics",
              "✅ Workflows automatizados de relatórios",
              "✅ Canvas visual de fluxos de IA",
              "✅ Orquestrador com entrega por WhatsApp e e-mail",
              "✅ Agendamentos automáticos de tarefas",
              // Tracking
              "✅ Pixel próprio v4.1 (instalação em 1 linha)",
              "✅ Heatmaps de clique, scroll e movimento",
              "✅ Jornada completa do usuário",
              "✅ Rastreamento de eventos personalizados",
              "✅ Metas de conversão configuráveis",
              "✅ Integração com Google Ads e Meta Ads",
              "✅ UTM tracking e atribuição de campanhas",
              "✅ Conversão offline (ligações, formulários)",
              "✅ Funis de e-commerce e checkout",
              "✅ Gestão de consentimento LGPD",
              // Rank & Rent
              "✅ Portfólio de ativos digitais",
              "✅ Gestão de clientes e contratos",
              "✅ Controle de receita recorrente (MRR)",
              "✅ Avaliação automática de ativos",
              "✅ Marketplace de disponibilidade",
              "✅ Dashboard financeiro por projeto",
              // Semântico
              "✅ Grafo de entidades com visualização interativa",
              "✅ Schema.org builder integrado",
              "✅ Análise de concorrentes por schema",
              "✅ Metas e objetivos semânticos",
              "✅ Plano de implementação de schema com IA",
              // Geral
              "✅ Multi-projetos e multi-usuários",
              "✅ White-label para agências",
              "✅ API pública com autenticação por chave",
              "✅ Webhooks e integrações externas",
              "✅ Exportação de relatórios em PDF",
              "✅ Sistema de notificações e alertas",
              "✅ Painel administrativo completo",
              "✅ Feature flags por plano e usuário",
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.01 }}
                className="flex items-start gap-2 py-1.5 text-sm text-slate-700 dark:text-slate-300"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI SECTION ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
                <Brain className="w-3.5 h-3.5" /> IA + Automação
              </div>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
                Seu time de SEO{" "}
                <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">trabalhando 24/7</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
                O Rankito IA não é um chatbot genérico. É um sistema de agentes especializados que acessa seus dados reais do Google Search Console e GA4 para entregar insights acionáveis.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Bot, title: "Agentes especializados", desc: "SEO, Growth e Analytics treinados com seus dados reais" },
                  { icon: Layers, title: "Workflows automatizados", desc: "Crie fluxos de relatórios que rodam automaticamente" },
                  { icon: Activity, title: "Orquestrador visual", desc: "Canvas drag-and-drop para orquestrar múltiplos agentes" },
                  { icon: Globe, title: "Entrega multicanal", desc: "WhatsApp, e-mail e notificações push automáticas" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{title}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <ScreenshotFrame label="rankito-ai">
                <AIAgentScreenshot />
              </ScreenshotFrame>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── RANK & RENT SECTION ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0b1120]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <ScreenshotFrame label="rank-rent">
                <RankRentScreenshot />
              </ScreenshotFrame>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
                <DollarSign className="w-3.5 h-3.5" /> Rank & Rent
              </div>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
                Transforme SEO em{" "}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">renda passiva</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
                O módulo de Rank & Rent é único no mercado brasileiro. Gerencie todo o seu portfólio de ativos digitais, contratos, clientes e receita recorrente em uma visão consolidada.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Portfólio de ativos",
                  "Gestão de clientes",
                  "Contratos e MRR",
                  "Avaliação automática",
                  "Dashboard financeiro",
                  "Marketplace de disponibilidade",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Planos para{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">todo perfil</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Do freelancer à grande agência, temos o plano certo para você.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "R$97",
                period: "/mês",
                desc: "Para freelancers e iniciantes em SEO",
                color: "border-slate-200 dark:border-slate-700",
                badge: null,
                features: ["1 projeto", "SEO via GSC", "GA4 Analytics", "Indexação automática", "Rankito IA básico", "2.000 eventos/mês"],
              },
              {
                name: "Pro",
                price: "R$197",
                period: "/mês",
                desc: "Para profissionais e agências em crescimento",
                color: "border-violet-500",
                badge: "Mais popular",
                features: ["5 projetos", "SEO + GA4 avançado", "Indexação 200 URLs/dia", "IA com workflows", "Tracking Pixel", "Rank & Rent", "Grafo Semântico", "50.000 eventos/mês"],
              },
              {
                name: "Agency",
                price: "R$397",
                period: "/mês",
                desc: "Para agências que precisam de tudo",
                color: "border-emerald-500/50 dark:border-emerald-500/30",
                badge: null,
                features: ["Projetos ilimitados", "White Label", "Multi-usuários", "API pública", "Orquestrador IA", "Relatórios PDF", "Webhooks avançados", "Eventos ilimitados"],
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white dark:bg-[#141927] border-2 ${plan.color} rounded-2xl p-8 ${i === 1 ? "shadow-2xl shadow-violet-500/20 scale-105" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-black mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-slate-500 dark:text-slate-400">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    i === 1
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/30"
                      : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-violet-400 hover:text-violet-600"
                  }`}
                >
                  Começar agora
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full mb-6">
              <Award className="w-3.5 h-3.5" /> Plataforma 100% brasileira
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              Comece hoje mesmo a dominar o Google
            </h2>
            <p className="text-white/80 text-lg mb-10">
              Junte-se a centenas de profissionais e agências de SEO que já usam o Rankito para crescer mais rápido e com dados reais.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-10 py-4 rounded-2xl text-lg hover:bg-white/90 transition-all hover:scale-105 shadow-2xl"
            >
              Criar conta gratuita <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-[#040810]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold">Rankito</span>
            <span className="text-slate-500 text-sm">SEO Intelligence</span>
          </div>
          <div className="text-slate-500 text-sm text-center">
            © 2026 Rankito. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <a href="/login" className="hover:text-white transition-colors">Login</a>
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
