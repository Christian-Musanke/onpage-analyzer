import type { CheerioAPI } from "cheerio";
import type { MediaData, MediaItem } from "@/lib/types";

const VIDEO_EMBED_PATTERNS = [
  /youtube\.com\/embed\//i,
  /youtube-nocookie\.com\/embed\//i,
  /player\.vimeo\.com\/video\//i,
];

function resolveUrl(raw: string | undefined, baseUrl: string): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim(), baseUrl).href;
  } catch {
    return null;
  }
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function extractMedia(
  $: CheerioAPI,
  baseUrl: string,
): MediaData {
  const images: MediaItem[] = [];
  const videos: MediaItem[] = [];

  // --- Images ---
  $("img[src]").each((_, el) => {
    const src = resolveUrl($(el).attr("src"), baseUrl);
    if (!src) return;

    images.push({
      src,
      alt: $(el).attr("alt") ?? null,
      title: $(el).attr("title") ?? null,
      width: parseIntOrUndefined($(el).attr("width")),
      height: parseIntOrUndefined($(el).attr("height")),
    });
  });

  // --- <video> tags ---
  $("video").each((_, el) => {
    const src =
      resolveUrl($(el).attr("src"), baseUrl) ??
      resolveUrl($(el).find("source").first().attr("src"), baseUrl);
    if (!src) return;

    videos.push({
      src,
      alt: $(el).attr("alt") ?? null,
      title: $(el).attr("title") ?? null,
      width: parseIntOrUndefined($(el).attr("width")),
      height: parseIntOrUndefined($(el).attr("height")),
    });
  });

  // --- Video embeds (YouTube / Vimeo iframes) ---
  $("iframe[src]").each((_, el) => {
    const rawSrc = $(el).attr("src") ?? "";
    const isVideoEmbed = VIDEO_EMBED_PATTERNS.some((p) => p.test(rawSrc));
    if (!isVideoEmbed) return;

    const src = resolveUrl(rawSrc, baseUrl);
    if (!src) return;

    videos.push({
      src,
      alt: null,
      title: $(el).attr("title") ?? null,
      width: parseIntOrUndefined($(el).attr("width")),
      height: parseIntOrUndefined($(el).attr("height")),
    });
  });

  return { images, videos };
}
