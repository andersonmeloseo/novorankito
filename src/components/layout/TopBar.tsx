import { Search, Calendar, Download, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getUserDisplayName(user: any): string {
  if (!user) return "";
  const meta = user.user_metadata;
  if (meta?.display_name) return meta.display_name;
  if (meta?.full_name) return meta.full_name;
  if (meta?.name) return meta.name;
  if (user.email) return user.email.split("@")[0];
  return "";
}

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuth();
  const displayName = getUserDisplayName(user);
  const greeting = getGreeting();

  return (
    <header className="border-b border-border bg-background/70 backdrop-blur-xl sticky top-0 z-20 px-4 sm:px-6">
      <div className="flex items-center justify-between h-16 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground font-display tracking-tight truncate leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {displayName && (
            <span className="hidden lg:block text-xs text-muted-foreground">
              {greeting}, <span className="font-medium text-foreground">{displayName}</span> 👋
            </span>
          )}

          <div className="hidden md:flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6 bg-success/5 border-success/20 text-success">
              <Wifi className="h-3 w-3" /> GSC
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6 bg-success/5 border-success/20 text-success">
              <Wifi className="h-3 w-3" /> GA4
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6">
              <WifiOff className="h-3 w-3 text-muted-foreground" /> Ads
            </Badge>
          </div>

          <div className="hidden lg:flex items-center relative">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar…" className="h-8 w-48 pl-8 text-xs bg-muted/50 border-border/50 focus:border-primary/50" />
          </div>

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hidden sm:flex">
            <Calendar className="h-3.5 w-3.5" />
            Últimos 30 dias
          </Button>

          <NotificationBell />

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export { getGreeting, getUserDisplayName };
