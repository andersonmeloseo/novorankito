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
  AlertTriangle, Flame, Trophy
} from "lucide-react";
import plansImage from "@/assets/landing-plans.png";
import plansAltImage from "@/assets/landing-plans-alt.png";

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
        <div className="space-y-1.5">
          {urls.map((u, i) => (
            <motion.div key={u.url} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg px-3 py-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.status === "indexed" ? "bg-violet-500" : u.status === "indexing" ? "bg-amber-400 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
              <span className="text-[9px] font-mono text-slate-600 dark:text-slate-300 flex-1 truncate">{u.url}</span>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${u.status === "indexed" ? "text-violet-600 bg-violet-50 dark:bg-violet-900/30" : u.status === "indexing" ? "text-amber-600 bg-amber-50 dark:bg-amber-900/30" : "text-slate-400 bg-slate-100 dark:bg-slate-700/50"}`}>
                {u.status === "indexed" ? "✓ INDEXADA" : u.status === "indexing" ? "⟳ ENVIANDO" : "⏳ FILA"}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-700/40 rounded-xl p-3">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-white" /></div>
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
          <div className="ml-auto">
            <div className="text-[8px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">GSC + GA4</div>
          </div>
        </div>
        <div className="space-y-3 mb-3">
          {messages.slice(0, step + 1).map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "ai" && <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-2.5 h-2.5 text-white" /></div>}
              <div className={`text-[10px] rounded-xl p-2.5 max-w-[85%] leading-relaxed ${m.role === "ai" ? "bg-violet-50 dark:bg-violet-900/25 text-slate-700 dark:text-slate-300 rounded-tl-none" : "bg-indigo-600 text-white rounded-tr-none"}`}>{m.text}</div>
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

// ─── Testimonial ─────────────────────────────────────────────────────────
function Testimonial({ quote, author, role, avatar, result }: { quote: string; author: string; role: string; avatar: string; result?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col">
      {result && <div className="inline-flex self-start bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-black px-3 py-1.5 rounded-full mb-4 border border-emerald-200/50 dark:border-emerald-700/30">{result}</div>}
      <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-5 italic flex-1">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">{avatar}</div>
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
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
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  const MODULE_COUNT = 2;

  useEffect(() => {
    const t = setInterval(() => setActiveModule(v => (v + 1) % MODULE_COUNT), 6000);
    return () => clearInterval(t);
  }, []);

  const modules = [
    { label: "Indexação IA", icon: Zap, mockup: <IndexerMockup /> },
    { label: "Agente IA", icon: Bot, mockup: <AIMockupFull /> },
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
            <a href="#solucao" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Solução</a>
            <a href="#prova" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Resultados</a>
            <a href="#planos" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">FAQ</a>
          </div>
          <a href="/login" className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 hover:scale-105 transition-all">
            Começar agora <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ── 1. HERO ─ "What's in it for me?" ─────────────────────────── */}
      <section ref={heroRef} className="relative pt-28 pb-0 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen flex flex-col justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <FloatingOrb className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-violet-600/12 rounded-full blur-[140px]" />
          <FloatingOrb className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative w-full">
          {/* Top badge — social proof first */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-black px-5 py-2.5 rounded-full border border-amber-200 dark:border-amber-700/50 shadow-sm">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              +500 profissionais de SEO já usam o Rankito para dominar o Google
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left: copy */}
            <div>
              {/* H1 — Specific Outcome */}
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-5xl sm:text-6xl lg:text-[3.6rem] xl:text-[4.2rem] font-black tracking-tight leading-[1.05] mb-6">
                Suas páginas no{" "}
                <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-700 bg-clip-text text-transparent">
                  top do Google
                </span>{" "}
                em 24 horas — com IA autônoma
              </motion.h1>

              {/* H2 — Who it's for + what it does */}
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-4 max-w-lg font-medium">
                A plataforma que{" "}
                <strong className="text-slate-800 dark:text-slate-200">indexa seus conteúdos automaticamente</strong>,
                analisa dados reais do Google e envia relatórios pelo WhatsApp — enquanto você faz outra coisa.
              </motion.p>

              {/* H3 — Specific targets */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2 mb-8">
                {[
                  { icon: Globe, text: "Donos de sites" },
                  { icon: Search, text: "Profissionais de SEO" },
                  { icon: Building2, text: "Agências digitais" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Icon className="w-3 h-3 text-violet-500" /> {text}
                  </div>
                ))}
              </motion.div>

              {/* CTA Primary */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-start gap-4 mb-8">
                <a href="/login"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black px-8 py-4 rounded-2xl text-base shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group">
                  <Rocket className="w-5 h-5" /> Começar grátis agora
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="#solucao" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold px-4 py-4 text-base hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                  Ver como funciona <ChevronRight className="w-4 h-4" />
                </a>
              </motion.div>

              {/* Risk reversals */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                {[
                  { icon: Shield, text: "7 dias de garantia total" },
                  { icon: Lock, text: "Sem contrato" },
                  { icon: Zap, text: "Ativo em 10 minutos" },
                  { icon: CheckCheck, text: "Dados direto do Google" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-violet-500" /> {text}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: live mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} style={{ y: heroY }} className="relative">
              <div className="flex gap-2 mb-4 justify-center lg:justify-start">
                {modules.map((m, i) => (
                  <button key={i} onClick={() => setActiveModule(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeModule === i ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400"}`}>
                    <m.icon className="w-3 h-3" /> {m.label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={activeModule} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.3 }}>
                  {modules[activeModule].mockup}
                </motion.div>
              </AnimatePresence>

              {/* Floating badges */}
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
                className="absolute -left-4 top-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><CheckCheck className="w-4 h-4 text-white" /></div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">129 URLs indexadas</div>
                  <div className="text-[9px] text-slate-400">agora mesmo</div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0 }}
                className="absolute -right-4 bottom-1/4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">IA analisou seu site</div>
                  <div className="text-[9px] text-slate-400">relatório no WhatsApp ✓</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Stats bar */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="max-w-5xl mx-auto w-full mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 pb-16">
          {[
            { end: 200, suffix: "k", label: "URLs indexadas/dia" },
            { end: 24, suffix: "h", label: "Tempo médio de indexação" },
            { end: 500, suffix: "+", label: "Profissionais ativos" },
            { end: 40, suffix: "%", label: "Aumento médio de tráfego" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center">
              <div className="text-3xl font-black text-violet-600 dark:text-violet-400 mb-1"><Counter end={s.end} suffix={s.suffix} /></div>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── 2. DOR / PROBLEMA ─ Agitate the pain ─────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-[#04060f] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-red-900/30 text-red-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-red-800/40">
              <AlertTriangle className="w-3.5 h-3.5" /> Se você não usa IA, está perdendo para quem usa
            </div>
            {/* H2 — Pain headline */}
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4 text-white">
              Enquanto você dorme,{" "}
              <span className="text-red-400">seus concorrentes indexam</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Cada dia sem indexação automática é um dia que a concorrência ganha terreno que você vai levar meses para recuperar.
            </p>
          </motion.div>

          {/* Pain points grid */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto mb-16">
            {[
              { emoji: "⏳", title: "Semanas para indexar", text: "Suas páginas novas ficam invisíveis por 2–6 semanas enquanto a concorrência já está rankeando. Você está regalando tráfego de graça." },
              { emoji: "📉", title: "Você só descobre tarde", text: "Só percebe que perdeu posições quando o tráfego desaba. Aí o dano já foi feito. Sem alertas em tempo real, você está voando às cegas." },
              { emoji: "🤖", title: "Relatórios na mão", text: "4–8 horas por semana montando planilha e explicando dados para clientes. Tempo que deveria ser gasto em estratégia, não em copy-paste." },
              { emoji: "💸", title: "Dinheiro em tráfego pago desperdiçado", text: "Investe em anúncios mas não sabe qual campanha converte. Sem dados de atribuição corretos, você toma decisão no escuro — e paga o preço." },
            ].map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <span className="text-2xl shrink-0 mt-0.5">{p.emoji}</span>
                <div>
                  <div className="text-sm font-black text-white mb-1">{p.title}</div>
                  <p className="text-sm text-slate-400 leading-relaxed">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bridge to solution */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <p className="text-2xl font-black text-white mb-2">
              E se uma IA resolvesse tudo isso por você — automaticamente?
            </p>
            <p className="text-slate-400 text-base mb-6">Indexando, analisando, alertando e reportando — enquanto você foca no que importa.</p>
            <ChevronDown className="w-8 h-8 text-violet-400 mx-auto animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ── 3. SOLUÇÃO ─ The Big Reveal ────────────────────────────────── */}
      <section id="solucao" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[140px]" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-violet-200 dark:border-violet-700/50">
              <Brain className="w-3.5 h-3.5" /> Apresentando o Rankito
            </div>
            {/* H2 — Solution headline */}
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              Uma plataforma.{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                Todo o seu SEO no piloto automático.
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Conecte seu Google Search Console e GA4 em 10 minutos. A IA cuida do resto — indexação, análise, alertas e relatórios.
            </p>
          </motion.div>

          {/* Feature pillars */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: Zap,
                color: "from-amber-500 to-orange-500",
                bg: "bg-amber-50 dark:bg-amber-900/20",
                border: "border-amber-200 dark:border-amber-800/30",
                tag: "🔥 Diferencial #1",
                title: "Indexação automática em 24h",
                desc: "Envie centenas de URLs diretamente ao Google pela API oficial. Chega de esperar 6 semanas para o Googlebot aparecer.",
                items: ["200+ URLs indexadas por dia", "Agendamentos automáticos diários", "Priorização inteligente por impacto", "Monitor de erros em tempo real"],
                mockup: <IndexerMockup />,
              },
              {
                icon: Bot,
                color: "from-violet-500 to-indigo-600",
                bg: "bg-violet-50 dark:bg-violet-900/20",
                border: "border-violet-200 dark:border-violet-700/30",
                tag: "🤖 Diferencial #2",
                title: "Agentes de IA trabalhando 24/7",
                desc: "Não é chatbot genérico. São agentes treinados nos seus dados reais que identificam oportunidades e agem.",
                items: ["Lê dados reais de GSC + GA4", "Identifica keywords na zona de ouro (pos. 8–15)", "Briefings de conteúdo automatizados", "Alertas de queda de posição instantâneos"],
                mockup: <AIMockupFull />,
              },
              {
                icon: MessageSquare,
                color: "from-emerald-500 to-teal-500",
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
                border: "border-emerald-200 dark:border-emerald-800/30",
                tag: "📱 Diferencial #3",
                title: "Relatórios no WhatsApp toda semana",
                desc: "Acorde segunda-feira com tudo analisado. A IA envia um resumo completo da semana direto no seu WhatsApp.",
                items: ["Resumo semanal de posições e cliques", "Top 3 oportunidades de melhoria", "Próximos passos priorizados por impacto", "Alertas de penalização imediatos"],
                mockup: null,
              },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className={`relative rounded-3xl p-8 border ${f.bg} ${f.border} overflow-hidden`}>
                <div className="relative">
                  <div className={`inline-flex items-center gap-2 text-xs font-black px-3 py-1.5 rounded-full mb-4 bg-gradient-to-r ${f.color} text-white`}>
                    {f.tag}
                  </div>
                  {/* H3 — Feature title */}
                  <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{f.desc}</p>
                  <div className="space-y-2.5 mb-6">
                    {f.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                      </div>
                    ))}
                  </div>
                  {f.mockup && <div className="mt-2">{f.mockup}</div>}
                  {!f.mockup && (
                    <div className="bg-[#0a1410] rounded-2xl p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center"><MessageSquare className="w-4 h-4 text-white" /></div>
                        <div>
                          <div className="text-xs font-bold text-white">Rankito SEO Bot</div>
                          <div className="text-[9px] text-emerald-400">● WhatsApp</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {[
                          "📊 *Relatório semanal — semana 7*\nCliques: *+18%* vs semana anterior",
                          "🔥 /blog/seo-local está na pos. 9 com 820 impressões. 3 ajustes e você vai ao top 3.",
                          "📌 *Ação desta semana:* Indexar 15 URLs novas do blog. Lista já no painel.",
                        ].map((msg, i) => (
                          <div key={i} className="bg-emerald-900/30 border border-emerald-800/30 rounded-xl rounded-tl-none p-2.5 max-w-[95%]">
                            <p className="text-[9px] text-emerald-100 whitespace-pre-line leading-relaxed">{msg}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Module overview */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">E tem muito mais incluído</h3>
            <p className="text-slate-500 dark:text-slate-400">Tudo em uma plataforma. Sem ferramentas separadas, sem custo extra.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Search, color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600", title: "SEO & Search Console", items: ["Queries com posição e CTR", "Histórico de keywords", "Canibalização detectada", "Decaimento de conteúdo"] },
              { icon: BarChart3, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600", title: "GA4 Analytics", items: ["KPIs executivos ao vivo", "Canais, device e país", "Funil de e-commerce", "Comparação de períodos"] },
              { icon: MousePointerClick, color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600", title: "Tracking de Conversões", items: ["Pixel próprio v4.1", "Heatmaps de clique", "Jornada do usuário", "Google Ads + Meta Ads"] },
              { icon: DollarSign, color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600", title: "Rank & Rent", items: ["Portfólio de ativos", "Controle de MRR", "Gestão de contratos", "Dashboard financeiro"] },
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

      {/* ── 4. COMO FUNCIONA ─ 3 Steps ──────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e]">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-emerald-200 dark:border-emerald-700/50">
              <Timer className="w-3.5 h-3.5" /> Ativo em 10 minutos
            </div>
            {/* H2 */}
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              3 passos para{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                indexar no piloto automático
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">Sem código, sem técnico, sem complicação.</p>
          </motion.div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-gradient-to-b from-violet-500 via-indigo-500 to-emerald-500 hidden sm:block" />
            <div className="space-y-8">
              {[
                { n: "1", icon: Settings, title: "Conecte o Google Search Console", desc: "Vincule sua conta via Service Account em menos de 5 minutos. É seguro, é oficial, é o jeito certo de fazer.", time: "⏱ 5 min" },
                { n: "2", icon: Globe, title: "Importe suas URLs automaticamente", desc: "O Rankito detecta todas as páginas do seu site e mostra o status de indexação de cada uma — quais estão indexadas, com erro ou na fila.", time: "⏱ 2 min" },
                { n: "3", icon: Bot, title: "Ative o piloto automático da IA", desc: "Configure um agendamento e a IA envia as URLs para o Google indexar automaticamente. Você não precisa fazer mais nada.", time: "⏱ 3 min" },
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
              <Rocket className="w-5 h-5" /> Começar agora — é grátis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── 5. PROVA SOCIAL ─ Results First ───────────────────────────── */}
      <section id="prova" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-amber-200 dark:border-amber-800/30">
              <Trophy className="w-3.5 h-3.5" /> Resultados reais. Nomes reais.
            </div>
            {/* H2 */}
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
              O que usuários reais{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">conseguiram</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Não são projeções. São resultados de profissionais que já usam o Rankito.
            </p>
          </motion.div>

          {/* Proof numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
            {[
              { text: "200k", sub: "URLs indexadas por dia na plataforma" },
              { text: "24h", sub: "Tempo médio de indexação (antes: 6 semanas)" },
              { text: "+40%", sub: "Aumento médio de tráfego orgânico" },
              { text: "8h", sub: "Economizadas por semana em relatórios" },
            ].map(b => (
              <div key={b.text} className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                <span className="text-3xl font-black text-violet-600 dark:text-violet-400">{b.text}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{b.sub}</span>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial
              quote="Minhas páginas novas passaram a aparecer no Google em 24 horas. Antes esperava 6 semanas. O indexador automático me deu uma vantagem absurda sobre a concorrência."
              author="Rafael M."
              role="Dono de site • E-commerce de Nicho"
              avatar="RM"
              result="✓ Indexação em 24h"
            />
            <Testimonial
              quote="O agente IA identificou 8 keywords na posição 11–14 que eu nem sabia que existiam. Otimizei em 1 semana e o tráfego subiu 40%. Não tem segredo: é dado real em tempo real."
              author="Ana Paula S."
              role="Consultora de SEO • Agência Digital"
              avatar="AP"
              result="✓ +40% de tráfego orgânico"
            />
            <Testimonial
              quote="Parei de perder 4h por semana montando relatório para clientes. A IA faz automático e manda por WhatsApp. Meus clientes ficam impressionados — virei autoridade no nicho."
              author="Carlos F."
              role="Profissional de SEO • Rank & Rent"
              avatar="CF"
              result="✓ 8h economizadas/semana"
            />
          </div>
        </div>
      </section>

      {/* ── 6. OFERTA / PLANOS ─ The Stack ────────────────────────────── */}
      <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0a0f1e] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/6 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full mb-5 border border-amber-200 dark:border-amber-800/30">
              <Clock className="w-3.5 h-3.5" /> Preços de lançamento — por tempo limitado
            </div>
            {/* H2 */}
            <h2 className="text-4xl sm:text-5xl font-black mb-3">Quanto vale dominar o Google?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto mb-2">
              Uma única posição a mais no Google pode valer <strong className="text-slate-800 dark:text-slate-200">R$10.000+ por mês</strong> em faturamento. O Rankito custa R$97.
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">Sem burocracia. Cancele quando quiser. Ativo em 10 minutos.</p>
          </motion.div>

          {/* Plans image banner */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="mb-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl max-w-4xl mx-auto">
            <img src={plansAltImage} alt="Planos Rankito — comparação completa" className="w-full h-auto" />
          </motion.div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <PricingCard
              name="Start"
              price="R$97"
              period="/mês"
              desc="Para quem quer dados reais do Google e indexação automática desde o primeiro dia."
              features={[
                "3 projetos",
                "SEO via Google Search Console",
                "KPIs GA4 completos",
                "1 conta GSC de indexação/projeto",
                "200 URLs indexadas/dia",
                "Orquestrador IA (5 execuções/hora)",
                "Tracking Pixel",
                "1 usuário",
              ]}
              cta="Começar com Start →"
            />
            <PricingCard
              name="Growth"
              price="R$297"
              period="/mês"
              desc="Para profissionais e agências que gerenciam múltiplos projetos com indexação em escala."
              features={[
                "10 projetos",
                "SEO + GA4 completos",
                "Até 4 contas GSC de indexação/projeto",
                "800 URLs indexadas/dia",
                "Orquestrador IA (20 exec/hora)",
                "Agentes IA + relatórios WhatsApp",
                "Tracking Pixel v4.1 + Rank & Rent",
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
              desc="Para agências com escala total, white-label e indexação sem nenhum limite."
              features={[
                "Projetos ilimitados",
                "Tudo do Growth",
                "Contas GSC ilimitadas/projeto",
                "Indexação sem limites diários",
                "Orquestrador IA (ilimitado)",
                "White-label + domínio próprio",
                "API pública + Webhooks",
                "Usuários ilimitados + suporte prioritário",
              ]}
              cta="Escalar com Unlimited →"
            />
          </div>

          {/* Value stack + guarantee */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Value stack */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-slate-900 dark:bg-slate-900/80 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4">O que você leva hoje:</h3>
              <div className="space-y-3">
                {[
                  { item: "Indexador automático via Google API", value: "R$297/mês" },
                  { item: "Agentes de IA 24/7 especializados em SEO", value: "R$197/mês" },
                  { item: "Relatórios automáticos por WhatsApp", value: "R$97/mês" },
                  { item: "Dashboard GA4 + GSC completo", value: "R$97/mês" },
                  { item: "Tracking Pixel + heatmaps", value: "R$97/mês" },
                ].map((v, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-sm text-slate-300">{v.item}</span>
                    </div>
                    <span className="text-xs text-slate-400 line-through shrink-0">{v.value}</span>
                  </div>
                ))}
                <div className="border-t border-slate-700 pt-3 mt-3 flex items-center justify-between">
                  <span className="font-black text-white">Tudo incluído por</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-violet-400">R$97<span className="text-sm text-slate-400">/mês</span></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Guarantee */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Garantia de 7 dias sem risco</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Não ficou satisfeito por qualquer motivo? Devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia, sem delay.
              </p>
              <div className="flex flex-col gap-2 w-full">
                {["Devolvemos em até 24h", "Sem perguntas", "Sem formulários complicados"].map(g => (
                  <div key={g} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {g}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-4xl font-black mb-3">Perguntas frequentes</h2>
            <p className="text-slate-500 dark:text-slate-400">Tire suas dúvidas antes de começar</p>
          </motion.div>

          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-8 py-2">
            {[
              { q: "Como o indexador automático funciona?", a: "O Rankito usa a Google Indexing API oficial para enviar suas URLs diretamente ao Google. Você configura um agendamento (diário, semanal) e a IA seleciona automaticamente as URLs que precisam de atenção, priorizando por impacto. No plano Start, são 200 URLs/dia." },
              { q: "O agente IA tem acesso aos meus dados reais?", a: "Sim. O agente IA lê diretamente os dados do seu Google Search Console e GA4. Ele não responde com informações genéricas — ele fala sobre as suas keywords, as suas páginas e os seus resultados reais. Você conecta via Service Account segura." },
              { q: "Quanto tempo leva para configurar?", a: "A maioria dos usuários fica ativo em menos de 10 minutos. Você conecta o Google Search Console, importa suas URLs e ativa o piloto automático. Não precisa de programador, não precisa de instalação técnica." },
              { q: "O indexador funciona para qualquer tipo de site?", a: "Sim. Funciona para blogs, e-commerces, sites institucionais, portais de notícias e qualquer site que você vincule ao Google Search Console. A única limitação é o volume diário da API conforme seu plano." },
              { q: "Posso cancelar quando quiser?", a: "Sim. Sem contrato de fidelidade, sem multa. Você pode cancelar a qualquer momento pelo próprio painel. Se cancelar nos primeiros 7 dias, devolvemos 100% do valor — sem perguntas." },
              { q: "O que é o White-label do plano Unlimited?", a: "Você pode personalizar o Rankito com sua marca, logo e domínio personalizado. Seus clientes acessam a plataforma como se fosse uma ferramenta sua, sem ver o nome Rankito. Ideal para agências que querem oferecer SEO como serviço próprio." },
            ].map((faq, i) => <FAQItem key={i} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── 8. CTA FINAL ─ Close with urgency ────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-900 dark:bg-[#04060f]">
        <div className="absolute inset-0 pointer-events-none">
          <FloatingOrb className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 bg-violet-900/50 text-violet-300 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-violet-700/50">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Cada dia sem automação é lucro que você deixa para trás
            </div>
            {/* H2 — Urgency close */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-white">
              Comece hoje.{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Veja resultado essa semana.
              </span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed mb-4 max-w-xl mx-auto">
              Indexação automática + IA 24/7 + dados reais do Google. Tudo por{" "}
              <strong className="text-white">R$97/mês</strong> — menos que uma hora de consultoria SEO.
            </p>
            <p className="text-slate-500 mb-10 text-sm">
              Seus concorrentes já estão usando. Você vai ficar para trás?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <a href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-violet-500/40 transition-all hover:scale-105 group">
                <Rocket className="w-5 h-5" /> Começar agora — grátis por 7 dias
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-violet-400" /> 7 dias de garantia</div>
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
            © 2025 Rankito. A plataforma de SEO com IA mais completa do Brasil.
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
