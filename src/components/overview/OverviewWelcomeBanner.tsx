import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { Sparkles, Search, Activity, TrendingUp } from "lucide-react";
import { formatCompact, type OverviewRpcData } from "./types";
import type { User } from "@supabase/supabase-js";

interface OverviewWelcomeBannerProps {
  user: User | null;
  project?: { id: string; name: string; domain: string } | null;
  overview: OverviewRpcData | null;
  hasGscLive: boolean;
  hasGa4: boolean;
}

export function OverviewWelcomeBanner({ user, project, overview, hasGscLive, hasGa4 }: OverviewWelcomeBannerProps) {
  const hour = new Date().getHours();
  const greet = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
  const name = user?.user_metadata?.display_name || user?.user_metadata?.name || "";
  const greeting = name ? `${greet}, ${name}! 👋` : `${greet}!`;
  const totalMetrics = (overview?.total_clicks ?? 0) + (overview?.total_impressions ?? 0);

  return (
    <AnimatedContainer>
      <div className="gradient-primary rounded-2xl p-5 sm:p-7 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Dashboard</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight">{greeting}</h2>
            <p className="text-sm opacity-80 mt-1.5 max-w-lg">
              {project ? `Projeto: ${project.name} — Dados dos últimos 28 dias` : "Crie um projeto para começar."}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1.5">
            {totalMetrics > 0 && <Badge className="bg-white/15 text-white border-white/20 text-[10px]"><Search className="h-3 w-3 mr-1" /> {formatCompact(totalMetrics)} registros</Badge>}
            {hasGa4 && <Badge className="bg-white/15 text-white border-white/20 text-[10px]"><Activity className="h-3 w-3 mr-1" /> GA4 Ativo</Badge>}
            {hasGscLive && <Badge className="bg-white/15 text-white border-white/20 text-[10px]"><TrendingUp className="h-3 w-3 mr-1" /> Dados ao vivo</Badge>}
          </div>
        </div>
      </div>
    </AnimatedContainer>
  );
}
