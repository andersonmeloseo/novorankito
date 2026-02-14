import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bot } from "lucide-react";

interface AgentFormData {
  name: string;
  description: string;
  instructions: string;
  speciality: string;
  avatar_url: string;
  whatsapp_number: string;
  notification_destination: string;
  notification_triggers: string[];
  enabled: boolean;
}

const DEFAULT_FORM: AgentFormData = {
  name: "",
  description: "",
  instructions: "",
  speciality: "custom",
  avatar_url: "",
  whatsapp_number: "",
  notification_destination: "",
  notification_triggers: [],
  enabled: true,
};

const TRIGGER_OPTIONS = [
  { value: "position_drop", label: "Queda de posição" },
  { value: "traffic_drop", label: "Queda de tráfego" },
  { value: "new_opportunity", label: "Nova oportunidade" },
  { value: "indexing_error", label: "Erro de indexação" },
  { value: "goal_reached", label: "Meta atingida" },
];

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AgentFormData) => Promise<void>;
  initialData?: Partial<AgentFormData>;
  isEditing?: boolean;
}

export function CreateAgentDialog({ open, onOpenChange, onSave, initialData, isEditing }: CreateAgentDialogProps) {
  const [form, setForm] = useState<AgentFormData>({ ...DEFAULT_FORM, ...initialData });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      if (!isEditing) setForm(DEFAULT_FORM);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleTrigger = (val: string) => {
    setForm(f => ({
      ...f,
      notification_triggers: f.notification_triggers.includes(val)
        ? f.notification_triggers.filter(t => t !== val)
        : [...f.notification_triggers, val],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Agente" : "Criar Novo Agente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Agente *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Agente Growth" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Especialidade</Label>
              <Select value={form.speciality} onValueChange={v => setForm(f => ({ ...f, speciality: v }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="seo">SEO</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descrição do que o agente faz" className="text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Instruções / Prompt do Agente</Label>
            <Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Descreva como o agente deve se comportar, o que ele deve fazer, em que situações deve notificar..." rows={4} className="text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">URL do Avatar (opcional)</Label>
            <Input value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))} placeholder="https://..." className="text-sm" />
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <h4 className="text-xs font-semibold text-foreground">Notificações WhatsApp</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Número WhatsApp</Label>
                <Input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="+55 47 98495-1601" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Destino da Notificação</Label>
                <Input value={form.notification_destination} onChange={e => setForm(f => ({ ...f, notification_destination: e.target.value }))} placeholder="Número ou grupo" className="text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gatilhos de Notificação</Label>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleTrigger(opt.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      form.notification_triggers.includes(opt.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
              <span className="text-xs text-muted-foreground">Agente ativo</span>
            </div>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEditing ? "Salvar" : "Criar Agente"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
