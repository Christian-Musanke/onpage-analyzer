import type { Node, Edge } from "@xyflow/react";

// ── Node size estimates for bounding-box calculation ────────────────────

const NODE_WIDTH: Record<string, number> = {
  mainNode: 220,
  linkNode: 200,
  groupNode: 180,
};
const NODE_HEIGHT: Record<string, number> = {
  mainNode: 90,
  linkNode: 65,
  groupNode: 60,
};
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 65;

/** Padding around the content within a frame. */
export const FRAME_PADDING = 60;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Actual measured width, falling back to a type-based estimate. */
function nodeWidth(node: Node): number {
  const m = node.measured as { width?: number } | undefined;
  return m?.width ?? NODE_WIDTH[node.type ?? ""] ?? DEFAULT_WIDTH;
}

/** Actual measured height, falling back to a type-based estimate. */
function nodeHeight(node: Node): number {
  const m = node.measured as { height?: number } | undefined;
  return m?.height ?? NODE_HEIGHT[node.type ?? ""] ?? DEFAULT_HEIGHT;
}

/** Collect all descendants of `rootId` by following edges recursively. */
function collectDescendants(
  rootId: string,
  childrenOf: Map<string, string[]>,
): Set<string> {
  const result = new Set<string>();
  const stack = childrenOf.get(rootId)?.slice() ?? [];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    const children = childrenOf.get(id);
    if (children) stack.push(...children);
  }
  return result;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Compute frame nodes for each first-level subtree off the main node.
 *
 * Each frame is a background rectangle that encompasses a first-level
 * child and all of its descendants, styled by internal/external type.
 */
/**
 * Recompute the bounding box for a single frame based on the current
 * positions of its child nodes.  Returns the new position and dimensions,
 * or `null` if no child nodes were found.
 */
export function refitFrame(
  childNodeIds: string[],
  allNodes: Node[],
): { x: number; y: number; width: number; height: number } | null {
  const nodeById = new Map(allNodes.map((n) => [n.id, n]));
  const subtreeNodes = childNodeIds
    .map((id) => nodeById.get(id))
    .filter((n): n is Node => n !== undefined);

  if (subtreeNodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of subtreeNodes) {
    const x = node.position.x;
    const y = node.position.y;
    const w = nodeWidth(node);
    const h = nodeHeight(node);

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }

  minX -= FRAME_PADDING;
  minY -= FRAME_PADDING;
  maxX += FRAME_PADDING;
  maxY += FRAME_PADDING;

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function computeFrameNodes(nodes: Node[], edges: Edge[]): Node[] {
  const nodeById = new Map<string, Node>();
  for (const n of nodes) {
    nodeById.set(n.id, n);
  }

  // Build parent → children map from edges
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    const list = childrenOf.get(edge.source) ?? [];
    list.push(edge.target);
    childrenOf.set(edge.source, list);
  }

  // Find first-level children of the main node
  const firstLevelIds = childrenOf.get("main") ?? [];
  if (firstLevelIds.length === 0) return [];

  // Build a lookup for edge data (main → child) to determine internal/external
  const mainEdgeData = new Map<string, { isInternal: boolean }>();
  for (const edge of edges) {
    if (edge.source === "main") {
      const edgeData = edge.data as { isInternal?: boolean } | undefined;
      mainEdgeData.set(edge.target, {
        isInternal: edgeData?.isInternal ?? true,
      });
    }
  }

  const frameNodes: Node[] = [];

  for (const childId of firstLevelIds) {
    const childNode = nodeById.get(childId);
    if (!childNode) continue;

    // Collect all nodes in this subtree (including the root child)
    const descendantIds = collectDescendants(childId, childrenOf);
    const subtreeIds = [childId, ...descendantIds];
    const subtreeNodes = subtreeIds
      .map((id) => nodeById.get(id))
      .filter((n): n is Node => n !== undefined);

    if (subtreeNodes.length === 0) continue;

    // Compute bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of subtreeNodes) {
      const x = node.position.x;
      const y = node.position.y;
      const w = nodeWidth(node);
      const h = nodeHeight(node);

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }

    // Add padding
    minX -= FRAME_PADDING;
    minY -= FRAME_PADDING;
    maxX += FRAME_PADDING;
    maxY += FRAME_PADDING;

    // Determine label and type
    const isInternal = mainEdgeData.get(childId)?.isInternal ?? true;

    let label: string;
    if (childNode.type === "groupNode") {
      label = (childNode.data as { label?: string }).label ?? "";
    } else if (childNode.type === "linkNode") {
      label =
        (childNode.data as { segmentLabel?: string }).segmentLabel ??
        (childNode.data as { link?: { href: string } }).link?.href ??
        "";
    } else {
      label = childId;
    }

    frameNodes.push({
      id: `frame-${childId}`,
      type: "frameNode",
      position: { x: minX, y: minY },
      data: {
        label,
        isInternal,
        width: maxX - minX,
        height: maxY - minY,
        childNodeIds: subtreeIds,
      },
      zIndex: -1,
      selectable: false,
      focusable: false,
    });
  }

  return frameNodes;
}
