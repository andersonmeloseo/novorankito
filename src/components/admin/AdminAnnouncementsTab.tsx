import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Megaphone, AlertTriangle, Wrench, Sparkles } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  useAnnouncements, useCreateAnnouncement, useToggleAnnouncement, useDeleteAnnouncement,
} from "@/hooks/use-super-admin";
import { useAuth } from "@/contexts/AuthContext";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  info: { label: "Informação", icon: Megaphone, color: "text-info" },
  warning: { label: "Aviso", icon: AlertTriangle, color: "text-warning" },
  maintenance: { label: "Manutenção", icon: Wrench, color: "text-muted-foreground" },
  update: { label: "Atualização", icon: Sparkles, color: "text-primary" },
};

export function AdminAnnouncementsTab() {
  const { user } = useAuth();
  const { data: announcements = [], isLoading } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const toggleAnnouncement = useToggleAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "info" });

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      toast({ title: "Erro", description: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    try {
      await createAnnouncement.mutateAsync({ ...form, created_by: user!.id });
      toast({ title: "Anúncio criado" });
      setForm({ title: "", content: "", type: "info" });
      setShowForm(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Anúncios do Sistema ({announcements.length})</h3>
        <Button size="sm" className="text-xs h-8 gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" /> Novo Anúncio
        </Button>
      </div>

      {showForm && (
        <AnimatedContainer>
          <Card className="p-4 space-y-3 border-primary/30">
            <Input placeholder="Título do anúncio" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="text-sm" />
            <Textarea placeholder="Conteúdo da mensagem..." value={form.content} onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))} rows={3} className="text-sm" />
            <div className="flex items-center gap-3">
              <Select value={form.type} onValueChange={v => setForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="text-xs h-8" onClick={handleCreate} disabled={createAnnouncement.isPending}>
                {createAnnouncement.isPending ? "Criando..." : "Publicar"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </Card>
        </AnimatedContainer>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : announcements.length === 0 ? (
        <Card className="p-8 text-center">
          <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Nenhum anúncio criado</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <AnimatedContainer key={a.id}>
                <Card className={`p-4 ${!a.is_active ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground">{a.title}</h4>
                          <Badge variant="outline" className="text-[9px]">{cfg.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{a.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={a.is_active}
                        onCheckedChange={checked => toggleAnnouncement.mutate({ id: a.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteAnnouncement.mutate(a.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </AnimatedContainer>
            );
          })}
        </div>
      )}
    </div>
  );
}
