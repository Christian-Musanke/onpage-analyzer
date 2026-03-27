"use client";

import React, { useCallback } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";
import { RefreshCw } from "lucide-react";
import { refitFrame } from "@/components/graph/compute-frames";
import { useLang } from "@/components/lang-provider";

type FrameNodeData = {
  label: string;
  isInternal: boolean;
  width: number;
  height: number;
  childNodeIds: string[];
};

function FrameNodeComponent({ id, data }: NodeProps) {
  const { label, isInternal, width, height, childNodeIds } =
    data as unknown as FrameNodeData;

  const { getNodes, setNodes } = useReactFlow();
  const { t } = useLang();

  const handleRefit = useCallback(() => {
    const bounds = refitFrame(childNodeIds, getNodes());
    if (!bounds) return;

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        return {
          ...n,
          position: { x: bounds.x, y: bounds.y },
          data: { ...n.data, width: bounds.width, height: bounds.height },
        };
      }),
    );
  }, [id, childNodeIds, getNodes, setNodes]);

  return (
    <div
      className={`rounded-2xl border-2 border-dashed ${
        isInternal
          ? "border-internal/30 bg-internal/5"
          : "border-external/30 bg-external/5"
      }`}
      style={{ width, height }}
    >
      <div className="absolute top-3 left-4 flex items-center gap-1.5">
        <span
          className={`font-semibold ${
            isInternal ? "text-internal" : "text-external"
          }`}
          style={{ fontSize: "calc(1rem * var(--graph-font-scale, 1))" }}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={handleRefit}
          className={`rounded p-0.5 opacity-40 transition-opacity hover:opacity-100 ${
            isInternal
              ? "text-internal hover:bg-internal/10"
              : "text-external hover:bg-external/10"
          }`}
          title={t.graph.refitFrame}
        >
          <RefreshCw
            style={{
              width: "calc(0.75rem * var(--graph-font-scale, 1))",
              height: "calc(0.75rem * var(--graph-font-scale, 1))",
            }}
          />
        </button>
      </div>
    </div>
  );
}

export const FrameNode = React.memo(FrameNodeComponent);
