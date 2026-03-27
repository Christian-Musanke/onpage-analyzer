"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MainNodeData = {
  url: string;
  status: number;
};

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function MainNodeComponent({ data }: NodeProps) {
  const { url, status } = data as unknown as MainNodeData;

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>
        <div className="min-w-[160px] rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg">
          <div className="text-center">
            <p className="font-medium opacity-70" style={{ fontSize: "calc(1.25rem * var(--graph-font-scale, 1))" }}>Analysierte Seite</p>
            <p className="mt-1 font-semibold" style={{ fontSize: "calc(1.875rem * var(--graph-font-scale, 1))" }}>
              {getHostname(url)}
            </p>
            <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 font-medium" style={{ fontSize: "calc(1.5rem * var(--graph-font-scale, 1))" }}>
              {status}
            </span>
          </div>
          <Handle
            type="source"
            position={Position.Bottom}
            className="!opacity-0 !size-0 !min-w-0 !min-h-0 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !border-0"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm">
        <span className="break-all">{url}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export const MainNode = React.memo(MainNodeComponent);
