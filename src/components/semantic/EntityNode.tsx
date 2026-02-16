import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  Building2, Package, Briefcase, MapPin, User, Globe, Star, Store,
} from "lucide-react";

export const ENTITY_ICONS: Record<string, React.ElementType> = {
  empresa: Building2,
  produto: Package,
  servico: Briefcase,
  local: MapPin,
  pessoa: User,
  site: Globe,
  avaliacao: Star,
  gbp: Store,
};

export const ENTITY_COLORS: Record<string, string> = {
  empresa: "hsl(250 85% 60%)",
  produto: "hsl(155 70% 42%)",
  servico: "hsl(42 95% 52%)",
  local: "hsl(0 78% 55%)",
  pessoa: "hsl(215 92% 56%)",
  site: "hsl(260 90% 68%)",
  avaliacao: "hsl(42 95% 52%)",
  gbp: "hsl(155 70% 42%)",
};

export type EntityNodeData = {
  label: string;
  entityType: string;
  schemaType?: string;
  description?: string;
  dbId?: string;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
};

function EntityNode({ id, data, selected }: NodeProps) {
  const nodeData = data as EntityNodeData;
  const Icon = ENTITY_ICONS[nodeData.entityType] || Globe;
  const color = ENTITY_COLORS[nodeData.entityType] || "hsl(250 85% 60%)";

  return (
    <div
      className={`
        px-4 py-3 rounded-xl border-2 bg-card text-card-foreground shadow-md min-w-[160px]
        transition-all duration-200 group
        ${selected ? "ring-2 ring-primary shadow-lg scale-105" : "hover:shadow-lg"}
      `}
      style={{ borderColor: color }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-background !bg-primary"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-background !bg-primary"
      />
      <div className="flex items-center gap-2 mb-1">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + "22", color }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm truncate flex-1">{nodeData.label}</span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => { e.stopPropagation(); nodeData.onEdit?.(id); }}
            title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            onClick={(e) => { e.stopPropagation(); nodeData.onDelete?.(id); }}
            title="Excluir"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {nodeData.schemaType && (
        <Badge variant="secondary" className="text-[10px] mt-1">
          {nodeData.schemaType}
        </Badge>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-background !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !border-background !bg-primary"
      />
    </div>
  );
}

export default memo(EntityNode);
