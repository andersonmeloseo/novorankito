import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Globe, Search, BarChart3, Bot, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  target?: string; // CSS selector
  position?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Rankito! 🎉",
    description: "Vamos fazer um tour rápido pelas funcionalidades principais. Você pode pular a qualquer momento.",
    icon: Zap,
  },
  {
    title: "Seus Projetos",
    description: "Aqui você gerencia todos os seus sites. Clique em um projeto para ver métricas detalhadas de SEO, tráfego e conversões.",
    icon: Globe,
    target: "[data-tour='projects']",
  },
  {
    title: "Dashboard SEO",
    description: "Acesse dados do Google Search Console: cliques, impressões, posição média e CTR. Tudo sincronizado automaticamente.",
    icon: Search,
    target: "[data-tour='seo']",
  },
  {
    title: "Analytics & Tracking",
    description: "Monitore sessões, eventos comportamentais, heatmaps e jornadas de usuário com nosso tracking proprietário.",
    icon: BarChart3,
    target: "[data-tour='analytics']",
  },
  {
    title: "Rankito IA",
    description: "Seus agentes de IA especializados analisam dados e geram insights automaticamente. Configure alertas personalizados.",
    icon: Bot,
    target: "[data-tour='ai']",
  },
];

export function GuidedTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const shouldShow = localStorage.getItem("rankito_show_tour");
    if (shouldShow === "true") {
      setActive(true);
      localStorage.removeItem("rankito_show_tour");
    }
  }, []);

  const dismiss = useCallback(() => {
    setActive(false);
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

  if (!active) return null;

  const current = TOUR_STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[9998]"
            onClick={dismiss}
          />

          {/* Tour card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[90vw] max-w-md"
          >
            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Progress */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{current.title}</h3>
                      <span className="text-[10px] text-muted-foreground">
                        {step + 1} de {TOUR_STEPS.length}
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

                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {current.description}
                </p>

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
                      "h-1.5 rounded-full transition-all",
                      i === step ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
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
