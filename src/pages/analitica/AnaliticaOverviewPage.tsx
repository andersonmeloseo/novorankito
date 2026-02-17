import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTrackingEvents } from "@/hooks/use-tracking-events";
import { AnimatedContainer, StaggeredGrid } from "@/components/ui/animated-container";
import {
  Activity, Users, Flame, ShoppingCart, Footprints, Target,
  PhoneCall, MousePointerClick, Flag, Code, Loader2,
} from "lucide-react";

const sections = [
  { title: "Eventos", desc: "Todos os eventos capturados em tempo real", icon: Activity, path: "/analitica-rankito/eventos", color: "hsl(var(--primary))" },
  { title: "Sessões", desc: "Sessões individuais dos visitantes", icon: Users, path: "/analitica-rankito/sessoes", color: "hsl(var(--info))" },
  { title: "Heatmaps", desc: "Mapas de calor, scroll e movimento", icon: Flame, path: "/analitica-rankito/heatmaps", color: "hsl(var(--warning))" },
  { title: "E-commerce", desc: "Funis de compra e receita", icon: ShoppingCart, path: "/analitica-rankito/ecommerce", color: "hsl(var(--success))" },
  { title: "Jornada do Usuário", desc: "Caminhos de navegação dos visitantes", icon: Footprints, path: "/analitica-rankito/jornada", color: "hsl(var(--chart-4))" },
  { title: "Ads & UTM", desc: "Atribuição de campanhas e UTMs", icon: Target, path: "/analitica-rankito/ads-utm", color: "hsl(var(--chart-5))" },
  { title: "Conversão Offline", desc: "Ligações, formulários offline", icon: PhoneCall, path: "/analitica-rankito/offline", color: "hsl(var(--chart-6))" },
  { title: "Eventos Personalizados", desc: "Crie triggers customizados", icon: MousePointerClick, path: "/analitica-rankito/event-builder", color: "hsl(var(--chart-7))" },
  { title: "Metas", desc: "Defina e acompanhe metas de conversão", icon: Flag, path: "/analitica-rankito/metas", color: "hsl(var(--chart-8))" },
  { title: "Pixel Rankito", desc: "Instale e configure o script de tracking", icon: Code, path: "/analitica-rankito/pixel", color: "hsl(var(--muted-foreground))" },
];

export default function AnaliticaOverviewPage() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("rankito_current_project");
  const { data: events = [], isLoading } = useTrackingEvents(projectId);

  const totalEvents = events.length;
  const uniqueSessions = new Set(events.map(e => e.session_id || e.visitor_id)).size;
  const uniquePages = new Set(events.map(e => e.page_url)).size;

  return (
    <>
      <TopBar title="Analítica Rankito" subtitle="Pixel v4.1.0 — Hub de Tracking Universal" />
      <div className="p-4 sm:p-6 space-y-5">
        <Card className="p-4 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
          </span>
          <span className="text-sm font-medium text-foreground">Pixel Ativado — Capturando Eventos em Tempo Real</span>
          <Badge variant="secondary" className="text-[10px]">v4.1.0</Badge>
          {!isLoading && (
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{totalEvents.toLocaleString("pt-BR")}</strong> eventos</span>
              <span><strong className="text-foreground">{uniqueSessions.toLocaleString("pt-BR")}</strong> sessões</span>
              <span><strong className="text-foreground">{uniquePages}</strong> páginas</span>
            </div>
          )}
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sections.map((s) => (
              <AnimatedContainer key={s.path}>
                <Card
                  className="p-5 cursor-pointer card-hover group relative overflow-hidden transition-all duration-200 hover:shadow-lg"
                  onClick={() => navigate(s.path)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex flex-col gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)` }}
                    >
                      <s.icon className="h-5 w-5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                </Card>
              </AnimatedContainer>
            ))}
          </StaggeredGrid>
        )}
      </div>
    </>
  );
}
