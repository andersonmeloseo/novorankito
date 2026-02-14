import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarClock, Clock, Send, RotateCcw, Info, Zap, Globe, ScanSearch } from "lucide-react";
import { toast } from "sonner";

interface ScheduleDialogProps {
  projectId: string | undefined;
  totalUrls: number;
  unknownUrls: number;
  onScheduleManual: (config: ManualSchedule) => void;
  onToggleAutoCron: (enabled: boolean, config: CronConfig) => void;
  cronEnabled: boolean;
  cronConfig: CronConfig;
}

export interface ManualSchedule {
  type: "indexing" | "inspection";
  scheduledAt: string; // ISO datetime
  urlCount: number;
}

export interface CronConfig {
  enabled: boolean;
  time: string; // HH:mm
  actions: ("indexing" | "inspection")[];
  maxUrls: number;
}

export function ScheduleDialog({
  projectId, totalUrls, unknownUrls,
  onScheduleManual, onToggleAutoCron, cronEnabled, cronConfig
}: ScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"auto" | "manual">("auto");

  // Auto cron state
  const [autoEnabled, setAutoEnabled] = useState(cronEnabled);
  const [autoTime, setAutoTime] = useState(cronConfig.time || "03:00");
  const [autoIndexing, setAutoIndexing] = useState(cronConfig.actions.includes("indexing"));
  const [autoInspection, setAutoInspection] = useState(cronConfig.actions.includes("inspection"));
  const [autoMaxUrls, setAutoMaxUrls] = useState(cronConfig.maxUrls || 200);

  // Manual state
  const [manualType, setManualType] = useState<"indexing" | "inspection">("indexing");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("08:00");
  const [manualCount, setManualCount] = useState(50);

  const handleSaveAuto = () => {
    const actions: ("indexing" | "inspection")[] = [];
    if (autoIndexing) actions.push("indexing");
    if (autoInspection) actions.push("inspection");
    onToggleAutoCron(autoEnabled, {
      enabled: autoEnabled,
      time: autoTime,
      actions,
      maxUrls: autoMaxUrls,
    });
    toast.success(autoEnabled ? "Agendamento automático ativado!" : "Agendamento automático desativado");
    setOpen(false);
  };

  const handleScheduleManual = () => {
    if (!manualDate) { toast.warning("Selecione uma data"); return; }
    const scheduledAt = `${manualDate}T${manualTime}:00`;
    onScheduleManual({
      type: manualType,
      scheduledAt,
      urlCount: manualCount,
    });
    toast.success(`Agendamento manual criado para ${manualDate} às ${manualTime}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <CalendarClock className="h-3 w-3" />
          Agendar
          {cronEnabled && <Badge variant="secondary" className="text-[9px] ml-1 bg-success/10 text-success">Auto</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Agendamento de Indexação
          </DialogTitle>
        </DialogHeader>

        {/* Tab Switch */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "auto" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("auto")}
          >
            <Zap className="h-3 w-3 inline mr-1.5" />Automático
          </button>
          <button
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("manual")}
          >
            <Clock className="h-3 w-3 inline mr-1.5" />Manual
          </button>
        </div>

        {tab === "auto" ? (
          <div className="space-y-4 py-2">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <div className="text-sm font-medium text-foreground">Cron Diário</div>
                <div className="text-[10px] text-muted-foreground">Envio automático todo dia no horário definido</div>
              </div>
              <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            </div>

            {autoEnabled && (
              <>
                {/* Time */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Horário de execução</Label>
                  <Input type="time" value={autoTime} onChange={e => setAutoTime(e.target.value)} className="w-32" />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Label className="text-xs">Ações</Label>
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-border">
                    <Switch checked={autoIndexing} onCheckedChange={setAutoIndexing} id="auto-idx" />
                    <Label htmlFor="auto-idx" className="text-xs flex items-center gap-1.5 cursor-pointer">
                      <Send className="h-3 w-3 text-primary" />
                      Enviar para Indexação
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-border">
                    <Switch checked={autoInspection} onCheckedChange={setAutoInspection} id="auto-insp" />
                    <Label htmlFor="auto-insp" className="text-xs flex items-center gap-1.5 cursor-pointer">
                      <ScanSearch className="h-3 w-3 text-primary" />
                      Inspecionar URLs sem status
                    </Label>
                  </div>
                </div>

                {/* Max URLs */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Máximo de URLs por execução</Label>
                  <Input
                    type="number" min={10} max={500}
                    value={autoMaxUrls} onChange={e => setAutoMaxUrls(Number(e.target.value))}
                    className="w-32"
                  />
                </div>

                <Card className="p-3 bg-muted/30 border-dashed">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-[11px] text-muted-foreground">
                      O sistema enviará até <strong className="text-foreground">{autoMaxUrls}</strong> URLs não indexadas
                      todo dia às <strong className="text-foreground">{autoTime}</strong>.
                      {totalUrls > 0 && ` Você tem ${totalUrls} URLs no inventário.`}
                    </div>
                  </div>
                </Card>
              </>
            )}

            <DialogFooter>
              <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
              <Button size="sm" onClick={handleSaveAuto}>Salvar Configuração</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de ação</Label>
              <Select value={manualType} onValueChange={(v: any) => setManualType(v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indexing">Enviar para Indexação</SelectItem>
                  <SelectItem value="inspection">Inspecionar URLs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Horário</Label>
                <Input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} />
              </div>
            </div>

            {/* URL Count */}
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade de URLs</Label>
              <Input
                type="number" min={1} max={500}
                value={manualCount} onChange={e => setManualCount(Number(e.target.value))}
                className="w-32"
              />
              <p className="text-[10px] text-muted-foreground">
                {manualType === "indexing"
                  ? `${totalUrls} URLs disponíveis no inventário`
                  : `${unknownUrls} URLs sem inspeção`}
              </p>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
              <Button size="sm" className="gap-1.5" onClick={handleScheduleManual}>
                <CalendarClock className="h-3 w-3" />
                Agendar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
