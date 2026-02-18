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
  Gauge, Timer, CheckCheck, ChevronUp
} from "lucide-react";
import plansImage from "@/assets/landing-plans.png";

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

// ─── Typing Animation ───────────────────────────────────────────────────────

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

// ─── AI Indexer Mockup ─────────────────────────────────────────────────────
function IndexerMockup() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1200);
    return () => clearInterval(t);
  }, []);

  const urls = [
    { url: "/blog/seo-tecnico-2025", status: "indexed" },
    { url: "/servicos/consultoria", status: "indexed" },
    { url: "/blog/link-building", status: "indexing" },
    { url: "/cases/clinica-medica", status: "queued" },
    { url: "/blog/schema-markup", status: "queued" },
  ];

  return (
    <div className="bg-white dark:bg-[#0d1220] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
      {/* Browser bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono flex-1">rankito.io/indexing</span>
        <span className="text-[9px] text-violet-500 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" /> AO VIVO
        </span>
      </div>
      <div className="p-5">
        {/* Header stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "INDEXADAS HOJE", value: tick % 3 === 0 ? "127" : tick % 3 === 1 ? "128" : "129", color: "text-indigo-500" },
            { label: "LIMITE DIÁRIO", value: "200", color: "text-slate-500" },
            { label: "TAXA SUCESSO", value: "98.4%", color: "text-violet-500" },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center">
              <div className="text-[8px] font-black tracking-widest text-slate-400 uppercase mb-1">{s.label}</div>
              <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[9px] text-slate-400 mb-1.5">
            <span>Progresso diário</span>
            <span>{tick % 3 === 0 ? "63.5" : tick % 3 === 1 ? "64.0" : "64.5"}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              animate={{ width: `${63 + (tick % 3) * 0.5}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>

        {/* URL list */}
        <div className="space-y-1.5">
          {urls.map((u, i) => (
            <motion.div
              key={u.url}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg px-3 py-2"
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                u.status === "indexed" ? "bg-violet-500" :
                u.status === "indexing" ? "bg-amber-400 animate-pulse" :
                "bg-slate-300 dark:bg-slate-600"
              }`} />
              <span className="text-[9px] font-mono text-slate-600 dark:text-slate-300 flex-1 truncate">{u.url}</span>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                u.status === "indexed" ? "text-violet-600 bg-violet-50 dark:bg-violet-900/30" :
                u.status === "indexing" ? "text-amber-600 bg-amber-50 dark:bg-amber-900/30" :
                "text-slate-400 bg-slate-100 dark:bg-slate-700/50"
              }`}>
                {u.status === "indexed" ? "✓ INDEXADA" : u.status === "indexing" ? "⟳ ENVIANDO" : "⏳ FILA"}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Auto badge */}
        <div className="mt-4 flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-700/40 rounded-xl p-3">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-[9px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-wider">IA Automática</div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400">Próximo envio: <strong className="text-slate-700 dark:text-slate-300">amanhã às 08:00</strong> — 71 URLs na fila</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Agent Mockup ──────────────────────────────────────────────────────
function AIMockupFull() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(v => (v + 1) % 4), 2500);
    return () => clearInterval(t);
  }, []);

  const messages = [
    { role: "ai", text: "📊 Analisei seu site. Encontrei 18 keywords na posição 8–15 — zona de ouro para ganho rápido de tráfego." },
    { role: "user", text: "Quais páginas otimizar primeiro?" },
    { role: "ai", text: "🎯 Prioridade 1: /blog/seo-local (pos. 9, 820 imp/mês). Com 3 ajustes de on-page, você pode ir ao top 3 em 2 semanas." },
    { role: "ai", text: "📱 Relatório enviado por WhatsApp! Já incluí o checklist de otimização com as tarefas prioritárias." },
  ];

  return (
    <div className="bg-white dark:bg-[#0d1220] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] text-slate-500 font-mono flex-1">rankito.io/ai-agent</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-800 dark:text-white">SEO Specialist AI</div>
            <div className="text-[9px] text-violet-500">● Online — Analisando seu site</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="text-[8px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">Integrado com GSC + GA4</div>
          </div>
        </div>

        <div className="space-y-3 mb-3">
          {messages.slice(0, step + 1).map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "ai" && (
                <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className={`text-[10px] rounded-xl p-2.5 max-w-[85%] leading-relaxed ${
                m.role === "ai"
                  ? "bg-violet-50 dark:bg-violet-900/25 text-slate-700 dark:text-slate-300 rounded-tl-none"
                  : "bg-indigo-600 text-white rounded-tr-none"
              }`}>
                {m.text}
              </div>
            </motion.div>
          ))}
          {step < 3 && (
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                <Bot className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/25 rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="w-1 h-1 rounded-full bg-violet-400" />
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1 h-1 rounded-full bg-violet-400" />
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1 h-1 rounded-full bg-violet-400" />
              </div>
            </div>
          )}
        </div>

        {/* Agents strip */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { emoji: "🔍", name: "SEO", active: true },
            { emoji: "📈", name: "Growth", active: false },
            { emoji: "🎯", name: "Analytics", active: false },
          ].map(a => (
            <div key={a.name} className={`rounded-lg p-1.5 text-center text-[8px] font-bold ${a.active ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" : "bg-slate-50 dark:bg-slate-800/50 text-slate-400"}`}>
              {a.emoji} {a.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SEO Mockup ──────────────────────────────────────────────────────────
function SeoMockup() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans rounded-b-2xl">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Search className="w-4 h-4 text-violet-600" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">SEO — Google Search Console</span>
        <span className="ml-auto text-[10px] text-violet-500 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">● Conectado</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[["CLIQUES","774","+43.6%",true],["IMPRESSÕES","20.2K","+27.8%",true],["CTR","3.8%","+12%",true],["POSIÇÃO","8","-6.4%",false]].map(([l,v,d,up]) => (
          <div key={l as string} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="text-[8px] font-bold tracking-wider text-slate-400 uppercase">{l}</div>
            <div className="text-base font-black text-slate-900 dark:text-white">{v}</div>
            <div className={`text-[9px] font-semibold ${up ? "text-indigo-500" : "text-red-400"}`}>{d}</div>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-3">
        <div className="text-[9px] font-semibold text-slate-400 mb-2">Tendência 28 dias</div>
        <div className="flex items-end gap-1 h-12">
          {[30,45,38,60,52,70,65,80,72,90,85,95].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-violet-500/60" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────
function PricingCard({
  name, price, period, desc, features, cta, highlight, badge
}: {
  name: string; price: string; period: string; desc: string;
  features: string[]; cta: string; highlight?: boolean; badge?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6 }}
      className={`relative rounded-2xl p-8 flex flex-col border transition-all duration-300 ${
        highlight
          ? "bg-gradient-to-b from-violet-600 to-indigo-700 border-violet-500 shadow-2xl shadow-violet-500/30 text-white"
          : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
      }`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-black px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap">
          {badge}
        </div>
      )}
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
      <a
        href="/login"
        className={`block text-center font-bold py-3.5 rounded-xl transition-all ${
          highlight
            ? "bg-white text-violet-700 hover:bg-violet-50"
            : "bg-violet-600 text-white hover:bg-violet-700"
        }`}
      >
        {cta}
      </a>
    </motion.div>
  );
}

// ─── Testimonial ─────────────────────────────────────────────────────────
function Testimonial({ quote, author, role, avatar }: { quote: string; author: string; role: string; avatar: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6"
    >
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-5 italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {avatar}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{author}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{role}</div>
        </div>
      </div>
    </motion.div>
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Feature Card (AI / Indexer highlight) ────────────────────────────────
function FeatureHighlight({ icon: Icon, tag, title, description, items, accent }: {
  icon: any; tag: string; title: string; description: string; items: { icon: any; text: string }[]; accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 overflow-hidden"
    >
      {/* background glow */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2 ${accent}`} />
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-xs font-black px-3 py-1.5 rounded-full mb-5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
          <Icon className="w-3 h-3" /> {tag}
        </div>
        <h3 className="text-2xl sm:text-3xl font-black mb-3 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-7 leading-relaxed">{description}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-violet-100 dark:bg-violet-900/50">
                <item.icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [activeModule, setActiveModule] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  const MODULE_COUNT = 3;

  // Auto-cycle mockups
  useEffect(() => {
    const t = setInterval(() => setActiveModule(v => (v + 1) % MODULE_COUNT), 6000);
    return () => clearInterval(t);
  }, []);

  const modules = [
    { label: "Indexação IA", icon: Zap, mockup: <IndexerMockup />, browserLabel: "indexing" },
    { label: "Agente IA", icon: Bot, mockup: <AIMockupFull />, browserLabel: "ai-agent" },
    { label: "SEO & GSC", icon: Search, mockup: <SeoMockup />, browserLabel: "seo" },
  ];

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
            <a href="#ia" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">IA & Agentes</a>
            <a href="#indexador" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Indexador</a>
            <a href="#planos" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">FAQ</a>
          </div>
          <a href="/login" className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 hover:scale-105 transition-all">
            Começar agora <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-28 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen flex flex-col justify-center">
        {/* BG glows */}
        <div className="absolute inset-0 pointer-events-none">
          <FloatingOrb className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-violet-600/12 rounded-full blur-[140px]" />
          <FloatingOrb className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <FloatingOrb className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-emerald-600/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto relative w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left: copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-7 border border-violet-200 dark:border-violet-700/50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                A plataforma de SEO com IA mais completa do Brasil
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-[3.8rem] xl:text-[4.5rem] font-black tracking-tight leading-[1.05] mb-6">
                Indexe mais rápido.<br />
                Rankeie com{" "}
                <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-700 bg-clip-text text-transparent">
                  IA autônoma.
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-lg"
              >
                Donos de sites, profissionais de SEO e agências que não querem perder <strong className="text-slate-800 dark:text-slate-200">nenhum dado, nenhuma oportunidade e nenhum clique</strong> para a concorrência.
              </motion.p>

              {/* ICP pills */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap gap-2 mb-9"
              >
                {[
                  { icon: Globe, text: "Donos de sites" },
                  { icon: Search, text: "Profissionais de SEO" },
                  { icon: Building2, text: "Agências de marketing" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Icon className="w-3 h-3 text-violet-500" /> {text}
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-start gap-4 mb-10"
              >
                <a
                  href="/login"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-8 py-4 rounded-2xl text-base shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group"
                >
                  <Rocket className="w-5 h-5" /> Começar gratuitamente
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#ia"
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold px-4 py-4 text-base hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  Ver como funciona <ChevronRight className="w-4 h-4" />
                </a>
              </motion.div>

              {/* Trust strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-5 text-xs text-slate-500 dark:text-slate-400"
              >
                {[
                  { icon: Shield, text: "Dados direto do Google" },
                  { icon: Lock, text: "Sem contrato" },
                  { icon: Zap, text: "Configuração em 10 min" },
                  { icon: Users, text: "+500 profissionais" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-violet-500" /> {text}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: live mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ y: heroY }}
              className="relative"
            >
              {/* Module tabs */}
              <div className="flex gap-2 mb-4 justify-center lg:justify-start">
                {modules.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveModule(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeModule === i
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400"
                    }`}
                  >
                    <m.icon className="w-3 h-3" /> {m.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  {modules[activeModule].mockup}
                </motion.div>
              </AnimatePresence>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute -left-4 top-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <CheckCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">129 URLs indexadas</div>
                  <div className="text-[9px] text-slate-400">agora mesmo</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0 }}
                className="absolute -right-4 bottom-1/4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">IA analisou seu site</div>
                  <div className="text-[9px] text-slate-400">relatório no WhatsApp ✓</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-5xl mx-auto w-full mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { end: 200, suffix: "k", label: "URLs indexadas/dia" },
            { end: 12, suffix: "+", label: "Módulos integrados" },
            { end: 500, suffix: "+", label: "Profissionais ativos" },
            { end: 24, suffix: "/7", label: "IA trabalhando" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center">
              <div className="text-3xl font-black text-violet-600 dark:text-violet-400 mb-1">
                <Counter end={s.end} suffix={s.suffix} />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── 2. DOR / PROBLEMA ────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-red-200 dark:border-red-800/30">
              <AlertCircle className="w-3.5 h-3.5" /> Você provavelmente está perdendo dinheiro agora
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Sem dados, você está{" "}
              <span className="text-red-500">navegando no escuro</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              E o Google não vai te avisar quando você perder uma posição ou deixar de ser indexado.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { emoji: "⏳", text: "Suas páginas novas ficam semanas sem aparecer no Google enquanto a concorrência já está rankeando — perda de tráfego invisível." },
              { emoji: "📉", text: "Você só descobre que perdeu uma posição quando o tráfego cai. Aí já é tarde demais para reagir sem prejuízo." },
              { emoji: "🤖", text: "Você ainda monta relatórios na mão. Horas perdidas toda semana explicando dados que deveriam ser automáticos." },
              { emoji: "💸", text: "Investe em tráfego pago mas não sabe qual campanha está convertendo. Orçamento desperdiçado sem dados de atribuição corretos." },
              { emoji: "🔍", text: "Tem keywords na posição 8–15 que poderiam ir ao top 3 com pequenos ajustes — mas você não sabe quais são." },
              { emoji: "🏗️", text: "Gerencia múltiplos sites em planilhas espalhadas, sem visão centralizada de receita, contratos e oportunidades." },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 p-5 rounded-xl border border-red-200/40 dark:border-red-900/30 bg-white dark:bg-red-950/10"
              >
                <span className="text-2xl shrink-0">{p.emoji}</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{p.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <p className="text-xl font-black text-slate-900 dark:text-white mb-2">E se uma IA resolvesse tudo isso por você, automaticamente?</p>
            <p className="text-slate-500 dark:text-slate-400 text-base">indexando, analisando e reportando — enquanto você foca no que importa.</p>
            <ChevronDown className="w-8 h-8 text-violet-500 mx-auto mt-6 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ── 3. DESTAQUE: IA AUTÔNOMA ─────────────────────────────────── */}
      <section id="ia" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[140px]" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-violet-200 dark:border-violet-700/50">
              <Brain className="w-3.5 h-3.5" /> Inteligência Artificial Autônoma
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Agentes de IA que trabalham{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">por você, 24/7</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Não é um chatbot genérico. São agentes especializados que leem seus dados reais do Google, identificam oportunidades e agem — com ou sem você online.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: detail */}
            <FeatureHighlight
              icon={Brain}
              tag="IA Especializada em SEO"
              title="Agentes que entendem seu negócio"
              description="Cada agente é treinado em SEO, dados de mercado e nas métricas do seu próprio site. Eles não dão respostas genéricas — eles falam sobre as suas keywords, as suas páginas, os seus resultados."
              accent="bg-violet-500"
              items={[
                { icon: Database, text: "Lê dados reais do GSC e GA4 automaticamente" },
                { icon: Brain, text: "Identifica oportunidades de ranking por posição" },
                { icon: Bell, text: "Alertas instantâneos de queda de posição ou tráfego" },
                { icon: MessageSquare, text: "Envia relatórios completos por WhatsApp semanalmente" },
                { icon: FileText, text: "Gera briefings de conteúdo baseados em dados reais" },
                { icon: Settings, text: "Workflows personalizados com agendamentos automáticos" },
              ]}
            />

            {/* Right: mockup */}
            <div className="relative">
              <AIMockupFull />

              {/* Floating agent cards */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { emoji: "🔍", name: "SEO Specialist", desc: "Otimiza rankings" },
                  { emoji: "📈", name: "Growth Hacker", desc: "Identifica oportunidades" },
                  { emoji: "📊", name: "Analytics Lead", desc: "Interpreta dados GA4" },
                ].map(a => (
                  <motion.div
                    key={a.name}
                    whileHover={{ y: -4 }}
                    className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center"
                  >
                    <div className="text-2xl mb-1">{a.emoji}</div>
                    <div className="text-[10px] font-black text-slate-800 dark:text-white">{a.name}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{a.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* WhatsApp report showcase */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 bg-gradient-to-r from-violet-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-5">
                  <MessageSquare className="w-3 h-3" /> Relatórios automáticos por WhatsApp
                </div>
                <h3 className="text-3xl font-black mb-4">Acorde com tudo já analisado</h3>
                <p className="text-violet-200 leading-relaxed mb-6">
                  Todo domingo, a IA envia um relatório completo da semana no seu WhatsApp. Posições, tráfego, oportunidades e o que fazer essa semana — tudo resumido em linguagem humana, sem precisar entrar na plataforma.
                </p>
                <div className="space-y-2">
                  {[
                    "Resumo semanal de posições e cliques",
                    "Top 3 oportunidades de melhoria",
                    "Alertas de queda ou penalização",
                    "Próximos passos priorizados",
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-violet-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
              {/* WhatsApp mockup */}
              <div className="bg-[#0a1410] rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Rankito SEO Bot</div>
                    <div className="text-[9px] text-violet-400">● WhatsApp</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    "📊 *Relatório semanal — semana 7*\n\nOlá! Aqui está o resumo do seu site:",
                    "✅ Cliques: *+18%* vs semana anterior\n📈 Impressões: *20.2K*\n🎯 CTR médio: *3.8%*",
                    "🔥 *Top oportunidade:*\n/blog/seo-local está na pos. 9 com 820 impressões. Otimize o title e H1 para subir ao top 3.",
                    "📌 *Ação recomendada esta semana:*\nAdicionar indexação de 15 URLs novas do blog. Enviei a lista completa no painel.",
                  ].map((msg, i) => (
                    <div key={i} className="bg-indigo-950/60 rounded-xl rounded-tl-none p-2.5 max-w-[95%]">
                      <p className="text-[9px] text-violet-100 whitespace-pre-line leading-relaxed">{msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 4. DESTAQUE: INDEXADOR AUTOMÁTICO ───────────────────────── */}
      <section id="indexador" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/8 rounded-full blur-[140px]" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-emerald-200 dark:border-emerald-700/50">
              <Zap className="w-3.5 h-3.5" /> Indexador Automático via Google API
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Suas páginas no Google{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">em horas, não meses</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              O Rankito usa a Google Indexing API diretamente para enviar suas URLs para o Google indexar agora — não esperar o Googlebot passar por lá quando quiser.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: mockup */}
            <div className="order-2 lg:order-1">
              <IndexerMockup />

              {/* Speed comparison */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-4 grid grid-cols-2 gap-3"
              >
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/40 dark:border-red-900/30 rounded-xl p-4 text-center">
                  <div className="text-xs font-black text-red-500 uppercase tracking-wider mb-1">Sem Rankito</div>
                  <div className="text-2xl font-black text-slate-800 dark:text-white">2–6 sem</div>
                  <div className="text-[10px] text-slate-500">para indexar uma página nova</div>
                </div>
                <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200/40 dark:border-violet-900/30 rounded-xl p-4 text-center">
                  <div className="text-xs font-black text-violet-600 uppercase tracking-wider mb-1">Com Rankito</div>
                  <div className="text-2xl font-black text-violet-600 dark:text-violet-400">24–48h</div>
                  <div className="text-[10px] text-slate-500">via Google Indexing API</div>
                </div>
              </motion.div>
            </div>

            {/* Right: detail */}
            <div className="order-1 lg:order-2">
              <FeatureHighlight
                icon={Zap}
                tag="Indexação Inteligente"
                title="Indexador que pensa por você"
                description="Não é apenas enviar URLs. O indexador do Rankito monitora cobertura, detecta erros, prioriza páginas por impacto de SEO e agenda novos envios automaticamente."
                accent="bg-violet-500"
                items={[
                  { icon: Cloud, text: "200 URLs indexadas por dia via Google API" },
                  { icon: Timer, text: "Agendamentos recorrentes diários ou semanais" },
                  { icon: Gauge, text: "Monitor de cobertura: indexed, crawled, error" },
                  { icon: Bot, text: "IA prioriza URLs por impacto de tráfego estimado" },
                  { icon: Bell, text: "Alertas de erro de indexação em tempo real" },
                  { icon: BarChart3, text: "Relatório histórico de todas as requisições" },
                ]}
              />

              {/* Steps */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-8 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6"
              >
                <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Como funciona em 3 passos</div>
                <div className="space-y-4">
                  {[
                    { n: "1", title: "Conecte seu GSC", desc: "Vincule o Google Search Console em menos de 5 minutos via Service Account." },
                    { n: "2", title: "Importe suas URLs", desc: "O Rankito detecta automaticamente todas as páginas do seu site e mostra o status de indexação de cada uma." },
                    { n: "3", title: "Ative o piloto automático", desc: "Configure um agendamento e a IA envia as URLs para o Google indexar enquanto você trabalha em outra coisa." },
                  ].map((step) => (
                    <div key={step.n} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                        {step.n}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{step.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. BENEFÍCIOS OUTROS MÓDULOS ────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Uma plataforma.{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">Tudo que você precisa.</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Além de IA e indexação automática, o Rankito cobre todo o seu ecossistema de SEO.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Search,
                color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600",
                title: "SEO & Search Console",
                items: ["Queries com posição e CTR", "Histórico de keywords", "Canibalização detectada", "Decaimento de conteúdo"]
              },
              {
                icon: BarChart3,
                color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
                title: "GA4 Analytics",
                items: ["KPIs executivos ao vivo", "Canais, device e país", "Funil de e-commerce", "Comparação de períodos"]
              },
              {
                icon: MousePointerClick,
                color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
                title: "Tracking de Conversões",
                items: ["Pixel próprio v4.1", "Heatmaps de clique", "Jornada do usuário", "Google Ads + Meta Ads"]
              },
              {
                icon: DollarSign,
                color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600",
                title: "Rank & Rent",
                items: ["Portfólio de ativos", "Controle de MRR", "Gestão de contratos", "Dashboard financeiro"]
              },
            ].map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6"
              >
                <div className={`inline-flex p-3 rounded-xl mb-4 ${b.color}`}>
                  <b.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black mb-4 text-slate-900 dark:text-white">{b.title}</h3>
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

      {/* ── 6. PROVA SOCIAL ─────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl font-black mb-3">Resultados reais de usuários reais</h2>
            <p className="text-slate-500 dark:text-slate-400">Donos de sites, SEOs e agências que já usam o Rankito</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial
              quote="Minhas páginas novas passaram a aparecer no Google em 24 horas. Antes esperava semanas. O indexador automático do Rankito me deu uma vantagem absurda."
              author="Rafael M."
              role="Dono de Site • E-commerce de Nicho"
              avatar="RM"
            />
            <Testimonial
              quote="O agente IA identificou 8 keywords na posição 11–14 que eu nem sabia que existiam. Otimizei em 1 semana e o tráfego subiu 40%. Não tem segredo: é dado real."
              author="Ana Paula S."
              role="Consultora de SEO • Agência Digital"
              avatar="AP"
            />
            <Testimonial
              quote="Paro de perder 4h por semana montando relatório para clientes. A IA faz automático e manda por WhatsApp. Meus clientes ficam impressionados com a qualidade."
              author="Carlos F."
              role="Profissional de SEO • Rank & Rent"
              avatar="CF"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
            {[
              { text: "200k", sub: "URLs indexadas/dia" },
              { text: "24h", sub: "Tempo médio de indexação" },
              { text: "40%", sub: "Aumento médio de tráfego" },
              { text: "8h", sub: "Economizadas por semana" },
            ].map(b => (
              <div key={b.text} className="flex flex-col items-center gap-1 p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                <span className="text-3xl font-black text-violet-600 dark:text-violet-400">{b.text}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{b.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. PLANOS ───────────────────────────────────────────────── */}
      <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/6 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-amber-200 dark:border-amber-800/30">
              <Clock className="w-3.5 h-3.5" /> Preços de lançamento — por tempo limitado
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3">Escolha seu plano</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg mx-auto">
              Sem burocracia. Cancele quando quiser. Comece em minutos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl max-w-4xl mx-auto"
          >
            <img src={plansImage} alt="Planos Rankito" className="w-full h-auto" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              name="Start"
              price="R$97"
              period="/mês"
              desc="Para quem está começando com dados reais do Google e quer indexar mais rápido."
              features={[
                "3 projetos",
                "SEO via Google Search Console",
                "KPIs básicos GA4",
                "1 conta GSC para indexação/projeto",
                "200 URLs indexadas/dia",
                "Orquestrador IA (limitado — 5 execuções/mês)",
                "Tracking Pixel básico",
                "1 usuário",
              ]}
              cta="Assinar Start"
            />
            <PricingCard
              name="Growth"
              price="R$297"
              period="/mês"
              desc="Para profissionais que gerenciam múltiplos projetos com indexação em escala."
              features={[
                "10 projetos",
                "SEO + GA4 completos",
                "Até 4 contas GSC de indexação/projeto",
                "800 URLs indexadas/dia (4 × 200)",
                "Orquestrador IA (limitado — 20 exec/mês)",
                "Agente IA + relatórios WhatsApp",
                "Tracking Pixel v4.1 + Rank & Rent",
                "5 usuários",
              ]}
              cta="Assinar Growth"
              highlight
              badge="⭐ Mais popular"
            />
            <PricingCard
              name="Unlimited"
              price="R$697"
              period="/mês"
              desc="Para agências com escala total, white-label e indexação sem limites."
              features={[
                "Projetos ilimitados",
                "Tudo do Growth",
                "Contas GSC de indexação ilimitadas/projeto",
                "Indexação sem limites diários",
                "Orquestrador IA completo (ilimitado)",
                "White-label completo + domínio próprio",
                "API pública + Webhooks",
                "Usuários ilimitados",
                "Suporte prioritário + onboarding dedicado",
              ]}
              cta="Assinar Unlimited"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left p-6 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30"
          >
            <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="font-black text-lg text-slate-900 dark:text-white mb-1">Garantia de 7 dias sem risco</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Não ficou satisfeito por qualquer motivo? Devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 8. FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl font-black mb-3">Perguntas frequentes</h2>
            <p className="text-slate-500 dark:text-slate-400">Tire suas dúvidas antes de começar</p>
          </motion.div>

          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-8 py-2">
            {[
              {
                q: "Como o indexador automático funciona?",
                a: "O Rankito usa a Google Indexing API oficial para enviar suas URLs diretamente ao Google. Você configura um agendamento (diário, semanal) e a IA seleciona automaticamente as URLs que precisam de atenção, priorizando por impacto. Limite de 200 URLs/dia no plano Pro."
              },
              {
                q: "O agente IA tem acesso aos meus dados reais?",
                a: "Sim. O agente IA lê diretamente os dados do seu Google Search Console e GA4. Ele não responde com informações genéricas — ele fala sobre as suas keywords, as suas páginas e os seus resultados reais. Você conecta via Service Account segura."
              },
              {
                q: "Como o Rankito obtém os dados do Google?",
                a: "Você conecta sua conta do Google Search Console e Google Analytics 4 via Service Account (API oficial). Seus dados são lidos diretamente do Google com autenticação segura. Nenhum dado fica exposto ou compartilhado."
              },
              {
                q: "O indexador funciona para qualquer tipo de site?",
                a: "Sim. Funciona para blogs, e-commerces, sites institucionais, portais de notícias e qualquer site que você vincule ao Google Search Console. A única limitação é o volume diário da API (200/dia no plano Pro)."
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. Sem contrato de fidelidade, sem multa. Você pode cancelar a qualquer momento pelo próprio painel. Se cancelar nos primeiros 7 dias, devolvemos 100% do valor."
              },
              {
                q: "Como funciona o plano Agência com White-label?",
                a: "Você pode personalizar o Rankito com sua marca, logo e domínio personalizado. Seus clientes acessam a plataforma como se fosse uma ferramenta sua, sem ver o nome Rankito."
              },
            ].map((faq, i) => <FAQItem key={i} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── 9. CTA FINAL ─────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-indigo-600/10" />
          <FloatingOrb className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-violet-200 dark:border-violet-700/50">
              <Rocket className="w-3.5 h-3.5" /> Comece agora, veja resultado essa semana
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
              Pare de perder{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">tráfego e tempo</span>{" "}
              para quem já usa IA
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-xl mx-auto">
              Indexação automática + IA 24/7 + dados reais do Google. Tudo em um lugar. Para donos de sites, SEOs e agências que levam resultado a sério.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <a
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group"
              >
                <Rocket className="w-5 h-5" /> Começar gratuitamente
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-violet-500" /> 7 dias de garantia</div>
              <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-violet-500" /> Sem contrato</div>
              <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Configuração em minutos</div>
              <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-500" /> +500 profissionais ativos</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#080c18]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">Rankito</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            © 2025 Rankito. A plataforma de SEO com IA mais completa do Brasil.
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <a href="/login" className="hover:text-violet-600 transition-colors">Entrar</a>
            <a href="#planos" className="hover:text-violet-600 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-violet-600 transition-colors">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
