import {
  LayoutDashboard, Globe, Search, BarChart3, Database, Bot, MousePointerClick,
  Target, Megaphone, FileText, Settings, Users, CreditCard, FolderOpen,
  ChevronDown, LogOut, Coins, Building2, FileSignature,
  Layers, DollarSign, Store, TrendingUp, Plus
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

const projectNav = [
  { title: "Visão Geral", url: "/overview", icon: LayoutDashboard },
  { title: "URLs", url: "/urls", icon: Globe },
  { title: "SEO", url: "/seo", icon: Search },
  { title: "GA4", url: "/ga4", icon: BarChart3 },
  { title: "Indexação", url: "/indexing", icon: Database },
  { title: "Agente IA", url: "/ai-agent", icon: Bot },
  { title: "Analítica Rankito", url: "/analitica-rankito", icon: MousePointerClick },
  { title: "Conversões", url: "/conversions", icon: Target },
  { title: "Ads", url: "/ads", icon: Megaphone },
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

const accountNav = [
  { title: "Usuários & Permissões", url: "/account/users", icon: Users },
  { title: "Billing & Planos", url: "/account/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const { data: projects = [] } = useQuery({
    queryKey: ["sidebar-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, domain, status")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";
  const activeProject = projects[0];

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-sm font-bold text-primary-foreground font-display tracking-tight">R</span>
          </div>
          <span className="font-bold text-base text-sidebar-primary-foreground font-display tracking-tight">Rankito</span>
        </div>

        {/* Project selector */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/40 font-semibold">
            Escolha seu Projeto
          </span>
          {activeProject ? (
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs font-medium bg-sidebar-muted text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 w-2 rounded-full bg-success shrink-0 shadow-[0_0_6px_hsl(155_70%_42%/0.5)]" />
                <span className="truncate">{activeProject.name}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/50 shrink-0 group-hover:text-sidebar-accent-foreground transition-colors" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/onboarding")}
              className="flex items-center justify-center gap-1.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium border border-dashed border-sidebar-border text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Criar Projeto</span>
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {/* Projects list */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/40 font-semibold px-4">
            Projetos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/projects"
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_hsl(var(--sidebar-primary))]"
                  >
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    <span>Todos os Projetos</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/40 font-semibold px-4">
            Projeto
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_hsl(var(--sidebar-primary))]"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/40 font-semibold px-4">
            💰 Rank & Rent
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rankRentNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/rank-rent"}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_hsl(var(--sidebar-primary))]"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/40 font-semibold px-4">
            Conta
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_hsl(var(--sidebar-primary))]"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 shadow-glow">
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="text-xs min-w-0">
              <div className="font-semibold text-sidebar-primary-foreground truncate">{displayName}</div>
              <div className="text-sidebar-foreground/50 truncate text-[11px]">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" onClick={signOut} title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}