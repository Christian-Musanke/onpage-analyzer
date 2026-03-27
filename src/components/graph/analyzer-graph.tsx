"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlignVerticalSpaceAround, Maximize, X } from "lucide-react";

import type { LinkData, LinkStatus } from "@/lib/types";
import {
  loadGraphSettings,
  saveGraphSettings,
  type GraphSettings,
} from "@/lib/graph-settings";
import { useHoveredLink } from "@/hooks/use-hovered-link";
import { MainNode } from "@/components/graph/main-node";
import { LinkNode } from "@/components/graph/link-node";
import { GroupNode } from "@/components/graph/group-node";
import { FrameNode } from "@/components/graph/frame-node";
import { LinkEdge } from "@/components/graph/link-edge";
import {
  useRadialLayout,
  resolveWithFrames,
} from "@/components/graph/use-radial-layout";
import { ConfirmDialog } from "@/components/graph/confirm-dialog";
import { SettingsDialog } from "@/components/graph/settings-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const nodeTypes = {
  mainNode: MainNode,
  linkNode: LinkNode,
  groupNode: GroupNode,
  frameNode: FrameNode,
} as const;
const edgeTypes = { linkEdge: LinkEdge } as const;

/** Duration (ms) for the auto-align node transition animation. */
const ALIGN_TRANSITION_MS = 300;

interface AnalyzerGraphProps {
  links: LinkData[];
  linkStatuses: Record<string, LinkStatus>;
  currentUrl: string;
  currentStatus: number;
  onNavigate: (url: string) => void;
  overflow?: number;
  focusedSectionLabel?: string | null;
  onClearFocus?: () => void;
}

// ── Tree helpers ──────────────────────────────────────────────────────────

/**
 * Build a map of node → drag-group children.
 *
 * Sources:
 * - Edge-based parent→child relationships (tree structure).
 * - Frame nodes map to their contained content nodes, so dragging
 *   a frame moves its entire subtree.
 */
function buildDragGroupMap(
  edges: Edge[],
  nodes: Node[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const edge of edges) {
    const list = map.get(edge.source);
    if (list) list.push(edge.target);
    else map.set(edge.source, [edge.target]);
  }

  for (const node of nodes) {
    if (node.type === "frameNode") {
      const childNodeIds = (node.data as { childNodeIds?: string[] })
        .childNodeIds;
      if (childNodeIds && childNodeIds.length > 0) {
        map.set(node.id, [...childNodeIds]);
      }
    }
  }

  return map;
}

function getDescendants(
  nodeId: string,
  childrenMap: Map<string, string[]>,
): Set<string> {
  const result = new Set<string>();
  const stack = childrenMap.get(nodeId)?.slice() ?? [];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    const children = childrenMap.get(id);
    if (children) stack.push(...children);
  }
  return result;
}

// ── Inner component (needs ReactFlowProvider above) ─────────────────────

function AnalyzerGraphInner({
  links,
  linkStatuses,
  currentUrl,
  onNavigate,
  overflow: overflowProp,
  focusedSectionLabel,
  onClearFocus,
}: AnalyzerGraphProps) {
  // ── Settings ────────────────────────────────────────────────────────

  const [settings, setSettings] = useState<GraphSettings>(loadGraphSettings);

  const updateSettings = useCallback((partial: Partial<GraphSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveGraphSettings(next);
      return next;
    });
  }, []);

  const {
    nodes: layoutNodes,
    edges,
    overflow: layoutOverflow,
  } = useRadialLayout(links, currentUrl, settings);

  const overflow = overflowProp ?? layoutOverflow;

  const { fitView } = useReactFlow();

  // ── Controlled nodes state ──────────────────────────────────────────

  const [nodes, setNodes] = useState<Node[]>(layoutNodes);
  const prevLayoutRef = useRef(layoutNodes);
  const measuredLayoutDone = useRef(false);
  const nodesInitialized = useNodesInitialized();

  // Sync when layout structure changes (new analysis).
  // Also reset the measurement flag so the post-measurement layout runs again.
  if (prevLayoutRef.current !== layoutNodes) {
    prevLayoutRef.current = layoutNodes;
    measuredLayoutDone.current = false;
    setNodes(layoutNodes);
  }

  useEffect(() => {
    if (!nodesInitialized || measuredLayoutDone.current) return;
    measuredLayoutDone.current = true;

    setNodes((prev) => {
      const contentNodes = prev.filter((n) => n.type !== "frameNode");
      const { content, frames } = resolveWithFrames(
        contentNodes,
        edges,
        settings.nodeGap,
        settings.fontScale,
      );
      return [...content, ...frames];
    });

    requestAnimationFrame(() => {
      fitView({ padding: 0.15, duration: 300 });
    });
  }, [nodesInitialized, edges, settings.nodeGap, settings.fontScale, fitView]);

  // Apply link statuses to node data without resetting positions.
  // This runs whenever statuses update (background batch checks) and
  // only touches node.data — never node.position.
  useEffect(() => {
    if (Object.keys(linkStatuses).length === 0) return;

    setNodes((prev) =>
      prev.map((node) => {
        if (node.type !== "linkNode") return node;
        const link = (node.data as { link?: LinkData }).link;
        if (!link) return node;
        const newStatus = linkStatuses[link.href] ?? null;
        const currentStatus = (node.data as { status?: LinkStatus | null })
          .status;
        if (currentStatus === newStatus) return node;
        return { ...node, data: { ...node.data, status: newStatus } };
      }),
    );
  }, [linkStatuses]);

  // Build a combined drag-group map from edges + frame containment
  const dragGroupMap = useMemo(
    () => buildDragGroupMap(edges, nodes),
    [edges, nodes],
  );

  // ── Group-drag logic ────────────────────────────────────────────────

  const dragStartPos = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => {
        for (const change of changes) {
          if (change.type === "position" && change.dragging) {
            if (!dragStartPos.current.has(change.id)) {
              const descendants = getDescendants(change.id, dragGroupMap);
              const nodeMap = new Map(prev.map((n) => [n.id, n]));
              const draggedNode = nodeMap.get(change.id);
              if (draggedNode) {
                dragStartPos.current.set(change.id, {
                  ...draggedNode.position,
                });
              }
              for (const descId of descendants) {
                const desc = nodeMap.get(descId);
                if (desc) {
                  dragStartPos.current.set(descId, { ...desc.position });
                }
              }
            }
          }
          if (change.type === "position" && !change.dragging) {
            dragStartPos.current.clear();
          }
        }

        let updated = applyNodeChanges(changes, prev);

        for (const change of changes) {
          if (
            change.type === "position" &&
            change.dragging &&
            change.position
          ) {
            const startPos = dragStartPos.current.get(change.id);
            if (!startPos) continue;

            const dx = change.position.x - startPos.x;
            const dy = change.position.y - startPos.y;

            const descendants = getDescendants(change.id, dragGroupMap);
            if (descendants.size === 0) continue;

            updated = updated.map((node) => {
              if (!descendants.has(node.id)) return node;
              const origPos = dragStartPos.current.get(node.id);
              if (!origPos) return node;
              return {
                ...node,
                position: { x: origPos.x + dx, y: origPos.y + dy },
              };
            });
          }
        }

        return updated;
      });
    },
    [dragGroupMap],
  );

  // ── Auto-align ─────────────────────────────────────────────────────

  const alignTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAutoAlign = useCallback(() => {
    // Step 1: Add CSS transition to all nodes so position changes animate
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        style: {
          ...n.style,
          transition: `transform ${ALIGN_TRANSITION_MS}ms ease`,
        },
      })),
    );

    // Step 2: In the next frame, resolve overlaps on content nodes,
    // then recompute frame positions to match.
    requestAnimationFrame(() => {
      setNodes((prev) => {
        const contentNodes = prev.filter((n) => n.type !== "frameNode");
        const { content, frames } = resolveWithFrames(
          contentNodes,
          edges,
          settings.nodeGap,
          settings.fontScale,
        );
        return [...content, ...frames];
      });

      requestAnimationFrame(() => {
        fitView({ padding: 0.15, duration: ALIGN_TRANSITION_MS });
      });

      // Step 3: Remove transitions after animation completes so dragging
      // isn't affected by the transition CSS.
      if (alignTimerRef.current) clearTimeout(alignTimerRef.current);
      alignTimerRef.current = setTimeout(() => {
        setNodes((prev) =>
          prev.map((n) => {
            if (!n.style?.transition) return n;
            const { transition: _, ...rest } = n.style;
            return {
              ...n,
              style: Object.keys(rest).length > 0 ? rest : undefined,
            };
          }),
        );
      }, ALIGN_TRANSITION_MS + 50);
    });
  }, [edges, fitView, settings.nodeGap]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.15, duration: 300 });
  }, [fitView]);

  // ── Hovered-link context (graph ↔ sidebar) ─────────────────────────

  const { setHoveredHref } = useHoveredLink();

  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type !== "linkNode") return;
      const link = (node.data as { link?: LinkData }).link;
      if (link) setHoveredHref(link.href);
    },
    [setHoveredHref],
  );

  const onNodeMouseLeave: NodeMouseHandler = useCallback(
    () => setHoveredHref(null),
    [setHoveredHref],
  );

  // ── Navigate dialog ────────────────────────────────────────────────

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<LinkStatus | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== "linkNode") return;
      const nodeData = node.data as Record<string, unknown>;
      setSelectedLink(nodeData.link as LinkData);
      setSelectedStatus((nodeData.status as LinkStatus) ?? null);
      setDialogOpen(true);
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    setDialogOpen(false);
    if (selectedLink) onNavigate(selectedLink.href);
  }, [onNavigate, selectedLink]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 0.5 }), []);

  return (
    <div
      className="relative h-full w-full"
      style={
        { "--graph-font-scale": settings.fontScale } as React.CSSProperties
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitView
        defaultViewport={defaultViewport}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="size-8 bg-card shadow-sm"
                onClick={handleAutoAlign}
              />
            }
          >
            <AlignVerticalSpaceAround className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="right">
            Nodes ausrichten (Overlaps auflösen)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="size-8 bg-card shadow-sm"
                onClick={handleFitView}
              />
            }
          >
            <Maximize className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="right">
            Ansicht anpassen
          </TooltipContent>
        </Tooltip>

        <SettingsDialog settings={settings} onChange={updateSettings} />
      </div>

      {/* ── Focused-section chip ─────────────────────────────────── */}
      {focusedSectionLabel && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur-sm">
          <span className="max-w-[200px] truncate">
            Anzeige: {focusedSectionLabel}
          </span>
          <button
            onClick={onClearFocus}
            className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-primary/20"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {overflow > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground shadow">
          +{overflow} weitere Links
        </div>
      )}

      <ConfirmDialog
        open={dialogOpen}
        link={selectedLink}
        status={selectedStatus}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

export function AnalyzerGraph(props: AnalyzerGraphProps) {
  return (
    <ReactFlowProvider>
      <AnalyzerGraphInner {...props} />
    </ReactFlowProvider>
  );
}
