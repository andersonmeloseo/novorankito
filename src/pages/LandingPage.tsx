import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Search, BarChart3, Zap, Bot, TrendingUp, Target,
  Shield, Users, ArrowRight, CheckCircle2, Star,
  Brain, Activity, MousePointerClick, DollarSign,
  Network, Globe, Sparkles, ChevronRight,
  AlertCircle, Clock, Play, BarChart, LineChart,
  Lock, Layers, Award, Building2, Rocket, ChevronDown,
  Cpu, RefreshCw, SendHorizonal, Bell, FileText, Wifi,
  LayoutGrid, Settings, MessageSquare, Database, Cloud,
  Gauge, Timer, CheckCheck, ChevronUp, X, TrendingDown,
  AlertTriangle, Flame, Trophy, Map, Link2, FileSearch,
  Smartphone, Eye, BarChart2, PieChart, Repeat2, Megaphone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Animated Counter ───────────────────────────────────────────────────────
function Counter({ end, suffix = "", prefix = "", duration = 2000 }: {
  end: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(end);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString("pt-BR")}{suffix}</span>;
}

// ─── Floating Orb ─────────────────────────────────────────────────────────
function FloatingOrb({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    />
  );
}

// ─── Live Indexer Mockup ────────────────────────────────────────────────────
function IndexerMockup() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1400);
    return () => clearInterval(t);
  }, []);

  const urls = [
    { url: "/blog/seo-tecnico-2025", status: "indexed", time: "há 2min" },
    { url: "/servicos/consultoria-seo", status: "indexed", time: "há 5min" },
    { url: "/blog/link-building-2025", status: "indexing", time: "agora" },
    { url: "/cases/ecommerce-moda", status: "queued", time: "em fila" },
    { url: "/blog/schema-markup-guia", status: "queued", time: "em fila" },
  ];

  return (
    <div className="bg-white dark:bg-[#0d1220] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono flex-1">Indexação Automática — Google API</span>
        <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> AO VIVO
        </span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "INDEXADAS HOJE", value: `${127 + (tick % 4)}`, color: "text-violet-600 dark:text-violet-400" },
            { label: "LIMITE DIÁRIO", value: "200", color: "text-slate-500" },
            { label: "SUCESSO", value: "98.4%", color: "text-emerald-600 dark:text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-center">
              <div className="text-[7px] font-black tracking-widest text-slate-400 uppercase mb-1">{s.label}</div>
              <div className={`text-base font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 mb-3">
          {urls.map((u, i) => (
            <motion.div key={u.url} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg px-2.5 py-1.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.status === "indexed" ? "bg-violet-500" : u.status === "indexing" ? "bg-amber-400 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
              <span className="text-[9px] font-mono text-slate-600 dark:text-slate-300 flex-1 truncate">{u.url}</span>
              <span className="text-[8px] text-slate-400 shrink-0">{u.time}</span>
              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${u.status === "indexed" ? "text-violet-600 bg-violet-100 dark:bg-violet-900/40" : u.status === "indexing" ? "text-amber-600 bg-amber-100 dark:bg-amber-900/30" : "text-slate-400 bg-slate-100 dark:bg-slate-700/50"}`}>
                {u.status === "indexed" ? "✓ OK" : u.status === "indexing" ? "⟳ ENVIANDO" : "⏳ FILA"}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200/40 dark:border-violet-700/30 rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center shrink-0"><Zap className="w-3 h-3 text-white" /></div>
          <div className="text-[8px] text-slate-500 dark:text-slate-400">Próxima rodada automática: <strong className="text-slate-700 dark:text-slate-300">amanhã 08:00</strong> — 71 URLs na fila</div>
        </div>
      </div>
    </div>
  );
}

// ─── GSC Dashboard Mockup ─────────────────────────────────────────────────
function GSCMockup() {
  return (
    <div className="bg-white dark:bg-[#0d1220] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono">SEO & Search Console</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Cliques", value: "4.2k", delta: "+18%" },
            { label: "Impressões", value: "82k", delta: "+31%" },
            { label: "CTR Médio", value: "5.1%", delta: "+0.8%" },
            { label: "Posição", value: "11.4", delta: "-2.1" },
          ].map(m => (
            <div key={m.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 text-center">
              <div className="text-[7px] text-slate-400 uppercase font-bold mb-1">{m.label}</div>
              <div className="text-sm font-black text-slate-800 dark:text-white">{m.value}</div>
              <div className="text-[8px] text-emerald-500 font-bold">{m.delta}</div>
            </div>
          ))}
        </div>
        <div className="mb-3">
          <div className="text-[8px] font-bold text-slate-400 uppercase mb-1.5">Top Keywords — Zona de Ouro (pos. 8-15)</div>
          <div className="space-y-1">
            {[
              { kw: "consultoria seo sp", pos: "9", imp: "820", ctr: "3.2%" },
              { kw: "como indexar site google", pos: "11", imp: "1.2k", ctr: "2.8%" },
              { kw: "ferramentas seo gratis", pos: "14", imp: "650", ctr: "1.9%" },
            ].map(k => (
              <div key={k.kw} className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/15 border border-violet-100 dark:border-violet-800/30 rounded-lg px-2.5 py-1.5">
                <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-[7px] font-black text-white shrink-0">#{k.pos}</div>
                <span className="text-[9px] text-slate-700 dark:text-slate-300 flex-1 truncate font-medium">{k.kw}</span>
                <span className="text-[8px] text-slate-400">{k.imp} imp.</span>
                <span className="text-[8px] font-bold text-violet-600 dark:text-violet-400">{k.ctr}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30 rounded-xl p-2 flex items-start gap-2">
          <Brain className="w-3 h-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-[8px] text-amber-700 dark:text-amber-300"><strong>IA detectou:</strong> 3 keywords na zona de ouro — otimizar meta title pode trazer +400 cliques/mês</div>
        </div>
      </div>
    </div>
  );
}

// ─── Agent Chat Mockup ──────────────────────────────────────────────────────
function AgentMockup() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(v => (v + 1) % 4), 2800);
    return () => clearInterval(t);
  }, []);

  const msgs = [
    { role: "ai", text: "📊 Analisei seus dados do GSC + GA4. Você tem 18 keywords entre posição 8–15 com alto volume. Essa é a zona de ouro — pequenas melhorias de on-page = grandes saltos de tráfego." },
    { role: "user", text: "Qual priorizar primeiro?" },
    { role: "ai", text: "🎯 /blog/seo-local está na pos. 9 com 820 impressões/mês e CTR de apenas 3.2%. Com um title mais atrativo, você pode dobrar o CTR e ganhar +520 cliques/mês sem criar conteúdo novo." },
    { role: "ai", text: "📱 Relatório desta semana enviado no WhatsApp! Incluí o checklist de otimizações priorizadas por impacto de tráfego." },
  ];

  return (
    <div className="bg-white dark:bg-[#0d1220] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Bot className="w-2.5 h-2.5 text-white" />
        </div>
        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex-1">Agente IA — SEO Specialist</span>
        <span className="text-[9px] text-violet-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" /> GSC + GA4 conectados
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        {msgs.slice(0, step + 1).map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "ai" && <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-2.5 h-2.5 text-white" /></div>}
            <div className={`text-[9px] rounded-xl p-2 max-w-[88%] leading-relaxed ${m.role === "ai" ? "bg-violet-50 dark:bg-violet-900/25 text-slate-700 dark:text-slate-300 rounded-tl-none" : "bg-indigo-600 text-white rounded-tr-none"}`}>{m.text}</div>
          </motion.div>
        ))}
        {step < 3 && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0"><Bot className="w-2.5 h-2.5 text-white" /></div>
            <div className="bg-violet-50 dark:bg-violet-900/25 rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
              {[0, 0.2, 0.4].map((d, i) => <motion.span key={i} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: d }} className="w-1 h-1 rounded-full bg-violet-400" />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left gap-4">
        <span className="font-semibold text-slate-900 dark:text-white text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <p className="pb-5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────
function PricingCard({ name, slug, price, period, desc, features, cta, highlight, badge, href, originalPrice, trialDays, couponBadge }: {
  name: string; slug: string; price: string; period: string; desc: string;
  features: string[]; cta: string; highlight?: boolean; badge?: string; href: string;
  originalPrice?: string; trialDays?: number; couponBadge?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -6 }}
      className={`relative rounded-2xl p-8 flex flex-col border transition-all duration-300 ${highlight ? "bg-white dark:bg-slate-800/80 border-violet-400 dark:border-violet-500 shadow-2xl shadow-violet-500/20 ring-2 ring-violet-400/50" : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"}`}
    >
      {badge && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap">{badge}</div>}
      <div className="mb-6">
        <div className="text-xs font-black uppercase tracking-widest mb-2 text-violet-600 dark:text-violet-400">{name}</div>
        {originalPrice && (
          <div className="text-sm text-slate-400 line-through mb-0.5">{originalPrice}</div>
        )}
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-sm text-slate-500 dark:text-slate-400">R$</span>
          <span className="text-5xl font-black text-slate-900 dark:text-white">{price}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{period}</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
        {trialDays && trialDays > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            🎁 {trialDays} dias grátis
          </div>
        )}
        {couponBadge && (
          <button
            onClick={() => { navigator.clipboard.writeText(couponBadge); }}
            className="mt-2 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
          >
            🎟️ Use o Cupom {couponBadge}
          </button>
        )}
      </div>
      <div className="space-y-3 flex-1 mb-8">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-violet-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">{f}</span>
          </div>
        ))}
      </div>
      <a href={href} className="block text-center font-bold py-3.5 rounded-xl transition-all bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25">{cta}</a>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [activeMockup, setActiveMockup] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  // Fetch plans from database
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => { if (data) setDbPlans(data); });
    supabase
      .from("coupons")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => { if (data) setActiveCoupons(data); });
  }, []);

  const mockups = [
    {
      label: "Indexador", icon: Zap, mockup: <IndexerMockup />,
      badge: "Indexação automática via API",
      title: "Pare de esperar o Google decidir quando olhar suas páginas",
      desc: "Envio automático de URLs, fila inteligente com priorização e monitoramento de status — você sabe exatamente o que está no índice e por quê.",
    },
    {
      label: "SEO / GSC", icon: Search, mockup: <GSCMockup />,
      badge: "Visão completa em um painel",
      title: "Tudo o que importa em um único lugar",
      desc: "Performance por páginas e consultas, histórico de posições, detecção de canibalização, decay, cobertura de índice e oportunidades de crescimento.",
    },
    {
      label: "Agente IA", icon: Bot, mockup: <AgentMockup />,
      badge: "Diagnósticos contínuos com IA",
      title: "Um estrategista olhando seus dados o tempo todo",
      desc: "Agentes especializados analisam continuamente e mostram o que está acontecendo e o que merece atenção. Como ter um analista sênior 24h por dia.",
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveMockup(v => (v + 1) % mockups.length), 7000);
    return () => clearInterval(t);
  }, []);

  const active = mockups[activeMockup];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#080c18] text-slate-900 dark:text-white overflow-x-hidden font-sans">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#080c18]/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">Rankito</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <a href="#como-funciona" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">FAQ</a>
          </div>
          <a href="/login" className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 hover:scale-105 transition-all">
            Começar grátis <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative pt-28 pb-0 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <FloatingOrb className="absolute top-0 left-1/3 w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-[150px]" />
          <FloatingOrb className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          {/* Eyebrow */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-black px-4 py-2 rounded-full border border-violet-200 dark:border-violet-700/50">
              <Sparkles className="w-3.5 h-3.5" />
              Para quem não pode descobrir problemas tarde demais
            </div>
          </motion.div>

          {/* H1 */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-center text-5xl sm:text-6xl lg:text-[70px] font-black tracking-tight leading-[1.05] mb-6">
            Seu SEO não cai de repente.{" "}
            <span className="bg-gradient-to-r from-red-500 via-rose-500 to-orange-400 bg-clip-text text-transparent">
              Ele quebra enquanto você ainda acha que está tudo bem.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="text-center text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-4 max-w-2xl mx-auto">
            O Rankito conecta Search Console, Analytics, indexação e comportamento do usuário em um único painel e mostra, com precisão, o que está fazendo você perder ranking, tráfego e dinheiro.
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="text-center text-sm text-slate-400 dark:text-slate-500 leading-relaxed mb-8 max-w-xl mx-auto">
            A IA analisa continuamente seus dados e entrega diagnósticos claros do que mudou, por que mudou e onde agir primeiro.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <a href="/login"
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-9 py-4 rounded-2xl text-base shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group">
              <Rocket className="w-4 h-4" /> Começar agora
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#como-funciona" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold px-4 py-3.5 text-sm hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              <Play className="w-3.5 h-3.5" /> Ver demonstração
            </a>
          </motion.div>

          {/* Risk reversals */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-400 mb-12">
            {[
              { icon: Shield, text: "7 dias de garantia" },
              { icon: Lock, text: "Sem contrato" },
              { icon: Timer, text: "Ativo em 10 minutos" },
              { icon: CheckCheck, text: "Google API oficial" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-violet-500" /> {text}
              </div>
            ))}
          </motion.div>

          {/* Mockup showcase */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6 }} style={{ y: heroY }}>

            {/* Feature context above tabs */}
            <AnimatePresence mode="wait">
              <motion.div key={activeMockup} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                className="text-center mb-4">
                <span className="inline-flex items-center gap-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[11px] font-black px-3 py-1 rounded-full mb-1.5">
                  {active.badge}
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{active.desc}</p>
              </motion.div>
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 justify-center">
              {mockups.map((m, i) => (
                <button key={i} onClick={() => setActiveMockup(i)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeMockup === i ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400"}`}>
                  <m.icon className="w-3 h-3" /> {m.label}
                </button>
              ))}
            </div>

            {/* Mockup card */}
            <div className="relative max-w-2xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div key={activeMockup} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.3 }}>
                  {mockups[activeMockup].mockup}
                </motion.div>
              </AnimatePresence>
              {/* Bottom fade into stats */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#fafafa] dark:from-[#080c18] to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { end: 200, suffix: "k", label: "URLs indexadas por dia na plataforma" },
            { end: 24, suffix: "h", label: "Tempo médio de indexação (antes: 6 semanas)" },
            { end: 500, suffix: "+", label: "Profissionais e agências usando" },
            { end: 8, suffix: "h", label: "Economizadas/semana em relatórios manuais" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center">
              <div className="text-3xl font-black text-violet-600 dark:text-violet-400 mb-1"><Counter end={s.end} suffix={s.suffix} /></div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          2. DOR — Antes do Rankito
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-[#04060f] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-red-900/30 text-red-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-red-800/40">
              <AlertTriangle className="w-3.5 h-3.5" /> Se você gerencia sites ou clientes, já passou por isso
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight text-white mb-4">
              O problema não é falta de dados.{" "}
              <span className="text-red-400">É falta de interpretação estratégica.</span>
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto">
              Você abre 5 ferramentas diferentes — e mesmo assim não tem clareza.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: "📉", title: "O tráfego começa a cair.", text: "O ranking oscila. O cliente pergunta o que aconteceu. Você não tem uma resposta clara e imediata." },
              { emoji: "📊", title: "5 ferramentas abertas. Nenhuma resposta.", text: "Você alterna entre GSC, GA4, planilhas e relatórios para montar uma visão que deveria estar em um único lugar." },
              { emoji: "🤖", title: "IA genérica que não sabe nada do seu site.", text: "Usa ChatGPT para análise de SEO, mas ela não tem seus dados reais. Respostas genéricas e inúteis." },
              { emoji: "⏳", title: "Página publicada. Google não viu.", text: "Você publica conteúdo e ele fica invisível por semanas. Seu concorrente aparece no dia seguinte." },
              { emoji: "🔎", title: "Não sabe o que não está indexado.", text: "Sem visibilidade centralizada. Você só descobre o problema quando alguém reclama que a página sumiu." },
              { emoji: "💸", title: "Keywords na zona de ouro — invisíveis.", text: "Você tem dezenas na posição 8–15 com centenas de impressões. Um ajuste as colocaria no top 5. Mas você nem sabe." },
            ].map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                <span className="text-2xl shrink-0">{p.emoji}</span>
                <div>
                  <h3 className="text-sm font-black text-white mb-1">{p.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-10">
            <p className="text-xl font-black text-white mb-2">Tudo isso tem solução — e está em um único lugar.</p>
            <p className="text-slate-400 text-sm mb-6">Sem caça ao erro manual.</p>
            <ChevronDown className="w-7 h-7 text-violet-400 mx-auto animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          3. COMO FUNCIONA — 3 módulos com feature list
      ══════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-violet-200 dark:border-violet-700/50">
              <Layers className="w-3.5 h-3.5" /> Um centro de diagnóstico para tudo que impacta seu SEO
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              O Rankito não substitui suas ferramentas.{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                Ele conecta todas elas.
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl mx-auto">
              Mostra onde está o problema, onde está a oportunidade, o que precisa de atenção imediata — e o que pode esperar.
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* Module 1: Indexador */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="grid lg:grid-cols-5 gap-0 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
              <div className="lg:col-span-2 p-8 lg:p-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
                <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-black px-3 py-1.5 rounded-full mb-5 self-start">
                  <Zap className="w-3 h-3" /> Indexador Automático
                </div>
                <h3 className="text-2xl font-black mb-3">Pare de esperar o Google decidir quando olhar suas páginas.</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Envio automático via API oficial. Você passa a saber exatamente o que está no índice e o que não está — e por quê.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Envio automático de URLs via API",
                    "Fila inteligente com priorização",
                    "Agendamento de indexação",
                    "Monitoramento de status em tempo real",
                    "Inspeção individual com diagnóstico",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-3 p-6 bg-slate-50 dark:bg-slate-900/50 flex items-center">
                <IndexerMockup />
              </div>
            </motion.div>

            {/* Module 2: SEO + GSC */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="grid lg:grid-cols-5 gap-0 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
              <div className="lg:col-span-3 p-6 bg-slate-50 dark:bg-slate-900/50 flex items-center order-2 lg:order-1">
                <GSCMockup />
              </div>
              <div className="lg:col-span-2 p-8 lg:p-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-700 order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-black px-3 py-1.5 rounded-full mb-5 self-start">
                  <Search className="w-3 h-3" /> SEO & Google Search Console
                </div>
                <h3 className="text-2xl font-black mb-3">Todos os dados do Google. Com IA analisando.</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Tudo o que importa em um único lugar. Você deixa de reagir tarde e passa a antecipar movimentos.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Performance por páginas e consultas",
                    "Histórico de posições e detecção de decay",
                    "Detecção automática de canibalização",
                    "Cobertura de índice, erros e links",
                    "Oportunidades de crescimento com IA",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Module 3: Agente IA */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="grid lg:grid-cols-5 gap-0 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
              <div className="lg:col-span-2 p-8 lg:p-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
                <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-black px-3 py-1.5 rounded-full mb-5 self-start">
                  <Bot className="w-3 h-3" /> Agentes IA & Orquestrador
                </div>
                <h3 className="text-2xl font-black mb-3">Um estrategista olhando seus dados o tempo todo.</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Como ter um analista sênior monitorando seus ativos 24 horas por dia. Eles não executam mudanças — eles mostram o que está acontecendo e o que merece atenção.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Agentes especializados em SEO, técnico e conteúdo",
                    "Análise contínua dos seus dados reais",
                    "Geração de tarefas acionáveis e priorizadas",
                    "Kanban de prioridades por projeto",
                    "Relatórios multicanal — WhatsApp e e-mail",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-3 p-6 bg-slate-50 dark:bg-slate-900/50 flex items-center">
                <AgentMockup />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          4. SETUP — 3 passos
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-emerald-200 dark:border-emerald-700/50">
              <Timer className="w-3.5 h-3.5" /> Sem implementação complexa
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Como funciona
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: "1", icon: Settings, color: "from-violet-500 to-indigo-600", title: "Conecte suas contas", desc: "Vincule o Google Search Console e o Analytics via Service Account em menos de 5 minutos. Seguro e oficial.", time: "5 min" },
              { n: "2", icon: Brain, color: "from-indigo-500 to-blue-600", title: "Rankito analisa os dados", desc: "A IA cruza seus dados de indexação, posição, tráfego e comportamento — e identifica onde estão os problemas e oportunidades.", time: "automático" },
              { n: "3", icon: Bell, color: "from-violet-600 to-pink-600", title: "Receba diagnósticos acionáveis", desc: "Você recebe no painel (e no WhatsApp) o que mudou, por que mudou e o que fazer primeiro — ordenado por impacto.", time: "contínuo" },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Passo {step.n}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">⏱ {step.time}</span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-10 text-center">
            <a href="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-8 py-4 rounded-2xl text-base shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group">
              <Rocket className="w-5 h-5" /> Começar agora
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          5. PROVA SOCIAL
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-amber-200 dark:border-amber-800/30">
              <Trophy className="w-3.5 h-3.5" /> Resultados reais de quem usa o Rankito
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-3">
              Quem usou,{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">não voltou mais</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote: "Publiquei 8 artigos novos na segunda. Na terça já estavam todos indexados. Antes esperava 6 semanas sem saber se iam aparecer.",
                author: "Rafael M.", role: "Criador de conteúdo — nicho de saúde", avatar: "RM", result: "8 artigos indexados em 24h"
              },
              {
                quote: "O agente IA encontrou 14 keywords entre posição 9 e 13 com centenas de impressões. Otimizei 3 pages e em 3 semanas foram pro top 5.",
                author: "Ana Paula S.", role: "Consultora de SEO — agências", avatar: "AP", result: "+40% tráfego orgânico"
              },
              {
                quote: "Tenho 12 clientes de rank & rent. Montava relatório na mão 4h/semana. Agora o Rankito gera e manda no WhatsApp deles. Liberou tempo para fechar mais contratos.",
                author: "Carlos F.", role: "Rank & Rent — 12 contratos ativos", avatar: "CF", result: "8h economizadas/semana"
              },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col">
                <div className="flex gap-1 mb-3">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4 flex-1 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">{t.avatar}</div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{t.author}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.role}</div>
                  </div>
                  <div className="ml-auto text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/30 px-2 py-1 rounded-lg whitespace-nowrap">✓ {t.result}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          6. PLANOS
      ══════════════════════════════════════════════════════════════ */}
      <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/5 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-amber-200 dark:border-amber-800/30">
              <Clock className="w-3.5 h-3.5" /> Preços de lançamento — por tempo limitado
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3">Quanto custa ter visibilidade total do seu SEO?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto mb-8">
              Se você depende do Google para ganhar dinheiro, não pode operar sem visibilidade total.
            </p>

            {/* Monthly/Annual Toggle */}
            <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full p-1 mb-2">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${billingInterval === "monthly" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingInterval("annual")}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingInterval === "annual" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
              >
                Anual
                <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">2 meses grátis</span>
              </button>
            </div>
          </motion.div>

          <div className={`grid gap-6 mb-10 ${dbPlans.length >= 3 ? 'md:grid-cols-3' : dbPlans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'max-w-md mx-auto'} ${dbPlans.length === 4 ? 'lg:grid-cols-4' : ''}`}>
            {dbPlans.map((plan) => {
              const features: string[] = [
                `${plan.projects_limit === -1 ? "Projetos ilimitados" : plan.projects_limit + " projeto" + (plan.projects_limit > 1 ? "s" : "")}`,
                `SEO completo via Google Search Console`,
                plan.ga4_enabled ? "KPIs GA4 (sessões, conversões, receita)" : null,
                `Indexação — ${plan.indexing_daily_limit === -1 ? "sem limites" : plan.indexing_daily_limit + " URLs/dia"}`,
                `${plan.gsc_accounts_per_project === -1 ? "Contas GSC ilimitadas por projeto" : plan.gsc_accounts_per_project + " conta" + (plan.gsc_accounts_per_project > 1 ? "s" : "") + " GSC por projeto"}`,
                `Orquestrador IA (${plan.orchestrator_executions_limit === -1 ? "ilimitado" : plan.orchestrator_executions_limit + " exec/hora"})`,
                plan.ai_requests_limit !== 0 ? `Rankito IA — ${plan.ai_requests_limit === -1 ? "ilimitado" : plan.ai_requests_limit + " req/mês"}` : null,
                plan.pixel_tracking_enabled ? "Pixel de tracking próprio" : null,
                plan.whatsapp_reports_enabled ? "Relatórios via WhatsApp" : null,
                plan.white_label_enabled ? "White-label + domínio personalizado" : null,
                plan.api_access_enabled ? "API pública" : null,
                plan.webhooks_enabled ? "Webhooks" : null,
                plan.rank_rent_enabled ? "Rank & Rent" : null,
                `${plan.members_limit === -1 ? "Usuários ilimitados" : plan.members_limit + " usuário" + (plan.members_limit > 1 ? "s" : "")}`,
              ].filter(Boolean) as string[];

              const isHighlight = plan.slug === "growth";
              const ctaMap: Record<string, string> = { start: "Começar com Start →", growth: "Crescer com Growth →", pro: "Escalar com Pro →", unlimited: "Ir Unlimited →" };

              // Pricing logic based on billing interval
              const isAnnual = billingInterval === "annual";
              const hasAnnualPrice = plan.annual_price != null && plan.annual_price > 0;
              const monthlyPrice = plan.price;
              const annualTotal = hasAnnualPrice ? plan.annual_price : monthlyPrice * 10;
              const annualMonthly = annualTotal / 12;

              // Promo pricing (applies to monthly)
              const hasPromo = plan.promo_price != null && (!plan.promo_ends_at || new Date(plan.promo_ends_at) > new Date());

              let displayPrice: number;
              let originalPrice: string | undefined;
              let period: string;

              if (isAnnual) {
                displayPrice = Math.round(annualMonthly);
                originalPrice = `R$${Number(monthlyPrice).toLocaleString("pt-BR")}/mês`;
                period = "/mês no anual";
              } else {
                displayPrice = hasPromo ? plan.promo_price : monthlyPrice;
                originalPrice = hasPromo ? `R$${Number(monthlyPrice).toLocaleString("pt-BR")}/mês` : undefined;
                period = "/mês";
              }

              // Find active public coupon for this plan
              const planCoupon = activeCoupons.find(c => {
                if (c.valid_until && new Date(c.valid_until) < new Date()) return false;
                if (c.max_uses && c.uses_count >= c.max_uses) return false;
                if (c.plan_slugs && c.plan_slugs.length > 0 && !c.plan_slugs.includes(plan.slug)) return false;
                return true;
              });

              return (
                <PricingCard
                  key={plan.id}
                  name={plan.name}
                  slug={plan.slug}
                  price={Number(displayPrice).toLocaleString("pt-BR")}
                  originalPrice={originalPrice}
                  period={period}
                  desc={plan.description || ""}
                  features={features}
                  cta={plan.trial_days > 0 ? `Testar ${plan.trial_days} dias grátis` : (ctaMap[plan.slug] || `Começar com ${plan.name} →`)}
                  highlight={isHighlight}
                  badge={isHighlight ? "⭐ Mais popular" : undefined}
                  href={`/login?plan=${plan.slug}&interval=${billingInterval === "annual" ? "annual" : "monthly"}`}
                  trialDays={plan.trial_days}
                  couponBadge={planCoupon?.code}
                />
              );
            })}
          </div>

          {/* Value stack + guarantee */}
          <div className="grid sm:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-slate-900 dark:bg-slate-900/80 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-base font-black text-white mb-4">O que você leva no plano Start:</h3>
              <div className="space-y-3">
                {[
                  { item: "Indexador automático via Google API", value: "R$297/mês" },
                  { item: "Dashboard SEO + Search Console", value: "R$147/mês" },
                  { item: "Analytics GA4 integrado", value: "R$97/mês" },
                  { item: "Agente IA com dados reais", value: "R$197/mês" },
                  { item: "Relatórios automáticos no WhatsApp", value: "R$97/mês" },
                  { item: "Pixel de tracking próprio", value: "R$47/mês" },
                ].map((v, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-sm text-slate-300">{v.item}</span>
                    </div>
                    <span className="text-xs text-slate-500 line-through shrink-0">{v.value}</span>
                  </div>
                ))}
                <div className="border-t border-slate-700 pt-3 mt-3 flex items-center justify-between">
                  <span className="font-black text-white text-sm">Tudo por apenas</span>
                  <p className="text-2xl font-black text-violet-400">R$97<span className="text-sm text-slate-400">/mês</span></p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Garantia de 7 dias — sem risco</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Não ficou satisfeito? Devolvemos 100% do valor. Sem perguntas, sem burocracia, em até 24h.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {["Reembolso em até 24h", "Sem perguntas", "Cancele a qualquer momento"].map(g => (
                  <div key={g} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {g}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          7. FAQ
      ══════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-4xl font-black mb-2">Perguntas frequentes</h2>
            <p className="text-slate-500 dark:text-slate-400">As dúvidas mais comuns antes de assinar</p>
          </motion.div>
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-8 py-2">
            {[
              { q: "O indexador realmente funciona? Não é a mesma coisa que enviar sitemap?", a: "É completamente diferente. O sitemap apenas indica ao Google onde suas páginas estão — o Google decide se e quando vai visitar. A Google Indexing API envia uma solicitação ativa de indexação. O Google recebe, processa e o conteúdo aparece nas buscas em até 24 horas. É a mesma API que o Google usa para indexar notícias de grandes portais." },
              { q: "O agente IA tem acesso aos meus dados reais do Google?", a: "Sim. Os agentes se conectam diretamente ao seu Google Search Console e Google Analytics 4 via Service Account segura. Eles não usam dados genéricos — eles leem suas keywords reais, suas páginas, seus cliques e suas posições, e respondem com ações específicas para o seu site." },
              { q: "Quanto tempo leva para configurar tudo?", a: "A maioria dos usuários está ativo em menos de 10 minutos. Conectar o Google Search Console leva 5 minutos, importar as URLs leva 2 minutos e ativar o indexador automático leva mais 3. Você não precisa de programador nem de instalação técnica." },
              { q: "Funciona para qualquer tipo de site?", a: "Sim. Blogs, e-commerces, portfólios, sites institucionais, portais de notícias. A única exigência é que o site esteja vinculado ao Google Search Console — o que qualquer site profissional já deveria ter." },
              { q: "O que é o Rank & Rent no Rankito?", a: "É um módulo específico para quem cria e aluga sites rankeados no Google. Você gerencia seu portfólio de páginas, controla quais clientes estão usando cada site, faz a gestão de contratos e monitora o MRR de todo o negócio." },
              { q: "Posso cancelar quando quiser?", a: "Sim. Sem contrato de fidelidade, sem multa, sem complicação. Cancele a qualquer momento pelo próprio painel. Se cancelar nos primeiros 7 dias, devolvemos 100% do valor — sem perguntas." },
            ].map((faq, i) => <FAQItem key={i} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          8. CTA FINAL
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-900 dark:bg-[#04060f]">
        <div className="absolute inset-0 pointer-events-none">
          <FloatingOrb className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/12 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 bg-violet-900/50 text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-violet-700/50">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Rankito — clareza estratégica para quem não pode errar no SEO
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-5 text-white">
              Entre no Rankito e pare de descobrir{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                problemas tarde demais.
              </span>
            </h2>
            <p className="text-base text-slate-400 leading-relaxed mb-2 max-w-xl mx-auto">
              Se você depende do Google para ganhar dinheiro, não pode operar sem visibilidade total.
            </p>
            <p className="text-slate-500 mb-10 text-sm">
              Comece agora. Sem implementação complexa.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <a href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group">
                <Rocket className="w-5 h-5" /> Começar agora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-violet-400" /> 7 dias de garantia total</div>
              <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-violet-400" /> Sem contrato</div>
              <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Ativo em 10 minutos</div>
              <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-400" /> +500 profissionais ativos</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8 bg-[#04060f]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Rankito</span>
          </div>
          <p className="text-xs text-slate-500 text-center">
            © 2025 Rankito. Clareza estratégica para quem não pode errar no SEO.
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="/login" className="hover:text-violet-400 transition-colors">Entrar</a>
            <a href="#planos" className="hover:text-violet-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-violet-400 transition-colors">FAQ</a>
            <a href="/termos" className="hover:text-violet-400 transition-colors">Termos</a>
            <a href="/privacidade" className="hover:text-violet-400 transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
