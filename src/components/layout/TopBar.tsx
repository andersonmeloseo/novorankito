import { Search, Calendar, Download, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { Separator } from "@/components/ui/separator";

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

export interface TopBarProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
}

export function TopBar({ title, subtitle, extra }: TopBarProps) {
  const { user } = useAuth();
  const displayName = getUserDisplayName(user);
  const greeting = getGreeting();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 px-4 sm:px-6">
      <div className="flex items-center justify-between h-14 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="h-8 w-8 shrink-0" />
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground font-display tracking-tight truncate leading-tight">{title}</h1>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {extra && <div className="hidden sm:flex">{extra}</div>}

        <div className="flex items-center gap-1.5">
          {displayName && (
            <span className="hidden lg:block text-[11px] text-muted-foreground mr-1">
              {greeting}, <span className="font-semibold text-foreground">{displayName}</span>
            </span>
          )}

          <div className="hidden md:flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6 bg-success/5 border-success/20 text-success rounded-full">
              <Wifi className="h-2.5 w-2.5" /> GSC
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6 bg-success/5 border-success/20 text-success rounded-full">
              <Wifi className="h-2.5 w-2.5" /> GA4
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6 rounded-full">
              <WifiOff className="h-2.5 w-2.5 text-muted-foreground" /> Ads
            </Badge>
          </div>

          <div className="hidden lg:flex items-center relative">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar…" className="h-8 w-44 pl-8 text-xs bg-muted/40 border-transparent focus:border-primary/30 rounded-full" />
          </div>

          <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1.5 hidden sm:flex text-muted-foreground hover:text-foreground">
            <Calendar className="h-3.5 w-3.5" />
            30 dias
          </Button>

          <NotificationBell />

          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export { getGreeting, getUserDisplayName };
