"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Ban, DollarSign, User } from "lucide-react";
import { StatusBadge } from "@/components/graph/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLang } from "@/components/lang-provider";
import type { LinkData, LinkStatus } from "@/lib/types";

type LinkNodeData = {
  link: LinkData;
  status: LinkStatus | null;
  segmentLabel: string;
};

function LinkNodeComponent({ data }: NodeProps) {
  const { link, status, segmentLabel } = data as unknown as LinkNodeData;
  const anchorText = link.text?.trim();
  const { t } = useLang();

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>
        <div
          className={`relative min-w-[80px] w-fit rounded-lg px-3 py-2 text-white shadow-md ${
            link.isInternal ? "bg-internal" : "bg-external"
          }`}
        >
          <Handle
            type="target"
            position={Position.Top}
            className="!opacity-0 !size-0 !min-w-0 !min-h-0 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !border-0"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="!opacity-0 !size-0 !min-w-0 !min-h-0 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !border-0"
          />
          <div className="absolute -top-1 -right-1">
            <StatusBadge status={status} />
          </div>
          <p className="font-medium leading-tight" style={{ fontSize: "calc(1.875rem * var(--graph-font-scale, 1))" }}>
            {segmentLabel || link.href}
          </p>
          {(link.rel.nofollow || link.rel.sponsored || link.rel.ugc) && (
            <div className="mt-1 flex items-center gap-1">
              {link.rel.nofollow && <Ban className="size-3 opacity-70" />}
              {link.rel.sponsored && <DollarSign className="size-3 opacity-70" />}
              {link.rel.ugc && <User className="size-3 opacity-70" />}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm flex-col items-start gap-1">
        <p className="break-all font-mono text-sm">{link.href}</p>
        {anchorText && (
          <p className="text-sm opacity-80">
            {t.confirmDialog.anchorText}: &quot;{anchorText}&quot;
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export const LinkNode = React.memo(LinkNodeComponent);
