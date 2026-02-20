import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Globe, Search, BarChart3, Bot, Zap, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  sidebarTarget?: string; // data-tour value on sidebar item
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Rankito! 🎉",
    description: "Vamos fazer um tour rápido pelas funcionalidades principais da plataforma. Você pode pular a qualquer momento.",
    icon: Zap,
  },
  {
    title: "Seus Projetos",
    description: "Gerencie todos os seus sites em um só lugar. Cada projeto tem seu próprio painel com métricas de SEO, tráfego e conversões. Use o seletor no topo da sidebar para alternar entre projetos.",
    icon: Globe,
    sidebarTarget: "projects",
  },
  {
    title: "Dashboard SEO",
    description: "Acesse dados do Google Search Console: cliques, impressões, posição média e CTR. Configure múltiplas Service Accounts para escalar suas quotas de indexação.",
    icon: Search,
    sidebarTarget: "seo",
  },
  {
    title: "Analítica & Tracking",
    description: "Monitore sessões, eventos comportamentais, heatmaps e jornadas de usuário com nosso tracking proprietário. Tudo sem depender de terceiros.",
    icon: MousePointerClick,
    sidebarTarget: "tracking",
  },
  {
    title: "Rankito IA",
    description: "Seus agentes de IA especializados (Growth, SEO e Analytics) analisam dados e geram insights automaticamente. Configure alertas e receba relatórios via WhatsApp ou email.",
    icon: Bot,
    sidebarTarget: "ai",
  },
];

export function GuidedTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shouldShow = localStorage.getItem("rankito_show_tour");
    if (shouldShow === "true") {
      // Small delay so the layout renders first
      const timer = setTimeout(() => {
        setActive(true);
        localStorage.removeItem("rankito_show_tour");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Highlight sidebar item for current step
  useEffect(() => {
    if (!active) return;
    const current = TOUR_STEPS[step];
    // Remove previous highlights
    document.querySelectorAll("[data-tour-highlight]").forEach(el => {
      el.removeAttribute("data-tour-highlight");
    });
    if (current.sidebarTarget) {
      const el = document.querySelector(`[data-tour="${current.sidebarTarget}"]`);
      if (el) {
        el.setAttribute("data-tour-highlight", "true");
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    return () => {
      document.querySelectorAll("[data-tour-highlight]").forEach(el => {
        el.removeAttribute("data-tour-highlight");
      });
    };
  }, [active, step]);

  const dismiss = useCallback(() => {
    setActive(false);
    document.querySelectorAll("[data-tour-highlight]").forEach(el => {
      el.removeAttribute("data-tour-highlight");
    });
    localStorage.setItem("rankito_tour_completed", "true");
  }, []);

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, step]);

  if (!active) return null;

  const current = TOUR_STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Overlay - allows clicking sidebar items */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/50 backdrop-blur-[2px] z-[9998] pointer-events-auto"
            onClick={dismiss}
          />

          {/* Tour card - fixed at bottom center */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[92vw] max-w-[420px]"
          >
            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <motion.div
                      key={step}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                      className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{current.title}</h3>
                      <span className="text-[10px] text-muted-foreground">
                        Passo {step + 1} de {TOUR_STEPS.length}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={dismiss}
                    className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Description */}
                <motion.p
                  key={step}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xs text-muted-foreground leading-relaxed mb-4"
                >
                  {current.description}
                </motion.p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismiss}
                    className="text-xs text-muted-foreground h-8"
                  >
                    Pular tour
                  </Button>
                  <div className="flex gap-2">
                    {step > 0 && (
                      <Button variant="outline" size="sm" onClick={prev} className="h-8 text-xs gap-1">
                        <ArrowLeft className="h-3 w-3" /> Anterior
                      </Button>
                    )}
                    <Button size="sm" onClick={next} className="h-8 text-xs gap-1">
                      {step === TOUR_STEPS.length - 1 ? "Começar!" : "Próximo"}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step dots */}
              <div className="flex justify-center gap-1.5 pb-3">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === step ? "w-5 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
