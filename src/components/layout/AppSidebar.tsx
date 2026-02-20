import {
  LayoutDashboard, Globe, Search, BarChart3, Database, Bot, MousePointerClick,
  Target, Megaphone, FileText, Settings, Users, CreditCard, FolderOpen,
  Shield, ChevronDown, LogOut, Coins, Building2, FileSignature,
  Layers, DollarSign, Store, TrendingUp, Plus, Network,
  History, CalendarClock, Wifi, Map, Monitor, Sparkles, TrendingDown,
  Copy, ScanSearch, MapPin, Link2, Compass, FolderTree, Plug, Bell, Palette, Key, User, Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

import {
  Activity, Flame as FlameIcon, ShoppingCart, Footprints, PhoneCall, Flag, Code,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const projectNav = [
  { title: "Visão Geral", url: "/overview", icon: LayoutDashboard },
  { title: "Relatórios", url: "/reports", icon: FileText },
];

const settingsNav = [
  { title: "Geral", url: "/project-settings#general", icon: Settings },
  { title: "Integrações", url: "/project-settings#integrations", icon: Plug },
  { title: "Tracking", url: "/project-settings#tracking", icon: Code },
  { title: "Metas & Alertas", url: "/project-settings#goals", icon: Bell },
  { title: "Equipe", url: "/project-settings#team", icon: Users },
  { title: "API & Webhooks", url: "/project-settings#api", icon: Key },
  { title: "White-Label", url: "/project-settings#whitelabel", icon: Palette },
];

const rankitoAiNav = [
  { title: "Chat", url: "/rankito-ai#chat", icon: Bot },
  { title: "Agentes", url: "/rankito-ai#agents", icon: Users },
  { title: "Workflows", url: "/rankito-ai#workflows", icon: Target },
  { title: "Canvas", url: "/rankito-ai#canvas", icon: Network },
  { title: "Orquestrador", url: "/rankito-ai#orchestrator", icon: Building2 },
  { title: "Agendamentos", url: "/rankito-ai#schedules", icon: CalendarClock },
];

const ga4Nav = [
  { title: "Visão Geral", url: "/ga4#overview", icon: TrendingUp },
  { title: "Tempo Real", url: "/ga4#realtime", icon: Wifi },
  { title: "Aquisição", url: "/ga4#acquisition", icon: MousePointerClick },
  { title: "Tráfego de IA", url: "/ga4#ai-traffic", icon: Bot },
  { title: "Performance", url: "/ga4#engagement", icon: Monitor },
  { title: "Público", url: "/ga4#demographics", icon: Globe },
  { title: "Tecnologia", url: "/ga4#technology", icon: Layers },
  { title: "Retenção", url: "/ga4#retention", icon: Users },
  { title: "E-commerce", url: "/ga4#ecommerce", icon: Store },
];

const indexingNav = [
  { title: "Dashboard", url: "/indexing#dashboard", icon: LayoutDashboard },
  { title: "URLs", url: "/indexing#inventory", icon: Layers },
  { title: "Sitemap", url: "/indexing#sitemap", icon: Map },
  { title: "Histórico", url: "/indexing#history", icon: History },
  { title: "Agendar", url: "/indexing#schedule", icon: CalendarClock },
  { title: "Contas", url: "/indexing#accounts", icon: Wifi },
];

const seoNav = [
  { title: "Consultas", url: "/seo#queries", icon: Search },
  { title: "Páginas", url: "/seo#pages", icon: FileText },
  { title: "Países", url: "/seo#countries", icon: Globe },
  { title: "Dispositivos", url: "/seo#devices", icon: Monitor },
  { title: "Aparência", url: "/seo#appearance", icon: Sparkles },
  { title: "Oportunidades", url: "/seo#opportunities", icon: Target },
  { title: "Declínio", url: "/seo#decay", icon: TrendingDown },
  { title: "Canibalização", url: "/seo#cannibalization", icon: Copy },
  { title: "Inspeção", url: "/seo#inspection", icon: ScanSearch },
  { title: "Cobertura", url: "/seo#coverage", icon: Shield },
  { title: "Sitemaps", url: "/seo#sitemaps", icon: MapPin },
  { title: "Links", url: "/seo#links", icon: Link2 },
  { title: "Discover & News", url: "/seo#discover", icon: Compass },
  { title: "Histórico", url: "/seo#history", icon: History },
  { title: "Agrupamento", url: "/seo#grouping", icon: FolderTree },
  { title: "IA Insights", url: "/seo#ai-insights", icon: Sparkles },
  { title: "On-Page", url: "/seo#onpage", icon: ScanSearch },
];

const analiticaNav = [
  { title: "Eventos", url: "/analitica-rankito/eventos", icon: Activity },
  { title: "Sessões", url: "/analitica-rankito/sessoes", icon: Users },
  { title: "Heatmaps", url: "/analitica-rankito/heatmaps", icon: FlameIcon },
  { title: "E-commerce", url: "/analitica-rankito/ecommerce", icon: ShoppingCart },
  { title: "Jornada", url: "/analitica-rankito/jornada", icon: Footprints },
  { title: "Ads & UTM", url: "/analitica-rankito/ads-utm", icon: Target },
  { title: "Offline", url: "/analitica-rankito/offline", icon: PhoneCall },
  { title: "Event Builder", url: "/analitica-rankito/event-builder", icon: MousePointerClick },
  { title: "Metas", url: "/analitica-rankito/metas", icon: Flag },
  { title: "Instalar o Pixel", url: "/analitica-rankito/pixel", icon: Code },
];

const rankRentNav = [
  { title: "Visão Geral", url: "/rank-rent", icon: Coins },
  { title: "Clientes", url: "/rank-rent/clients", icon: Building2 },
  { title: "Contratos", url: "/rank-rent/contracts", icon: FileSignature },
  { title: "Páginas", url: "/rank-rent/pages", icon: Layers },
  { title: "Financeiro", url: "/rank-rent/financial", icon: DollarSign },
  { title: "Performance", url: "/rank-rent/performance", icon: TrendingUp },
  { title: "Disponibilidade", url: "/rank-rent/availability", icon: Store },
];

const semanticNav = [
  { title: "Construtor de Grafo", url: "/semantic-graph#builder", icon: Network },
  { title: "Dashboard", url: "/semantic-graph#dashboard", icon: LayoutDashboard },
  { title: "Triplas", url: "/semantic-graph#triples", icon: Database },
  { title: "Schema.org", url: "/semantic-graph#schema", icon: Layers },
  { title: "Competidores", url: "/semantic-graph#competitors", icon: Target },
  { title: "Recomendações", url: "/semantic-graph#recommendations", icon: Sparkles },
  { title: "Metas", url: "/semantic-graph#goals", icon: Flag },
  { title: "Feedback", url: "/semantic-graph#feedback", icon: Megaphone },
];

const accountNav = [
  { title: "Minha Conta", url: "/account/profile", icon: User },
  { title: "Usuários & Permissões", url: "/account/users", icon: Users },
  { title: "Billing & Planos", url: "/account/billing", icon: CreditCard },
];

const academyNav = [
  { title: "Academy", url: "/academy", icon: Sparkles },
];

function NavItem({ item, end }: { item: { title: string; url: string; icon: React.ElementType; tourId?: string }; end?: boolean }) {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const fullPath = pathname + hash;
  const hasHash = item.url.includes("#");
  const isActive = hasHash
    ? fullPath === item.url
    : end ? pathname === item.url : pathname.startsWith(item.url);

  // For hash-based URLs, use a button to ensure proper navigation
  if (hasHash) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <button
            data-tour={item.tourId}
            onClick={() => navigate(item.url)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 relative w-full text-left",
              isActive && "sidebar-active-glow bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            )}
          >
            <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "opacity-100" : "opacity-70")} />
            <span>{item.title}</span>
          </button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={end}
          data-tour={item.tourId}
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 relative",
            isActive && "sidebar-active-glow"
          )}
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        >
          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "opacity-100" : "opacity-70")} />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const wl = useWhiteLabel();

  const { data: projects = [] } = useQuery({
    queryKey: ["sidebar-projects", user?.id],
    queryFn: async () => {
      const { data: owned } = await supabase
        .from("projects")
        .select("id, name, domain, status")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      const { data: memberships } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user!.id);
      const memberProjectIds = (memberships || []).map(m => m.project_id);
      const ownedIds = new Set((owned || []).map(p => p.id));
      const extraIds = memberProjectIds.filter(id => !ownedIds.has(id));
      let memberProjects: any[] = [];
      if (extraIds.length > 0) {
        const { data } = await supabase
          .from("projects")
          .select("id, name, domain, status")
          .in("id", extraIds);
        memberProjects = data || [];
      }
      return [...(owned || []), ...memberProjects];
    },
    enabled: !!user,
  });

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";
  const storedId = localStorage.getItem("rankito_current_project");
  const activeProject = projects.find(p => p.id === storedId) || projects[0];

  const switchProject = (id: string) => {
    localStorage.setItem("rankito_current_project", id);
    window.location.href = "/overview";
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 pb-3 border-b border-sidebar-border">
         <div className="flex items-center gap-2.5 mb-4">
          {wl.logo_url ? (
            <img src={wl.logo_url} alt={wl.brand_name} className="h-9 w-9 rounded-xl object-contain" />
          ) : (
            <div
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center shadow-glow ring-1 ring-white/10 animate-[spin_8s_linear_infinite]",
                !wl.gradient_end_color && "gradient-primary"
              )}
              style={wl.gradient_end_color
                ? { background: `linear-gradient(135deg, ${wl.primary_color || '#6366f1'}, ${wl.gradient_end_color})` }
                : undefined
              }
            >
              <span className="text-sm font-bold text-primary-foreground font-display tracking-tight animate-[spin_8s_linear_infinite_reverse]">{wl.brand_name.charAt(0)}</span>
            </div>
          )}
          <div>
            <span className="font-bold text-base text-transparent bg-clip-text bg-gradient-to-r from-white via-sidebar-primary to-white bg-[length:200%_100%] animate-[shimmer-text_3s_ease-in-out_infinite] font-display tracking-tight block leading-tight">{wl.brand_name}</span>
            <span className="text-[10px] text-sidebar-foreground/50">{wl.subtitle}</span>
          </div>
        </div>

        {/* Project selector */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/35 font-semibold">
            Projeto Ativo
          </span>
        {activeProject ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-sidebar-muted/80 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group border border-sidebar-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2 w-2 rounded-full bg-success shrink-0 shadow-[0_0_8px_hsl(155_70%_42%/0.6)] animate-pulse" />
                    <span className="truncate">{activeProject.name}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-sidebar-foreground/40 shrink-0 group-hover:text-sidebar-accent-foreground transition-all group-hover:translate-y-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="w-56 z-[200] bg-popover border border-border shadow-lg">
                {projects.map(p => (
                  <DropdownMenuItem key={p.id} onClick={() => switchProject(p.id)} className="cursor-pointer">
                    <Check className={cn("h-3.5 w-3.5 mr-2 shrink-0", p.id !== activeProject?.id && "invisible")} />
                    <span className="truncate">{p.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/projects")} className="cursor-pointer">
                  <FolderOpen className="h-3.5 w-3.5 mr-2 shrink-0" />
                  <span>Ver todos os projetos</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/onboarding?new=1")} className="cursor-pointer">
                  <Plus className="h-3.5 w-3.5 mr-2 shrink-0" />
                  <span>Novo Projeto</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => navigate("/onboarding?new=1")}
              className="flex items-center justify-center gap-1.5 w-full px-2.5 py-2.5 rounded-xl text-xs font-medium border border-dashed border-sidebar-border text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-sidebar-primary/50 transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Criar Projeto</span>
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin py-1">
        <Collapsible defaultOpen={true}>
          <SidebarGroup>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                <span>🚀 Inicie por Aqui</span>
                <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <NavItem item={{ title: "Todos os Projetos", url: "/projects", icon: FolderOpen, tourId: "projects" }} end />
                  <div className="h-2" />
                  <NavItem item={{ title: "Guia de Início", url: "/getting-started", icon: Sparkles }} end />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {activeProject && (
          <div className="relative ml-3 mr-2">
            {/* Vertical hierarchy line with animated glow */}
            <div className="absolute left-0 top-0 bottom-3 w-[2px] rounded-full bg-sidebar-primary/50 shadow-[0_0_8px_hsl(var(--sidebar-primary)/0.6)] overflow-hidden">
              <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-sidebar-primary to-transparent animate-[sidebar-flow_2.5s_ease-in-out_infinite] opacity-80" />
            </div>
            
            {/* Connection dot at top */}
            <div className="absolute left-0 top-2 -translate-x-[2.5px] h-[7px] w-[7px] rounded-full bg-sidebar-primary shadow-[0_0_10px_hsl(var(--sidebar-primary)/0.7)] animate-pulse" />

            <div className="pl-2.5">
              <Collapsible defaultOpen={pathname === "/overview" || pathname === "/reports"}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>📁 Projeto</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {projectNav.map((item) => (
                          <NavItem key={item.url} item={item} end />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>

              <Collapsible defaultOpen={pathname.startsWith("/project-settings")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>⚙️ Configurações</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {settingsNav.map((item) => (
                          <NavItem key={item.url} item={item} end />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>

              <Collapsible defaultOpen={pathname.startsWith("/rankito-ai")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>🤖 {wl.brand_name} IA</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {rankitoAiNav.map((item) => (
                          <NavItem key={item.url} item={item} end />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>

              <Collapsible defaultOpen={pathname.startsWith("/seo")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>🔍 SEO</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {seoNav.map((item) => (
                          <NavItem key={item.url} item={item} end />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>

              <Collapsible defaultOpen={pathname.startsWith("/ga4")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>📊 GA4</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {ga4Nav.map((item) => (
                          <NavItem key={item.url} item={item} end />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>

              <Collapsible defaultOpen={pathname.startsWith("/indexing")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>🗂️ Indexação</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {indexingNav.map((item) => (
                          <NavItem key={item.url} item={item} end />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>

              <Collapsible defaultOpen={pathname.startsWith("/analitica-rankito")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>📊 Analítica Rankito</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <NavItem item={{ title: "Visão Geral", url: "/analitica-rankito", icon: MousePointerClick, tourId: "tracking" }} end />
                        {analiticaNav.map((item) => (
                          <NavItem key={item.url} item={item} end />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>

              <div className="mx-4 my-1">
                <div className="h-px bg-sidebar-border/50" />
              </div>

              <Collapsible defaultOpen={pathname.startsWith("/rank-rent")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>💰 Rank & Rent</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {rankRentNav.map((item) => (
                          <NavItem key={item.url} item={item} end={item.url === "/rank-rent"} />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>

              <Collapsible defaultOpen={pathname.startsWith("/semantic-graph")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                      <span>🧠 SEO Semântico</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {semanticNav.map((item) => (
                          <NavItem key={item.url} item={item} end />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            </div>
          </div>
        )}

        <div className="mx-4 my-1">
          <div className="h-px bg-sidebar-border/50" />
        </div>

        {/* Academy */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {academyNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="sidebar-academy-pulse flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 relative font-medium"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <span className="text-base leading-none shrink-0">🎓</span>
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 my-1">
          <div className="h-px bg-sidebar-border/50" />
        </div>

        <Collapsible defaultOpen={pathname.startsWith("/account")}>
          <SidebarGroup>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="sidebar-section-label cursor-pointer flex items-center justify-between w-full">
                <span>👤 Conta</span>
                <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountNav.map((item) => (
                    <NavItem key={item.url} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => navigate("/admin")}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-destructive hover:bg-destructive/10 transition-all duration-200"
                    >
                      <Shield className="h-4 w-4 shrink-0" />
                      <span>Super Admin</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-2">
        {/* Footer text / Powered by */}
        {(wl.footer_text || !wl.hide_powered_by) && (
          <div className="text-center">
            {wl.footer_text && (
              <p className="text-[10px] text-sidebar-foreground/40">{wl.footer_text}</p>
            )}
            {!wl.hide_powered_by && wl.brand_name !== "Rankito" && (
              <p className="text-[9px] text-sidebar-foreground/30">Powered by Rankito</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate("/account/profile")}
            className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity text-left"
          >
            <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 shadow-glow ring-1 ring-white/10">
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="text-xs min-w-0">
              <div className="font-semibold text-sidebar-primary-foreground truncate leading-tight">{displayName}</div>
              <div className="text-sidebar-foreground/40 truncate text-[11px]">{user?.email}</div>
            </div>
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10" onClick={signOut} title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}