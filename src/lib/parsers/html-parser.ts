import * as cheerio from "cheerio";
import type {
  SeoData,
  HreflangTag,
  RobotsData,
  LinkData,
  PageMetrics,
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

  const seo: SeoData = {
    title,
    metaDescription,
    canonical,
    hreflang,
    headings,
    media,
    schema,
    robots,
  };

  return { seo, links, metrics };
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
