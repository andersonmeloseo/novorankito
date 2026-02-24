import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

const MCP_URL = "https://luulxhajwrxnthjutibc.supabase.co/functions/v1/mcp-server";

type McpStatus = "online" | "degraded" | "offline" | "checking";

export function McpHealthBadge({ className }: { className?: string }) {
  const [status, setStatus] = useState<McpStatus>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus("checking");
    const start = performance.now();
    try {
      const res = await fetch(MCP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "tools/list", params: {} }),
        signal: AbortSignal.timeout(8000),
      });
      const ms = Math.round(performance.now() - start);
      setLatencyMs(ms);
      setLastCheck(new Date());
      if (!res.ok) {
        setStatus("offline");
      } else {
        setStatus(ms > 3000 ? "degraded" : "online");
      }
    } catch {
      setLatencyMs(null);
      setStatus("offline");
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const statusConfig: Record<McpStatus, { label: string; color: string; icon: React.ElementType }> = {
    online: { label: "Online", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: Wifi },
    degraded: { label: "Lento", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", icon: Activity },
    offline: { label: "Offline", color: "bg-destructive/15 text-destructive border-destructive/30", icon: WifiOff },
    checking: { label: "...", color: "bg-muted text-muted-foreground", icon: Activity },
  };

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn("gap-1.5 text-[10px] font-mono cursor-default select-none h-6 px-2", cfg.color, className)}
            onClick={checkHealth}
          >
            <Icon className={cn("h-3 w-3", status === "checking" && "animate-pulse")} />
            MCP {latencyMs !== null ? `${latencyMs}ms` : cfg.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1">
          <p className="font-medium">MCP Server — {cfg.label}</p>
          {latencyMs !== null && <p>Latência: {latencyMs}ms</p>}
          {lastCheck && <p>Último check: {lastCheck.toLocaleTimeString("pt-BR")}</p>}
          <p className="text-muted-foreground">Clique para re-checar</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
