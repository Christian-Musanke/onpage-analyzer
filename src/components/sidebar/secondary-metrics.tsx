"use client"

import { useMemo, useState } from "react"
import { Tabs } from "@base-ui/react/tabs"
import {
  BookOpen,
  FileText,
  Image,
  Link,
  AlertTriangle,
  Code,
  Search,
  Gauge,
  Type,
} from "lucide-react"
import { MetricCard } from "./metric-card"
import { MetricDetailModal } from "./metric-detail-modal"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type {
  HeadingNode,
  KeywordEntry,
  LinkData,
  MediaItem,
  PageMetrics,
  LinkStatus,
} from "@/lib/types"

interface SecondaryMetricsProps {
  metrics: PageMetrics
  links: LinkData[]
  images: MediaItem[]
  headings: HeadingNode[]
  linkStatuses: Record<string, LinkStatus>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

type ModalKey =
  | "wordCount"
  | "links"
  | "broken"
  | "textHtml"
  | "keywords"
  | "performance"
  | "altText"
  | "anchorText"
  | "readability"
  | null

export function SecondaryMetrics({
  metrics,
  links,
  images,
  headings,
  linkStatuses,
}: SecondaryMetricsProps) {
  const [activeModal, setActiveModal] = useState<ModalKey>(null)

  const brokenLinks = Object.entries(linkStatuses).filter(
    ([, status]) =>
      (status.statusCode !== null && status.statusCode >= 400) ||
      (status.statusCode === null && status.error)
  )

  const totalLinks = metrics.internalLinkCount + metrics.externalLinkCount

  // Image alt text audit
  const missingAltImages = useMemo(
    () => images.filter((img) => !img.alt || img.alt.trim() === ""),
    [images],
  )

  // Anchor text distribution
  const anchorTextGroups = useMemo(() => {
    const groups = new Map<string, { text: string; hrefs: string[]; isInternal: boolean }>()
    for (const link of links) {
      const text = link.text.trim() || "(leer)"
      const existing = groups.get(text)
      if (existing) {
        existing.hrefs.push(link.href)
      } else {
        groups.set(text, { text, hrefs: [link.href], isInternal: link.isInternal })
      }
    }
    return [...groups.values()].sort((a, b) => b.hrefs.length - a.hrefs.length)
  }, [links])

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          title="Wortanzahl"
          value={metrics.wordCount.toLocaleString("de-DE")}
          icon={<FileText className="size-4" />}
          onClick={() => setActiveModal("wordCount")}
        />
        <MetricCard
          title="Links"
          value={totalLinks}
          subtitle={`${metrics.internalLinkCount} int. / ${metrics.externalLinkCount} ext.`}
          icon={<Link className="size-4" />}
          onClick={() => setActiveModal("links")}
        />
        <MetricCard
          title="Broken Links"
          value={brokenLinks.length}
          icon={<AlertTriangle className="size-4" />}
          onClick={() => setActiveModal("broken")}
        />
        <MetricCard
          title="Text/HTML"
          value={`${metrics.textToHtmlRatio.toFixed(1)}%`}
          icon={<Code className="size-4" />}
          onClick={() => setActiveModal("textHtml")}
        />
        <MetricCard
          title="Top Keywords"
          value={metrics.topKeywords.length > 0 ? metrics.topKeywords[0].word : "-"}
          subtitle={
            metrics.topKeywords.length > 0
              ? `${metrics.topKeywords[0].count}x`
              : undefined
          }
          icon={<Search className="size-4" />}
          onClick={() => setActiveModal("keywords")}
        />
        <MetricCard
          title="Performance"
          value={formatMs(metrics.loadTimeMs)}
          subtitle={formatBytes(metrics.pageSizeBytes)}
          icon={<Gauge className="size-4" />}
          onClick={() => setActiveModal("performance")}
        />
        <MetricCard
          title="Alt-Text Audit"
          value={`${images.length - missingAltImages.length}/${images.length}`}
          subtitle={
            missingAltImages.length > 0
              ? `${missingAltImages.length} fehlen`
              : "Alle vorhanden"
          }
          icon={<Image className="size-4" />}
          onClick={() => setActiveModal("altText")}
        />
        <MetricCard
          title="Anchor-Texte"
          value={anchorTextGroups.length}
          subtitle="einzigartige Texte"
          icon={<Type className="size-4" />}
          onClick={() => setActiveModal("anchorText")}
        />
        <MetricCard
          title="Lesbarkeit"
          value={metrics.readabilityScore}
          subtitle={readabilityLabel(metrics.readabilityScore)}
          icon={<BookOpen className="size-4" />}
          onClick={() => setActiveModal("readability")}
        />
      </div>

      {/* Word Count Modal */}
      <MetricDetailModal
        open={activeModal === "wordCount"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Wortanzahl"
      >
        <p className="text-sm">
          Die Seite enthalt insgesamt{" "}
          <strong>{metrics.wordCount.toLocaleString("de-DE")}</strong> Worter.
        </p>
      </MetricDetailModal>

      {/* Links Modal */}
      <MetricDetailModal
        open={activeModal === "links"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Link-Verhaltnis"
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interne Links</span>
            <span className="font-medium">{metrics.internalLinkCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Externe Links</span>
            <span className="font-medium">{metrics.externalLinkCount}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Gesamt</span>
            <span className="font-semibold">{totalLinks}</span>
          </div>
        </div>
      </MetricDetailModal>

      {/* Broken Links Modal */}
      <MetricDetailModal
        open={activeModal === "broken"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Broken Links"
        maxWidth="40rem"
      >
        {brokenLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Keine fehlerhaften Links gefunden.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {brokenLinks.map(([url, status]) => (
              <div
                key={url}
                className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-all text-xs text-primary hover:underline"
                >
                  {url}
                </a>
                <div className="flex shrink-0 items-center gap-1.5">
                  {status.statusCode !== null && (
                    <Badge variant="destructive" className="text-[10px]">
                      {status.statusCode}
                    </Badge>
                  )}
                  {status.error && (
                    <span className="max-w-[120px] truncate text-xs text-destructive" title={status.error}>
                      {status.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </MetricDetailModal>

      {/* Text/HTML Modal */}
      <MetricDetailModal
        open={activeModal === "textHtml"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Text-zu-HTML-Verhaltnis"
      >
        <p className="text-sm">
          Das Text-zu-HTML-Verhaltnis betragt{" "}
          <strong>{metrics.textToHtmlRatio.toFixed(1)}%</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          Ein Wert zwischen 25% und 70% gilt als optimal.
        </p>
      </MetricDetailModal>

      {/* Keywords Modal */}
      <MetricDetailModal
        open={activeModal === "keywords"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Top Keywords"
        maxWidth="36rem"
      >
        {metrics.topKeywords.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Keine Keywords gefunden.
          </p>
        ) : (
          <Tabs.Root defaultValue="list">
            <Tabs.List className="flex gap-1 rounded-lg bg-muted p-1">
              <TabTrigger value="list">Liste</TabTrigger>
              <TabTrigger value="cloud">Word Cloud</TabTrigger>
            </Tabs.List>

            <Tabs.Panel value="list" className="mt-3">
              <div className="space-y-1.5">
                {metrics.topKeywords.map((kw) => (
                  <div
                    key={kw.word}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{kw.word}</span>
                    <span className="text-xs text-muted-foreground">
                      {kw.count}x ({kw.density.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="cloud" className="mt-3">
              <KeywordCloud keywords={metrics.topKeywords} />
            </Tabs.Panel>
          </Tabs.Root>
        )}
      </MetricDetailModal>

      {/* Performance Modal */}
      <MetricDetailModal
        open={activeModal === "performance"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Performance"
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ladezeit</span>
            <span className="font-medium">{formatMs(metrics.loadTimeMs)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seitengrosse</span>
            <span className="font-medium">
              {formatBytes(metrics.pageSizeBytes)}
            </span>
          </div>
        </div>
      </MetricDetailModal>

      {/* Alt-Text Audit Modal */}
      <MetricDetailModal
        open={activeModal === "altText"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Alt-Text Audit"
        maxWidth="40rem"
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bilder gesamt</span>
            <span className="font-medium">{images.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mit Alt-Text</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {images.length - missingAltImages.length}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Ohne Alt-Text</span>
            <span
              className={cn(
                "font-semibold",
                missingAltImages.length > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {missingAltImages.length}
            </span>
          </div>
        </div>
        {missingAltImages.length > 0 && (
          <div className="max-h-[40vh] space-y-2 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground">
              Bilder ohne Alt-Text:
            </p>
            {missingAltImages.map((img, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-md border px-3 py-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt=""
                  className="size-10 shrink-0 rounded border object-cover"
                  loading="lazy"
                />
                <a
                  href={img.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-all text-xs text-primary hover:underline"
                >
                  {img.src}
                </a>
              </div>
            ))}
          </div>
        )}
      </MetricDetailModal>

      {/* Anchor Text Distribution Modal */}
      <MetricDetailModal
        open={activeModal === "anchorText"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Anchor-Text-Verteilung"
        maxWidth="40rem"
      >
        {anchorTextGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Keine Links gefunden.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {anchorTextGroups.map((group) => (
              <div
                key={group.text}
                className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{group.text}</p>
                  {group.hrefs.length <= 3 ? (
                    group.hrefs.map((href) => (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all text-[11px] text-muted-foreground hover:text-primary hover:underline"
                      >
                        {href}
                      </a>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {group.hrefs.length} Links
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {group.hrefs.length}x
                </Badge>
              </div>
            ))}
          </div>
        )}
      </MetricDetailModal>

      {/* Readability Modal */}
      <MetricDetailModal
        open={activeModal === "readability"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Lesbarkeit (Flesch-DE)"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full text-xl font-bold",
                readabilityColor(metrics.readabilityScore),
              )}
            >
              {metrics.readabilityScore}
            </div>
            <div>
              <p className="font-medium">
                {readabilityLabel(metrics.readabilityScore)}
              </p>
              <p className="text-xs text-muted-foreground">
                Flesch-Amstad-Index
              </p>
            </div>
          </div>
          <ReadabilityScale score={metrics.readabilityScore} />
          <p className="text-xs text-muted-foreground">
            Der Flesch-Index bewertet die Lesbarkeit anhand von
            Satzlange und Silbenanzahl. Hohere Werte bedeuten leichtere
            Lesbarkeit.
          </p>
        </div>
      </MetricDetailModal>
    </>
  )
}

// ── Tabs helper ─────────────────────────────────────────────────────────

function TabTrigger({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  return (
    <Tabs.Tab
      value={value}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        "text-muted-foreground hover:text-foreground",
        "data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm",
      )}
    >
      {children}
    </Tabs.Tab>
  )
}

// ── Word Cloud ──────────────────────────────────────────────────────────

const CLOUD_FONT_MIN = 0.75
const CLOUD_FONT_MAX = 2.25

function KeywordCloud({ keywords }: { keywords: KeywordEntry[] }) {
  const entries = useMemo(() => {
    const maxCount = Math.max(...keywords.map((k) => k.count))
    const minCount = Math.min(...keywords.map((k) => k.count))
    const range = maxCount - minCount || 1

    return keywords
      .map((kw) => ({
        ...kw,
        fontSize:
          CLOUD_FONT_MIN +
          ((kw.count - minCount) / range) * (CLOUD_FONT_MAX - CLOUD_FONT_MIN),
      }))
      .sort(() => Math.random() - 0.5)
  }, [keywords])

  return (
    <div className="flex min-h-[120px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 py-2">
      {entries.map((kw) => (
        <span
          key={kw.word}
          className="inline-block cursor-default font-semibold text-primary transition-opacity hover:opacity-70"
          style={{ fontSize: `${kw.fontSize}rem` }}
          title={`${kw.count}x (${kw.density.toFixed(1)}%)`}
        >
          {kw.word}
        </span>
      ))}
    </div>
  )
}

// ── Readability helpers ─────────────────────────────────────────────────

function readabilityLabel(score: number): string {
  if (score >= 70) return "Sehr leicht"
  if (score >= 60) return "Leicht"
  if (score >= 50) return "Mittelschwer"
  if (score >= 30) return "Schwer"
  return "Sehr schwer"
}

function readabilityColor(score: number): string {
  if (score >= 70) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
  if (score >= 60) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  if (score >= 50) return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  if (score >= 30) return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
  return "bg-red-500/15 text-red-700 dark:text-red-400"
}

const READABILITY_LEVELS = [
  { label: "Sehr schwer", min: 0, max: 30 },
  { label: "Schwer", min: 30, max: 50 },
  { label: "Mittel", min: 50, max: 60 },
  { label: "Leicht", min: 60, max: 70 },
  { label: "Sehr leicht", min: 70, max: 100 },
] as const

function ReadabilityScale({ score }: { score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {READABILITY_LEVELS.map((level) => {
          const isActive = score >= level.min && score < level.max
            || (level.max === 100 && score >= level.min)
          return (
            <div
              key={level.label}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                isActive ? "bg-primary" : "bg-muted",
              )}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Schwer</span>
        <span>Leicht</span>
      </div>
    </div>
  )
}
