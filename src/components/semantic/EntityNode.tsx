import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import {
  Building2, Package, Briefcase, MapPin, User, Globe, Star, Store,
  Calendar, HelpCircle, FileText, Tag, Image, Award, Search, Clock,
  Map, DollarSign, MessageSquare,
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
  evento: Calendar,
  faq: HelpCircle,
  artigo: FileText,
  categoria: Tag,
  imagem: Image,
  credencial: Award,
  pagina: FileText,
  busca: Search,
  pergunta: MessageSquare,
  horario: Clock,
  geo: Map,
  endereco: MapPin,
  oferta: DollarSign,
  marca: Tag,
  rating: Star,
  organizacao: Building2,
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
  evento: "hsl(280 70% 55%)",
  faq: "hsl(190 80% 45%)",
  artigo: "hsl(340 75% 55%)",
  categoria: "hsl(25 90% 50%)",
  imagem: "hsl(170 65% 45%)",
  credencial: "hsl(50 85% 50%)",
  pagina: "hsl(200 70% 55%)",
  busca: "hsl(230 70% 55%)",
  pergunta: "hsl(190 80% 45%)",
  horario: "hsl(15 80% 55%)",
  geo: "hsl(120 60% 45%)",
  endereco: "hsl(5 70% 50%)",
  oferta: "hsl(130 75% 40%)",
  marca: "hsl(30 85% 55%)",
  rating: "hsl(45 90% 50%)",
  organizacao: "hsl(245 75% 55%)",
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

const handleStyle = "!w-3 !h-3 !border-2 !border-background !bg-primary hover:!scale-150 transition-transform";

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
      {/* All 4 handles are both source AND target for maximum flexibility */}
      <Handle type="source" position={Position.Top} id="top-source" className={handleStyle} style={{ top: -6 }} />
      <Handle type="target" position={Position.Top} id="top-target" className={`${handleStyle} !opacity-0`} style={{ top: -6 }} />

      <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleStyle} style={{ bottom: -6 }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className={`${handleStyle} !opacity-0`} style={{ bottom: -6 }} />

      <Handle type="source" position={Position.Left} id="left-source" className={handleStyle} style={{ left: -6 }} />
      <Handle type="target" position={Position.Left} id="left-target" className={`${handleStyle} !opacity-0`} style={{ left: -6 }} />

      <Handle type="source" position={Position.Right} id="right-source" className={handleStyle} style={{ right: -6 }} />
      <Handle type="target" position={Position.Right} id="right-target" className={`${handleStyle} !opacity-0`} style={{ right: -6 }} />

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
    </div>
  );
}

export default memo(EntityNode);
