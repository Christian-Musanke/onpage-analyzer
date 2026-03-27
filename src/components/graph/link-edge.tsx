"use client";

import { BaseEdge, getStraightPath, type EdgeProps } from "@xyflow/react";
import { NODE_COLORS } from "@/lib/constants";
import type { LinkRel } from "@/lib/types";

type LinkEdgeData = {
  isInternal: boolean;
  rel: LinkRel;
};

export function LinkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
  markerStart,
}: EdgeProps) {
  const { isInternal, rel } = (data ?? {
    isInternal: true,
    rel: { nofollow: false, sponsored: false, ugc: false },
  }) as LinkEdgeData;

  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const color = isInternal ? NODE_COLORS.internal : NODE_COLORS.external;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      markerStart={markerStart}
      style={{
        stroke: color,
        strokeWidth: 1.5,
        strokeDasharray: rel.nofollow ? "6 3" : undefined,
      }}
    />
  );
}
