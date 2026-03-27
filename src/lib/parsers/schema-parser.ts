import type { CheerioAPI } from "cheerio";
import type { SchemaItem } from "@/lib/types";

export function extractSchema($: CheerioAPI): SchemaItem[] {
  const items: SchemaItem[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw?.trim()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed JSON – skip silently
      return;
    }

    collectItems(parsed, items);
  });

  return items;
}

function collectItems(data: unknown, out: SchemaItem[]): void {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const entry of data) {
      collectItems(entry, out);
    }
    return;
  }

  const obj = data as Record<string, unknown>;

  // Handle @graph arrays
  if (Array.isArray(obj["@graph"])) {
    for (const entry of obj["@graph"]) {
      collectItems(entry, out);
    }
    return;
  }

  // Single typed object
  const rawType = obj["@type"];
  if (rawType) {
    const types = Array.isArray(rawType) ? rawType : [rawType];
    for (const t of types) {
      if (typeof t === "string") {
        out.push({ type: t, raw: obj });
      }
    }
  }
}
