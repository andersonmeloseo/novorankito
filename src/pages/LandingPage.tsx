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
import plansAltImage from "@/assets/landing-plans-alt.png";
import orchestratorImage from "@/assets/orchestrator-canvas.png";

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
function PricingCard({ name, price, period, desc, features, cta, highlight, badge }: {
  name: string; price: string; period: string; desc: string;
  features: string[]; cta: string; highlight?: boolean; badge?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -6 }}
      className={`relative rounded-2xl p-8 flex flex-col border transition-all duration-300 ${highlight ? "bg-gradient-to-b from-violet-600 to-indigo-700 border-violet-500 shadow-2xl shadow-violet-500/30 text-white" : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"}`}
    >
      {badge && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-black px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap">{badge}</div>}
      <div className="mb-6">
        <div className={`text-xs font-black uppercase tracking-widest mb-2 ${highlight ? "text-violet-200" : "text-violet-600 dark:text-violet-400"}`}>{name}</div>
        <div className="flex items-baseline gap-1 mb-1">
          <span className={`text-5xl font-black ${highlight ? "text-white" : "text-slate-900 dark:text-white"}`}>{price}</span>
          <span className={`text-sm ${highlight ? "text-violet-200" : "text-slate-500 dark:text-slate-400"}`}>{period}</span>
        </div>
        <p className={`text-sm leading-relaxed ${highlight ? "text-violet-200" : "text-slate-500 dark:text-slate-400"}`}>{desc}</p>
      </div>
      <div className="space-y-3 flex-1 mb-8">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${highlight ? "text-violet-200" : "text-violet-500"}`} />
            <span className={`text-sm ${highlight ? "text-violet-100" : "text-slate-600 dark:text-slate-300"}`}>{f}</span>
          </div>
        ))}
      </div>
      <a href="/login" className={`block text-center font-bold py-3.5 rounded-xl transition-all ${highlight ? "bg-white text-violet-700 hover:bg-violet-50" : "bg-violet-600 text-white hover:bg-violet-700"}`}>{cta}</a>
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
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  const mockups = [
    { label: "Indexador", icon: Zap, mockup: <IndexerMockup /> },
    { label: "SEO / GSC", icon: Search, mockup: <GSCMockup /> },
    { label: "Agente IA", icon: Bot, mockup: <AgentMockup /> },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveMockup(v => (v + 1) % mockups.length), 7000);
    return () => clearInterval(t);
  }, []);

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
            <a href="#funcionalidades" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Funcionalidades</a>
            <a href="#prova" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Resultados</a>
            <a href="#planos" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">FAQ</a>
          </div>
          <a href="/login" className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 hover:scale-105 transition-all">
            Começar agora <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          1. HERO — Centralizado, dor de perder posição
      ══════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen flex flex-col justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <FloatingOrb className="absolute top-10 left-1/4 w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-[150px]" />
          <FloatingOrb className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[130px]" />
          <FloatingOrb className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto relative w-full text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-black px-5 py-2.5 rounded-full border border-violet-200 dark:border-violet-700/50 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Indexação • SEO • Agentes IA 24/7 • Analytics • WhatsApp — tudo em um lugar
            </div>
          </motion.div>

          {/* H1 */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.04] mb-6 mx-auto">
            Pare de{" "}
            <span className="bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 bg-clip-text text-transparent">
              perder posição
            </span>{" "}
            no Google enquanto dorme
          </motion.h1>

          {/* H2 */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 leading-relaxed mb-4 max-w-3xl mx-auto">
            O Rankito monitora seu site, indexa suas páginas automaticamente via{" "}
            <strong className="text-slate-800 dark:text-slate-200">Google API oficial</strong>, detecta quedas de posição em tempo real e envia{" "}
            <strong className="text-slate-800 dark:text-slate-200">relatórios no WhatsApp</strong> — tudo sem você precisar abrir o Search Console.
          </motion.p>

          {/* Trust line */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            Usado por +500 profissionais de SEO, agências e criadores de conteúdo no Brasil
          </motion.p>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <a href="/login"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group">
              <Rocket className="w-5 h-5" /> Começar grátis agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#rankito-ai" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold px-4 py-4 text-base hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              Ver como funciona <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Risk reversals */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 dark:text-slate-400 mb-14">
            {[
              { icon: Shield, text: "7 dias de garantia total" },
              { icon: Lock, text: "Sem contrato" },
              { icon: Timer, text: "Ativo em 10 minutos" },
              { icon: CheckCheck, text: "Google API oficial" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-violet-500" /> {text}
              </div>
            ))}
          </motion.div>

          {/* Live mockup tabs — centered */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }} style={{ y: heroY }} className="relative max-w-2xl mx-auto">
            <div className="flex gap-2 mb-3 flex-wrap justify-center">
              {mockups.map((m, i) => (
                <button key={i} onClick={() => setActiveMockup(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeMockup === i ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400"}`}>
                  <m.icon className="w-3 h-3" /> {m.label}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={activeMockup} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.3 }}>
                {mockups[activeMockup].mockup}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Stats bar */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="w-full mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { end: 200, suffix: "k", label: "URLs indexadas por dia na plataforma" },
              { end: 24, suffix: "h", label: "Tempo médio de indexação (antes: 6 semanas)" },
              { end: 500, suffix: "+", label: "Profissionais e agências usando" },
              { end: 8, suffix: "h", label: "Economizadas/semana em relatórios manuais" },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center">
                <div className="text-3xl font-black text-violet-600 dark:text-violet-400 mb-1"><Counter end={s.end} suffix={s.suffix} /></div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          2. DOR — Quem é você antes do Rankito
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-[#04060f] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-red-900/30 text-red-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-red-800/40">
              <AlertTriangle className="w-3.5 h-3.5" /> Isso acontece com quem gerencia SEO sem uma plataforma integrada
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4 text-white">
              Você <span className="text-red-400">perde tempo e dinheiro</span>{" "}
              resolvendo o que uma ferramenta deveria resolver
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Não é culpa sua — é que você está usando 4 ferramentas separadas para fazer algo que devia ser centralizado.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              {
                emoji: "⏳", title: "Página publicada. Sumiu no vácuo.",
                text: "Você publica um conteúdo novo e ele fica invisível por 2 a 6 semanas porque o Google ainda não passou. Seu concorrente que usa indexação via API já apareceu no dia seguinte."
              },
              {
                emoji: "📊", title: "Google Search Console em 10 abas diferentes.",
                text: "Fica alternando entre GSC, GA4 e planilhas para montar uma visão que deveria estar em um único dashboard. São horas gastas só para entender o que está acontecendo no seu site."
              },
              {
                emoji: "🤖", title: "Paga IA genérica e ela não sabe nada do seu site.",
                text: "Usa ChatGPT para análise de SEO, mas ela não tem acesso aos seus dados reais. Te dá respostas genéricas. Um agente treinado nos seus dados do GSC e GA4 te daria ações específicas."
              },
              {
                emoji: "📱", title: "Relatório para cliente leva 4 horas para montar.",
                text: "Toda semana você monta na mão: exporta planilha do GSC, atualiza no Google Sheets, formata, manda pro cliente. Um processo que deveria ser automático drena seu tempo de estratégia."
              },
              {
                emoji: "🔎", title: "Não sabe quais páginas estão indexadas — e quais não estão.",
                text: "Sem visibilidade centralizada de quais URLs estão indexadas, com erro ou bloqueadas. Você só descobre o problema quando alguém reclama que a página não aparece no Google."
              },
              {
                emoji: "💸", title: "Perde cliques para páginas que estão na posição 11.",
                text: "Você tem dezenas de keywords entre posição 8-15 — a zona de ouro. Com pequenos ajustes de on-page, elas subiriam para o top 5. Mas você nem sabe que elas existem porque não monitora isso."
              },
            ].map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <span className="text-2xl shrink-0 mt-0.5">{p.emoji}</span>
                <div>
                  <div className="text-sm font-black text-white mb-1">{p.title}</div>
                  <p className="text-sm text-slate-400 leading-relaxed">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-12">
            <p className="text-2xl font-black text-white mb-2">
              Tudo isso tem solução — e está em um único lugar.
            </p>
            <p className="text-slate-400 text-base mb-6">O Rankito centraliza, automatiza e entrega resultado direto no seu WhatsApp.</p>
            <ChevronDown className="w-8 h-8 text-violet-400 mx-auto animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          3. RANKITO AI — Orquestrador de Agentes
      ══════════════════════════════════════════════════════════════ */}
      <section id="rankito-ai" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#080c18]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-700/12 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto relative">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-violet-900/40 text-violet-300 text-xs font-black px-5 py-2.5 rounded-full border border-violet-700/50 mb-6">
              <Bot className="w-3.5 h-3.5" /> Rankito AI — Orquestrador de Agentes Autônomos
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-5 text-white">
              Seus agentes de IA trabalham como{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                funcionários 24/7
              </span>
            </h2>
            <p className="text-slate-400 text-xl max-w-3xl mx-auto leading-relaxed">
              Sem você precisar abrir o Search Console, o GA4 ou o projeto. O sistema analisa tudo, detecta oportunidades, faz relatórios e traz insights — sem mimimi, sem reclamar, sem faltar, sem problema algum.
            </p>
          </motion.div>

          {/* Canvas Image */}
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="relative mb-12 rounded-2xl overflow-hidden border border-violet-700/30 shadow-2xl shadow-violet-900/40 max-w-5xl mx-auto">
            {/* Glow effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080c18] via-transparent to-transparent z-10 pointer-events-none" style={{ background: "linear-gradient(to top, #080c18 0%, transparent 30%)" }} />
            <div className="absolute inset-0 ring-1 ring-inset ring-violet-500/20 rounded-2xl z-20 pointer-events-none" />
            <img
              src={orchestratorImage}
              alt="Canvas do Orquestrador Rankito AI com agentes SEO em nodes conectados"
              className="w-full h-auto block"
            />
            {/* Floating live badge */}
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-violet-500/30 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">Orquestrador rodando agora</span>
            </div>
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-violet-500/30 rounded-xl px-3 py-2">
              <Cpu className="w-3 h-3 text-violet-400" />
              <span className="text-xs font-bold text-violet-300">5 agentes ativos</span>
            </div>
          </motion.div>

          {/* What agents do — 3 columns */}
          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {[
              {
                icon: Brain,
                color: "from-violet-500 to-indigo-600",
                bg: "bg-violet-900/20 border-violet-700/30",
                title: "Analisa. Sem você pedir.",
                desc: "O agente conecta ao seu GSC e GA4, lê os dados reais e identifica automaticamente keywords caindo, páginas com oportunidade e problemas de indexação — sem você abrir nenhuma ferramenta.",
              },
              {
                icon: Bell,
                color: "from-amber-500 to-orange-500",
                bg: "bg-amber-900/20 border-amber-700/30",
                title: "Alerta. Antes do estrago.",
                desc: "Queda de posição? Erro de indexação? Página fora do índice? O agente detecta e manda alerta no WhatsApp instantaneamente — você age antes de perder tráfego.",
              },
              {
                icon: MessageSquare,
                color: "from-emerald-500 to-teal-500",
                bg: "bg-emerald-900/20 border-emerald-700/30",
                title: "Reporta. Toda semana.",
                desc: "Segunda-feira você acorda com o relatório da semana já no WhatsApp: posições, cliques, top oportunidades e o checklist de ações priorizadas por impacto — pronto para executar.",
              },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className={`rounded-2xl p-6 border ${c.bg}`}>
                <div className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} items-center justify-center mb-4`}>
                  <c.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-lg font-black text-white mb-2">{c.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Bottom proof line */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="max-w-3xl mx-auto bg-violet-900/20 border border-violet-700/30 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Sem precisar ficar olhando dashboards</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Sem relatório manual</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Sem monitorar posições na mão</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Agentes ativos 24/7, 365 dias</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          4. FUNCIONALIDADES REAIS — O que está dentro
      ══════════════════════════════════════════════════════════════ */}
      <section id="funcionalidades" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-violet-200 dark:border-violet-700/50">
              <Layers className="w-3.5 h-3.5" /> Tudo que o Rankito faz pelo seu SEO
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Uma plataforma.{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                Todos os módulos que você precisa.
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Cada módulo resolve um problema real do dia a dia de quem gerencia SEO — do indexador ao relatório no WhatsApp.
            </p>
          </motion.div>

          {/* Feature 1: Indexação */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-black px-3 py-1.5 rounded-full mb-4">
                <Zap className="w-3 h-3" /> Módulo 1 — Indexador Automático
              </div>
              <h3 className="text-3xl font-black mb-4">Sua página publicada hoje aparece no Google amanhã</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Sem o Rankito, o Google pode levar de 2 a 6 semanas para descobrir seu conteúdo. Com o Rankito, você usa a <strong className="text-slate-800 dark:text-slate-200">Google Indexing API oficial</strong> para enviar suas URLs diretamente — e elas aparecem nas buscas em até 24 horas.
              </p>
              <div className="space-y-3 mb-6">
                {[
                  { icon: Zap, text: "Envio automático via Google Indexing API", detail: "A mesma API que o Google usa internamente" },
                  { icon: RefreshCw, text: "Agendamento diário automático", detail: "Configure uma vez. A IA escolhe as URLs mais relevantes" },
                  { icon: Activity, text: "Dashboard de status em tempo real", detail: "Veja quais URLs foram indexadas, têm erro ou estão na fila" },
                  { icon: AlertCircle, text: "Alertas de erros de indexação", detail: "Notificação imediata quando uma URL falha" },
                  { icon: BarChart, text: "Relatório de cobertura do GSC", detail: "Entenda por que páginas não estão no índice do Google" },
                ].map(({ icon: Icon, text, detail }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{text}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <IndexerMockup />
            </motion.div>
          </div>

          {/* Feature 2: SEO + GSC */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-2 lg:order-1">
              <GSCMockup />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-black px-3 py-1.5 rounded-full mb-4">
                <Search className="w-3 h-3" /> Módulo 2 — SEO & Google Search Console
              </div>
              <h3 className="text-3xl font-black mb-4">Todos os dados do Google. Em um dashboard. Com IA analisando.</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Conecte o GSC e GA4 e veja tudo em um lugar só: queries, posições, CTR, dispositivos, países, histórico de keywords. E a IA destaca automaticamente <strong className="text-slate-800 dark:text-slate-200">onde está o dinheiro que você ainda não está pegando</strong>.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Search, text: "Queries com cliques, impressões, CTR e posição", detail: "Filtros por página, device, país e período" },
                  { icon: TrendingDown, text: "Detecção automática de canibalização", detail: "Identifica páginas competindo pela mesma keyword" },
                  { icon: Activity, text: "Decaimento de conteúdo com alertas", detail: "Aviso quando um artigo começa a perder posição" },
                  { icon: Target, text: "Keywords na zona de ouro (pos. 8–15)", detail: "Oportunidades prontas para otimização rápida" },
                  { icon: FileSearch, text: "Inspeção de URL e cobertura de índice", detail: "Veja o status exato de cada URL no Google" },
                  { icon: Link2, text: "Relatório de links e sitemaps", detail: "Monitore backlinks e status dos sitemaps enviados" },
                ].map(({ icon: Icon, text, detail }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{text}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Feature 3: Agentes IA */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-black px-3 py-1.5 rounded-full mb-4">
                <Bot className="w-3 h-3" /> Módulo 3 — Agentes de IA + Orquestrador
              </div>
              <h3 className="text-3xl font-black mb-4">IA que lê seus dados reais e age — não uma IA genérica</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Os agentes do Rankito têm acesso direto ao seu GSC e GA4. Eles não respondem com achismos — respondem com base nos <strong className="text-slate-800 dark:text-slate-200">seus dados, suas páginas, suas keywords</strong>. E o orquestrador executa as tarefas automaticamente no horário que você definir.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Brain, text: "Análise real de SEO com dados do GSC e GA4", detail: "Identifica gaps, oportunidades e prioridades" },
                  { icon: MessageSquare, text: "Relatórios automáticos por WhatsApp toda semana", detail: "Resumo de posições, cliques e próximas ações" },
                  { icon: Bell, text: "Alertas instantâneos de queda de posição", detail: "Notificação no WhatsApp antes do dano ser grave" },
                  { icon: Cpu, text: "Orquestrador com múltiplos agentes especializados", detail: "SEO, analytics, conteúdo e performance em paralelo" },
                  { icon: Clock, text: "Agendamento de execuções por hora ou por dia", detail: "Configure frequência e o sistema cuida do resto" },
                ].map(({ icon: Icon, text, detail }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{text}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <AgentMockup />
            </motion.div>
          </div>

          {/* Mais módulos */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h3 className="text-2xl font-black mb-2">E muito mais — tudo incluído no plano</h3>
            <p className="text-slate-500 dark:text-slate-400">Sem integrações separadas. Sem custos extras. Tudo funcionando junto.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: BarChart3,
                color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                title: "Analytics GA4 Completo",
                items: [
                  "KPIs executivos: sessões, receita, conversões",
                  "Canais de aquisição e comparação de períodos",
                  "Funil de e-commerce com produto e receita",
                  "Dados por dispositivo, país e cidade",
                ]
              },
              {
                icon: MousePointerClick,
                color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
                title: "Tracking & Conversões",
                items: [
                  "Pixel de rastreamento próprio (sem depender do GTM)",
                  "Heatmaps de clique e scroll por página",
                  "Jornada do usuário e análise de sessões",
                  "Integração com Google Ads e Meta Ads via UTM",
                ]
              },
              {
                icon: DollarSign,
                color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                title: "Rank & Rent",
                items: [
                  "Portfólio de páginas com status e tráfego",
                  "Gestão de contratos e clientes",
                  "Controle de MRR e faturas",
                  "Dashboard financeiro do negócio",
                ]
              },
              {
                icon: Globe,
                color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
                title: "White-label & API",
                items: [
                  "Plataforma com sua marca e domínio",
                  "API pública para integração com seu sistema",
                  "Webhooks para automações externas",
                  "Multi-usuário com controle de permissões",
                ]
              },
            ].map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <div className={`inline-flex p-3 rounded-xl mb-4 ${b.color}`}><b.icon className="w-5 h-5" /></div>
                <h4 className="text-base font-black mb-4 text-slate-900 dark:text-white">{b.title}</h4>
                <div className="space-y-2">
                  {b.items.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600 dark:text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          4. COMO FUNCIONA — Setup em 10 minutos
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-emerald-200 dark:border-emerald-700/50">
              <Timer className="w-3.5 h-3.5" /> Ativo em 10 minutos — sem código, sem técnico
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Configure uma vez.{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Receba resultado toda semana.
              </span>
            </h2>
          </motion.div>

          <div className="relative">
            <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-gradient-to-b from-violet-500 via-indigo-500 to-emerald-500 hidden sm:block" />
            <div className="space-y-6">
              {[
                { n: "1", icon: Settings, title: "Conecte o Google Search Console", desc: "Vincule via Service Account em menos de 5 minutos. É a mesma conta que você já usa no Google — a conexão é segura e oficial.", time: "⏱ 5 min" },
                { n: "2", icon: Database, title: "Importe suas URLs e veja o status de indexação", desc: "O Rankito importa automaticamente todas as páginas do seu site e mostra quais estão indexadas, com erro de cobertura ou esperando na fila.", time: "⏱ 2 min" },
                { n: "3", icon: Bot, title: "Ative os agentes e o indexador automático", desc: "Configure o horário da indexação diária e o agente IA começa a analisar seu site. A partir daí, você recebe relatório no WhatsApp toda semana.", time: "⏱ 3 min" },
              ].map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }}
                  className="relative flex items-start gap-6 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 pl-8 ml-0 sm:ml-16">
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 sm:flex hidden w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 items-center justify-center text-white text-xl font-black shadow-lg shadow-violet-500/30">
                    {step.n}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                    <step.icon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{step.title}</h3>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">{step.time}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-10 text-center">
            <a href="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-8 py-4 rounded-2xl text-base shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group">
              <Rocket className="w-5 h-5" /> Começar agora — grátis por 7 dias
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          5. PROVA SOCIAL
      ══════════════════════════════════════════════════════════════ */}
      <section id="prova" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-amber-200 dark:border-amber-800/30">
              <Trophy className="w-3.5 h-3.5" /> Resultados reais de quem usa o Rankito hoje
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Quem usou,{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">não voltou mais</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                quote: "Publiquei 8 artigos novos na segunda. Na terça já estavam todos indexados no Google. Antes esperava 6 semanas sem saber se iam aparecer. O indexador automático mudou completamente minha produtividade.",
                author: "Rafael M.", role: "Criador de conteúdo • Nicho de saúde", avatar: "RM", result: "✓ 8 artigos indexados em 24h"
              },
              {
                quote: "O agente IA encontrou 14 keywords que eu tinha entre posição 9 e 13, com centenas de impressões cada. Otimizei o meta title de 3 páginas e em 3 semanas elas foram para o top 5. Isso é dado real virando ação.",
                author: "Ana Paula S.", role: "Consultora de SEO • Agências", avatar: "AP", result: "✓ +40% tráfego orgânico"
              },
              {
                quote: "Tenho 12 clientes de rank & rent. Antes montava relatório toda semana na mão — 4h gastas só nisso. Agora o Rankito gera automático e manda no WhatsApp deles. Liberei tempo para fechar mais contratos.",
                author: "Carlos F.", role: "Rank & Rent • 12 contratos ativos", avatar: "CF", result: "✓ 8h economizadas/semana"
              },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col">
                <div className="inline-flex self-start bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-black px-3 py-1.5 rounded-full mb-4 border border-emerald-200/50 dark:border-emerald-700/30">{t.result}</div>
                <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-5 italic flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">{t.avatar}</div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{t.author}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          6. PLANOS
      ══════════════════════════════════════════════════════════════ */}
      <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/5 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-amber-200 dark:border-amber-800/30">
              <Clock className="w-3.5 h-3.5" /> Preços de lançamento — por tempo limitado
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3">Quanto custa ter o Google trabalhando para você?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto mb-2">
              Uma única posição a mais no Google pode valer <strong className="text-slate-800 dark:text-slate-200">R$10.000+ por mês</strong> em faturamento. O Rankito Start começa em R$97.
            </p>
          </motion.div>

          {/* Plans image */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="mb-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl max-w-4xl mx-auto">
            <img src={plansAltImage} alt="Comparação de planos Rankito" className="w-full h-auto" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <PricingCard
              name="Start"
              price="R$97"
              period="/mês"
              desc="Para freelancers e donos de site que querem indexação automática e dados reais do Google."
              features={[
                "3 projetos",
                "SEO completo via Google Search Console",
                "KPIs GA4 (sessões, conversões, receita)",
                "Indexação automática — 200 URLs/dia",
                "1 conta GSC de indexação por projeto",
                "Orquestrador IA (5 execuções/hora)",
                "Pixel de tracking próprio",
                "1 usuário",
              ]}
              cta="Começar com Start →"
            />
            <PricingCard
              name="Growth"
              price="R$297"
              period="/mês"
              desc="Para profissionais e agências que gerenciam múltiplos projetos e precisam de IA + WhatsApp."
              features={[
                "10 projetos",
                "SEO + GA4 + Analytics completos",
                "Indexação — 800 URLs/dia",
                "Até 4 contas GSC por projeto",
                "Agentes IA + relatórios no WhatsApp",
                "Orquestrador IA (20 execuções/hora)",
                "Pixel v4.1 + Heatmaps + Rank & Rent",
                "5 usuários",
              ]}
              cta="Crescer com Growth →"
              highlight
              badge="⭐ Mais popular"
            />
            <PricingCard
              name="Unlimited"
              price="R$697"
              period="/mês"
              desc="Para agências com escala total, white-label, API e sem limites de indexação."
              features={[
                "Projetos ilimitados",
                "Tudo do Growth",
                "Contas GSC ilimitadas por projeto",
                "Indexação sem limites diários",
                "Orquestrador IA ilimitado",
                "White-label + domínio personalizado",
                "API pública + Webhooks",
                "Usuários ilimitados + suporte prioritário",
              ]}
              cta="Escalar com Unlimited →"
            />
          </div>

          {/* Value stack + guarantee */}
          <div className="grid sm:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-slate-900 dark:bg-slate-900/80 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">O que você leva hoje no plano Start:</h3>
              <div className="space-y-3">
                {[
                  { item: "Indexador automático via Google API", value: "R$297/mês" },
                  { item: "Dashboard SEO + Search Console completo", value: "R$147/mês" },
                  { item: "Analytics GA4 integrado", value: "R$97/mês" },
                  { item: "Agente IA com dados reais do seu site", value: "R$197/mês" },
                  { item: "Relatórios automáticos por WhatsApp", value: "R$97/mês" },
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
                  <span className="font-black text-white">Tudo por apenas</span>
                  <div className="text-2xl font-black text-violet-400">R$97<span className="text-sm text-slate-400">/mês</span></div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Garantia de 7 dias — sem risco</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Não ficou satisfeito por qualquer motivo? Devolvemos 100% do valor. Sem perguntas, sem burocracia, direto na sua conta em até 24h.
              </p>
              <div className="flex flex-col gap-2 w-full">
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
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-4xl font-black mb-3">Perguntas frequentes</h2>
            <p className="text-slate-500 dark:text-slate-400">As dúvidas mais comuns antes de assinar</p>
          </motion.div>

          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-8 py-2">
            {[
              { q: "O indexador realmente funciona? Não é a mesma coisa que enviar sitemap?", a: "É completamente diferente. O sitemap apenas indica ao Google onde suas páginas estão — o Google decide se e quando vai visitar. A Google Indexing API envia uma solicitação ativa de indexação. O Google recebe, processa e o conteúdo aparece nas buscas em até 24 horas. É a mesma API que o Google usa para indexar notícias de grandes portais." },
              { q: "O agente IA tem acesso aos meus dados reais do Google?", a: "Sim. Os agentes se conectam diretamente ao seu Google Search Console e Google Analytics 4 via Service Account segura. Eles não usam dados genéricos — eles leem suas keywords reais, suas páginas, seus cliques e suas posições, e respondem com ações específicas para o seu site." },
              { q: "Quanto tempo leva para configurar tudo?", a: "A maioria dos usuários está ativo em menos de 10 minutos. Conectar o Google Search Console leva 5 minutos, importar as URLs leva 2 minutos e ativar o indexador automático leva mais 3. Você não precisa de programador nem de instalação técnica." },
              { q: "Funciona para qualquer tipo de site?", a: "Sim. Blogs, e-commerces, portfólios, sites institucionais, portais de notícias. A única exigência é que o site esteja vinculado ao Google Search Console — o que qualquer site profissional já deveria ter." },
              { q: "O que é o Rank & Rent no Rankito?", a: "É um módulo específico para quem cria e aluga sites rankeados no Google. Você gerencia seu portfólio de páginas, controla quais clientes estão usando cada site, faz a gestão de contratos e monitora o MRR (receita recorrente mensal) de todo o negócio." },
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
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Cada dia sem indexação automática é tráfego que você perde para o concorrente
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-white">
              Pare de publicar{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                e rezar para o Google achar.
              </span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed mb-4 max-w-xl mx-auto">
              Com o Rankito, você indexa com autoridade, monitora com dados reais e recebe relatório toda semana — tudo por{" "}
              <strong className="text-white">R$97/mês</strong>.
            </p>
            <p className="text-slate-500 mb-10 text-sm">
              Uma hora de consultoria SEO custa R$300. O Rankito inteiro custa R$97/mês.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <a href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group">
                <Rocket className="w-5 h-5" /> Começar agora — grátis por 7 dias
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
            © 2025 Rankito. Indexação automática, SEO com IA e analytics completo em uma plataforma.
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="/login" className="hover:text-violet-400 transition-colors">Entrar</a>
            <a href="#planos" className="hover:text-violet-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-violet-400 transition-colors">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
