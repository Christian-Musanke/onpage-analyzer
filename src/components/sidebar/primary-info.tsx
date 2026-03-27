"use client"

import { ExternalLink, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { SeoData } from "@/lib/types"

interface PrimaryInfoProps {
  seo: SeoData
}

// ── Length audit bar ────────────────────────────────────────────────────

const TITLE_MIN = 50
const TITLE_MAX = 60
const META_MIN = 150
const META_MAX = 160

function lengthStatus(
  len: number,
  min: number,
  max: number,
): "good" | "warn" | "bad" {
  if (len >= min && len <= max) return "good"
  if (len > 0 && (len >= min - 10 || len <= max + 10)) return "warn"
  return "bad"
}

const statusColors = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
} as const

const statusLabels = {
  good: "Optimal",
  warn: "Akzeptabel",
  bad: "Nicht optimal",
} as const

function LengthBar({
  length,
  min,
  max,
  ceiling,
}: {
  length: number
  min: number
  max: number
  ceiling: number
}) {
  const status = lengthStatus(length, min, max)
  const pct = Math.min(100, (length / ceiling) * 100)

  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", statusColors[status])}
          style={{ width: `${pct}%` }}
        />
        {/* Optimal-range markers */}
        <div
          className="absolute inset-y-0 w-px bg-foreground/20"
          style={{ left: `${(min / ceiling) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-foreground/20"
          style={{ left: `${(max / ceiling) * 100}%` }}
        />
      </div>
      <span
        className={cn(
          "shrink-0 text-[10px] font-medium",
          status === "good" && "text-emerald-600 dark:text-emerald-400",
          status === "warn" && "text-amber-600 dark:text-amber-400",
          status === "bad" && "text-red-600 dark:text-red-400",
        )}
      >
        {statusLabels[status]}
      </span>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────

export function PrimaryInfo({ seo }: PrimaryInfoProps) {
  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Title{" "}
          {seo.title ? (
            <span className="text-foreground/60">
              ({seo.title.length} Zeichen)
            </span>
          ) : null}
        </p>
        {seo.title ? (
          <>
            <p className="text-sm leading-snug">{seo.title}</p>
            <LengthBar
              length={seo.title.length}
              min={TITLE_MIN}
              max={TITLE_MAX}
              ceiling={80}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nicht vorhanden
          </p>
        )}
      </div>

      <Separator />

      {/* Meta Description */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Meta Description{" "}
          {seo.metaDescription ? (
            <span className="text-foreground/60">
              ({seo.metaDescription.length} Zeichen)
            </span>
          ) : null}
        </p>
        {seo.metaDescription ? (
          <>
            <p className="text-sm leading-snug">{seo.metaDescription}</p>
            <LengthBar
              length={seo.metaDescription.length}
              min={META_MIN}
              max={META_MAX}
              ceiling={200}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nicht vorhanden
          </p>
        )}
      </div>

      <Separator />

      {/* Canonical */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Canonical</p>
        {seo.canonical ? (
          <a
            href={seo.canonical}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            title={seo.canonical}
          >
            <ExternalLink className="size-3 shrink-0 mt-0.5" />
            <span className="break-all">{seo.canonical}</span>
          </a>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nicht vorhanden
          </p>
        )}
      </div>

      {/* Hreflang Tags */}
      {seo.hreflang.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              <Globe className="inline size-3 mr-1" />
              Hreflang Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {seo.hreflang.map((tag, i) => (
                <a
                  key={i}
                  href={tag.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={tag.href}
                >
                  <Badge variant="secondary" className="text-xs">
                    {tag.lang}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
