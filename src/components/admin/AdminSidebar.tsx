import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Building2, CreditCard, FolderOpen,
  Plug, ShieldCheck, ScrollText, Settings, Bell, Flag,
  ArrowLeft, Search, ChevronDown, Plus, Activity,
  Megaphone, FlaskConical, BarChart3, Key, Crown
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const adminSections = [
  {
    label: "Principal",
    items: [
      { title: "Visão Geral", url: "/admin", icon: LayoutDashboard, end: true },
      { title: "Clientes", url: "/admin/clients", icon: Building2 },
      { title: "Usuários", url: "/admin/users", icon: Users },
    ],
  },
  {
    label: "Negócio",
    items: [
      { title: "Gestão de Planos", url: "/admin/plans", icon: Crown },
      { title: "Planos & Billing", url: "/admin/billing", icon: CreditCard },
      { title: "Projetos / Workspaces", url: "/admin/projects", icon: FolderOpen },
      { title: "Uso & Limites", url: "/admin/usage", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "APIs & Chaves", url: "/admin/apis", icon: Key },
      { title: "Integrações", url: "/admin/integrations", icon: Plug },
      { title: "Segurança", url: "/admin/security", icon: ShieldCheck },
      { title: "Logs & Monitoramento", url: "/admin/logs", icon: ScrollText },
      { title: "Saúde do Sistema", url: "/admin/health", icon: Activity },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Configurações Globais", url: "/admin/settings", icon: Settings },
      { title: "Notificações", url: "/admin/notifications", icon: Bell },
      { title: "Feature Flags", url: "/admin/flags", icon: Flag },
      { title: "Anúncios", url: "/admin/announcements", icon: Megaphone },
    ],
  },
];

const linkBase =
  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-200";
const linkIdle =
  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
const linkActive =
  "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_hsl(var(--sidebar-primary))]";

export function AdminSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 transition-all duration-200",
        collapsed ? "w-[56px]" : "w-[240px]"
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-2">
          <button
            onClick={() => navigate("/overview")}
            className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 hover:bg-destructive/20 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-destructive" />
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-bold text-sm text-sidebar-primary-foreground font-display tracking-tight block">
                Super Admin
              </span>
              <span className="text-[10px] text-sidebar-foreground/50">Gestão da Plataforma</span>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
            <Input
              placeholder="Buscar…"
              className="h-7 pl-8 text-xs bg-sidebar-muted border-sidebar-border focus:border-sidebar-primary/50"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-4">
        {adminSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <span className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/40 font-semibold px-3 mb-1 block">
                {section.label}
              </span>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.url}>
                  <NavLink
                    to={item.url}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(linkBase, isActive ? linkActive : linkIdle)
                    }
                    title={item.title}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground/50"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", collapsed ? "-rotate-90" : "rotate-90")} />
        </Button>
      </div>
    </aside>
  );
}
