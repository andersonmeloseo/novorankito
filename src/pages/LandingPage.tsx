import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Search, BarChart3, Zap, Bot, TrendingUp, Target,
  Shield, Users, ArrowRight, CheckCircle2, Star,
  Brain, Activity, MousePointerClick, DollarSign,
  Network, ShoppingCart, Globe, Sparkles, ChevronRight,
  AlertCircle, Clock, Play, BarChart, LineChart,
  Lock, Layers, Award, Building2, Rocket, ChevronDown
} from "lucide-react";
import plansImage from "@/assets/landing-plans.png";

// ─── Animated Counter ───────────────────────────────────────────────────────
function Counter({ end, suffix = "", prefix = "", duration = 1800 }: {
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

// ─── Pain Point Card ─────────────────────────────────────────────────────────
function PainCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex items-start gap-3 p-4 rounded-xl border border-red-200/30 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20"
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ─── Proof Badge ─────────────────────────────────────────────────────────────
function ProofBadge({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm">
      <span className="text-3xl font-black text-violet-600 dark:text-violet-400">{text}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400 text-center leading-tight">{sub}</span>
    </div>
  );
}

// ─── Checkmark Row ───────────────────────────────────────────────────────────
function Check({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{children}</span>
    </div>
  );
}

// ─── Module Mockups ──────────────────────────────────────────────────────────
function SeoMockup() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans rounded-b-2xl">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Search className="w-4 h-4 text-violet-600" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">SEO — Google Search Console</span>
        <span className="ml-auto text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">● Conectado</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[["CLIQUES","774","+43.6%",true],["IMPRESSÕES","20.2K","+27.8%",true],["CTR","3.8%","+12%",true],["POSIÇÃO","8","-6.4%",false]].map(([l,v,d,up]) => (
          <div key={l as string} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="text-[8px] font-bold tracking-wider text-slate-400 uppercase">{l}</div>
            <div className="text-base font-black text-slate-900 dark:text-white">{v}</div>
            <div className={`text-[9px] font-semibold ${up ? "text-emerald-500" : "text-red-400"}`}>{d}</div>
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

function GA4Mockup() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans rounded-b-2xl">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Activity className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">GA4 — KPIs Executivos</span>
        <span className="ml-auto text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">● Ao vivo</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[["USUÁRIOS","2.5K"],["SESSÕES","2.6K"],["ENGAJAMENTO","22.8%"],["RECEITA","R$4.2K"],["CONVERSÕES","128"],["DURAÇÃO","2m 39s"]].map(([l,v]) => (
          <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="text-[8px] font-bold tracking-wider text-slate-400 uppercase">{l}</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">{v}</div>
          </div>
        ))}
      </div>
      <div className="bg-blue-50/60 dark:bg-blue-900/10 rounded-lg p-3">
        <div className="text-[9px] text-slate-400 font-semibold mb-1.5">Por Canal</div>
        {[["Orgânico",65,"bg-blue-500"],["Direto",20,"bg-indigo-400"],["Social",15,"bg-violet-400"]].map(([c,p,col]) => (
          <div key={c as string} className="flex items-center gap-2 mb-1">
            <span className="text-[9px] text-slate-500 w-12">{c}</span>
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full ${col} rounded-full`} style={{ width: `${p}%` }} />
            </div>
            <span className="text-[9px] text-slate-400">{p}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIMockup() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans rounded-b-2xl">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Bot className="w-4 h-4 text-violet-600" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Agente IA — SEO Specialist</span>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl rounded-tl-none p-2.5 text-[10px] text-slate-700 dark:text-slate-300 flex-1">
            📊 Identifiquei <strong>12 keywords</strong> na posição 8-15 com alto potencial. Suas impressões cresceram <strong className="text-violet-600">+27.8%</strong> esse mês.
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl rounded-tr-none p-2.5 text-[10px] text-slate-700 dark:text-slate-300">
            Quais páginas otimizar primeiro?
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl rounded-tl-none p-2.5 text-[10px] text-slate-700 dark:text-slate-300 flex-1">
            🎯 <strong>/advogado-criminal</strong> (pos.9, 340 imp.), <strong>/consulta-gratuita</strong> (pos.11). Enviei relatório por <strong>WhatsApp!</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankRentMockup() {
  return (
    <div className="bg-white dark:bg-[#0f1421] p-4 font-sans rounded-b-2xl">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <DollarSign className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Rank & Rent — Portfólio</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[["PATRIMÔNIO","R$148K"],["MRR","R$3.2K"],["ATIVOS","12"],["ALUGADOS","8/12"]].map(([l,v]) => (
          <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="text-[8px] font-bold tracking-wider text-slate-400 uppercase">{l}</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">{v}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          { name: "Advogados SP", client: "Dr. Costa", val: "R$450/mês", ok: true },
          { name: "Encanadores RJ", client: "Hidro Fix", val: "R$320/mês", ok: true },
          { name: "Dentistas BH", client: "—", val: "Disponível", ok: false },
        ].map(r => (
          <div key={r.name} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg px-3 py-2">
            <div className="flex-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200">{r.name}</div>
            <div className="text-[9px] text-slate-400">{r.client}</div>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${r.ok ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "text-blue-500 bg-blue-50 dark:bg-blue-900/20"}`}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Browser Frame ───────────────────────────────────────────────────────────
function BrowserFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl shadow-slate-900/20">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono flex-1">rankito.io/{label}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Pricing Card ────────────────────────────────────────────────────────────
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
      whileHover={{ y: -4 }}
      className={`relative rounded-2xl p-8 flex flex-col border transition-all duration-300 ${
        highlight
          ? "bg-gradient-to-b from-violet-600 to-indigo-700 border-violet-500 shadow-2xl shadow-violet-500/30 text-white"
          : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
      }`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-black px-5 py-1.5 rounded-full shadow-lg">
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
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${highlight ? "text-emerald-300" : "text-emerald-500"}`} />
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

// ─── Testimonial ─────────────────────────────────────────────────────────────
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

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
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

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [activeModule, setActiveModule] = useState(0);

  const modules = [
    { label: "SEO & GSC", icon: Search, mockup: <SeoMockup />, browserLabel: "seo" },
    { label: "GA4 Analytics", icon: BarChart3, mockup: <GA4Mockup />, browserLabel: "ga4" },
    { label: "IA Autônoma", icon: Bot, mockup: <AIMockup />, browserLabel: "ai-agent" },
    { label: "Rank & Rent", icon: DollarSign, mockup: <RankRentMockup />, browserLabel: "rank-rent" },
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
            <a href="#problema" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">O problema</a>
            <a href="#solucao" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">A solução</a>
            <a href="#planos" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">FAQ</a>
          </div>
          <a href="/login" className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 hover:scale-105 transition-all">
            Começar agora <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ── 1. HOOK / HERO ──────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto relative text-center">
          {/* Pre-headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-violet-200 dark:border-violet-800/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            A plataforma que profissionais de SEO usam para ganhar mais
          </motion.div>

          {/* Main Hook */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6"
          >
            Pare de perder{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 bg-clip-text text-transparent">
                cliques e receita
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 9C50 3 150 1 299 9" stroke="url(#u1)" strokeWidth="3" strokeLinecap="round"/>
                <defs><linearGradient id="u1" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#7C3AED"/><stop offset="1" stopColor="#3B82F6"/></linearGradient></defs>
              </svg>
            </span>
            <br />por falta de dados
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            Rankito unifica <strong className="text-slate-800 dark:text-slate-200">SEO, GA4, IA Autônoma, Tracking e Rank & Rent</strong> em uma plataforma. Tome decisões com dados reais do Google — não achismos.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          >
            <a
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-8 py-4 rounded-2xl text-base shadow-2xl shadow-violet-500/40 transition-all hover:scale-105"
            >
              <Rocket className="w-5 h-5" /> Quero começar agora
            </a>
            <a
              href="#solucao"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 font-semibold px-8 py-4 rounded-2xl text-base hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              Ver como funciona <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 mb-16"
          >
            {[
              { icon: Shield, text: "Dados direto do Google" },
              { icon: Lock, text: "Sem contrato de fidelidade" },
              { icon: Zap, text: "Configuração em minutos" },
              { icon: Users, text: "+500 profissionais ativos" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-violet-500" />
                {text}
              </div>
            ))}
          </motion.div>

          {/* KPI numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { end: 200, suffix: "k", label: "URLs indexadas por dia" },
              { end: 12, suffix: "+", label: "Módulos integrados" },
              { end: 500, suffix: "+", label: "Profissionais ativos" },
              { end: 100, suffix: "%", label: "Dados reais do Google" },
            ].map(s => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center"
              >
                <div className="text-3xl font-black text-violet-600 dark:text-violet-400 mb-1">
                  <Counter end={s.end} suffix={s.suffix} />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. DOR / PROBLEMA ───────────────────────────────────────── */}
      <section id="problema" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-red-200 dark:border-red-800/30">
              <AlertCircle className="w-3.5 h-3.5" /> Você provavelmente está cometendo esses erros agora
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Por que profissionais de SEO<br />
              <span className="text-red-500">deixam dinheiro na mesa</span> todo mês
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Sem os dados certos, você está navegando no escuro. E o Google não vai te avisar.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { emoji: "📉", text: "Você não sabe quais keywords estão perdendo posição até o tráfego cair — quando já é tarde demais para reagir." },
              { emoji: "🤔", text: "Você toma decisões de SEO baseadas em achismo porque os dados do Google Search Console são complexos demais para analisar no dia a dia." },
              { emoji: "⏰", text: "Você perde horas montando relatórios manualmente para clientes todo mês — tempo que poderia estar gerando novos projetos." },
              { emoji: "🔗", text: "Suas URLs novas ficam meses sem indexar enquanto você espera o Google passar por lá, perdendo tráfego que deveria ser seu." },
              { emoji: "💸", text: "Você investe em tráfego pago mas não sabe qual canal está convertendo de verdade — atribuição errada = orçamento desperdiçado." },
              { emoji: "🏗️", text: "Você ainda gerencia seu portfólio de sites em planilhas espalhadas, sem visão consolidada de receita e oportunidades." },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-5 rounded-xl border border-red-200/40 dark:border-red-900/30 bg-white dark:bg-red-950/10"
              >
                <span className="text-2xl shrink-0">{p.emoji}</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{p.text}</p>
              </motion.div>
            ))}
          </div>

          {/* Transition */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <p className="text-xl font-black text-slate-900 dark:text-white mb-2">E se existisse uma plataforma que resolvesse tudo isso...</p>
            <p className="text-slate-500 dark:text-slate-400 text-base">em um único lugar, integrada com o Google, com IA trabalhando por você?</p>
            <ChevronDown className="w-8 h-8 text-violet-500 mx-auto mt-6 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ── 3. SOLUÇÃO / PRODUTO ─────────────────────────────────────── */}
      <section id="solucao" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-violet-200 dark:border-violet-800/50">
              <Sparkles className="w-3.5 h-3.5" /> Apresentando o Rankito
            </div>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Tudo que você precisa para{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                dominar o Google
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Uma plataforma. Cinco módulos poderosos. Dados reais. IA trabalhando 24/7.
            </p>
          </motion.div>

          {/* Module switcher */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {modules.map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveModule(i)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeModule === i
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 scale-105"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-400 dark:hover:border-violet-600"
                }`}
              >
                <m.icon className="w-4 h-4" /> {m.label}
              </button>
            ))}
          </div>

          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <BrowserFrame label={modules[activeModule].browserLabel}>
                  {modules[activeModule].mockup}
                </BrowserFrame>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── 4. BENEFÍCIOS CONCRETOS ───────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              O que muda na sua vida{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">depois do Rankito</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Não vendemos features. Vendemos resultados.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600",
                title: "Rankeie mais rápido",
                before: "Você demora meses para ver resultados porque não sabe o que otimizar",
                after: "Com dados reais do GSC + IA, você age nas páginas certas na hora certa",
                items: ["Keywords na posição 8-15 = gold", "Canibalização detectada automaticamente", "Oportunidades priorizadas por impacto"]
              },
              {
                icon: Bot,
                color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600",
                title: "Trabalhe menos, entregue mais",
                before: "Você gasta horas montando relatórios manuais para cada cliente",
                after: "A IA monta, analisa e envia relatórios por WhatsApp automaticamente",
                items: ["Relatórios automáticos semanais", "Alertas de queda de posição", "Sugestões de ação em linguagem clara"]
              },
              {
                icon: DollarSign,
                color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
                title: "Escale seu portfólio",
                before: "Você gerencia seus sites em planilhas e perde oportunidades de receita",
                after: "Portfólio completo com MRR, contratos e avaliação de ativos centralizado",
                items: ["Visão de patrimônio digital", "Gestão de clientes integrada", "Controle de receita recorrente"]
              },
            ].map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-7"
              >
                <div className={`inline-flex p-3 rounded-xl mb-5 ${b.color}`}>
                  <b.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black mb-4">{b.title}</h3>
                <div className="mb-5 space-y-3">
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/30 dark:border-red-900/30">
                    <div className="text-[10px] font-black uppercase tracking-wider text-red-500 mb-1">Antes</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{b.before}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-900/30">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-1">Depois</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{b.after}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {b.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600 dark:text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. LISTA DE FEATURES ─────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl font-black mb-3">Tudo dentro de uma plataforma</h2>
            <p className="text-slate-500 dark:text-slate-400">+60 funcionalidades para profissionais de SEO e agências</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
            {[
              ["🔍 SEO & Search Console", [
                "Consultas orgânicas com posição e CTR",
                "Histórico de posições por keyword",
                "Canibalização de keywords",
                "Decaimento de conteúdo",
                "Aparência de busca (rich results)",
                "Inspeção de URLs via GSC API",
              ]],
              ["📊 GA4 Analytics", [
                "KPIs executivos em tempo real",
                "Análise por canal, device e país",
                "Taxa de engajamento e retenção",
                "E-commerce e funil de conversão",
                "Mapa mundial de sessões",
                "Comparação de períodos com delta",
              ]],
              ["⚡ Indexação Automática", [
                "Google Indexing API — 200 URLs/dia",
                "Status de cobertura por URL",
                "Agendamentos recorrentes",
                "Inspeção detalhada (robots, sitemap)",
                "Histórico de requisições",
                "Alertas de erro de indexação",
              ]],
              ["🤖 IA & Agentes Autônomos", [
                "Agentes especializados (SEO, Growth)",
                "Chat com dados reais do GSC/GA4",
                "Relatórios automáticos por WhatsApp",
                "Canvas visual de workflows",
                "Orquestrador multi-agente",
                "Agendamentos automáticos",
              ]],
              ["🎯 Tracking de Conversões", [
                "Pixel próprio v4.1 (1 linha de código)",
                "Heatmaps de clique, scroll e movimento",
                "Jornada completa do usuário",
                "Metas e funis configuráveis",
                "Integração Google Ads e Meta Ads",
                "LGPD e Consent Mode",
              ]],
              ["🏠 Rank & Rent", [
                "Portfólio de ativos digitais",
                "Gestão de clientes e contratos",
                "Controle de MRR por ativo",
                "Avaliação automática de sites",
                "Dashboard financeiro",
                "Marketplace de disponibilidade",
              ]],
            ].map(([category, items]: [string, string[]], i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="mb-8"
              >
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">{category}</h3>
                <div className="space-y-2">
                  {(items as string[]).map((item, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. PROVA SOCIAL ──────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl font-black mb-3">O que nossos usuários dizem</h2>
            <p className="text-slate-500 dark:text-slate-400">Profissionais reais, resultados reais</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial
              quote="Em 2 semanas com o Rankito identifiquei 8 keywords na posição 11-14 que eu nem sabia que existiam. Agora estão todas no top 5. Aumento de 40% no tráfego orgânico."
              author="Rafael M."
              role="Consultor de SEO • SP"
              avatar="RM"
            />
            <Testimonial
              quote="Paro de perder 4h por semana montando relatório para clientes. O agente IA faz isso automaticamente e ainda manda pelo WhatsApp. Meus clientes amam."
              author="Ana Paula S."
              role="Agência de Marketing • RJ"
              avatar="AP"
            />
            <Testimonial
              quote="Tenho 9 sites no portfólio de Rank & Rent. Antes era uma bagunça em planilhas. Agora vejo tudo num lugar só: patrimônio, MRR e quem está alugando."
              author="Carlos F."
              role="SEO para Rank & Rent • MG"
              avatar="CF"
            />
          </div>

          {/* Proof numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
            <ProofBadge text="200k" sub="URLs indexadas por dia" />
            <ProofBadge text="8h" sub="Economizadas por semana em relatórios" />
            <ProofBadge text="40%" sub="Aumento médio de tráfego orgânico" />
            <ProofBadge text="24/7" sub="IA trabalhando por você" />
          </div>
        </div>
      </section>

      {/* ── 7. PLANOS (OFERTA) ───────────────────────────────────────── */}
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

          {/* Plans image */}
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
              name="Starter"
              price="Grátis"
              period=""
              desc="Para começar a explorar a plataforma e sentir o poder dos dados reais."
              features={[
                "1 projeto",
                "SEO via Google Search Console",
                "KPIs básicos GA4",
                "50 indexações/mês",
                "Agente IA (5 mensagens/dia)",
                "Suporte por e-mail",
              ]}
              cta="Começar grátis"
            />
            <PricingCard
              name="Pro"
              price="R$97"
              period="/mês"
              desc="Para profissionais de SEO que levam resultados a sério e precisam de todas as ferramentas."
              features={[
                "5 projetos",
                "SEO + GA4 completos",
                "200 indexações/dia (6.000/mês)",
                "IA ilimitada + relatórios automáticos",
                "Tracking Pixel v4.1",
                "Rank & Rent — portfólio completo",
                "Grafo semântico",
                "Suporte prioritário",
              ]}
              cta="Assinar Pro"
              highlight
              badge="⭐ Mais popular"
            />
            <PricingCard
              name="Agência"
              price="R$247"
              period="/mês"
              desc="Para agências que gerenciam múltiplos clientes e precisam de white-label e escala."
              features={[
                "20 projetos",
                "Tudo do Pro",
                "White-label completo",
                "Multi-usuários e permissões",
                "API pública + Webhooks",
                "Relatórios PDF personalizados",
                "Onboarding dedicado",
              ]}
              cta="Assinar Agência"
            />
          </div>

          {/* Guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
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

      {/* ── 8. FAQ ───────────────────────────────────────────────────── */}
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
                q: "Como o Rankito obtém os dados do Google?",
                a: "Você conecta sua conta do Google Search Console e Google Analytics 4 via Service Account (API oficial do Google). Seus dados são lidos diretamente do Google com autenticação segura. Nenhum dado fica exposto ou compartilhado."
              },
              {
                q: "Preciso saber programar para usar?",
                a: "Não. O Rankito foi criado para profissionais de SEO, não para devs. A configuração leva menos de 10 minutos e todo o processo é guiado passo a passo dentro da plataforma."
              },
              {
                q: "O Pixel de tracking substitui o Google Analytics?",
                a: "É um complemento. O Pixel do Rankito captura dados first-party que o GA4 às vezes perde por bloqueio de ad-blockers. Você tem os dois trabalhando juntos, com total visibilidade."
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. Sem contrato de fidelidade, sem multa. Você pode cancelar a qualquer momento pelo próprio painel. Se cancelar nos primeiros 7 dias, devolvemos 100% do valor."
              },
              {
                q: "Como funciona o plano Agência com White-label?",
                a: "Você pode personalizar o Rankito com sua marca, logo e domínio personalizado. Seus clientes acessam a plataforma como se fosse uma ferramenta sua, sem ver o nome Rankito."
              },
              {
                q: "O que é o módulo de Rank & Rent?",
                a: "É um módulo específico para quem trabalha com criação e aluguel de sites para locais. Você gerencia todos os seus ativos, vê o patrimônio digital estimado, controla os contratos com clientes e acompanha a receita recorrente (MRR) de cada site."
              },
            ].map((faq, i) => <FAQItem key={i} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── 9. CTA FINAL ─────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-indigo-600/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-violet-200 dark:border-violet-800/50">
              <Rocket className="w-3.5 h-3.5" /> Comece agora, veja resultado essa semana
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
              Chega de perder{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">tráfego e receita</span>{" "}
              por falta de dados
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-xl mx-auto">
              Junte-se a centenas de profissionais de SEO que já estão usando dados reais para tomar decisões melhores e crescer mais rápido.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <a
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-violet-500/40 transition-all hover:scale-105"
              >
                <Rocket className="w-5 h-5" /> Começar gratuitamente
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> 7 dias de garantia</div>
              <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-violet-500" /> Sem contrato</div>
              <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Configuração em minutos</div>
              <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500" /> +500 profissionais ativos</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#080c18]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">Rankito</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            © 2025 Rankito. A plataforma de SEO mais completa do Brasil.
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
