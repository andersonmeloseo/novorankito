import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Bot, TrendingUp, Search, BarChart3, Settings2, MessageSquare, Trash2,
} from "lucide-react";

const SPECIALITY_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  growth: { icon: TrendingUp, color: "text-success", label: "Growth" },
  seo: { icon: Search, color: "text-primary", label: "SEO" },
  analytics: { icon: BarChart3, color: "text-warning", label: "Analytics" },
  custom: { icon: Bot, color: "text-muted-foreground", label: "Custom" },
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
  };
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onChat: (agent: any) => void;
}

export function AgentCard({ agent, onToggle, onEdit, onDelete, onChat }: AgentCardProps) {
  const meta = SPECIALITY_META[agent.speciality] || SPECIALITY_META.custom;
  const Icon = meta.icon;

  return (
    <Card className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ${meta.color}`}>
          {agent.avatar_url ? (
            <img src={agent.avatar_url} alt={agent.name} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
            <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
            {agent.is_system && <Badge variant="outline" className="text-[10px]">Sistema</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{agent.description || "Sem descrição"}</p>
        </div>
        <Switch checked={agent.enabled} onCheckedChange={(v) => onToggle(agent.id, v)} />
      </div>

      {agent.whatsapp_number && (
        <p className="text-[10px] text-muted-foreground">📱 WhatsApp: {agent.whatsapp_number}</p>
      )}

      <div className="flex items-center gap-2 mt-auto">
        <Button variant="outline" size="sm" className="text-xs gap-1 flex-1" onClick={() => onChat(agent)}>
          <MessageSquare className="h-3 w-3" /> Chat
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
  );
}
