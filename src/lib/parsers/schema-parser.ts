import type { CheerioAPI } from "cheerio";
import type { SchemaItem } from "@/lib/types";
import { validateSchemaItem, validateJsonLdSyntax } from "./schema-validator";

export function extractSchema($: CheerioAPI): SchemaItem[] {
  const items: SchemaItem[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw?.trim()) return;

    // Check for JSON syntax issues before parsing
    const syntaxIssues = validateJsonLdSyntax(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed JSON — record as an error item
      items.push({
        type: "Invalid JSON-LD",
        raw: { _rawSource: raw.slice(0, 500) },
        issues: [
          ...syntaxIssues,
          { severity: "error", message: "Failed to parse JSON-LD (malformed JSON)" },
        ],
      });
      return;
    }

    collectItems(parsed, items, syntaxIssues);
  });

  return items;
}

function collectItems(
  data: unknown,
  out: SchemaItem[],
  syntaxIssues: SchemaItem["issues"] = [],
): void {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const entry of data) {
      collectItems(entry, out, syntaxIssues);
    }
    return;
  }

  const obj = data as Record<string, unknown>;

  // Handle @graph arrays
  if (Array.isArray(obj["@graph"])) {
    for (const entry of obj["@graph"]) {
      collectItems(entry, out, syntaxIssues);
    }
    return;
  }

  // Single typed object
  const rawType = obj["@type"];
  if (rawType) {
    const types = Array.isArray(rawType) ? rawType : [rawType];
    for (const t of types) {
      if (typeof t === "string") {
        const issues = [...syntaxIssues, ...validateSchemaItem(obj, t)];
        out.push({ type: t, raw: obj, issues });
      }
    }
  }
}
