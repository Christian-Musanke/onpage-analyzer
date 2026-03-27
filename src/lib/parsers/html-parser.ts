import * as cheerio from "cheerio";
import type {
  SeoData,
  HreflangTag,
  RobotsData,
  ArticleMeta,
  LinkData,
  PageMetrics,
  SchemaItem,
} from "@/lib/types";
import { extractLinks } from "./link-extractor";
import { extractHeadings } from "./heading-parser";
import { extractMedia } from "./media-parser";
import { extractSchema } from "./schema-parser";
import { calculateMetrics } from "./metrics-calculator";

export interface ParseResult {
  seo: SeoData;
  links: LinkData[];
  metrics: PageMetrics;
}

export function parseHtml(
  html: string,
  url: string,
  xRobotsTag: string | null,
  loadTimeMs: number,
): ParseResult {
  const $ = cheerio.load(html);

  // --- Title ---
  const title = $("title").first().text().trim() || null;

  // --- Meta description ---
  const metaDescription =
    $('meta[name="description"]').first().attr("content")?.trim() || null;

  // --- Canonical ---
  const canonical =
    $('link[rel="canonical"]').first().attr("href")?.trim() || null;

  // --- Hreflang ---
  const hreflang: HreflangTag[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang")?.trim();
    const href = $(el).attr("href")?.trim();
    if (lang && href) {
      hreflang.push({ lang, href });
    }
  });

  // --- Robots ---
  const robots = extractRobots($, xRobotsTag);

  // --- Sub-parsers ---
  const headings = extractHeadings($);
  const media = extractMedia($, url);
  const schema = extractSchema($);
  const links = extractLinks($, url);
  const metrics = calculateMetrics($, html, links, loadTimeMs);

  // --- Article metadata (from schema + meta tags) ---
  const articleMeta = extractArticleMeta($, schema);

  const seo: SeoData = {
    title,
    metaDescription,
    canonical,
    hreflang,
    headings,
    media,
    schema,
    robots,
    articleMeta,
  };

  return { seo, links, metrics };
}

/** Article-type schema types that carry date/author metadata. */
const ARTICLE_TYPES = new Set([
  "Article",
  "NewsArticle",
  "BlogPosting",
  "TechArticle",
  "ScholarlyArticle",
  "Report",
  "WebPage",
]);

function extractArticleMeta(
  $: cheerio.CheerioAPI,
  schemaItems: SchemaItem[],
): ArticleMeta | null {
  let datePublished: string | null = null;
  let dateModified: string | null = null;
  let dateCreated: string | null = null;
  const authors: string[] = [];

  // 1. Extract from schema.org structured data
  for (const item of schemaItems) {
    if (!ARTICLE_TYPES.has(item.type)) continue;
    const raw = item.raw;

    if (!datePublished && typeof raw.datePublished === "string") {
      datePublished = raw.datePublished;
    }
    if (!dateModified && typeof raw.dateModified === "string") {
      dateModified = raw.dateModified;
    }
    if (!dateCreated && typeof raw.dateCreated === "string") {
      dateCreated = raw.dateCreated;
    }

    // Extract author(s)
    const authorField = raw.author;
    if (authorField) {
      collectAuthorNames(authorField, authors);
    }

    // Check for editor/reviewer/contributor
    for (const field of ["editor", "reviewer", "contributor"] as const) {
      const val = raw[field];
      if (val) collectAuthorNames(val, authors);
    }
  }

  // 2. Fallback to meta tags if schema didn't provide dates
  if (!datePublished) {
    datePublished =
      $('meta[property="article:published_time"]').attr("content")?.trim() ??
      $('meta[name="date"]').attr("content")?.trim() ??
      $('meta[name="DC.date.issued"]').attr("content")?.trim() ??
      null;
  }
  if (!dateModified) {
    dateModified =
      $('meta[property="article:modified_time"]').attr("content")?.trim() ??
      $('meta[name="last-modified"]').attr("content")?.trim() ??
      $('meta[name="DC.date.modified"]').attr("content")?.trim() ??
      null;
  }

  // 3. Fallback author from meta tags
  if (authors.length === 0) {
    const metaAuthor =
      $('meta[name="author"]').attr("content")?.trim() ??
      $('meta[property="article:author"]').attr("content")?.trim() ??
      $('meta[name="DC.creator"]').attr("content")?.trim() ??
      null;
    if (metaAuthor) authors.push(metaAuthor);
  }

  // Return null if nothing found
  if (!datePublished && !dateModified && !dateCreated && authors.length === 0) {
    return null;
  }

  return { datePublished, dateModified, dateCreated, authors };
}

/**
 * Recursively extract author name(s) from a schema.org author field,
 * which may be a string, an object with `name`, or an array of these.
 */
function collectAuthorNames(value: unknown, out: string[]): void {
  if (typeof value === "string" && value.trim()) {
    if (!out.includes(value.trim())) out.push(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectAuthorNames(entry, out);
    return;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string" && obj.name.trim()) {
      if (!out.includes(obj.name.trim())) out.push(obj.name.trim());
    }
  }
}

function extractRobots(
  $: cheerio.CheerioAPI,
  xRobotsTag: string | null,
): RobotsData {
  const metaRobots =
    $('meta[name="robots"]').first().attr("content")?.trim() || null;

  const combined = [metaRobots, xRobotsTag]
    .filter(Boolean)
    .join(", ")
    .toLowerCase();

  return {
    metaRobots,
    xRobotsTag,
    isNoindex: combined.includes("noindex"),
    isNofollow: combined.includes("nofollow"),
  };
}
