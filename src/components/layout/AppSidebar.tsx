import {
  LayoutDashboard, Globe, Search, BarChart3, Database, Bot, MousePointerClick,
  Target, Megaphone, FileText, Settings, Users, CreditCard, FolderOpen,
  Shield, ChevronDown, LogOut, Coins, Building2, FileSignature,
  Layers, DollarSign, Store, TrendingUp, Plus, Network
} from "lucide-react";
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

const projectNav = [
  { title: "Visão Geral", url: "/overview", icon: LayoutDashboard },
  { title: "URLs", url: "/urls", icon: Globe },
  { title: "SEO", url: "/seo", icon: Search, tourId: "seo" },
  { title: "GA4", url: "/ga4", icon: BarChart3 },
  { title: "Indexação", url: "/indexing", icon: Database },
  { title: "Rankito IA", url: "/rankito-ai", icon: Bot, tourId: "ai" },
  { title: "Analítica Rankito", url: "/analitica-rankito", icon: MousePointerClick, tourId: "tracking" },
  { title: "Relatórios", url: "/reports", icon: FileText },
  { title: "Configurações", url: "/project-settings", icon: Settings },
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
  { title: "Grafo Semântico", url: "/semantic-graph", icon: Network },
];

const accountNav = [
  { title: "Usuários & Permissões", url: "/account/users", icon: Users },
  { title: "Billing & Planos", url: "/account/billing", icon: CreditCard },
];

function NavItem({ item, end }: { item: { title: string; url: string; icon: React.ElementType; tourId?: string }; end?: boolean }) {
  const { pathname } = useLocation();
  const isActive = end ? pathname === item.url : pathname.startsWith(item.url);

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

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 pb-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow ring-1 ring-white/10">
            <span className="text-sm font-bold text-primary-foreground font-display tracking-tight">R</span>
          </div>
          <div>
            <span className="font-bold text-base text-sidebar-primary-foreground font-display tracking-tight block leading-tight">Rankito</span>
            <span className="text-[10px] text-sidebar-foreground/40">SEO Intelligence</span>
          </div>
        </div>

        {/* Project selector */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/35 font-semibold">
            Projeto Ativo
          </span>
          {activeProject ? (
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-sidebar-muted/80 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group border border-sidebar-border/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 w-2 rounded-full bg-success shrink-0 shadow-[0_0_8px_hsl(155_70%_42%/0.6)] animate-pulse" />
                <span className="truncate">{activeProject.name}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/40 shrink-0 group-hover:text-sidebar-accent-foreground transition-all group-hover:translate-y-0.5" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/onboarding")}
              className="flex items-center justify-center gap-1.5 w-full px-2.5 py-2.5 rounded-xl text-xs font-medium border border-dashed border-sidebar-border text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-sidebar-primary/50 transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Criar Projeto</span>
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin py-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/35 font-semibold px-4">
            Projetos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem item={{ title: "Todos os Projetos", url: "/projects", icon: FolderOpen, tourId: "projects" }} end />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/35 font-semibold px-4">
            Projeto
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectNav.map((item) => (
                <NavItem key={item.url} item={item} end />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 my-1">
          <div className="h-px bg-sidebar-border/50" />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/35 font-semibold px-4">
            💰 Rank & Rent
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rankRentNav.map((item) => (
                <NavItem key={item.url} item={item} end={item.url === "/rank-rent"} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/35 font-semibold px-4">
            🧠 SEO Semântico
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {semanticNav.map((item) => (
                <NavItem key={item.url} item={item} end />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 my-1">
          <div className="h-px bg-sidebar-border/50" />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/35 font-semibold px-4">
            Conta
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNav.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 shadow-glow ring-1 ring-white/10">
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="text-xs min-w-0">
              <div className="font-semibold text-sidebar-primary-foreground truncate leading-tight">{displayName}</div>
              <div className="text-sidebar-foreground/40 truncate text-[11px]">{user?.email}</div>
            </div>
          </div>
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