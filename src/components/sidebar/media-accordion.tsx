"use client"

import { useState, type SyntheticEvent } from "react"
import { Image, Video, AlertTriangle, ImageOff } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLang } from "@/components/lang-provider"
import type { MediaData, MediaItem } from "@/lib/types"
import type { Dictionary } from "@/lib/i18n"

interface MediaAccordionProps {
  media: MediaData
}

function truncateSrc(src: string, max = 40): string {
  if (src.length <= max) return src
  return src.slice(0, max - 3) + "..."
}

function isVideoEmbed(src: string): boolean {
  return /youtube|youtu\.be|vimeo|dailymotion/i.test(src)
}

function toEmbedUrl(src: string): string {
  const ytMatch = src.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
  )
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  const vimeoMatch = src.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return src
}

// ── Media entry (list item) ─────────────────────────────────────────────

function MediaEntry({
  item,
  onPreview,
  t,
}: {
  item: MediaItem
  onPreview: (item: MediaItem) => void
  t: Dictionary["mediaAccordion"]
}) {
  const hasAlt = item.alt !== null && item.alt.trim().length > 0

  return (
    <div className="flex flex-col gap-0.5 rounded-md border px-2.5 py-2">
      <button
        onClick={() => onPreview(item)}
        className="text-xs text-primary hover:underline truncate text-left cursor-pointer"
        title={item.src}
      >
        {truncateSrc(item.src)}
      </button>
      <div className="flex items-center gap-1.5">
        {hasAlt ? (
          <span className="text-xs text-muted-foreground truncate">
            alt: {item.alt}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="size-3" />
            {t.noAltTag}
          </span>
        )}
      </div>
      {item.width != null && item.height != null && (
        <span className="text-[11px] text-muted-foreground">
          {item.width} x {item.height}
        </span>
      )}
    </div>
  )
}

// ── Preview modal ───────────────────────────────────────────────────────

function isSvg(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".svg")
  } catch {
    return url.toLowerCase().endsWith(".svg")
  }
}

function ImagePreview({
  src,
  alt,
  t,
}: {
  src: string
  alt: string
  t: Dictionary["mediaAccordion"]
}) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  function handleError(e: SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    if (img.referrerPolicy !== "no-referrer") {
      img.referrerPolicy = "no-referrer"
      img.src = src
    } else {
      setError(true)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <ImageOff className="size-10 opacity-40" />
        <p className="text-xs">{t.imageLoadFailed}</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          {t.openDirectly}
        </a>
      </div>
    )
  }

  const svg = isSvg(src)

  return (
    <>
      {!loaded && (
        <div className="flex items-center justify-center py-12 text-xs text-muted-foreground animate-pulse">
          {t.imageLoading}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={`mx-auto block ${loaded ? "" : "hidden"}`}
        style={
          svg
            ? { maxWidth: 280, height: "auto" }
            : { maxHeight: "70vh", width: "auto" }
        }
      />
    </>
  )
}

function MediaPreviewModal({
  item,
  type,
  onClose,
}: {
  item: MediaItem | null
  type: "image" | "video"
  onClose: () => void
}) {
  const { t } = useLang()

  if (!item) return null

  const isEmbed = isVideoEmbed(item.src)

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidth="72rem">
        <DialogHeader>
          <DialogTitle className="text-sm truncate">
            {item.alt || item.title || item.src}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-md bg-muted">
          {type === "image" ? (
            <ImagePreview src={item.src} alt={item.alt ?? ""} t={t.mediaAccordion} />
          ) : isEmbed ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={toEmbedUrl(item.src)}
                className="absolute inset-0 size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={item.alt ?? "Video"}
              />
            </div>
          ) : (
            <video
              src={item.src}
              controls
              className="mx-auto max-h-[70vh] w-auto"
            >
              <track kind="captions" />
            </video>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="break-all font-mono">{item.src}</p>
          {item.alt && <p>ALT: {item.alt}</p>}
          {item.width != null && item.height != null && (
            <p>
              {item.width} x {item.height}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Public component ────────────────────────────────────────────────────

export function MediaAccordion({ media }: MediaAccordionProps) {
  const { t } = useLang()
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [previewType, setPreviewType] = useState<"image" | "video">("image")

  const imagesMissingAlt = media.images.filter(
    (img) => img.alt === null || img.alt.trim().length === 0,
  ).length

  function openPreview(item: MediaItem, type: "image" | "video") {
    setPreviewItem(item)
    setPreviewType(type)
  }

  return (
    <>
      <Accordion>
        <AccordionItem value="images">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-1.5">
              <Image className="size-4" />
              {t.mediaAccordion.images} ({media.images.length})
              {imagesMissingAlt > 0 && (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-1.5 py-0"
                >
                  {imagesMissingAlt} {t.mediaAccordion.withoutAlt}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {media.images.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t.mediaAccordion.noImages}
              </p>
            ) : (
              <div className="space-y-1.5">
                {media.images.map((img, i) => (
                  <MediaEntry
                    key={i}
                    item={img}
                    onPreview={(item) => openPreview(item, "image")}
                    t={t.mediaAccordion}
                  />
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="videos">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-1.5">
              <Video className="size-4" />
              {t.mediaAccordion.videos} ({media.videos.length})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {media.videos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t.mediaAccordion.noVideos}
              </p>
            ) : (
              <div className="space-y-1.5">
                {media.videos.map((vid, i) => (
                  <MediaEntry
                    key={i}
                    item={vid}
                    onPreview={(item) => openPreview(item, "video")}
                    t={t.mediaAccordion}
                  />
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <MediaPreviewModal
        item={previewItem}
        type={previewType}
        onClose={() => setPreviewItem(null)}
      />
    </>
  )
}
