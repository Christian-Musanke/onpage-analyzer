"use client"

import { createContext, useContext, useMemo, useState } from "react"
import type { HeadingNode, LinkData } from "@/lib/types"

interface HoveredLinkContextValue {
  hoveredHref: string | null
  setHoveredHref: (href: string | null) => void
}

const HoveredLinkContext = createContext<HoveredLinkContextValue>({
  hoveredHref: null,
  setHoveredHref: () => {},
})

export function HoveredLinkProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)

  const value = useMemo(
    () => ({ hoveredHref, setHoveredHref }),
    [hoveredHref],
  )

  return <HoveredLinkContext value={value}>{children}</HoveredLinkContext>
}

export function useHoveredLink() {
  return useContext(HoveredLinkContext)
}

/**
 * Derive the set of href variants to search for inside `contentHtml`.
 *
 * LinkData stores fully resolved absolute URLs (e.g. `https://example.com/page`),
 * but `contentHtml` preserves the original `href` attribute from the DOM which is
 * often relative (e.g. `/page`, `../page`, or `page`). We build a small set of
 * candidate strings so the `includes()` check covers both forms.
 */
export function hrefVariants(absoluteHref: string): string[] {
  const variants = [absoluteHref]

  try {
    const url = new URL(absoluteHref)
    // pathname + search + hash  (e.g. "/page?q=1#top")
    const relative = url.pathname + url.search + url.hash
    if (relative !== absoluteHref) variants.push(relative)

    // Without trailing slash variant  (e.g. "/page" vs "/page/")
    if (relative.endsWith("/") && relative.length > 1) {
      variants.push(relative.slice(0, -1))
    } else if (!relative.endsWith("/")) {
      variants.push(relative + "/")
    }
  } catch {
    // Not a valid URL — fall back to the raw string only
  }

  return variants
}

/**
 * Check whether a heading node's own `contentHtml` contains any of the
 * pre-computed href variants.
 */
export function headingContainsVariants(
  node: HeadingNode,
  variants: string[],
): boolean {
  if (!node.contentHtml) return false
  return variants.some((v) => node.contentHtml.includes(v))
}

/**
 * Check whether a heading node or any of its descendants contain the href.
 * Useful for highlighting ancestor headings in a collapsed tree.
 */
export function subtreeContainsVariants(
  node: HeadingNode,
  variants: string[],
): boolean {
  if (headingContainsVariants(node, variants)) return true
  return node.children.some((child) =>
    subtreeContainsVariants(child, variants),
  )
}

/**
 * Extract all `href` attribute values from `<a>` elements found in a heading
 * node's `contentHtml` and that of all its descendants.
 *
 * Unlike the `includes()`-based helpers above, this uses `DOMParser` for exact
 * attribute extraction — no substring false-positives.
 */
export function extractHrefsFromSubtree(node: HeadingNode): Set<string> {
  const hrefs = new Set<string>()
  const parser = new DOMParser()

  function collect(n: HeadingNode) {
    if (n.contentHtml) {
      const doc = parser.parseFromString(n.contentHtml, "text/html")
      for (const anchor of doc.querySelectorAll("a[href]")) {
        const href = anchor.getAttribute("href")
        if (href) hrefs.add(href)
      }
    }
    for (const child of n.children) {
      collect(child)
    }
  }

  collect(node)
  return hrefs
}

/**
 * Filter a links array to only those whose href matches a link found in the
 * heading subtree.
 *
 * Builds a lookup `Set` from the raw hrefs in `contentHtml` (expanded via
 * `hrefVariants`), then checks each link's variants against the set.
 */
export function filterLinksForSection(
  allLinks: LinkData[],
  section: HeadingNode,
): LinkData[] {
  const rawHrefs = extractHrefsFromSubtree(section)
  if (rawHrefs.size === 0) return []

  const lookupSet = new Set<string>()
  for (const raw of rawHrefs) {
    lookupSet.add(raw)
    for (const v of hrefVariants(raw)) {
      lookupSet.add(v)
    }
  }

  return allLinks.filter((link) => {
    const variants = hrefVariants(link.href)
    return variants.some((v) => lookupSet.has(v))
  })
}
