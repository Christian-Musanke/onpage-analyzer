export const FETCH_TIMEOUT_MS = 8_000;
export const HEAD_REQUEST_TIMEOUT_MS = 3_000;
export const LINK_CHECK_BATCH_SIZE = 20;
export const MAX_DISPLAY_NODES = 80;
export const TOP_KEYWORDS_COUNT = 10;
export const MIN_KEYWORD_LENGTH = 3;

export const NODE_COLORS = {
  internal: "oklch(0.72 0.15 160)",
  external: "oklch(0.72 0.12 270)",
} as const;

export const STATUS_COLORS = {
  success: "oklch(0.72 0.19 145)",
  redirect: "oklch(0.80 0.15 85)",
  clientError: "oklch(0.65 0.20 30)",
  serverError: "oklch(0.55 0.22 25)",
  pending: "oklch(0.70 0.01 107)",
} as const;

export const USER_AGENT =
  "Mozilla/5.0 (compatible; OnPageAnalyzer/1.0; +internal-tool)";

export const STOP_WORDS_DE = new Set([
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einer", "einem",
  "einen", "und", "oder", "aber", "als", "auch", "auf", "aus", "bei", "bis",
  "da", "dann", "dass", "denn", "doch", "durch", "es", "er", "sie", "wir",
  "ihr", "für", "hat", "haben", "ich", "im", "in", "ist", "kann", "man",
  "mit", "nach", "nicht", "noch", "nur", "so", "über", "um", "von", "vor",
  "was", "wenn", "wie", "wird", "zu", "zum", "zur", "sich", "sind", "war",
  "wird", "alle", "diese", "diesem", "dieser", "diesem", "schon", "sehr",
  "sein", "seine", "seinem", "seinen", "seiner", "mehr", "werden", "wurde",
]);

export const STOP_WORDS_EN = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this", "but",
  "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will",
  "my", "one", "all", "would", "there", "their", "what", "so", "up", "out",
  "if", "about", "who", "get", "which", "go", "me", "when", "make", "can",
  "like", "time", "no", "just", "him", "know", "take", "people", "into",
  "year", "your", "good", "some", "could", "them", "see", "other", "than",
  "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well",
  "way", "even", "new", "want", "because", "any", "these", "give", "day",
  "most", "us", "are", "has", "was", "been", "is", "am",
]);

export const STOP_WORDS = new Set([...STOP_WORDS_DE, ...STOP_WORDS_EN]);
