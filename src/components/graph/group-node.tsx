"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FolderOpen } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLang } from "@/components/lang-provider";

type GroupNodeData = {
  label: string;
  childCount: number;
};

function GroupNodeComponent({ data }: NodeProps) {
  const { label, childCount } = data as unknown as GroupNodeData;
  const { t } = useLang();

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
          <Handle
            type="target"
            position={Position.Top}
            className="!opacity-0 !size-0 !min-w-0 !min-h-0 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !border-0"
          />
          <FolderOpen className="shrink-0 text-muted-foreground" style={{ width: "calc(1rem * var(--graph-font-scale, 1))", height: "calc(1rem * var(--graph-font-scale, 1))" }} />
          <p className="min-w-0 font-medium text-card-foreground" style={{ fontSize: "calc(1.875rem * var(--graph-font-scale, 1))" }}>
            {label}
          </p>
          <Handle
            type="source"
            position={Position.Bottom}
            className="!opacity-0 !size-0 !min-w-0 !min-h-0 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !border-0"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm flex-col items-start gap-1">
        <p>
          {t.graph.path}: {label} · {childCount} {childCount === 1 ? t.graph.link : t.graph.linksPlural}
        </p>
        <p className="text-sm opacity-80">
          {t.graph.groupTooltip}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export const GroupNode = React.memo(GroupNodeComponent);
