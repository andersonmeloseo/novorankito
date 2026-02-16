import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { Badge } from "@/components/ui/badge";

export type RelationEdgeData = {
  predicate: string;
  confidence?: number;
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
            className="nodrag nopan pointer-events-auto absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <Badge
              variant="outline"
              className={`text-[10px] bg-background shadow-sm cursor-pointer ${
                selected ? "border-primary text-primary" : ""
              }`}
            >
              {edgeData.predicate}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
