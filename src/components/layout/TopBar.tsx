import { Search, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const displayName = getUserDisplayName(user);
  const greeting = getGreeting();

  const { data: profile } = useQuery({
    queryKey: ["topbar-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.display_name || displayName || "U")[0].toUpperCase();

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

          <button
            onClick={() => navigate("/account/profile")}
            className="ml-1 shrink-0 rounded-full ring-2 ring-border hover:ring-primary/40 transition-all duration-200 focus:outline-none focus:ring-primary/60"
            title={`${displayName} — Minha Conta`}
          >
            <Avatar className="h-8 w-8">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </header>
  );
}

export { getGreeting, getUserDisplayName };
