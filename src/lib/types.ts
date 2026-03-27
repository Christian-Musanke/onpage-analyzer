// === Request/Response Types ===

export interface AnalyzeRequest {
  url: string;
}

export interface AnalyzeResponse {
  url: string;
  fetchedAt: string;
  status: number;
  loadTimeMs: number;
  pageSizeBytes: number;
  seo: SeoData;
  links: LinkData[];
  metrics: PageMetrics;
}

export interface CheckLinksRequest {
  urls: string[];
}

export interface CheckLinksResponse {
  results: Record<string, LinkStatus>;
}

// === SEO Data ===

export interface SeoData {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  hreflang: HreflangTag[];
  headings: HeadingNode[];
  media: MediaData;
  schema: SchemaItem[];
  robots: RobotsData;
  articleMeta: ArticleMeta | null;
}

export interface ArticleMeta {
  datePublished: string | null;
  dateModified: string | null;
  dateCreated: string | null;
  authors: string[];
}

export interface HreflangTag {
  lang: string;
  href: string;
}

export interface HeadingNode {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  /** Sanitized HTML content between this heading and the next sibling/parent heading. */
  contentHtml: string;
  children: HeadingNode[];
}

export interface MediaData {
  images: MediaItem[];
  videos: MediaItem[];
}

export interface MediaItem {
  src: string;
  alt: string | null;
  title: string | null;
  width?: number;
  height?: number;
}

export interface SchemaItem {
  type: string;
  raw: Record<string, unknown>;
  /** Validation issues detected in this schema item. */
  issues: SchemaIssue[];
}

export interface SchemaIssue {
  severity: "error" | "warning";
  message: string;
  path?: string;
}

export interface RobotsData {
  metaRobots: string | null;
  xRobotsTag: string | null;
  isNoindex: boolean;
  isNofollow: boolean;
}

// === Links ===

export interface LinkData {
  href: string;
  text: string;
  isInternal: boolean;
  rel: LinkRel;
}

export interface LinkRel {
  nofollow: boolean;
  sponsored: boolean;
  ugc: boolean;
}

export interface LinkStatus {
  statusCode: number | null;
  redirectUrl?: string;
  error?: string;
}

// === Metrics ===

export interface PageMetrics {
  wordCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  textToHtmlRatio: number;
  topKeywords: KeywordEntry[];
  readabilityScore: number;
  pageSizeBytes: number;
  loadTimeMs: number;
  aiContent: AiContentMetrics;
}

export interface AiContentMetrics {
  /** Overall AI probability score (0-100, higher = more likely AI). */
  score: number;
  /** Type-Token Ratio — vocabulary diversity (0-1, lower = less diverse). */
  vocabularyDiversity: number;
  /** Standard deviation of sentence lengths (lower = more uniform / AI-like). */
  sentenceLengthStdDev: number;
  /** Number of detected common AI phrases. */
  aiPhraseCount: number;
  /** The detected AI phrases. */
  aiPhrases: string[];
}

export interface KeywordEntry {
  word: string;
  count: number;
  density: number;
}
