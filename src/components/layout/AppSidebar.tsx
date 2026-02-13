import {
  LayoutDashboard, Globe, Search, BarChart3, Database, Bot, MousePointerClick,
  Target, Megaphone, FileText, Settings, Users, CreditCard, FolderOpen,
  Shield, ChevronDown, Zap, LogOut, Coins, Building2, FileSignature,
  Layers, DollarSign, Store, TrendingUp
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { mockProjects } from "@/lib/mock-data";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const projectNav = [
  { title: "Visão Geral", url: "/overview", icon: LayoutDashboard },
  { title: "URLs", url: "/urls", icon: Globe },
  { title: "SEO", url: "/seo", icon: Search },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Indexação", url: "/indexing", icon: Database },
  { title: "Agente IA", url: "/ai-agent", icon: Bot },
  { title: "Tracking", url: "/tracking", icon: MousePointerClick },
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
  { title: "Projetos", url: "/projects", icon: FolderOpen },
  { title: "Usuários & Permissões", url: "/account/users", icon: Users },
  { title: "Billing & Planos", url: "/account/billing", icon: CreditCard },
  { title: "Admin", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground tracking-tight">Rankito</span>
        </div>
        <button className="flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-2 w-2 rounded-full bg-success shrink-0" />
            <span className="truncate">{mockProjects[0].name}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-4">
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
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-4">
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
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-4">
            Conta
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="text-xs min-w-0">
              <div className="font-medium text-foreground truncate">{displayName}</div>
              <div className="text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut} title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
