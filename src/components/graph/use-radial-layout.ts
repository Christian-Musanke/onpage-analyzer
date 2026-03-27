import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { MAX_DISPLAY_NODES } from "@/lib/constants";
import type { LinkData } from "@/lib/types";
import type { GraphSettings } from "@/lib/graph-settings";
import { resolveOverlaps } from "@/components/graph/resolve-overlaps";
import { computeFrameNodes, refitFrame } from "@/components/graph/compute-frames";

interface RadialLayoutResult {
  nodes: Node[];
  edges: Edge[];
  overflow: number;
}

// ── Tree types ──────────────────────────────────────────────────────────

interface PathTreeNode {
  /** Segment label shown on the node (e.g. "blog", "post-1") */
  segment: string;
  /** Full reconstructed path for this tree node (e.g. "/blog/post-1") */
  fullPath: string;
  /** The actual link data — null for synthetic group nodes */
  link: LinkData | null;
  children: PathTreeNode[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getPathSegments(href: string, baseOrigin: string): string[] | null {
  try {
    const url = new URL(href);
    const normalizedBase = baseOrigin.replace(/^www\./, "");
    const normalizedHref = url.origin.replace(/^www\./, "");
    if (normalizedHref !== normalizedBase) return null; // external

    const path = url.pathname.replace(/\/$/, "") || "/";
    if (path === "/") return ["/"];
    return path.split("/").filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Build a tree of internal links grouped by URL path segments.
 * A node is "synthetic" (link = null) when it exists only to group children.
 */
function buildPathTree(
  internalLinks: LinkData[],
  baseOrigin: string,
): PathTreeNode[] {
  const root: Map<string, PathTreeNode> = new Map();

  for (const link of internalLinks) {
    const segments = getPathSegments(link.href, baseOrigin);
    if (!segments) continue;

    let level = root;
    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += `/${seg}`;
      const isLeaf = i === segments.length - 1;

      let node = level.get(seg);
      if (!node) {
        node = {
          segment: seg,
          fullPath: currentPath,
          link: isLeaf ? link : null,
          children: [],
        };
        level.set(seg, node);
      } else if (isLeaf && !node.link) {
        // A synthetic node now has an actual link
        node.link = link;
      }

      // Navigate to the next level using the children array as a map
      if (!isLeaf) {
        let childMap = (node as PathTreeNodeWithMap)._childMap;
        if (!childMap) {
          childMap = new Map();
          (node as PathTreeNodeWithMap)._childMap = childMap;
          // Index existing children
          for (const c of node.children) {
            childMap.set(c.segment, c);
          }
        }
        level = childMap;
      }
    }
  }

  return Array.from(root.values());
}

type PathTreeNodeWithMap = PathTreeNode & {
  _childMap?: Map<string, PathTreeNode>;
};

/**
 * Flatten a tree with a _childMap back into clean children arrays
 * (strips the temporary _childMap we used during construction).
 */
function finalizeTree(nodes: PathTreeNode[]): PathTreeNode[] {
  for (const node of nodes) {
    const withMap = node as PathTreeNodeWithMap;
    if (withMap._childMap) {
      node.children = Array.from(withMap._childMap.values());
      delete withMap._childMap;
    }
    if (node.children.length > 0) {
      finalizeTree(node.children);
    }
  }
  return nodes;
}

/**
 * Collapse single-child chains: if a group node has exactly one child
 * and the group node itself is synthetic (no link), merge them.
 * E.g. /a -> /a/b -> /a/b/c collapses to /a/b/c if only the leaf is a real link.
 */
function collapseChains(nodes: PathTreeNode[]): PathTreeNode[] {
  return nodes.map((node) => {
    node.children = collapseChains(node.children);

    if (!node.link && node.children.length === 1) {
      const child = node.children[0];
      child.segment = `${node.segment}/${child.segment}`;
      return child;
    }

    return node;
  });
}

// ── External link grouping ──────────────────────────────────────────────

interface ExternalGroup {
  domain: string;
  links: LinkData[];
}

function groupExternalLinks(links: LinkData[]): ExternalGroup[] {
  const map = new Map<string, LinkData[]>();
  for (const link of links) {
    try {
      const domain = new URL(link.href).hostname.replace(/^www\./, "");
      const group = map.get(domain);
      if (group) group.push(link);
      else map.set(domain, [link]);
    } catch {
      const group = map.get("other");
      if (group) group.push(link);
      else map.set("other", [link]);
    }
  }
  return Array.from(map.entries()).map(([domain, links]) => ({ domain, links }));
}

// ── Layout context ──────────────────────────────────────────────────────

/** Encapsulates mutable state for a single layout pass. */
interface LayoutCtx {
  nextNodeId: () => string;
  nextEdgeId: () => string;
  nodes: Node[];
  edges: Edge[];
}

function createLayoutCtx(): LayoutCtx {
  let nodeCounter = 0;
  let edgeCounter = 0;
  return {
    nextNodeId: () => `n-${nodeCounter++}`,
    nextEdgeId: () => `e-${edgeCounter++}`,
    nodes: [],
    edges: [],
  };
}

// ── Layout engine ───────────────────────────────────────────────────────

/**
 * Recursively position tree nodes in nested radial layout.
 * Each cluster of children forms a full 360° circle around its parent,
 * creating the "sub-radial" pattern similar to ScreamingFrog.
 */
function layoutTreeNodes(
  parentId: string,
  parentX: number,
  parentY: number,
  treeNodes: PathTreeNode[],
  angleStart: number,
  angleEnd: number,
  radius: number,
  depth: number,
  ctx: LayoutCtx,
  isInternal = true,
) {
  const n = treeNodes.length;
  if (n === 0) return;

  const angleStep = (angleEnd - angleStart) / n;

  treeNodes.forEach((treeNode, i) => {
    const angle = angleStart + angleStep * (i + 0.5);
    const x = parentX + radius * Math.cos(angle);
    const y = parentY + radius * Math.sin(angle);

    const hasChildren = treeNode.children.length > 0;
    const isGroup = !treeNode.link && hasChildren;
    const id = ctx.nextNodeId();

    if (isGroup) {
      ctx.nodes.push({
        id,
        type: "groupNode",
        position: { x, y },
        data: {
          label: `/${treeNode.segment}`,
          childCount: countLeaves(treeNode),
        },
      });
    } else if (treeNode.link) {
      ctx.nodes.push({
        id,
        type: "linkNode",
        position: { x, y },
        data: {
          link: treeNode.link,
          status: null,
          segmentLabel: `/${treeNode.segment}`,
        },
      });
    }

    ctx.edges.push({
      id: ctx.nextEdgeId(),
      source: parentId,
      target: id,
      type: "linkEdge",
      data: {
        isInternal: treeNode.link?.isInternal ?? isInternal,
        rel: treeNode.link?.rel ?? {
          nofollow: false,
          sponsored: false,
          ugc: false,
        },
      },
    });

    // Recurse: children form a full 360° circle around this node
    if (hasChildren) {
      const childCount = treeNode.children.length;
      const childRadius = Math.max(100, childCount * 28);
      layoutTreeNodes(
        id,
        x,
        y,
        treeNode.children,
        0, // full circle: 0 …
        2 * Math.PI, // … to 2π
        childRadius,
        depth + 1,
        ctx,
        isInternal,
      );
    }
  });
}

function countLeaves(node: PathTreeNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

/**
 * Layout external link groups. Each domain becomes a group node.
 * Multi-link groups are laid out hierarchically by path segments
 * (same as internal links) so deep URL structures are visible.
 */
function layoutExternalGroups(
  parentId: string,
  parentX: number,
  parentY: number,
  groups: ExternalGroup[],
  angleStart: number,
  angleEnd: number,
  radius: number,
  ctx: LayoutCtx,
  shouldCollapse: boolean,
) {
  const n = groups.length;
  if (n === 0) return;

  const angleStep = (angleEnd - angleStart) / n;

  groups.forEach((group, i) => {
    const angle = angleStart + angleStep * (i + 0.5);
    const x = parentX + radius * Math.cos(angle);
    const y = parentY + radius * Math.sin(angle);

    if (group.links.length === 1) {
      // Single external link — no group node needed
      const link = group.links[0];
      const id = ctx.nextNodeId();
      ctx.nodes.push({
        id,
        type: "linkNode",
        position: { x, y },
        data: {
          link,
          status: null,
          segmentLabel: group.domain,
        },
      });
      ctx.edges.push({
        id: ctx.nextEdgeId(),
        source: parentId,
        target: id,
        type: "linkEdge",
        data: { isInternal: false, rel: link.rel },
      });
      return;
    }

    // Multi-link domain group — build hierarchical path tree
    const groupId = ctx.nextNodeId();
    ctx.nodes.push({
      id: groupId,
      type: "groupNode",
      position: { x, y },
      data: { label: group.domain, childCount: group.links.length },
    });
    ctx.edges.push({
      id: ctx.nextEdgeId(),
      source: parentId,
      target: groupId,
      type: "linkEdge",
      data: {
        isInternal: false,
        rel: { nofollow: false, sponsored: false, ugc: false },
      },
    });

    // Derive the origin from the first link so buildPathTree can match paths
    let baseOrigin: string;
    try {
      baseOrigin = new URL(group.links[0].href).origin;
    } catch {
      baseOrigin = `https://${group.domain}`;
    }

    const finalizedExtTree = finalizeTree(buildPathTree(group.links, baseOrigin));
    const tree = shouldCollapse
      ? collapseChains(finalizedExtTree)
      : finalizedExtTree;

    const childCount = tree.length;
    const childRadius = Math.max(100, childCount * 28);
    layoutTreeNodes(
      groupId,
      x,
      y,
      tree,
      0,
      2 * Math.PI,
      childRadius,
      1,
      ctx,
      false,
    );
  });
}

// ── Frame overlap resolution ────────────────────────────────────────────

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** AABB overlap test with gap. */
function rectsOverlap(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x - gap < b.x + b.width &&
    a.x + a.width + gap > b.x &&
    a.y - gap < b.y + b.height &&
    a.y + a.height + gap > b.y
  );
}

/** Collect all descendants of `rootId` following the children map. */
function collectDescendantIds(
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

// ── Per-subtree metadata ────────────────────────────────────────────────

interface SubtreeInfo {
  /** First-level child node ID. */
  id: string;
  /** All node IDs belonging to this subtree. */
  memberIds: string[];
  /** Radial offset from root (x component). */
  dx: number;
  /** Radial offset from root (y component). */
  dy: number;
  /**
   * Per-subtree scale factor applied to the radial offset.
   * 1 = original position from resolveOverlaps.
   * < 1 = pulled closer to root.
   * > 1 = pushed further from root.
   */
  k: number;
}

/**
 * Resolve node overlaps, compute frames, then pull each first-level
 * subtree **individually** as close to the root node as possible
 * without overlapping the root or any other frame.
 *
 * Unlike a uniform scale factor (which is limited by the worst-case
 * pair), this per-subtree approach lets small frames sit close to the
 * root even when a large frame on the opposite side needs more room.
 */
export function resolveWithFrames(
  contentNodes: Node[],
  edges: Edge[],
  gap: number,
  fontScale = 1,
): { content: Node[]; frames: Node[] } {
  const resolved = resolveOverlaps(contentNodes, edges, gap, fontScale);
  const rootNode = resolved.find((n) => n.type === "mainNode");
  const rootX = rootNode?.position.x ?? 0;
  const rootY = rootNode?.position.y ?? 0;

  // Build children map
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    const list = childrenOf.get(edge.source) ?? [];
    list.push(edge.target);
    childrenOf.set(edge.source, list);
  }

  const firstLevelIds = childrenOf.get("main") ?? [];

  if (firstLevelIds.length <= 1) {
    // Pull single subtree toward root (no frame-frame conflicts possible)
    if (firstLevelIds.length === 1) {
      return pullSingleSubtree(
        resolved,
        edges,
        firstLevelIds[0],
        childrenOf,
        rootX,
        rootY,
        gap,
      );
    }
    const frames = computeFrameNodes(resolved, edges);
    return { content: resolved, frames };
  }

  // ── Build subtree metadata ──────────────────────────────────────────

  const nodeById = new Map(resolved.map((n) => [n.id, n]));
  const subtrees: SubtreeInfo[] = [];
  const nodeToSubtree = new Map<string, SubtreeInfo>();

  for (const flId of firstLevelIds) {
    const flNode = nodeById.get(flId);
    if (!flNode) continue;

    const descendants = collectDescendantIds(flId, childrenOf);
    const memberIds = [flId, ...descendants];
    const st: SubtreeInfo = {
      id: flId,
      memberIds,
      dx: flNode.position.x - rootX,
      dy: flNode.position.y - rootY,
      k: 1,
    };
    subtrees.push(st);
    for (const mid of memberIds) nodeToSubtree.set(mid, st);
  }

  // ── Distribute subtrees evenly around a circle ─────────────────────
  //
  // Sort by current angle, then assign equal angular spacing.
  // Each subtree's internal layout is preserved — only the direction
  // from root changes.

  subtrees.sort((a, b) => Math.atan2(a.dy, a.dx) - Math.atan2(b.dy, b.dx));

  const N = subtrees.length;
  const angleStep = (2 * Math.PI) / N;
  // Start from the first subtree's original angle to keep overall orientation
  const startAngle = Math.atan2(subtrees[0].dy, subtrees[0].dx);

  for (let i = 0; i < N; i++) {
    const st = subtrees[i];
    const dist = Math.sqrt(st.dx * st.dx + st.dy * st.dy);
    const newAngle = startAngle + i * angleStep;
    const newDx = dist * Math.cos(newAngle);
    const newDy = dist * Math.sin(newAngle);

    // Shift all nodes in this subtree by the delta
    const shiftX = newDx - st.dx;
    const shiftY = newDy - st.dy;

    for (const mid of st.memberIds) {
      const node = resolved.find((n) => n.id === mid);
      if (node) {
        node.position.x += shiftX;
        node.position.y += shiftY;
      }
    }

    st.dx = newDx;
    st.dy = newDy;
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /** Apply current per-subtree scales and return positioned nodes. */
  function applyScales(): Node[] {
    return resolved.map((n) => {
      const owner = nodeToSubtree.get(n.id);
      if (!owner || owner.k === 1) return n;
      return {
        ...n,
        position: {
          x: n.position.x + (owner.k - 1) * owner.dx,
          y: n.position.y + (owner.k - 1) * owner.dy,
        },
      };
    });
  }

  /** Compute a single subtree's frame bounds at the current scales. */
  function subtreeFrame(st: SubtreeInfo): Rect | null {
    const nodes = applyScales();
    return refitFrame(st.memberIds, nodes);
  }

  // Root node rectangle (with gap buffer around it)
  const rootM = rootNode?.measured as
    | { width?: number; height?: number }
    | undefined;
  const rootRect: Rect = {
    x: rootX,
    y: rootY,
    width: rootM?.width ?? 220,
    height: rootM?.height ?? 90,
  };

  // ── Phase 1: Pull each subtree to minimum distance from root ──────
  //
  // For each subtree independently, binary-search for the smallest k
  // where its frame clears the root node.

  for (const st of subtrees) {
    let lo = 0;
    let hi = 1;

    for (let iter = 0; iter < 25; iter++) {
      const mid = (lo + hi) / 2;
      st.k = mid;
      const frame = subtreeFrame(st);
      if (!frame || rectsOverlap(frame, rootRect, gap)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    st.k = hi;
  }

  // ── Phase 2: Resolve frame-frame overlaps ─────────────────────────
  //
  // After pulling in, adjacent frames may collide.  For each
  // overlapping pair, push the closer subtree outward (binary-search)
  // until the pair no longer overlaps.  Repeat until stable.

  for (let pass = 0; pass < 20; pass++) {
    const nodes = applyScales();
    const allFrames = computeFrameNodes(nodes, edges);

    // Build frame lookup by subtree ID
    const frameOf = new Map<string, Rect>();
    for (const f of allFrames) {
      const stId = f.id.replace(/^frame-/, "");
      const fd = f.data as { width: number; height: number };
      frameOf.set(stId, {
        x: f.position.x,
        y: f.position.y,
        width: fd.width,
        height: fd.height,
      });
    }

    let hadOverlap = false;

    for (let i = 0; i < subtrees.length; i++) {
      for (let j = i + 1; j < subtrees.length; j++) {
        const fi = frameOf.get(subtrees[i].id);
        const fj = frameOf.get(subtrees[j].id);
        if (!fi || !fj || !rectsOverlap(fi, fj, gap)) continue;

        hadOverlap = true;

        // Push the subtree that is currently closer to root
        const target = subtrees[i].k <= subtrees[j].k
          ? subtrees[i]
          : subtrees[j];
        const other = target === subtrees[i] ? subtrees[j] : subtrees[i];

        // Binary-search for the minimum k increase that resolves this pair
        let pLo = target.k;
        let pHi = target.k + 1;

        for (let iter = 0; iter < 20; iter++) {
          const mid = (pLo + pHi) / 2;
          target.k = mid;
          const tFrame = subtreeFrame(target);
          const oFrame = subtreeFrame(other);
          if (tFrame && oFrame && rectsOverlap(tFrame, oFrame, gap)) {
            pLo = mid;
          } else {
            pHi = mid;
          }
        }
        target.k = pHi;
      }
    }

    if (!hadOverlap) break;
  }

  const finalNodes = applyScales();
  const finalFrames = computeFrameNodes(finalNodes, edges);
  return { content: finalNodes, frames: finalFrames };
}

/** Handle the trivial case of a single first-level subtree. */
function pullSingleSubtree(
  resolved: Node[],
  edges: Edge[],
  flId: string,
  childrenOf: Map<string, string[]>,
  rootX: number,
  rootY: number,
  gap: number,
): { content: Node[]; frames: Node[] } {
  const nodeById = new Map(resolved.map((n) => [n.id, n]));
  const flNode = nodeById.get(flId);
  if (!flNode) {
    return { content: resolved, frames: computeFrameNodes(resolved, edges) };
  }

  const descendants = collectDescendantIds(flId, childrenOf);
  const memberIds = [flId, ...descendants];
  const dx = flNode.position.x - rootX;
  const dy = flNode.position.y - rootY;

  const rootNode = resolved.find((n) => n.type === "mainNode");
  const rootM = rootNode?.measured as
    | { width?: number; height?: number }
    | undefined;
  const rootRect: Rect = {
    x: rootX,
    y: rootY,
    width: rootM?.width ?? 220,
    height: rootM?.height ?? 90,
  };

  const nodeToOwned = new Set(memberIds);

  function applyK(k: number): Node[] {
    return resolved.map((n) => {
      if (!nodeToOwned.has(n.id)) return n;
      return {
        ...n,
        position: {
          x: n.position.x + (k - 1) * dx,
          y: n.position.y + (k - 1) * dy,
        },
      };
    });
  }

  let lo = 0;
  let hi = 1;
  for (let iter = 0; iter < 25; iter++) {
    const mid = (lo + hi) / 2;
    const nodes = applyK(mid);
    const bounds = refitFrame(memberIds, nodes);
    if (!bounds || rectsOverlap(bounds, rootRect, gap)) lo = mid;
    else hi = mid;
  }

  const finalNodes = applyK(hi);
  const finalFrames = computeFrameNodes(finalNodes, edges);
  return { content: finalNodes, frames: finalFrames };
}

// ── Main hook ───────────────────────────────────────────────────────────

/**
 * Computes a radial layout for the given links and automatically resolves
 * overlaps. Does NOT depend on link statuses — those are applied separately
 * by the consuming component so that status updates don't reset positions.
 */
export function useRadialLayout(
  links: LinkData[],
  currentUrl: string,
  settings: GraphSettings,
): RadialLayoutResult {
  return useMemo(() => {
    const ctx = createLayoutCtx();

    const overflow = Math.max(0, links.length - MAX_DISPLAY_NODES);
    const displayLinks = links.slice(0, MAX_DISPLAY_NODES);

    const internalLinks = displayLinks.filter((l) => l.isInternal);
    const externalLinks = displayLinks.filter((l) => !l.isInternal);

    // Build the hierarchical tree for internal links
    let baseOrigin: string;
    try {
      baseOrigin = new URL(currentUrl).origin;
    } catch {
      baseOrigin = currentUrl;
    }

    const finalizedTree = finalizeTree(buildPathTree(internalLinks, baseOrigin));
    const tree = settings.collapseChains
      ? collapseChains(finalizedTree)
      : finalizedTree;
    const externalGroups = groupExternalLinks(externalLinks);

    // Count top-level items for angle allocation
    const totalTopLevel = tree.length + externalGroups.length;
    const internalShare = totalTopLevel > 0 ? tree.length / totalTopLevel : 0.5;

    // Allocate angular space: internals get proportional share of the circle
    const internalAngleEnd = -Math.PI + 2 * Math.PI * internalShare;
    const R = Math.max(300, totalTopLevel * 35);

    // Center node
    ctx.nodes.push({
      id: "main",
      type: "mainNode",
      position: { x: 0, y: 0 },
      data: { url: currentUrl, status: 200 },
    });

    // Layout internal tree
    layoutTreeNodes(
      "main",
      0,
      0,
      tree,
      -Math.PI,
      internalAngleEnd,
      R,
      0,
      ctx,
    );

    // Layout external groups
    layoutExternalGroups(
      "main",
      0,
      0,
      externalGroups,
      internalAngleEnd,
      Math.PI,
      R,
      ctx,
      settings.collapseChains,
    );

    // Resolve node overlaps, then scale first-level positions outward
    // just enough to eliminate frame-frame overlaps.
    const { content, frames } = resolveWithFrames(
      ctx.nodes,
      ctx.edges,
      settings.nodeGap,
      settings.fontScale,
    );

    return { nodes: [...content, ...frames], edges: ctx.edges, overflow };
  }, [links, currentUrl, settings]);
}
