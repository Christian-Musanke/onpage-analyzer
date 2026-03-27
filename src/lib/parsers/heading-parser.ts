import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { HeadingNode } from "@/lib/types";

/** Tags whose content we strip entirely from heading sections. */
const STRIP_TAGS = new Set(["script", "style", "noscript", "nav", "footer", "header"]);

/** Tags we allow in the sanitized content HTML. */
const ALLOW_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "a",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "img", "figure", "figcaption", "picture", "source",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "span", "div", "section", "article",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "dl", "dt", "dd", "abbr", "mark", "small", "sub", "sup",
  "video", "iframe",
]);

/** Attributes we keep on allowed tags. */
const ALLOW_ATTRS = new Set([
  "href", "src", "alt", "title", "width", "height",
  "class", "target", "rel", "colspan", "rowspan",
]);

interface FlatHeading {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  contentHtml: string;
}

export function extractHeadings($: CheerioAPI): HeadingNode[] {
  const flat: FlatHeading[] = [];

  // Collect all heading elements in document order with their positions
  const headingEls: { level: number; text: string; el: AnyNode }[] = [];

  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tagName = $(el).prop("tagName")?.toLowerCase() ?? "";
    const level = parseInt(tagName.replace("h", ""), 10);
    const text = $(el).text().trim();
    if (level >= 1 && level <= 6) {
      headingEls.push({ level, text, el });
    }
  });

  // For each heading, collect the HTML content between it and the next heading
  for (let i = 0; i < headingEls.length; i++) {
    const { level, text, el } = headingEls[i];
    const contentParts: string[] = [];

    // Walk sibling nodes after the heading element until we hit the next heading
    let current = $(el).next();
    const nextHeadingEl = i < headingEls.length - 1 ? headingEls[i + 1].el : null;

    while (current.length > 0) {
      const node = current.get(0);
      if (!node) break;

      // Stop if we've reached the next heading element
      if (nextHeadingEl && node === nextHeadingEl) break;

      // Stop if this is any heading tag
      const tag = $(current).prop("tagName")?.toLowerCase() ?? "";
      if (/^h[1-6]$/.test(tag)) break;

      // Skip unwanted tags
      if (!STRIP_TAGS.has(tag)) {
        const html = sanitizeHtml($, current);
        if (html.trim()) {
          contentParts.push(html);
        }
      }

      current = current.next();
    }

    flat.push({
      level: level as FlatHeading["level"],
      text,
      contentHtml: contentParts.join("\n"),
    });
  }

  return buildTree(flat);
}

/**
 * Sanitize an element's outer HTML: keep only allowed tags and attributes.
 */
function sanitizeHtml($: CheerioAPI, el: Cheerio<AnyNode>): string {
  const clone = el.clone();

  // Remove disallowed tags entirely
  clone.find("*").each((_: number, child: AnyNode) => {
    const tag = $(child).prop("tagName")?.toLowerCase() ?? "";
    if (STRIP_TAGS.has(tag)) {
      $(child).remove();
    }
  });

  // Strip disallowed attributes from all remaining elements
  clone.find("*").each((_: number, child: AnyNode) => {
    const attribs = (child as Element).attribs;
    if (!attribs) return;
    for (const attr of Object.keys(attribs)) {
      if (!ALLOW_ATTRS.has(attr)) {
        $(child).removeAttr(attr);
      }
    }
  });

  return $.html(clone) ?? "";
}

/**
 * Build a nested tree from a flat list of headings using a stack-based algorithm.
 */
function buildTree(flat: FlatHeading[]): HeadingNode[] {
  const root: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const { level, text, contentHtml } of flat) {
    const node: HeadingNode = { level, text, contentHtml, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}
