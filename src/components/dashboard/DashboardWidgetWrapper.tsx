import React, { useState } from "react";
import { GripVertical, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DashboardWidgetWrapperProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isEditing: boolean;
  isDragging?: boolean;
  colSpan?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function DashboardWidgetWrapper({
  id,
  title,
  children,
  isEditing,
  isDragging,
  colSpan = "col-span-full",
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: DashboardWidgetWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      layout
      layoutId={id}
      className={cn(
        colSpan,
        "rounded-xl border bg-card transition-all duration-200",
        isEditing && "ring-2 ring-primary/20 ring-dashed",
        isDragging && "opacity-50 scale-[0.97]"
      )}
      draggable={isEditing}
      onDragStart={(e) => {
        (e as unknown as React.DragEvent).dataTransfer?.setData("widget-id", id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        (e as unknown as React.DragEvent).preventDefault?.();
        onDragOver?.(e as unknown as React.DragEvent);
      }}
      onDrop={onDrop}
    >
      {/* Widget header - only shows in edit mode or when collapsed */}
      {(isEditing || collapsed) && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
          {isEditing && (
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
          )}
          <span className="text-xs font-medium text-muted-foreground flex-1 truncate">{title}</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            {collapsed ? <Maximize2 className="h-3 w-3 text-muted-foreground" /> : <Minimize2 className="h-3 w-3 text-muted-foreground" />}
          </button>
        </div>
      )}

      {!collapsed && <div className="w-full">{children}</div>}
    </motion.div>
  );
}
