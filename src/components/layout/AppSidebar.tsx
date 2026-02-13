import {
  LayoutDashboard, Globe, Search, BarChart3, Database, Bot, MousePointerClick,
  Target, Megaphone, FileText, Settings, Users, CreditCard, FolderOpen,
  Shield, ChevronDown, Zap
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

const projectNav = [
  { title: "Overview", url: "/overview", icon: LayoutDashboard },
  { title: "URLs", url: "/urls", icon: Globe },
  { title: "SEO", url: "/seo", icon: Search },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Indexing", url: "/indexing", icon: Database },
  { title: "AI Agent", url: "/ai-agent", icon: Bot },
  { title: "Tracking", url: "/tracking", icon: MousePointerClick },
  { title: "Conversions", url: "/conversions", icon: Target },
  { title: "Ads", url: "/ads", icon: Megaphone },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/project-settings", icon: Settings },
];

const accountNav = [
  { title: "Projects", url: "/projects", icon: FolderOpen },
  { title: "Users & Permissions", url: "/account/users", icon: Users },
  { title: "Billing & Plans", url: "/account/billing", icon: CreditCard },
  { title: "Admin", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground tracking-tight">Rankito</span>
        </div>
        <button className="flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span>{mockProjects[0].name}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-4">
            Project
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
            Account
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">R</div>
            <div className="text-xs">
              <div className="font-medium text-foreground">Rafael</div>
              <div className="text-muted-foreground">Owner</div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
