import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, CheckCircle2, Clock, MessageSquare,
  Target, Lightbulb, HelpCircle, ListChecks, FileText,
  TrendingUp, Bell, BellOff, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Section config ────────────────────────────────────────── */
const SECTIONS = [
  { key: "action_plan", label: "Plano de Ação", emoji: "📋", icon: ListChecks, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { key: "strategic", label: "Planejamento Estratégico", emoji: "🎯", icon: Target, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { key: "report", label: "Relatórios", emoji: "📊", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { key: "action", label: "Ações", emoji: "⚡", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { key: "suggestion", label: "Sugestões", emoji: "💡", icon: Lightbulb, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { key: "qa", label: "Perguntas & Respostas", emoji: "❓", icon: HelpCircle, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
];

interface HubEntry {
  id: string;
  type: string;
  title: string;
  content: string | null;
  status: string;
  notify_whatsapp: boolean;
  created_at: string;
}

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType: string;
  onAdd: (entry: { type: string; title: string; content: string; notify_whatsapp: boolean }) => Promise<void>;
}

function AddEntryDialog({ open, onOpenChange, defaultType, onAdd }: AddEntryDialogProps) {
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notifyWa, setNotifyWa] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Adicione um título"); return; }
    setLoading(true);
    try {
      await onAdd({ type, title: title.trim(), content: content.trim(), notify_whatsapp: notifyWa });
      setTitle(""); setContent(""); setNotifyWa(false);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const section = SECTIONS.find(s => s.key === type) || SECTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Adicionar ao Team Hub
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Type selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {SECTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setType(s.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[10px] font-semibold transition-all",
                    type === s.key ? `${s.bg} ${s.color}` : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span>{s.emoji}</span> {s.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Título *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`Ex: ${section.emoji} ${section.label}...`}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Conteúdo / Detalhes</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Descreva em detalhes…"
              rows={4}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
            <div className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold">Notificar via WhatsApp</p>
                <p className="text-[10px] text-muted-foreground">Enviar alerta quando este item for criado</p>
              </div>
            </div>
            <Switch checked={notifyWa} onCheckedChange={setNotifyWa} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading ? "Salvando…" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ────────────────────────────────────────── */
interface TeamHubTabProps {
  deploymentId: string;
  projectId?: string;
  deploymentName?: string;
}

export function TeamHubTab({ deploymentId, projectId, deploymentName }: TeamHubTabProps) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("action_plan");
  const [addOpen, setAddOpen] = useState(false);

  const { data: entries = [], refetch } = useQuery({
    queryKey: ["team-hub", deploymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_hub_entries" as any)
        .select("*")
        .eq("deployment_id", deploymentId)
        .order("created_at", { ascending: false });
      return (data || []) as unknown as HubEntry[];
    },
    enabled: !!deploymentId,
  });

  const filteredEntries = entries.filter(e => e.type === activeSection);
  const section = SECTIONS.find(s => s.key === activeSection) || SECTIONS[0];

  const handleAdd = async (entry: { type: string; title: string; content: string; notify_whatsapp: boolean }) => {
    if (!user) return;
    const { error } = await supabase
      .from("team_hub_entries" as any)
      .insert({
        deployment_id: deploymentId,
        project_id: projectId || null,
        owner_id: user.id,
        type: entry.type,
        title: entry.title,
        content: entry.content || null,
        notify_whatsapp: entry.notify_whatsapp,
        status: "open",
      });

    if (error) { toast.error(error.message); return; }

    // WhatsApp notification
    if (entry.notify_whatsapp) {
      try {
        await supabase.functions.invoke("send-workflow-notification", {
          body: {
            message: `📋 *[Team Hub - ${deploymentName || "Equipe"}]*\n*${entry.title}*\n${entry.content?.slice(0, 300) || ""}`,
            channel: "whatsapp",
            project_id: projectId,
          },
        });
        toast.success("Item adicionado e WhatsApp notificado!");
      } catch {
        toast.success("Item adicionado! (WhatsApp indisponível)");
      }
    } else {
      toast.success("Item adicionado ao Team Hub");
    }

    refetch();
  };

  const handleToggleDone = async (entry: HubEntry) => {
    const newStatus = entry.status === "done" ? "open" : "done";
    await supabase
      .from("team_hub_entries" as any)
      .update({ status: newStatus })
      .eq("id", entry.id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("team_hub_entries" as any).delete().eq("id", id);
    toast.success("Item removido");
    refetch();
  };

  const countBySection = (key: string) => entries.filter(e => e.type === key).length;

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <div className="w-44 shrink-0 border-r border-border bg-card/30 p-2 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">Seções</p>
        {SECTIONS.map(s => {
          const count = countBySection(s.key);
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-[10px] font-medium",
                activeSection === s.key
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span className="text-sm">{s.emoji}</span>
              <span className="flex-1 truncate">{s.label}</span>
              {count > 0 && (
                <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded-full", activeSection === s.key ? "bg-primary/20" : "bg-muted")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{section.emoji}</span>
            <div>
              <p className="text-sm font-bold">{section.label}</p>
              <p className="text-[10px] text-muted-foreground">{filteredEntries.length} {filteredEntries.length === 1 ? "item" : "itens"}</p>
            </div>
          </div>
          <Button size="sm" className="h-7 text-[10px] gap-1.5 px-3" onClick={() => setAddOpen(true)}>
            <Plus className="h-3 w-3" />
            Adicionar
          </Button>
        </div>

        {/* Entries */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2.5">
            {filteredEntries.length === 0 && (
              <div className="py-16 text-center">
                <span className="text-4xl block mb-3 opacity-30">{section.emoji}</span>
                <p className="text-sm text-muted-foreground font-medium">{section.label} vazio</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Adicionar" para criar o primeiro item</p>
                <Button variant="outline" size="sm" className="mt-4 text-xs gap-1.5" onClick={() => setAddOpen(true)}>
                  <Plus className="h-3 w-3" /> Adicionar item
                </Button>
              </div>
            )}

            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                className={cn(
                  "rounded-xl border p-3.5 space-y-2 transition-all",
                  entry.status === "done"
                    ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
                    : "border-border bg-card/60 hover:border-border/80"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleDone(entry)}
                      className={cn(
                        "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        entry.status === "done"
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-border hover:border-emerald-500/60"
                      )}
                    >
                      {entry.status === "done" && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold leading-tight", entry.status === "done" && "line-through text-muted-foreground")}>
                        {entry.title}
                      </p>
                      {entry.content && (
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap line-clamp-4">
                          {entry.content}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.notify_whatsapp && (
                      <div title="Notificação WhatsApp ativa">
                        <Bell className="h-3 w-3 text-emerald-400" />
                      </div>
                    )}
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={entry.status === "done" ? "default" : "outline"}
                    className={cn("text-[8px]", entry.status === "done" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "")}
                  >
                    {entry.status === "done" ? "✓ Concluído" : "Em aberto"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Add dialog */}
      <AddEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultType={activeSection}
        onAdd={handleAdd}
      />
    </div>
  );
}
