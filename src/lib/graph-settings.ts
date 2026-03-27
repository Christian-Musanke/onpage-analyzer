export interface GraphSettings {
  /** Merge single-child synthetic nodes into their child. */
  collapseChains: boolean;
  /** Minimum gap (px) between adjacent node bounding circles. */
  nodeGap: number;
  /** Multiplier applied to all node label font sizes (1 = default). */
  fontScale: number;
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
  collapseChains: true,
  nodeGap: 10,
  fontScale: 1,
};

const STORAGE_KEY = "graph-settings";

export function loadGraphSettings(): GraphSettings {
  if (typeof window === "undefined") return DEFAULT_GRAPH_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GRAPH_SETTINGS;
    return { ...DEFAULT_GRAPH_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GRAPH_SETTINGS;
  }
}

export function saveGraphSettings(settings: GraphSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}
