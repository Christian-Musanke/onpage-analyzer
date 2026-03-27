import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import type { LinkData, LinkRel } from "@/lib/types";

const SKIP_PROTOCOLS = ["javascript:", "mailto:", "tel:"];

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

function findContentRoot($: CheerioAPI): Cheerio<AnyNode> {
  const candidates = ["main", "article", "[role='main']"];

  for (const selector of candidates) {
    const el = $(selector);
    if (el.length) return el;
  }

  // Fallback: body minus navigational landmarks
  const body = $("body").clone();
  body.find("nav, header, footer, aside").remove();
  return body;
}

function parseRel(relAttr: string | undefined): LinkRel {
  const tokens = (relAttr ?? "").toLowerCase().split(/\s+/);
  return {
    nofollow: tokens.includes("nofollow"),
    sponsored: tokens.includes("sponsored"),
    ugc: tokens.includes("ugc"),
  };
}

export function extractLinks(
  $: CheerioAPI,
  baseUrl: string,
): LinkData[] {
  const content = findContentRoot($);
  const seen = new Set<string>();
  const links: LinkData[] = [];

  let baseHost: string;
  try {
    baseHost = normalizeHost(new URL(baseUrl).hostname);
  } catch {
    return links;
  }

  content.find("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href")?.trim();
    if (!rawHref) return;

    // Skip anchors-only and non-http protocols
    if (rawHref === "#" || rawHref.startsWith("#")) return;
    if (SKIP_PROTOCOLS.some((p) => rawHref.toLowerCase().startsWith(p))) return;

    let resolved: URL;
    try {
      resolved = new URL(rawHref, baseUrl);
    } catch {
      return; // malformed URL – skip
    }

    const href = resolved.href;
    if (seen.has(href)) return;
    seen.add(href);

    const text = $(el).text().trim();
    const isInternal = normalizeHost(resolved.hostname) === baseHost;
    const rel = parseRel($(el).attr("rel"));

    links.push({ href, text, isInternal, rel });
  });

  return links;
}
