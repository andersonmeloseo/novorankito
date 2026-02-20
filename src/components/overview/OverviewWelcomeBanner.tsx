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
  const greeting = name ? `${greet}, ${name}!` : `${greet}!`;
  const totalMetrics = (overview?.total_clicks ?? 0) + (overview?.total_impressions ?? 0);

  return (
    <AnimatedContainer>
      <div className="gradient-primary rounded-2xl p-5 sm:p-6 text-primary-foreground relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute top-0 left-0 h-24 w-24 rounded-full bg-white/[0.03] blur-2xl" />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 opacity-70" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">Dashboard</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight">{greeting} 👋</h2>
            <p className="text-xs opacity-70 max-w-md leading-relaxed">
              {project ? `${project.name} — Últimos 28 dias de performance` : "Crie um projeto para começar a monitorar."}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1.5">
            {totalMetrics > 0 && (
              <Badge className="bg-white/10 text-white border-white/15 text-[10px] backdrop-blur-sm">
                <Search className="h-3 w-3 mr-1 opacity-70" /> {formatCompact(totalMetrics)} registros
              </Badge>
            )}
            {hasGa4 && (
              <Badge className="bg-white/10 text-white border-white/15 text-[10px] backdrop-blur-sm">
                <Activity className="h-3 w-3 mr-1 opacity-70" /> GA4
              </Badge>
            )}
            {hasGscLive && (
              <Badge className="bg-white/10 text-white border-white/15 text-[10px] backdrop-blur-sm">
                <TrendingUp className="h-3 w-3 mr-1 opacity-70" /> Ao vivo
              </Badge>
            )}
          </div>
        </div>
      </div>
    </AnimatedContainer>
  );
}
