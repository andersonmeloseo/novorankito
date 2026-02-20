import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bot, TrendingUp, Search, BarChart3, Settings2, MessageSquare, Trash2,
  History, Zap, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const SPECIALITY_META: Record<string, { icon: React.ElementType; emoji: string; label: string; gradient: string }> = {
  growth: { icon: TrendingUp, emoji: "🚀", label: "Growth", gradient: "from-emerald-500 via-cyan-500 to-blue-500" },
  seo: { icon: Search, emoji: "🔍", label: "SEO", gradient: "from-blue-500 via-purple-500 to-pink-500" },
  analytics: { icon: BarChart3, emoji: "📊", label: "Analytics", gradient: "from-amber-500 via-orange-500 to-red-500" },
  custom: { icon: Bot, emoji: "🤖", label: "Custom", gradient: "from-violet-500 via-purple-500 to-fuchsia-500" },
};

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string | null;
    speciality: string;
    enabled: boolean;
    is_system: boolean;
    avatar_url?: string | null;
    whatsapp_number?: string | null;
    instructions?: string | null;
  };
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onChat: (agent: any) => void;
}

export function AgentCard({ agent, onToggle, onEdit, onDelete, onChat }: AgentCardProps) {
  const meta = SPECIALITY_META[agent.speciality] || SPECIALITY_META.custom;
  const Icon = meta.icon;
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["agent-history", agent.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_action_history")
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: historyOpen,
  });

  return (
    <>
      <div
        className={cn(
          "relative rounded-2xl p-[2px] transition-all duration-500 group cursor-pointer h-full overflow-hidden",
          !agent.enabled && "bg-border"
        )}
        style={agent.enabled ? {
          background: `linear-gradient(var(--agent-border-angle, 0deg), ${meta.gradient.includes('emerald') ? '#10b981, #06b6d4, #3b82f6' : meta.gradient.includes('blue-500 via-purple') ? '#3b82f6, #a855f7, #ec4899' : meta.gradient.includes('amber') ? '#f59e0b, #f97316, #ef4444' : '#8b5cf6, #a855f7, #d946ef'})`,
          animation: 'agent-border-spin 3s linear infinite',
        } : undefined}
      >
        {/* Animated glow for active agents */}
        {agent.enabled && (
          <div
            className="absolute inset-0 rounded-2xl opacity-40 blur-xl transition-opacity duration-500 group-hover:opacity-60"
            style={{
              background: `linear-gradient(var(--agent-border-angle, 0deg), ${meta.gradient.includes('emerald') ? '#10b981, #06b6d4, #3b82f6' : meta.gradient.includes('blue-500 via-purple') ? '#3b82f6, #a855f7, #ec4899' : meta.gradient.includes('amber') ? '#f59e0b, #f97316, #ef4444' : '#8b5cf6, #a855f7, #d946ef'})`,
              animation: 'agent-border-spin 3s linear infinite',
            }}
          />
        )}

        <Card className={cn(
          "relative rounded-[14px] p-4 flex flex-col gap-3 transition-all duration-300 border-0 h-full",
          !agent.enabled && "opacity-60 grayscale"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl",
              agent.enabled ? "bg-gradient-to-br from-muted to-accent" : "bg-muted"
            )}>
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.name} className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <span>{meta.emoji}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground truncate">{agent.name}</h3>
                <Badge variant="secondary" className="text-[10px] font-semibold">{meta.label}</Badge>
                {agent.is_system && (
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Sistema</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{agent.description || "Sem descrição"}</p>
            </div>
            <Switch checked={agent.enabled} onCheckedChange={(v) => onToggle(agent.id, v)} />
          </div>

          {agent.whatsapp_number && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>📱</span> WhatsApp: {agent.whatsapp_number}
            </div>
          )}

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              agent.enabled ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
            )} />
            <span className="text-[10px] text-muted-foreground font-medium">
              {agent.enabled ? "Ativo e operacional" : "Desativado"}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-auto pt-1">
            <Button variant="default" size="sm" className="text-xs gap-1.5 flex-1" onClick={() => onChat(agent)}>
              <MessageSquare className="h-3 w-3" /> Conversar
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setHistoryOpen(true)}>
              <History className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onEdit(agent.id)}>
              <Settings2 className="h-3 w-3" />
            </Button>
            {!agent.is_system && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => onDelete(agent.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Action History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico — {agent.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma ação registrada ainda.</p>
                <p className="text-xs mt-1">As ações aparecerão aqui conforme o agente operar.</p>
              </div>
            ) : (
              history.map((h: any) => (
                <div key={h.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <Zap className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{h.action_type}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{h.action_detail}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
