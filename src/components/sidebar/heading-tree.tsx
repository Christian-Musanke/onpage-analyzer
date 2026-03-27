"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronRight, Focus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useLang } from "@/components/lang-provider"
import { interp, type Dictionary } from "@/lib/i18n"
import type { HeadingNode } from "@/lib/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useHoveredLink,
  hrefVariants,
  headingContainsVariants,
  subtreeContainsVariants,
} from "@/hooks/use-hovered-link"

interface HeadingTreeProps {
  headings: HeadingNode[]
  focusedSection: HeadingNode | null
  onFocusSection: (node: HeadingNode) => void
}

const levelStyles: Record<number, string> = {
  1: "text-sm font-bold",
  2: "text-sm font-semibold",
  3: "text-sm font-medium",
  4: "text-xs font-medium text-muted-foreground",
  5: "text-xs text-muted-foreground",
  6: "text-xs text-muted-foreground/80",
}

const badgeColors: Record<number, string> = {
  1: "bg-primary text-primary-foreground",
  2: "bg-primary/80 text-primary-foreground",
  3: "bg-primary/60 text-primary-foreground",
  4: "bg-muted text-muted-foreground",
  5: "bg-muted text-muted-foreground",
  6: "bg-muted text-muted-foreground",
}

// ── Modal content: renders actual HTML content of the section ────────────

function HeadingModalContent({ node, t }: { node: HeadingNode; t: Dictionary["headingTree"] }) {
  const hasContent = node.contentHtml.trim().length > 0
  const hasChildren = node.children.length > 0

  return (
    <div className="space-y-4">
      {/* Content between this heading and the next */}
      {hasContent && (
        <div
          className="heading-prose prose prose-sm dark:prose-invert max-w-none
            prose-img:rounded-md prose-img:max-h-60 prose-img:w-auto
            prose-a:text-primary prose-a:underline
            prose-p:leading-relaxed prose-li:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: node.contentHtml }}
        />
      )}

      {/* Sub-headings with their content */}
      {hasChildren && (
        <div className="space-y-3">
          {node.children.map((child, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  className={cn(
                    "shrink-0 px-1.5 py-0 text-[10px] leading-4 font-mono",
                    badgeColors[child.level],
                  )}
                >
                  H{child.level}
                </Badge>
                <span className={cn("leading-snug", levelStyles[child.level])}>
                  {child.text}
                </span>
              </div>
              {child.contentHtml.trim() && (
                <div
                  className="heading-prose prose prose-sm dark:prose-invert max-w-none pl-4 border-l-2 border-border
                    prose-img:rounded-md prose-img:max-h-48 prose-img:w-auto
                    prose-a:text-primary prose-a:underline
                    prose-p:leading-relaxed prose-li:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: child.contentHtml }}
                />
              )}
              {/* Recurse one more level for sub-sub headings */}
              {child.children.length > 0 && (
                <div className="pl-4 mt-2 space-y-2">
                  {child.children.map((sub, j) => (
                    <div key={j}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={cn(
                            "shrink-0 px-1.5 py-0 text-[10px] leading-4 font-mono",
                            badgeColors[sub.level],
                          )}
                        >
                          H{sub.level}
                        </Badge>
                        <span className={cn("leading-snug text-xs", levelStyles[sub.level])}>
                          {sub.text}
                        </span>
                      </div>
                      {sub.contentHtml.trim() && (
                        <div
                          className="heading-prose prose prose-xs dark:prose-invert max-w-none pl-4 border-l border-border
                            prose-img:rounded-md prose-img:max-h-32 prose-img:w-auto
                            prose-a:text-primary prose-a:underline"
                          dangerouslySetInnerHTML={{ __html: sub.contentHtml }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasContent && !hasChildren && (
        <p className="text-sm text-muted-foreground italic">
          {t.noContent}
        </p>
      )}
    </div>
  )
}

// ── Tree item (sidebar) ─────────────────────────────────────────────────

function HeadingItem({
  node,
  onSelect,
  hoveredVariants,
  focusedSection,
  onFocusSection,
  t,
}: {
  node: HeadingNode
  onSelect: (node: HeadingNode) => void
  hoveredVariants: string[]
  focusedSection: HeadingNode | null
  onFocusSection: (node: HeadingNode) => void
  t: Dictionary["headingTree"]
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0
  const indent = (node.level - 1) * 12
  const isFocused = focusedSection === node

  const hasVariants = hoveredVariants.length > 0
  const isDirectMatch =
    hasVariants && headingContainsVariants(node, hoveredVariants)
  const isSubtreeMatch =
    !isDirectMatch &&
    hasVariants &&
    hasChildren &&
    node.children.some((child) =>
      subtreeContainsVariants(child, hoveredVariants),
    )
  const isHighlighted = isDirectMatch || isSubtreeMatch

  return (
    <div>
      <div
        className={cn(
          "group/heading flex items-start gap-1.5 py-0.5 transition-colors duration-150",
          isHighlighted && "rounded-sm bg-red-500/10",
          isFocused && !isHighlighted && "rounded-sm bg-primary/10",
        )}
        style={{ paddingLeft: `${indent}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen(!open)}
            className="mt-0.5 shrink-0 rounded p-0.5 hover:bg-muted"
          >
            {open ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        ) : (
          <span className="inline-block w-4 shrink-0" />
        )}
        <Badge
          className={cn(
            "shrink-0 px-1.5 py-0 text-[10px] leading-4 font-mono",
            badgeColors[node.level],
            isDirectMatch && "bg-red-500 text-white",
          )}
        >
          H{node.level}
        </Badge>
        <button
          onClick={() => onSelect(node)}
          className={cn(
            "leading-snug text-left hover:underline cursor-pointer transition-colors duration-150",
            levelStyles[node.level],
            isDirectMatch && "!text-red-500 !font-semibold",
            isSubtreeMatch && "!text-red-400",
          )}
        >
          {node.text}
        </button>

        {/* Focus button — filters graph to this section's links */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => onFocusSection(node)}
                className={cn(
                  "mt-0.5 ml-auto shrink-0 rounded p-0.5 transition-opacity",
                  isFocused
                    ? "opacity-100 text-primary"
                    : "opacity-0 group-hover/heading:opacity-100 hover:bg-muted",
                )}
              />
            }
          >
            <Focus className="size-3" />
          </TooltipTrigger>
          <TooltipContent side="right">
            {isFocused
              ? t.clearFilter
              : t.showSectionLinks}
          </TooltipContent>
        </Tooltip>
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map((child, i) => (
            <HeadingItem
              key={i}
              node={child}
              onSelect={onSelect}
              hoveredVariants={hoveredVariants}
              focusedSection={focusedSection}
              onFocusSection={onFocusSection}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Heading hierarchy validation ─────────────────────────────────────────

function validateHeadings(headings: HeadingNode[], t: Dictionary["headingTree"]): string[] {
  const issues: string[] = []

  const flat: number[] = []
  function walk(nodes: HeadingNode[]) {
    for (const n of nodes) {
      flat.push(n.level)
      walk(n.children)
    }
  }
  walk(headings)

  if (flat.length === 0) return issues

  const h1Count = flat.filter((l) => l === 1).length
  if (h1Count === 0) issues.push(t.noH1)
  else if (h1Count > 1) issues.push(interp(t.multipleH1, { count: h1Count }))

  if (flat[0] !== 1 && h1Count === 0) {
    issues.push(interp(t.firstNotH1, { actual: flat[0] }))
  }

  for (let i = 1; i < flat.length; i++) {
    const gap = flat[i] - flat[i - 1]
    if (gap > 1) {
      issues.push(interp(t.skippedLevel, { from: flat[i - 1], to: flat[i], expected: flat[i - 1] + 1 }))
    }
  }

  return issues
}

// ── Public component ────────────────────────────────────────────────────

export function HeadingTree({
  headings,
  focusedSection,
  onFocusSection,
}: HeadingTreeProps) {
  const { t } = useLang()
  const [selectedHeading, setSelectedHeading] = useState<HeadingNode | null>(
    null,
  )
  const { hoveredHref } = useHoveredLink()
  const hoveredVariants = useMemo(
    () => (hoveredHref ? hrefVariants(hoveredHref) : []),
    [hoveredHref],
  )

  const issues = useMemo(() => validateHeadings(headings, t.headingTree), [headings, t.headingTree])

  if (headings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {t.headingTree.noHeadings}
      </p>
    )
  }

  return (
    <>
      {/* Hierarchy validation warnings */}
      {issues.length > 0 && (
        <div className="mb-2 space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
          {issues.map((issue, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-0.5">
        {headings.map((heading, i) => (
          <HeadingItem
            key={i}
            node={heading}
            onSelect={setSelectedHeading}
            hoveredVariants={hoveredVariants}
            focusedSection={focusedSection}
            onFocusSection={onFocusSection}
            t={t.headingTree}
          />
        ))}
      </div>

      <Dialog
        open={selectedHeading !== null}
        onOpenChange={(open) => !open && setSelectedHeading(null)}
      >
        <DialogContent maxWidth="min(72rem, 80vw)" className="max-h-[80vh] overflow-y-auto">
          {selectedHeading && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "shrink-0 px-1.5 py-0 text-[10px] leading-4 font-mono",
                      badgeColors[selectedHeading.level],
                    )}
                  >
                    H{selectedHeading.level}
                  </Badge>
                  <DialogTitle className="text-base">
                    {selectedHeading.text}
                  </DialogTitle>
                </div>
              </DialogHeader>
              <Separator />
              <HeadingModalContent node={selectedHeading} t={t.headingTree} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
