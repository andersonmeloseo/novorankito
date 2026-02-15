import { useState } from "react";
import { Settings2, GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  colSpan: string;
}

interface WidgetConfigPanelProps {
  widgets: WidgetConfig[];
  onUpdate: (widgets: WidgetConfig[]) => void;
  onReset: () => void;
  isEditing: boolean;
  onToggleEdit: () => void;
}

export function WidgetConfigPanel({ widgets, onUpdate, onReset, isEditing, onToggleEdit }: WidgetConfigPanelProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const toggleVisibility = (id: string) => {
    onUpdate(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newWidgets = [...widgets];
    const [moved] = newWidgets.splice(dragIdx, 1);
    newWidgets.splice(idx, 0, moved);
    onUpdate(newWidgets);
    setDragIdx(idx);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isEditing ? "default" : "outline"}
        size="sm"
        onClick={onToggleEdit}
        className="gap-2"
      >
        <Settings2 className="h-4 w-4" />
        {isEditing ? "Concluir" : "Personalizar"}
      </Button>

      {isEditing && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              Widgets
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 sm:w-96">
            <SheetHeader>
              <SheetTitle>Configurar Widgets</SheetTitle>
              <SheetDescription>Arraste para reordenar e ative/desative os widgets do dashboard.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-1">
              {widgets.map((w, idx) => (
                <div
                  key={w.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={() => setDragIdx(null)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
                    dragIdx === idx && "opacity-50 scale-95",
                    !w.visible && "opacity-60"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                  <span className="text-sm flex-1 truncate">{w.title}</span>
                  <Switch
                    checked={w.visible}
                    onCheckedChange={() => toggleVisibility(w.id)}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" size="sm" onClick={onReset} className="w-full gap-2">
                <RotateCcw className="h-4 w-4" />
                Restaurar padrão
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
