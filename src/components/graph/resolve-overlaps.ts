import type { Node, Edge } from "@xyflow/react";

/**
 * Resolve overlapping radial sub-clusters using bounding-circle math.
 *
 * Algorithm:
 * 1. Build the tree (parent→children) from edges.
 * 2. Bottom-up: compute each node's subtree radius — the smallest circle
 *    centered on that node containing all descendants.
 * 3. Top-down: for each parent, find the minimum placement radius R via
 *    binary search so that adjacent children's bounding circles (+ gap)
 *    don't overlap, then distribute children with variable angular spacing
 *    proportional to subtree size.
 *
 * Node radii are estimated **per-node** from the label text length and
 * font scale, so wide labels like "/scalable-capital" get larger bounding
 * circles than narrow ones like "/dkb".
 */

// ── Per-node size estimation ────────────────────────────────────────────

/** Fallback radius when a node can't be measured or estimated. */
const FALLBACK_RADIUS = 100;

/**
 * Half-diagonal of a rectangle — the radius of the smallest circle
 * centered on the rectangle's center that fully encloses it.
 */
function halfDiag(w: number, h: number): number {
  return Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
}

/**
 * Compute the bounding-circle radius for a node.
 *
 * Prefers **actual DOM measurements** (`node.measured`) populated by React
 * Flow's ResizeObserver.  Falls back to a text-length heuristic for the
 * initial layout pass when the DOM hasn't rendered yet.
 */
function nodeRadius(node: Node, fontScale: number): number {
  // ── Prefer real DOM measurements when available
  const m = node.measured as { width?: number; height?: number } | undefined;
  if (m?.width && m?.height) {
    return halfDiag(m.width, m.height) + 4;
  }

  // ── Fallback: estimate from label text
  return estimateNodeRadius(node, fontScale);
}

/** Text-based estimate used before the first DOM measurement. */
function estimateNodeRadius(node: Node, fontScale: number): number {
  const type = node.type ?? "";
  const data = node.data as Record<string, unknown>;

  if (type === "mainNode") {
    return 100 + 30 * fontScale;
  }

  let label = "";
  if (type === "linkNode") {
    label = (data.segmentLabel as string) ?? "";
  } else if (type === "groupNode") {
    label = (data.label as string) ?? "";
  }
  if (!label) return FALLBACK_RADIUS;

  const charW = 17 * fontScale;
  const padX = 24;
  const padY = 16;
  const iconW = type === "groupNode" ? (16 + 8) * fontScale : 0;
  const lineH = 34 * fontScale;

  const w = Math.max(80, label.length * charW + padX + iconW);
  const h = lineH + padY;

  return halfDiag(w, h) + 4;
}

/** Default minimum gap between adjacent bounding circles. */
const DEFAULT_CIRCLE_GAP = 10;

/** Number of binary-search iterations (50 → sub-pixel precision). */
const BISECT_ITERATIONS = 50;

// ── Tree structure ──────────────────────────────────────────────────────

interface TreeInfo {
  childrenOf: Map<string, string[]>;
  parentOf: Map<string, string>;
  rootId: string;
}

function buildTree(nodes: Node[], edges: Edge[]): TreeInfo {
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();

  for (const edge of edges) {
    const list = childrenOf.get(edge.source) ?? [];
    list.push(edge.target);
    childrenOf.set(edge.source, list);
    parentOf.set(edge.target, edge.source);
  }

  const rootId =
    nodes.find((n) => !parentOf.has(n.id))?.id ?? nodes[0]?.id ?? "main";

  return { childrenOf, parentOf, rootId };
}

// ── Placement math ──────────────────────────────────────────────────────

/**
 * Sum of minimum angular gaps for N children on a ring of radius R.
 */
function totalMinAngle(
  childRadii: number[],
  R: number,
  gap: number,
): number {
  const N = childRadii.length;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const arg = (childRadii[i] + childRadii[j] + gap) / (2 * R);
    sum += 2 * Math.asin(Math.min(1, arg));
  }
  return sum;
}

/**
 * Find the minimum ring radius R so that N children with their bounding
 * circles fit without overlap, using binary search.
 *
 * `parentLeaf` is the leaf radius of the parent node — children must be
 * placed outside the parent's visual body.
 */
function computePlacementRadius(
  childRadii: number[],
  gap: number,
  parentLeaf: number,
): number {
  const N = childRadii.length;
  if (N === 0) return 0;

  // For a single child the subtree fans out *away* from the parent, so we
  // only need enough distance to clear the two node bodies — not the
  // child's full subtree radius.  Capping prevents exponential blow-up in
  // single-child chains (depth D would otherwise produce R ∝ 2^D).
  if (N === 1) {
    return Math.max(Math.min(childRadii[0], FALLBACK_RADIUS), parentLeaf) + gap;
  }

  // Lower bound:
  //  - Children must sit outside the parent's node body
  //  - arcsin args must be ≤ 1
  //  - Children must not cover each other
  let lo = Math.max(parentLeaf + gap, Math.max(...childRadii) + gap);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    lo = Math.max(lo, (childRadii[i] + childRadii[j] + gap) / 2);
  }

  // Upper bound from total pairwise demand
  let hi = 0;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    hi += childRadii[i] + childRadii[j] + gap;
  }
  hi = Math.max(lo + 1, hi / (2 * Math.PI));

  while (totalMinAngle(childRadii, hi, gap) > 2 * Math.PI) {
    hi *= 2;
  }

  // Bisect
  for (let iter = 0; iter < BISECT_ITERATIONS; iter++) {
    const mid = (lo + hi) / 2;
    if (totalMinAngle(childRadii, mid, gap) > 2 * Math.PI) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return hi;
}

/**
 * Compute angular positions for children with variable spacing.
 * Excess slack is distributed proportionally to adjacent subtree sizes.
 */
function computeChildAngles(
  childRadii: number[],
  R: number,
  gap: number,
  startAngle: number,
): number[] {
  const N = childRadii.length;
  if (N === 0) return [];
  if (N === 1) return [startAngle];

  const minGaps: number[] = [];
  let totalMin = 0;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const arg = Math.min(1, (childRadii[i] + childRadii[j] + gap) / (2 * R));
    const g = 2 * Math.asin(arg);
    minGaps.push(g);
    totalMin += g;
  }

  const slack = Math.max(0, 2 * Math.PI - totalMin);

  const weights: number[] = [];
  let totalWeight = 0;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const w = childRadii[i] + childRadii[j];
    weights.push(w);
    totalWeight += w;
  }

  const angles: number[] = new Array(N);
  angles[0] = startAngle;
  for (let i = 0; i < N - 1; i++) {
    const extra =
      totalWeight > 0 ? slack * (weights[i] / totalWeight) : slack / N;
    angles[i + 1] = angles[i] + minGaps[i] + extra;
  }

  return angles;
}

// ── Bottom-up: compute subtree radii ────────────────────────────────────

function computeSubtreeRadii(
  nodeById: Map<string, Node>,
  tree: TreeInfo,
  gap: number,
  fontScale: number,
): Map<string, number> {
  const radii = new Map<string, number>();

  function compute(id: string): number {
    const cached = radii.get(id);
    if (cached !== undefined) return cached;

    const node = nodeById.get(id);
    if (!node) {
      radii.set(id, FALLBACK_RADIUS);
      return FALLBACK_RADIUS;
    }

    const children = tree.childrenOf.get(id) ?? [];
    if (children.length === 0) {
      const r = nodeRadius(node, fontScale);
      radii.set(id, r);
      return r;
    }

    const childRadii = children.map((cid) => compute(cid));
    const parentLeaf = nodeRadius(node, fontScale);
    const R = computePlacementRadius(childRadii, gap, parentLeaf);
    const maxChildRadius = Math.max(...childRadii);
    const subtreeR = R + maxChildRadius;
    radii.set(id, subtreeR);
    return subtreeR;
  }

  for (const node of nodeById.values()) {
    compute(node.id);
  }

  return radii;
}

// ── Top-down: place children with variable angular spacing ──────────────

function layoutSubtree(
  id: string,
  cx: number,
  cy: number,
  nodeById: Map<string, Node>,
  tree: TreeInfo,
  subtreeRadii: Map<string, number>,
  originalPositions: Map<string, { x: number; y: number }>,
  gap: number,
  fontScale: number,
): void {
  const node = nodeById.get(id);
  if (!node) return;

  const orig = originalPositions.get(id) ?? { x: cx, y: cy };

  node.position.x = cx;
  node.position.y = cy;

  const children = tree.childrenOf.get(id) ?? [];
  if (children.length === 0) return;

  const childRadii = children.map(
    (cid) => subtreeRadii.get(cid) ?? FALLBACK_RADIUS,
  );

  const parentLeaf = estimateNodeRadius(node, fontScale);
  const R = computePlacementRadius(childRadii, gap, parentLeaf);

  const indexed = children.map((cid, i) => {
    const childOrig = originalPositions.get(cid);
    if (!childOrig) return { cid, angle: 0, radius: childRadii[i] };
    const dx = childOrig.x - orig.x;
    const dy = childOrig.y - orig.y;
    return { cid, angle: Math.atan2(dy, dx), radius: childRadii[i] };
  });

  indexed.sort((a, b) => a.angle - b.angle);

  const sortedRadii = indexed.map((c) => c.radius);
  const startAngle = indexed[0].angle;
  const angles = computeChildAngles(sortedRadii, R, gap, startAngle);

  for (let i = 0; i < indexed.length; i++) {
    const { cid } = indexed[i];
    const childX = cx + R * Math.cos(angles[i]);
    const childY = cy + R * Math.sin(angles[i]);
    layoutSubtree(
      cid,
      childX,
      childY,
      nodeById,
      tree,
      subtreeRadii,
      originalPositions,
      gap,
      fontScale,
    );
  }
}

// ── Public API ──────────────────────────────────────────────────────────

export function resolveOverlaps(
  nodes: Node[],
  edges: Edge[],
  gap = DEFAULT_CIRCLE_GAP,
  fontScale = 1,
): Node[] {
  if (nodes.length <= 1) return nodes;

  const work = nodes.map((n) => ({
    ...n,
    position: { ...n.position },
  }));

  const nodeById = new Map<string, Node>();
  for (const n of work) {
    nodeById.set(n.id, n);
  }

  const originalPositions = new Map<string, { x: number; y: number }>();
  for (const n of work) {
    originalPositions.set(n.id, { x: n.position.x, y: n.position.y });
  }

  const tree = buildTree(work, edges);
  const subtreeRadii = computeSubtreeRadii(nodeById, tree, gap, fontScale);

  const root = nodeById.get(tree.rootId);
  const rootX = root?.position.x ?? 0;
  const rootY = root?.position.y ?? 0;

  layoutSubtree(
    tree.rootId,
    rootX,
    rootY,
    nodeById,
    tree,
    subtreeRadii,
    originalPositions,
    gap,
    fontScale,
  );

  return work;
}
