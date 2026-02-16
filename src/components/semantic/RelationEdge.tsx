import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export type RelationEdgeData = {
  predicate: string;
  confidence?: number;
  onDeleteEdge?: (edgeId: string) => void;
};

export default function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as RelationEdgeData | undefined;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "hsl(250 85% 60%)" : "hsl(225 15% 70%)",
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />
      {edgeData?.predicate && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute group/edge"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <Badge
              variant="outline"
              className={`text-[10px] bg-background shadow-sm cursor-pointer pr-1 flex items-center gap-1 ${
                selected ? "border-primary text-primary" : ""
              }`}
            >
              {edgeData.predicate}
              <button
                className="ml-0.5 p-0.5 rounded-full opacity-0 group-hover/edge:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  edgeData.onDeleteEdge?.(id);
                }}
                title="Desconectar"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
