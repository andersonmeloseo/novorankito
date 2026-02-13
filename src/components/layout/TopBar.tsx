import { Search, Calendar, Download, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6">
            <Wifi className="h-3 w-3 text-success" /> GSC
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6">
            <Wifi className="h-3 w-3 text-success" /> GA4
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 font-normal h-6">
            <WifiOff className="h-3 w-3 text-muted-foreground" /> Ads
          </Badge>
        </div>

        <div className="hidden lg:flex items-center relative">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar…" className="h-8 w-48 pl-8 text-xs bg-muted/50 border-none" />
        </div>

        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hidden sm:flex">
          <Calendar className="h-3.5 w-3.5" />
          Últimos 30 dias
        </Button>

        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>
    </header>
  );
}
